import { Command } from "commander";
import { RedeemOnchainFundsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerPayOnchainCommand(program: Command): void {
  program
    .command("pay-onchain <address>")
    .description(
      "Send an on-chain bitcoin payment from the hub's on-chain wallet to any address.",
    )
    .option(
      "--amount <sats>",
      "Amount to send, in satoshis (required unless --all)",
      parseInt,
    )
    .option("--all", "Send the entire on-chain balance", false)
    .option(
      "--fee-rate <satvb>",
      "Fee rate in sats/vByte (default: hub chooses)",
      parseInt,
    )
    .addHelpText(
      "after",
      "\nNote: if you have channels open you should avoid spending your entire balance as you will drain anchor reserves. Keep ~20,000 sats reserved per channel.",
    )
    .action(
      async (
        address: string,
        opts: {
          amount?: number;
          all: boolean;
          feeRate?: number;
        },
      ) => {
        await handleError(async () => {
          if (!opts.all && opts.amount === undefined) {
            throw new Error("specify --amount <sats> or --all");
          }
          if (opts.all && opts.amount !== undefined) {
            throw new Error("--amount and --all are mutually exclusive");
          }
          const client = getClient(program);
          const result = await client.post<RedeemOnchainFundsResponse>(
            "/api/wallet/redeem-onchain-funds",
            {
              toAddress: address,
              amountSat: opts.amount,
              feeRate: opts.feeRate,
              sendAll: opts.all,
            },
          );
          output({
            toAddress: address,
            amountSat: opts.amount,
            sendAll: opts.all,
            txId: result.txId,
          });
        });
      },
    );
}
