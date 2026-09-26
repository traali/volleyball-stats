import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchGroup } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v) }

export function GroupPage() {
  const { compId = '', catId = '', groupId = '' } = useParams()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGroup>> | null>(null)
  useEffect(() => { fetchGroup(compId, catId, groupId).then(setData) }, [compId, catId, groupId])
  const teams = [...(data?.teams || [])].sort((a, b) => Number(a.current_standing || 99) - Number(b.current_standing || 99))
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-black">{data?.name || 'Lohko'}</h1>
      <p className="text-xs text-zinc-500">{data?.competition} / {data?.category}</p>
      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Joukkue</th>
              <th className="p-2">O</th>
              <th className="p-2">V3</th>
              <th className="p-2">V2</th>
              <th className="p-2">H</th>
              <th className="p-2">P</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={s(t.team_id)} className="border-t border-zinc-800">
                <td className="p-2">{s(t.current_standing)}</td>
                <td className="p-2"><Link to={`/team/${s(t.team_id)}`} className="text-amber-300">{s(t.team_name)}</Link></td>
                <td className="p-2 text-center">{s(t.matches_played)}</td>
                <td className="p-2 text-center">{s(t.matches_won)}</td>
                <td className="p-2 text-center">{s(t.matches_tiedwon)}</td>
                <td className="p-2 text-center">{s(t.matches_lost)}</td>
                <td className="p-2 text-center font-bold">{s(t.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-500">V3 on 3–0 ja 3–1 (3 pistettä). V2 on 3–2 (2 pistettä). H on suora tappio. 2–3 antaa yhden pisteen, kun TASO sen kentän palauttaa.</p>
      <h2 className="text-sm font-bold">Ottelut</h2>
      {(data?.matches.length || 0) === 0 && <p className="text-sm text-zinc-500">Ei otteluita vielä.</p>}
      <ul className="space-y-2">
        {(data?.matches || []).map((m) => (
          <li key={s(m.match_id)}>
            <Link to={`/match/${s(m.match_id)}`} className="block rounded-xl border border-zinc-800 px-3 py-2 text-sm">
              <span className="text-zinc-500">{s(m.date).slice(0, 10)} {s(m.time).slice(0, 5)} </span>
              {s(m.team_A_name)} – {s(m.team_B_name)}
              {(s(m.fs_A) || s(m.fs_B)) && <span className="font-mono"> {s(m.fs_A)}–{s(m.fs_B)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
