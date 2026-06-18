import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Books",
  description: "Browse trending books, new releases, and genre shelves on Athena.",
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
