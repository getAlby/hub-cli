import { Command } from "commander";
import { Transaction } from "../types.js";
import { getClient, handleError, mapTransaction, output } from "../utils.js";

export function registerPayInvoiceCommand(program: Command): void {
  program
    .command("pay-invoice <invoice>")
    .description("Pay a Lightning invoice (BOLT11)")
    .option(
      "--amount <sats>",
      "Amount in satoshis (for zero-amount invoices)",
      parseInt,
    )
    .option(
      "--from-app-id <id>",
      "Pay from a specific app instead of the main hub wallet",
      parseInt,
    )
    .action(
      async (
        invoice: string,
        opts: { amount?: number; fromAppId?: number },
      ) => {
        await handleError(async () => {
          const client = getClient(program);
          const body: Record<string, unknown> = {};
          if (opts.amount !== undefined) {
            body.amount = opts.amount * 1000; // convert to msats
          }
          if (opts.fromAppId !== undefined) {
            body.fromAppId = opts.fromAppId;
          }
          const result = await client.post<Transaction>(
            `/api/payments/${invoice}`,
            Object.keys(body).length > 0 ? body : undefined,
          );
          output(mapTransaction(result));
        });
      },
    );
}
