import { test, expect, beforeAll, afterAll } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChildProcess } from "node:child_process";

const E2E_DIR = fileURLToPath(new URL(".", import.meta.url));
const HUB_BINARY = join(E2E_DIR, "albyhub-Server-Linux-x86_64/bin/albyhub");

const HUB_PORT = 18080; // non-default port to avoid clashing with a real hub
const HUB_URL = `http://localhost:${HUB_PORT}`;
const TEST_PASSWORD = "test-password-e2e";

let hubProcess: ChildProcess;
let workDir: string;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), "hub-cli-e2e-"));

  console.log("Hub WORK_DIR:", workDir);

  hubProcess = spawn(HUB_BINARY, [], {
    env: {
      ...process.env,
      WORK_DIR: workDir,
      PORT: String(HUB_PORT),
      NETWORK: "regtest",
      // Polar Esplora — only needed when calling `start`, not `setup`
      LDK_ESPLORA_SERVER:
        process.env.POLAR_ESPLORA_URL ?? "http://127.0.0.1:3000",
      MEMPOOL_API: process.env.POLAR_ESPLORA_URL ?? "http://127.0.0.1:3000",
    },
    stdio: "pipe",
  });

  hubProcess.stdout?.on("data", (d) => process.stdout.write(`[hub] ${d}`));
  hubProcess.stderr?.on("data", (d) => process.stderr.write(`[hub] ${d}`));

  await waitForHub(HUB_URL);
});

afterAll(() => {
  hubProcess?.kill();
});

async function waitForHub(url: string, timeoutMs = 20_000): Promise<void> {
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

test("setup initializes the hub", () => {
  const result = spawnSync(
    "node",
    [
      "build/index.js",
      "--url",
      HUB_URL,
      "setup",
      "--password",
      TEST_PASSWORD,
      "--backend",
      "LDK",
    ],
    { encoding: "utf-8", cwd: process.cwd() },
  );
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.success).toBe(true);
});
