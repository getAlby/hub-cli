import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerOpenChannelCommand(program: Command): void {
  program
    .command("open-channel")
    .description("Open an outbound lightning channel to a peer")
    .requiredOption("--pubkey <pubkey>", "Peer's lightning public key")
    .requiredOption(
      "--amount-sats <sats>",
      "Channel size in satoshis",
      parseInt,
    )
    .option("--public", "Open a public channel (default: private)", false)
    .action(
      async (opts: { pubkey: string; amountSats: number; public: boolean }) => {
        await handleError(async () => {
          const client = getClient(program);
          const result = await client.post<{ fundingTxId: string }>(
            "/api/channels",
            {
              pubkey: opts.pubkey,
              amountSats: opts.amountSats,
              public: opts.public,
            },
          );
          output(result);
        });
      },
    );
}
