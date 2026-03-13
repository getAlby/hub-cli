import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import {
  TEST_PASSWORD,
  spawnHub,
  runCommand,
  waitForInfo,
  killHub,
} from "./helpers";

const HUB_PORT = 18088;
const HUB_URL = `http://localhost:${HUB_PORT}`;
const NEW_PASSWORD = "new-test-password-e2e";

let hubProcess: ChildProcess;

beforeEach(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-changepw-"));

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

  await waitForInfo(HUB_URL, (i) => i.running);
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
});

test(
  "change-password fails if confirmations do not match",
  { timeout: 60_000 },
  async () => {
    // avoid rate limit
    await new Promise((r) => setTimeout(r, 3000));

    const token = runCommand([
      "--url",
      HUB_URL,
      "unlock",
      "--password",
      TEST_PASSWORD,
    ]);
    if (token.status !== 0) throw new Error(`unlock failed: ${token.stderr}`);
    const { token: jwt } = JSON.parse(token.stdout) as { token: string };

    const result = runCommand([
      "--url",
      HUB_URL,
      "--token",
      jwt,
      "change-password",
      "--current-password",
      TEST_PASSWORD,
      "--confirm-current-password",
      "wrong-confirmation",
      "--new-password",
      NEW_PASSWORD,
    ]);
    expect(result.status).toBe(1);
    const out = JSON.parse(result.stdout);
    expect(typeof out.error).toBe("string");
    expect(out.error).toEqual("Current password and confirmation do not match");
  },
);

test(
  "change-password succeeds and new password works",
  { timeout: 60_000 },
  async () => {
    // avoid rate limit from beforeEach unlock calls
    await new Promise((r) => setTimeout(r, 3000));

    const token = runCommand([
      "--url",
      HUB_URL,
      "unlock",
      "--password",
      TEST_PASSWORD,
    ]);
    if (token.status !== 0) throw new Error(`unlock failed: ${token.stderr}`);
    const { token: jwt } = JSON.parse(token.stdout) as { token: string };

    const changeResult = runCommand([
      "--url",
      HUB_URL,
      "--token",
      jwt,
      "change-password",
      "--current-password",
      TEST_PASSWORD,
      "--confirm-current-password",
      TEST_PASSWORD,
      "--new-password",
      NEW_PASSWORD,
    ]);
    expect(changeResult.status).toBe(0);
    const out = JSON.parse(changeResult.stdout);
    expect(out.success).toBe(true);

    // avoid rate limit
    await new Promise((r) => setTimeout(r, 3000));

    // old password should no longer work
    const oldStart = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(oldStart.status).toBe(1);

    // avoid rate limit
    await new Promise((r) => setTimeout(r, 3000));

    // new password should work
    const newStart = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      NEW_PASSWORD,
    ]);
    expect(newStart.status).toBe(0);
    const newStartOut = JSON.parse(newStart.stdout);
    expect(typeof newStartOut.token).toBe("string");

    // avoid rate limit
    await new Promise((r) => setTimeout(r, 3000));

    // old password should no longer work
    const oldUnlock = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      TEST_PASSWORD,
    ]);
    expect(oldUnlock.status).toBe(1);

    // avoid rate limit
    await new Promise((r) => setTimeout(r, 3000));

    // new password should work
    const newUnlock = runCommand([
      "--url",
      HUB_URL,
      "start",
      "--password",
      NEW_PASSWORD,
    ]);
    expect(newUnlock.status).toBe(0);
    const newOut = JSON.parse(newUnlock.stdout);
    expect(typeof newOut.token).toBe("string");
  },
);
