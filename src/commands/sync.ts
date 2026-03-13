import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Trigger a wallet sync (queued, may take up to a minute)")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        await client.post<void>("/api/wallet/sync");
        output({ success: true, message: "Wallet sync queued. May take up to a minute." });
      });
    });
}
