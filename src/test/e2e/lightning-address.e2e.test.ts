import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { CreateAppResponse } from "../../types.js";

const HUB_PORT = 18101;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;
let subWalletId: number;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-lnaddr-"));

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

  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet",
    "--name",
    "e2e-lnaddr-subwallet",
  ]);
  if (create.status !== 0) throw new Error(`create-sub-wallet failed: ${create.stdout}`);
  subWalletId = (JSON.parse(create.stdout) as CreateAppResponse).id;
}, 120_000);

afterAll(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("create-sub-wallet-lightning-address fails cleanly without a connected Alby account", () => {
  // Setting a sub-wallet lightning address goes through the Alby OAuth service,
  // which is unavailable on a fresh hub with no Alby account connected.
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet-lightning-address",
    "--app-id",
    String(subWalletId),
    "--address",
    "e2e-test-handle",
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  expect(typeof out.error).toBe("string");
  expect(out.error.length).toBeGreaterThan(0);
});

test("delete-sub-wallet-lightning-address reports when no address is set", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "delete-sub-wallet-lightning-address",
    "--app-id",
    String(subWalletId),
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  expect(out.error).toContain("no lightning address set");
});
