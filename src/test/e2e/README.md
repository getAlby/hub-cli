# E2E Tests

End-to-end tests that spawn a real Alby Hub binary and exercise the CLI against it.

## Prerequisites

### Alby Hub binary

Download the Linux server build from the [Alby Hub GitHub releases](https://github.com/getAlby/hub/releases), extract it, and place it at:

```
src/test/e2e/albyhub-Server-Linux-x86_64/
```

For example, for `v1.23.0`:

```bash
curl -L https://github.com/getAlby/hub/releases/download/v1.23.0/albyhub-Server-Linux-x86_64.tar.bz2 \
  -o src/test/e2e/albyhub-Server-Linux-x86_64.tar.bz2
mkdir -p src/test/e2e/albyhub-Server-Linux-x86_64
tar -xjf src/test/e2e/albyhub-Server-Linux-x86_64.tar.bz2 -C src/test/e2e/albyhub-Server-Linux-x86_64
```

The directory must contain at minimum:
- `bin/albyhub` — the executable
- `lib/libldk_node.so` — the LDK node shared library

### Bitcoin Core regtest node (required by every suite)

Every suite starts the hub's LDK node, which needs a Bitcoin Core RPC backend to
reach `running` — without one the hub never finishes starting and the tests time
out. The tests connect to `127.0.0.1:18443` with the Polar default credentials
(`polaruser` / `polarpass`), so any of the following works:

**Option A — Polar (GUI):**

1. Download [Polar](https://lightningpolar.com/)
2. Create a network with a Bitcoin Core node using the default credentials (`polaruser` / `polarpass`)
3. Start the network

**Option B — headless `bitcoind` (no GUI, what CI uses):**

```bash
# Download Bitcoin Core (any recent version; CI uses 28.1)
curl -L https://bitcoincore.org/bin/bitcoin-core-28.1/bitcoin-28.1-x86_64-linux-gnu.tar.gz \
  -o /tmp/bitcoin-28.1.tar.gz
tar -xzf /tmp/bitcoin-28.1.tar.gz -C /tmp

# Configure a regtest node with the Polar default credentials
mkdir -p /tmp/bitcoin-regtest
cat > /tmp/bitcoin-regtest/bitcoin.conf <<'EOF'
regtest=1
server=1
rpcuser=polaruser
rpcpassword=polarpass
fallbackfee=0.0002
[regtest]
rpcbind=127.0.0.1
rpcport=18443
rpcallowip=127.0.0.1
EOF

# Start it (runs in the background)
/tmp/bitcoin-28.1/bin/bitcoind -datadir=/tmp/bitcoin-regtest -daemon
```

The `channel-lifecycle.e2e.test.ts` and `make-offer.e2e.test.ts` suites additionally
mine blocks and fund the hub over this same RPC connection (no extra setup needed —
the tests do it themselves).

### Mutinynet NWC URL (Mutinynet LSP test)

The `mutinynet-lsp.e2e.test.ts` suite requires a pre-funded Mutinynet (signet) Alby Hub with an NWC connection URL so it can pay LSP invoices automatically.

1. Copy the example env file:
   ```bash
   cp src/test/e2e/.env.example src/test/e2e/.env
   ```
2. Edit `src/test/e2e/.env` and set `MUTINYNET_NWC_URL` to your NWC connection URL.

Without this file (or with the variable unset) the Mutinynet tests are skipped automatically — no failures.

## Running

```bash
# All E2E tests (needs bitcoind regtest; channel suites need nothing more,
# Mutinynet suites self-skip without MUTINYNET_NWC_URL)
yarn test:e2e

# Every suite except the Mutinynet ones (which need MUTINYNET_NWC_URL) —
# i.e. everything that runs against a hub binary + bitcoind regtest
yarn test:e2e:standalone

# Individual suite (vitest pattern matching)
yarn test:e2e --reporter=verbose
```

## Test suites

In the "Requires" column, **bitcoind** means a regtest Bitcoin Core node as
described above (Polar or headless). It is needed by every suite.

| File | Requires | Description |
|------|----------|-------------|
| `setup.e2e.test.ts` | Hub binary + bitcoind | Hub initialisation |
| `start.e2e.test.ts` | Hub binary + bitcoind | Node start + JWT |
| `unlock.e2e.test.ts` | Hub binary + bitcoind | Token refresh |
| `stop.e2e.test.ts` | Hub binary + bitcoind | Node stop |
| `sync.e2e.test.ts` | Hub binary + bitcoind | Queue a wallet sync |
| `change-password.e2e.test.ts` | Hub binary + bitcoind | Change unlock password |
| `backup-mnemonic.e2e.test.ts` | Hub binary + bitcoind | Export recovery phrase |
| `get-info.e2e.test.ts` | Hub binary + bitcoind | Hub status / version / config |
| `list-apps.e2e.test.ts` | Hub binary + bitcoind | List NWC app connections |
| `create-app.e2e.test.ts` | Hub binary + bitcoind | Create NWC app (default, scoped/budgeted, isolated) |
| `lookup-transaction.e2e.test.ts` | Hub binary + bitcoind | Look up an invoice by payment hash + not-found error |
| `connect-alby-account.e2e.test.ts` | Hub binary + bitcoind | Returns auth URL when no account is linked |
| `request-alby-lsp-channel-offer.e2e.test.ts` | Hub binary + bitcoind | Errors when no Alby account is linked |
| `get-channel-suggestions.e2e.test.ts` | Hub binary + bitcoind | List available LSP providers |
| `channel-lifecycle.e2e.test.ts` | Hub binary + bitcoind (+ mining) | Two-hub regtest channel open, payments, close |
| `make-offer.e2e.test.ts` | Hub binary + bitcoind (+ mining) | BOLT-12 offer over a funded channel |
| `mutinynet-lsp.e2e.test.ts` | Hub binary + `MUTINYNET_NWC_URL` | Signet LSP channel open via NWC payment, payments, close |

The `standalone` config (`yarn test:e2e:standalone`) runs every suite above
**except** the Mutinynet suites (which need `MUTINYNET_NWC_URL`).

## Notes

- Each test suite spawns its own hub on a dedicated port and temporary `WORK_DIR`, cleaned up automatically
- Mutinynet tests are skipped (not failed) when `MUTINYNET_NWC_URL` is not set, so CI stays green without credentials
