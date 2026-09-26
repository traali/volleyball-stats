# Volleyball Stats UI components

Status: **catalog updated 2026-09-26**. Live TASO. No hardcoded match.

Live: https://volleyball-stats-7xq.pages.dev
Shell: hash routes. Etusivu, Selaa, Haku, Suosikit. Same jobs as basketball and floorball.

Data: `taso-proxy` `/volley/` with referer `https://tulospalvelu.lentopallo.fi/`. Empty TASO stays empty. Do not paint KaLe, 987654, or a Live pill.

## What volleyball adds

| Piece | File | Why |
|---|---|---|
| Erän kello | `src/pages/MatchPage.tsx` | `pN_start_time`, `pN_end_time`, kesto. Football has no sets |
| Rotaatiot | `src/components/RotationBoard.tsx` | Six shirts per set from `playing_positions_*`, names from the lineup. Libero if TASO sent one |
| Pisteaika | `src/components/PointTape.tsx` | Only events with code `piste`. Clock is `wall_time`. A substitution is not a point |

## Shell and pages

| File | Why |
|---|---|
| `components/Layout.tsx` | Header Lentopallotilastot · Lentopalloliitto. Embed hides chrome |
| `components/BottomNav.tsx` | Etusivu, Selaa `/browse`, Haku, Suosikit |
| `pages/Home.tsx` | Search, chips, favorites, open by id. No hero score |
| `pages/SearchPage.tsx` | Club, competition, or an id from a pasted link |
| `pages/BrowsePage.tsx` | Current indoor season. Filters Kaikki, Nuoret, Liitto, Alue |
| `pages/CompetitionPage.tsx` | Categories |
| `pages/CategoryPage.tsx` | Groups |
| `pages/GroupPage.tsx` | Table V3 / V2 / H / P and matches. 0–0 is not shown for an unplayed game |
| `pages/TeamPage.tsx` | Fixtures and the heart. Favorites key `volleyball.favorites.v1` |
| `pages/MatchPage.tsx` | Ottelu, Rotaatiot, Pisteet, Jaa |
| `pages/PlayerPage.tsx` | Person and teams |
| `pages/ClubPage.tsx` | Teams of a club |
| `pages/FavoritesPage.tsx` | Local list |
| `components/VolleyballSetGrid.tsx` | Set pills, deuce badge. Fed only with sets TASO scored |
| `components/VolleyballPreviewExport.tsx` | Markdown share of the real match |

## Still in the tree, not the home

| File | Why it stays |
|---|---|
| `VolleyballStandingsTable.tsx` | Older 3-2-1-0 table. The group page renders the live TASO columns directly |
| `VolleyballScheduleView.tsx` | Old schedule card. Team page lists `getMatches` |
| `VolleyballScorersTable.tsx` | Player points table. Not mounted until a player feed returns attack/block/ace |
| `VolleyballTeamOnboarding.tsx` | Manual add. No longer seeded with KaLe |

Parser and tests: `src/domain/rally.ts`, `src/domain/rally.test.ts`.
