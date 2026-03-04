export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Image from "next/image";
import Link from "next/link";
import CopyButton from "./CopyButton";

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

  const totalFeesSol = Number(token.totalFeesCollectedLamports) / LAMPORTS_PER_SOL;
  const totalBuybackSol = Number(token.totalBuybackLamports) / LAMPORTS_PER_SOL;

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

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="fees collected"
            value={`${totalFeesSol.toFixed(4)} SOL`}
          />
          <StatCard
            label="bought back"
            value={`${totalBuybackSol.toFixed(4)} SOL`}
          />
          <StatCard
            label="total buybacks"
            value={String(token.buybacks.length)}
          />
        </div>

        {/* Buyback History */}
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">buyback history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted">
                  <th className="pb-3 font-medium">amount (SOL)</th>
                  <th className="pb-3 font-medium">status</th>
                  <th className="pb-3 font-medium">transaction</th>
                  <th className="pb-3 font-medium">time</th>
                </tr>
              </thead>
              <tbody>
                {token.buybacks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted">
                      no buybacks yet — fees will auto-buy once they accumulate
                    </td>
                  </tr>
                ) : (
                  token.buybacks.map((b) => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="py-3 font-mono text-accent">
                        {(Number(b.amountLamports) / LAMPORTS_PER_SOL).toFixed(6)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            b.status === "CONFIRMED"
                              ? "bg-green-500/10 text-green-400"
                              : b.status === "FAILED"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {b.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`https://solscan.io/tx/${b.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-muted hover:text-accent"
                        >
                          {b.txSignature.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="py-3 text-muted">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-accent">{value}</p>
    </div>
  );
}
