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
    .option("--sub-wallets", "Only list sub-wallets")
    .action(async (opts: { name?: string; subWallets?: boolean }) => {
      await handleError(async () => {
        const client = getClient(program);
        const params = new URLSearchParams();
        const filters: Record<string, unknown> = {};
        if (opts.name) filters.name = opts.name;
        if (opts.subWallets) filters.subWallets = true;
        if (Object.keys(filters).length > 0) {
          params.set("filters", JSON.stringify(filters));
        }
        const query = params.toString();
        const result = await client.get<ListAppsResponse>(
          `/api/apps${query ? `?${query}` : ""}`,
        );
        output(result);
      });
    });
}
