"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ChevronDown, Menu, X, BookOpenText, User, Quote, Library, LogOut, UserRound } from "lucide-react";
import { CATEGORIES } from "@/lib/books";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette";
import { authedFetch } from "@/lib/client";

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
  const [username, setUsername] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pull the DB-stored username (Privy only knows email/oauth identity).
  // Needed because the profile route is /u/[username], not /u/[privyDid].
  useEffect(() => {
    if (!authenticated) {
      setUsername(null);
      return;
    }
    let cancelled = false;
    authedFetch<{ user: { username: string } }>("/api/me")
      .then((d) => {
        if (!cancelled) setUsername(d.user.username);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready) {
    return (
      <span
        aria-label="Loading account menu"
        className="inline-flex h-9 w-9 rounded-full border border-accent/25 bg-ink-100/70 shimmer"
      />
    );
  }

  if (authenticated) {
    const email = user?.email?.address ?? user?.google?.email ?? "Signed in";
    const initial = username?.[0]?.toUpperCase() ?? (email !== "Signed in" ? email[0]?.toUpperCase() : "");
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 items-center gap-1.5 rounded-full border border-accent/30 bg-ink-100/80 px-1.5 shadow-glow transition hover:border-accent/60 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-ink-50 ring-1 ring-accent/70 transition"
            title={email}
          >
            {initial || <UserRound className="h-4 w-4" />}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-ink-900/70 transition-transform", open && "rotate-180")}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-ink-200 bg-ink-100/95 shadow-glow-lg backdrop-blur-xl animate-slide-down"
          >
            <div className="border-b border-ink-200 px-4 py-3">
              <p className="truncate font-serif text-sm text-ink-900">
                {username ? `@${username}` : "Signed in"}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-900/55">{email}</p>
            </div>
            <nav className="p-1.5">
              <MenuLink
                href={username ? `/u/${username}` : "/dashboard"}
                icon={User}
                label="My profile"
                hint="Followers & reviews"
                onClick={() => setOpen(false)}
                disabled={!username}
              />
              <MenuLink
                href="/library"
                icon={Library}
                label="My library"
                onClick={() => setOpen(false)}
              />
              <MenuLink
                href="/quotes"
                icon={Quote}
                label="My quotes"
                onClick={() => setOpen(false)}
              />
            </nav>
            <div className="border-t border-ink-200 p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-900/80 transition hover:bg-ink-200/40 hover:text-ink-900"
              >
                <LogOut className="h-4 w-4 text-ink-900/50" />
                Sign out
              </button>
            </div>
          </div>
        )}
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

function MenuLink({
  href,
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        role="menuitem"
        aria-disabled
        className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-900/30"
      >
        <Icon className="h-4 w-4" />
        {label}
      </div>
    );
  }
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-900/80 transition hover:bg-ink-200/40 hover:text-ink-900"
    >
      <Icon className="h-4 w-4 text-ink-900/55" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-ink-900/40">{hint}</span>}
    </Link>
  );
}
