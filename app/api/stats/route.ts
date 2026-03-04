import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, tokenCount] = await Promise.all([
    prisma.token.aggregate({
      _sum: {
        totalFeesCollectedLamports: true,
        totalBuybackLamports: true,
      },
    }),
    prisma.token.count(),
  ]);

  const totalFeesLamports =
    stats._sum.totalFeesCollectedLamports ?? BigInt(0);
  const totalBuybackLamports =
    stats._sum.totalBuybackLamports ?? BigInt(0);

  return NextResponse.json({
    totalFeesCollectedSol: Number(totalFeesLamports) / 1e9,
    totalBuybackSol: Number(totalBuybackLamports) / 1e9,
    totalTokens: tokenCount,
  });
}
