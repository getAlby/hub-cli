import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  NETWORK,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { InfoResponse } from "../../types.js";

const HUB_PORT = 18093;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-getinfo-"));

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
  token = JSON.parse(start.stdout).token;

  await waitForInfo(HUB_URL, (i) => i.running);
}, 120_000);

afterAll(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("get-info reports a running, set-up hub", () => {
  const result = runCommand(["--url", HUB_URL, "--token", token, "get-info"]);
  expect(result.status).toBe(0);
  const info = JSON.parse(result.stdout) as InfoResponse;
  expect(info.setupCompleted).toBe(true);
  expect(info.running).toBe(true);
  expect(info.network).toBe(NETWORK);
  expect(info.backendType).toBe("LDK");
  expect(typeof info.version).toBe("string");
});
