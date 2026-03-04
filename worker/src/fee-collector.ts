import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { prisma } from "./db.js";
import { loadKeypair, signAndSend } from "./solana.js";

const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";

async function buildCollectFeeTx(publicKey: string): Promise<Uint8Array> {
  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey,
      action: "collectCreatorFee",
      priorityFee: 0.000001,
    }),
  });

  if (!response.ok) {
    throw new Error(`collectFee TX build failed: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function collectFees(
  connection: Connection,
  tokenId: string,
  wallet: { encryptedPrivateKey: string; iv: string; authTag: string },
  publicKey: string
): Promise<{ signature: string; amountLamports: bigint } | null> {
  const keypair = loadKeypair(
    wallet.encryptedPrivateKey,
    wallet.iv,
    wallet.authTag
  );

  // Check creator vault balance
  const balanceBefore = await connection.getBalance(keypair.publicKey);

  const txBytes = await buildCollectFeeTx(publicKey);
  const signature = await signAndSend(connection, txBytes, [keypair]);

  // Wait a moment then check balance diff
  await new Promise((r) => setTimeout(r, 2000));
  const balanceAfter = await connection.getBalance(keypair.publicKey);

  const collected = BigInt(balanceAfter - balanceBefore);
  if (collected <= 0) return null;

  // Record the claim
  await prisma.feeClaim.create({
    data: {
      tokenId,
      amountLamports: collected,
      txSignature: signature,
      status: "CONFIRMED",
    },
  });

  await prisma.token.update({
    where: { id: tokenId },
    data: {
      totalFeesCollectedLamports: { increment: collected },
    },
  });

  const sol = Number(collected) / LAMPORTS_PER_SOL;
  console.log(`[collect] ${sol.toFixed(6)} SOL from token ${tokenId} | tx: ${signature}`);

  return { signature, amountLamports: collected };
}
