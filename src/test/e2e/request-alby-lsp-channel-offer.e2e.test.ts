import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18098;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-albyoffer-"));

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

test("request-alby-lsp-channel-offer errors without a linked Alby account", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "request-alby-lsp-channel-offer",
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  // With no linked account the hub still tries to reach the Alby LSP endpoint
  // and fails on the missing OAuth token, e.g.
  // `Get "https://api.getalby.com/internal/lsp": oauth2: token expired ...`
  expect(out.error).toContain("api.getalby.com/internal/lsp");
  expect(out.error).toContain("oauth2");
});
