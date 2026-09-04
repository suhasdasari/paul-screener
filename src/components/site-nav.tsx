import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-headline text-lg tracking-tight text-fg">
          Paul Screener
        </Link>
        <nav className="flex items-center gap-6 text-sm">
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
