import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import { TEST_PASSWORD, spawnHub, runCommand, waitForInfo, killHub } from "./helpers";

const HUB_PORT = 18081; // different port from setup.e2e.test.ts (18080)
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let workDir: string;

beforeEach(async () => {
  ({ hubProcess, workDir } = await spawnHub(HUB_PORT, "hub-cli-e2e-start-"));

  // setup is a prerequisite for all start tests
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
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("cannot start with wrong unlock password", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    "wrong-password",
  ]);
  expect(result.status).toBe(1);
  const output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("Invalid password");
});

test("start returns a JWT token", { timeout: 60_000 }, async () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(typeof output.token).toBe("string");
  expect(output.token.length).toBeGreaterThan(0);
  const info = await waitForInfo(HUB_URL, (i) => i.running);
  expect(info.running).toBe(true);
});

test("rate limit on start", { timeout: 60_000 }, () => {
  let result = runCommand([
    "--url",
    HUB_URL,
    "start",
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
    "start",
    "--password",
    "incorrect_password_2",
  ]);
  expect(result.status).toBe(1);
  output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("rate limit exceeded");
});

test("cannot start if already started", { timeout: 60_000 }, async () => {
  let result = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(result.status).toBe(0);
  await waitForInfo(HUB_URL, (i) => i.running);
  // avoid rate limit
  await new Promise((r) => setTimeout(r, 3000));
  result = runCommand(["--url", HUB_URL, "start", "--password", TEST_PASSWORD]);
  expect(result.status).toBe(0);
  const info = await waitForInfo(HUB_URL, (i) => i.startupError.length > 0);
  expect(info.startupError).toEqual("app already started");
});
