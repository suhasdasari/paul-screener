import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search, Star } from "lucide-react";
import {
  analyzeStockFn,
  searchStocksFn,
  trendingStocksFn,
  type AnalyzeResult,
} from "@/lib/stock-api";
import { addWatchFn, getWatchlistFn, removeWatchFn, replaceWatchlistFn } from "@/lib/watch-api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatCap, formatPrice, type Band, type PaulCheck } from "@/lib/paul";
import {
  ALL_MARKETS,
  INDIA_TRENDING,
  loadWatchlist,
  saveWatchlist,
  type WatchItem,
} from "@/lib/watchlist";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "all" | "trending" | "watch";

const BAND_LABEL: Record<Band, string> = {
  best: "BEST",
  good: "GOOD",
  ok: "OK",
  bad: "WEAK",
  na: "N/A",
};

const SHORT: Record<string, string> = {
  roe: "ROE",
  roce: "ROCE",
  de: "Debt / Equity",
  insider: "Promoter",
  pledge: "Pledge",
  sales: "Sales growth",
  profit: "Profit growth",
  peg: "PEG",
  peGrowth: "PE vs growth",
};

export function PaulApp({ initialSymbol }: { initialSymbol?: string }) {
  const navigate = useNavigate({ from: "/" });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<WatchItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [trending, setTrending] = useState<WatchItem[]>(INDIA_TRENDING);
  const [active, setActive] = useState(initialSymbol || "IRCTC.NS");
  const [data, setData] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  const { user, isPending: authPending } = useCurrentUserState();
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    void trendingStocksFn()
      .then((rows) => setTrending(rows.map((h) => ({ symbol: h.symbol, name: h.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authPending) return;
    if (!user) {
      syncedUser.current = null;
      setWatch(loadWatchlist());
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    void getWatchlistFn()
      .then(async (rows) => {
        if (rows.length > 0) {
          setWatch(rows);
          saveWatchlist(rows);
          return;
        }
        const local = loadWatchlist();
        if (local.length === 0) {
          setWatch([]);
          return;
        }
        setWatch(local);
        await replaceWatchlistFn({ data: local });
      })
      .catch(() => setWatch(loadWatchlist()));
  }, [user, authPending]);

  useEffect(() => {
    void loadSymbol(initialSymbol || "IRCTC.NS");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  async function loadSymbol(symbol: string) {
    setActive(symbol);
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
    window.clearTimeout(searchTimer.current);
    if (v.trim().length < 2) {
      setHits([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      try {
        const res = await searchStocksFn({ data: { q: v } });
        setHits(res.map((h) => ({ symbol: h.symbol, name: h.name })));
      } catch {
        setHits([]);
      }
    }, 220);
  }

  function isWatched(symbol: string) {
    return watch.some((w) => w.symbol === symbol);
  }

  function toggleWatch(item: WatchItem) {
    const exists = isWatched(item.symbol);
    const next = exists
      ? watch.filter((w) => w.symbol !== item.symbol)
      : [{ symbol: item.symbol, name: item.name }, ...watch].slice(0, 60);
    setWatch(next);
    saveWatchlist(next);
    if (!user) return;
    void (exists
      ? removeWatchFn({ data: { symbol: item.symbol } })
      : addWatchFn({ data: { symbol: item.symbol, name: item.name } })
    ).catch(() => {});
  }

  const catalog = tab === "all" ? ALL_MARKETS : tab === "trending" ? trending : watch;
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const filtered = q
      ? catalog.filter(
          (x) => x.name.toLowerCase().includes(q) || x.symbol.toLowerCase().includes(q),
        )
      : catalog;
    if (q.length < 2) return filtered;
    const seen = new Set(filtered.map((x) => x.symbol));
    const extra = hits.filter((h) => !seen.has(h.symbol));
    return [...filtered, ...extra];
  }, [catalog, q, hits]);

  const watchedActive = data ? isWatched(data.symbol) : isWatched(active);

  return (
    <div className="paul-shell flex h-full min-h-0 flex-col overflow-y-auto min-[720px]:flex-row min-[720px]:overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TickerBar
          data={data}
          loading={loading}
          error={error}
          watched={watchedActive}
          onToggleWatch={() => {
            if (data) toggleWatch({ symbol: data.symbol, name: data.name });
          }}
        />
        <div className="grid min-h-0 flex-1 grid-cols-1 min-[720px]:grid-cols-[200px_minmax(0,1fr)]">
          <ScoreRail data={data} loading={loading} />
          <CriteriaGrid data={data} loading={loading} />
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-border min-[720px]:w-72 min-[720px]:border-t-0 min-[720px]:border-l">
        <div className="relative shrink-0 border-b border-border p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search markets…"
            className="h-8 rounded-md bg-bg pl-8 text-xs"
            aria-label="Search stocks"
          />
        </div>
        <div className="grid shrink-0 grid-cols-3 border-b border-border">
          {(["all", "trending", "watch"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-8 text-[11px] font-medium tracking-wide",
                tab === t ? "text-fg border-b border-fg" : "text-muted hover:text-fg",
              )}
            >
              {t === "all" ? "All" : t === "trending" ? "Trending" : "Watchlist"}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "watch" && rows.length === 0 && (
            <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-muted">
              {user
                ? "Star names in All or Trending to save them to your account."
                : "Star names, then sign in to keep this list on any device."}
            </p>
          )}
          {rows.map((w) => (
            <div
              key={w.symbol}
              className={cn(
                "flex items-stretch",
                active === w.symbol ? "bg-surface-2" : "hover:bg-surface-2/60",
              )}
            >
              <button
                type="button"
                onClick={() => void loadSymbol(w.symbol)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-1.5 text-left"
              >
                <span className="truncate text-xs text-fg">{w.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted tabular-nums">{w.symbol}</span>
              </button>
              <button
                type="button"
                aria-label={isWatched(w.symbol) ? `Remove ${w.name}` : `Add ${w.name}`}
                onClick={() => toggleWatch(w)}
                className="grid w-8 shrink-0 place-items-center text-subtle hover:text-fg"
              >
                <Star
                  className={cn("size-3.5", isWatched(w.symbol) && "fill-warn text-warn")}
                />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function TickerBar({
  data,
  loading,
  error,
  watched,
  onToggleWatch,
}: {
  data: AnalyzeResult | null;
  loading: boolean;
  error: string | null;
  watched: boolean;
  onToggleWatch: () => void;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-4 overflow-hidden border-b border-border px-3">
      {loading && !data ? (
        <span className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Reading Paul…
        </span>
      ) : error && !data ? (
        <span className="text-xs text-fail">{error}</span>
      ) : data ? (
        <>
          <button
            type="button"
            onClick={onToggleWatch}
            aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
            className="grid size-7 shrink-0 place-items-center text-subtle hover:text-fg"
          >
            <Star className={cn("size-3.5", watched && "fill-warn text-warn")} />
          </button>
          <div className="min-w-0">
            <p className="truncate font-headline text-base leading-none text-fg">{data.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted tabular-nums">
              {data.symbol} · {data.exchange}
            </p>
          </div>
          <Stat label="Price" value={formatPrice(data.price, data.currency)} />
          <Stat label="Mcap" value={formatCap(data.marketCap, data.currency)} />
          <Stat label="PE" value={data.pe?.toFixed(1) ?? "—"} />
          <Stat label="PEG" value={data.peg?.toFixed(2) ?? "—"} />
          <span className="ml-auto hidden text-[10px] text-subtle sm:inline">{data.source}</span>
        </>
      ) : (
        <span className="text-xs text-muted">Search a stock to score it.</span>
      )}
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden shrink-0 sm:block">
      <p className="text-[10px] text-subtle">{label}</p>
      <p className="font-mono text-xs text-fg tabular-nums">{value}</p>
    </div>
  );
}

function ScoreRail({ data, loading }: { data: AnalyzeResult | null; loading: boolean }) {
  const pct = data?.paul.pct ?? 0;
  return (
    <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-border p-4 min-[720px]:border-r min-[720px]:border-b-0">
      <div>
        {loading && !data ? (
          <Loader2 className="size-5 animate-spin text-muted" />
        ) : (
          <>
            <p className="font-headline text-5xl leading-none tracking-tight text-fg tabular-nums">
              {data ? `${pct}%` : "—"}
            </p>
            <p className="mt-2 font-headline text-xl text-fg">{data?.paul.fit ?? "Pick a name"}</p>
            <p className="mt-1 text-xs text-muted">
              {data ? `${data.paul.passed}/${data.paul.scored} filters` : "Paul’s Quick Formula"}
            </p>
          </>
        )}
      </div>
      <ul className="mt-4 space-y-1 text-[11px] leading-snug text-muted">
        <li>
          <span className="text-pass">Best</span> · ROE/ROCE ≥ 25% · D/E ≈ 0 · PEG {"<"} 1
        </li>
        <li>
          <span className="text-good">Good</span> · ≥ 20% · D/E {"<"} 0.5 · PEG {"<"} 2
        </li>
        <li>
          <span className="text-fail">Weak</span> · ROE {"<"} 15% · D/E ≥ 1 · PEG ≥ 2
        </li>
      </ul>
    </div>
  );
}

function CriteriaGrid({ data, loading }: { data: AnalyzeResult | null; loading: boolean }) {
  const checks = data?.paul.checks;
  return (
    <div className="grid min-h-[360px] flex-1 grid-cols-3 grid-rows-3 gap-px bg-border min-[720px]:min-h-0">
      {(checks ?? Array.from({ length: 9 }, (_, i) => null)).map((c, i) => (
        <CriteriaCell key={c?.id ?? i} check={c} loading={loading && !data} />
      ))}
    </div>
  );
}

function CriteriaCell({ check, loading }: { check: PaulCheck | null; loading: boolean }) {
  if (loading) {
    return <div className="bg-surface p-3"><div className="h-full animate-pulse rounded bg-surface-2" /></div>;
  }
  if (!check) {
    return <div className="bg-surface" />;
  }
  const fill = barFill(check);
  return (
    <div className="flex min-h-0 flex-col justify-between overflow-hidden bg-surface p-2.5 min-[1100px]:p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">{SHORT[check.id] ?? check.label}</p>
        <span
          className={cn(
            "text-[10px] font-medium tracking-wide",
            check.status === "pass" && "text-pass",
            check.status === "fail" && "text-fail",
            check.status === "na" && "text-na",
          )}
        >
          {check.status === "pass" ? "PASS" : check.status === "fail" ? "FAIL" : "N/A"}
        </span>
      </div>
      <div>
        <p className="font-headline text-xl leading-none text-fg tabular-nums min-[1100px]:text-3xl">{check.display}</p>
        <p className="mt-1 text-[10px] text-subtle">Need {check.threshold}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              "h-full rounded-full",
              check.band === "best" && "bg-pass",
              check.band === "good" && "bg-good",
              check.band === "ok" && "bg-ok",
              check.band === "bad" && "bg-fail",
              check.band === "na" && "bg-na",
            )}
            style={{ width: `${fill}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] tracking-wide text-muted">{BAND_LABEL[check.band]}</p>
      </div>
    </div>
  );
}

function barFill(c: PaulCheck): number {
  if (c.status === "na" || c.value === null) return 8;
  if (c.id === "de") return Math.max(8, Math.min(100, 100 - c.value * 50));
  if (c.id === "peg") return Math.max(8, Math.min(100, c.value > 0 ? 100 - c.value * 25 : 8));
  if (c.id === "pledge") return Math.max(8, Math.min(100, 100 - c.value * 5));
  if (c.id === "peGrowth") return c.status === "pass" ? 88 : 28;
  return Math.max(8, Math.min(100, (c.value / 40) * 100));
}
