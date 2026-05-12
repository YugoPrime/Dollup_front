import type { Metadata } from "next";
import Image from "next/image";
import { Gift, Heart, RotateCcw, ShoppingBag, Tag, Target } from "lucide-react";
import { getRegion } from "@/lib/region";
import { listInStockProductsForSize } from "@/lib/products";
import type { CanonicalSize, MysteryBoxSlot } from "@/lib/mystery-box";
import { MysteryBoxClient } from "./MysteryBoxClient";

export const metadata: Metadata = {
  title: "Mystery Box | Spin the wheel",
  description:
    "Pick your size, spin our mystery wheel, and lock 5 surprise pieces for a flat Rs 3,500.",
  alternates: { canonical: "/events/mystery-box" },
  openGraph: {
    title: "Mystery Box",
    description: "5 surprise pieces. Rs 3,500. Mauritius only.",
    url: "/events/mystery-box",
  },
};

const SIZES: CanonicalSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

// Stock moves under us. A cached pool means the SSR-rendered slots can already
// be sold by the time the user spins, and the backend's live inventory check
// rejects the box ("Some items are out of stock"). Render fresh on every load.
export const dynamic = "force-dynamic";

export default async function MysteryBoxPage() {
  let region: Awaited<ReturnType<typeof getRegion>>;

  try {
    region = await getRegion();
  } catch {
    return (
      <div className="bg-ink px-6 py-20 text-center text-white">
        <p className="font-sans text-[14px] text-white/70">
          Mystery Box is currently unavailable. Try again later.
        </p>
      </div>
    );
  }

  const pools = await Promise.all(
    SIZES.map(async (size): Promise<[CanonicalSize, MysteryBoxSlot[]]> => {
      try {
        return [size, await listInStockProductsForSize(size, region.id)];
      } catch {
        return [size, []];
      }
    }),
  );
  const poolsBySize = Object.fromEntries(pools) as Partial<
    Record<CanonicalSize, MysteryBoxSlot[]>
  >;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 via-cream to-blush-100 px-6 py-10 text-ink md:px-10 md:py-14">
      <div className="mx-auto max-w-[1180px]">
        <header className="relative overflow-hidden rounded-2xl bg-cream-50 shadow-[0_10px_40px_rgba(26,18,18,0.08)]">
          {/* Full-bleed background image */}
          <Image
            src="/mystery-box/hero.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1180px) 1180px, 100vw"
            className="object-cover object-right"
          />
          {/* Left-side fade so headline + badges stay legible */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-cream-50/85 via-cream-50/40 to-transparent md:from-cream-50/80 md:via-cream-50/20"
          />

          <div className="relative grid gap-6 px-6 py-10 md:grid-cols-[1fr_320px] md:items-end md:gap-8 md:px-10 md:py-14">
            <div>
              <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
                Mystery Box
              </p>
              <h1 className="max-w-[520px] font-display text-[42px] leading-[0.96] text-ink md:text-[64px]">
                Spin the wheel.
                <br />
                <em
                  className="not-italic text-coral-500"
                  style={{ fontStyle: "italic" }}
                >
                  Trust the drop.
                </em>
              </h1>
              <p className="mt-4 max-w-[460px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
                5 surprise pieces curated for your size.
                <br />
                Flat Rs 3,500. Always more value than the price tag.
              </p>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 font-sans text-[11px] text-ink-soft md:text-[12px]">
                <li className="flex items-center gap-2">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/85 text-coral-500 shadow-sm backdrop-blur">
                    <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-bold uppercase tracking-[0.12em] text-ink">
                      Curated surprise
                    </span>
                    <span className="text-ink-muted">Loved by thousands</span>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/85 text-coral-500 shadow-sm backdrop-blur">
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-bold uppercase tracking-[0.12em] text-ink">
                      Premium quality
                    </span>
                    <span className="text-ink-muted">Handpicked pieces</span>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/85 text-coral-500 shadow-sm backdrop-blur">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-bold uppercase tracking-[0.12em] text-ink">
                      Easy returns
                    </span>
                    <span className="text-ink-muted">Hassle-free</span>
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 rounded-xl border border-blush-400 bg-white/95 p-4 shadow-[0_10px_30px_rgba(26,18,18,0.12)] backdrop-blur md:grid-cols-1 md:p-5">
            <div className="flex flex-col items-center gap-2 py-2 md:flex-row md:items-center md:gap-4 md:border-b md:border-blush-200 md:py-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blush-100 text-coral-500">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="text-center md:text-left">
                <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Pieces
                </p>
                <p className="mt-0.5 font-display text-[22px] leading-none text-ink">
                  5
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 border-x border-blush-200 py-2 md:flex-row md:items-center md:gap-4 md:border-x-0 md:border-b md:py-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blush-100 text-coral-500">
                <Tag className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="text-center md:text-left">
                <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Flat price
                </p>
                <p className="mt-0.5 font-display text-[22px] leading-none text-ink">
                  Rs 3,500
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 py-2 md:flex-row md:items-center md:gap-4 md:py-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blush-100 text-coral-500">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="text-center md:text-left">
                <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  Spins
                </p>
                <p className="mt-0.5 font-display text-[22px] leading-none text-ink">
                  3/day
                </p>
              </div>
            </div>
            </div>
          </div>
        </header>

        <main className="mt-8">
          <MysteryBoxClient poolsBySize={poolsBySize} regionId={region.id} />
        </main>

        <p className="mt-10 font-sans text-[11px] text-ink-muted">
          Free delivery and COD across Mauritius. Stock is reserved at checkout,
          not at spin time.
        </p>
      </div>
    </div>
  );
}
