import { test, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import type { ChildProcess } from "node:child_process";
import { NWCClient } from "@getalby/sdk/nwc";
import {
  E2E_DIR,
  TEST_PASSWORD,
  spawnMutinynetHub,
  runCommand,
  killHub,
  waitForInfo,
  waitForChannels,
} from "../helpers.js";
import type { ChannelPeerSuggestion, Transaction } from "../../../types.js";

type InvoiceResult = {
  paymentRequest: string;
  paymentHash: string;
};

try {
  process.loadEnvFile(join(E2E_DIR, ".env"));
} catch {
  // .env file not present — tests will be skipped
}

const MUTINYNET_NWC_URL = process.env.MUTINYNET_NWC_URL;

const HUB_PORT = 18089;
const HUB_LDK_PORT = 19739;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  if (!MUTINYNET_NWC_URL) return;

  ({ hubProcess } = await spawnMutinynetHub(
    HUB_PORT,
    "hub-cli-e2e-pay-addr-",
    HUB_LDK_PORT,
  ));

  const setup = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  if (setup.status !== 0) throw new Error(`Hub setup failed: ${setup.stderr}`);

  const start = runCommand([
    "--url",
    HUB_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  if (start.status !== 0) throw new Error(`Hub start failed: ${start.stderr}`);
  token = JSON.parse(start.stdout).token;

  await waitForInfo(HUB_URL, (info) => info.running);

  // Open a channel via LSP so the hub can send payments
  const suggestionsResult = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "get-channel-suggestions",
  ]);
  if (suggestionsResult.status !== 0)
    throw new Error("get-channel-suggestions failed");
  const suggestions = JSON.parse(
    suggestionsResult.stdout,
  ) as ChannelPeerSuggestion[];
  const lsp = suggestions.find(
    (s) =>
      s.identifier === "megalith" &&
      s.network === "signet" &&
      s.paymentMethod === "lightning",
  );
  if (!lsp) throw new Error("Megalith signet LSP not found in suggestions");

  const orderResult = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "request-lsp-order",
    "--amount",
    String(lsp.minimumChannelSize),
    "--lsp-type",
    lsp.type,
    "--lsp-identifier",
    lsp.identifier,
  ]);
  if (orderResult.status !== 0) throw new Error("request-lsp-order failed");
  const order = JSON.parse(orderResult.stdout) as { invoice: string };

  const nwcClient = new NWCClient({
    nostrWalletConnectUrl: MUTINYNET_NWC_URL!,
  });
  try {
    await nwcClient.payInvoice({ invoice: order.invoice });
  } finally {
    nwcClient.close();
  }

  await waitForChannels(
    HUB_URL,
    token,
    (chs) => chs.some((c) => c.active),
    120_000,
  );

  // Fund the hub with sats so it has outbound liquidity to pay
  const invoiceResult = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "make-invoice",
    "--amount",
    "10000",
    "--description",
    "fund hub for request-invoice-from-lightning-address e2e",
  ]);
  if (invoiceResult.status !== 0) throw new Error("make-invoice failed");
  const { invoice } = JSON.parse(invoiceResult.stdout) as { invoice: string };

  const fundClient = new NWCClient({
    nostrWalletConnectUrl: MUTINYNET_NWC_URL!,
  });
  try {
    await fundClient.payInvoice({ invoice });
  } finally {
    fundClient.close();
  }
}, 180_000);

afterAll(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test.skipIf(!MUTINYNET_NWC_URL)(
  "request-invoice-from-lightning-address then pay-invoice pays pmlspm@getalby.com",
  { timeout: 60_000 },
  async () => {
    const invoiceResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "request-invoice-from-lightning-address",
      "--address",
      "pmlspm@getalby.com",
      "--amount",
      "100",
    ]);
    expect(invoiceResult.status).toBe(0);
    const { paymentRequest, paymentHash } = JSON.parse(
      invoiceResult.stdout,
    ) as InvoiceResult;
    expect(typeof paymentRequest).toBe("string");
    expect(paymentRequest.startsWith("ln")).toBe(true);
    expect(typeof paymentHash).toBe("string");

    const payResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "pay-invoice",
      paymentRequest,
    ]);
    expect(payResult.status).toBe(0);
    const tx = JSON.parse(payResult.stdout) as Transaction;
    expect(tx.state).toBe("settled");
    expect(tx.type).toBe("outgoing");
  },
);
