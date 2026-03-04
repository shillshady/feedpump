import { Keypair, Connection, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const HELIUS_API_KEY = "0e492ad2-d236-41dc-97e0-860d712bc03d";
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Generate test keypairs
  const creator = Keypair.generate();
  const mint = Keypair.generate();

  console.log("Creator:", creator.publicKey.toBase58());
  console.log("Mint:", mint.publicKey.toBase58());

  // Import the build function
  const { buildCreateTransaction } = await import("../lib/pumpfun/create");

  const txBytes = await buildCreateTransaction({
    creatorPublicKey: creator.publicKey,
    mintPublicKey: mint.publicKey,
    tokenMetadata: {
      name: "TestToken",
      symbol: "TEST",
      uri: "https://example.com/metadata.json",
    },
    priorityFee: 0.0005,
  });

  console.log("TX built:", txBytes.length, "bytes");

  const tx = VersionedTransaction.deserialize(txBytes);

  // Sign it
  tx.sign([mint, creator]);

  // Simulate with sigVerify=false (creator has no SOL)
  console.log("\nSimulating create TX...");
  const sim = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  if (sim.value.err) {
    console.error("SIMULATION FAILED:", JSON.stringify(sim.value.err, null, 2));
    console.error("\nLogs:");
    sim.value.logs?.forEach((log) => console.error("  ", log));
  } else {
    console.log("SIMULATION SUCCESS! CU used:", sim.value.unitsConsumed);
    console.log("Logs:");
    sim.value.logs?.forEach((log) => console.log("  ", log));
  }

  // Also simulate the buy TX
  console.log("\n\nSimulating buy TX...");
  const { buildBuyTransaction } = await import("../lib/pumpfun/buy");

  try {
    const buyTxBytes = await buildBuyTransaction({
      buyerPublicKey: creator.publicKey,
      mintPublicKey: mint.publicKey,
      creatorPublicKey: creator.publicKey,
      amountSol: 0.0001,
      slippageBps: 1500,
    });

    const buyTx = VersionedTransaction.deserialize(buyTxBytes);
    buyTx.sign([creator]);

    const buySim = await connection.simulateTransaction(buyTx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });

    if (buySim.value.err) {
      console.error("BUY SIMULATION FAILED:", JSON.stringify(buySim.value.err, null, 2));
      console.error("\nLogs:");
      buySim.value.logs?.forEach((log) => console.error("  ", log));
    } else {
      console.log("BUY SIMULATION SUCCESS! CU used:", buySim.value.unitsConsumed);
    }
  } catch (err) {
    console.error("BUY TX BUILD FAILED:", err);
  }
}

main().catch(console.error);
