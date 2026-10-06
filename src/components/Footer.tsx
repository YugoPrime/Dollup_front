import Link from "next/link";
import Image from "next/image";
import { FOOTER_SHOP, FOOTER_HELP, FOOTER_ABOUT, FOOTER_LEGAL } from "@/lib/nav";
import { getStoreConfig } from "@/lib/store-config";
import { NewsletterForm } from "./NewsletterForm";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";
import { FooterCol } from "@/components/FooterCol";

export async function Footer() {
  const cfg = await getStoreConfig();

  return (
    <footer className="bg-cream text-ink">
      <section className="bg-coral-500 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1100px] min-w-0 flex-col gap-8 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="min-w-0 md:flex-1">
            <p className="mb-1.5 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
              Stay in the loop
            </p>
            <h3 className="max-w-2xl break-words font-display text-[22px] font-semibold leading-snug text-white">
              Get early access to new drops{" "}
              <span className="block sm:inline">&amp; exclusive offers</span>
            </h3>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1100px] gap-4 px-6 pb-10 pt-12 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-10 md:px-8 md:pt-14">
        <div className="flex flex-col items-start">
          <Image
            src="/logo.png"
            alt="Doll Up Boutique"
            width={260}
            height={224}
            sizes="111px"
            className="mb-3 h-24 w-auto"
          />
          <p className="mb-3 max-w-[240px] font-sans text-[14px] leading-relaxed text-ink-soft">
            Your go-to for fashion, lingerie &amp; beachwear since 2018.
          </p>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-0">
            <a
              href={cfg.store.facebook_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Doll Up Boutique on Facebook"
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-coral-500 transition-colors hover:text-coral-700"
            >
              Facebook
            </a>
            <a
              href={cfg.store.instagram_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Doll Up Boutique on Instagram"
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-coral-500 transition-colors hover:text-coral-700"
            >
              Instagram
            </a>
            <a
              href={cfg.store.tiktok_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Doll Up Boutique on TikTok"
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-coral-500 transition-colors hover:text-coral-700"
            >
              TikTok
            </a>
            <a
              href={cfg.store.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Doll Up Boutique on WhatsApp"
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-coral-500 transition-colors hover:text-coral-700"
            >
              WhatsApp
            </a>
          </div>
          <div className="mb-4 flex flex-col font-sans text-[14px] text-ink-soft">
            <a
              href={`mailto:${cfg.store.contact_email}`}
              className="inline-flex min-h-10 items-center transition-colors hover:text-coral-500"
            >
              {cfg.store.contact_email}
            </a>
            <a
              href={cfg.store.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center transition-colors hover:text-coral-500"
            >
              {cfg.store.contact_phone}
            </a>
            <p className="pt-1">{cfg.store.contact_hours}</p>
          </div>
          <Link
            href="/loyalty"
            prefetch={false}
            className="flex min-h-11 items-center gap-1.5 rounded-md border border-coral-500/30 bg-coral-500/10 px-3 py-2 transition-colors hover:bg-coral-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#C64A36" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-sans text-[12px] font-semibold tracking-wide text-coral-500">
              Doll Rewards — Join &amp; earn points
            </span>
          </Link>
        </div>

        <FooterCol title="Shop" links={FOOTER_SHOP} />
        <FooterCol title="Help" links={FOOTER_HELP} />
        <FooterCol title="About" links={FOOTER_ABOUT} />
      </div>

      <div className="mx-auto flex max-w-[1100px] min-w-0 flex-col gap-3 border-t border-blush-300 px-6 py-5 font-sans text-[12px] text-ink-muted md:flex-row md:flex-wrap md:items-center md:justify-between md:px-8">
        <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
          <span>© {new Date().getFullYear()} {cfg.store.footer_copyright}</span>
          <span className="hidden md:inline text-ink-muted/60">·</span>
          <span>
            Website by{" "}
            <a
              href="https://influxe.agency"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-coral-500 transition-colors hover:text-coral-700"
            >
              Influxe.agency
            </a>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Juice", "Bank Transfer", "Cash on Delivery"].map((p) => (
            <span
              key={p}
              className="rounded bg-white px-2.5 py-1 text-[11px] font-bold tracking-wider text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Legal links row */}
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-0 border-t border-blush-100 px-6 py-2 font-sans text-[12px] text-ink-muted md:px-8">
        {FOOTER_LEGAL.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            prefetch={false}
            className="inline-flex min-h-11 items-center transition-colors hover:text-coral-500"
          >
            {l.label}
          </Link>
        ))}
        <FeedbackLink className="inline-flex min-h-11 items-center font-sans text-[12px] text-ink-muted transition-colors hover:text-coral-500" />
      </div>
    </footer>
  );
}
