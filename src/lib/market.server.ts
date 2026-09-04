import { Agent, fetch as undiciFetch } from "undici";
import type { StockMetrics } from "./paul";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const httpAgent = new Agent({
  maxHeaderSize: 1024 * 1024,
  headersTimeout: 25_000,
  bodyTimeout: 25_000,
  connect: { timeout: 12_000 },
});


type CacheEntry<T> = { at: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 12 * 60 * 1000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value as T);
  return fn().then((value) => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
}

async function fetchText(url: string, timeoutMs = 18000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await undiciFetch(url, {
      signal: ctrl.signal,
      dispatcher: httpAgent,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
    return await res.text();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Timed out reading market data");
    const cause = e instanceof Error && "cause" in e && e.cause instanceof Error ? e.cause.message : "";
    const base = e instanceof Error ? e.message : "Lookup failed";
    if (base === "fetch failed" || cause.includes("HEADERS_OVERFLOW")) {
      throw new Error("Market data source blocked the request. Try again in a moment.");
    }
    throw e instanceof Error ? e : new Error(base);
  } finally {
    clearTimeout(t);
  }
}


function rawNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const r = (v as { raw: unknown }).raw;
    if (typeof r === "number" && Number.isFinite(r)) return r;
  }
  return null;
}

function pct100(v: number | null): number | null {
  if (v === null) return null;
  return v * 100;
}

function cagr(start: number | null, end: number | null, years: number): number | null {
  if (start === null || end === null || start <= 0 || end <= 0 || years <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export type SearchHit = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

export async function searchStocks(q: string): Promise<SearchHit[]> {
  const query = q.trim();
  if (query.length < 1) return [];
  return cached(`search:${query.toLowerCase()}`, async () => {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
    const json = JSON.parse(await fetchText(url)) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        quoteType?: string;
      }>;
    };
    return (json.quotes ?? [])
      .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF" || !x.quoteType))
      .slice(0, 10)
      .map((x) => ({
        symbol: x.symbol as string,
        name: x.longname || x.shortname || (x.symbol as string),
        exchange: x.exchDisp || "",
        type: x.quoteType || "EQUITY",
      }));
  });
}

type YahooYear = { date?: number; revenue?: unknown; earnings?: unknown };

function growthFromYears(years: YahooYear[], field: "revenue" | "earnings"): {
  value: number | null;
  label: string;
} {
  const rows = years
    .map((y) => ({ date: y.date ?? 0, v: rawNum(y[field]) }))
    .filter((r) => r.v !== null) as { date: number; v: number }[];
  if (rows.length >= 3) {
    const start = rows[0];
    const end = rows[rows.length - 1];
    const yrs = Math.max(1, rows.length - 1);
    return {
      value: cagr(start.v, end.v, yrs),
      label: `${yrs}Y ${field === "revenue" ? "sales" : "profit"} CAGR`,
    };
  }
  if (rows.length === 2) {
    return {
      value: cagr(rows[0].v, rows[1].v, 1),
      label: `1Y ${field === "revenue" ? "sales" : "profit"} growth`,
    };
  }
  return { value: null, label: field === "revenue" ? "Sales growth" : "Profit growth" };
}

