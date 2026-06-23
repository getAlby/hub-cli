import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

const RENEWAL_VALUES = ["daily", "weekly", "monthly", "yearly", "never"];

export function registerLinkAlbyAccountCommand(program: Command): void {
  program
    .command("link-alby-account")
    .description(
      "Link your Alby account so your lightning address receives to this hub",
    )
    .option(
      "--budget <sats>",
      "Budget in sats for the Alby account connection",
      "25000",
    )
    .option(
      "--renewal <period>",
      "Budget renewal period: daily, weekly, monthly, yearly, never",
      "weekly",
    )
    .action(async (opts: { budget: string; renewal: string }) => {
      await handleError(async () => {
        const budget = Number(opts.budget);
        if (!Number.isInteger(budget) || budget < 0) {
          throw new Error("--budget must be a non-negative integer (sats)");
        }
        if (!RENEWAL_VALUES.includes(opts.renewal)) {
          throw new Error(
            `--renewal must be one of: ${RENEWAL_VALUES.join(", ")}`,
          );
        }
        const client = getClient(program);
        await client.post<void>("/api/alby/link-account", {
          budget,
          renewal: opts.renewal,
        });
        output({ success: true });
      });
    });
}
