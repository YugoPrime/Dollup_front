import type { ReactNode } from "react";
import { PreorderHeader } from "@/components/preorder/PreorderHeader";
import { PreorderFooter } from "@/components/preorder/PreorderFooter";
import { PreorderBottomNav } from "@/components/preorder/PreorderBottomNav";

export default function PreorderLayout({ children }: { children: ReactNode }) {
  return (
    <div data-storefront="preorder" className="flex min-h-screen flex-col bg-cream">
      <PreorderHeader />
      <div className="flex-1 pb-[68px] md:pb-0">{children}</div>
      <PreorderFooter />
      <PreorderBottomNav />
    </div>
  );
}
