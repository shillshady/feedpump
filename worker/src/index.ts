import "dotenv/config";
import { getConnection } from "./solana.js";
import { startEventProcessor } from "./event-processor.js";
import { startMigrationWatcher } from "./websocket.js";
import { startCron } from "./cron.js";

async function main() {
  console.log("=== feedpump worker starting ===");

  const connection = getConnection();

  // Test connection
  const slot = await connection.getSlot();
  console.log(`[rpc] Connected to Solana. Current slot: ${slot}`);

  // Start all services
  startEventProcessor(connection);
  startMigrationWatcher();
  startCron(connection);

  console.log("=== feedpump worker running ===");
}

main().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  process.exit(0);
});
