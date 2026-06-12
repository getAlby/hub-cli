import { Command } from "commander";
import { ListAppsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerListAppsCommand(program: Command): void {
  program
    .command("list-apps")
    .description("List NWC app connections")
    .option(
      "--name <name>",
      "Filter apps by name (prefix match). Use this to look up a single app's balance.",
    )
    .action(async (opts: { name?: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const params = new URLSearchParams();
        if (opts.name) {
          params.set("filters", JSON.stringify({ name: opts.name }));
        }
        const query = params.toString();
        const result = await client.get<ListAppsResponse>(
          `/api/apps${query ? `?${query}` : ""}`,
        );
        output(result);
      });
    });
}
