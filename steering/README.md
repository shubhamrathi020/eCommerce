# Steering Docs

These docs tell Claude (and future you) *how* we build. The BRDs say *what* we build.

| Doc | Purpose |
|---|---|
| [rules.md](rules.md) | Workflow, coding conventions, testing, Git. Read on every task |
| [architecture.md](architecture.md) | Frontend/system structure, data flow, mock-data strategy |
| [design.md](design.md) | UI/UX system: tokens, components, responsiveness, accessibility |
| [security.md](security.md) | Security and privacy rules for frontend now, backend later |
| [memory.md](memory.md) | Decisions log, project facts, learned patterns |

## Change process (reviewed changes only)
1. A change is proposed when a pattern repeats, a decision is made, or a rule proves wrong.
2. Claude shows the exact diff and the reason. The user approves or edits.
3. Only then is the doc updated, with a dated line in `memory.md` (Decisions or Patterns).
4. A pattern seen 3+ times, or a multi-step recipe, becomes a skill file (`.claude/skills/<name>/SKILL.md`) after review, and the relevant steering doc links to it.

## Status
Version 0.1, drafted and confirmed 2026-09-26.
