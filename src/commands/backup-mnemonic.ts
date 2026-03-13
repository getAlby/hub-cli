import { Command } from "commander";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { getClient, handleError, output } from "../utils.js";

const DEFAULT_BACKUP_DIR = join(homedir(), ".hub-cli");
const DEFAULT_BACKUP_FILE = join(DEFAULT_BACKUP_DIR, "albyhub.recovery");

export function registerBackupMnemonicCommand(program: Command): void {
  program
    .command("backup-mnemonic")
    .description("Export the wallet recovery phrase to a file")
    .requiredOption("-p, --password <string>", "Unlock password")
    .option("--output <file>", "Output file path", DEFAULT_BACKUP_FILE)
    .action(async (opts: { password: string; output: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.post<{ mnemonic: string }>("/api/mnemonic", {
          unlockPassword: opts.password,
        });
        const filePath = resolve(opts.output);
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        if (dir) mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, result.mnemonic, { encoding: "utf-8", mode: 0o600 });
        output({ success: true, file: filePath });
      });
    });
}
