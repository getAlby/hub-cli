import { Command } from "commander";
import { CreateLightningAddressRequest } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerCreateSubWalletLightningAddressCommand(
  program: Command,
): void {
  program
    .command("create-sub-wallet-lightning-address")
    .description(
      "Assign a lightning address to a sub-wallet (requires a connected Alby account)",
    )
    .requiredOption("--app-id <id>", "Sub-wallet app ID", parseInt)
    .requiredOption(
      "--address <handle>",
      'Lightning address handle — the part before the @ (e.g. "alice" for alice@getalby.com)',
    )
    .action(async (opts: { appId: number; address: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const body: CreateLightningAddressRequest = {
          appId: opts.appId,
          address: opts.address,
        };

        // The lightning-addresses endpoint returns 204 No Content on success.
        await client.post("/api/lightning-addresses", body);
        output({ success: true, appId: opts.appId, address: opts.address });
      });
    });
}
