# ROLL.md — The Chronicle of Volleyball Stats
Append-only record of architectural decisions, dispensations, rule amendments, and visitation verdicts.

---

## 2026-09-02 — Foundation & Shared Contract Alignment
- **Actor:** Archon & Legate
- **Action:** Established AGENTS.md, .agent/workflows, React 19 baseline, and monastery-visitor gate with SportStatsContract compatibility check.
- **Verdict:** PASS
- **Summary:** Initialized volleyball-stats with canonical shared contracts v1.0.0 for seamless, non-breaking integration with Pelipäivä.

## 2026-09-02 — Interactive MCP App Set Breakdown Layer (Option 1)
- **Actor:** Master of Works & Cellarer
- **Action:** Created `src/mcp-app.ts` (`get_volleyball_sets` tool) and `public/mcp-volleyball.html` widget implementing `@modelcontextprotocol/ext-apps`.
- **Verdict:** PASS
- **Summary:** Standalone Volleyball set breakdown widget exposes 25-point set tracking and team form indicators to AI hosts via `ui://volleyball/sets` with zero regressions.

---

## Format for New Entries:
```markdown
## YYYY-MM-DD — <Title of Change>
- **Office / Author:** <Office Name>
- **Base / Commit:** <sha>
- **Verdict:** PASS | PASS WITH FINDINGS | BLOCK
- **Summary:** <1-2 sentences on what was decided or changed>
```
