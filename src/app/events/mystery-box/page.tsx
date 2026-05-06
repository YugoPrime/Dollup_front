import type { Metadata } from "next";
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

export const revalidate = 600;

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
        <header className="grid gap-6 border-b border-blush-400 pb-8 md:grid-cols-[1fr_320px] md:items-end">
          <div>
            <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-300">
              Mystery Box
            </p>
            <h1 className="max-w-[740px] font-display text-[42px] leading-[0.96] md:text-[72px]">
              Spin the wheel.{" "}
              <em
                className="not-italic text-coral-300"
                style={{ fontStyle: "italic" }}
              >
                Trust the drop.
              </em>
            </h1>
            <p className="mt-4 max-w-[580px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
              5 surprise pieces curated for your size. Flat Rs 3,500. Always
              more value than the price tag.
            </p>
          </div>

          <div className="grid grid-cols-3 rounded-xl border border-blush-400 bg-white p-4 text-center shadow-[0_10px_30px_rgba(26,18,18,0.06)] md:grid-cols-1 md:text-left">
            <div className="py-2 md:border-b md:border-blush-200 md:py-3">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Pieces
              </p>
              <p className="mt-1 font-display text-[24px] text-ink">5</p>
            </div>
            <div className="border-x border-blush-200 py-2 md:border-x-0 md:border-b md:py-3">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Flat price
              </p>
              <p className="mt-1 font-display text-[24px] text-ink">Rs 3,500</p>
            </div>
            <div className="py-2 md:py-3">
              <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Spins
              </p>
              <p className="mt-1 font-display text-[24px] text-ink">3/day</p>
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
