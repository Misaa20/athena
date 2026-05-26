"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const privyConfigured = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink-900">Welcome back</h1>
        <p className="text-sm text-ink-900/60">Sign in to your library.</p>
      </header>

      {privyConfigured ? <PrivyLogin /> : <NoAuthNotice />}

      <p className="text-sm text-ink-900/60">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function PrivyLogin() {
  const { login, ready, authenticated, user } = usePrivy();
  if (authenticated) {
    return (
      <p className="rounded-md border border-ink-200 bg-ink-100 p-4 text-sm text-ink-900/70">
        You’re signed in as {user?.email?.address ?? user?.google?.email ?? "your account"}.{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          Go to dashboard
        </Link>
      </p>
    );
  }
  return (
    <Button className="w-full" disabled={!ready} onClick={() => login()}>
      Continue with email or Google
    </Button>
  );
}

function NoAuthNotice() {
  return (
    <p className="rounded-md border border-ink-200 bg-ink-100 p-4 text-sm text-ink-900/70">
      Auth is not configured yet. Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to <code>.env.local</code> and restart the dev server.
    </p>
  );
}
