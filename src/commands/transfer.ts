import { Command } from "commander";
import { TransferRequest } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerTransferCommand(program: Command): void {
  program
    .command("transfer")
    .description(
      "Transfer funds between the main hub wallet and a sub-wallet, or between two sub-wallets",
    )
    .requiredOption("--amount <sats>", "Amount in satoshis", parseInt)
    .option(
      "--from-app-id <id>",
      "Source sub-wallet app ID (omit to send from the main hub wallet)",
      parseInt,
    )
    .option(
      "--to-app-id <id>",
      "Destination sub-wallet app ID (omit to send to the main hub wallet)",
      parseInt,
    )
    .option("--description <string>", "Transfer description")
    .action(
      async (opts: {
        amount: number;
        fromAppId?: number;
        toAppId?: number;
        description?: string;
      }) => {
        await handleError(async () => {
          if (opts.fromAppId === undefined && opts.toAppId === undefined) {
            throw new Error(
              "Specify at least one of --from-app-id or --to-app-id",
            );
          }
          const client = getClient(program);
          const body: TransferRequest = { amountSat: opts.amount };
          if (opts.fromAppId !== undefined) body.fromAppId = opts.fromAppId;
          if (opts.toAppId !== undefined) body.toAppId = opts.toAppId;
          if (opts.description) body.description = opts.description;

          // The transfers endpoint returns 204 No Content on success.
          await client.post("/api/transfers", body);
          output({
            success: true,
            amountSat: opts.amount,
            fromAppId: opts.fromAppId ?? null,
            toAppId: opts.toAppId ?? null,
          });
        });
      },
    );
}
