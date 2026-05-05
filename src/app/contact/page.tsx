import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Doll Up Boutique — WhatsApp, phone, email, opening hours and pickup location in Mauritius.",
};

const PHONE = "+230 5941 6359";
const PHONE_TEL = "+23059416359";
const WHATSAPP_URL = "https://wa.me/23059416359";
const EMAIL = "hello@dollupboutique.com";
const INSTAGRAM_URL = "https://www.instagram.com/dollupboutique/";
const FACEBOOK_URL = "https://www.facebook.com/dollupboutique/";

export default function ContactPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ We&apos;re here for you
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Contact{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              us
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            Question about a product, sizing, or your order? Check the FAQ first — most answers are there. Otherwise, drop us an email and we&apos;ll get back to you within a business day.
          </p>
        </div>
      </section>

      {/* Quick channels */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-[1100px] gap-5 md:grid-cols-3">
          <a
            href={`mailto:${EMAIL}`}
            className="group relative rounded-2xl border-2 border-coral-500 bg-white p-7 transition-shadow hover:shadow-[0_6px_20px_rgba(229,96,74,0.18)]"
          >
            <span className="absolute -top-3 left-7 rounded-full bg-coral-500 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Best way to reach us
            </span>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-coral-500">
              Email
            </p>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">
              Write to us
            </h2>
            <p className="font-sans text-[13px] text-ink-soft">{EMAIL}</p>
            <p className="mt-3 font-sans text-[12px] text-coral-500 group-hover:underline">
              Send an email →
            </p>
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-blush-300 bg-white p-7 transition-shadow hover:shadow-[0_4px_16px_rgba(229,96,74,0.10)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </div>
            <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              WhatsApp
            </p>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">
              Quick chat
            </h2>
            <p className="font-sans text-[13px] text-ink-soft">{PHONE}</p>
            <p className="mt-3 font-sans text-[12px] text-coral-500 group-hover:underline">
              Open in WhatsApp →
            </p>
          </a>

          <a
            href={`tel:${PHONE_TEL}`}
            className="group rounded-2xl border border-blush-300 bg-white p-7 transition-shadow hover:shadow-[0_4px_16px_rgba(229,96,74,0.10)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Phone
            </p>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">
              Call us
            </h2>
            <p className="font-sans text-[13px] text-ink-soft">{PHONE}</p>
            <p className="mt-3 font-sans text-[12px] text-coral-500 group-hover:underline">
              Tap to call →
            </p>
          </a>
        </div>

        {/* Live chat coming soon */}
        <div className="mx-auto mt-6 max-w-[1100px] rounded-2xl border border-dashed border-blush-400 bg-blush-100 p-5 text-center">
          <p className="font-sans text-[13px] text-ink-soft md:text-[14px]">
            <span className="mr-2 inline-block rounded-full bg-coral-500 px-2.5 py-0.5 font-bold uppercase tracking-[0.12em] text-[10px] text-white">
              Coming soon
            </span>
            Live chat directly on the website — instant answers, even outside office hours.
          </p>
        </div>
      </section>

      {/* Hours + location */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-2">
          <div>
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ Opening hours
            </p>
            <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[36px]">
              When we&apos;re online
            </h2>
            <dl className="mt-6 space-y-2.5 font-sans text-[14px] text-ink-soft">
              <div className="flex justify-between border-b border-blush-100 pb-2">
                <dt className="font-semibold text-ink">Monday – Friday</dt>
                <dd>9:00 – 17:00</dd>
              </div>
              <div className="flex justify-between border-b border-blush-100 pb-2">
                <dt className="font-semibold text-ink">Saturday</dt>
                <dd>By appointment</dd>
              </div>
              <div className="flex justify-between border-b border-blush-100 pb-2">
                <dt className="font-semibold text-ink">Sunday</dt>
                <dd>Closed</dd>
              </div>
            </dl>
            <p className="mt-5 font-sans text-[13px] leading-[1.55] text-ink-soft">
              Outside office hours? Drop us a WhatsApp anyway — we reply first thing the next morning.
            </p>
          </div>

          <div>
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ Pickup location
            </p>
            <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[36px]">
              Pereybere
            </h2>
            <p className="mt-6 font-sans text-[14px] leading-[1.55] text-ink-soft">
              Skip delivery and grab your order in person near Winners, Pereybere. We&apos;ll WhatsApp you the exact pickup time once your order is ready.
            </p>
            <ul className="mt-5 space-y-2 font-sans text-[13px] text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Free pickup, no minimum order
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Available Monday – Saturday
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Try-before-you-take on selected items (ask us)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Self-serve / FAQ link */}
      <section className="bg-ink px-6 py-12 text-white md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ★ Faster than messaging
          </p>
          <h2 className="font-display text-[28px] leading-[1.15] md:text-[40px]">
            Check the FAQ first
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] font-sans text-[14px] leading-[1.55] text-white/80 md:text-[15px]">
            Sizing, delivery, returns, payment — chances are we&apos;ve already answered it. It&apos;s the fastest way to get an answer.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/faq"
              className="rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Read the FAQ →
            </Link>
            <Link
              href="/track-order"
              className="rounded-full border border-white/40 bg-white/5 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-ink"
            >
              Track an order
            </Link>
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="bg-ink px-6 py-12 text-white md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ★ Follow us
          </p>
          <h2 className="font-display text-[24px] leading-[1.2] md:text-[32px]">
            DM us on{" "}
            <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
              social
            </em>
          </h2>
          <p className="mx-auto mt-3 max-w-[480px] font-sans text-[13px] leading-[1.55] text-white/80 md:text-[14px]">
            Slide into our DMs for styling tips, restock alerts and giveaway entries.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Instagram
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/40 bg-white/5 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-ink"
            >
              Facebook
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
