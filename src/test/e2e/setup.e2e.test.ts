import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import { TEST_PASSWORD, spawnHub, runCommand, killHub } from "./helpers";

const HUB_PORT = 18080; // non-default port to avoid clashing with a real hub
const HUB_URL = `http://localhost:${HUB_PORT}`;

let hubProcess: ChildProcess;
let workDir: string;

beforeEach(async () => {
  ({ hubProcess, workDir } = await spawnHub(HUB_PORT, "hub-cli-e2e-"));
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test("cannot setup with an empty password", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    "",
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(1);
  const output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual(
    "Failed to setup node: no unlock password provided",
  );
});

test("setup initializes the hub without specifying a backend", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
  ]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.success).toBe(true);
});

test("setup initializes the hub with backend specified", () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.success).toBe(true);
});

test("can setup multiple times if node never started", () => {
  let result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(0);
  result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(0);
});

test("cannot setup if node has ever been started", async () => {
  let result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(0);
  result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(0);

  result = runCommand(["--url", HUB_URL, "start", "--password", TEST_PASSWORD]);
  expect(result.status).toBe(0);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  result = runCommand([
    "--url",
    HUB_URL,
    "setup",
    "--password",
    TEST_PASSWORD,
    "--backend",
    "LDK",
  ]);
  expect(result.status).toBe(1);
  const output = JSON.parse(result.stdout);
  expect(typeof output.error).toBe("string");
  expect(output.error).toEqual("Failed to setup node: setup already completed");
});
