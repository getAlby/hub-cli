import { Command } from "commander";
import { ChannelPeerSuggestion } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerListChannelSuggestionsCommand(program: Command): void {
  program
    .command("get-channel-suggestions")
    .description(
      "List available LSP providers with fees and channel size limits",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<ChannelPeerSuggestion[]>(
          "/api/channels/suggestions",
        );
        output(result);
      });
    });
}
