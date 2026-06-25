import { Command } from "commander";
import { Swap, SwapResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerSwapOutCommand(program: Command): void {
  program
    .command("swap-out")
    .description(
      "Swap lightning funds out to on-chain bitcoin. Payment is initiated immediately",
    )
    .requiredOption(
      "--amount <sats>",
      "Amount to receive on-chain, in satoshis",
      parseInt,
    )
    .option(
      "--destination <address>",
      "External on-chain address to receive the funds. Omit to swap into the hub's own on-chain wallet.",
    )
    .action(async (opts: { amount: number; destination?: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const initiated = await client.post<SwapResponse>("/api/swaps/out", {
          swapAmountSat: opts.amount,
          destination: opts.destination ?? "",
        });
        // The initiate response only contains the swap ID, so look up the full
        // swap to return the lightning send amount, on-chain receive amount and
        // destination address.
        const swap = await client.get<Swap>(`/api/swaps/${initiated.swapId}`);
        output(swap);
      });
    });
}
