import Link from "next/link";

export function PreorderFooter() {
  return (
    <footer className="mt-16 border-t border-sage-200 bg-sage-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-lg text-ink">Doll Up Boutique</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sage-700">
              Pre-Order
            </p>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Curated SHEIN finds, reserved with a 75% deposit and delivered locally
              in about 15–20 days.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
              Pre-order
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li><Link href="/preorder" className="hover:text-sage-700">Home</Link></li>
              <li><Link href="/preorder/products" className="hover:text-sage-700">Browse all</Link></li>
              <li><Link href="/preorder/request" className="hover:text-sage-700">Request a SHEIN item</Link></li>
              <li><Link href="/preorder/how-it-works" className="hover:text-sage-700">How it works</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
              Looking for in-stock items?
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              The main Doll Up store stocks pieces ready to ship the next day.
            </p>
            <a
              href="https://dollupboutique.com"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage-700 px-4 py-2 text-[12px] font-medium tracking-wide text-cream transition hover:bg-sage-900"
            >
              ← Shop in-stock
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-sage-200 pt-6 text-[11px] text-ink-muted">
          © {new Date().getFullYear()} Doll Up Boutique · Mauritius · COD + Juice deposits
        </div>
      </div>
    </footer>
  );
}
