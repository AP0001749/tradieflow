export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-80 rounded-md bg-muted/70" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="h-5 w-36 rounded bg-muted" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
