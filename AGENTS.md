# AGENTS.md — The Rule of Volleyball Stats

The canonical, tool-agnostic rule for all AI agents and contributors working in `volleyball-stats`.

---

## §0 Precedence
1. `AGENTS.md` (this file) is the supreme project rule.
2. Native tool configs (`CLAUDE.md`, `.cursorrules`, etc.) are thin pointers to this file and must contain no independent rules.
3. In conflicts between code comments and `AGENTS.md`, `AGENTS.md` wins.

---

## §1 Identity & Architecture
- **Identity:** Finnish volleyball statistics and set score intelligence dashboard.
- **Architecture:** Fast client-side SPA (React 19, Vite, Tailwind CSS v4) handling Lentopalloliitto and Torneopal match structures (sets 25-pt rallies, tie-breaks, standing tables) with cross-repo contract conformance with `pelipaiva`.

---

## §2 Stack & Invariants

| Use | Never |
|---|---|
| Strict TypeScript (no `any` types) | Untyped set scores, ad-hoc `any` casting |
| React 19 + Tailwind CSS v4 + Framer Motion | Legacy CSS, un-animated layout shifts |
| "Night Captain" OLED Dark Design System | Ad-hoc light themes, hardcoded raw hex styling |
| Canonical `SportStatsContract` interface | Altering or removing contract fields without a major version bump |
| Zero-Secret Commitment | Hardcoded API keys or credentials in client bundle |

---

## §3 Testing & Quality Gates
- **Pre-visitation Gate:** Run `npm run visit` before any commit.
- **Contract Verification:** Local exports must satisfy `SportStatsContract`.
- **Definition of Done:**
  1. `npm run lint` reports 0 errors.
  2. `npm run build` compiles production bundle without warnings.
  3. Cross-repo contract compatibility check passes.

---

## §4 Security & Hardening
- **Zero Secrets:** Never commit credentials or tokens.
- **Defensive Ingestion:** Sanitize all match notes, set scores, and roster lists.

---

## §5 Design & Usability ("Night Captain")
- **Palette:** Dark canvas (`#0a0b0e`), amber/gold volleyball accent, surface ladder.
- **Touch Targets:** All interactive buttons and triggers must have minimum 44px height (`min-h-[44px]`).

---

## §6 Visitation (Separation of Duties)
- The author who wrote a change does NOT perform its final audit.
- An independent **Visitor subagent** receives only: `AGENTS.md`, the git diff, and test results (no conversation history).
- **Verdicts:** `PASS` · `PASS WITH FINDINGS` · `BLOCK`
- **Finding Classes:**
  - `blocking`: Security flaw, contract breach, build failure. Must fix before merge.
  - `advisory`: Rule violation without breakage. Fix or log in `DEBT.md`.
- **Fault Attribution:** `house` (fix code) vs `RULE` (amend `AGENTS.md` and log in `ROLL.md`).

---

## §7 Volatile Facts
Do NOT put volatile facts in `AGENTS.md`. Single sources of truth:
- Library versions: `package.json`
- Recent history: `CHANGELOG.md` and git log
- Architecture decisions: `ROLL.md` and `docs/`
