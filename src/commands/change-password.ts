import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerChangePasswordCommand(program: Command): void {
  program
    .command("change-password")
    .description("Change the hub unlock password")
    .requiredOption("--current-password <string>", "Current unlock password")
    .requiredOption(
      "--confirm-current-password <string>",
      "Confirm current unlock password",
    )
    .requiredOption("--new-password <string>", "New unlock password")
    .action(
      async (opts: {
        currentPassword: string;
        confirmCurrentPassword: string;
        newPassword: string;
      }) => {
        await handleError(async () => {
          if (opts.currentPassword !== opts.confirmCurrentPassword) {
            throw new Error(
              "Current password and confirmation do not match",
            );
          }
          const client = getClient(program);
          await client.patch<void>("/api/unlock-password", {
            currentUnlockPassword: opts.currentPassword,
            newUnlockPassword: opts.newPassword,
          });
          output({ success: true });
        });
      },
    );
}
