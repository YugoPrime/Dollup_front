import type { ReactNode } from "react";
import { PreorderHeader } from "@/components/preorder/PreorderHeader";
import { PreorderFooter } from "@/components/preorder/PreorderFooter";

export default function PreorderLayout({ children }: { children: ReactNode }) {
  return (
    <div data-storefront="preorder" className="flex min-h-screen flex-col bg-cream">
      <PreorderHeader />
      <div className="flex-1">{children}</div>
      <PreorderFooter />
    </div>
  );
}
