import { Command } from "commander";
import { HubClient } from "../client.js";
import { AuthTokenResponse } from "../types.js";
import { handleError, output, saveToken } from "../utils.js";

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .description("Start the Lightning node and get a JWT token. Required after setup or hub restart. Use 'unlock' instead if the hub is already running and you only need a fresh token.")
    .requiredOption("-p, --password <string>", "Unlock password")
    .option("--save", "Save returned token to ~/.hub-cli/token.jwt")
    .option("--save-as <name>", "Save returned token to ~/.hub-cli/token-<name>.jwt")
    .action(async (opts: { password: string; save?: boolean; saveAs?: string }) => {
      const parentOpts = program.opts<{ url: string }>();
      const url = parentOpts.url.replace(/\/$/, "");
      await handleError(async () => {
        const client = new HubClient(url);
        const result = await client.post<AuthTokenResponse>("/api/start", {
          unlockPassword: opts.password,
        });
        if (opts.saveAs) {
          saveToken(result.token, opts.saveAs);
        } else if (opts.save) {
          saveToken(result.token);
        }
        output(result);
      });
    });
}
