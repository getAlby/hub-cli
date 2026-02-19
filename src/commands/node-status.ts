import { Command } from "commander";
import { NodeStatus } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerNodeStatusCommand(program: Command): void {
  program
    .command("node-status")
    .description("Get Lightning node readiness status")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<NodeStatus>("/api/node/status");
        output(result);
      });
    });
}
