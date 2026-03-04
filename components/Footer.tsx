import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="font-heading text-sm font-bold tracking-tight">
          <span className="text-text">feed</span>
          <span className="text-accent">pump</span>
          <span className="text-muted">.fun</span>
        </span>

        <div className="flex items-center gap-6 text-sm text-muted">
          <Link
            href="https://x.com/feedpumpfun"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-text"
          >
            x / twitter
          </Link>
          <Link href="/docs" className="transition-colors hover:text-text">
            docs
          </Link>
          <Link href="/terms" className="transition-colors hover:text-text">
            terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
