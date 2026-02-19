import { Command } from "commander";
import { HealthResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerHealthCommand(program: Command): void {
  program
    .command("health")
    .description(
      "Check hub health and active alarms (alby_service, nostr_relay_offline, node_not_ready, channels_offline, vss_no_subscription)",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<HealthResponse>("/api/health");
        output(result);
      });
    });
}
