import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerWalletAddressCommand(program: Command): void {
  program
    .command("wallet-address")
    .description("Get an on-chain Bitcoin deposit address")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const address = await client.get<string>("/api/wallet/address");
        output({ address });
      });
    });
}
