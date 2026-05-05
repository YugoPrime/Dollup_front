const DEFAULT_REDIRECT = "/account";
const LOCAL_ORIGIN = "https://dollupboutique.local";

export function safeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_REDIRECT,
): string {
  const raw = value?.trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(raw, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
