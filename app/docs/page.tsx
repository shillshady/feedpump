import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="font-heading text-3xl font-bold">docs</h1>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">what is feedpump?</h2>
          <p className="mt-3 leading-relaxed text-muted">
            feedpump is a token launch platform on Solana where 100% of trading
            fees are automatically used to buy back the token. No creator fees.
            No platform treasury. Every fee generated from trading goes directly
            into buying the token, creating constant buy pressure.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">how it works</h2>
          <div className="mt-4 space-y-4 text-muted">
            <div className="rounded-xl border border-white/5 bg-surface p-5">
              <h3 className="font-heading font-semibold text-text">
                1. launch
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                Create a token through feedpump in seconds. You provide the
                name, symbol, image, and an optional initial dev buy. The token
                is deployed on pump.fun&apos;s bonding curve.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-surface p-5">
              <h3 className="font-heading font-semibold text-text">
                2. trade
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                As people buy and sell the token, trading fees accumulate in a
                vault controlled by feedpump. These fees are never touched by
                creators or the platform.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-surface p-5">
              <h3 className="font-heading font-semibold text-text">
                3. feed
              </h3>
              <p className="mt-1 text-sm leading-relaxed">
                A background worker monitors fee vaults and automatically claims
                accumulated fees. Once claimed, the SOL is used to buy back the
                token on the open market. This happens continuously and
                autonomously.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">fee lifecycle</h2>
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <p>
              <span className="text-accent">fees generated</span> &rarr; fees
              accumulate in a PDA vault tied to the token
            </p>
            <p>
              <span className="text-accent">fees claimed</span> &rarr; the
              worker claims SOL from the vault using the creator wallet
            </p>
            <p>
              <span className="text-accent">buyback executed</span> &rarr; the
              claimed SOL is swapped for the token via PumpPortal
            </p>
            <p>
              <span className="text-accent">tokens held</span> &rarr; bought
              tokens stay in the creator wallet, adding permanent buy pressure
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">bonding curve vs pumpswap</h2>
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <p>
              Tokens start on pump.fun&apos;s bonding curve. Once the bonding
              curve completes, the token migrates to PumpSwap (Raydium AMM).
              feedpump handles both stages automatically — fees are claimed and
              bought back regardless of which pool the token is trading on.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">token page</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every token launched through feedpump gets a dedicated page showing
            real-time stats: total fees collected, total SOL bought back, buyback
            history with transaction links, and current status. You can also
            trade directly via links to axiom, pump.fun, padre terminal, and
            orb.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold">faq</h2>
          <div className="mt-4 space-y-5">
            <FaqItem
              q="who controls the creator wallet?"
              a="feedpump generates and manages the creator wallet. The private key is encrypted and stored securely. No human has access to withdraw funds — the wallet is only used to claim fees and execute buybacks."
            />
            <FaqItem
              q="can the dev rug?"
              a="No. There are no creator fees going to any personal wallet. All fees flow through a transparent on-chain vault and are used exclusively for token buybacks."
            />
            <FaqItem
              q="how often do buybacks happen?"
              a="The worker runs continuously, checking vaults and executing buybacks as soon as sufficient fees have accumulated. Frequency depends on trading volume."
            />
            <FaqItem
              q="what tokens can I launch?"
              a="Any SPL token deployed via pump.fun's bonding curve. You provide the name, symbol, and image — feedpump handles the rest."
            />
            <FaqItem
              q="is there a platform fee?"
              a="feedpump does not take any cut from trading fees. 100% of fees go to buying back the token."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-text">{q}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{a}</p>
    </div>
  );
}
