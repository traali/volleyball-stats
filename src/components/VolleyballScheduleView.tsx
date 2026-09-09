import type { VolleyballTeamFixture } from '../types/volleyball'

interface VolleyballScheduleViewProps {
  fixtures: VolleyballTeamFixture[]
  onSelectMatch?: (matchId: string) => void
}

export function VolleyballScheduleView({ fixtures, onSelectMatch }: VolleyballScheduleViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Otteluohjelma & Turnauspelit</h3>
        <p className="text-xs text-zinc-400">Joukkueen turnausviikonloput ja kenttätiedot</p>
      </div>

      <div className="space-y-2.5">
        {fixtures.map((fixture) => (
          <div
            key={fixture.id}
            onClick={() => onSelectMatch?.(fixture.id)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all backdrop-blur-md"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="font-mono">{fixture.date} klo {fixture.time}</span>
                {fixture.court && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 font-semibold text-[10px]">
                    {fixture.court}
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{fixture.homeTeam}</span>
                <span className="text-zinc-500 font-normal">vs</span>
                <span>{fixture.awayTeam}</span>
              </div>
            </div>

            <div className="text-right">
              {fixture.score ? (
                <div className="font-mono font-black text-amber-400 text-base px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800">
                  {fixture.score}
                </div>
              ) : (
                <span className="text-xs text-zinc-400 font-medium px-3 py-1 rounded-xl bg-zinc-800/60">
                  Tuleva
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
