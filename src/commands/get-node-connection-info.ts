import { Command } from "commander";
import { NodeConnectionInfo } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerGetNodeConnectionInfoCommand(program: Command): void {
  program
    .command("get-node-connection-info")
    .description("Get the Lightning node's connection info (pubkey, address, port)")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<NodeConnectionInfo>("/api/node/connection-info");
        output(result);
      });
    });
}
