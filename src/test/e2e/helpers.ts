import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChildProcess } from "node:child_process";
import type { BalancesResponse, Channel, InfoResponse } from "../../types.js";

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
export const DEFAULT_LDK_PORT = 19735;

export function runCommand(args: string[]) {
  return spawnSync("node", ["build/index.js", ...args], {
    encoding: "utf-8",
    cwd: process.cwd(),
  });
}

export async function spawnHub(
  port: number,
  tmpPrefix: string,
  ldkPort = DEFAULT_LDK_PORT,
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
      LDK_LISTENING_ADDRESSES: `0.0.0.0:${ldkPort}`,
      LDK_ANNOUNCEMENT_ADDRESSES: `127.0.0.1:${ldkPort}`,
    },
    stdio: "pipe",
  });

  hubProcess.stdout?.on("data", (d) => process.stdout.write(`[hub] ${d}`));
  hubProcess.stderr?.on("data", (d) => process.stderr.write(`[hub] ${d}`));

  await waitForHub(`http://localhost:${port}`);

  return { hubProcess, workDir };
}

export async function spawnMutinynetHub(
  port: number,
  tmpPrefix: string,
  ldkPort = DEFAULT_LDK_PORT,
): Promise<{ hubProcess: ChildProcess; workDir: string }> {
  const workDir = mkdtempSync(join(tmpdir(), tmpPrefix));

  console.log("Hub WORK_DIR:", workDir);

  const hubProcess = spawn(HUB_BINARY, [], {
    env: {
      ...process.env,
      WORK_DIR: workDir,
      PORT: String(port),
      NETWORK: "signet",
      MEMPOOL_API: "https://mutinynet.com/api",
      LDK_ESPLORA_SERVER: "https://mutinynet.com/api",
      LDK_GOSSIP_SOURCE: "https://rgs.mutinynet.com/snapshot",
      LDK_LISTENING_ADDRESSES: `0.0.0.0:${ldkPort}`,
      LDK_ANNOUNCEMENT_ADDRESSES: `127.0.0.1:${ldkPort}`,
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

export async function bitcoinRpc(
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const auth = Buffer.from(
    `${LDK_BITCOIND_RPC_USER}:${LDK_BITCOIND_RPC_PASSWORD}`,
  ).toString("base64");
  const res = await fetch(
    `http://${LDK_BITCOIND_RPC_HOST}:${LDK_BITCOIND_RPC_PORT}/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ jsonrpc: "1.0", id: 1, method, params }),
    },
  );
  const json = (await res.json()) as {
    result: unknown;
    error: { message: string } | null;
  };
  if (json.error)
    throw new Error(`Bitcoin RPC ${method} failed: ${json.error.message}`);
  return json.result;
}

interface RawAPIBalancesResponse {
  lightning: {
    totalSpendable: number;
    totalReceivable: number;
    nextMaxSpendable: number;
    nextMaxReceivable: number;
  };
  onchain: {
    spendable: number;
    total: number;
    reserved: number;
    pendingBalancesFromChannelClosures: number;
  };
}

export async function waitForBalances(
  url: string,
  token: string,
  condition: (balances: BalancesResponse) => boolean,
  timeoutMs = 60_000,
): Promise<BalancesResponse> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/balances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw = (await res.json()) as RawAPIBalancesResponse;
        const balances: BalancesResponse = {
          lightning: {
            totalSpendableSat: Math.floor(raw.lightning.totalSpendable / 1000),
            totalReceivableSat: Math.floor(raw.lightning.totalReceivable / 1000),
            nextMaxSpendableSat: Math.floor(raw.lightning.nextMaxSpendable / 1000),
            nextMaxReceivableSat: Math.floor(raw.lightning.nextMaxReceivable / 1000),
          },
          onchain: {
            spendableSat: raw.onchain.spendable,
            totalSat: raw.onchain.total,
            reservedSat: raw.onchain.reserved,
            pendingBalancesFromChannelClosuresSat: raw.onchain.pendingBalancesFromChannelClosures,
          },
        };
        if (condition(balances)) return balances;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Balance condition not met within ${timeoutMs}ms`);
}

export async function waitForChannels(
  url: string,
  token: string,
  condition: (channels: Channel[]) => boolean,
  timeoutMs = 60_000,
): Promise<Channel[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const channels = (await res.json()) as Channel[];
        if (condition(channels)) return channels;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Channel condition not met within ${timeoutMs}ms`);
}
