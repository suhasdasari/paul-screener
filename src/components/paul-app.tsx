import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search, BookmarkPlus } from "lucide-react";
import { analyzeStockFn, searchStocksFn, type AnalyzeResult, type SearchHit } from "@/lib/stock-api";
import { formatCap, formatPrice, type Band } from "@/lib/paul";
import {
  DEFAULT_WATCHLIST,
  loadWatchlist,
  saveWatchlist,
  type WatchItem,
} from "@/lib/watchlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Region = "india" | "us" | "world" | "all";

const BAND_LABEL: Record<Band, string> = {
  best: "BEST",
  good: "GOOD",
  ok: "OK",
  bad: "WEAK",
  na: "N/A",
};

export function PaulApp({ initialSymbol }: { initialSymbol?: string }) {
  const navigate = useNavigate({ from: "/" });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [openHits, setOpenHits] = useState(false);
  const [region, setRegion] = useState<Region>("all");
  const [watch, setWatch] = useState<WatchItem[]>(DEFAULT_WATCHLIST);
  const [active, setActive] = useState<string | undefined>(initialSymbol);
  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setWatch(loadWatchlist());
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpenHits(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!initialSymbol) return;
    void loadSymbol(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  async function loadSymbol(symbol: string) {
    setActive(symbol);
    setOpenHits(false);
    setQuery("");
    setHits([]);
    setLoading(true);
    setError(null);
    void navigate({ search: { symbol } });
    try {
      const res = await analyzeStockFn({ data: { symbol } });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not read this stock.");
    } finally {
      setLoading(false);
    }
  }

  function onQuery(v: string) {
    setQuery(v);
    window.clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setHits([]);
      setOpenHits(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await searchStocksFn({ data: { q: v } });
        setHits(res);
        setOpenHits(true);
      } catch {
        setHits([]);
      }
    }, 220);
  }

  function addToWatch(hit: SearchHit) {
    const next = [
      { symbol: hit.symbol, name: hit.name, region: "world" as const },
      ...watch.filter((w) => w.symbol !== hit.symbol),
    ].slice(0, 40);
    setWatch(next);
    saveWatchlist(next);
  }

  const chips = useMemo(() => {
    if (region === "all") return watch;
    return watch.filter((w) => w.region === region);
  }, [watch, region]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">
          Quality first · valuation second
        </p>
        <h1 className="mt-2 font-headline text-4xl leading-tight tracking-tight text-fg sm:text-5xl">
          Paul Screener
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
          Search any listed stock — India, US, Europe, Japan. Live numbers from
          Yahoo Finance, with Screener.in layered on NSE/BSE names. Scored on
          Prasenjit Paul's Quick Formula.
        </p>
      </header>

      <div className="relative mb-4" ref={boxRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => hits.length && setOpenHits(true)}
              placeholder="Search AAPL, IRCTC, Toyota, Nestlé…"
              className="pl-10"
              aria-label="Search stocks"
            />
          </div>
          <Button
            type="button"
            onClick={() => query && loadSymbol(query)}
            className="shrink-0"
          >
            Read Paul
          </Button>
        </div>
        {openHits && hits.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface">
            {hits.map((h) => (
              <li key={h.symbol} className="flex items-stretch border-b border-border last:border-0">
                <button
                  type="button"
                  className="flex min-h-11 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-2"
                  onClick={() => void loadSymbol(h.symbol)}
                >
                  <span className="truncate text-sm text-fg">{h.name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                    {h.symbol} · {h.exchange}
                  </span>
                </button>
                <button
                  type="button"
                  className="grid w-11 place-items-center text-muted hover:bg-surface-2 hover:text-fg"
                  aria-label={`Save ${h.symbol}`}
                  onClick={() => addToWatch(h)}
                >
                  <BookmarkPlus className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "india", "us", "world"] as const).map((r) => (
          <Button
            key={r}
            type="button"
            size="sm"
            variant={region === r ? "default" : "outline"}
            onClick={() => setRegion(r)}
          >
            {r === "all" ? "All" : r === "india" ? "India" : r === "us" ? "US" : "World"}
          </Button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Button
            key={c.symbol}
            type="button"
            size="chip"
            variant={active === c.symbol ? "default" : "outline"}
            onClick={() => void loadSymbol(c.symbol)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <ScorePanel data={data} loading={loading} error={error} />
        <ChecksPanel data={data} loading={loading} />
      </section>
    </main>
  );
}

function ScorePanel({
  data,
  loading,
  error,
}: {
  data: AnalyzeResult | null;
  loading: boolean;
  error: string | null;
}) {
  const pct = data?.paul.pct ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-fail">{error}</p>
        ) : !data ? (
          <div className="py-8 text-center">
            <p className="font-headline text-2xl text-fg">Pick a stock</p>
            <p className="mt-2 text-sm text-muted">Search globally or tap a name.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">{data.exchange}</p>
            <h2 className="mt-1 font-headline text-2xl leading-snug text-fg">{data.name}</h2>
            <p className="mt-1 font-mono text-sm text-muted tabular-nums">{data.symbol}</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="font-headline text-5xl leading-none tracking-tight text-primary tabular-nums">
                  {pct}%
                </p>
                <p className="mt-2 font-headline text-xl text-fg">{data.paul.fit}</p>
              </div>
              <ScoreRing pct={pct} />
            </div>
            <p className="mt-4 text-sm text-muted">
              {data.paul.passed}/{data.paul.scored} filters · {formatPrice(data.price, data.currency)} · PE{" "}
              <span className="tabular-nums">{data.pe?.toFixed(1) ?? "—"}</span>
            </p>
            <p className="mt-1 text-xs text-subtle">
              {formatCap(data.marketCap, data.currency)} · {data.source}
            </p>
          </>
        )}
      </div>
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-headline text-lg text-fg">What Paul looks at first</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ROE and leverage tell you if the business is strong. Insider holding and
          pledge tell you if management is aligned. Sales and profit growth tell
          you if it compounds. PEG and PE versus growth tell you if you are
          overpaying.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>
            <span className="text-fg">Best</span> — ROE/ROCE ≥ 25% · D/E ≈ 0 · pledge 0 · PEG {"<"} 1
          </li>
          <li>
            <span className="text-fg">Good</span> — ROE/ROCE ≥ 20% · D/E {"<"} 0.5 · PEG {"<"} 2 · sales 3Y ≥ 10%
          </li>
          <li>
            <span className="text-fg">Weak</span> — ROE {"<"} 15% · D/E ≥ 1 · pledge ≥ 10% · PEG ≥ 2
          </li>
        </ul>
        <p className="mt-3 text-xs text-subtle">
          Widely held US names skip the 50% promoter test. Pledge is India-only.
          Not investment advice.
        </p>
      </div>
    </div>
  );
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="6"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
      />
    </svg>
  );
}

function ChecksPanel({ data, loading }: { data: AnalyzeResult | null; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-lg text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-muted">
              <th className="px-4 py-3 font-medium">Paul filter</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Need</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Range</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
                  </td>
                </tr>
              ))}
            {!loading &&
              data?.paul.checks.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-fg">{c.label}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-fg">{c.display}</td>
                  <td className="px-4 py-3 text-muted">{c.threshold}</td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      c.status === "pass" && "text-pass",
                      c.status === "fail" && "text-fail",
                      c.status === "na" && "text-na",
                    )}
                  >
                    {c.status === "pass" ? "PASS" : c.status === "fail" ? "FAIL" : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium tracking-wide",
                        c.band === "best" && "bg-pass/15 text-pass",
                        c.band === "good" && "bg-good/15 text-good",
                        c.band === "ok" && "bg-ok/15 text-ok",
                        c.band === "bad" && "bg-bad/15 text-bad",
                        c.band === "na" && "bg-surface-2 text-na",
                      )}
                    >
                      {BAND_LABEL[c.band]}
                    </span>
                  </td>
                </tr>
              ))}
            {!loading && !data && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Filters appear here after you pick a stock.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
