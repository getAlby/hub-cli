import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { CustomNodeCommandsResponse } from "../../types.js";

const HUB_PORT = 18097;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-nodecommands-"));

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

test("list-custom-node-commands returns the backend's custom commands", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "list-custom-node-commands",
  ]);
  expect(result.status).toBe(0);
  const response = JSON.parse(result.stdout) as CustomNodeCommandsResponse;
  expect(Array.isArray(response.commands)).toBe(true);
  // LDK exposes export_pathfinding_scores among its debug commands
  const names = response.commands.map((c) => c.name);
  expect(names).toContain("export_pathfinding_scores");
});

test("execute-custom-node-command runs a command on the backend", () => {
  // list_channel_monitor_sizes is safe to run on a fresh node: it returns an
  // empty array when there are no channels. (export_pathfinding_scores errors
  // until the node has built up a network graph, so it is not used here.)
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "execute-custom-node-command",
    "list_channel_monitor_sizes",
  ]);
  expect(result.status).toBe(0);
  // command output is backend-defined; list_channel_monitor_sizes returns an
  // array of per-channel monitor sizes (empty on a channel-less node)
  expect(Array.isArray(JSON.parse(result.stdout))).toBe(true);
});
