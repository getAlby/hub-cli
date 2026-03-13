import { Command } from "commander";
import { LightningAddress } from "@getalby/lightning-tools";
import { handleError, output } from "../utils.js";

export function registerRequestInvoiceFromLightningAddressCommand(
  program: Command,
): void {
  program
    .command("request-invoice-from-lightning-address")
    .description("Request an invoice from a lightning address")
    .requiredOption("-a, --address <ln-address>", "Lightning address")
    .requiredOption("-s, --amount <sats>", "Amount in satoshis", parseInt)
    .option("--comment <text>", "Optional comment")
    .action(
      async (opts: { address: string; amount: number; comment?: string }) => {
        await handleError(async () => {
          const ln = new LightningAddress(opts.address);
          await ln.fetch();
          const { paymentRequest, paymentHash } = await ln.requestInvoice({
            satoshi: opts.amount,
            comment: opts.comment,
          });
          output({ paymentRequest, paymentHash });
        });
      },
    );
}
