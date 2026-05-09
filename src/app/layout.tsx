import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { WishlistAuthSync } from "@/components/wishlist/WishlistAuthSync";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = "https://dollupboutique.com";
const SITE_DESCRIPTION =
  "Doll Up Boutique is a Mauritius fashion boutique for dresses, lingerie, beachwear and accessories, with cash on delivery available island-wide.";
const DEFAULT_OG_IMAGE = "/og-default.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Doll Up Boutique",
    template: "%s — Doll Up Boutique",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Doll Up Boutique",
    title: "Doll Up Boutique",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_MU",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Doll Up Boutique Mauritius fashion boutique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Doll Up Boutique",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  // Pre-launch: keep global noindex until the domain move is complete.
  robots: { index: false, follow: false, nocache: true },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Doll Up Boutique",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    "https://www.instagram.com/dollupboutique/",
    "https://www.facebook.com/dollupboutique/",
    "https://www.tiktok.com/@dollupboutique",
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "MU",
    addressLocality: "Mauritius",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Doll Up Boutique",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/shop?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-MU"
      className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.dollupboutique.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.dollupboutique.com" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd) }}
        />
        <a href="#site-content" className="skip-to-content">
          Skip to content
        </a>
        <CartProvider>
          <WishlistAuthSync />
          <Header />
          <main id="site-content" className="flex-1 animate-fade-up">
            <div className="pb-[64px] md:pb-0">{children}</div>
          </main>
          <Footer />
          <MobileBottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
