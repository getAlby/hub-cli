import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { CreateAppResponse, ListAppsResponse } from "../../types.js";

const HUB_PORT = 18100;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-transfer-"));

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

test("transfer requires at least one of --from-app-id or --to-app-id", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "transfer",
    "--amount",
    "10",
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  expect(out.error).toContain("Specify at least one");
});

test("transfer rejects a non-isolated app as the destination", () => {
  // A plain create-app connection is NOT isolated, so it cannot receive a transfer.
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-app",
    "--name",
    "e2e-transfer-shared-app",
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;

  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "transfer",
    "--amount",
    "10",
    "--to-app-id",
    String(app.id),
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  expect(out.error).toContain("not isolated");
});

test("transfer funds the main hub wallet into a sub-wallet", () => {
  // Transfers between the main wallet and an isolated sub-wallet settle
  // internally, so this credits the sub-wallet without any channel/liquidity.
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet",
    "--name",
    "e2e-transfer-subwallet",
  ]);
  expect(create.status).toBe(0);
  const subWallet = JSON.parse(create.stdout) as CreateAppResponse;

  const transfer = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "transfer",
    "--amount",
    "1000",
    "--to-app-id",
    String(subWallet.id),
  ]);
  expect(transfer.status).toBe(0);
  const out = JSON.parse(transfer.stdout);
  expect(out).toMatchObject({
    success: true,
    amountSat: 1000,
    fromAppId: null,
    toAppId: subWallet.id,
  });

  // The sub-wallet's own balance should now reflect the transfer, and it must
  // appear in the --sub-wallets filtered listing.
  const list = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "list-apps",
    "--sub-wallets",
  ]);
  expect(list.status).toBe(0);
  const apps = (JSON.parse(list.stdout) as ListAppsResponse).apps;
  const funded = apps.find((a) => a.id === subWallet.id);
  expect(funded).toBeDefined();
  expect(funded!.balanceSat).toBe(1000);
});
