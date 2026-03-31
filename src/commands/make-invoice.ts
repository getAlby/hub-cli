import { Command } from "commander";
import { Transaction } from "../types.js";
import { getClient, handleError, mapTransaction, output } from "../utils.js";

export function registerMakeInvoiceCommand(program: Command): void {
  program
    .command("make-invoice")
    .description("Create a Lightning invoice (BOLT11)")
    .requiredOption("--amount <sats>", "Amount in satoshis", parseInt)
    .option("--description <string>", "Invoice description", "")
    .action(async (opts: { amount: number; description: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.post<Transaction>("/api/invoices", {
          amount: opts.amount * 1000,
          description: opts.description,
        });
        output(mapTransaction(result));
      });
    });
}
