import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/admin/orders";
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-blush-400 bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl text-ink">Admin login</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Enter the shared admin password to continue.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
