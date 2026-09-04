import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Paul Screener" },
      {
        name: "description",
        content:
          "Paul Screener applies the stock-quality criteria from Prasenjit Paul’s book How To Avoid Loss and Earn Consistently in The Stock Market.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">
        Source of the filters
      </p>
      <h1 className="mt-2 font-headline text-4xl leading-tight tracking-tight text-fg">
        About this screener
      </h1>

      <div className="mt-8 space-y-5 text-pretty text-base leading-relaxed text-muted">
        <p className="text-fg">
          This screener is based on the criteria stated by Prasenjit Paul in his
          book{" "}
          <cite className="font-headline not-italic text-fg">
            How To Avoid Loss and Earn Consistently in The Stock Market
          </cite>
          .
        </p>
        <p>
          Paul argues that quality comes first and valuation second. The screens
          in the book — especially the “Quick Formula” — ask whether a business
          earns well on capital, stays lightly leveraged, is run by aligned
          owners, and is not priced far ahead of its growth.
        </p>
        <p>
          Paul Screener is an independent study aid. It is not affiliated with
          Prasenjit Paul, the publisher, or any brokerage. It does not copy the
          book. It only applies publicly described numerical filters to live
          market data.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-headline text-2xl tracking-tight text-fg">
          What the book asks you to check
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-fg">ROE and ROCE above 20%.</span> Best names
            sit at 25% or more, with consistent history.
          </li>
          <li>
            <span className="text-fg">Debt / equity below 1</span>, preferably
            near zero.
          </li>
          <li>
            <span className="text-fg">Promoter or insider holding above 50%</span>
            , with pledged shares below 10% (ideally none). Widely held
            developed-market names skip the promoter test.
          </li>
          <li>
            <span className="text-fg">Sales growing faster than 10%</span> and{" "}
            <span className="text-fg">profit faster than 12%</span> over three
            years.
          </li>
          <li>
            <span className="text-fg">PEG below 2</span> (best below 1) and{" "}
            <span className="text-fg">PE × 2 still below profit growth</span>.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-sm leading-relaxed text-subtle">
        Live prices and ratios come from Yahoo Finance, with extra India ratios
        from Screener.in when the ticker is NSE or BSE. Missing fields are
        marked N/A rather than guessed. This is not investment advice. Read the
        book, then do your own work.
      </p>
    </main>
  );
}
