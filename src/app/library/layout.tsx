import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Library",
  description: "Search books, build shelves, and keep track of what you are reading in Athena.",
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
