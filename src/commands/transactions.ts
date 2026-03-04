import { Command } from "commander";
import { ListTransactionsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerTransactionsCommand(program: Command): void {
  program
    .command("list-transactions")
    .description("List payment history")
    .option("--limit <number>", "Maximum number of transactions to return", "20")
    .option("--offset <number>", "Pagination offset", "0")
    .action(async (opts: { limit: string; offset: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const params = new URLSearchParams({
          limit: opts.limit,
          offset: opts.offset,
        });
        const result = await client.get<ListTransactionsResponse>(
          `/api/transactions?${params}`,
        );
        output(result);
      });
    });
}
