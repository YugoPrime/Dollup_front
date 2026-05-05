import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Doll Up Boutique order.",
  robots: { index: false, follow: false },
};

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
