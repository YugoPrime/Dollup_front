export default function ShopLoading() {
  return (
    <div>
      <div className="border-b border-blush-100 bg-white px-4 py-4 md:px-8 md:py-6">
        <div className="h-3 w-28 rounded bg-blush-200" />
        <div className="mt-3 h-10 w-64 rounded bg-blush-200" />
        <div className="mt-2 h-3 w-24 rounded bg-blush-200" />
      </div>
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-3 px-4 py-4 md:grid-cols-4 md:gap-4 md:px-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white">
            <div className="aspect-[3/4] animate-pulse bg-blush-100" />
            <div className="space-y-2 p-3">
              <div className="h-3 rounded bg-blush-200" />
              <div className="h-3 w-2/3 rounded bg-blush-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
