import { Command } from "commander";
import { Swap } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerLookupSwapCommand(program: Command): void {
  program
    .command("lookup-swap <swapId>")
    .description("Look up the status of a swap by its swap ID")
    .action(async (swapId: string) => {
      await handleError(async () => {
        const client = getClient(program);
        const swap = await client.get<Swap>(`/api/swaps/${swapId}`);
        output(swap);
      });
    });
}
