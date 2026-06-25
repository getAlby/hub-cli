import { Command } from "commander";
import { RedeemOnchainFundsResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerPayOnchainCommand(program: Command): void {
  program
    .command("pay-onchain")
    .description(
      "Send an on-chain bitcoin payment from the hub's on-chain wallet to any address",
    )
    .requiredOption("--address <address>", "On-chain address to send to")
    .option(
      "--amount <sats>",
      "Amount to send, in satoshis (required unless --all)",
      parseInt,
    )
    .option(
      "--all",
      "Send the entire on-chain balance (sweep the wallet)",
      false,
    )
    .option(
      "--fee-rate <satvb>",
      "Fee rate in sats/vByte (default: hub chooses)",
      parseInt,
    )
    .action(
      async (opts: {
        address: string;
        amount?: number;
        all: boolean;
        feeRate?: number;
      }) => {
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
              toAddress: opts.address,
              amountSat: opts.amount,
              feeRate: opts.feeRate,
              sendAll: opts.all,
            },
          );
          output({
            toAddress: opts.address,
            amountSat: opts.amount,
            sendAll: opts.all,
            txId: result.txId,
          });
        });
      },
    );
}
