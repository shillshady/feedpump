const steps = [
  {
    number: "01",
    title: "launch",
    description: "create your token in seconds",
  },
  {
    number: "02",
    title: "trade",
    description: "fees are generated on every buy and sell",
  },
  {
    number: "03",
    title: "feed",
    description: "100% of fees auto-buy the token. every time. forever.",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-3xl font-bold tracking-tight sm:text-4xl">
          how it works
        </h2>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group rounded-xl border border-white/5 bg-surface p-8 transition-colors hover:border-accent/20"
            >
              <span className="font-mono text-sm text-accent">
                {step.number}
              </span>
              <h3 className="mt-3 font-heading text-xl font-bold">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
