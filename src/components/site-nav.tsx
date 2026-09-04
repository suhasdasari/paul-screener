import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-6 w-16 shrink-0 animate-pulse rounded bg-surface-2" />;
  }
  if (user) {
    return (
      <div className="max-w-48 min-w-0 [&_button]:text-xs [&_img]:size-6 [&_span]:text-xs [&_span.grid]:size-6">
        <UserButton />
      </div>
    );
  }
  return (
    <Link to="/login" className="text-xs text-muted hover:text-fg">
      Sign in
    </Link>
  );
}

export function SiteNav() {
  return (
    <header className="shrink-0 border-b border-border">
      <div className="flex h-10 items-center justify-between gap-3 px-3">
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
          <AuthSlot />
        </nav>
      </div>
    </header>
  );
}
