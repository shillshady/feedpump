import { NextRequest, NextResponse } from "next/server";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { prisma } from "@/lib/db/client";
import { deriveBondingCurveVault, deriveCreatorVault } from "@/lib/solana/vault";
import { createWebhook } from "@/lib/helius/webhooks";
import { getConnection } from "@/lib/solana/connection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      signedFundingTx,
      signedCreateTx,
      signedBuyTx,
      mintAddress,
      name,
      symbol,
      creatorWallet,
    } = body;

    if (!signedFundingTx || !signedCreateTx || !mintAddress || !creatorWallet) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Idempotency check
    const existing = await prisma.token.findUnique({
      where: { mintAddress },
    });
    if (existing) {
      return NextResponse.json({
        mintAddress,
        tokenId: existing.id,
      });
    }

    const connection = getConnection();

    // Step 1: Send funding TX (user → creator wallet)
    console.log(`[confirm] Sending funding TX for mint ${mintAddress}...`);
    const fundingSig = await sendAndConfirm(
      connection,
      new Uint8Array(Buffer.from(signedFundingTx, "base64")),
      "funding"
    );
    console.log(`[confirm] Funding confirmed: ${fundingSig}`);

    // Step 2: Send create TX
    console.log(`[confirm] Sending create TX...`);
    const createSig = await sendAndConfirm(
      connection,
      new Uint8Array(Buffer.from(signedCreateTx, "base64")),
      "create"
    );
    console.log(`[confirm] Create confirmed: ${createSig}`);

    // Build unsigned buy TX now that token exists on-chain
    let unsignedBuyTx: string | null = null;
    if (body.initialBuyAmount > 0 && body.userPublicKey) {
      console.log(`[confirm] Building buy TX for user wallet...`);
      const { buildBuyTransaction } = await import("@/lib/pumpfun/buy");
      const buyTxBytes = await buildBuyTransaction({
        buyerPublicKey: new PublicKey(body.userPublicKey),
        mintPublicKey: new PublicKey(mintAddress),
        creatorPublicKey: new PublicKey(creatorWallet.publicKey),
        amountSol: body.initialBuyAmount,
        slippageBps: 1500,
      });
      unsignedBuyTx = Buffer.from(buyTxBytes).toString("base64");
      console.log(`[confirm] Buy TX built for user signing`);
    }

    // Derive vault PDAs
    const vaultPda = deriveBondingCurveVault(mintAddress);
    const creatorVault = deriveCreatorVault(mintAddress);

    // Register Helius webhook for creator vault
    let webhookId: string | null = null;
    try {
      const webhook = await createWebhook([creatorVault]);
      webhookId = webhook.webhookID;
    } catch (error) {
      console.error("Webhook creation failed (non-fatal):", error);
    }

    // Save to DB
    const token = await prisma.token.create({
      data: {
        mintAddress,
        name: name || "Unknown",
        symbol: symbol || "???",
        vaultPda,
        webhookId,
        creatorWallet: {
          create: {
            publicKey: creatorWallet.publicKey,
            encryptedPrivateKey: creatorWallet.encryptedPrivateKey,
            iv: creatorWallet.iv,
            authTag: creatorWallet.authTag,
          },
        },
      },
    });

    return NextResponse.json({
      mintAddress,
      tokenId: token.id,
      fundingSignature: fundingSig,
      createSignature: createSig,
      unsignedBuyTx,
    });
  } catch (error) {
    console.error("Token confirm failed:", error);
    const message =
      error instanceof Error ? error.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function sendAndConfirm(
  connection: ReturnType<typeof getConnection>,
  txBytes: Uint8Array,
  label: string
): Promise<string> {
  const tx = VersionedTransaction.deserialize(txBytes);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`[rpc] ${label} sent: ${sig}`);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const result = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  if (result.value.err) {
    throw new Error(`${label} TX failed: ${JSON.stringify(result.value.err)}`);
  }

  return sig;
}
