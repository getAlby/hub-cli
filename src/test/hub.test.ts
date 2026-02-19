import { test, expect } from "vitest";
import { spawnSync } from "node:child_process";

test("shows help when run with no arguments", () => {
  const result = spawnSync("node", ["build/index.js"], {
    encoding: "utf-8",
    cwd: process.cwd(),
  });
  const output = result.stdout + result.stderr;
  expect(output).toContain("Usage: hub-cli");
  expect(output).toContain("unlock");
  expect(output).toContain("info");
  expect(output).toContain("balances");
  expect(output).toContain("channels");
});
