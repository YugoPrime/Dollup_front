"use client";

import { useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";
import { getInstallPrompt, setInstallPrompt, subscribeInstallPrompt } from "./install-prompt";

/**
 * "Install the app" button. Renders nothing unless the browser has said the
 * store can be installed (Chrome/Edge/Samsung Internet on Android, desktop
 * Chrome). Hidden on iPhone, already-installed phones and the server render.
 */
export function InstallAppButton() {
  const event = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
  if (!event) return null;

  async function install() {
    const e = getInstallPrompt();
    if (!e) return;
    // prompt() works once per event; Chrome fires a fresh one if it is dismissed.
    setInstallPrompt(null);
    try {
      await e.prompt();
      await e.userChoice;
    } catch {
      /* Chrome's own banner already used this event */
    }
  }

  return (
    <button
      type="button"
      onClick={install}
      className="mt-3 flex min-h-11 items-center gap-1.5 rounded-md border border-coral-500/30 bg-white px-3 py-2 transition-colors hover:bg-coral-500/10"
    >
      <Smartphone size={14} className="text-coral-500" aria-hidden="true" />
      <span className="font-sans text-[12px] font-semibold tracking-wide text-coral-500">
        Install the Doll Up app
      </span>
    </button>
  );
}
