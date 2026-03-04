import { NextRequest, NextResponse } from "next/server";
import { VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "@/lib/solana/connection";

export async function POST(request: NextRequest) {
  try {
    const { signedBuyTx } = await request.json();

    if (!signedBuyTx) {
      return NextResponse.json(
        { error: "Missing signed buy transaction" },
        { status: 400 }
      );
    }

    const connection = getConnection();
    const txBytes = new Uint8Array(Buffer.from(signedBuyTx, "base64"));
    const tx = VersionedTransaction.deserialize(txBytes);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    console.log(`[buy] TX sent: ${sig}`);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const result = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (result.value.err) {
      console.error(`[buy] TX failed:`, result.value.err);
      return NextResponse.json(
        { error: `Buy failed: ${JSON.stringify(result.value.err)}` },
        { status: 400 }
      );
    }

    console.log(`[buy] Confirmed: ${sig}`);
    return NextResponse.json({ signature: sig });
  } catch (error) {
    console.error("[buy] Failed:", error);
    const message = error instanceof Error ? error.message : "Buy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
