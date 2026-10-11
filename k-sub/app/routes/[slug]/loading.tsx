export default function RouteLoading() {
  return (
    <main className="min-h-full flex-1">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="h-4 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]" />
        <div className="mt-10 space-y-4">
          <div className="h-3 w-40 animate-pulse rounded bg-[color-mix(in_srgb,var(--rail)_25%,transparent)]" />
          <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]" />
          <div className="h-5 w-56 animate-pulse rounded bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
        </div>
        <div className="mt-8 h-14 w-full animate-pulse rounded-2xl bg-[color-mix(in_srgb,#1a73e8_35%,transparent)]" />
        <div className="mt-14 space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/80" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/60" />
        </div>
      </div>
    </main>
  );
}
