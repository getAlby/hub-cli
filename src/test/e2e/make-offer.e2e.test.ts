import { test, expect, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  killHub,
  bitcoinRpc,
  waitForBalances,
  waitForChannels,
} from "./helpers";
import type { NodeConnectionInfo } from "../../types.js";

const HUB_A_PORT = 18090;
const HUB_B_PORT = 18091;
const HUB_A_LDK_PORT = 19740;
const HUB_B_LDK_PORT = 19741;
const HUB_A_URL = `http://localhost:${HUB_A_PORT}`;
const HUB_B_URL = `http://localhost:${HUB_B_PORT}`;

let hubAProcess: ChildProcess;
let hubBProcess: ChildProcess;
let tokenA: string;
let miningAddr: string;

beforeAll(async () => {
  ({ hubProcess: hubAProcess } = await spawnHub(
    HUB_A_PORT,
    "hub-cli-e2e-offer-a-",
    HUB_A_LDK_PORT,
  ));
  ({ hubProcess: hubBProcess } = await spawnHub(
    HUB_B_PORT,
    "hub-cli-e2e-offer-b-",
    HUB_B_LDK_PORT,
  ));

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
  const tokenB = JSON.parse(startB.stdout).token;

  // Mine 101 blocks for coinbase maturity
  miningAddr = (await bitcoinRpc("getnewaddress")) as string;
  await bitcoinRpc("generatetoaddress", [101, miningAddr]);

  // Fund Hub A
  const addrResult = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "get-onchain-address",
  ]);
  if (addrResult.status !== 0)
    throw new Error(`get-onchain-address failed: ${addrResult.stderr}`);
  const { address } = JSON.parse(addrResult.stdout);
  await bitcoinRpc("sendtoaddress", [address, 0.1]);
  await bitcoinRpc("generatetoaddress", [6, miningAddr]);
  await waitForBalances(
    HUB_A_URL,
    tokenA,
    (b) => b.onchain.spendable > 0,
    120_000,
  );

  // Get Hub B connection info and connect peer
  const connInfoResult = runCommand([
    "--url",
    HUB_B_URL,
    "--token",
    tokenB,
    "get-node-connection-info",
  ]);
  if (connInfoResult.status !== 0)
    throw new Error(
      `get-node-connection-info failed: ${connInfoResult.stderr}`,
    );
  const hubBConnInfo = JSON.parse(connInfoResult.stdout) as NodeConnectionInfo;

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
  if (connectResult.status !== 0)
    throw new Error(`connect-peer failed: ${connectResult.stderr}`);

  // Open channel Hub A → Hub B (Hub B is the introduction node for Hub A's BOLT-12 blinded paths)
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
  if (openResult.status !== 0)
    throw new Error(`open-channel failed: ${openResult.stderr}`);
  await bitcoinRpc("generatetoaddress", [6, miningAddr]);
  await waitForChannels(
    HUB_A_URL,
    tokenA,
    (chs) =>
      chs.some((c) => c.remotePubkey === hubBConnInfo.pubkey && c.active),
    120_000,
  );
}, 240_000);

afterAll(async () => {
  if (hubAProcess) await killHub(hubAProcess);
  if (hubBProcess) await killHub(hubBProcess);
});

test("make-offer returns a BOLT-12 offer string", { timeout: 30_000 }, async () => {
  const result = runCommand([
    "--url",
    HUB_A_URL,
    "--token",
    tokenA,
    "make-offer",
    "--description",
    "e2e test offer",
  ]);
  expect(result.status).toBe(0);
  const offer = JSON.parse(result.stdout) as string;
  expect(typeof offer).toBe("string");
  expect(offer.startsWith("lno1")).toBe(true);
});
