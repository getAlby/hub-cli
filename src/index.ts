#!/usr/bin/env node
import { Command } from "commander";

import { registerUnlockCommand } from "./commands/unlock.js";
import { registerStartCommand } from "./commands/start.js";
import { registerInfoCommand } from "./commands/info.js";
import { registerBalancesCommand } from "./commands/balances.js";
import { registerChannelsCommand } from "./commands/channels.js";
import { registerChannelSuggestionsCommand } from "./commands/channel-suggestions.js";
import { registerChannelOfferCommand } from "./commands/channel-offer.js";
import { registerLspOrderCommand } from "./commands/lsp-order.js";
import { registerTransactionsCommand } from "./commands/transactions.js";
import { registerLookupTransactionCommand } from "./commands/lookup-transaction.js";
import { registerPayInvoiceCommand } from "./commands/pay-invoice.js";
import { registerMakeInvoiceCommand } from "./commands/make-invoice.js";
import { registerAppsCommand } from "./commands/apps.js";
import { registerCreateAppCommand } from "./commands/create-app.js";
import { registerPeersCommand } from "./commands/peers.js";
import { registerNodeStatusCommand } from "./commands/node-status.js";
import { registerHealthCommand } from "./commands/health.js";
import { registerWalletAddressCommand } from "./commands/wallet-address.js";

const program = new Command();

program
  .name("hub-cli")
  .description("CLI for managing Alby Hub - a self-custodial Lightning node")
  .version("0.1.0")
  .option(
    "-u, --url <url>",
    "Hub URL",
    process.env.HUB_URL ?? "http://localhost:8080",
  )
  .option("-t, --token <jwt>", "JWT token (or set HUB_TOKEN env)")
  .option("--hub <name>", "Named hub (loads token from ~/.hub-cli/token-<name>.jwt)");

registerUnlockCommand(program);
registerStartCommand(program);
registerInfoCommand(program);
registerBalancesCommand(program);
registerChannelsCommand(program);
registerChannelSuggestionsCommand(program);
registerChannelOfferCommand(program);
registerLspOrderCommand(program);
registerTransactionsCommand(program);
registerLookupTransactionCommand(program);
registerPayInvoiceCommand(program);
registerMakeInvoiceCommand(program);
registerAppsCommand(program);
registerCreateAppCommand(program);
registerPeersCommand(program);
registerNodeStatusCommand(program);
registerHealthCommand(program);
registerWalletAddressCommand(program);

program.parse();
