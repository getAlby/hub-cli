import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  killHub,
  waitForInfo,
  bitcoinRpc,
  waitForBalances,
  waitForChannels,
} from "./helpers";
import type { NodeConnectionInfo } from "../../types.js";

const HUB_A_PORT = 18083;
const HUB_B_PORT = 18084;
const HUB_A_LDK_PORT = 19736;
const HUB_B_LDK_PORT = 19737;
const HUB_A_URL = `http://localhost:${HUB_A_PORT}`;
const HUB_B_URL = `http://localhost:${HUB_B_PORT}`;

let hubAProcess: ChildProcess;
let hubBProcess: ChildProcess;
let tokenA: string;
let tokenB: string;
let hubBConnInfo: NodeConnectionInfo;
let miningAddr: string;

beforeAll(async () => {
  ({ hubProcess: hubAProcess } = await spawnHub(
    HUB_A_PORT,
    "hub-cli-e2e-hub-a-",
    HUB_A_LDK_PORT,
  ));
  ({ hubProcess: hubBProcess } = await spawnHub(
    HUB_B_PORT,
    "hub-cli-e2e-hub-b-",
    HUB_B_LDK_PORT,
  ));

  // Setup and start Hub A
  const setupA = runCommand([
    "--url",
    HUB_A_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  if (setupA.status !== 0)
    throw new Error(`Hub A setup failed: ${setupA.stderr}`);

  const startA = runCommand([
    "--url",
    HUB_A_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  if (startA.status !== 0)
    throw new Error(`Hub A start failed: ${startA.stderr}`);
  tokenA = JSON.parse(startA.stdout).token;

  // Setup and start Hub B
  const setupB = runCommand([
    "--url",
    HUB_B_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  if (setupB.status !== 0)
    throw new Error(`Hub B setup failed: ${setupB.stderr}`);

  const startB = runCommand([
    "--url",
    HUB_B_URL,
    "start",
    "--password",
    TEST_PASSWORD,
  ]);
  if (startB.status !== 0)
    throw new Error(`Hub B start failed: ${startB.stderr}`);
  tokenB = JSON.parse(startB.stdout).token;

  // Wait for both hubs to be running
  await waitForInfo(HUB_A_URL, (info) => info.running);
  await waitForInfo(HUB_B_URL, (info) => info.running);

  // Get Hub B's connection info
  const connInfoResult = runCommand([
    "--url",
    HUB_B_URL,
    "--token",
    tokenB,
    "get-node-connection-info",
  ]);
  if (connInfoResult.status !== 0) {
    throw new Error(
      `get-node-connection-info failed: ${connInfoResult.stderr}`,
    );
  }
  hubBConnInfo = JSON.parse(connInfoResult.stdout) as NodeConnectionInfo;

  // Mine 101 blocks so coinbase rewards are mature and spendable
  miningAddr = (await bitcoinRpc("getnewaddress")) as string;
  await bitcoinRpc("generatetoaddress", [101, miningAddr]);
}, 120_000);

afterAll(async () => {
  if (hubAProcess) await killHub(hubAProcess);
  if (hubBProcess) await killHub(hubBProcess);
});

test("deposits on-chain funds to hub A", { timeout: 120_000 }, async () => {
  const addrResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "get-onchain-address",
  ]);
  expect(addrResult.status).toBe(0);
  const { address } = JSON.parse(addrResult.stdout);
  expect(typeof address).toBe("string");
  expect(address.length).toBeGreaterThan(0);

  await bitcoinRpc("sendtoaddress", [address, 0.1]);

  miningAddr = (await bitcoinRpc("getnewaddress")) as string;
  await bitcoinRpc("generatetoaddress", [6, miningAddr]);

  const balances = await waitForBalances(
    HUB_A_URL,
    tokenA,
    (b) => b.onchain.spendable > 0,
    120_000,
  );
  expect(balances.onchain.spendable).toBeGreaterThan(0);
});

test("connects hub A as peer to hub B", { timeout: 60_000 }, async () => {
  const connectResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "connect-peer",
    "--pubkey",
    hubBConnInfo.pubkey,
    "--address",
    "127.0.0.1",
    "--port",
    String(hubBConnInfo.port),
  ]);
  expect(connectResult.status).toBe(0);
  const connectOutput = JSON.parse(connectResult.stdout);
  expect(connectOutput.success).toBe(true);

  const peersResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "list-peers",
  ]);
  expect(peersResult.status).toBe(0);
  const peers = JSON.parse(peersResult.stdout);
  const hubBPeer = peers.find(
    (p: { nodeId: string }) => p.nodeId === hubBConnInfo.pubkey,
  );
  expect(hubBPeer).toBeDefined();
});

