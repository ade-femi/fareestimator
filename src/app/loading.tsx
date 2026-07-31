/** Skeleton shown while the landing page streams in. */
export default function Loading() {
  return (
    <main className="bg-hero-gradient min-h-dvh">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <div className="mb-10 space-y-3 text-center">
          <div className="mx-auto h-9 w-72 animate-pulse rounded-md bg-muted" />
          <div className="mx-auto h-5 w-80 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-[520px] animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </main>
  );
}
