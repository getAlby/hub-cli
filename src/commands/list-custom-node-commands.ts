import { Command } from "commander";
import { CustomNodeCommandsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerListCustomNodeCommandsCommand(program: Command): void {
  program
    .command("list-custom-node-commands")
    .description(
      "List custom node (debug) commands supported by the active backend, with their arguments",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result =
          await client.get<CustomNodeCommandsResponse>("/api/commands");
        output(result);
      });
    });
}
