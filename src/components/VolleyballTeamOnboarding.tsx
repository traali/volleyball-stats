import { useState } from 'react'
import type { CustomVolleyballTeam } from '../types/volleyball'
import { Plus, Trash2, Shield, CheckCircle2 } from 'lucide-react'

interface VolleyballTeamOnboardingProps {
  onSelectTeam: (teamId: string, teamName: string) => void
  currentTeamId: string
}

const STORAGE_KEY = 'volleyball_custom_teams'

const defaultTeams: CustomVolleyballTeam[] = [
  { id: 'kale-c', name: 'KaLe C-tytöt', tournamentOrCategory: 'C-tytöt SM-sarja', addedAt: new Date().toISOString() },
  { id: 'ducks-c', name: 'Vantaa Ducks C-pojat', tournamentOrCategory: 'C-pojat Aluesarja', addedAt: new Date().toISOString() },
  { id: 'puwo-c', name: 'PuWo Kuopio', tournamentOrCategory: 'B-tytöt Aluemestaruus', addedAt: new Date().toISOString() },
]

export function VolleyballTeamOnboarding({ onSelectTeam, currentTeamId }: VolleyballTeamOnboardingProps) {
  const [teams, setTeams] = useState<CustomVolleyballTeam[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTeams))
    } catch (e) {
      console.warn('Failed to load custom teams from localStorage', e)
    }
    return defaultTeams
  })
  const [teamName, setTeamName] = useState('')
  const [tournamentName, setTournamentName] = useState('')
  const [torneopalUrlOrId, setTorneopalUrlOrId] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    // Extract ID if a Torneopal URL was pasted
    let resolvedId = teamName.toLowerCase().replace(/\s+/g, '-')
    if (torneopalUrlOrId.trim()) {
      const urlMatch = torneopalUrlOrId.match(/(?:team_id|joukkue|id)=([a-zA-Z0-9_-]+)/)
      resolvedId = urlMatch ? urlMatch[1] : torneopalUrlOrId.trim()
    }

    const newTeam: CustomVolleyballTeam = {
      id: resolvedId,
      name: teamName.trim(),
      tournamentOrCategory: tournamentName.trim() || 'Lentopalloliitto Aluesarja',
      addedAt: new Date().toISOString(),
    }

    const updated = [newTeam, ...teams.filter(t => t.id !== resolvedId)]
    setTeams(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to persist custom team', e)
    }

    setTeamName('')
    setTournamentName('')
    setTorneopalUrlOrId('')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)

    onSelectTeam(newTeam.id, newTeam.name)
  }

  const handleRemoveTeam = (id: string) => {
    const updated = teams.filter(t => t.id !== id)
    setTeams(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to update custom teams', e)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-white">Lisää oma joukkue tai turnaus</h3>
        <p className="text-xs text-zinc-400">
          Syötä oman joukkueesi nimi, sarja tai liitä suora Lentopalloliiton Torneopal-linkki seurantaa varten.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAddTeam} className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Joukkueen nimi *</label>
            <input
              type="text"
              required
              placeholder="esim. KaLe C-tytöt"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Sarja tai Turnaus</label>
            <input
              type="text"
              placeholder="esim. C-tytöt SM-sarja"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Torneopal-linkki tai Joukkue-ID (valinnainen)</label>
          <input
            type="text"
            placeholder="https://lentopallo.torneopal.net/taso/sarja.php?sarja=... tai ID"
            value={torneopalUrlOrId}
            onChange={(e) => setTorneopalUrlOrId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Tallenna joukkue
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Joukkue lisätty onnistuneesti!
            </div>
          )}
        </div>
      </form>

      {/* Saved Teams List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tallennetut Joukkueet & Turnaukset</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => {
            const isSelected = team.id === currentTeamId
            return (
              <div
                key={team.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  onClick={() => onSelectTeam(team.id, team.name)}
                  className="space-y-0.5 cursor-pointer flex-1"
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="text-sm font-bold text-white">{team.name}</span>
                    {isSelected && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                        Aktiivinen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 pl-5">{team.tournamentOrCategory}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTeam(team.id)}
                  className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                  title="Poista tallennettu joukkue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
