import { Command } from "commander";
import { Transaction } from "../types.js";
import { getClient, handleError, mapTransaction, output } from "../utils.js";

export function registerLookupTransactionCommand(program: Command): void {
  program
    .command("lookup-transaction <paymentHash>")
    .description("Look up a specific transaction by payment hash")
    .action(async (paymentHash: string) => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<Transaction>(
          `/api/transactions/${paymentHash}`,
        );
        output(mapTransaction(result));
      });
    });
}
