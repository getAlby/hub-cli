// Alby Hub API types - mirrors hub/api/models.go and hub/lnclient/models.go

export interface AuthTokenResponse {
  token: string;
}

export interface ErrorResponse {
  message: string;
}

export interface InfoResponse {
  backendType: string;
  setupCompleted: boolean;
  running: boolean;
  unlocked: boolean;
  albyAuthUrl: string;
  nextBackupReminder: string;
  albyUserIdentifier: string;
  albyAccountConnected: boolean;
  version: string;
  network: string;
  startupState: string;
  startupError: string;
  currency: string;
  nodeAlias: string;
  relays: Array<{ url: string; online: boolean }>;
}

// GET /api/alby/me — the connected Alby account (mirrors hub/alby/models.go AlbyMe)
export interface AlbyMe {
  identifier: string;
  nostr_pubkey: string;
  lightning_address: string;
  email: string;
  name: string;
  avatar: string;
  keysend_pubkey: string;
  shared_node: boolean;
  hub: {
    name: string;
    config: Record<string, unknown>;
  };
  subscription: {
    plan_code: string;
  };
}

// GET /api/alby/info — Alby service status (mirrors hub/alby/models.go AlbyInfo)
export interface AlbyInfo {
  hub: {
    latestVersion: string;
    latestReleaseNotes: string;
  };
  status: string;
  healthy: boolean;
  accountAvailable: boolean;
  incidents: Array<{
    name: string;
    started: string;
    status: string;
    impact: string;
    url: string;
  }>;
}

export interface LightningBalanceResponse {
  totalSpendableSat: number;
  totalReceivableSat: number;
  nextMaxSpendableSat: number;
  nextMaxReceivableSat: number;
}

export interface OnchainBalanceResponse {
  spendableSat: number;
  totalSat: number;
  reservedSat: number;
  pendingBalancesFromChannelClosuresSat: number;
}

export interface BalancesResponse {
  lightning: LightningBalanceResponse;
  onchain: OnchainBalanceResponse;
}

export interface Channel {
  localBalance: number;
  localSpendableBalance: number;
  remoteBalance: number;
  remotePubkey: string;
  fundingTxId: string;
  active: boolean;
  public: boolean;
  confirmations: number | null;
  confirmationsRequired: number | null;
  forwardingFeeBaseMsat: number;
  unspendablePunishmentReserve: number;
  counterpartyUnspendablePunishmentReserve: number;
  error: string | null;
  isOutbound: boolean;
  id: string;
}

export interface ChannelPeerSuggestion {
  network: string;
  paymentMethod: string;
  pubkey: string;
  host: string;
  minimumChannelSize: number;
  maximumChannelSize: number;
  maximumChannelExpiryBlocks: number | null;
  name: string;
  image: string;
  identifier: string;
  contactUrl: string;
  type: string;
  terms: string;
  description: string;
  note: string;
  publicChannelsAllowed: boolean;
  feeTotalSat1m: number | null;
  feeTotalSat2m: number | null;
  feeTotalSat3m: number | null;
}

export interface LSPChannelOffer {
  lspName: string;
  lspContactUrl: string;
  lspBalanceSat: number;
  feeTotalSat: number;
  feeTotalUsd: number;
  currentPaymentMethod: string;
  terms: string;
  lspDescription: string;
}

export interface LSPOrderRequest {
  amount: number;
  lspType: string;
  lspIdentifier: string;
  public: boolean;
}

export interface LSPOrderResponse {
  invoice: string;
  fee: number;
  invoiceAmount: number;
  incomingLiquidity: number;
  outgoingLiquidity: number;
}

export interface Transaction {
  type: string;
  state: string;
  invoice: string;
  description: string;
  descriptionHash: string;
  preimage: string | null;
  paymentHash: string;
  amount: number;
  feesPaid: number;
  updatedAt: string;
  createdAt: string;
  settledAt: string | null;
  appId: number | null;
  failureReason: string;
}

export interface ListTransactionsResponse {
  totalCount: number;
  transactions: Transaction[];
}

export interface App {
  id: number;
  name: string;
  description: string;
  appPubkey: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  scopes: string[];
  maxAmount: number;
  budgetUsage: number;
  budgetRenewal: string;
  isolated: boolean;
  /** @deprecated millisatoshi balance — use balanceSat. Isolated apps and sub-wallets only; 0 for shared-balance apps. */
  balance: number;
  metadata?: Record<string, unknown>;
  /** App balance in satoshis. Non-zero only for isolated apps and sub-wallets; distinct from the hub wallet balance. */
  balanceSat: number;
  /** App balance in millisatoshis. */
  balanceMsat: number;
}

export interface ListAppsResponse {
  apps: App[];
  totalCount: number;
}

export interface CreateAppRequest {
  name: string;
  pubkey?: string;
  maxAmount?: number;
  budgetRenewal?: string;
  expiresAt?: string;
  scopes: string[];
  isolated?: boolean;
  metadata?: Record<string, unknown>;
  unlockPassword?: string;
}

export interface CreateAppResponse {
  pairingUri: string;
  pairingSecretKey: string;
  pairingPublicKey: string;
  relayUrls: string[];
  walletPubkey: string;
  lud16: string;
  id: number;
  name: string;
}

export interface PeerDetails {
  nodeId: string;
  address: string;
  isPersisted: boolean;
  isConnected: boolean;
}

export interface NodeStatus {
  isReady: boolean;
  internalNodeStatus: unknown;
}

export interface NodeConnectionInfo {
  pubkey: string;
  address: string;
  port: number;
}

export interface HealthAlarm {
  kind: string;
  rawDetails?: unknown;
}

export interface HealthResponse {
  alarms?: HealthAlarm[];
}

export interface CustomNodeCommandArgDef {
  name: string;
  description: string;
}

export interface CustomNodeCommandDef {
  name: string;
  description: string;
  args: CustomNodeCommandArgDef[];
}

export interface CustomNodeCommandsResponse {
  commands: CustomNodeCommandDef[];
}
