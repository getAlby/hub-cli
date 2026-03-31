import { Command } from "commander";
import { LSPOrderResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerRequestLspOrderCommand(program: Command): void {
  program
    .command("request-lsp-order")
    .description(
      "Request a Lightning invoice from an LSP to open a channel. Pay the returned invoice to open the channel.",
    )
    .requiredOption(
      "--amount <sats>",
      "Desired incoming liquidity in satoshis",
      parseInt,
    )
    .requiredOption(
      "--lsp-type <string>",
      'LSP type (from "type" field in channel-suggestions)',
    )
    .requiredOption(
      "--lsp-identifier <string>",
      'LSP identifier (from "identifier" field in channel-suggestions)',
    )
    .option("--public", "Open a public channel (default: private)", false)
    .action(
      async (opts: {
        amount: number;
        lspType: string;
        lspIdentifier: string;
        public: boolean;
      }) => {
        await handleError(async () => {
          const client = getClient(program);
          const result = await client.post<LSPOrderResponse>(
            "/api/lsp-orders",
            {
              amount: opts.amount,
              lspType: opts.lspType,
              lspIdentifier: opts.lspIdentifier,
              public: opts.public,
            },
          );
          const { fee, invoiceAmount, incomingLiquidity, outgoingLiquidity } = result;
          output({
            invoice: result.invoice,
            feeSat: fee,
            invoiceAmountSat: invoiceAmount,
            incomingLiquiditySat: incomingLiquidity,
            outgoingLiquiditySat: outgoingLiquidity,
          });
        });
      },
    );
}
