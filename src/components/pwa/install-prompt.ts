// Holds Chrome's `beforeinstallprompt` event so the footer's install button can
// use it later. PwaSetup (mounted in the root layout) captures the event early,
// because it can fire before the footer has hydrated.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function setInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  deferred = event;
  listeners.forEach((l) => l());
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
