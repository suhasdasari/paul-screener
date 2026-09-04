export type Band = "best" | "good" | "ok" | "bad" | "na";
export type CheckStatus = "pass" | "fail" | "na";

export type PaulCheck = {
  id: string;
  label: string;
  value: number | null;
  display: string;
  threshold: string;
  status: CheckStatus;
  band: Band;
};

export type PaulScore = {
  passed: number;
  scored: number;
  pct: number;
  fit: "Excellent" | "Very Good" | "Moderate" | "Weak" | "Incomplete";
  checks: PaulCheck[];
};

export type StockMetrics = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  peg: number | null;
  bookValue: number | null;
  divYield: number | null;
  high52: number | null;
  low52: number | null;
  roe: number | null;
  roce: number | null;
  roa: number | null;
  debtEquity: number | null;
  insiderPct: number | null;
  pledged: number | null;
  salesGrowth: number | null;
  salesGrowthLabel: string;
  profitGrowth: number | null;
  profitGrowthLabel: string;
  source: string;
  notes: string[];
};

function fmtNum(v: number | null, digits = 1, suffix = ""): string {
  if (v === null || Number.isNaN(v)) return "—";
  const n = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(digits);
  return `${n}${suffix}`;
}

function gte(v: number | null, t: number): CheckStatus {
  if (v === null) return "na";
  return v >= t ? "pass" : "fail";
}
function lt(v: number | null, t: number): CheckStatus {
  if (v === null) return "na";
  return v < t ? "pass" : "fail";
}

function bandHigh(v: number | null, best: number, good: number, ok: number): Band {
  if (v === null) return "na";
  if (v >= best) return "best";
  if (v >= good) return "good";
  if (v >= ok) return "ok";
  return "bad";
}

export function scorePaul(m: StockMetrics): PaulScore {
  const roceVal = m.roce ?? m.roa;
  const roceLabel = m.roce !== null ? "ROCE > 20%" : "ROA > 20% (ROCE stand-in)";

  const widelyHeld = m.insiderPct !== null && m.insiderPct < 15;
  const insiderStatus: CheckStatus = widelyHeld
    ? "na"
    : gte(m.insiderPct, 50);

  const pegOk: CheckStatus =
    m.peg === null ? "na" : m.peg > 0 && m.peg < 2 ? "pass" : "fail";

  const peVsGrowth: CheckStatus =
    m.pe === null || m.profitGrowth === null || m.profitGrowth <= 0
      ? "na"
      : m.pe * 2 < m.profitGrowth
        ? "pass"
        : "fail";

  const checks: PaulCheck[] = [
    {
      id: "roe",
      label: "ROE > 20%",
      value: m.roe,
      display: fmtNum(m.roe, 1, "%"),
      threshold: "≥ 20%",
      status: gte(m.roe, 20),
      band: bandHigh(m.roe, 25, 20, 15),
    },
    {
      id: "roce",
      label: roceLabel,
      value: roceVal,
      display: fmtNum(roceVal, 1, "%"),
      threshold: "≥ 20%",
      status: gte(roceVal, 20),
      band: bandHigh(roceVal, 25, 20, 15),
    },
    {
      id: "de",
      label: "Debt / Equity < 1",
      value: m.debtEquity,
      display: fmtNum(m.debtEquity, 2),
      threshold: "< 1.0",
      status: lt(m.debtEquity, 1),
      band:
        m.debtEquity === null
          ? "na"
          : m.debtEquity <= 0.05
            ? "best"
            : m.debtEquity < 0.5
              ? "good"
              : m.debtEquity < 1
                ? "ok"
                : "bad",
    },
    {
      id: "insider",
      label: widelyHeld
        ? "Insider / promoter > 50% (widely held — skipped)"
        : "Insider / promoter holding > 50%",
      value: m.insiderPct,
      display: fmtNum(m.insiderPct, 1, "%"),
      threshold: "> 50%",
      status: insiderStatus,
      band: widelyHeld
        ? "na"
        : m.insiderPct === null
          ? "na"
          : m.insiderPct >= 50
            ? "good"
            : m.insiderPct >= 25
              ? "ok"
              : "bad",
    },
    {
      id: "pledge",
      label: "Pledge < 10%",
      value: m.pledged,
      display: fmtNum(m.pledged, 1, "%"),
      threshold: "< 10%",
      status: lt(m.pledged, 10),
      band:
        m.pledged === null
          ? "na"
          : m.pledged === 0
            ? "best"
            : m.pledged < 10
              ? "ok"
              : "bad",
    },
    {
      id: "sales",
      label: `${m.salesGrowthLabel} > 10%`,
      value: m.salesGrowth,
      display: fmtNum(m.salesGrowth, 1, "%"),
      threshold: "> 10%",
      status: gte(m.salesGrowth, 10),
      band: bandHigh(m.salesGrowth, 15, 10, 5),
    },
    {
      id: "profit",
      label: `${m.profitGrowthLabel} > 12%`,
      value: m.profitGrowth,
      display: fmtNum(m.profitGrowth, 1, "%"),
      threshold: "> 12%",
      status: gte(m.profitGrowth, 12),
      band: bandHigh(m.profitGrowth, 20, 12, 8),
    },
    {
      id: "peg",
      label: "PEG < 2 (and > 0)",
      value: m.peg,
      display: fmtNum(m.peg, 2),
      threshold: "< 2",
      status: pegOk,
      band:
        m.peg === null
          ? "na"
          : m.peg > 0 && m.peg < 1
            ? "best"
            : m.peg > 0 && m.peg < 2
              ? "good"
              : "bad",
    },
    {
      id: "peGrowth",
      label: "PE × 2 < profit growth",
      value: m.pe,
      display: m.pe === null ? "—" : `PE ${fmtNum(m.pe, 1)}`,
      threshold: m.profitGrowth === null ? "growth needed" : `< ${fmtNum(m.profitGrowth / 2, 1)}`,
      status: peVsGrowth,
      band: peVsGrowth === "pass" ? "best" : peVsGrowth === "fail" ? "bad" : "na",
    },
  ];

  const scored = checks.filter((c) => c.status !== "na").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const pct = scored ? Math.round((100 * passed) / scored) : 0;
  let fit: PaulScore["fit"] = "Incomplete";
  if (scored >= 5) {
    if (pct >= 80) fit = "Excellent";
    else if (pct >= 60) fit = "Very Good";
    else if (pct >= 45) fit = "Moderate";
    else fit = "Weak";
  }

  return { passed, scored, pct, fit, checks };
}

export function formatCap(v: number | null, currency: string): string {
  if (v === null) return "—";
  const cr = currency === "INR" ? v / 1e7 : v / 1e9;
  if (currency === "INR") {
    if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)} L Cr`;
    return `₹${cr >= 100 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return String(Math.round(v));
}

export function formatPrice(v: number | null, currency: string): string {
  if (v === null) return "—";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  const d = v >= 100 ? 2 : v >= 10 ? 2 : 3;
  return `${sym}${v.toFixed(d)}`;
}
