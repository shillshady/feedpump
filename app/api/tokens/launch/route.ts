import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import { prisma } from "@/lib/db/client";
import { encrypt } from "@/lib/crypto/encryption";
import { uploadMetadata } from "@/lib/pumpportal/metadata";
import { buildCreateTransaction } from "@/lib/pumpfun/create";
import { signAndSend } from "@/lib/solana/send";
import { deriveBondingCurveVault, deriveCreatorVault } from "@/lib/solana/vault";
import { createWebhook } from "@/lib/helius/webhooks";
import { launchTokenSchema } from "@/lib/validation/token";
import bs58 from "bs58";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const rawInput = {
      name: formData.get("name") as string,
      symbol: formData.get("symbol") as string,
      description: formData.get("description") as string,
      twitter: (formData.get("twitter") as string) || "",
      telegram: (formData.get("telegram") as string) || "",
      website: (formData.get("website") as string) || "",
      initialBuyAmount: Number(formData.get("initialBuyAmount") ?? 0),
    };

    const parsed = launchTokenSchema.safeParse(rawInput);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json(
        { error: { image: ["Image is required"] } },
        { status: 400 }
      );
    }

    // Generate creator wallet (feedpump controls this)
    const creatorKeypair = Keypair.generate();
    const mintKeypair = Keypair.generate();

    // Upload metadata to pump.fun IPFS
    const metadata = await uploadMetadata({
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      twitter: input.twitter || undefined,
      telegram: input.telegram || undefined,
      website: input.website || undefined,
      imageFile,
    });

    // Build create transaction directly against pump.fun program
    const txBytes = await buildCreateTransaction({
      creatorPublicKey: creatorKeypair.publicKey,
      mintPublicKey: mintKeypair.publicKey,
      tokenMetadata: {
        name: input.name,
        symbol: input.symbol,
        uri: metadata.metadataUri,
      },
      priorityFee: 0.0005,
    });

    // Sign and send
    const txSignature = await signAndSend(txBytes, [
      mintKeypair,
      creatorKeypair,
    ]);

    // Derive vault PDAs
    const mintAddress = mintKeypair.publicKey.toBase58();
    const vaultPda = deriveBondingCurveVault(mintAddress);
    const creatorVault = deriveCreatorVault(mintAddress);

    // Register Helius webhook for the creator vault
    const webhook = await createWebhook([creatorVault]);

    // Store encrypted private key
    const secretKeyBase58 = bs58.encode(creatorKeypair.secretKey);
    const encrypted = encrypt(secretKeyBase58);

    // Save everything to DB
    const token = await prisma.token.create({
      data: {
        mintAddress,
        name: input.name,
        symbol: input.symbol,
        vaultPda,
        webhookId: webhook.webhookID,
        creatorWallet: {
          create: {
            publicKey: creatorKeypair.publicKey.toBase58(),
            encryptedPrivateKey: encrypted.ciphertext,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        },
      },
    });

    return NextResponse.json({
      mintAddress,
      txSignature,
      tokenId: token.id,
    });
  } catch (error) {
    console.error("Token launch failed:", error);
    return NextResponse.json(
      { error: "Token launch failed. Please try again." },
      { status: 500 }
    );
  }
}
