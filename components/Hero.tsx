"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function SolCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setCount(data.totalBuybackSol ?? 0);
        }
      } catch {
        // Silently fail — counter stays at 0
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-5 py-2.5">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      <span className="font-mono text-sm text-accent">
        {count.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        SOL
      </span>
      <span className="text-sm text-muted">recycled back into tokens</span>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,136,0.06)_0%,_transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          stop feeding devs.
          <br />
          <span className="text-accent">feed the chart.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted sm:text-xl">
          every single fee goes back into buying your token. no creator fees. no
          dev cuts. just pump.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/launch"
            className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-bg transition-colors hover:bg-accent-hover"
          >
            launch a token
          </Link>
        </div>

        <div className="mt-10">
          <SolCounter />
        </div>
      </div>
    </section>
  );
}
