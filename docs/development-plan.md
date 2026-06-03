# SkillFlow MVP Development Plan

## Summary

SkillFlow is a local desktop app for creating, editing, connecting, linting, and generating standard Agent Skill files. The MVP implements project creation, React Flow editing, JSON persistence, SKILL.md generation, workflow.md generation, and a basic linter.

## Architecture

- GUI is the controller.
- `.skillflow/*.json` is the source of truth.
- `skills/*/SKILL.md` and `workflow.md` are generated outputs.
- The linter is the first quality gate.
- AI integration, SQLite, template marketplace, cloud sync, and Agent execution stay out of scope for V0.1-V0.6.

## MVP Stages

- V0.1: Create/open/save projects and write the required local directory structure.
- V0.2: Add React Flow canvas, palette, node drag/drop, node movement, deletion, copying, and semantic edges.
- V0.3: Add inspector editing for Skill fields.
- V0.4: Add button-based rule blocks for `require`, `forbid`, `check`, `tool`, and `handoff`.
- V0.5: Generate `SKILL.md` and `workflow.md` from structured data and graph edges.
- V0.6: Run basic linter checks and persist `lint-report.json`.

## Acceptance Checks

- `npm run lint`
- `npm test`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- Manual: `npm run tauri dev`
