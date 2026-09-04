export type WatchItem = { symbol: string; name: string; region: "india" | "us" | "world" };

export const DEFAULT_WATCHLIST: WatchItem[] = [
  { symbol: "IRCTC.NS", name: "IRCTC", region: "india" },
  { symbol: "ASALCBR.NS", name: "Assoc. Alcohols", region: "india" },
  { symbol: "POLYCAB.NS", name: "Polycab", region: "india" },
  { symbol: "HBLENGINE.NS", name: "HBL Engineering", region: "india" },
  { symbol: "PARAS.NS", name: "Paras Defence", region: "india" },
  { symbol: "TEGA.NS", name: "Tega Inds", region: "india" },
  { symbol: "MPHASIS.NS", name: "Mphasis", region: "india" },
  { symbol: "MOTILALOFS.NS", name: "Motilal Oswal", region: "india" },
  { symbol: "TATAELXSI.NS", name: "Tata Elxsi", region: "india" },
  { symbol: "MCX.NS", name: "MCX", region: "india" },
  { symbol: "FINCABLES.NS", name: "Finolex Cables", region: "india" },
  { symbol: "TCS.NS", name: "TCS", region: "india" },
  { symbol: "AAPL", name: "Apple", region: "us" },
  { symbol: "MSFT", name: "Microsoft", region: "us" },
  { symbol: "COST", name: "Costco", region: "us" },
  { symbol: "BRK-B", name: "Berkshire", region: "us" },
  { symbol: "NVDA", name: "NVIDIA", region: "us" },
  { symbol: "UNH", name: "UnitedHealth", region: "us" },
  { symbol: "ASML", name: "ASML", region: "world" },
  { symbol: "TSM", name: "TSMC", region: "world" },
  { symbol: "7203.T", name: "Toyota", region: "world" },
  { symbol: "NESN.SW", name: "Nestlé", region: "world" },
];

const KEY = "paul-screener-watch";

export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const parsed = JSON.parse(raw) as WatchItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WATCHLIST;
    return parsed;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function saveWatchlist(items: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
