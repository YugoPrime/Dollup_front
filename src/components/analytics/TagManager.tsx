import Script from "next/script";

// Renders the Google Tag Manager bootstrap + Consent Mode v2 default-denied
// state. Renders nothing when NEXT_PUBLIC_GTM_ID is unset, so the storefront
// works locally without analytics IDs and the production deploy can be
// activated by adding the env var in Coolify (no code change needed).

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// Inlined as a plain blocking <script> so it executes during HTML parsing,
// guaranteed before the async gtm.js loads. next/script `beforeInteractive` is
// only valid inside `pages/_document.js` (App Router warning).
const consentDefaultScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  personalization_storage: 'denied',
  functionality_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500,
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
`.trim();

function gtmScript(id: string) {
  return `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');
`.trim();
}

export function TagManager() {
  if (!GTM_ID) return null;
  return (
    <>
      <script
        id="dub-consent-default"
        dangerouslySetInnerHTML={{ __html: consentDefaultScript }}
      />
      <Script
        id="dub-gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: gtmScript(GTM_ID) }}
      />
    </>
  );
}

export function TagManagerNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
