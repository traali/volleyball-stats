import { describe, expect, it } from 'vitest'
import fx from './fixtures/search.json'
import { clubMap, findPlayers, findTeams, fold, playerIndex, registerLooksComplete, searchableCompetitions, teamIndex } from './search'
import { toggleFavorite, type Favorite } from './favorites'

const clubs = clubMap(fx.clubs)
const teams = teamIndex(fx.teamsEtelaSuomi)
const players = playerIndex(fx.register)

describe('team search (real Etelä-Suomi 2026-27 getTeams rows)', () => {
  it('finds a team by its name', () => {
    const hits = findTeams(teams, clubs, 'PuMa/U13T2')
    expect(hits[0]).toMatchObject({ id: '64154', name: 'PuMa/U13T2' })
  })

  it('finds all of a club’s U13 girls teams by club + age words', () => {
    const hits = findTeams(teams, clubs, 'puma u13')
    expect(hits.length).toBeGreaterThan(2)
    expect(hits.every((t) => t.name.startsWith('PuMa/') && t.categories.some((c) => c.includes('U13')))).toBe(true)
  })

  it('finds teams by the full club name, not only the abbreviation', () => {
    const club = fx.clubs.find((c) => c.club_id === '127')!
    const hits = findTeams(teams, clubs, club.name)
    expect(hits.length).toBeGreaterThan(5)
    expect(hits.every((t) => t.clubId === '127')).toBe(true)
  })

  it('one entry per team even when TASO lists it in several rows', () => {
    const doubled = teamIndex([...fx.teamsEtelaSuomi, ...fx.teamsEtelaSuomi])
    expect(doubled).toHaveLength(teams.length)
  })

  it('nothing for one letter', () => {
    expect(findTeams(teams, clubs, 'p')).toEqual([])
  })
})

describe('player search (real federation register rows)', () => {
  it('finds a player by first and last name, accents and word order optional', () => {
    // The real register has the same name twice in one club (two ids); both come back.
    for (const q of ['Ääpeli Mäkeläinen', 'aapeli makelainen', 'mäkeläinen ääpeli']) {
      expect(findPlayers(players, clubs, q).map((p) => p.id).sort()).toEqual(['900001', '900008'])
    }
  })

  it('narrows a common surname with the club', () => {
    const all = findPlayers(players, clubs, 'mäkeläinen', 100)
    const puma = findPlayers(players, clubs, 'mäkeläinen puma', 100)
    expect(puma.length).toBeLessThan(all.length)
    expect(puma.every((p) => p.clubId === '127')).toBe(true)
  })

  it('a name nobody has gives nothing (not a near miss)', () => {
    expect(findPlayers(players, clubs, 'Zyxwvut Qqq')).toEqual([])
  })

  it('needs 3 letters', () => {
    expect(findPlayers(players, clubs, 'an')).toEqual([])
  })

  it('does not keep birth years', () => {
    const p = playerIndex([{ player_id: '1', first_name: 'A', last_name: 'B', birth_year: '2014', club_id: '9' }])
    expect(Object.keys(p[0]).sort()).toEqual(['clubId', 'first', 'id', 'last'])
  })

  it('the full register is ~36 000 people; a short answer means the register is not usable', () => {
    expect(registerLooksComplete(fx.registerTotal)).toBe(true)
    expect(registerLooksComplete(5)).toBe(false)
  })

  it('folds Finnish letters', () => {
    expect(fold('Mäkeläinen Åsa')).toBe('makelainen asa')
  })
})

describe('which competitions are searched for teams', () => {
  it('this indoor season and recent tournaments, not old seasons, beach, training or tests', () => {
    const comps = [
      { id: 'vb2026esuomi', name: 'Etelä-Suomi 2026-2027', type: 'league', season: '2026-27', end: '2027-08-31' },
      { id: 'vb2025v', name: 'Liiton mastersien sarjat 2025-26', type: 'league', season: '2025-26', end: '2026-08-31' },
      { id: 'power2026', name: 'Power Cup 2026', type: 'tournament', season: '', end: '2026-06-14' },
      { id: 'power2025', name: 'Power Cup 2025', type: 'tournament', season: '', end: '2025-06-08' },
      { id: 'beach2026', name: 'Beach Volley 2026', type: 'tournament', season: '2026', end: '2026-09-30' },
      { id: 'pktesti', name: 'Pöytäkirjatesti', type: 'league', season: '2026-27', end: '2027-01-01' },
    ]
    expect(searchableCompetitions(comps, '2026-27', new Date('2026-10-17T12:00:00Z'))).toEqual(['vb2026esuomi', 'power2026'])
  })
})

describe('favourites', () => {
  const team: Favorite = { kind: 'team', id: '64154', name: 'PuMa/U13T2' }
  const player: Favorite = { kind: 'player', id: '56961', name: 'Anni Mäkeläinen' }

  it('adds to the front and removes on second toggle', () => {
    const one = toggleFavorite([], team)
    const two = toggleFavorite(one, player)
    expect(two.map((f) => f.id)).toEqual(['56961', '64154'])
    expect(toggleFavorite(two, team)).toEqual([player])
  })

  it('a team and a player with the same id are different favourites', () => {
    const list = toggleFavorite(toggleFavorite([], team), { kind: 'player', id: '64154', name: 'X' })
    expect(list).toHaveLength(2)
  })

  it('does not store a nameless favourite', () => {
    expect(toggleFavorite([], { kind: 'team', id: '1', name: ' ' })).toEqual([])
  })
})
