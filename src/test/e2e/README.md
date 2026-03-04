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

### Polar (optional — for future `start`/`unlock` tests)

For tests that require Bitcoin connectivity (not needed for `setup`):

1. Download [Polar](https://lightningpolar.com/)
2. Create a network with a Bitcoin Core node
3. Start the network
4. Set `POLAR_ESPLORA_URL` env var to your Polar Esplora URL (e.g. `http://127.0.0.1:3000`)

## Running

```bash
yarn test:e2e
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POLAR_ESPLORA_URL` | `http://127.0.0.1:3000` | Esplora URL from Polar (only needed for `start`/`unlock` tests) |

## Notes

- The hub is started on port `18080` to avoid conflicts with a locally running hub
- A temporary `WORK_DIR` is created per test run and cleaned up automatically
- The `setup` test does not require Bitcoin/Polar connectivity — it only calls `POST /api/setup`
