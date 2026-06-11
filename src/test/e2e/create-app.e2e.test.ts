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

const HUB_PORT = 18095;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-createapp-"));

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

test("create-app creates a connection that then appears in list-apps", () => {
  const appName = "e2e-default-app";
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-app",
    "--name",
    appName,
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;
  expect(app.name).toBe(appName);
  expect(typeof app.id).toBe("number");
  expect(app.pairingUri.startsWith("nostr+walletconnect://")).toBe(true);
  expect(typeof app.walletPubkey).toBe("string");

  const list = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  expect(list.status).toBe(0);
  const out = JSON.parse(list.stdout) as ListAppsResponse;
  const created = out.apps.find((a) => a.id === app.id);
  expect(created).toBeDefined();
  expect(created?.name).toBe(appName);
});

test("create-app honours custom scopes, max-amount and budget renewal", () => {
  const appName = "e2e-scoped-app";
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-app",
    "--name",
    appName,
    // maxAmount/budgetRenewal are only stored against the pay_invoice scope
    // (see hub api/api.go: the response reads them from the pay_invoice
    // permission only), so this scope set must include pay_invoice.
    "--scopes",
    "pay_invoice,get_balance",
    "--max-amount",
    "5000",
    "--budget-renewal",
    "weekly",
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;

  const list = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  const out = JSON.parse(list.stdout) as ListAppsResponse;
  const created = out.apps.find((a) => a.id === app.id);
  expect(created).toBeDefined();
  expect(created?.maxAmount).toBe(5000);
  expect(created?.budgetRenewal).toBe("weekly");
  expect([...(created?.scopes ?? [])].sort()).toEqual(
    ["pay_invoice", "get_balance"].sort(),
  );
  expect(created?.isolated).toBe(false);
});

test("create-app can create an isolated sub-wallet app", () => {
  const appName = "e2e-isolated-app";
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-app",
    "--name",
    appName,
    "--isolated",
    "--unlock-password",
    TEST_PASSWORD,
  ]);
  expect(create.status).toBe(0);
  const app = JSON.parse(create.stdout) as CreateAppResponse;

  const list = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  const out = JSON.parse(list.stdout) as ListAppsResponse;
  const created = out.apps.find((a) => a.id === app.id);
  expect(created).toBeDefined();
  expect(created?.isolated).toBe(true);
});
