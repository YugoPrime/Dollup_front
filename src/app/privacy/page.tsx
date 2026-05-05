import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Doll Up Boutique collects, uses, stores and protects your personal data, in line with the Mauritius Data Protection Act 2017.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-blush-100 px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">
            Legal
          </p>
          <h1 className="font-display text-[32px] leading-[1.05] text-ink md:text-[48px]">
            Privacy Policy
          </h1>
          <p className="mt-3 font-sans text-[12px] text-ink-muted">
            Last updated: May 2026
          </p>
        </div>
      </section>

      <article className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px] space-y-10 font-sans text-[14px] leading-[1.7] text-ink-soft">

          <Section number="1" title="Who we are">
            <p>
              This Privacy Policy applies to <strong>dollupboutique.com</strong> (the &ldquo;Site&rdquo;), operated by <strong>Doll Up Boutique Limited</strong>, BRN C18159019, VAT 27646277, registered in Quatre Bornes, Mauritius. We are the &ldquo;data controller&rdquo; of the personal information described below.
            </p>
            <p>
              For any privacy-related question, contact us at{" "}
              <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a>.
            </p>
          </Section>

          <Section number="2" title="What we collect">
            <p>We collect only the information needed to run the shop and serve our customers:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Account info:</strong> first name, last name, email, password (hashed), and optionally phone number — when you register an account.</li>
              <li><strong>Order info:</strong> billing and shipping address, phone, items ordered, payment method, and order notes you add.</li>
              <li><strong>Wishlist &amp; cart:</strong> the items you save are stored against your account if signed in, otherwise locally in your browser.</li>
              <li><strong>Communications:</strong> the content of messages you send us by email, WhatsApp, Instagram or Facebook.</li>
              <li><strong>Technical data:</strong> device, browser, IP address, pages visited, and timestamps — collected automatically through cookies and server logs to keep the site fast and secure.</li>
            </ul>
          </Section>

          <Section number="3" title="How we use your data">
            <p>We use your data to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Process and deliver your orders, and contact you about them.</li>
              <li>Provide customer support before and after sale.</li>
              <li>Operate features such as account, wishlist, order tracking and saved addresses.</li>
              <li>Send transactional emails (order confirmations, delivery updates, password resets).</li>
              <li>If you opted in: send marketing emails about new drops, sales and giveaways. You can unsubscribe at any time.</li>
              <li>Improve the site, prevent fraud, and meet our legal obligations.</li>
            </ul>
          </Section>

          <Section number="4" title="Legal bases">
            <p>Under the Mauritius Data Protection Act 2017, we process your data on the following bases:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Contract</strong> — to fulfil your order and account.</li>
              <li><strong>Consent</strong> — when you opt in to marketing emails or non-essential cookies.</li>
              <li><strong>Legitimate interest</strong> — to keep the site secure, prevent abuse, and improve our service.</li>
              <li><strong>Legal obligation</strong> — when we must keep records (e.g. for tax or accounting).</li>
            </ul>
          </Section>

          <Section number="5" title="Who we share data with">
            <p>We don&apos;t sell your data. We share it only with the providers we need to run the shop:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Hosting &amp; infrastructure:</strong> Coolify, Cloudflare.</li>
              <li><strong>Couriers:</strong> our delivery driver and Mauritius Post — to deliver your parcel.</li>
              <li><strong>Payment proof channels:</strong> Juice, bank transfer, myT Money — when you send proof of payment.</li>
              <li><strong>Email service</strong> (when enabled) — to send transactional and (if you opted in) marketing emails.</li>
              <li><strong>Authorities</strong> — if compelled by law (police, courts, tax authorities).</li>
            </ul>
            <p>Each of these only receives the minimum data needed for the task.</p>
          </Section>

          <Section number="6" title="How long we keep it">
            <p>
              Account data is kept for as long as your account is active. Order data is kept for up to <strong>10 years</strong> to meet accounting and tax obligations. Marketing data is kept until you unsubscribe. Server logs are typically purged within 90 days.
            </p>
          </Section>

          <Section number="7" title="Cookies">
            <p>We use cookies and similar technologies for three things:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Strictly necessary</strong> — to make the site work (login session, cart, security).</li>
              <li><strong>Functional</strong> — to remember your preferences (region, recently viewed).</li>
              <li><strong>Analytics</strong> — to understand which pages people use most so we can improve them. We don&apos;t use ad-tracking cookies.</li>
            </ul>
            <p>You can disable cookies in your browser, but some parts of the site (cart, checkout, login) won&apos;t work without the necessary ones.</p>
          </Section>

          <Section number="8" title="Your rights">
            <p>Under the Mauritius Data Protection Act 2017 you have the right to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Ask what data we hold about you (right of access).</li>
              <li>Have inaccurate data corrected (rectification).</li>
              <li>Have your data erased when no longer needed (deletion).</li>
              <li>Restrict or object to certain uses (e.g. marketing).</li>
              <li>Receive a copy of your data in a portable format.</li>
              <li>Withdraw consent at any time, where we relied on consent.</li>
              <li>Lodge a complaint with the Mauritius Data Protection Office.</li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a>.
              We&apos;ll respond within 30 days.
            </p>
          </Section>

          <Section number="9" title="Security">
            <p>
              We use industry-standard measures — HTTPS encryption, hashed passwords, role-based admin access, and regular backups — to protect your data. No system is perfect, so if we ever discover a breach that affects you we will notify you and the Data Protection Office without undue delay.
            </p>
          </Section>

          <Section number="10" title="Children">
            <p>
              The site is intended for adults. We do not knowingly collect data from anyone under 18. If you believe a minor has signed up, contact us and we&apos;ll delete the account.
            </p>
          </Section>

          <Section number="11" title="International transfers">
            <p>
              Some of our service providers (e.g. hosting, email) are based outside Mauritius. When data is transferred abroad we ensure it is to providers that offer an adequate level of data protection.
            </p>
          </Section>

          <Section number="12" title="Changes to this policy">
            <p>
              We may update this policy occasionally. The &ldquo;Last updated&rdquo; date at the top will reflect the most recent change. Material changes will be communicated by email or a notice on the site.
            </p>
          </Section>

          <Section number="13" title="Contact">
            <p>
              Doll Up Boutique Limited<br />
              Quatre Bornes, Mauritius<br />
              Email: <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a><br />
              WhatsApp: <a href="https://wa.me/23059416359" target="_blank" rel="noreferrer" className="text-coral-500 hover:underline">+230 5941 6359</a>
            </p>
          </Section>

        </div>
      </article>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24" id={`s-${number}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-[20px] text-coral-500">{number}.</span>
        <h2 className="font-display text-[24px] leading-tight text-ink md:text-[28px]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
