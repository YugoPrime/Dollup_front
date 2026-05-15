"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMsg(
          data.error === "invalid_email"
            ? "Please enter a valid email."
            : "Couldn't subscribe. Try again in a moment.",
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setErrorMsg("Couldn't subscribe. Check your connection.");
      setStatus("error");
    }
  };

  const submitting = status === "submitting";
  const done = status === "success";

  return (
    <div className="w-full min-w-0 md:w-auto">
      <form
        onSubmit={onSubmit}
        style={{ width: "min(100%, 28rem)", maxWidth: "calc(100vw - 2.5rem)" }}
        className="flex w-full min-w-0 max-w-full items-center gap-1.5 rounded-full bg-white/15 p-1 pl-4 md:max-w-md md:min-w-80"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
        <input
          aria-label="Email address for newsletter"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={done}
          className="min-w-0 flex-1 bg-transparent font-sans text-[13px] text-white outline-none placeholder:text-white/70 disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={submitting || done}
          className="shrink-0 rounded-full bg-ink px-3 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60 sm:px-3.5"
        >
          {submitting ? "..." : done ? "Subscribed" : "Subscribe"}
        </button>
      </form>
      <p
        aria-live="polite"
        className="mt-1.5 min-h-[16px] font-sans text-[11px] text-white/85"
      >
        {status === "success"
          ? "Thanks — you're on the list."
          : status === "error"
            ? errorMsg
            : ""}
      </p>
    </div>
  );
}
