import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { prisma } from "@/lib/db/client";

export function generateKeypair() {
  return Keypair.generate();
}

export async function storeKeypair(keypair: Keypair) {
  const secretKeyBase58 = bs58.encode(keypair.secretKey);
  const encrypted = encrypt(secretKeyBase58);

  const wallet = await prisma.creatorWallet.create({
    data: {
      publicKey: keypair.publicKey.toBase58(),
      encryptedPrivateKey: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    },
  });

  return wallet;
}

export async function loadKeypair(walletId: string): Promise<Keypair> {
  const wallet = await prisma.creatorWallet.findUniqueOrThrow({
    where: { id: walletId },
  });

  const secretKeyBase58 = decrypt({
    ciphertext: wallet.encryptedPrivateKey,
    iv: wallet.iv,
    authTag: wallet.authTag,
  });

  return Keypair.fromSecretKey(bs58.decode(secretKeyBase58));
}

export async function loadKeypairByPublicKey(
  publicKey: string
): Promise<Keypair> {
  const wallet = await prisma.creatorWallet.findUniqueOrThrow({
    where: { publicKey },
  });

  const secretKeyBase58 = decrypt({
    ciphertext: wallet.encryptedPrivateKey,
    iv: wallet.iv,
    authTag: wallet.authTag,
  });

  return Keypair.fromSecretKey(bs58.decode(secretKeyBase58));
}
