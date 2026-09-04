import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <header className="shrink-0 border-b border-border">
      <div className="flex h-10 items-center justify-between px-3">
        <Link to="/" className="font-headline text-[15px] tracking-tight text-fg">
          Paul Screener
        </Link>
        <nav className="flex items-center gap-4 text-xs">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="text-muted hover:text-fg"
            activeProps={{ className: "text-fg" }}
          >
            Screener
          </Link>
          <Link
            to="/about"
            className="text-muted hover:text-fg"
            activeProps={{ className: "text-fg" }}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
