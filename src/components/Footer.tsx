import Link from "next/link";
import Image from "next/image";
import { FOOTER_SHOP, FOOTER_HELP, FOOTER_ABOUT } from "@/lib/nav";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <footer className="bg-ink text-coral-600">
      <section className="bg-coral-500 px-6 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-8">
          <div>
            <p className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
              Stay in the loop
            </p>
            <h3 className="font-display text-[22px] font-semibold leading-snug text-white">
              Get early access to new drops &amp; exclusive offers
            </h3>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1100px] gap-10 px-6 pb-10 pt-14 md:grid-cols-[2fr_1fr_1fr_1fr] md:px-8">
        <div className="flex flex-col items-start">
          <Image
            src="/logo.png"
            alt="Doll Up Boutique"
            width={192}
            height={64}
            className="mb-3 h-16 w-auto brightness-110"
          />
          <p className="mb-4 max-w-[220px] font-sans text-[13px] leading-relaxed text-coral-600/80">
            Your go-to for fashion, lingerie &amp; beachwear since 2018.
          </p>
          <div className="mb-4 flex gap-3">
            {["Facebook", "Instagram", "TikTok"].map((s) => (
              <a
                key={s}
                href="#"
                className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-coral-500"
              >
                {s}
              </a>
            ))}
          </div>
          <Link
            href="/loyalty"
            prefetch={false}
            className="flex items-center gap-1.5 rounded-md border border-coral-500/25 bg-coral-500/10 px-3 py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#E5604A">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-sans text-[11px] font-semibold tracking-wide text-coral-500">
              Doll Rewards — Join &amp; earn points
            </span>
          </Link>
        </div>

        <FooterCol title="Shop" links={FOOTER_SHOP} />
        <FooterCol title="Help" links={FOOTER_HELP} />
        <FooterCol title="About" links={FOOTER_ABOUT} />
      </div>

      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-[#2E1A18] px-6 py-5 font-sans text-[11px] text-coral-900 md:px-8">
        <span>© {new Date().getFullYear()} Doll Up Boutique. All rights reserved.</span>
        <div className="flex gap-5">
          {["Visa", "Mastercard", "MCB Juice", "myT Money"].map((p) => (
            <span
              key={p}
              className="rounded bg-[#2E1A18] px-2 py-0.5 text-[10px] font-bold tracking-wider text-coral-600/70"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-white">
        {title}
      </div>
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          prefetch={false}
          className="font-sans text-[13px] text-coral-600/80 transition-colors hover:text-coral-500"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
