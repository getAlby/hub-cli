import { Command } from "commander";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { HubClient } from "./client.js";
import { Transaction } from "./types.js";

function loadAlbyCloudConfig(): { hubName: string } | null {
  const filePath = join(homedir(), ".hub-cli", "alby-cloud.txt");
  try {
    const hubName = readFileSync(filePath, "utf-8").trim();
    if (hubName) return { hubName };
  } catch {
    // file doesn't exist
  }
  return null;
}

const CONFIG_DIR = join(homedir(), ".hub-cli");

function tokenPath(name?: string): string {
  if (name) return join(CONFIG_DIR, `token-${name}.jwt`);
  return join(CONFIG_DIR, "token.jwt");
}

export function saveToken(token: string, name?: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const p = tokenPath(name);
  writeFileSync(p, token, { encoding: "utf-8", mode: 0o600 });
}

export function loadToken(name?: string): string | undefined {
  const p = tokenPath(name);
  if (existsSync(p)) {
    return readFileSync(p, "utf-8").trim();
  }
  return undefined;
}

export function getClient(program: Command): HubClient {
  const opts = program.opts<{
    url: string;
    token?: string;
    hub?: string;
  }>();

  const albyCloud = loadAlbyCloudConfig();

  // Resolve URL: explicit flag/env > alby-cloud.txt default > localhost default
  let url = opts.url.replace(/\/$/, "");
  const usingDefaultUrl = url === "http://localhost:8080";
  if (usingDefaultUrl && albyCloud) {
    url = "https://my.albyhub.com";
  }

  // Token resolution order: --token flag, HUB_TOKEN env, file
  let token: string | undefined = opts.token ?? process.env.HUB_TOKEN;
  if (!token) {
    token = loadToken(opts.hub);
  }

  // Alby Cloud headers
  const extraHeaders: Record<string, string> = {};
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname === "my.albyhub.com") {
    const hubName = process.env.ALBY_HUB_NAME ?? albyCloud?.hubName;
    if (!hubName) {
      console.error(
        JSON.stringify({
          message:
            "Alby Cloud hub name is required. Save it with: echo nwcXXX > ~/.hub-cli/alby-cloud.txt (find your hub name at https://my.albyhub.com/settings/developer)",
        }),
      );
      process.exit(1);
    }
    extraHeaders["AlbyHub-Name"] = hubName;
    extraHeaders["AlbyHub-Region"] = "fra";
  }

  return new HubClient(url, token, extraHeaders);
}

export function mapTransaction(
  tx: Transaction,
): Omit<Transaction, "amount" | "feesPaid"> & {
  amountSat: number;
  feesPaidSat: number;
} {
  const { amount, feesPaid, ...rest } = tx;
  return {
    ...rest,
    amountSat: Math.floor(amount / 1000),
    feesPaidSat: Math.floor(feesPaid / 1000),
  };
}

export function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export async function handleError(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    process.exit(0);
  } catch (error) {
    console.log(
      JSON.stringify(
        { error: error instanceof Error ? error.message : String(error) },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}
