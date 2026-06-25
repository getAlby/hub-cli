import { Command } from "commander";
import { Swap, SwapResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerSwapInCommand(program: Command): void {
  program
    .command("swap-in")
    .description(
      "Create a swap of on-chain bitcoin into lightning. Payment must be made manually as a second step",
    )
    .requiredOption(
      "--amount <sats>",
      "Amount to receive on lightning, in satoshis",
      parseInt,
    )
    .action(async (opts: { amount: number }) => {
      await handleError(async () => {
        const client = getClient(program);
        const initiated = await client.post<SwapResponse>("/api/swaps/in", {
          swapAmountSat: opts.amount,
        });
        // The initiate response only contains the swap ID, so look up the full
        // swap to return the on-chain lockup address and `sendAmountSat` (the
        // exact on-chain amount to deposit, including fees). The deposit must
        // then be sent to that address from any on-chain wallet.
        const swap = await client.get<Swap>(`/api/swaps/${initiated.swapId}`);
        output(swap);
      });
    });
}
