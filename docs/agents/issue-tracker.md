# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files under `.scratch/`.

## Conventions

- **Create an issue/PRD**: create a folder `.scratch/<feature-slug>/` with a `PRD.md` inside.
- **Status header**: second line of `PRD.md` is `Status: <value>`. Valid values: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
- **List issues**: `find .scratch -name PRD.md | xargs grep -l "Status:"` — filter by status as needed.
- **Update status**: edit the `Status:` line in the relevant `PRD.md`.
- **Close/resolve**: set `Status: wontfix` or delete the folder.

## When a skill says "publish to the issue tracker"

Create `.scratch/<feature-slug>/PRD.md`.

## When a skill says "fetch the relevant ticket"

Read `.scratch/<feature-slug>/PRD.md`.
