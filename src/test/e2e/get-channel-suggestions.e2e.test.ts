import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { ChannelPeerSuggestion } from "../../types.js";

const HUB_PORT = 18099;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-suggestions-"));

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

test("get-channel-suggestions returns a list of LSP providers", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "get-channel-suggestions",
  ]);
  expect(result.status).toBe(0);
  const suggestions = JSON.parse(result.stdout) as ChannelPeerSuggestion[];
  expect(suggestions.length).toBeGreaterThan(0);

  // Megalith is a long-standing default suggestion — assert it is present and
  // well-formed rather than just checking the value is an array.
  const megalith = suggestions.find((s) => /megalith/i.test(s.name));
  expect(megalith).toBeDefined();
  // node pubkey is a 33-byte compressed secp256k1 key (66 lowercase hex chars)
  expect(megalith!.pubkey).toMatch(/^[0-9a-f]{66}$/);
  expect(megalith!.name).toContain("Megalith");

  // every suggestion should carry a usable pubkey and payment method
  for (const s of suggestions) {
    expect(s.pubkey).toMatch(/^[0-9a-f]{66}$/);
    expect(["lightning", "onchain"]).toContain(s.paymentMethod);
  }
});
