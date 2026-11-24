import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { AFTER_DARK_PATH } from "@/lib/after-dark";

export const metadata: Metadata = {
  title: "After Dark",
  robots: { index: false, follow: false, nocache: true },
};

// The private catalog is retired: everything lives at /after-dark now.
export default function PrivateCatalogPage() {
  permanentRedirect(AFTER_DARK_PATH);
}
