import { Link } from 'react-router-dom'
import { RotationAnalysisView } from './GameFlow'
import type { RotationAnalysis } from '../domain/gameFlow'
import { actualRotation, type GameLine, type LikelyRotation, type RosterPlayer, type TeamSeason } from '../domain/preview'

export interface PreviewData {
  lineupPublished: boolean
  teams: Array<{ id: string; name: string; roster: RosterPlayer[] | null; recent: GameLine[] | null; season: TeamSeason | null; rotation?: LikelyRotation | null; rotationStats?: RotationAnalysis | null }>
  h2h: GameLine[] | null
  /** Previous season id ('2025-26') and club-vs-club games then. */
  prevSeason?: string
  h2hPrev?: GameLine[]
  standings: TeamSeason[] | null
  previousGames: Array<{ team: string; games: Record<string, unknown>[] }>
}

const NONE = 'text-sm text-zinc-500'

export function MatchPreview({ data, raw }: { data: PreviewData; raw?: Record<string, unknown> | null }) {
  const [a, b] = data.teams
  return (
    <div className="space-y-5" data-testid="match-preview">
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">Joukkueiden kausi</h2>
        <div className="grid grid-cols-2 gap-2">
          {data.teams.map((t) => (
            <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5 text-xs space-y-0.5">
              <p className="font-bold text-amber-300 truncate">{t.name}</p>
              {t.season ? (
                <>
                  <p>{t.season.standing}. sija · {t.season.points} p</p>
                  <p className="text-zinc-400">{t.season.played} ott · {t.season.won} V · {t.season.lost} H</p>
                  <p className="text-zinc-400">Erät {t.season.setsFor}–{t.season.setsAgainst}</p>
                  <p className="text-zinc-400">Pallot {t.season.ballsFor}–{t.season.ballsAgainst}</p>
                </>
              ) : <p className="text-zinc-500">Ei tietoa</p>}
            </div>
          ))}
        </div>
      </section>

      {data.teams.map((t) => (
        <section key={`rot-${t.id}`} className="space-y-2" data-testid={`rotation-${t.id}`}>
          {(() => { const act = actualRotation(raw ?? null, t.id); return <>
            <h2 className="text-sm font-bold text-white">{act ? 'Aloituskierto (toteutunut 1. erä)' : 'Todennäköinen aloituskierto'}: {t.name}</h2>
            <Rotation r={act || t.rotation} roster={t.roster} published={data.lineupPublished} />
          </> })()}
          <RotationAnalysisView title="Kierrot viimeisissä otteluissa" a={t.rotationStats ?? null} />
        </section>
      ))}

      {data.teams.map((t) => (
        <section key={t.id} className="space-y-2" data-testid={`roster-${t.id}`}>
          <h2 className="text-sm font-bold text-white">Pelaajat: {t.name}</h2>
          <p className="text-[11px] text-zinc-500">
            {data.lineupPublished ? 'Ottelun kokoonpano julkaistu. Harmaana joukkueen pelaajat, jotka eivät ole kokoonpanossa.' : 'Ottelun kokoonpanoa ei ole vielä julkaistu: koko joukkue.'}
            {' '}Pist = kauden pisteet tässä lohkossa (TASO). Erät = erät kentällä (aloituskokoonpanossa tai vaihdettu sisään), Vaihdossa = erät kokoonpanossa mutta ei kentällä; lasketaan lohkon otteluiden eräkokoonpanoista ja vaihdoista (libero vain, jos TASO on kirjannut sen). +? = erät otteluista ilman eräkokoonpanotietoa. P/O = pisteet/ottelu, P/E = pisteet/erä kentällä. {data.prevSeason ? `${data.prevSeason} = edellinen kausi (pist / ott, kaikki sarjat).` : ''}
          </p>
          {!t.roster ? <p className={NONE}>Ei tietoa: pelaajalistaa ei saatu.</p> : t.roster.length === 0 ? <p className={NONE}>Ei tietoa: joukkueelle ei ole ilmoitettu pelaajia.</p> : (
            <table className="w-full text-xs">
              <thead className="text-zinc-500"><tr><th className="text-left py-1 w-8">#</th><th className="text-left">Pelaaja</th><th className="text-right">Ott</th><th className="text-right">Pist</th><th className="text-right">Erät</th><th className="text-right" title="Erät kokoonpanossa, ei kentällä">Vaihdossa</th><th className="text-right">P/O</th><th className="text-right">P/E</th><th className="text-right pl-2">{data.prevSeason || 'Ed. kausi'}</th></tr></thead>
              <tbody>
                {t.roster.map((p) => (
                  <tr key={p.id} data-in-lineup={p.inLineup ? '1' : '0'} className={`border-t border-zinc-800 ${p.inLineup ? '' : 'opacity-40'}`}>
                    <td className="py-1.5 font-mono text-zinc-400">{p.number || '–'}</td>
                    <td><Link className="hover:text-amber-300" to={`/player/${p.id}`}>{p.name}</Link>{p.inLineup ? '' : <span className="ml-1 text-[10px] text-zinc-500">ei kokoonpanossa</span>}<PerGame p={p} /></td>
                    <td className="text-right text-zinc-400">{p.matches ?? '–'}</td>
                    <td className="text-right font-bold">{p.points ?? <span className="font-normal text-zinc-500">ei tietoa</span>}</td>
                    <td className="text-right text-zinc-400" data-testid="season-sets" title={p.tasoSets != null ? `TASO: ${p.tasoSets} erää kokoonpanossa` : undefined}>{p.sets ?? '–'}{p.setsUnknown ? '+?' : ''}</td>
                    <td className="text-right text-zinc-500" data-testid="season-bench">{p.setsBench ?? '–'}</td>
                    <td className="text-right text-zinc-400">{p.matches && p.points != null ? (p.points / p.matches).toFixed(1) : '–'}</td>
                    <td className="text-right text-zinc-400">{p.sets && p.points != null ? (p.points / p.sets).toFixed(1) : '–'}</td>
                    <td className="text-right pl-2" data-testid="prev-season"><Prev p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {data.teams.map((t) => (
        <section key={t.id} className="space-y-1">
          <h2 className="text-sm font-bold text-white">Viimeisimmät ottelut: {t.name}</h2>
          {!t.recent ? <p className={NONE}>Ei tietoa: otteluita ei saatu.</p> : t.recent.length === 0 ? <p className={NONE}>Ei tietoa: ei pelattuja otteluita tällä kaudella.</p> : <Games rows={t.recent} />}
        </section>
      ))}

      <section className="space-y-1">
        <h2 className="text-sm font-bold text-white">Keskinäiset ottelut</h2>
        {!data.h2h || data.h2h.length === 0 ? <p className={NONE}>Ei tietoa: {a?.name} ja {b?.name} eivät ole kohdanneet tällä kaudella.</p> : <Games rows={data.h2h} />}
        {data.prevSeason && (data.h2hPrev && data.h2hPrev.length
          ? <><p className="text-[11px] text-zinc-500">Kausi {data.prevSeason}:</p><Games rows={data.h2hPrev} /></>
          : <p className={NONE}>Kausi {data.prevSeason}: ei tietoa keskinäisistä otteluista (seurat eivät kohdanneet).</p>)}
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-bold text-white">Sarjataulukko</h2>
        {!data.standings || data.standings.length === 0 ? <p className={NONE}>Ei tietoa: sarjataulukkoa ei saatu.</p> : (
          <table className="w-full text-xs" data-testid="preview-standings">
            <thead className="text-zinc-500"><tr><th className="text-left py-1">#</th><th className="text-left">Joukkue</th><th className="text-right">O</th><th className="text-right">V</th><th className="text-right">H</th><th className="text-right">Erät</th><th className="text-right">P</th></tr></thead>
            <tbody>
              {data.standings.map((r) => (
                <tr key={r.teamId} className={`border-t border-zinc-800 ${data.teams.some((t) => t.id === r.teamId) ? 'text-amber-300 font-bold' : ''}`}>
                  <td className="py-1.5">{r.standing}</td><td><Link to={`/team/${r.teamId}`}>{r.name}</Link></td>
                  <td className="text-right">{r.played}</td><td className="text-right">{r.won}</td><td className="text-right">{r.lost}</td>
                  <td className="text-right">{r.setsFor}–{r.setsAgainst}</td><td className="text-right">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Games({ rows }: { rows: GameLine[] }) {
  return (
    <ul className="text-xs space-y-1">
      {rows.map((g) => (
        <li key={g.id}>
          <Link to={`/match/${g.id}`} className="flex justify-between gap-2 border-t border-zinc-800 py-1.5">
            <span className="text-zinc-400">{g.date.slice(8, 10)}.{g.date.slice(5, 7)}. {g.home ? 'koti' : 'vieras'} – {g.opponent}</span>
            <span className={`font-mono font-bold ${g.won ? 'text-emerald-400' : 'text-red-400'}`}>{g.won ? 'V' : 'H'} {g.setsFor}–{g.setsAgainst}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Prev({ p }: { p: RosterPlayer }) {
  if (p.prev === undefined) return <span className="text-zinc-500">–</span>
  if (p.prev === null) return <span className="text-zinc-500">ei tietoa</span>
  return (
    <span title={`${p.prev.teams} · ${p.prev.categories}`}>
      <span className="font-bold">{p.prev.points}</span><span className="text-zinc-400"> / {p.prev.matches}</span>
      <span className="block text-[10px] text-zinc-500 truncate max-w-[7rem] ml-auto">{p.prev.teams}</span>
    </span>
  )
}

function PerGame({ p }: { p: RosterPlayer }) {
  if (!p.games) return null
  if (!p.games.length) return <span className="block text-[10px] text-zinc-500">per ottelu: ei tietoa</span>
  return (
    <span className="block text-[10px] text-zinc-500" data-testid="per-game" title={p.games.map((g) => `${g.date} vs ${g.opponent}: ${g.points}`).join('\n')}>
      per ottelu: {p.games.slice(0, 8).map((g) => g.points).join(' · ')}{p.games.length > 8 ? ' …' : ''}
    </span>
  )
}

const COURT = [[3, 2, 1], [4, 5, 0]] // indexes into shirts (I..VI): front IV III II, back V VI I

function Rotation({ r, roster, published }: { r?: LikelyRotation | null; roster: RosterPlayer[] | null; published: boolean }) {
  if (!r) return <p className={NONE}>Ei tietoa: aiemmista otteluista ei löytynyt pelipaikkatietoja.</p>
  const who = (shirt: string) => roster?.find((p) => p.number === shirt)
  const cell = (shirt: string, pos: string) => {
    const p = who(shirt)
    const out = r.source !== 'actual' && published && (!p || !p.inLineup)
    return (
      <div key={pos} data-in-lineup={out ? '0' : '1'} className={`rounded border border-zinc-700 p-1.5 text-center ${out ? 'opacity-40' : ''}`}>
        <div className="text-[10px] text-zinc-500">{pos}</div>
        <div className="font-mono font-bold">#{shirt}</div>
        {r.replaced.find((x) => x.in === shirt) && <div className="text-[9px] text-amber-300">korvaa #{r.replaced.find((x) => x.in === shirt)!.out}</div>}
        <div className="truncate text-[10px] text-zinc-300">{p?.name.split(' ').slice(-1)[0] || '?'}</div>
      </div>
    )
  }
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI']
  return (
    <div className="space-y-1 text-xs">
      <div className="text-[10px] text-zinc-500 text-center">verkko</div>
      {COURT.map((row, i) => <div key={i} className="grid grid-cols-3 gap-1">{row.map((k) => cell(r.shirts[k], roman[k]))}</div>)}
      <p className="text-[11px] text-zinc-500">
        {r.libero ? <>Libero #{r.libero} {who(r.libero)?.name || ''}. </> : 'Libero: ei tietoa. '}
        {r.source === 'actual' ? 'Toteutunut 1. erän aloitus tämän ottelun pelipaikoista. ' : <>Sama 1. erän aloitus {r.basedOn}/{r.games} ottelussa (TASO pelipaikat, viimeiset ottelut). {r.source === 'lineup' ? 'Vain tämän ottelun kokoonpanon pelaajat. ' : 'Kokoonpanoa ei julkaistu: perustuu kaikkiin pelaajiin. '}</>}
        {r.replaced.map((x) => <span key={x.slot} className="text-amber-300">{roman[x.slot]}: #{x.in} korvaa #{x.out}. </span>)}
        Kierto: {r.shirts.map((x, i) => `${roman[i]} #${x}`).join(', ')}.
      </p>
    </div>
  )
}
