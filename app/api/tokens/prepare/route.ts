import { NextRequest, NextResponse } from "next/server";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { uploadMetadata } from "@/lib/pumpportal/metadata";
import { buildCreateTransaction } from "@/lib/pumpfun/create";
import { buildBuyTransaction } from "@/lib/pumpfun/buy";
import { buildFundingTransaction, calculateCreateFundingSol } from "@/lib/solana/transfer";
import { encrypt } from "@/lib/crypto/encryption";
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

    const userPublicKey = formData.get("userPublicKey") as string;
    if (!userPublicKey) {
      return NextResponse.json(
        { error: "Wallet not connected" },
        { status: 400 }
      );
    }

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

    console.log("[prepare] Starting launch:", input.name, input.symbol);

    const creatorKeypair = Keypair.generate();
    const mintKeypair = Keypair.generate();
    console.log("[prepare] Creator:", creatorKeypair.publicKey.toBase58(), "Mint:", mintKeypair.publicKey.toBase58());

    // Upload metadata to pump.fun IPFS
    console.log("[prepare] Uploading metadata...");
    const metadata = await uploadMetadata({
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      twitter: input.twitter || undefined,
      telegram: input.telegram || undefined,
      website: input.website || undefined,
      imageFile,
    });
    console.log("[prepare] Metadata uploaded:", metadata.metadataUri);

    // Build create TX (server-signed by creator + mint keypairs)
    console.log("[prepare] Building create TX...");
    const createTxBytes = await buildCreateTransaction({
      creatorPublicKey: creatorKeypair.publicKey,
      mintPublicKey: mintKeypair.publicKey,
      tokenMetadata: {
        name: input.name,
        symbol: input.symbol,
        uri: metadata.metadataUri,
      },
      priorityFee: 0.0005,
    });
    const createTx = VersionedTransaction.deserialize(createTxBytes);
    createTx.sign([mintKeypair, creatorKeypair]);
    const signedCreateTx = Buffer.from(createTx.serialize()).toString("base64");
    console.log("[prepare] Create TX signed:", createTxBytes.length, "bytes");

    // Build funding TX: user → creator wallet (only gas for create, not buy amount)
    const requiredSol = calculateCreateFundingSol();
    console.log("[prepare] Funding TX. Required SOL:", requiredSol);
    const fundingTx = await buildFundingTransaction(
      new PublicKey(userPublicKey),
      creatorKeypair.publicKey,
      requiredSol
    );
    const unsignedFundingTx = Buffer.from(fundingTx.serialize()).toString("base64");

    // Build buy TX: USER's wallet buys directly (unsigned — user signs client-side)
    let unsignedBuyTx: string | null = null;
    if (input.initialBuyAmount > 0) {
      console.log("[prepare] Building buy TX for user wallet,", input.initialBuyAmount, "SOL...");
      const buyTxBytes = await buildBuyTransaction({
        buyerPublicKey: new PublicKey(userPublicKey),
        mintPublicKey: mintKeypair.publicKey,
        creatorPublicKey: creatorKeypair.publicKey,
        amountSol: input.initialBuyAmount,
        slippageBps: 1500,
      });
      unsignedBuyTx = Buffer.from(buyTxBytes).toString("base64");
      console.log("[prepare] Buy TX built (unsigned)");
    }

    // Encrypt creator keypair for the confirm step
    const encrypted = encrypt(bs58.encode(creatorKeypair.secretKey));

    console.log("[prepare] Success! Mint:", mintKeypair.publicKey.toBase58());

    return NextResponse.json({
      fundingTransaction: unsignedFundingTx,
      createTransaction: signedCreateTx,
      buyTransaction: unsignedBuyTx,
      mintAddress: mintKeypair.publicKey.toBase58(),
      creatorPublicKey: creatorKeypair.publicKey.toBase58(),
      requiredSol,
      creatorWallet: {
        publicKey: creatorKeypair.publicKey.toBase58(),
        encryptedPrivateKey: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });
  } catch (error) {
    console.error("[prepare] FAILED:", error instanceof Error ? error.stack : error);
    const message =
      error instanceof Error ? error.message : "Preparation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
