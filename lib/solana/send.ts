import {
  VersionedTransaction,
  Keypair,
  SendOptions,
  TransactionSignature,
} from "@solana/web3.js";
import { getConnection } from "./connection";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function signAndSend(
  txBytes: Uint8Array,
  signers: Keypair[],
  options?: SendOptions
): Promise<TransactionSignature> {
  const conn = getConnection();
  const tx = VersionedTransaction.deserialize(txBytes);
  tx.sign(signers);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const signature = await conn.sendTransaction(tx, {
        skipPreflight: false,
        maxRetries: 2,
        ...options,
      });

      const confirmation = await conn.confirmTransaction(
        signature,
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      return signature;
    } catch (error) {
      lastError = error as Error;
      const isRetryable =
        lastError.message.includes("blockhash") ||
        lastError.message.includes("timeout");

      if (!isRetryable || attempt === MAX_RETRIES - 1) break;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}
