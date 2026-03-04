const rows = [
  {
    label: "creator fees",
    other: "dev's wallet",
    feedpump: "back into the chart",
  },
  {
    label: "platform fees",
    other: "platform treasury",
    feedpump: "back into the chart",
  },
  {
    label: "who wins",
    other: "devs & platforms",
    feedpump: "everyone",
  },
];

export default function ComparisonTable() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-center text-3xl font-bold tracking-tight sm:text-4xl">
          spot the difference
        </h2>

        <div className="mt-12 overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-surface">
                <th className="px-6 py-4 font-heading text-xs font-semibold uppercase tracking-wider text-muted">
                  &nbsp;
                </th>
                <th className="px-6 py-4 font-heading text-xs font-semibold uppercase tracking-wider text-muted">
                  other platforms
                </th>
                <th className="px-6 py-4 font-heading text-xs font-semibold uppercase tracking-wider text-accent">
                  feedpump
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={
                    i < rows.length - 1 ? "border-b border-white/5" : ""
                  }
                >
                  <td className="px-6 py-4 font-medium text-text">
                    {row.label}
                  </td>
                  <td className="px-6 py-4 text-muted">{row.other}</td>
                  <td className="px-6 py-4 font-semibold text-accent">
                    {row.feedpump}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
