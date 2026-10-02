# Repository guidance

## Scope and layout

`ime-safe` is a small, publishable TypeScript library for IME-safe keyboard
handling. Keep its scope focused on keyboard utilities; UI components, editors,
and IME conversion are outside the MVP.

- `src/isIMEComposing.ts`: stateless detection with no React dependency.
- `src/useIME.ts`: composition state for rendering, reset on blur.
- `src/useIMESafeEnter.ts`: React Enter handling.
- `src/index.ts`: public exports.
- `test/`: Vitest and Testing Library tests; `sequences.ts` replays browser orderings.
- `docs/manual-testing.*`: real-browser checklist and verification page.
- `tsconfig.build.json`: npm build configuration, emitting into ignored `dist/`.

## Behavior to preserve

- Detect IME activity if either the event or its `nativeEvent` contains
  `isComposing === true`, `keyCode === 229`, or `key === "Process"`.
- Do not add a time window after `compositionend`. Korean IMEs can emit a
  second, real Enter keydown that must submit immediately.
- Do not use `useIME().isComposing` to guard keyboard actions. Safari can emit
  `compositionend` before the confirming Enter; React state is for rendering.
- `useIMESafeEnter` handles plain Enter and optionally Shift+Enter. Ctrl, Meta,
  and Alt modifiers pass through. Shift+Enter defaults to `"newline"`.
- Suppress repeated Enter keydowns by default; `allowRepeat` opts into repeats.
- Prevent default for handled Enter, including suppressed repeats, unless disabled.
  Ignored IME events must remain available to the IME.
- Keep `onKeyDown` stable while using the latest committed callback and options.
- Preserve React 17+ support, SSR safety, and HTMLElement-generic handlers for
  input, textarea, and contentEditable.

## Development and validation

Use Node.js 22.14+ for the development tools. If the shell selects an older
Node.js, select an installed supported version before running npm commands.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`prepack` runs type checking, tests, and the build. Add meaningful regression
tests when changing keyboard behavior, including relevant browser sequences.
For packaging changes, inspect the tarball and verify its exports and SSR usage.
If the default npm cache is not writable in a sandbox, use a temporary cache
with `npm_config_cache`; do not change ownership of the user's cache.

jsdom tests replay events; they do not drive a real IME. Never report Safari,
Firefox, or OS IME verification as passed based on these tests. Record actual
manual results, browser/OS/IME versions, and unexecuted checks in
`docs/manual-testing.md`.

## Publication and review

Ship ES modules and declaration files. Keep React as a peer dependency and
`ime-safe/core` free of React imports. Keep public exports, package metadata,
README examples, and emitted declarations consistent. Do not commit `dist/`,
`node_modules/`, local editor settings, caches, or tarballs.

Include the problem, resulting behavior, validation, and any remaining manual
verification in PR descriptions. Reference the relevant issue and its revised
specification. Creating a PR does not authorize merging or publishing to npm;
perform those actions only when requested.
