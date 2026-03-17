#!/usr/bin/env node
import { Command } from "commander";

import { registerSetupCommand } from "./commands/setup.js";
import { registerUnlockCommand } from "./commands/unlock.js";
import { registerStartCommand } from "./commands/start.js";
import { registerStopCommand } from "./commands/stop.js";
import { registerGetInfoCommand } from "./commands/get-info.js";
import { registerGetBalancesCommand } from "./commands/get-balances.js";
import { registerListChannelsCommand } from "./commands/list-channels.js";
import { registerListChannelSuggestionsCommand } from "./commands/get-channel-suggestions.js";
import { registerRequestAlbyChannelOfferCommand } from "./commands/request-alby-lsp-channel-offer.js";
import { registerRequestLspOrderCommand } from "./commands/request-lsp-order.js";
import { registerListTransactionsCommand } from "./commands/list-transactions.js";
import { registerLookupTransactionCommand } from "./commands/lookup-transaction.js";
import { registerPayInvoiceCommand } from "./commands/pay-invoice.js";
import { registerMakeInvoiceCommand } from "./commands/make-invoice.js";
import { registerMakeOfferCommand } from "./commands/make-offer.js";
import { registerListAppsCommand } from "./commands/list-apps.js";
import { registerCreateAppCommand } from "./commands/create-app.js";
import { registerListPeersCommand } from "./commands/list-peers.js";
import { registerGetNodeStatusCommand } from "./commands/get-node-status.js";
import { registerGetHealthCommand } from "./commands/get-health.js";
import { registerGetWalletAddressCommand } from "./commands/get-onchain-address.js";
import { registerGetNodeConnectionInfoCommand } from "./commands/get-node-connection-info.js";
import { registerConnectPeerCommand } from "./commands/connect-peer.js";
import { registerOpenChannelCommand } from "./commands/open-channel.js";
import { registerCloseChannelCommand } from "./commands/close-channel.js";
import { registerSyncCommand } from "./commands/sync.js";
import { registerBackupMnemonicCommand } from "./commands/backup-mnemonic.js";
import { registerChangePasswordCommand } from "./commands/change-password.js";
import { registerRequestInvoiceFromLightningAddressCommand } from "./commands/request-invoice-from-lightning-address.js";

const program = new Command();

program
  .name("hub-cli")
  .description("CLI for managing Alby Hub - a self-custodial Lightning node")
  .version("0.3.0")
  .option(
    "-u, --url <url>",
    "Hub URL",
    process.env.HUB_URL ?? "http://localhost:8080",
  )
  .option("-t, --token <jwt>", "JWT token (or set HUB_TOKEN env)");

registerSetupCommand(program);
registerUnlockCommand(program);
registerStartCommand(program);
registerStopCommand(program);
registerGetInfoCommand(program);
registerGetBalancesCommand(program);
registerListChannelsCommand(program);
registerListChannelSuggestionsCommand(program);
registerRequestAlbyChannelOfferCommand(program);
registerRequestLspOrderCommand(program);
registerListTransactionsCommand(program);
registerLookupTransactionCommand(program);
registerPayInvoiceCommand(program);
registerMakeInvoiceCommand(program);
registerMakeOfferCommand(program);
registerListAppsCommand(program);
registerCreateAppCommand(program);
registerListPeersCommand(program);
registerGetNodeStatusCommand(program);
registerGetHealthCommand(program);
registerGetWalletAddressCommand(program);
registerGetNodeConnectionInfoCommand(program);
registerConnectPeerCommand(program);
registerOpenChannelCommand(program);
registerCloseChannelCommand(program);
registerSyncCommand(program);
registerBackupMnemonicCommand(program);
registerChangePasswordCommand(program);
registerRequestInvoiceFromLightningAddressCommand(program);

program.parse();
