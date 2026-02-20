# Alby Hub CLI

CLI for managing [Alby Hub](https://github.com/getAlby/hub) — a self-custodial Lightning node.

Built for agents — use with the [Alby Hub CLI Skill](https://github.com/getAlby/hub-cli-skill).

## Usage

```bash
npx @getalby/hub-cli [options] <command>
```

**Global options:**

```
-u, --url <url>     Hub URL (default: http://localhost:8080 or HUB_URL env)
-t, --token <jwt>   JWT token (or set HUB_TOKEN env)
--hub <name>        Named hub (loads token from ~/.hub-cli/token-<name>.jwt)
```

## First-Time Setup

If the hub hasn't been initialised yet, run `setup` once, then `start`:

```bash
# One-time initialisation
npx @getalby/hub-cli setup --password YOUR_PASSWORD --backend LDK

# Start the node and save the token
npx @getalby/hub-cli start --password YOUR_PASSWORD --save
```

## Authentication

Most commands require a JWT token. Call `start` after every hub shutdown (e.g. machine restart) to launch the node and get a token:

```bash
npx @getalby/hub-cli start --password YOUR_PASSWORD --save
```

If the hub is configured with `AUTO_UNLOCK_PASSWORD`, it starts the node automatically on launch — so you can skip `start` and go straight to `unlock` to get a token. This is recommended for agent-managed or unattended deployments.

Use `unlock` to get a token when the hub is already running:

```bash
npx @getalby/hub-cli unlock --password YOUR_PASSWORD --save
```

You can also pass the token via environment variable instead of `--save`:

```bash
export HUB_TOKEN="eyJ..."
npx @getalby/hub-cli balances
```

**Named hubs** (for managing multiple hubs):

```bash
npx @getalby/hub-cli start --url http://remote:8080 --password PWD --save-as production
npx @getalby/hub-cli balances --hub production
```

**Token storage locations:**

| Location | Used when |
| --- | --- |
| `~/.hub-cli/token.jwt` | `--save` flag or default |
| `~/.hub-cli/token-<name>.jwt` | `--save-as <name>` or `--hub <name>` |
| `HUB_TOKEN` env var | Always checked before file |
| `-t, --token <jwt>` | Highest priority |

## Testing with Mutinynet

To test without real bitcoin, run the hub against Mutinynet (signet):

```bash
NETWORK=signet \
MEMPOOL_API=https://mutinynet.com/api \
LDK_ESPLORA_SERVER=https://mutinynet.com/api \
./bin/albyhub

# Set up, start the node, and save the token
npx @getalby/hub-cli setup --password YOUR_PASSWORD --backend LDK
npx @getalby/hub-cli start --password YOUR_PASSWORD --save
npx @getalby/hub-cli info

# Get initial test funds from https://faucet.mutinynet.com (requires human + GitHub login)
npx @getalby/hub-cli wallet-address
```

## Commands

### Setup & Auth

These commands do not require a JWT token:

```bash
# First-time hub initialisation (can only be run once)
npx @getalby/hub-cli setup --password YOUR_PASSWORD --backend LDK

# With an existing mnemonic (LDK only)
npx @getalby/hub-cli setup --password YOUR_PASSWORD --backend LDK --mnemonic "word1 word2 ..."

# For LND backend — set LND_CERT_FILE and LND_MACAROON_FILE env vars for credentials
npx @getalby/hub-cli setup --password YOUR_PASSWORD --backend LND --lnd-address localhost:10009

# Start the node — required after setup or restart; also returns a JWT token
npx @getalby/hub-cli start --password YOUR_PASSWORD --save

# Get a fresh token for an already-running hub (token expired, no restart needed)
npx @getalby/hub-cli unlock --password YOUR_PASSWORD --save

# Get a readonly token
npx @getalby/hub-cli unlock --password YOUR_PASSWORD --permission readonly --save
```

### Info & Status

```bash
# Hub status, version, backend type
npx @getalby/hub-cli info

# Lightning node readiness
npx @getalby/hub-cli node-status

# Health check with active alarms
npx @getalby/hub-cli health
```

### Balances & Wallet

```bash
# Lightning + on-chain balances
npx @getalby/hub-cli balances

# Get an on-chain deposit address
npx @getalby/hub-cli wallet-address
```

### Channels & Peers

```bash
# List Lightning channels
npx @getalby/hub-cli channels

# List LSP providers with fees and channel size limits
npx @getalby/hub-cli channel-suggestions

# Get Alby LSP offer (requires linked Alby account)
npx @getalby/hub-cli channel-offer

# List connected peers
npx @getalby/hub-cli peers
```

### Opening a Channel via LSP

```bash
# 1. Pick an LSP from channel-suggestions
npx @getalby/hub-cli channel-suggestions

# 2. Request a Lightning invoice from the LSP
npx @getalby/hub-cli lsp-order --amount 1000000 --lsp-type <type> --lsp-identifier <identifier>

# 3. Pay the invoice (mainnet — if you have a funded wallet)
npx @getalby/hub-cli pay-invoice <invoice>

# On Mutinynet, a human must pay the invoice via https://faucet.mutinynet.com
```

### Payments

```bash
# Pay a BOLT11 invoice
npx @getalby/hub-cli pay-invoice lnbc...

# Pay a zero-amount invoice, specifying the amount
npx @getalby/hub-cli pay-invoice lnbc... --amount 1000

# Create an invoice
npx @getalby/hub-cli make-invoice --amount 1000 --description "test"
```

### Transactions

```bash
# List recent payments
npx @getalby/hub-cli transactions

# With pagination
npx @getalby/hub-cli transactions --limit 50 --offset 0

# Look up a specific payment by hash
npx @getalby/hub-cli lookup-transaction <paymentHash>
```

### NWC Apps

```bash
# List NWC app connections
npx @getalby/hub-cli apps

# Create a new NWC connection
npx @getalby/hub-cli create-app --name "My App"

# With custom scopes and budget
npx @getalby/hub-cli create-app --name "My App" \
  --scopes "pay_invoice,get_balance" \
  --max-amount 10000 \
  --budget-renewal monthly

# Isolated sub-wallet app
npx @getalby/hub-cli create-app --name "Isolated App" --isolated --unlock-password YOUR_PASSWORD
```

## Command Reference

### Setup & Auth

| Command | Description | Required Options |
| --- | --- | --- |
| `setup` | Initialize hub for the first time (one-time) | `--password` |
| `start` | Start the node after setup or restart; returns a JWT token | `--password` |
| `unlock` | Get a JWT token for an already-running hub (no restart) | `--password` |

### Info & Status

| Command | Description | Required Options |
| --- | --- | --- |
| `info` | Hub status, version, backend type | — |
| `node-status` | Lightning node readiness | — |
| `health` | Health check and active alarms | — |

### Balances & Wallet

| Command | Description | Required Options |
| --- | --- | --- |
| `balances` | Lightning + on-chain balances | — |
| `wallet-address` | On-chain deposit address | — |

### Channels & Peers

| Command | Description | Required Options |
| --- | --- | --- |
| `channels` | List Lightning channels | — |
| `channel-suggestions` | List LSP providers with fees | — |
| `channel-offer` | Get Alby LSP offer | — |
| `peers` | List connected peers | — |
| `lsp-order` | Request LSP channel invoice | `--amount`, `--lsp-type`, `--lsp-identifier` |

### Payments

| Command | Description | Required Options |
| --- | --- | --- |
| `pay-invoice` | Pay a BOLT11 invoice | `<invoice>` (argument) |
| `make-invoice` | Create a BOLT11 invoice | `--amount` |

### Transactions

| Command | Description | Required Options |
| --- | --- | --- |
| `transactions` | List payment history | — |
| `lookup-transaction` | Look up a payment by hash | `<paymentHash>` (argument) |

### NWC Apps

| Command | Description | Required Options |
| --- | --- | --- |
| `apps` | List NWC app connections | — |
| `create-app` | Create a new NWC connection | `--name` |

## Output

All commands output JSON to stdout. Errors are written to stderr as JSON with a `message` field.