async function scrapeYahoo(symbol: string): Promise<StockMetrics> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/key-statistics`;
  const html = await fetchText(url, 18000);
  const scripts = html.split(/<script[^>]*>/).slice(1).map((s) => s.split("</script>")[0] ?? "");
  const blob = scripts.find((s) => s.includes("quoteSummary") && s.includes("financialData"));
  if (!blob) throw new Error("Yahoo did not return fundamentals for this symbol.");
  const wrapper = JSON.parse(blob) as { body?: string };
  const inner = JSON.parse(wrapper.body ?? "{}") as {
    quoteSummary?: { result?: Array<Record<string, unknown>> };
  };
  const qs = inner.quoteSummary?.result?.[0];
  if (!qs) throw new Error("No quote summary.");

  const fd = (qs.financialData ?? {}) as Record<string, unknown>;
  const ks = (qs.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const sd = (qs.summaryDetail ?? {}) as Record<string, unknown>;
  const pr = (qs.price ?? {}) as Record<string, unknown>;
  const eg = (qs.earningsGaap ?? {}) as { financialsChart?: { yearly?: YahooYear[] } };
  const years = eg.financialsChart?.yearly ?? [];

  const sales = growthFromYears(years, "revenue");
  const profit = growthFromYears(years, "earnings");

  const yoySales = pct100(rawNum(fd.revenueGrowth));
  const yoyProfit = pct100(rawNum(fd.earningsGrowth));

  const pe = rawNum(sd.trailingPE) ?? rawNum(ks.trailingPE) ?? rawNum(ks.forwardPE);
  let peg = rawNum(ks.pegRatio);
  const profitGrowth = profit.value ?? yoyProfit;
  if ((peg === null || peg === 0) && pe !== null && profitGrowth && profitGrowth > 0) {
    peg = pe / profitGrowth;
  }

  const deYahoo = rawNum(fd.debtToEquity);
  const debtEquity = deYahoo === null ? null : deYahoo / 100;

  const notes: string[] = ["Yahoo Finance"];

  return {
    symbol: String(pr.symbol || symbol),
    name: String(pr.longName || pr.shortName || symbol),
    exchange: String(pr.exchangeName || pr.fullExchangeName || ""),
    currency: String(pr.currency || "USD"),
    price: rawNum(pr.regularMarketPrice) ?? rawNum(fd.currentPrice),
    marketCap: rawNum(pr.marketCap) ?? rawNum(sd.marketCap),
    pe,
    peg,
    bookValue: rawNum(ks.bookValue),
    divYield: pct100(rawNum(sd.dividendYield)),
    high52: rawNum(sd.fiftyTwoWeekHigh) ?? rawNum(pr.fiftyTwoWeekHigh),
    low52: rawNum(sd.fiftyTwoWeekLow) ?? rawNum(pr.fiftyTwoWeekLow),
    roe: pct100(rawNum(fd.returnOnEquity)),
    roce: null,
    roa: pct100(rawNum(fd.returnOnAssets)),
    debtEquity,
    insiderPct: pct100(rawNum(ks.heldPercentInsiders)),
    pledged: null,
    salesGrowth: sales.value ?? yoySales,
    salesGrowthLabel: sales.value !== null ? sales.label : "Sales growth (YoY)",
    profitGrowth: profit.value ?? yoyProfit,
    profitGrowthLabel: profit.value !== null ? profit.label : "Profit growth (YoY)",
    source: "Yahoo Finance",
    notes,
  };
}

function toNum(text: string | undefined): number | null {
  if (!text) return null;
  const t = text.replace(/[,₹%\s]/g, "").replace(/Cr\.?/gi, "");
  if (!t || t === "-" || t === "—") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseGrowthBlock(html: string, heading: string): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const idx = html.search(new RegExp(heading, "i"));
  if (idx < 0) return out;
  const slice = html.slice(idx, idx + 1800).replace(/<[^>]+>/g, " ");
  for (const key of ["10 Years", "5 Years", "3 Years", "TTM", "Last Year"]) {
    const m = slice.match(new RegExp(`${key}\\s*:?\\s*(-?\\d+(?:\\.\\d+)?)\\s*%?`, "i"));
    if (m) out[key] = toNum(m[1]);
  }
  return out;
}

function lastShp(html: string, label: string): number | null {
  const m = html.match(new RegExp(`id="quarterly-shp"[\\s\\S]*?<table[\\s\\S]*?</table>`, "i"));
  if (!m) return null;
  const rows = m[0].split(/<tr/i);
  for (const row of rows) {
    if (!row.toLowerCase().includes(label.toLowerCase())) continue;
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );
    for (let i = cells.length - 1; i >= 1; i--) {
      const n = toNum(cells[i]);
      if (n !== null) return n;
    }
  }
  return null;
}

function lastBalance(html: string, label: string): number | null {
  const m = html.match(/id="balance-sheet"[\s\S]*?<table[\s\S]*?<\/table>/i);
  if (!m) return null;
  const rows = m[0].split(/<tr/i);
  for (const row of rows) {
    const plain = row.replace(/<[^>]+>/g, " ");
    if (!plain.toLowerCase().includes(label.toLowerCase())) continue;
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").trim(),
    );
    for (let i = cells.length - 1; i >= 1; i--) {
      const n = toNum(cells[i]);
      if (n !== null) return n;
    }
  }
  return null;
}

async function scrapeScreener(symbol: string): Promise<Partial<StockMetrics> | null> {
  const base = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, "");
  try {
    const hits = JSON.parse(
      await fetchText(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(base)}`, 10000),
    ) as Array<{ url?: string; name?: string }>;
    const urlPath = hits[0]?.url;
    if (!urlPath) return null;
    const page = await fetchText(`https://www.screener.in${urlPath}`, 14000);
    const top: Record<string, number | null> = {};
    const block = page.match(/id="top-ratios"([\s\S]*?)<\/ul>/i)?.[1] ?? "";
    const lis = block.split(/<li/i).slice(1);
    for (const li of lis) {
      const name = li.match(/class="name"[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim();
      const num = li.match(/class="number"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
      if (name) top[name] = toNum(num);
    }
    const sales = parseGrowthBlock(page, "Compounded Sales Growth");
    const profit = parseGrowthBlock(page, "Compounded Profit Growth");
    const roeTbl = parseGrowthBlock(page, "Return on Equity");
    const equity = lastBalance(page, "Equity Capital");
    const reserves = lastBalance(page, "Reserves");
    const borrowings = lastBalance(page, "Borrowings");
    const networth = (equity ?? 0) + (reserves ?? 0);
    const de =
      borrowings !== null && networth > 0 ? Math.round((borrowings / networth) * 100) / 100 : null;
    const promoter = lastShp(page, "Promoters");
    const pledgedM = page.match(/Pledged[^%]{0,40}?([0-9.]+)\s*%/i);
    const pledged = pledgedM ? toNum(pledgedM[1]) : 0;
    const pe = top["Stock P/E"];
    const profit3 = profit["3 Years"];
    let peg: number | null = null;
    if (pe !== null && profit3 && profit3 > 0) peg = Math.round((pe / profit3) * 100) / 100;

    return {
      roe: top["ROE"] ?? roeTbl["Last Year"] ?? null,
      roce: top["ROCE"] ?? null,
      debtEquity: de,
      insiderPct: promoter,
      pledged,
      salesGrowth: sales["3 Years"] ?? sales["5 Years"] ?? null,
      salesGrowthLabel: "3Y sales CAGR",
      profitGrowth: profit3 ?? profit["5 Years"] ?? null,
      profitGrowthLabel: "3Y profit CAGR",
      peg,
      pe: pe ?? null,
      notes: ["Screener.in (India)"],
    };
  } catch {
    return null;
  }
}

function isIndia(symbol: string, exchange: string): boolean {
  return /\.(NS|BO)$/i.test(symbol) || /NSE|BSE|National Stock/i.test(exchange);
}

export async function analyzeSymbol(symbol: string): Promise<StockMetrics> {
  const sym = symbol.trim().toUpperCase();
  return cached(`analyze:${sym}`, async () => {
    const yahoo = await scrapeYahoo(sym);
    if (isIndia(sym, yahoo.exchange)) {
      const extra = await scrapeScreener(sym);
      if (extra) {
        const merged: StockMetrics = {
          ...yahoo,
          roe: extra.roe ?? yahoo.roe,
          roce: extra.roce ?? yahoo.roce,
          debtEquity: extra.debtEquity ?? yahoo.debtEquity,
          insiderPct: extra.insiderPct ?? yahoo.insiderPct,
          pledged: extra.pledged ?? yahoo.pledged,
          salesGrowth: extra.salesGrowth ?? yahoo.salesGrowth,
          salesGrowthLabel: extra.salesGrowth != null ? extra.salesGrowthLabel! : yahoo.salesGrowthLabel,
          profitGrowth: extra.profitGrowth ?? yahoo.profitGrowth,
          profitGrowthLabel: extra.profitGrowth != null ? extra.profitGrowthLabel! : yahoo.profitGrowthLabel,
          peg: extra.peg ?? yahoo.peg,
          pe: extra.pe ?? yahoo.pe,
          source: "Yahoo Finance + Screener.in",
          notes: [...yahoo.notes, ...(extra.notes ?? [])],
        };
        return merged;
      }
    }
    return yahoo;
  });
}
