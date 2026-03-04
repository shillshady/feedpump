import { Connection } from "@solana/web3.js";

const globalForConnection = globalThis as unknown as {
  solanaConnection: Connection;
};

function getRpcUrl(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY is required");
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export function getConnection(): Connection {
  if (globalForConnection.solanaConnection) {
    return globalForConnection.solanaConnection;
  }

  const conn = new Connection(getRpcUrl(), {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForConnection.solanaConnection = conn;
  }

  return conn;
}
