import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChildProcess } from "node:child_process";
import type { InfoResponse } from "../../types.js";

export const E2E_DIR = fileURLToPath(new URL(".", import.meta.url));
export const HUB_BINARY = join(
  E2E_DIR,
  "albyhub-Server-Linux-x86_64/bin/albyhub",
);
export const TEST_PASSWORD = "test-password-e2e";
export const NETWORK = "regtest";

// Bitcoind RPC config (Polar defaults)
export const LDK_BITCOIND_RPC_HOST = "127.0.0.1";
export const LDK_BITCOIND_RPC_PORT = "18443";
export const LDK_BITCOIND_RPC_USER = "polaruser";
export const LDK_BITCOIND_RPC_PASSWORD = "polarpass";
export const LDK_LISTENING_ADDRESSES = "0.0.0.0:19735"; // use different port to not conflict with Polar

export function runCommand(args: string[]) {
  return spawnSync("node", ["build/index.js", ...args], {
    encoding: "utf-8",
    cwd: process.cwd(),
  });
}

export async function spawnHub(
  port: number,
  tmpPrefix: string,
): Promise<{ hubProcess: ChildProcess; workDir: string }> {
  const workDir = mkdtempSync(join(tmpdir(), tmpPrefix));

  console.log("Hub WORK_DIR:", workDir);

  const hubProcess = spawn(HUB_BINARY, [], {
    env: {
      ...process.env,
      WORK_DIR: workDir,
      PORT: String(port),
      NETWORK,
      LDK_BITCOIND_RPC_HOST,
      LDK_BITCOIND_RPC_PORT,
      LDK_BITCOIND_RPC_USER,
      LDK_BITCOIND_RPC_PASSWORD,
      LDK_LISTENING_ADDRESSES,
    },
    stdio: "pipe",
  });

  hubProcess.stdout?.on("data", (d) => process.stdout.write(`[hub] ${d}`));
  hubProcess.stderr?.on("data", (d) => process.stderr.write(`[hub] ${d}`));

  await waitForHub(`http://localhost:${port}`);

  return { hubProcess, workDir };
}

export async function waitForHub(
  url: string,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/info`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Hub did not become ready within ${timeoutMs}ms`);
}

export async function killHub(hubProcess: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    hubProcess.once("exit", resolve);
    hubProcess.kill();
  });
}

export async function waitForInfo(
  url: string,
  condition: (info: InfoResponse) => boolean,
  timeoutMs = 30_000,
): Promise<InfoResponse> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/info`);
      if (res.ok) {
        const info = (await res.json()) as InfoResponse;
        if (condition(info)) return info;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}
