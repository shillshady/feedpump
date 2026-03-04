import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { prisma } from "./db.js";
import { loadKeypair, signAndSend } from "./solana.js";

const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";
const TX_FEE_BUFFER_LAMPORTS = 10_000; // ~0.00001 SOL reserved for tx fees

async function buildBuyTx(
  publicKey: string,
  mintAddress: string,
  amountSol: number
): Promise<Uint8Array> {
  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey,
      action: "buy",
      mint: mintAddress,
      amount: amountSol,
      denominatedInSol: "true",
      slippage: 15,
      priorityFee: 0.0005,
      pool: "auto",
    }),
  });

  if (!response.ok) {
    throw new Error(`Buy TX build failed: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function buyback(
  connection: Connection,
  tokenId: string,
  mintAddress: string,
  wallet: { encryptedPrivateKey: string; iv: string; authTag: string },
  publicKey: string,
  amountLamports: bigint
): Promise<string | null> {
  const keypair = loadKeypair(
    wallet.encryptedPrivateKey,
    wallet.iv,
    wallet.authTag
  );

  // Reserve buffer for tx fees
  const buyAmountLamports = amountLamports - BigInt(TX_FEE_BUFFER_LAMPORTS);
  if (buyAmountLamports <= 0) return null;

  const amountSol = Number(buyAmountLamports) / LAMPORTS_PER_SOL;

  const txBytes = await buildBuyTx(publicKey, mintAddress, amountSol);
  const signature = await signAndSend(connection, txBytes, [keypair]);

  // Record the buyback
  await prisma.buyback.create({
    data: {
      tokenId,
      amountLamports: buyAmountLamports,
      txSignature: signature,
      status: "CONFIRMED",
    },
  });

  await prisma.token.update({
    where: { id: tokenId },
    data: {
      totalBuybackLamports: { increment: buyAmountLamports },
    },
  });

  console.log(
    `[buyback] ${amountSol.toFixed(6)} SOL → ${mintAddress} | tx: ${signature}`
  );

  return signature;
}
