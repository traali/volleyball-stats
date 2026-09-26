import type { RallyPoint } from '../domain/rally'

export function PointTape({ points, homeId, home, away }: { points: RallyPoint[]; homeId: string; home: string; away: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-zinc-500">Ei pisteaikoja. Tulossa oleva ottelu ei saa keksittyä kelloa.</p>
  }
  return (
    <ol className="space-y-1">
      {points.map((p, i) => (
        <li key={`${p.period}-${p.wallTime}-${i}`} className="flex items-baseline gap-3 rounded-xl px-2 py-1.5 hover:bg-zinc-900">
          <span className="font-mono text-xs text-amber-300 w-16 shrink-0">{p.wallTime.slice(0, 8)}</span>
          <span className="text-[10px] text-zinc-500 w-10 shrink-0">{p.period}. erä</span>
          <span className="font-mono text-sm font-bold w-14 shrink-0">{p.score || '—'}</span>
          <span className="text-sm text-zinc-200 truncate">
            {p.shirt ? `#${p.shirt} ` : ''}{p.playerName || (p.teamId === homeId ? home : away)}
          </span>
        </li>
      ))}
    </ol>
  )
}
