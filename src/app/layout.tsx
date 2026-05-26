import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";
import { ScrollToTop } from "@/components/scroll-to-top";

export const metadata: Metadata = {
  title: "Athena — Your AI reading companion",
  description:
    "Track, understand, remember, and discover books. Athena is an AI-powered reading companion for thoughtful readers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise min-h-screen text-ink-900 antialiased">
        <Providers>
          <ToastProvider>
            <Nav />
            <main className="relative z-[2] mx-auto max-w-6xl px-6 py-12">{children}</main>
            <ScrollToTop />
            <footer className="relative z-[2] mt-24 border-t border-ink-200/60">
              <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-12 text-center text-sm text-ink-900/50">
                <p className="font-serif text-2xl text-gradient-gold">Athena</p>
                <p className="max-w-xl">
                  A quiet, beautiful place for readers — with an AI librarian who actually pays attention.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-5">
                  <Link href="/browse" className="transition hover:text-accent">Browse</Link>
                  <Link href="/people" className="transition hover:text-accent">Readers</Link>
                  <Link href="/librarian" className="transition hover:text-accent">Librarian</Link>
                  <Link href="/quotes" className="transition hover:text-accent">Quotes</Link>
                </div>
                <p className="mt-4 text-xs text-ink-900/30">
                  © {new Date().getFullYear()} Athena · Built for thoughtful readers
                </p>
              </div>
            </footer>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
