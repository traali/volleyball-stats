import { Link } from 'react-router-dom'
import { isForfeit, phaseOf, resultText } from '../domain/rally'
import { courtLabel, isTie, sideName, timeOf } from '../domain/tournament'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

/** One game in a list: time, court, teams, result. Never a result TASO did not record. */
export function MatchRow({ m, showDate = false, showGroup = false, hideVenue = false }: {
  m: Record<string, unknown>
  showDate?: boolean
  showGroup?: boolean
  hideVenue?: boolean
}) {
  const id = s(m.match_id)
  const home = sideName(m, 'A')
  const away = sideName(m, 'B')
  const result = resultText(m)
  const tie = isTie(m)
  const time = timeOf(m)
  const date = s(m.date).slice(0, 10)
  const court = courtLabel(m)
  const live = phaseOf(m.status) === 'live'
  const hall = s(m.venue_name)
  // Under a hall heading only the court is new information.
  const where = hideVenue && hall && !/^\d{1,4}$/.test(hall) ? court.split(' · ').filter((p) => p !== hall).join(' · ') : court
  const body = (
    <>
      <span className="flex items-baseline gap-2 text-xs text-zinc-500">
        <span className="font-mono text-amber-300/90">{showDate && date && !date.startsWith('0000') ? `${date} ` : ''}{time || 'klo ?'}</span>
        {where && <span className="truncate">{where}</span>}
        {showGroup && s(m.group_name) && <span className="ml-auto shrink-0 text-[11px]">{s(m.group_name)}</span>}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1">{home.name} – {away.name}</span>
        {live && <span className="text-[10px] font-bold uppercase text-rose-300">live</span>}
        {result && <span className="font-mono font-bold shrink-0">{isForfeit(m) ? 'luovutus' : result}{tie ? ' tasan' : ''}</span>}
      </span>
    </>
  )
  if (!id) return <div className="block rounded-xl border border-zinc-800 px-3 py-2 text-sm space-y-0.5">{body}</div>
  return (
    <Link to={`/match/${id}`} className="block rounded-xl border border-zinc-800 px-3 py-2 text-sm space-y-0.5 min-h-[44px]">
      {body}
    </Link>
  )
}
