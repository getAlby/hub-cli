import { Command } from "commander";
import { getClient, handleError } from "../utils.js";

export function registerStopCommand(program: Command): void {
  program
    .command("stop")
    .description("Stop the Lightning node (the hub HTTP server keeps running)")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        await client.post("/api/stop");
      });
    });
}
