import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18082; // different port from setup.e2e.test.ts (18080) and start.e2e.test.ts (18081)
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let workDir: string;

beforeEach(async () => {
  ({ hubProcess, workDir } = await spawnHub(HUB_PORT, "hub-cli-e2e-unlock-"));
  // No setup or start — test 1 needs a fresh hub
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("unlock fails if node is not started", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "unlock",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(result.status).toBe(1);
  const output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  // TODO: hub should return a better error message here
  expect(output.error).toEqual("Failed to save session: config not unlocked");
});

test("unlock works if node is started", { timeout: 60_000 }, async () => {
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

  const result = runCommand([
    "--url",
    HUB_URL,
    "unlock",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(typeof output.token).toBe("string");
  expect(output.token.length).toBeGreaterThan(0);
});

test("rate limit on unlock", { timeout: 60_000 }, async () => {
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

  // avoid rate limit
  await new Promise((resolve) => setTimeout(resolve, 3000));

  let result = runCommand([
    "--url",
    HUB_URL,
    "unlock",
    "--password",
    "incorrect_password",
  ]);
  expect(result.status).toBe(1);
  let output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("Invalid password");

  result = runCommand([
    "--url",
    HUB_URL,
    "unlock",
    "--password",
    "incorrect_password_2",
  ]);
  expect(result.status).toBe(1);
  output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("rate limit exceeded");
});
