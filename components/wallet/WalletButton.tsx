"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useRef, useState } from "react";

export default function WalletButton() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalanceSol(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/balance?wallet=${publicKey.toBase58()}`);
        const data = await res.json();
        if (!cancelled && data.lamports != null) {
          setBalanceSol(data.lamports / LAMPORTS_PER_SOL);
        }
      } catch {
        if (!cancelled) setBalanceSol(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicKey, connected]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent/40 hover:text-accent"
      >
        connect wallet
      </button>
    );
  }

  const addr = publicKey.toBase58();
  const short = `${addr.slice(0, 4)}..${addr.slice(-4)}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:border-accent/40"
      >
        {wallet?.adapter.icon && (
          <img
            src={wallet.adapter.icon}
            alt=""
            className="h-4 w-4 rounded-sm"
          />
        )}
        <span className="font-mono text-muted">{short}</span>
        {balanceSol !== null && (
          <span className="font-mono text-accent">
            {balanceSol.toFixed(3)} SOL
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-surface shadow-xl">
          <button
            onClick={() => {
              setVisible(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-text transition-colors hover:bg-white/5"
          >
            change wallet
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(addr);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-text transition-colors hover:bg-white/5"
          >
            copy address
          </button>
          <button
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/5"
          >
            disconnect
          </button>
        </div>
      )}
    </div>
  );
}
