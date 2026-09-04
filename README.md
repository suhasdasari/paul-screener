# Paul Screener

Score any listed stock against Prasenjit Paul’s Quick Formula from *How To Avoid Loss and Earn Consistently in the Stock Market*.

Search India (NSE/BSE), US, Europe, Japan, and other Yahoo-listed names. India names also pull extra ratios from Screener.in.

Sign in with Google or X to save a watchlist to your account.

## What it checks

- ROE > 20%
- ROCE > 20% (ROA as stand-in when ROCE is missing)
- Debt / Equity < 1
- Insider / promoter holding > 50% (skipped for widely held names)
- Pledge < 10% (India)
- Sales growth > 10%
- Profit growth > 12%
- PEG < 2
- PE × 2 < profit growth

## Run

```bash
npm install
npm run dev
```

Not investment advice.
