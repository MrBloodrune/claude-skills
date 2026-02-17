# Agent Orchestrator

Three-tier orchestration plugin. See `docs/plans/2026-02-17-agent-orchestrator-design.md` for architecture.

## Structure
- `skills/orchestrator-director/` — Director operational playbook
- `skills/orchestrator-manager/` — Manager operational playbook
- `agents/` — Tier personas (identity only)
- `templates/` — Workflow and worker prompt templates
- `registry/` — Available domain skill manifest
- `scripts/` — Monitoring and session registration
