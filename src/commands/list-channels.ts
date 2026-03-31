import { Command } from "commander";
import { Channel } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerListChannelsCommand(program: Command): void {
  program
    .command("list-channels")
    .description("List Lightning channels")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<(Channel & { internalChannel?: unknown })[]>("/api/channels");
        output(
          result.map(
            ({
              localBalance,
              localSpendableBalance,
              remoteBalance,
              forwardingFeeBaseMsat,
              unspendablePunishmentReserve,
              counterpartyUnspendablePunishmentReserve,
              internalChannel,
              ...rest
            }) => ({
              ...rest,
              localBalanceSat: Math.floor(localBalance / 1000),
              localSpendableBalanceSat: Math.floor(localSpendableBalance / 1000),
              remoteBalanceSat: Math.floor(remoteBalance / 1000),
              forwardingFeeBaseSat: Math.floor(forwardingFeeBaseMsat / 1000),
              unspendablePunishmentReserveSat: unspendablePunishmentReserve,
              counterpartyUnspendablePunishmentReserveSat: counterpartyUnspendablePunishmentReserve,
            }),
          ),
        );
      });
    });
}
