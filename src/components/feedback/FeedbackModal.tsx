"use client";

import { useEffect, useId, useRef, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  onClose: () => void;
};

export function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const headingId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setErrorMsg("Tell us a little more — at least a few words.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          email: email.trim() || undefined,
          page: typeof window !== "undefined" ? window.location.href : "",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "",
          website,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMsg(
          data.error === "invalid_email"
            ? "Please enter a valid email."
            : "Couldn't send. Try again in a moment.",
        );
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Couldn't send. Check your connection.");
      setStatus("error");
    }
  };

  const submitting = status === "submitting";
  const done = status === "success";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="font-display text-xl text-ink">
              {done ? "Thank you" : "Share feedback"}
            </h2>
            <p className="mt-1 font-sans text-[13px] text-ink-muted">
              {done
                ? "We've received your note — we read every one."
                : "Spotted a bug or have an idea? Let us know."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback form"
            className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition hover:bg-blush-100 hover:text-ink"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-ink px-5 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-coral-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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

            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Your message
              </span>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={5}
                maxLength={4000}
                rows={5}
                placeholder="What's not working, or what would make this better?"
                className="w-full resize-y rounded-2xl border border-blush-400 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-coral-500 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Email (optional, if you want a reply)
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-full border border-blush-400 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-coral-500 focus:bg-white"
              />
            </label>

            {status === "error" && errorMsg && (
              <p
                aria-live="polite"
                className="font-sans text-[12px] text-coral-700"
              >
                {errorMsg}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-coral-500 px-5 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-coral-700 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send feedback"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted transition hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
