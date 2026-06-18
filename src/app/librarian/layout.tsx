import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Book Recommender",
  description:
    "Ask Athena's AI librarian for thoughtful book recommendations based on mood, style, and taste.",
};

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return children;
}
