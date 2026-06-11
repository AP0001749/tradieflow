export default function TablePageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-56 rounded-md bg-muted/70" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-20 rounded bg-muted" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0"
          >
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted/70" />
            <div className="h-5 w-16 rounded-full bg-muted/60" />
            <div className="ml-auto flex gap-2">
              <div className="h-7 w-14 rounded bg-muted/50" />
              <div className="h-7 w-7 rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
