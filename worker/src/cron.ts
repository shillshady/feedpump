import { Connection } from "@solana/web3.js";
import { prisma } from "./db.js";
import { collectAndBuy } from "./collect-and-buy.js";

const CRON_INTERVAL_MS = 15_000; // 15s

export function startCron(connection: Connection): void {
  console.log("[cron] Started — checking vaults every 15s");

  async function checkAllVaults() {
    try {
      const tokens = await prisma.token.findMany({
        select: { id: true, mintAddress: true },
      });

      if (tokens.length === 0) return;

      console.log(`[cron] Checking ${tokens.length} token vaults`);

      for (const token of tokens) {
        try {
          await collectAndBuy(connection, token.id);
        } catch (error) {
          console.error(
            `[cron] Error processing ${token.mintAddress}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("[cron] Error:", error);
    }
  }

  setInterval(checkAllVaults, CRON_INTERVAL_MS);
}
