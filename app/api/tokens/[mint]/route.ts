import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  const token = await prisma.token.findUnique({
    where: { mintAddress: mint },
    include: {
      buybacks: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          amountLamports: true,
          tokensReceived: true,
          txSignature: true,
          status: true,
          createdAt: true,
        },
      },
      feeClaims: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          amountLamports: true,
          txSignature: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({
    mintAddress: token.mintAddress,
    name: token.name,
    symbol: token.symbol,
    imageUrl: token.imageUrl,
    status: token.status,
    totalFeesCollected: token.totalFeesCollectedLamports.toString(),
    totalBuyback: token.totalBuybackLamports.toString(),
    createdAt: token.createdAt,
    buybacks: token.buybacks.map((b) => ({
      amount: b.amountLamports.toString(),
      tokensReceived: b.tokensReceived?.toString(),
      tx: b.txSignature,
      status: b.status,
      at: b.createdAt,
    })),
    feeClaims: token.feeClaims.map((f) => ({
      amount: f.amountLamports.toString(),
      tx: f.txSignature,
      status: f.status,
      at: f.createdAt,
    })),
  });
}
