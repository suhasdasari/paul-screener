import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { WatchItem } from "./watchlist";

function cleanItems(data: unknown): WatchItem[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: WatchItem[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const symbol = String((row as WatchItem).symbol ?? "")
      .trim()
      .slice(0, 32);
    const name = String((row as WatchItem).name ?? symbol)
      .trim()
      .slice(0, 120);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({ symbol, name });
    if (out.length >= 60) break;
  }
  return out;
}

export const getWatchlistFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    return sql<{ symbol: string; name: string }>`
      select symbol, name from watchlist
      where user_id = ${context.userId}
      order by created_at desc
    `;
  });

export const addWatchFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { symbol: string; name: string }) => ({
    symbol: String(data.symbol ?? "").trim().slice(0, 32),
    name: String(data.name ?? "").trim().slice(0, 120),
  }))
  .handler(async ({ context, data }) => {
    if (!data.symbol) return;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into watchlist (user_id, symbol, name)
      values (${context.userId}, ${data.symbol}, ${data.name || data.symbol})
      on conflict (user_id, symbol) do update set name = excluded.name
    `;
  });

export const removeWatchFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { symbol: string }) => ({
    symbol: String(data.symbol ?? "").trim().slice(0, 32),
  }))
  .handler(async ({ context, data }) => {
    if (!data.symbol) return;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from watchlist where user_id = ${context.userId} and symbol = ${data.symbol}`;
  });

export const replaceWatchlistFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: WatchItem[]) => cleanItems(data))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from watchlist where user_id = ${context.userId}`;
    for (const item of data) {
      await sql`
        insert into watchlist (user_id, symbol, name)
        values (${context.userId}, ${item.symbol}, ${item.name})
      `;
    }
    return data;
  });
