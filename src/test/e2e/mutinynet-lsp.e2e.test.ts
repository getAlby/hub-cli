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
} from "./helpers.js";
import type { ChannelPeerSuggestion, Transaction } from "../../types.js";

try {
  process.loadEnvFile(join(E2E_DIR, ".env"));
} catch {
  // .env file not present — tests will be skipped
}

const MUTINYNET_NWC_URL = process.env.MUTINYNET_NWC_URL;

const HUB_PORT = 18085;
const HUB_LDK_PORT = 19738;
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let token: string;

beforeAll(async () => {
  if (!MUTINYNET_NWC_URL) return;

  ({ hubProcess } = await spawnMutinynetHub(
    HUB_PORT,
    "hub-cli-e2e-mutinynet-",
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
}, 120_000);

afterAll(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test.skipIf(!MUTINYNET_NWC_URL)(
  "opens channel via LSP order, NWC client pays invoice",
  { timeout: 120_000 },
  async () => {
    const suggestionsResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "get-channel-suggestions",
    ]);
    expect(suggestionsResult.status).toBe(0);
    const suggestions = JSON.parse(
      suggestionsResult.stdout,
    ) as ChannelPeerSuggestion[];
    expect(suggestions.length).toBeGreaterThan(0);
    const lsp = suggestions.find(
      (suggestion) =>
        suggestion.identifier === "megalith" &&
        suggestion.network === "signet" &&
        suggestion.paymentMethod === "lightning",
    );
    expect(lsp).toBeTruthy();
    if (!lsp) {
      return;
    }

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
    expect(orderResult.status).toBe(0);
    const order = JSON.parse(orderResult.stdout) as { invoice: string };
    expect(typeof order.invoice).toBe("string");
    expect(order.invoice.startsWith("ln")).toBe(true);

    const nwcClient = new NWCClient({
      nostrWalletConnectUrl: MUTINYNET_NWC_URL!,
    });
    try {
      const payResult = await nwcClient.payInvoice({ invoice: order.invoice });
      expect(typeof payResult.preimage).toBe("string");
      expect(payResult.preimage.length).toBeGreaterThan(0);
    } finally {
      nwcClient.close();
    }

    await waitForChannels(
      HUB_URL,
      token,
      (chs) => chs.some((c) => c.active),
      120_000,
    );
  },
);

test.skipIf(!MUTINYNET_NWC_URL)(
  "hub makes invoice, NWC client pays it",
  { timeout: 60_000 },
  async () => {
    const invoiceResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "make-invoice",
      "--amount",
      "2000",
      "--description",
      "mutinynet e2e test",
    ]);
    expect(invoiceResult.status).toBe(0);
    const tx = JSON.parse(invoiceResult.stdout) as Transaction;
    expect(typeof tx.invoice).toBe("string");
    expect(tx.invoice.length).toBeGreaterThan(0);

    const nwcClient = new NWCClient({
      nostrWalletConnectUrl: MUTINYNET_NWC_URL!,
    });
    try {
      const payResult = await nwcClient.payInvoice({ invoice: tx.invoice });
      expect(typeof payResult.preimage).toBe("string");
      expect(payResult.preimage.length).toBeGreaterThan(0);
    } finally {
      nwcClient.close();
    }
  },
);

test.skipIf(!MUTINYNET_NWC_URL)(
  "NWC client makes invoice, hub CLI pays it",
  { timeout: 60_000 },
  async () => {
    const nwcClient = new NWCClient({
      nostrWalletConnectUrl: MUTINYNET_NWC_URL!,
    });
    try {
      const makeResult = await nwcClient.makeInvoice({ amount: 500_000 });
      expect(typeof makeResult.invoice).toBe("string");
      expect(makeResult.invoice.length).toBeGreaterThan(0);

      const payResult = runCommand([
        "--url",
        HUB_URL,
        "--token",
        token,
        "pay-invoice",
        makeResult.invoice,
      ]);
      expect(payResult.status).toBe(0);
    } finally {
      nwcClient.close();
    }
  },
);

test.skipIf(!MUTINYNET_NWC_URL)(
  "closes the channel",
  { timeout: 60_000 },
  async () => {
    const channelsResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "list-channels",
    ]);
    expect(channelsResult.status).toBe(0);
    const channels = JSON.parse(channelsResult.stdout) as {
      id: string;
      remotePubkey: string;
      active: boolean;
    }[];
    const channel = channels.find((c) => c.active);
    expect(channel).toBeDefined();

    const closeResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      token,
      "close-channel",
      "--peer-id",
      channel!.remotePubkey,
      "--channel-id",
      channel!.id,
    ]);
    expect(closeResult.status).toBe(0);
  },
);
