"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    // No backend integration yet — just simulate success briefly
    setTimeout(() => {
      setEmail("");
      setBusy(false);
    }, 600);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-[440px] items-center gap-1.5 rounded-full bg-white/15 p-1 pl-4"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 bg-transparent font-sans text-[13px] text-white outline-none placeholder:text-white/70"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-ink px-3.5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "..." : "Subscribe"}
      </button>
    </form>
  );
}
