import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="font-heading text-3xl font-bold">terms of use</h1>
        <p className="mt-2 text-sm text-muted">last updated: march 2025</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
          <Section title="1. acceptance">
            By accessing or using feedpump.fun (&quot;the Platform&quot;), you
            agree to be bound by these terms. If you do not agree, do not use
            the Platform.
          </Section>

          <Section title="2. eligibility">
            You must be at least 18 years old and legally permitted to use
            decentralized finance protocols in your jurisdiction. The Platform
            does not verify identity or enforce geographic restrictions, but you
            are solely responsible for compliance with your local laws.
          </Section>

          <Section title="3. nature of the platform">
            feedpump is a token launch and automated buyback platform on the
            Solana blockchain. The Platform facilitates token creation, fee
            collection, and automated buyback execution. feedpump does not
            provide financial advice, investment recommendations, or custodial
            services.
          </Section>

          <Section title="4. no investment advice">
            Nothing on this Platform constitutes financial, legal, or tax
            advice. Tokens launched on feedpump are highly speculative and may
            lose all value. You should not invest more than you can afford to
            lose. Do your own research before participating.
          </Section>

          <Section title="5. risks">
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Tokens may lose some or all of their value at any time.
              </li>
              <li>
                Smart contracts may contain bugs or vulnerabilities.
              </li>
              <li>
                Blockchain transactions are irreversible once confirmed.
              </li>
              <li>
                Network congestion, RPC failures, or third-party service
                outages may delay or prevent buyback execution.
              </li>
              <li>
                The Platform depends on third-party infrastructure (Solana,
                pump.fun, PumpPortal, Helius) that may change or become
                unavailable.
              </li>
            </ul>
          </Section>

          <Section title="6. automated buybacks">
            The Platform automatically uses 100% of collected trading fees to
            buy back tokens. While the system is designed to operate
            continuously, feedpump does not guarantee the timing, frequency, or
            execution price of any buyback. Buybacks are executed on a
            best-effort basis and may be delayed or fail due to market
            conditions or technical issues.
          </Section>

          <Section title="7. creator wallets">
            Creator wallets are generated and managed by the Platform. Private
            keys are encrypted at rest. The Platform uses these wallets solely
            to claim fees and execute buybacks. feedpump does not use creator
            wallet funds for any other purpose.
          </Section>

          <Section title="8. no warranties">
            The Platform is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied.
            feedpump does not warrant that the service will be uninterrupted,
            error-free, or secure.
          </Section>

          <Section title="9. limitation of liability">
            To the maximum extent permitted by law, feedpump and its operators
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including loss of funds, arising
            from your use of the Platform.
          </Section>

          <Section title="10. prohibited use">
            You agree not to use the Platform for any unlawful purpose,
            including money laundering, terrorist financing, market
            manipulation, or any activity that violates applicable laws or
            regulations.
          </Section>

          <Section title="11. modifications">
            feedpump reserves the right to modify these terms at any time.
            Continued use of the Platform after changes constitutes acceptance
            of the updated terms.
          </Section>

          <Section title="12. contact">
            For questions about these terms, reach out via{" "}
            <a
              href="https://x.com/feedpumpfun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              @feedpumpfun on X
            </a>
            .
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-base font-bold text-text">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
