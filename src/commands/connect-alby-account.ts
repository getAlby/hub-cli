import { Command } from "commander";
import { InfoResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerConnectAlbyAccountCommand(program: Command): void {
  program
    .command("connect-alby-account")
    .description("Connect your Alby account to your hub")
    .option("--code <string>", "Authorization code from Alby")
    .action(async (opts: { code?: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        if (opts.code) {
          await client.get<void>(
            `/api/alby/callback?code=${encodeURIComponent(opts.code)}`,
          );
          output({ success: true });
        } else {
          const info = await client.get<InfoResponse>("/api/info");
          if (info.albyAccountConnected) {
            output({
              albyAccountConnected: true,
              albyUserIdentifier: info.albyUserIdentifier,
            });
            return;
          }
          output({
            albyAuthUrl: info.albyAuthUrl,
            message:
              "Open albyAuthUrl in your browser, get your authorization code, then re-run with --code <code>",
          });
        }
      });
    });
}
