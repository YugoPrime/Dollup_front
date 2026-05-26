import { notFound } from "next/navigation";
import { getPreorderProduct } from "@/lib/preorder";
import { PreorderBadge } from "@/components/preorder/PreorderBadge";
import { PreorderEtaBadge } from "@/components/preorder/PreorderEtaBadge";
import { AddToPreorderCart } from "@/components/preorder/AddToPreorderCart";

export const revalidate = 60;

export default async function PreorderPDP({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getPreorderProduct(handle);
  if (!product) notFound();

  const price = product.variants[0]?.calculated_price?.calculated_amount ?? null;
  const depositPercent = 75;
  const depositAmount = price !== null ? Math.round((price * depositPercent) / 100) : null;
  const balanceAmount = price !== null && depositAmount !== null ? price - depositAmount : null;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <div>
        {product.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full rounded-lg border border-sage-100 bg-blush-50"
          />
        )}
      </div>

      <div>
        <PreorderBadge />
        <h1 className="mt-3 font-display text-3xl leading-tight text-ink">
          {product.title}
        </h1>

        <div className="mt-3">
          <PreorderEtaBadge />
        </div>

        {price !== null && (
          <div className="mt-5 flex items-baseline gap-3">
            <p className="font-display text-3xl text-ink">
              Rs {(price / 100).toFixed(0)}
            </p>
            <span className="text-[12px] text-ink-muted">all-in price</span>
          </div>
        )}

        {/* Deposit breakdown — utility / waiting-room feel */}
        {depositAmount !== null && balanceAmount !== null && (
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-sage-200">
            <div className="border-r border-sage-200 bg-sage-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sage-700">
                Deposit now
              </p>
              <p className="mt-1 font-display text-xl text-ink">
                Rs {(depositAmount / 100).toFixed(0)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">via Juice transfer</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Balance on arrival
              </p>
              <p className="mt-1 font-display text-xl text-ink">
                Rs {(balanceAmount / 100).toFixed(0)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">cash, Juice or card</p>
            </div>
          </div>
        )}

        {/* How it works — sage card */}
        <div className="mt-6 rounded-lg border border-sage-200 bg-sage-50 p-5 text-[13px] text-ink-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
            How pre-order works
          </p>
          <ol className="mt-3 space-y-2">
            <li className="flex gap-3">
              <span className="font-display text-sage-300">01</span>
              <span>{depositPercent}% deposit via Juice reserves your piece.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">02</span>
              <span>We order from SHEIN within 7 days.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">03</span>
              <span>Ships ~15–20 days from order.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sage-300">04</span>
              <span>Pay balance when ready for delivery or collection.</span>
            </li>
          </ol>
          <p className="mt-4 rounded border border-coral-300 bg-white px-3 py-2 text-[12px] font-semibold text-coral-700">
            All pre-order sales are final — no cancellations or refunds once deposit is paid.
          </p>
        </div>

        <div className="mt-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AddToPreorderCart product={product as any} />
        </div>
      </div>
    </main>
  );
}
