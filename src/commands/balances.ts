import { Command } from "commander";
import { BalancesResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerBalancesCommand(program: Command): void {
  program
    .command("balances")
    .description("Get Lightning and on-chain balances")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<BalancesResponse>("/api/balances");
        output(result);
      });
    });
}
