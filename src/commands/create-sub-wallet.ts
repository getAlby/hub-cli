import { Command } from "commander";
import { CreateAppRequest, CreateAppResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

// App store id Alby Hub uses to mark an app as a sub-wallet ("uncle jim").
const SUBWALLET_APPSTORE_APP_ID = "uncle-jim";

// Default scopes the Hub frontend grants to a new sub-wallet.
const SUBWALLET_SCOPES = [
  "get_balance",
  "get_info",
  "list_transactions",
  "lookup_invoice",
  "make_invoice",
  "notifications",
  "pay_invoice",
];

export function registerCreateSubWalletCommand(program: Command): void {
  program
    .command("create-sub-wallet")
    .description(
      "Create a new sub-wallet (isolated app with its own balance)",
    )
    .requiredOption("--name <string>", "Sub-wallet name")
    .option(
      "--scopes <list>",
      "Comma-separated list of scopes",
      SUBWALLET_SCOPES.join(","),
    )
    .option("--max-amount <sats>", "Max payment amount in satoshis", parseInt)
    .option(
      "--budget-renewal <period>",
      "Budget renewal period: daily, weekly, monthly, yearly, or never",
    )
    .option("--expires-at <iso8601>", "Token expiry date (ISO 8601)")
    .action(
      async (opts: {
        name: string;
        scopes: string;
        maxAmount?: number;
        budgetRenewal?: string;
        expiresAt?: string;
      }) => {
        await handleError(async () => {
          const client = getClient(program);
          const body: CreateAppRequest = {
            name: opts.name,
            scopes: opts.scopes.split(",").map((s) => s.trim()),
            isolated: true,
            metadata: { app_store_app_id: SUBWALLET_APPSTORE_APP_ID },
          };
          if (opts.maxAmount !== undefined) body.maxAmount = opts.maxAmount;
          if (opts.budgetRenewal) body.budgetRenewal = opts.budgetRenewal;
          if (opts.expiresAt) body.expiresAt = opts.expiresAt;

          const result = await client.post<CreateAppResponse>(
            "/api/apps",
            body,
          );
          output(result);
        });
      },
    );
}
