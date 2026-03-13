import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18085;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let workDir: string;

beforeEach(async () => {
  ({ hubProcess, workDir } = await spawnHub(HUB_PORT, "hub-cli-e2e-stop-"));

  // setup is a prerequisite for all stop tests
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

test(
  "stop stops the LN node (HTTP server stays up)",
  { timeout: 60_000 },
  async () => {
    const start = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(start.status).toBe(0);
    const { token } = JSON.parse(start.stdout);

    await waitForInfo(HUB_URL, (i) => i.running);
    await waitForInfo(HUB_URL, (i) => i.startupState === "");

    const stop = runCommand(["--url", HUB_URL, "--token", token, "stop"]);
    expect(stop.status).toBe(0);

    const info = await waitForInfo(HUB_URL, (i) => !i.running);
    expect(info.running).toBe(false);
  },
);

test(
  "can restart the LN node after stopping it",
  { timeout: 60_000 },
  async () => {
    const start = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(start.status).toBe(0);
    const { token } = JSON.parse(start.stdout);

    await waitForInfo(HUB_URL, (i) => i.running);
    await waitForInfo(HUB_URL, (i) => i.startupState === "");

    const stop = runCommand(["--url", HUB_URL, "--token", token, "stop"]);
    expect(stop.status).toBe(0);

    await waitForInfo(HUB_URL, (i) => !i.running);

    const restart = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(restart.status).toBe(0);

    const info = await waitForInfo(HUB_URL, (i) => i.running);
    expect(info.running).toBe(true);
  },
);

test("stop fails without a token", { timeout: 60_000 }, async () => {
  const start = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(start.status).toBe(0);

  await waitForInfo(HUB_URL, (i) => i.running);
  await waitForInfo(HUB_URL, (i) => i.startupState === "");

  const stop = runCommand(["--url", HUB_URL, "stop"]);
  expect(stop.status).toBe(1);
  const output = JSON.parse(stop.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("invalid or expired jwt");
});

test(
  "cannot stop if the LN node is not started",
  { timeout: 60_000 },
  async () => {
    const start = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(start.status).toBe(0);
    const { token } = JSON.parse(start.stdout);

    await waitForInfo(HUB_URL, (i) => i.running);
    await waitForInfo(HUB_URL, (i) => i.startupState === "");

    const firstStop = runCommand(["--url", HUB_URL, "--token", token, "stop"]);
    expect(firstStop.status).toBe(0);

    await waitForInfo(HUB_URL, (i) => !i.running);

    const secondStop = runCommand(["--url", HUB_URL, "--token", token, "stop"]);
    expect(secondStop.status).toBe(1);
    const output = JSON.parse(secondStop.stdout);
    expect(typeof output.error).toBe("string");
    expect(output.error).toEqual("LNClient not started");
  },
);
