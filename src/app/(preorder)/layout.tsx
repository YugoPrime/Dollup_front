import type { ReactNode } from "react";
import { PreorderBanner } from "@/components/preorder/PreorderBanner";

export default function PreorderLayout({ children }: { children: ReactNode }) {
  return (
    <div data-storefront="preorder" className="min-h-screen">
      <PreorderBanner />
      {children}
    </div>
  );
}
