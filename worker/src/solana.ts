import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { createCipheriv, createDecipheriv } from "crypto";
import bs58 from "bs58";

export function getConnection(): Connection {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY required");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
    commitment: "confirmed",
  });
}

export function decryptPrivateKey(
  ciphertext: string,
  iv: string,
  authTag: string
): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY required");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function loadKeypair(
  ciphertext: string,
  iv: string,
  authTag: string
): Keypair {
  const secretKey = decryptPrivateKey(ciphertext, iv, authTag);
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

const MAX_RETRIES = 3;

export async function signAndSend(
  connection: Connection,
  txBytes: Uint8Array,
  signers: Keypair[]
): Promise<string> {
  const tx = VersionedTransaction.deserialize(txBytes);
  tx.sign(signers);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const sig = await connection.sendTransaction(tx, {
        skipPreflight: false,
        maxRetries: 2,
      });

      const confirmation = await connection.confirmTransaction(
        sig,
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error(`TX failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      return sig;
    } catch (error) {
      lastError = error as Error;
      if (
        !lastError.message.includes("blockhash") &&
        !lastError.message.includes("timeout")
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
}
