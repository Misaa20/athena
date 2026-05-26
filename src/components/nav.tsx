"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ChevronDown, Menu, X, BookOpenText } from "lucide-react";
import { CATEGORIES } from "@/lib/books";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/browse", label: "Browse" },
  { href: "/library", label: "Library" },
  { href: "/people", label: "People" },
  { href: "/librarian", label: "Librarian" },
];

export function Nav() {
  const privyConfigured = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Tighten the nav as user scrolls — drops shadow + sharpens border.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-all duration-300",
        scrolled
          ? "border-b border-ink-200 bg-ink-50/85 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]"
          : "border-b border-ink-200/40 bg-ink-50/60 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent/40 to-wine/30 ring-1 ring-accent/30 transition group-hover:ring-accent/60">
            <BookOpenText className="h-4 w-4 text-accent transition group-hover:text-accent-light" />
            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(217,168,92,0.8)] candle-flicker" />
          </span>
          <span className="font-serif text-xl tracking-tight text-ink-900 transition group-hover:text-ink-950">
            Athena
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            if (l.href === "/browse") return <BrowseMenu key={l.href} active={active} />;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 transition-colors",
                  active ? "text-accent" : "text-ink-900/65 hover:text-ink-900",
                )}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <CommandPalette />
          <span className="mx-1 hidden h-5 w-px bg-ink-200 md:block" />
          {privyConfigured ? (
            <AuthButton />
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink-50 shadow-glow transition hover:bg-accent-dark"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 text-ink-900/70 transition hover:border-accent/50 hover:text-ink-900 md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-ink-200 bg-ink-50/95 backdrop-blur-xl md:hidden animate-slide-down">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4 text-sm">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-md px-3 py-2.5 transition-colors",
                    active
                      ? "bg-ink-100 text-accent"
                      : "text-ink-900/75 hover:bg-ink-100 hover:text-ink-900",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-ink-200" />
            <Link
              href="/quotes"
              className="rounded-md px-3 py-2.5 text-ink-900/65 transition hover:bg-ink-100 hover:text-ink-900"
            >
              My quotes
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function BrowseMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hide() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide} onBlur={hide} onFocus={show}>
      <Link
        href="/browse"
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors",
          active ? "text-accent" : "text-ink-900/65 hover:text-ink-900",
        )}
      >
        Browse
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </Link>

      {open && (
        <div className="absolute right-0 top-full pt-2 animate-slide-down">
          <div className="w-[22rem] rounded-xl border border-ink-200 bg-ink-100/95 p-4 shadow-glow-lg backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-900/40">Genres</span>
              <Link href="/browse" className="text-xs text-accent hover:text-accent-light">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.subject}
                  href={`/browse/${c.subject}`}
                  className="rounded-md px-2 py-1.5 text-sm text-ink-900/70 transition hover:bg-ink-200/40 hover:text-accent"
                >
                  {c.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex gap-2 border-t border-ink-200 pt-3 text-sm">
              <Link
                href="/browse#trending"
                className="rounded-md px-2 py-1 text-ink-900/70 transition hover:bg-ink-200/40 hover:text-accent"
              >
                Trending
              </Link>
              <Link
                href="/browse#new-releases"
                className="rounded-md px-2 py-1 text-ink-900/70 transition hover:bg-ink-200/40 hover:text-accent"
              >
                New releases
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return <span className="px-2 text-ink-900/40">…</span>;
  }

  if (authenticated) {
    const email = user?.email?.address ?? user?.google?.email ?? "Signed in";
    const initial = (email[0] ?? "A").toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent/40 to-wine/30 text-xs font-medium text-ink-950 ring-1 ring-accent/30 md:flex"
          title={email}
        >
          {initial}
        </span>
        <button
          onClick={logout}
          className="hidden rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-900/80 transition hover:border-accent/50 hover:text-ink-900 md:inline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink-50 shadow-glow transition hover:bg-accent-dark active:scale-[0.98]"
    >
      Sign in
    </button>
  );
}
