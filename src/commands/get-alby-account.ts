import { Command } from "commander";
import { AlbyMe } from "../types.js";
import { getClient, handleError, output } from "../utils.js";

export function registerGetAlbyAccountCommand(program: Command): void {
  program
    .command("get-alby-account")
    .description(
      "Get the connected Alby account (lightning address, email, subscription)",
    )
    .action(async () => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.get<AlbyMe>("/api/alby/me");
        output(result);
      });
    });
}
