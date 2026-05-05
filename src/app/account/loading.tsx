export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8 md:py-12">
      <div className="h-10 w-48 rounded bg-blush-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-blush-300 bg-white p-5">
            <div className="h-4 w-24 rounded bg-blush-200" />
            <div className="mt-4 h-8 w-16 rounded bg-blush-100" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-48 rounded-xl border border-blush-300 bg-white" />
    </div>
  );
}
