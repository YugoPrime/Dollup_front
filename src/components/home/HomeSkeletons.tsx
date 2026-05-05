export function ProductRailSkeleton() {
  return (
    <section className="bg-blush-100 py-5 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <div className="h-8 w-40 rounded bg-blush-200" />
          <div className="h-4 w-20 rounded bg-blush-200" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 md:px-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[150px] shrink-0 md:w-[230px]">
              <div className="aspect-[3/4] animate-pulse rounded-xl bg-blush-200" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryIconSkeleton() {
  return (
    <section className="bg-white py-5 md:py-8">
      <div className="mx-auto flex max-w-[1200px] justify-between gap-3 px-4 md:px-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-[54px] w-[54px] animate-pulse rounded-full bg-blush-200 md:h-[88px] md:w-[88px]" />
            <div className="h-3 w-14 rounded bg-blush-200" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EssentialsSkeleton() {
  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1100px] px-4 md:px-10">
        <div className="mx-auto mb-6 h-9 w-56 rounded bg-blush-200" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_1fr_1fr] md:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-[200px] animate-pulse rounded-xl bg-blush-100 ${
                i === 0 ? "col-span-2 md:col-span-1 md:row-span-2 md:h-auto" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramSkeleton() {
  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1200px] px-4 md:px-10">
        <div className="mx-auto mb-6 h-9 w-64 rounded bg-blush-200" />
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-md bg-blush-100" />
          ))}
        </div>
      </div>
    </section>
  );
}
