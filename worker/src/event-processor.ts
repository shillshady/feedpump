import { Connection } from "@solana/web3.js";
import { prisma } from "./db.js";
import { collectAndBuy } from "./collect-and-buy.js";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 10;

export function startEventProcessor(connection: Connection): void {
  console.log("[event-processor] Started — polling every 5s");

  async function processEvents() {
    try {
      const events = await prisma.webhookEvent.findMany({
        where: { processed: false },
        orderBy: { receivedAt: "asc" },
        take: BATCH_SIZE,
        include: { token: true },
      });

      if (events.length === 0) return;

      console.log(`[event-processor] Processing ${events.length} events`);

      // Group by token to avoid duplicate processing
      const tokenIds = [...new Set(events.map((e) => e.tokenId).filter(Boolean))];

      for (const tokenId of tokenIds) {
        if (!tokenId) continue;
        await collectAndBuy(connection, tokenId);
      }

      // Mark all events as processed
      await prisma.webhookEvent.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: { processed: true },
      });
    } catch (error) {
      console.error("[event-processor] Error:", error);
    }
  }

  setInterval(processEvents, POLL_INTERVAL_MS);
  processEvents(); // Run immediately on start
}
