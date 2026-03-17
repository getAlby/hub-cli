import { Command } from "commander";
import { getClient, handleError, output } from "../utils.js";

export function registerMakeOfferCommand(program: Command): void {
  program
    .command("make-offer")
    .description("Create a BOLT-12 offer")
    .option("--description <string>", "Offer description", "")
    .action(async (opts: { description: string }) => {
      await handleError(async () => {
        const client = getClient(program);
        const result = await client.post<string>("/api/offers", {
          description: opts.description,
        });
        output(result);
      });
    });
}
