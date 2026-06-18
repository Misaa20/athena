import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Readers",
  description: "Find thoughtful readers to follow and discover what they are reading on Athena.",
};

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
