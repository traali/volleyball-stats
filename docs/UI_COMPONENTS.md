# Volleyball Stats UI components

Status: **component catalog 2026-09-26**. Every file under `src/components/`. There is no router. `src/App.tsx` is the only screen.

Live: https://volleyball-stats-7xq.pages.dev

This is **not** signed as live TASO parity with basketball or floorball. The page boots on match id `987654` and team id `kale-c` unless the URL or a Pelipäivä query says otherwise (`getInitialMatchId` in `App.tsx`). The header pill **Live** is always painted. It is not a live-game detector.

## Screen (`App.tsx`)

| Element | Why |
|---|---|
| Lentopallo • Torneopal | Federation mark |
| Live pill | Static. Do not treat it as "this match is in progress" |
| Lentopallon Ottelukeskus | Title |
| Lentopalloliitto, or Pelipäivä Embedded when `embed` | Who opened the page |
| Tabs below | One match, not a search home |

Tabs, in order: **Ottelukeskus**, **Sarjataulukko & Erät**, **Otteluohjelma**, **Pelaajat**, **Lisää joukkue**, **Jaa WhatsAppiin**.

The match tab also shows home, set wins, away, and the venue. Those labels live in `App.tsx`, not in a component file.

## Components

All six are mounted by `App.tsx`. None are dead.

| File | Tab | What the parent sees | Why |
|---|---|---|---|
| `VolleyballSetGrid.tsx` | Ottelukeskus | Eräkohtaiset Tulokset. 25-point sets, 5th set to 15, win by 2 | Set lines. Not floorball periods or basketball quarters |
| `VolleyballStandingsTable.tsx` | Sarjataulukko & Erät | 3-2-1-0 points. Columns V (3p), V (2p), H (1p), H (0p), Erät, Eräsuhde | Volleyball scoring. Do not replace with V/T/H |
| `VolleyballScheduleView.tsx` | Otteluohjelma | Otteluohjelma & Turnauspelit, court notes | The team's weekend, including which court |
| `VolleyballScorersTable.tsx` | Pelaajat | Nro, Pelaaja, Rooli, Ottelut, Erät, Hyökk., Torj., Ässät | Attacks, blocks, aces. Not goals |
| `VolleyballTeamOnboarding.tsx` | Lisää joukkue | Name, series, Torneopal link or team id, saved list | This one **is** mounted. Basketball's copy is not |
| `VolleyballPreviewExport.tsx` | Jaa WhatsAppiin | Copy a markdown preview. Only numbers from this document | Share text. Do not invent a score |

## What not to "improve"

- Do not add Etusivu / Selaa / Haku until a real TASO search exists. Copying basketball's nav onto `987654` would fake a product.
- Do not delete the default ids in silence. Replace them only with a real match from the URL or from TASO.
- Do not read the Live pill as status.
