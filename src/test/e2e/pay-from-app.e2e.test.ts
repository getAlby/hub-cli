import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type {
  CreateAppResponse,
  ListAppsResponse,
  Transaction,
} from "../../types.js";

const HUB_PORT = 18102;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-payfromapp-"));

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

test("pay-invoice --from-app-id debits the chosen sub-wallet", () => {
  // Create and fund a sub-wallet so it has a spendable balance.
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet",
    "--name",
    "e2e-pay-from-subwallet",
  ]);
  expect(create.status).toBe(0);
  const subWallet = JSON.parse(create.stdout) as CreateAppResponse;

  const fund = runCommand([
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
  expect(fund.status).toBe(0);

  // Make a hub invoice and pay it FROM the sub-wallet. This is an internal
  // self-payment, so it settles without external liquidity and debits the
  // sub-wallet's balance.
  const invoice = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "make-invoice",
    "--amount",
    "400",
    "--description",
    "pay-from-app",
  ]);
  expect(invoice.status).toBe(0);
  const bolt11 = (JSON.parse(invoice.stdout) as Transaction).invoice;
  expect(bolt11).toMatch(/^ln/);

  const pay = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "pay-invoice",
    bolt11,
    "--from-app-id",
    String(subWallet.id),
  ]);
  expect(pay.status).toBe(0);

  // The sub-wallet balance should drop by the paid amount (1000 - 400 = 600).
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
  const spent = apps.find((a) => a.id === subWallet.id);
  expect(spent).toBeDefined();
  expect(spent!.balanceSat).toBe(600);
});
