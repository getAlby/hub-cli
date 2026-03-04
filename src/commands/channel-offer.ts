import { Command } from "commander";
import { LSPChannelOffer } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerChannelOfferCommand(program: Command): void {
  program
    .command("get-channel-offer")
    .description(
      "Get Alby LSP channel offer with recommended size and fee (requires linked Alby account)",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<LSPChannelOffer>("/api/channel-offer");
        output(result);
      });
    });
}
