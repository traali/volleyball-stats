import type { CourtRotation } from '../domain/rally'

export function RotationBoard({ rows, home, away }: { rows: CourtRotation[]; home: string; away: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">Ei pelipaikkoja tässä ottelussa.</p>
  }
  const periods = [...new Set(rows.map((r) => r.period))]
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-zinc-500">TASO:n kuusi paitaa erittäin, samassa järjestyksessä kuin pelipaikat. Libero erikseen. Tyhjää erää ei täytetä.</p>
      {periods.map((period) => (
        <section key={period} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">{period}. erä</h3>
          {rows.filter((r) => r.period === period).map((side) => (
            <div key={side.side}>
              <p className="text-[11px] text-zinc-400 mb-1">{side.side === 'A' ? home : away}{side.libero ? ` · libero #${side.libero}` : ''}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {side.shirts.map((shirt, i) => (
                  <div key={`${side.side}-${i}`} className="rounded-xl bg-zinc-950 border border-zinc-800 px-2 py-2 min-h-14">
                    <p className="text-[10px] text-zinc-500">{i + 1}</p>
                    <p className="text-sm font-bold text-white">#{shirt}</p>
                    <p className="text-[11px] text-zinc-300 truncate">{side.names[i]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
