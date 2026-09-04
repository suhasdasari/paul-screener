export type WatchItem = { symbol: string; name: string };

export const ALL_MARKETS: WatchItem[] = [
  { symbol: "IRCTC.NS", name: "IRCTC" },
  { symbol: "ASALCBR.NS", name: "Assoc. Alcohols" },
  { symbol: "POLYCAB.NS", name: "Polycab" },
  { symbol: "HBLENGINE.NS", name: "HBL Engineering" },
  { symbol: "PARAS.NS", name: "Paras Defence" },
  { symbol: "TEGA.NS", name: "Tega Inds" },
  { symbol: "MPHASIS.NS", name: "Mphasis" },
  { symbol: "MOTILALOFS.NS", name: "Motilal Oswal" },
  { symbol: "TATAELXSI.NS", name: "Tata Elxsi" },
  { symbol: "MCX.NS", name: "MCX" },
  { symbol: "FINCABLES.NS", name: "Finolex Cables" },
  { symbol: "TCS.NS", name: "TCS" },
  { symbol: "RELIANCE.NS", name: "Reliance" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "COST", name: "Costco" },
  { symbol: "BRK-B", name: "Berkshire" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "UNH", name: "UnitedHealth" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "ASML", name: "ASML" },
  { symbol: "TSM", name: "TSMC" },
  { symbol: "7203.T", name: "Toyota" },
  { symbol: "NESN.SW", name: "Nestlé" },
];

export const INDIA_TRENDING: WatchItem[] = [
  { symbol: "IRCTC.NS", name: "IRCTC" },
  { symbol: "POLYCAB.NS", name: "Polycab" },
  { symbol: "PARAS.NS", name: "Paras Defence" },
  { symbol: "HBLENGINE.NS", name: "HBL Engineering" },
  { symbol: "TCS.NS", name: "TCS" },
  { symbol: "MCX.NS", name: "MCX" },
  { symbol: "RELIANCE.NS", name: "Reliance" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
];

const KEY = "paul-screener-watch-v2";

export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.symbol === "string" && typeof x.name === "string");
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
