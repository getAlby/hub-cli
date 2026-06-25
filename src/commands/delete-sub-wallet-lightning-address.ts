import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerDeleteSubWalletLightningAddressCommand(
  program: Command,
): void {
  program
    .command("delete-sub-wallet-lightning-address")
    .description("Remove the lightning address from a sub-wallet")
    .requiredOption("--app-id <id>", "Sub-wallet app ID", parseInt)
    .action(async (opts: { appId: number }) => {
      await handleError(async () => {
        const client = getClient(program);

        // The lightning-addresses endpoint returns 204 No Content on success.
        await client.delete(`/api/lightning-addresses/${opts.appId}`);
        output({ success: true, appId: opts.appId });
      });
    });
}
