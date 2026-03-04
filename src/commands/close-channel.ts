import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerCloseChannelCommand(program: Command): void {
  program
    .command("close-channel")
    .description("Close a lightning channel")
    .requiredOption("--peer-id <pubkey>", "Peer's lightning public key")
    .requiredOption("--channel-id <id>", "Channel ID")
    .option(
      "--force",
      "Force close the channel (not recommended - only as last resort)",
      false,
    )
    .action(
      async (opts: { peerId: string; channelId: string; force: boolean }) => {
        await handleError(async () => {
          const client = getClient(program);
          const query = opts.force ? "?force=true" : "";
          const result = await client.delete<Record<string, never>>(
            `/api/peers/${opts.peerId}/channels/${opts.channelId}${query}`,
          );
          output(result);
        });
      },
    );
}
