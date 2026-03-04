import Link from "next/link";

export default function BottomCTA() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          no more rugs. no more drain.
          <br />
          <span className="text-accent">just feed.</span>
        </h2>

        <div className="mt-8">
          <Link
            href="https://pump.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-accent px-8 py-3 text-base font-semibold text-bg transition-colors hover:bg-accent-hover"
          >
            launch a token
          </Link>
        </div>
      </div>
    </section>
  );
}
