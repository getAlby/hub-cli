import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18086;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;

beforeEach(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-sync-"));

  const setup = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  if (setup.status !== 0) throw new Error(`setup failed: ${setup.stderr}`);

  const start = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  if (start.status !== 0) throw new Error(`start failed: ${start.stderr}`);

  await waitForInfo(HUB_URL, (i) => i.running);
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("sync queues a wallet sync", { timeout: 60_000 }, async () => {
  // avoid rate limit from beforeEach unlock calls
  await new Promise((r) => setTimeout(r, 3000));

  const token = runCommand([
    "--url",
    HUB_URL,
    "unlock",
    "--password",
    TEST_PASSWORD,
  ]);
  if (token.status !== 0) throw new Error(`unlock failed: ${token.stderr}`);
  const { token: jwt } = JSON.parse(token.stdout) as { token: string };

  const result = runCommand(["--url", HUB_URL, "--token", jwt, "sync"]);
  expect(result.status).toBe(0);
  const out = JSON.parse(result.stdout);
  expect(out.success).toBe(true);
  expect(typeof out.message).toBe("string");
});
