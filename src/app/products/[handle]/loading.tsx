export default function ProductLoading() {
  return (
    <div>
      <div className="px-4 py-3 md:px-8 md:py-4">
        <div className="h-3 w-56 rounded bg-blush-200" />
      </div>
      <div className="mx-auto grid max-w-[1280px] gap-6 px-0 pb-8 md:grid-cols-[1fr_480px] md:gap-8 md:px-8 md:pb-12">
        <div className="aspect-[3/4] animate-pulse bg-blush-100 md:rounded-xl" />
        <div className="space-y-4 px-4 md:px-0">
          <div className="h-4 w-24 rounded bg-blush-200" />
          <div className="h-10 w-3/4 rounded bg-blush-200" />
          <div className="h-5 w-32 rounded bg-blush-200" />
          <div className="h-12 rounded bg-blush-200" />
          <div className="h-40 rounded bg-blush-100" />
        </div>
      </div>
    </div>
  );
}
