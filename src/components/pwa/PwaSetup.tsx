"use client";

import { useEffect } from "react";
import { isPreorderHost } from "@/lib/host";
import { setInstallPrompt, type BeforeInstallPromptEvent } from "./install-prompt";

/**
 * Registers /sw.js and keeps Chrome's install event for the footer button.
 *
 * It deliberately does NOT call preventDefault() on `beforeinstallprompt`, so
 * Chrome still shows its own "Install app" banner on Android; the footer button
 * is the fallback for shoppers who dismissed it.
 *
 * Skipped on the pre-order subdomain (a separate store) and in `next dev`
 * (a worker there would serve stale pages while developing).
 */
export function PwaSetup() {
  useEffect(() => {
    if (isPreorderHost(window.location.host)) return;

    const onPrompt = (e: Event) => setInstallPrompt(e as BeforeInstallPromptEvent);
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let onLoad: (() => void) | null = null;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
          /* no install prompt on this browser; the store works without it */
        });
      };
      // Wait for load so registration never competes with the hero image.
      if (document.readyState === "complete") register();
      else {
        onLoad = register;
        window.addEventListener("load", onLoad, { once: true });
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (onLoad) window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
