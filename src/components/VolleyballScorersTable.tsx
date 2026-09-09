import type { VolleyballPlayerStat } from '../types/volleyball'

interface VolleyballScorersTableProps {
  players: VolleyballPlayerStat[]
}

export function VolleyballScorersTable({ players }: VolleyballScorersTableProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Joukkueen Pelaajat & Pisteet</h3>
        <p className="text-xs text-zinc-400">Pistetilasto: hyökkäykset, torjunnat ja ässät</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">Nro</th>
              <th className="py-2.5 px-3">Pelaaja</th>
              <th className="py-2.5 px-2">Rooli</th>
              <th className="py-2.5 px-2 text-center">Ottelut</th>
              <th className="py-2.5 px-2 text-center">Erät</th>
              <th className="py-2.5 px-2 text-center text-zinc-300">Hyökk.</th>
              <th className="py-2.5 px-2 text-center text-zinc-300">Torj.</th>
              <th className="py-2.5 px-2 text-center text-zinc-300">Ässät</th>
              <th className="py-2.5 px-3 text-center font-bold text-amber-400">Pisteet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {players.map((player) => (
              <tr key={player.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-2.5 px-3 text-center font-mono text-zinc-400 font-bold">#{player.jersey}</td>
                <td className="py-2.5 px-3 font-semibold text-white">{player.name}</td>
                <td className="py-2.5 px-2 text-zinc-400">{player.role}</td>
                <td className="py-2.5 px-2 text-center font-mono text-zinc-300">{player.matchesPlayed}</td>
                <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{player.setsPlayed}</td>
                <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{player.attackPoints ?? '-'}</td>
                <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{player.blockPoints ?? '-'}</td>
                <td className="py-2.5 px-2 text-center font-mono text-zinc-400">{player.acePoints ?? '-'}</td>
                <td className="py-2.5 px-3 text-center font-mono font-black text-amber-400 text-sm">
                  {player.pointsTotal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
