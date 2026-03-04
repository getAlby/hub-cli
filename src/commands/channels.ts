import { Command } from "commander";
import { Channel } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerChannelsCommand(program: Command): void {
  program
    .command("list-channels")
    .description("List Lightning channels")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<Channel[]>("/api/channels");
        output(result);
      });
    });
}
