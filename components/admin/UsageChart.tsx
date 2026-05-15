'use client'

interface DayData {
  date: string
  characters: number
}

export function UsageChart({ data }: { data: DayData[] }) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No data.</p>

  const max = Math.max(...data.map((d) => d.characters), 1)

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 bg-primary/70 rounded-t hover:bg-primary transition-colors"
            style={{ height: `${(d.characters / max) * 100}%`, minHeight: d.characters > 0 ? '2px' : undefined }}
            title={`${d.date}: ${d.characters.toLocaleString()} chars`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
