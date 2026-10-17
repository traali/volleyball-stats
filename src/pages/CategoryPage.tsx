import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DayScheduleView } from '../components/DayScheduleView'
import { LoadFailed, Loading } from '../components/LoadState'
import { noticeParts, stagesFromGroups } from '../domain/tournament'
import { useTaso, type TasoLoad } from '../hooks/useTaso'
import { fetchCategories, fetchCategoryMatches, fetchGroups } from '../services/discovery'

type Tab = 'groups' | 'days'

export function CategoryPage() {
  const { compId = '', catId = '' } = useParams()
  return <CategoryBody key={`${compId}/${catId}`} compId={compId} catId={catId} />
}

function CategoryBody({ compId, catId }: { compId: string; catId: string }) {
  const cats = useTaso(() => fetchCategories(compId), [compId])
  const groups = useTaso(() => fetchGroups(compId, catId), [compId, catId])
  const cat = cats.state === 'ok' ? cats.data.find((c) => c.id === catId) : undefined
  const tournamentLike = cat ? cat.type === 'tournament' || cat.playingMethod === 'mini-tournament' : false
  const [picked, setPicked] = useState<Tab | null>(null)
  const tab: Tab = picked || (tournamentLike ? 'days' : 'groups')
  const notice = noticeParts(cat?.notice)
  const name = cat?.name || (groups.state === 'ok' ? groups.data.categoryName : '') || catId
  const compName = cat?.competitionName || (groups.state === 'ok' ? groups.data.competitionName : '')

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <Link to={`/competition/${compId}`} className="text-[11px] uppercase tracking-wider text-amber-400">{compName || compId}</Link>
        <h1 className="text-2xl font-black">{name}</h1>
        {cat?.playingMethod === 'mini-tournament' && <p className="text-xs text-zinc-500">Pelataan turnauspäivinä.</p>}
      </div>
      {(notice.text || notice.links.length > 0) && (
        <div className="rounded-2xl border border-zinc-800 px-4 py-3 text-xs text-zinc-400 space-y-1 whitespace-pre-line">
          {notice.text && <p>{notice.text}</p>}
          {notice.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="block underline text-zinc-300 break-all">{l.label} ↗</a>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        {([['days', 'Ottelut päivittäin'], ['groups', 'Lohkot ja vaiheet']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setPicked(id)} className={`min-h-11 px-3 rounded-xl text-xs font-bold ${tab === id ? 'bg-amber-500/20 text-amber-200' : 'text-zinc-400 border border-zinc-800'}`}>{label}</button>
        ))}
      </div>
      {tab === 'groups' && <Groups compId={compId} catId={catId} load={groups} />}
      {tab === 'days' && <Days compId={compId} catId={catId} />}
    </main>
  )
}

function Groups({ compId, catId, load }: { compId: string; catId: string; load: TasoLoad<Awaited<ReturnType<typeof fetchGroups>>> }) {
  if (load.state === 'loading') return <Loading />
  if (load.state === 'failed') return <LoadFailed what="Lohkoja" onRetry={load.retry} />
  if (load.state !== 'ok') return null
  const stages = stagesFromGroups(load.data.groups)
  if (stages.length === 0) return <p className="text-sm text-zinc-500">TASOssa ei ole vielä lohkoja tälle sarjalle.</p>
  return (
    <div className="space-y-4">
      {stages.map((st) => (
        <section key={st.key} className="space-y-2">
          <h2 className="text-sm font-bold">{st.title}{st.kind === 'knockout' && !st.title.includes('Pudotuspelit') ? ' · pudotuspelit' : ''}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {st.groups.map((g) => (
              <li key={g.id}><Link to={`/group/${compId}/${catId}/${g.id}`} className="flex min-h-12 items-center rounded-xl border border-zinc-800 px-3 text-sm">{g.name}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Days({ compId, catId }: { compId: string; catId: string }) {
  const load = useTaso(() => fetchCategoryMatches(compId, catId), [compId, catId])
  if (load.state === 'loading') return <Loading text="Haetaan otteluita…" />
  if (load.state === 'failed') return <LoadFailed what="Otteluita" onRetry={load.retry} />
  if (load.state !== 'ok') return null
  if (load.data.length === 0) return <p className="text-sm text-zinc-500">TASOssa ei ole vielä otteluita tälle sarjalle.</p>
  return <DayScheduleView matches={load.data} showGroup />
}
