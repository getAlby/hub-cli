import { Command } from "commander";
import { ListAppsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerListAppsCommand(program: Command): void {
  program
    .command("list-apps")
    .description("List NWC app connections")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<ListAppsResponse>("/api/apps");
        output(result);
      });
    });
}
