import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerConnectPeerCommand(program: Command): void {
  program
    .command("connect-peer")
    .description("Connect to a Lightning peer")
    .requiredOption("--pubkey <pubkey>", "Peer's Lightning public key")
    .requiredOption("--address <address>", "Peer's IP address or hostname")
    .requiredOption("--port <port>", "Peer's port number", parseInt)
    .action(async (opts: { pubkey: string; address: string; port: number }) => {
      await handleError(async () => {
        const client = getClient(program);
        await client.post("/api/peers", {
          pubkey: opts.pubkey,
          address: opts.address,
          port: opts.port,
        });
        output({ success: true });
      });
    });
}
