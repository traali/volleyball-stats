import type { VolleyballStandingRow } from '../types/volleyball'

interface VolleyballStandingsTableProps {
  standings: VolleyballStandingRow[]
  highlightTeamId?: string
}

export function VolleyballStandingsTable({ standings, highlightTeamId }: VolleyballStandingsTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Sarjataulukko & Eräsuhteet</h3>
          <p className="text-xs text-zinc-400">Lentopalloliiton virallinen 3-2-1-0 pistejärjestelmä</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">FIVB Math</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Joukkue</th>
              <th className="py-2.5 px-2 text-center">O</th>
              <th className="py-2.5 px-2 text-center">V (3p)</th>
              <th className="py-2.5 px-2 text-center">V (2p)</th>
              <th className="py-2.5 px-2 text-center">H (1p)</th>
              <th className="py-2.5 px-2 text-center">H (0p)</th>
              <th className="py-2.5 px-3 text-center">Erät</th>
              <th className="py-2.5 px-2 text-center">Eräsuhde</th>
              <th className="py-2.5 px-2 text-center font-bold text-amber-400">Pisteet</th>
              <th className="py-2.5 px-3 text-center">Kunto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {standings.map((row) => {
              const isHighlighted = row.teamId === highlightTeamId
              return (
                <tr
                  key={row.teamId}
                  className={`transition-colors ${isHighlighted ? 'bg-amber-500/10 font-bold' : 'hover:bg-zinc-800/30'}`}
                >
                  <td className="py-2.5 px-3 text-center font-mono text-zinc-400">{row.rank}</td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{row.teamName}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-300">{row.matchesPlayed}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-300">{row.wins}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{row.winsTiebreak}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{row.lossesTiebreak}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-500">{row.losses}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-zinc-300">
                    {row.setsWon} - {row.setsLost}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">
                    {row.setQuotient >= 999 ? 'MAX' : row.setQuotient.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400 text-sm">
                    {row.totalPoints}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.form.map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
