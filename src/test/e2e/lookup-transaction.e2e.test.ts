import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";
import type { Transaction } from "../../types.js";

const HUB_PORT = 18096;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-lookuptx-"));

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

test("lookup-transaction finds an invoice created with make-invoice", () => {
  const description = "e2e lookup target";
  const make = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "make-invoice",
    "--amount",
    "1234",
    "--description",
    description,
  ]);
  expect(make.status).toBe(0);
  const invoice = JSON.parse(make.stdout) as Transaction & {
    amountSat: number;
  };
  expect(typeof invoice.paymentHash).toBe("string");
  expect(invoice.paymentHash.length).toBeGreaterThan(0);

  const lookup = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "lookup-transaction",
    invoice.paymentHash,
  ]);
  expect(lookup.status).toBe(0);
  const tx = JSON.parse(lookup.stdout) as Transaction & { amountSat: number };
  expect(tx.paymentHash).toBe(invoice.paymentHash);
  expect(tx.type).toBe("incoming");
  expect(tx.amountSat).toBe(1234);
  expect(tx.description).toBe(description);
  expect(tx.invoice.startsWith("ln")).toBe(true);
});

test("lookup-transaction errors for an unknown payment hash", () => {
  const bogusHash = "0".repeat(64);
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "lookup-transaction",
    bogusHash,
  ]);
  expect(result.status).toBe(1);
  const out = JSON.parse(result.stdout);
  expect(typeof out.error).toBe("string");
  expect(out.error.length).toBeGreaterThan(0);
});
