export default function AppLoading() {
  return (
    <div className="w-full animate-pulse">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="h-7 w-40 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        {[64, 88, 72].map((w) => (
          <div key={w} className="h-8 rounded-full bg-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Task card skeletons */}
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 h-4 w-24 rounded-full bg-muted" />
            <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
