import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Set a new password for your Doll Up Boutique account.",
};

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:py-16">
      <Suspense
        fallback={
          <div className="rounded-xl border border-blush-300 bg-white p-8" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
