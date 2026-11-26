import type { ReactNode } from "react";
import { Banknote, MessageCircle, Package } from "lucide-react";
import { askPrivatelyUrl } from "@/lib/after-dark";

const CELL =
  "flex flex-col items-center justify-center gap-1.5 px-1 py-3 text-center font-sans text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-champagne-200 md:flex-row md:gap-2.5 md:py-4 md:text-[11px]";

function Icon({ children }: { children: ReactNode }) {
  return <span className="text-champagne-gold" aria-hidden="true">{children}</span>;
}

// Bottom of the After Dark hero band: three equal columns split by thin gold lines.
export function AfterDarkTrustRow() {
  const icon = { size: 18, strokeWidth: 1.4 } as const;
  return (
    <div className="relative z-[1] border-t border-champagne-gold/35">
      <div className="mx-auto grid max-w-[1280px] grid-cols-3 divide-x divide-champagne-gold/25">
        <div className={CELL}>
          <Icon><Banknote {...icon} /></Icon>
          Payment on delivery
        </div>
        <div className={CELL}>
          <Icon><Package {...icon} /></Icon>
          Discreet delivery
        </div>
        <a
          href={askPrivatelyUrl()}
          target="_blank"
          rel="noreferrer"
          className={`${CELL} transition-colors hover:text-champagne-50`}
        >
          <Icon><MessageCircle {...icon} /></Icon>
          Ask us privately
        </a>
      </div>
    </div>
  );
}
