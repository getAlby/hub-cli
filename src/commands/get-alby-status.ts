import { Command } from "commander";
import { AlbyInfo } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerGetAlbyStatusCommand(program: Command): void {
  program
    .command("get-alby-status")
    .description(
      "Get Alby service status: latest hub version, health, and incidents",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<AlbyInfo>("/api/alby/info");
        output(result);
      });
    });
}
