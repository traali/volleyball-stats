import { dateLabel, scheduleByDay } from '../domain/tournament'
import { MatchRow } from './MatchRow'

/** Games by day → hall → time and court. A youth tournament day reads like the paper schedule on the wall. */
export function DayScheduleView({ matches, showGroup = false }: { matches: Record<string, unknown>[]; showGroup?: boolean }) {
  const days = scheduleByDay(matches)
  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.date || 'tbd'} className="space-y-2">
          <h3 className="sticky top-14 z-10 bg-[#0a0b0e]/95 py-1 text-sm font-black text-amber-300">{dateLabel(day.date)}</h3>
          {day.venues.map((v) => (
            <div key={v.venue || 'courts'} className="space-y-1.5">
              {v.venue && <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{v.venue}</p>}
              <ul className="space-y-1.5">
                {v.matches.map((m, i) => (
                  <li key={String(m.match_id ?? i)}><MatchRow m={m} showGroup={showGroup} hideVenue={Boolean(v.venue)} /></li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
