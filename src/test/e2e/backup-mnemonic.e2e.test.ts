import { test, expect, beforeEach, afterEach } from "vitest";
import type { ChildProcess } from "node:child_process";
import { existsSync, statSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TEST_PASSWORD, spawnHub, runCommand, waitForInfo, killHub } from "./helpers";

const HUB_PORT = 18087;
const HUB_URL = `http://localhost:${HUB_PORT}`;
const BACKUP_FILE = join(tmpdir(), "hub-cli-e2e-backup.recovery");

let hubProcess: ChildProcess;
let token: string;

beforeEach(async () => {
  ({ hubProcess } = await spawnHub(HUB_PORT, "hub-cli-e2e-backup-"));

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
});

afterEach(async () => {
  if (hubProcess) await killHub(hubProcess);
  if (existsSync(BACKUP_FILE)) unlinkSync(BACKUP_FILE);
});

test("backup-mnemonic writes recovery file", { timeout: 60_000 }, async () => {
  const result = runCommand([
    "--url",
    HUB_URL,
    "--token",
    token,
    "backup-mnemonic",
    "--password",
    TEST_PASSWORD,
    "--output",
    BACKUP_FILE,
  ]);
  expect(result.status).toBe(0);
  const out = JSON.parse(result.stdout);
  expect(out.success).toBe(true);
  expect(out.file).toBe(BACKUP_FILE);
  expect(existsSync(BACKUP_FILE)).toBe(true);
  expect(statSync(BACKUP_FILE).size).toBeGreaterThan(0);
  const contents = readFileSync(BACKUP_FILE, "utf-8").trim();
  expect(contents.split(/\s+/).length).toBe(12);
});
