import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Quotes Wall",
  description: "Save memorable lines from books and build a searchable quotes wall in Athena.",
};

export default function QuotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
