import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18097;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-connectalby-"));

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

test("connect-alby-account (no code) returns an auth URL when unconnected", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "connect-alby-account",
  ]);
  expect(result.status).toBe(0);
  const out = JSON.parse(result.stdout) as {
    albyAuthUrl?: string;
    message?: string;
    albyAccountConnected?: boolean;
  };
  // Hub has no linked account, so we expect the "not connected" branch.
  expect(out.albyAccountConnected).toBeUndefined();
  // the auth URL is the Alby OAuth authorize endpoint; client_id varies, so
  // assert the stable parts of the URL rather than the whole string
  expect(out.albyAuthUrl).toMatch(/^https:\/\/getalby\.com\/oauth\?/);
  expect(out.albyAuthUrl).toContain("response_type=code");
  expect(out.albyAuthUrl).toContain("client_id=");
  // the message tells the user to open that URL and re-run with --code
  expect(out.message).toContain("albyAuthUrl");
  expect(out.message).toContain("--code");
});
