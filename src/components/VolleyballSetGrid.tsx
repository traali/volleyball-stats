import type { VolleyballSet } from '../types/volleyball'

interface VolleyballSetGridProps {
  sets: VolleyballSet[]
  homeTeamName: string
  awayTeamName: string
}

export function VolleyballSetGrid({ sets, homeTeamName, awayTeamName }: VolleyballSetGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Eräkohtaiset Tulokset</h3>
        <span className="text-[11px] text-zinc-400">25p erät (5. erä 15p) • +2p deuce-ero</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {sets.map((set) => {
          const homeWon = set.homeScore > set.awayScore
          const awayWon = set.awayScore > set.homeScore
          const isDeuce = (set.number <= 4 && (set.homeScore > 25 || set.awayScore > 25)) ||
                          (set.number === 5 && (set.homeScore > 15 || set.awayScore > 15))

          return (
            <div
              key={set.number}
              className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3 shadow-inner space-y-2 backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-semibold">{set.number}. erä</span>
                {isDeuce && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase tracking-wide">
                    Jatkopallot
                  </span>
                )}
                {set.duration && <span className="font-mono text-[10px] text-zinc-500">{set.duration}</span>}
              </div>

              <div className="space-y-1 text-sm">
                <div className={`flex items-center justify-between font-mono ${homeWon ? 'font-black text-amber-400' : 'text-zinc-300'}`}>
                  <span className="truncate text-xs mr-2">{homeTeamName}</span>
                  <span>{set.homeScore}</span>
                </div>
                <div className={`flex items-center justify-between font-mono ${awayWon ? 'font-black text-blue-400' : 'text-zinc-300'}`}>
                  <span className="truncate text-xs mr-2">{awayTeamName}</span>
                  <span>{set.awayScore}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
