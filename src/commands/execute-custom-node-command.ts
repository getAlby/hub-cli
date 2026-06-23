import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerExecuteCustomNodeCommandCommand(
  program: Command,
): void {
  program
    .command("execute-custom-node-command <command>")
    .description(
      'Execute a custom node (debug) command. Pass the full command line as a single quoted string, e.g. "debug" or "pay_bolt12_offer --offer lno... --amount 1000". Run list-custom-node-commands to see available commands and their arguments. DO NOT execute without human approval, some commands may have side effects and are for testing only.',
    )
    .action(async (command: string) => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.post<unknown>("/api/command", { command });
        output(result);
      });
    });
}
