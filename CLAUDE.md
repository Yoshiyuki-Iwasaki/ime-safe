# CLAUDE.md

@AGENTS.md

`AGENTS.md` is the single source of repository guidance. Update it instead of
duplicating rules here; keep this file for Claude Code-specific notes only.

## Claude Code notes

- Before reporting a change as done, run `npm run typecheck && npm test`; for
  packaging or export changes, also run `npm pack --dry-run`.
- Keyboard behavior changes need a regression test in `test/`. Add new browser
  orderings to `test/sequences.ts` rather than inlining event sequences.
- Never mark rows in `docs/manual-testing.md` as passed unless the user reports
  a real-browser result. Ask for the browser, OS, and IME versions.
- Keep `src/core/` free of imports outside `src/core/` so `ime-safe` and
  `ime-safe/core` stay React-free (`test/entrypoints.test.ts` enforces this).
