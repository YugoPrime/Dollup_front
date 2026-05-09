import type { Metadata } from "next";
import Link from "next/link";
import { CookieManager } from "./CookieManager";

export const metadata: Metadata = {
  title: "Cookie preferences",
  description:
    "Manage how Doll Up Boutique uses cookies on your device — accept, reject, or reset your choice.",
  alternates: { canonical: "/privacy/cookies" },
  openGraph: {
    title: "Cookie preferences — Doll Up Boutique",
    description: "Manage your cookie choice for dollupboutique.com.",
    url: "/privacy/cookies",
  },
};

export default function CookiePreferencesPage() {
  return (
    <div className="bg-cream">
      <section className="bg-blush-100 px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">
            Privacy
          </p>
          <h1 className="font-display text-[32px] leading-[1.05] text-ink md:text-[48px]">
            Cookie preferences
          </h1>
          <p className="mt-3 font-sans text-[14px] text-ink-soft">
            Choose how cookies work for you on dollupboutique.com.
          </p>
        </div>
      </section>

      <article className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px] space-y-8 font-sans text-[14px] leading-[1.7] text-ink-soft">
          <CookieManager />

          <section>
            <h2 className="mb-2 font-display text-[20px] font-semibold text-ink md:text-[24px]">
              What each category does
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-ink">Strictly necessary</dt>
                <dd className="mt-1">
                  Required for the cart, checkout and login to work. Always on
                  — they store your session and basket. Disabling them breaks
                  the site, so they aren&apos;t something you can opt out of.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Analytics</dt>
                <dd className="mt-1">
                  Google Analytics 4 helps us understand which products and
                  pages you use most, so we can keep improving the shop. No
                  personally identifying information is collected when you
                  reject.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Marketing</dt>
                <dd className="mt-1">
                  Meta Pixel lets us show you Doll Up Boutique pieces on
                  Instagram and Facebook based on what caught your eye on the
                  site. Reject this and you&apos;ll see generic ads instead.
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[20px] font-semibold text-ink md:text-[24px]">
              How your choice is stored
            </h2>
            <p>
              Your choice lives in your browser&apos;s local storage on this
              device only. It isn&apos;t shared with any account. If you
              clear your browser data or open the site in a different browser
              or incognito window, you&apos;ll be asked again.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-[20px] font-semibold text-ink md:text-[24px]">
              Changing your mind
            </h2>
            <p>
              Come back to this page any time to update your choice. The
              banner at the bottom of the page is also bookmarkable via the
              &ldquo;Manage cookies&rdquo; link in the footer of every page.
            </p>
          </section>

          <p className="border-t border-blush-100 pt-6 text-[12px] text-ink-muted">
            Read the full{" "}
            <Link href="/privacy" className="underline hover:text-coral-500">
              Privacy Policy
            </Link>{" "}
            for the legal details on how we collect, use and protect your
            data under the Mauritius Data Protection Act 2017.
          </p>
        </div>
      </article>
    </div>
  );
}
