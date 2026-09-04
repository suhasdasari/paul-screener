import { createServerFn } from "@tanstack/react-start";
import { scorePaul, type PaulScore, type StockMetrics } from "./paul";

export type SearchHit = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

export type AnalyzeResult = StockMetrics & { paul: PaulScore };

export const searchStocksFn = createServerFn({ method: "POST" })
  .validator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    const { searchStocks } = await import("./market.server");
    return searchStocks(data.q);
  });

export const trendingStocksFn = createServerFn({ method: "POST" }).handler(async () => {
  const { trendingStocks } = await import("./market.server");
  return trendingStocks();
});

export const analyzeStockFn = createServerFn({ method: "POST" })
  .validator((data: { symbol: string }) => {
    const symbol = String(data.symbol ?? "").trim();
    if (!symbol) throw new Error("Pick a symbol");
    return { symbol };
  })
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const { analyzeSymbol } = await import("./market.server");
    const metrics = await analyzeSymbol(data.symbol);
    return { ...metrics, paul: scorePaul(metrics) };
  });
