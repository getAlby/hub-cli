import { Command } from "commander";
import { BalancesResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

interface LightningBalanceResponse {
  totalSpendable: number;
  totalReceivable: number;
  nextMaxSpendable: number;
  nextMaxReceivable: number;
}

interface OnchainBalanceResponse {
  spendable: number;
  total: number;
  reserved: number;
  pendingBalancesFromChannelClosures: number;
}

interface APIBalancesResponse {
  lightning: LightningBalanceResponse;
  onchain: OnchainBalanceResponse;
}

export function registerGetBalancesCommand(program: Command): void {
  program
    .command("get-balances")
    .description("Get Lightning and on-chain balances")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const apiResult =
          await client.get<APIBalancesResponse>("/api/balances");
        const result: BalancesResponse = {
          onchain: {
            reservedSat: apiResult.onchain.reserved,
            spendableSat: apiResult.onchain.spendable,
            totalSat: apiResult.onchain.total,
            pendingBalancesFromChannelClosuresSat:
              apiResult.onchain.pendingBalancesFromChannelClosures,
          },
          lightning: {
            nextMaxReceivableSat: Math.floor(
              apiResult.lightning.nextMaxReceivable / 1000,
            ),
            nextMaxSpendableSat: Math.floor(
              apiResult.lightning.nextMaxSpendable / 1000,
            ),
            totalReceivableSat: Math.floor(
              apiResult.lightning.totalReceivable / 1000,
            ),
            totalSpendableSat: Math.floor(
              apiResult.lightning.totalSpendable / 1000,
            ),
          },
        };
        output(result);
      });
    });
}
