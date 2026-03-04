# E2E Tests

End-to-end tests that spawn a real Alby Hub binary and exercise the CLI against it.

## Prerequisites

### Alby Hub binary

Download the Linux Ubuntu 24.04 desktop build from the [Alby Hub GitHub releases](https://github.com/getAlby/hub/releases), extract it, and place it at:

```
src/test/e2e/albyhub-Server-Linux-x86_64/
```

The directory must contain at minimum:
- `bin/albyhub` — the executable
- `lib/libldk_node.so` — the LDK node shared library

### Polar (regtest channel lifecycle tests)

The `channel-lifecycle.e2e.test.ts` suite requires a local Bitcoin Core node accessible via RPC.

1. Download [Polar](https://lightningpolar.com/)
2. Create a network with a Bitcoin Core node using the default credentials (`polaruser` / `polarpass`)
3. Start the network

The tests connect to Bitcoin Core on `127.0.0.1:18443` using those defaults — no extra env vars needed.

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
# All E2E tests
yarn test:e2e

# Individual suite (vitest pattern matching)
yarn test:e2e --reporter=verbose
```

## Test suites

| File | Requires | Description |
|------|----------|-------------|
| `setup.e2e.test.ts` | Hub binary | Hub initialisation |
| `start.e2e.test.ts` | Hub binary | Node start + JWT |
| `unlock.e2e.test.ts` | Hub binary | Token refresh |
| `stop.e2e.test.ts` | Hub binary | Node stop |
| `channel-lifecycle.e2e.test.ts` | Hub binary + Polar | Two-hub regtest channel open, payments, close |
| `mutinynet-lsp.e2e.test.ts` | Hub binary + `MUTINYNET_NWC_URL` | Signet LSP channel open via NWC payment, payments, close |

## Notes

- Each test suite spawns its own hub on a dedicated port and temporary `WORK_DIR`, cleaned up automatically
- Mutinynet tests are skipped (not failed) when `MUTINYNET_NWC_URL` is not set, so CI stays green without credentials
