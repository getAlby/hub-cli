import { Command } from "commander";
import { HubClient } from "../client.js";
import { handleError, output } from "../utils.js";

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description(
      "Initialize the hub for the first time (POST /api/setup). Must run before start/unlock. Can only be run once.",
    )
    .requiredOption("-p, --password <string>", "Unlock password")
    .option(
      "--backend <type>",
      "Backend type: LDK, LND, PHOENIX, CASHU",
      "LDK",
    )
    .option("--mnemonic <words>", "Import existing 12-word mnemonic (LDK only)")
    .option(
      "--next-backup-reminder <date>",
      "When to remind about backup (ISO date)",
    )
    // LND - cert and macaroon are intentionally not exposed as CLI flags because
    // hex-encoded credentials can expire. Set LND_CERT_FILE and LND_MACAROON_FILE
    // env vars instead so the hub reads fresh values on every start.
    .option("--lnd-address <address>", "LND gRPC address, e.g. localhost:10009 (LND only). For credentials set LND_CERT_FILE and LND_MACAROON_FILE env vars.")
    // Phoenixd
    .option("--phoenixd-address <address>", "Phoenixd address (PHOENIX only)")
    .option(
      "--phoenixd-authorization <token>",
      "Phoenixd authorization (PHOENIX only)",
    )
    // Cashu
    .option("--cashu-mint-url <url>", "Cashu mint URL (CASHU only)")
    .action(
      async (opts: {
        password: string;
        backend: string;
        mnemonic?: string;
        nextBackupReminder?: string;
        lndAddress?: string;
        phoenixdAddress?: string;
        phoenixdAuthorization?: string;
        cashuMintUrl?: string;
      }) => {
        const parentOpts = program.opts<{ url: string }>();
        const url = parentOpts.url.replace(/\/$/, "");
        await handleError(async () => {
          const client = new HubClient(url);
          await client.post("/api/setup", {
            unlockPassword: opts.password,
            backendType: opts.backend,
            ...(opts.mnemonic && { mnemonic: opts.mnemonic }),
            ...(opts.nextBackupReminder && {
              nextBackupReminder: opts.nextBackupReminder,
            }),
            ...(opts.lndAddress && { lndAddress: opts.lndAddress }),
            ...(opts.phoenixdAddress && {
              phoenixdAddress: opts.phoenixdAddress,
            }),
            ...(opts.phoenixdAuthorization && {
              phoenixdAuthorization: opts.phoenixdAuthorization,
            }),
            ...(opts.cashuMintUrl && { cashuMintUrl: opts.cashuMintUrl }),
          });
          output({ success: true, message: "Hub setup complete" });
        });
      },
    );
}
