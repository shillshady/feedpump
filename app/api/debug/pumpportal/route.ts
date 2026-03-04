import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    // Step 1: Upload metadata
    const metaForm = new FormData();
    if (imageFile) {
      const buf = await imageFile.arrayBuffer();
      const blob = new Blob([buf], { type: imageFile.type || "image/png" });
      metaForm.append("file", blob, imageFile.name || "image.png");
    }
    metaForm.append("name", "debugtest");
    metaForm.append("symbol", "DBG");
    metaForm.append("description", "debug");
    metaForm.append("showName", "true");

    const metaRes = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: metaForm,
    });
    const metaStatus = metaRes.status;
    const metaBody = await metaRes.text();

    let metadataUri = "";
    try {
      const parsed = JSON.parse(metaBody);
      metadataUri = parsed.metadataUri || "";
    } catch {}

    // Step 2: Call PumpPortal with that URI
    const creator = Keypair.generate();
    const mint = Keypair.generate();

    const payload = {
      publicKey: creator.publicKey.toBase58(),
      action: "create",
      tokenMetadata: { name: "debugtest", symbol: "DBG", uri: metadataUri },
      mint: mint.publicKey.toBase58(),
      denominatedInSol: "true",
      amount: 0,
      slippage: 10,
      priorityFee: 0.0005,
      pool: "pump",
    };

    const ppRes = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ppContentType = ppRes.headers.get("content-type") || "";
    let ppBody: string;
    if (ppContentType.includes("json") || !ppRes.ok) {
      ppBody = await ppRes.text();
    } else {
      ppBody = `binary: ${(await ppRes.arrayBuffer()).byteLength} bytes`;
    }

    return NextResponse.json({
      meta: { status: metaStatus, body: metaBody, uri: metadataUri },
      pumpportal: { status: ppRes.status, contentType: ppContentType, body: ppBody },
      payload,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST with form data (image field)" });
}
