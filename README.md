# Alby Hub CLI

CLI for managing [Alby Hub](https://github.com/getAlby/hub) — a self-custodial Lightning node.

Built for agents — use with the [Alby Hub Skill](https://github.com/getAlby/hub-skill).

## Usage

```bash
npx @getalby/hub-cli [options] <command>
```

**Global options:**

```
-u, --url <url>     Hub URL (default: http://localhost:8029 or HUB_URL env)
-t, --token <jwt>   JWT token (or set HUB_TOKEN env)
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

### Alby Cloud

If you're using [Alby Cloud](https://getalby.com/alby-hub):

1. Complete the onboarding wizard at https://getalby.com/alby-hub in a browser (sets the hub password — one-time, requires human interaction)
2. Find your hub name (e.g. `nwcxxxxxxxxxx`) at https://my.albyhub.com/settings/developer (shown next to the developer access token — the token itself is not needed)
3. Save it once:
   ```bash
   echo "nwcxxxxxxxxxx" > ~/.hub-cli/alby-cloud.txt
   ```
4. The CLI now auto-connects to `https://my.albyhub.com` with the correct routing headers. Use `start`/`unlock` normally:
   ```bash
   npx @getalby/hub-cli start --password YOUR_PASSWORD --save
   npx @getalby/hub-cli get-balances
   ```

To override the hub name for a single invocation, set `ALBY_HUB_NAME` env var.

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
npx @getalby/hub-cli get-balances
```

**Token storage locations:**

| Location               | Used when                  |
| ---------------------- | -------------------------- |
| `~/.hub-cli/token.jwt` | `--save` flag or default   |
| `HUB_TOKEN` env var    | Always checked before file |
| `-t, --token <jwt>`    | Highest priority           |

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
npx @getalby/hub-cli get-info

# Get initial test funds from https://faucet.mutinynet.com (requires human + GitHub login)
npx @getalby/hub-cli get-onchain-address
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
npx @getalby/hub-cli get-info

# Lightning node readiness
npx @getalby/hub-cli get-node-status

# Health check with active alarms
npx @getalby/hub-cli get-health
```

### Balances

```bash
# Lightning + on-chain balances
npx @getalby/hub-cli get-balances
```

### Channels & Peers

```bash
# List Lightning channels
npx @getalby/hub-cli list-channels

# List LSP providers with fees and channel size limits
npx @getalby/hub-cli get-channel-suggestions

# Request Alby LSP offer (requires linked Alby account)
npx @getalby/hub-cli request-alby-lsp-channel-offer

# Get your node's connection info (pubkey, address, port)
npx @getalby/hub-cli get-node-connection-info

# List connected peers
npx @getalby/hub-cli list-peers

# Connect to a peer
npx @getalby/hub-cli connect-peer --pubkey <pubkey> --address <host> --port <port>

# Open an outbound channel to a peer (requires on-chain funds)
npx @getalby/hub-cli open-channel --pubkey <pubkey> --amount-sats 500000

# Open a public channel
npx @getalby/hub-cli open-channel --pubkey <pubkey> --amount-sats 500000 --public

# Close a channel (cooperative)
npx @getalby/hub-cli close-channel --peer-id <pubkey> --channel-id <id>

# Force-close a channel
npx @getalby/hub-cli close-channel --peer-id <pubkey> --channel-id <id> --force
```

### Opening a Channel via LSP

```bash
# 1. Pick an LSP from get-channel-suggestions
npx @getalby/hub-cli get-channel-suggestions

# 2. Request a Lightning invoice from the LSP
npx @getalby/hub-cli request-lsp-order --amount 1000000 --lsp-type <type> --lsp-identifier <identifier>

# 3. Pay the invoice (mainnet — if you have a funded wallet)
npx @getalby/hub-cli pay-invoice <invoice>

# On Mutinynet, a human must pay the invoice via https://faucet.mutinynet.com
```

### Node Management

```bash
# Stop the Lightning node (hub HTTP server keeps running)
npx @getalby/hub-cli stop

# Trigger a wallet sync (queued, may take up to a minute)
npx @getalby/hub-cli sync

# Export wallet recovery phrase to a file (default: ~/.hub-cli/albyhub.recovery)
npx @getalby/hub-cli backup --password YOUR_PASSWORD

# Export to a custom path
npx @getalby/hub-cli backup --password YOUR_PASSWORD --output /path/to/backup.recovery

# Change the hub unlock password
npx @getalby/hub-cli change-password \
  --current-password YOUR_PASSWORD \
  --confirm-current-password YOUR_PASSWORD \
  --new-password NEW_PASSWORD

# Connect your Alby account (step 1: get the authorization URL)
npx @getalby/hub-cli connect-alby-account

# Connect your Alby account (step 2: submit the authorization code)
npx @getalby/hub-cli connect-alby-account --code YOUR_AUTH_CODE
```

### Custom Node Commands

Custom node (debug) commands are backend-specific. Use `list-custom-node-commands` to
discover what the active backend exposes, then run one with `execute-custom-node-command`.

```bash
# List the custom node commands the active backend supports
npx @getalby/hub-cli list-custom-node-commands

# Execute a command (pass the full command line as one quoted string).
# Example (Bark): dump balance breakdown, VTXOs and pending receives
npx @getalby/hub-cli execute-custom-node-command "debug"

# Example (LDK): pay a BOLT-12 offer (testing only)
npx @getalby/hub-cli execute-custom-node-command "pay_bolt12_offer --offer lno... --amount 1000"
```

### Payments

```bash
# Pay a BOLT11 invoice
npx @getalby/hub-cli pay-invoice lnbc...

# Pay a zero-amount invoice, specifying the amount in satoshis
npx @getalby/hub-cli pay-invoice lnbc... --amount 1000

# Pay from a specific sub-wallet/app instead of the main hub wallet
npx @getalby/hub-cli pay-invoice lnbc... --from-app-id 3

# Create an invoice
npx @getalby/hub-cli make-invoice --amount 1000 --description "test"

# Create a BOLT-12 offer (requires LDK backend)
npx @getalby/hub-cli make-offer --description "donations"
```

### Transactions

```bash
# List recent payments
npx @getalby/hub-cli list-transactions

# With pagination
npx @getalby/hub-cli list-transactions --limit 50 --offset 0

# Look up a specific payment by hash
npx @getalby/hub-cli lookup-transaction <paymentHash>
```

### Swaps

```bash
# Swap on-chain bitcoin in to lightning (amount received on lightning, in sats).
# Returns the on-chain lockup address and the exact amount to deposit.
npx @getalby/hub-cli swap-in --amount 100000

# Swap lightning out into the hub's own on-chain wallet (amount received on-chain, in sats)
npx @getalby/hub-cli swap-out --amount 100000

# Swap lightning out to an external on-chain address
npx @getalby/hub-cli swap-out --amount 100000 --destination bc1...

# Look up a swap by its swap ID
npx @getalby/hub-cli lookup-swap <swapId>
```

### On-chain

```bash
# Get an on-chain deposit address
npx @getalby/hub-cli get-onchain-address

# Send an on-chain payment from the hub's on-chain wallet to any address
npx @getalby/hub-cli pay-onchain bc1... --amount 100000

# Sweep the entire on-chain balance to an address
npx @getalby/hub-cli pay-onchain bc1... --all
```

### NWC Apps

```bash
# List NWC app connections
npx @getalby/hub-cli list-apps

# Look up a single app by name (prefix match) — the response includes its balance
npx @getalby/hub-cli list-apps --name "My App"

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

### Sub-wallets

```bash
# Create a sub-wallet (isolated app with its own balance)
npx @getalby/hub-cli create-sub-wallet --name "Alice"

# List only sub-wallets
npx @getalby/hub-cli list-apps --sub-wallets

# Fund a sub-wallet from the main hub wallet
npx @getalby/hub-cli transfer --to-app-id 3 --amount 10000

# Withdraw from a sub-wallet back to the main hub wallet
npx @getalby/hub-cli transfer --from-app-id 3 --amount 5000

# Move funds directly between two sub-wallets
npx @getalby/hub-cli transfer --from-app-id 3 --to-app-id 4 --amount 2000

# Assign a lightning address to a sub-wallet (requires a connected Alby account)
npx @getalby/hub-cli create-sub-wallet-lightning-address --app-id 3 --address alice

# Remove a sub-wallet's lightning address
npx @getalby/hub-cli delete-sub-wallet-lightning-address --app-id 3
```

## Output

All commands output JSON to stdout. Errors are written to stderr as JSON with a `message` field.

## Development

`yarn install`

`yarn dev`

`yarn test`

### E2E Testing

End-to-end tests spawn a real Alby Hub binary and exercise the CLI against it. Full setup instructions are in [`src/test/e2e/README.md`](src/test/e2e/README.md).

**Quick start:**

1. Download the Linux Ubuntu 24.04 Alby Hub binary from [GitHub releases](https://github.com/getAlby/hub/releases) and extract it to `src/test/e2e/albyhub-Server-Linux-x86_64/`
2. For regtest channel tests: install [Polar](https://lightningpolar.com/) and start a network with a Bitcoin Core node
3. For Mutinynet LSP tests: copy `src/test/e2e/.env.example` → `src/test/e2e/.env` and fill in `MUTINYNET_NWC_URL` (you need a Mutinynet hub running with sufficient liquidity, ideally a direct channel directly to Megalith Mutinynet LSP)

```bash
cd hub-cli
yarn test:e2e
```

Mutinynet tests are skipped automatically when `MUTINYNET_NWC_URL` is not set.
