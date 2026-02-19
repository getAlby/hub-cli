import { Command } from "commander";
import { CreateAppResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

const DEFAULT_SCOPES = [
  "pay_invoice",
  "get_balance",
  "make_invoice",
  "lookup_invoice",
  "list_transactions",
  "get_info",
];

export function registerCreateAppCommand(program: Command): void {
  program
    .command("create-app")
    .description("Create a new NWC app connection")
    .requiredOption("--name <string>", "App name")
    .option(
      "--scopes <list>",
      "Comma-separated list of scopes",
      DEFAULT_SCOPES.join(","),
    )
    .option("--max-amount <sats>", "Max payment amount in satoshis", parseInt)
    .option(
      "--budget-renewal <period>",
      "Budget renewal period: daily, weekly, monthly, yearly, or never",
      "monthly",
    )
    .option("--expires-at <iso8601>", "Token expiry date (ISO 8601)")
    .option("--isolated", "Create isolated sub-wallet app", false)
    .option(
      "--unlock-password <string>",
      "Unlock password (required for isolated apps)",
    )
    .action(
      async (opts: {
        name: string;
        scopes: string;
        maxAmount?: number;
        budgetRenewal: string;
        expiresAt?: string;
        isolated: boolean;
        unlockPassword?: string;
      }) => {
        await handleError(async () => {
          const client = getClient(program);
          const body: Record<string, unknown> = {
            name: opts.name,
            scopes: opts.scopes.split(",").map((s) => s.trim()),
            budgetRenewal: opts.budgetRenewal,
            isolated: opts.isolated,
          };
          if (opts.maxAmount !== undefined) body.maxAmount = opts.maxAmount;
          if (opts.expiresAt) body.expiresAt = opts.expiresAt;
          if (opts.unlockPassword) body.unlockPassword = opts.unlockPassword;

          const result = await client.post<CreateAppResponse>("/api/apps", body);
          output(result);
        });
      },
    );
}