test("opens channel from hub A to hub B", { timeout: 120_000 }, async () => {
  const openResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "open-channel",
    "--pubkey",
    hubBConnInfo.pubkey,
    "--amount-sats",
    "100000",
  ]);
  expect(openResult.status).toBe(0);
  const openOutput = JSON.parse(openResult.stdout);
  expect(typeof openOutput.fundingTxId).toBe("string");
  expect(openOutput.fundingTxId.length).toBeGreaterThan(0);

  await bitcoinRpc("generatetoaddress", [6, miningAddr]);

  const hubAChannels = await waitForChannels(
    HUB_A_URL,
    tokenA,
    (chs) =>
      chs.some((c) => c.remotePubkey === hubBConnInfo.pubkey && c.active),
    120_000,
  );
  const hubAActiveChannel = hubAChannels.find(
    (c) => c.remotePubkey === hubBConnInfo.pubkey && c.active,
  );
  expect(hubAActiveChannel).toBeDefined();

  const hubBChannels = await waitForChannels(
    HUB_B_URL,
    tokenB,
    (chs) => chs.some((c) => c.active),
    120_000,
  );
  const hubBActiveChannel = hubBChannels.find((c) => c.active);
  expect(hubBActiveChannel).toBeDefined();
});

test("sends sats from hub A to hub B", { timeout: 120_000 }, async () => {
  const AMOUNT_SATS = 20_000;

  // Hub B creates an invoice
  const invoiceResult = runCommand([
    "--url",
    HUB_B_URL,
    "--token",
    tokenB,
    "make-invoice",
    "--amount",
    String(AMOUNT_SATS),
    "--description",
    "e2e test payment",
  ]);
  expect(invoiceResult.status).toBe(0);
  const invoiceData = JSON.parse(invoiceResult.stdout) as { invoice: string };
  expect(typeof invoiceData.invoice).toBe("string");

  // Record Hub A's balance before payment
  const balancesBeforeResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "balances",
  ]);
  expect(balancesBeforeResult.status).toBe(0);
  const balancesBeforeData = JSON.parse(balancesBeforeResult.stdout) as {
    lightning: { totalSpendable: number };
  };
  const hubASpendableBefore = balancesBeforeData.lightning.totalSpendable;
  expect(hubASpendableBefore).toBeGreaterThan(0);

  // Hub A pays the invoice
  const payResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "pay-invoice",
    invoiceData.invoice,
  ]);
  expect(payResult.status).toBe(0);

  // Verify Hub A's balance decreased
  const hubABalancesAfterResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "balances",
  ]);
  expect(hubABalancesAfterResult.status).toBe(0);
  const hubABalancesAfterData = JSON.parse(hubABalancesAfterResult.stdout) as {
    lightning: { totalSpendable: number };
  };
  expect(hubABalancesAfterData.lightning.totalSpendable).toBeLessThan(
    hubASpendableBefore,
  );

  // Wait for Hub B's channel localBalance to reflect the received payment.
  // /api/channels is not filtered by IsUsable (unlike /api/balances), and localBalance is in msats.
  await waitForChannels(
    HUB_B_URL,
    tokenB,
    (chs) => chs.some((c) => c.localBalance > 0),
    60_000,
  );

  // Verify via CLI that Hub B's balance shows received sats
  const hubBBalancesAfterResult = runCommand([
    "--url",
    HUB_B_URL,
    "--token",
    tokenB,
    "balances",
  ]);
  const hubBBalancesAfterData = JSON.parse(hubBBalancesAfterResult.stdout) as {
    lightning: { totalSpendable: number };
  };
  expect(hubBBalancesAfterData.lightning.totalSpendable).toBeGreaterThan(0);
});
