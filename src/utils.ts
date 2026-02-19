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

  const url = opts.url.replace(/\/$/, "");

  // Token resolution order: --token flag, HUB_TOKEN env, file
  let token: string | undefined = opts.token ?? process.env.HUB_TOKEN;
  if (!token) {
    token = loadToken(opts.hub);
  }

  return new HubClient(url, token);
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
