import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { prisma } from "./db.js";
import { collectFees } from "./fee-collector.js";
import { buyback } from "./auto-buyer.js";

const MIN_COLLECT_LAMPORTS = 1_000_000; // 0.001 SOL
const LOCK_TTL_MS = 15_000; // 15s lock expiry

async function acquireLock(lockId: string): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  try {
    // Try to create lock, or update if expired
    await prisma.$executeRaw`
      INSERT INTO processing_locks (id, locked_at, expires_at)
      VALUES (${lockId}, ${now}, ${expiresAt})
      ON CONFLICT (id) DO UPDATE
      SET locked_at = ${now}, expires_at = ${expiresAt}
      WHERE processing_locks.expires_at < ${now}
    `;

    // Verify we got the lock
    const lock = await prisma.processingLock.findUnique({
      where: { id: lockId },
    });
    return lock?.lockedAt.getTime() === now.getTime();
  } catch {
    return false;
  }
}

async function releaseLock(lockId: string): Promise<void> {
  await prisma.processingLock
    .delete({ where: { id: lockId } })
    .catch(() => {});
}

export async function collectAndBuy(
  connection: Connection,
  tokenId: string
): Promise<void> {
  const token = await prisma.token.findUniqueOrThrow({
    where: { id: tokenId },
    include: { creatorWallet: true },
  });

  const lockId = token.vaultPda;
  const hasLock = await acquireLock(lockId);
  if (!hasLock) {
    console.log(`[lock] Skipping ${token.mintAddress} — already locked`);
    return;
  }

  try {
    // Check creator vault PDA balance before collecting
    const vaultPubkey = new PublicKey(token.vaultPda);
    const vaultBalance = await connection.getBalance(vaultPubkey);

    if (vaultBalance < MIN_COLLECT_LAMPORTS) {
      return;
    }

    // Step 1: Collect fees
    const collectResult = await collectFees(
      connection,
      tokenId,
      token.creatorWallet,
      token.creatorWallet.publicKey
    );

    if (!collectResult) return;

    // Step 2: Buy the token with collected SOL
    await buyback(
      connection,
      tokenId,
      token.mintAddress,
      token.creatorWallet,
      token.creatorWallet.publicKey,
      collectResult.amountLamports
    );
  } catch (error) {
    console.error(`[error] collect-and-buy for ${token.mintAddress}:`, error);
  } finally {
    await releaseLock(lockId);
  }
}
