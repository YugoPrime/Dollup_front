// Single source of truth for "is this request the pre-order subdomain?".
// Used by proxy.ts (rewriting) and the root layout (suppressing apex chrome).

const PREORDER_HOSTS: ReadonlySet<string> = new Set([
  "preorder.dollupboutique.com",
  "preorder.localhost:3000",
]);

export function isPreorderHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return PREORDER_HOSTS.has(host);
}
