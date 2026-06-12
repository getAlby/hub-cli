import { defineConfig } from "vitest/config";

// "Standalone" E2E config: runs every E2E suite EXCEPT the Mutinynet ones,
// which need a pre-funded Mutinynet (signet) wallet via MUTINYNET_NWC_URL.
// Everything else needs only a hub binary + a local bitcoind regtest node
// (Polar-compatible: polaruser/polarpass on 127.0.0.1:18443).
//
// Run with: yarn test:e2e:standalone
export default defineConfig({
  test: {
    include: ["src/test/e2e/**/*.test.ts"],
    exclude: ["node_modules", "src/test/e2e/mutinynet/**"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
