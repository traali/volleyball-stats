import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCategories } from '../services/discovery'

export function CompetitionPage() {
  const { compId = '' } = useParams()
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => { fetchCategories(compId).then(setRows) }, [compId])
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-black">Sarjat</h1>
      <p className="text-xs text-zinc-500">{compId}</p>
      {rows.length === 0 && <p className="text-sm text-zinc-500">Ei sarjoja, tai TASO ei vastannut.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}><Link to={`/competition/${compId}/category/${r.id}`} className="block rounded-2xl border border-zinc-800 px-4 py-3">{r.name}</Link></li>
        ))}
      </ul>
    </main>
  )
}
