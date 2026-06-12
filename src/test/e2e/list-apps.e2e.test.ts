import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { ListAppsResponse } from "../../types.js";

const HUB_PORT = 18094;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-listapps-"));

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

test("list-apps returns a freshly created app", () => {
  const create = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "create-app",
    "--name",
    "e2e-list-apps-target",
  ]);
  if (create.status !== 0) throw new Error(`create-app failed: ${create.stderr}`);
  const created = JSON.parse(create.stdout);

  const result = runCommand(["--url", HUB_URL, "--token", token, "list-apps"]);
  expect(result.status).toBe(0);
  const out = JSON.parse(result.stdout) as ListAppsResponse;

  // totalCount must agree with the returned page of apps
  expect(out.totalCount).toBe(out.apps.length);
  expect(out.totalCount).toBeGreaterThanOrEqual(1);

  // the app we just created must be present with matching identifiers
  const app = out.apps.find((a) => a.name === "e2e-list-apps-target");
  expect(app).toBeDefined();
  expect(app!.id).toBe(created.id);
  expect(app!.appPubkey).toMatch(/^[0-9a-f]{64}$/);
});
