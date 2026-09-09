import { useState, useEffect } from 'react'
import { parseIncomingCrossRepoQuery } from './types/contracts'
import { VolleyballSetGrid } from './components/VolleyballSetGrid'
import { VolleyballStandingsTable } from './components/VolleyballStandingsTable'
import { VolleyballScheduleView } from './components/VolleyballScheduleView'
import { VolleyballScorersTable } from './components/VolleyballScorersTable'
import { VolleyballTeamOnboarding } from './components/VolleyballTeamOnboarding'
import { VolleyballPreviewExport } from './components/VolleyballPreviewExport'
import {
  fetchVolleyballMatch,
  fetchVolleyballStandings,
  fetchVolleyballSchedule,
  fetchVolleyballPlayers,
} from './services/volleyballApi'
import type {
  VolleyballMatchDetail,
  VolleyballStandingRow,
  VolleyballTeamFixture,
  VolleyballPlayerStat,
} from './types/volleyball'
import { Calendar, Trophy, Users, PlusCircle, Share2, MapPin, Clock } from 'lucide-react'

type TabType = 'match' | 'standings' | 'schedule' | 'players' | 'onboarding' | 'export'

function getInitialMatchId(search: string): string {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const matchMatch = pathname.match(/\/match\/([^/]+)/)
    if (matchMatch) return decodeURIComponent(matchMatch[1])
  }
  const q = parseIncomingCrossRepoQuery(new URLSearchParams(search))
  return q.targetId || '987654'
}

export default function App() {
  const [query, setQuery] = useState(() => parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)))
  const [activeTab, setActiveTab] = useState<TabType>('match')
  const [currentMatchId, setCurrentMatchId] = useState(() => getInitialMatchId(window.location.search))
  const [currentTeamId, setCurrentTeamId] = useState('kale-c')
  const [match, setMatch] = useState<VolleyballMatchDetail | null>(null)
  const [standings, setStandings] = useState<VolleyballStandingRow[]>([])
  const [fixtures, setFixtures] = useState<VolleyballTeamFixture[]>([])
  const [players, setPlayers] = useState<VolleyballPlayerStat[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__APP_BUILD_INFO__ = {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
        commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
        buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
      }
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setQuery(parseIncomingCrossRepoQuery(new URLSearchParams(window.location.search)))
      setCurrentMatchId(getInitialMatchId(window.location.search))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    async function loadData() {
      const matchData = await fetchVolleyballMatch(currentMatchId)
      if (matchData) {
        setMatch(matchData)
      }
      setStandings(fetchVolleyballStandings())
      setFixtures(fetchVolleyballSchedule())
      setPlayers(fetchVolleyballPlayers())
    }
    loadData()
  }, [currentMatchId, currentTeamId])

  const isEmbed = Boolean(query.embed)

  const handleSelectTeam = (teamId: string) => {
    setCurrentTeamId(teamId)
    setActiveTab('match')
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between ${isEmbed ? 'p-2 sm:p-4 bg-[#0a0b0e]/95' : 'p-4 sm:p-8 bg-[#0a0b0e]'}`}>
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🏐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">Lentopallo • Torneopal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold">Live</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">Lentopallon Ottelukeskus</h1>
            </div>
          </div>
          {isEmbed ? (
            <span className="rounded-full bg-zinc-800/80 border border-zinc-700/50 px-3 py-1 text-xs text-zinc-300 font-medium">
              Pelipäivä Embedded
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs text-amber-300 font-medium">
              Lentopalloliitto
            </span>
          )}
        </header>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Ottelukeskus
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'standings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Sarjataulukko & Erät
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Otteluohjelma
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'players'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Pelaajat
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'onboarding'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            Lisää joukkue
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            Jaa WhatsAppiin
          </button>
        </nav>

        {/* Tab Content */}
        {activeTab === 'match' && match && (
          <div className="space-y-6">
            {/* Hero Scoreboard Card */}
            <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-6">
                <span className="font-semibold uppercase tracking-wider text-amber-400/90">{match.categoryName}</span>
                <span className="font-mono text-zinc-400">{match.tournamentName}</span>
              </div>

              <div className="grid grid-cols-3 items-center text-center gap-4">
                {/* Team A */}
                <div className="space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-lg">
                    {match.homeTeamName[0]}
                  </div>
                  <p className="font-bold text-base sm:text-lg text-white">{match.homeTeamName}</p>
                  <p className="text-xs text-zinc-400">Kotijoukkue</p>
                </div>

                {/* Sets Won Score */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
                    <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">{match.setsWonHome}</span>
                    <span className="text-xl text-zinc-600 font-bold">:</span>
                    <span className="text-3xl sm:text-4xl font-black text-zinc-300 font-mono">{match.setsWonAway}</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Erävoitot (Lopputulos)</p>
                </div>

                {/* Team B */}
                <div className="space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300 text-lg">
                    {match.awayTeamName[0]}
                  </div>
                  <p className="font-bold text-base sm:text-lg text-white">{match.awayTeamName}</p>
                  <p className="text-xs text-zinc-400">Vierasjoukkue</p>
                </div>
              </div>

              {/* Match Venue & Court Meta */}
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{match.venue}</span>
                  {match.courtName && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-[10px]">
                      {match.courtName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span>Pisteet: {match.totalPointsHome} - {match.totalPointsAway}</span>
                  {match.referee && <span>Tuomari: {match.referee}</span>}
                </div>
              </div>
            </section>

            {/* Set by Set Breakdown */}
            <VolleyballSetGrid
              sets={match.sets}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          </div>
        )}

        {activeTab === 'standings' && (
          <VolleyballStandingsTable
            standings={standings}
            highlightTeamId={currentTeamId}
          />
        )}

        {activeTab === 'schedule' && (
          <VolleyballScheduleView
            fixtures={fixtures}
            onSelectMatch={(id) => {
              setCurrentMatchId(id)
              setActiveTab('match')
            }}
          />
        )}

        {activeTab === 'players' && (
          <VolleyballScorersTable players={players} />
        )}

        {activeTab === 'onboarding' && (
          <VolleyballTeamOnboarding
            currentTeamId={currentTeamId}
            onSelectTeam={handleSelectTeam}
          />
        )}

        {activeTab === 'export' && match && (
          <VolleyballPreviewExport match={match} />
        )}

        {/* Footer */}
        <footer className="pt-6 border-t border-zinc-900 text-center text-xs text-zinc-400">
          <p>Lentopalloliitto Torneopal Taso • Sovellusversio v1.0.0</p>
        </footer>
      </div>
    </div>
  )
}
