export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/db/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Image from "next/image";
import Link from "next/link";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateWallet(key: string): string {
  return `${key.slice(0, 4)}...${key.slice(-2)}`;
}

export default async function ExplorePage() {
  const tokens = await prisma.token.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      name: true,
      symbol: true,
      imageUrl: true,
      mintAddress: true,
      status: true,
      totalBuybackLamports: true,
      createdAt: true,
      creatorWallet: {
        select: { publicKey: true },
      },
    },
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-28">
        <h1 className="font-heading text-2xl font-bold">explore</h1>

        {tokens.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg text-muted">no tokens launched yet</p>
            <Link
              href="/launch"
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-hover"
            >
              be the first to launch
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => {
              const buybackSol =
                Number(token.totalBuybackLamports) / LAMPORTS_PER_SOL;

              return (
                <Link
                  key={token.mintAddress}
                  href={`/token/${token.mintAddress}`}
                  className="group rounded-xl border border-white/5 bg-surface p-4 transition-colors hover:border-accent/30"
                >
                  <div className="flex items-start gap-3">
                    {token.imageUrl ? (
                      <Image
                        src={token.imageUrl}
                        alt={token.name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg font-bold text-muted">
                        {token.symbol.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-heading font-semibold">
                          {token.name}
                        </span>
                        <span className="shrink-0 text-sm text-muted">
                          ${token.symbol}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span className="font-mono">
                          {truncateWallet(token.creatorWallet.publicKey)}
                        </span>
                        <span>·</span>
                        <span>{timeAgo(token.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        token.status === "PUMPSWAP"
                          ? "bg-accent/10 text-accent"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {token.status === "PUMPSWAP"
                        ? "PumpSwap"
                        : "Bonding Curve"}
                    </span>

                    <span className="font-mono text-xs text-muted">
                      {buybackSol.toFixed(4)} SOL buyback
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
