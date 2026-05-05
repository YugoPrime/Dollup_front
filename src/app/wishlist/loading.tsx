export default function WishlistLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">
      <div className="h-10 w-56 rounded bg-blush-200" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white">
            <div className="aspect-[3/4] animate-pulse bg-blush-100" />
            <div className="space-y-2 p-3">
              <div className="h-3 rounded bg-blush-200" />
              <div className="h-3 w-1/2 rounded bg-blush-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
