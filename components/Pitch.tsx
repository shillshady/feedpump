export default function Pitch() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          the trenches deserve better
        </h2>

        <div className="mt-8 space-y-4 text-lg leading-relaxed text-muted">
          <p>
            every other platform takes a cut. creator fees go to the dev&apos;s
            wallet. platform fees go to the treasury. your volume builds their
            bags, not yours.
          </p>
          <p>
            feedpump is different.{" "}
            <span className="text-accent">
              100% of every fee is routed back into buying the token.
            </span>{" "}
            no wallets to drain. no treasuries to fill. just pure, automated
            buy pressure.
          </p>
        </div>

        <p className="mt-10 font-heading text-2xl font-bold text-text">
          your volume is your floor.
        </p>
      </div>
    </section>
  );
}
