"use client";

import Link from "next/link";
import Image from "next/image";
import WalletButton from "@/components/wallet/WalletButton";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-bg/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-8 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="feedpump logo" width={32} height={32} />
          <span className="font-heading text-lg font-bold tracking-tight">
            <span className="text-text">feed</span>
            <span className="text-accent">pump</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent/40 hover:text-accent"
          >
            explore
          </Link>
          <Link
            href="/launch"
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-hover"
          >
            launch a token
          </Link>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
