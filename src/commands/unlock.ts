import { Command } from "commander";
import { HubClient } from "../client.js";
import { AuthTokenResponse } from "../types.js";
import { handleError, output, saveToken } from "../utils.js";

export function registerUnlockCommand(program: Command): void {
  program
    .command("unlock")
    .description("Authenticate with the hub and get a JWT token")
    .requiredOption("-p, --password <string>", "Unlock password")
    .option(
      "--permission <string>",
      'Token permission: "full" or "readonly"',
      "full",
    )
    .option("--save", "Save token to ~/.hub-cli/token.jwt")
    .option("--save-as <name>", "Save token to ~/.hub-cli/token-<name>.jwt")
    .action(async (opts: { password: string; permission: string; save?: boolean; saveAs?: string }) => {
      const parentOpts = program.opts<{ url: string }>();
      const url = parentOpts.url.replace(/\/$/, "");
      await handleError(async () => {
        const client = new HubClient(url);
        const result = await client.post<AuthTokenResponse>("/api/unlock", {
          unlockPassword: opts.password,
          permission: opts.permission,
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
