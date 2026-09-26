import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchGroups } from '../services/discovery'

export function CategoryPage() {
  const { compId = '', catId = '' } = useParams()
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => { fetchGroups(compId, catId).then(setRows) }, [compId, catId])
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-black">{catId}</h1>
      {rows.length === 0 && <p className="text-sm text-zinc-500">Ei lohkoja.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}><Link to={`/group/${compId}/${catId}/${r.id}`} className="block rounded-2xl border border-zinc-800 px-4 py-3">{r.name}</Link></li>
        ))}
      </ul>
    </main>
  )
}
