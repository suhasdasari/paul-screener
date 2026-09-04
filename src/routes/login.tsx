import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in · Paul Screener" }],
  }),
  component: Login,
});

function Login() {
  return (
    <main className="grid h-full place-items-center overflow-y-auto p-6">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Account</p>
          <h1 className="mt-2 font-headline text-3xl tracking-tight text-fg">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Save your watchlist to your account so it follows you on any device.
          </p>
        </div>
        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="h-11 w-full rounded-lg border border-border bg-surface text-sm text-fg hover:bg-surface-2"
              >
                Continue with {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="inline-block text-sm text-muted hover:text-fg">
          Back to screener
        </Link>
      </div>
    </main>
  );
}
