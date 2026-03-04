import WebSocket from "ws";
import { prisma } from "./db.js";
import { derivePumpSwapVault } from "./vault.js";

const WS_URL = "wss://pumpportal.fun/api/data";
const RECONNECT_DELAY_MS = 5_000;

export function startMigrationWatcher(): void {
  console.log("[ws] Starting migration watcher");
  connect();
}

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("[ws] Connected to PumpPortal");
    ws.send(JSON.stringify({ method: "subscribeMigration" }));
  });

  ws.on("message", async (data) => {
    try {
      const event = JSON.parse(data.toString());

      if (!event.mint) return;

      const token = await prisma.token.findUnique({
        where: { mintAddress: event.mint },
      });

      if (!token) return;

      console.log(`[ws] Migration detected for ${token.mintAddress}`);

      // Derive new PumpSwap vault PDA
      const poolId = event.pool ?? event.poolId;
      if (!poolId) {
        console.warn("[ws] No pool ID in migration event");
        return;
      }

      const swapVaultPda = derivePumpSwapVault(token.mintAddress, poolId);

      await prisma.token.update({
        where: { id: token.id },
        data: {
          status: "PUMPSWAP",
          swapVaultPda,
        },
      });

      // Update Helius webhook to watch new vault
      if (token.webhookId) {
        const { addAddressToWebhook } = await import("./helius.js");
        await addAddressToWebhook(token.webhookId, [swapVaultPda]);
      }

      console.log(`[ws] Updated ${token.mintAddress} → PUMPSWAP vault: ${swapVaultPda}`);
    } catch (error) {
      console.error("[ws] Error processing migration:", error);
    }
  });

  ws.on("close", () => {
    console.log(`[ws] Disconnected. Reconnecting in ${RECONNECT_DELAY_MS}ms`);
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.on("error", (error) => {
    console.error("[ws] WebSocket error:", error);
    ws.close();
  });
}
