import { createFileRoute } from "@tanstack/react-router";
import { PaulApp } from "@/components/paul-app";

type Search = { symbol?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    symbol: typeof s.symbol === "string" ? s.symbol : undefined,
  }),
  component: Home,
});

function Home() {
  const { symbol } = Route.useSearch();
  return <PaulApp initialSymbol={symbol} />;
}
