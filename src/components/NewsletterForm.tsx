"use client";

export function NewsletterForm() {
  return (
    <form
      className="flex shrink-0"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        placeholder="Your email address"
        className="w-[260px] rounded-l bg-white px-4 py-3 font-sans text-sm text-ink outline-none"
      />
      <button
        type="submit"
        className="whitespace-nowrap rounded-r bg-ink px-5 py-3 font-sans text-[13px] font-semibold tracking-wide text-white"
      >
        Subscribe
      </button>
    </form>
  );
}
