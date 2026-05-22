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

// Lazy-load GTM (which in turn loads the FB Pixel tag) so the main thread is
// free for LCP. We wait for the first user interaction OR ~3.5s of idle time —
// whichever comes first — then inject the GTM bootstrap. Until then, calls to
// `dataLayer.push(...)` from analytics.ts queue normally and are replayed when
// gtm.js eventually loads (standard GTM behavior).
//
// Why this is safe:
//   * Consent Mode defaults are already set by the inline `consentDefaultScript`
//     above, so anything GTM eventually fires respects denied defaults.
//   * GA4 / Pixel tags inside GTM read the queued dataLayer entries in order
//     once the container loads, so no events are lost — they just fire late.
//   * Page-view tracking via RouteChangeTracker still pushes to dataLayer; the
//     pageview tag inside GTM replays it on load.
function gtmLazyScript(id: string) {
  return `
(function(w,d,s,l,i){
  var loaded=false;
  function load(){
    if(loaded)return;loaded=true;
    w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),
        dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
    cleanup();
  }
  function cleanup(){
    EVENTS.forEach(function(ev){w.removeEventListener(ev,load,OPTS);});
    if(idleHandle){(w.cancelIdleCallback||w.clearTimeout)(idleHandle);}
    if(timeoutHandle){w.clearTimeout(timeoutHandle);}
  }
  var EVENTS=['scroll','mousemove','touchstart','keydown','click','pointerdown'];
  var OPTS={passive:true,once:true,capture:true};
  EVENTS.forEach(function(ev){w.addEventListener(ev,load,OPTS);});
  var idleHandle=null,timeoutHandle=null;
  if(w.requestIdleCallback){
    idleHandle=w.requestIdleCallback(load,{timeout:5000});
  }
  // Hard fallback so analytics still loads on a session with zero interaction
  // (bots, tabs left open, etc.) — 3.5s after onload.
  function armFallback(){timeoutHandle=w.setTimeout(load,3500);}
  if(d.readyState==='complete'){armFallback();}
  else{w.addEventListener('load',armFallback,{once:true});}
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
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: gtmLazyScript(GTM_ID) }}
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
