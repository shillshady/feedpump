export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import Image from "next/image";
import CopyButton from "./CopyButton";
import LiveStats from "./LiveStats";

interface Props {
  params: Promise<{ mint: string }>;
}

export default async function TokenPage({ params }: Props) {
  const { mint } = await params;

  const token = await prisma.token.findUnique({
    where: { mintAddress: mint },
    include: {
      buybacks: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      feeClaims: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!token) notFound();

  const initialData = {
    totalFeesCollected: token.totalFeesCollectedLamports.toString(),
    totalBuyback: token.totalBuybackLamports.toString(),
    buybacks: token.buybacks.map((b) => ({
      amount: b.amountLamports.toString(),
      tokensReceived: b.tokensReceived?.toString() ?? null,
      tx: b.txSignature,
      status: b.status,
      at: b.createdAt.toISOString(),
    })),
    feeClaims: token.feeClaims.map((f) => ({
      amount: f.amountLamports.toString(),
      tx: f.txSignature,
      status: f.status,
      at: f.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-28">
        {/* Header */}
        <div className="flex items-start gap-4">
          {token.imageUrl ? (
            <Image
              src={token.imageUrl}
              alt={token.name}
              width={64}
              height={64}
              className="rounded-xl object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl font-bold text-muted">
              {token.symbol.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold">
                {token.name}{" "}
                <span className="text-muted">${token.symbol}</span>
              </h1>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  token.status === "PUMPSWAP"
                    ? "bg-accent/10 text-accent"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {token.status === "PUMPSWAP" ? "PumpSwap" : "Bonding Curve"}
              </span>
            </div>

            <CopyButton text={token.mintAddress} />
          </div>
        </div>

        {/* External Links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <ExternalLink
            href={`https://axiom.trade/meme/${token.mintAddress}?chain=sol`}
            label="axiom"
            icon="/icons/axiom.svg"
          />
          <ExternalLink
            href={`https://pump.fun/coin/${token.mintAddress}`}
            label="pump.fun"
            icon="/icons/pumpfun.png"
          />
          <ExternalLink
            href={`https://trade.padre.gg/trade/solana/${token.mintAddress}`}
            label="terminal"
            icon="/icons/padre.svg"
          />
          <ExternalLink
            href={`https://orbmarkets.io/token/${token.mintAddress}`}
            label="orb"
            icon="/icons/orb.svg"
          />
        </div>

        <LiveStats mintAddress={token.mintAddress} initialData={initialData} />
      </main>
    </>
  );
}

function ExternalLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent/40 hover:text-accent"
    >
      <img src={icon} alt="" className="h-4 w-4 rounded-sm" />
      {label}
    </a>
  );
}
