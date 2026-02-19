import { Command } from "commander";
import { InfoResponse } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerInfoCommand(program: Command): void {
  program
    .command("info")
    .description("Get hub status, version, and configuration")
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<InfoResponse>("/api/info");
        output(result);
      });
    });
}
