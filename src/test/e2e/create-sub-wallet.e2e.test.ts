import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { ListAppsResponse, CreateAppResponse } from "../../types.js";

const HUB_PORT = 18092;
const HUB_URL = `http://localhost:${HUB_PORT}`;

// Default scopes the Hub grants to a sub-wallet (see commands/create-sub-wallet.ts).
const DEFAULT_SUBWALLET_SCOPES = [
  "get_balance",
  "get_info",
  "list_transactions",
  "lookup_invoice",
  "make_invoice",
  "notifications",
  "pay_invoice",
];

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-subwallet-"));

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

test("create-sub-wallet creates an isolated uncle-jim app with default scopes", () => {
  const appName = "e2e-subwallet-default";
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet",
    "--name",
    appName,
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;
  expect(app.name).toBe(appName);
  expect(app.id).toBeGreaterThan(0);
  // walletPubkey is a 32-byte nostr key (64 lowercase hex chars)
  expect(app.walletPubkey).toMatch(/^[0-9a-f]{64}$/);
  // the pairing URI is the NWC connection string keyed on that wallet pubkey
  expect(app.pairingUri).toContain(
    `nostr+walletconnect://${app.walletPubkey}?`,
  );
  expect(app.pairingUri).toContain("relay=");
  expect(app.pairingUri).toContain("secret=");

  // The sub-wallet must appear in list-apps as an isolated "uncle-jim" app
  // carrying its own balance, with the default sub-wallet scope set.
  const list = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  expect(list.status).toBe(0);
  const out = JSON.parse(list.stdout) as ListAppsResponse;
  const created = out.apps.find((a) => a.id === app.id);
  expect(created).toBeDefined();
  expect(created!.isolated).toBe(true);
  expect(created!.metadata).toEqual({ app_store_app_id: "uncle-jim" });
  expect([...created!.scopes].sort()).toEqual(
    [...DEFAULT_SUBWALLET_SCOPES].sort(),
  );
  // no budget configured by default
  expect(created!.maxAmount).toBe(0);
  expect(created!.budgetRenewal).toBe("never");
});

test("create-sub-wallet honours custom scopes, max-amount and budget renewal", () => {
  const appName = "e2e-subwallet-custom";
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-sub-wallet",
    "--name",
    appName,
    // max-amount/budget-renewal are stored against the pay_invoice scope, so
    // the scope set must include pay_invoice.
    "--scopes",
    "pay_invoice,get_balance",
    "--max-amount",
    "7000",
    "--budget-renewal",
    "weekly",
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;

  const list = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  const out = JSON.parse(list.stdout) as ListAppsResponse;
  const created = out.apps.find((a) => a.id === app.id);
  expect(created).toBeDefined();
  // still an isolated uncle-jim sub-wallet even with custom options
  expect(created!.isolated).toBe(true);
  expect(created!.metadata).toEqual({ app_store_app_id: "uncle-jim" });
  expect(created!.maxAmount).toBe(7000);
  expect(created!.budgetRenewal).toBe("weekly");
  expect([...created!.scopes].sort()).toEqual(
    ["get_balance", "pay_invoice"].sort(),
  );
});
