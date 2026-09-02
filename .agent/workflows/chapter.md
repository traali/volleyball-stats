# Workflow: Chapter (Session Opening Rite)
The opening rite for any agent session in `volleyball-stats`.

## Steps
1. **Read `AGENTS.md`**: Verify non-negotiables, stack rules, and testing requirements.
2. **Read the tail of `ROLL.md`**: Review the last ~10 entries to understand recent decisions and dead ends.
3. **Read the Task**: Understand the user request or feature spec.
4. **Select Accountable Office & Model Tier**:
   - `cellarer_office`: Ingestion routing, Lentopalloliitto/Torneopal client (`pro`/`flash`)
   - `scriptorium_office`: Set score parsers (25pt / 15pt tie-break), standings extractors (`pro`/`flash`)
   - `prior_office`: Match state, set win rate calculations, points tables (`pro`)
   - `works_office`: UI components, "Night Captain" design tokens (`inherit`/`flash`)
   - `sacrist_office`: Test suites, parser fixtures (`flash`)
   - `legate_office`: Cross-repo contract conformance with Pelipäivä (`pro`/`inherit`)
   - `visitor_office`: Clean-room adversarial audit (`pro`/`inherit`)
5. **Plan Before Execution**: Formulate a concise plan. For major changes, write an implementation plan.
