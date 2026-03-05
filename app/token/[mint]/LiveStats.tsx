"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface Buyback {
  amount: string;
  tokensReceived: string | null;
  tx: string;
  status: string;
  at: string;
}

interface FeeClaim {
  amount: string;
  tx: string;
  status: string;
  at: string;
}

interface TokenData {
  totalFeesCollected: string;
  totalBuyback: string;
  buybacks: Buyback[];
  feeClaims: FeeClaim[];
}

interface LiveStatsProps {
  mintAddress: string;
  initialData: TokenData;
}

export default function LiveStats({ mintAddress, initialData }: LiveStatsProps) {
  const [data, setData] = useState<TokenData>(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tokens/${mintAddress}`);
        if (!res.ok) return;
        const json = await res.json();
        setData({
          totalFeesCollected: json.totalFeesCollected,
          totalBuyback: json.totalBuyback,
          buybacks: json.buybacks,
          feeClaims: json.feeClaims,
        });
      } catch {
        // silently retry next interval
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [mintAddress]);

  const totalFeesSol = Number(data.totalFeesCollected) / LAMPORTS_PER_SOL;
  const totalBuybackSol = Number(data.totalBuyback) / LAMPORTS_PER_SOL;

  return (
    <>
      {/* Stats Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="fees collected" value={`${totalFeesSol.toFixed(4)} SOL`} />
        <StatCard label="bought back" value={`${totalBuybackSol.toFixed(4)} SOL`} />
        <StatCard label="total buybacks" value={String(data.buybacks.length)} />
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
              {data.buybacks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">
                    no buybacks yet — fees will auto-buy once they accumulate
                  </td>
                </tr>
              ) : (
                data.buybacks.map((b) => (
                  <tr key={b.tx} className="border-b border-white/5">
                    <td className="py-3 font-mono text-accent">
                      {(Number(b.amount) / LAMPORTS_PER_SOL).toFixed(6)}
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
                        href={`https://solscan.io/tx/${b.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-muted hover:text-accent"
                      >
                        {b.tx.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-3 text-muted">
                      {new Date(b.at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
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
