import { Command } from "commander";
import { PeerDetails } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerPeersCommand(program: Command): void {
  program
    .command("list-peers")
    .description("List connected Lightning peers")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<PeerDetails[]>("/api/peers");
        output(result);
      });
    });
}
