# ime-safe

[![npm version](https://img.shields.io/npm/v/ime-safe.svg)](https://www.npmjs.com/package/ime-safe)
[![CI](https://github.com/Yoshiyuki-Iwasaki/ime-safe/actions/workflows/ci.yml/badge.svg)](https://github.com/Yoshiyuki-Iwasaki/ime-safe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Stop sending half-typed messages when users press Enter to confirm IME conversion.**

`ime-safe` provides small, typed React utilities that handle Enter safely for
Japanese, Chinese, Korean, and other IME users.

## The problem

Users of an input method editor (IME) press Enter to *confirm* a conversion,
not to submit. Browsers still fire a `keydown` event with `key === "Enter"`, so
the common pattern below submits the message mid-composition:

```tsx
// ❌ Also fires on the Enter that confirms a conversion, sending unfinished text
<textarea onKeyDown={(e) => e.key === "Enter" && send()} />
```

Checking `event.isComposing` alone is not enough either. Safari fires
`compositionend` *before* the confirming Enter keydown, and Korean IMEs emit a
second, genuine Enter keydown that should submit immediately.

## Features

- 🛡 **IME-safe Enter**: ignores Enter that confirms a conversion in Chrome,
  Edge, Safari, and Firefox, including Safari's out-of-order events.
- 🇰🇷 **No timeouts**: stateless detection lets the real Enter after a Korean
  composition submit immediately.
- ⌨️ **Sensible keyboard behavior**: Shift+Enter for newlines, modifier
  shortcuts pass through, and holding Enter submits only once.
- 🧩 **Works on any element**: `<input>`, `<textarea>`, and `contentEditable`.
- 🪶 **Tiny and dependency-free**: React is the only peer dependency, and the
  `ime-safe/core` entry point works without React.
- 🔷 **TypeScript first**: ships ES modules with type declarations. SSR safe.

## Installation

```sh
npm install ime-safe
```

Requires React 17 or later.

## Quick start

```tsx
import { useIMESafeEnter } from "ime-safe";

function MessageInput({ send }: { send: () => void }) {
  const { onKeyDown } = useIMESafeEnter<HTMLTextAreaElement>({
    onEnter: send,
  });

  return <textarea onKeyDown={onKeyDown} />;
}
```

That's it. No composition event handlers are needed. Enter sends, Shift+Enter
inserts a newline, and Enter that confirms an IME conversion is left to the IME.

## API

### `useIMESafeEnter(options)`

Returns `{ onKeyDown }` to attach to an `<input>`, `<textarea>`, or
`contentEditable` element.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `onEnter` | `(event: KeyboardEvent<T>) => void` | Required | Called on a plain Enter that is not part of an IME composition. |
| `shiftEnter` | `"newline" \| "submit"` | `"newline"` | `"newline"` passes Shift+Enter through to the browser; `"submit"` calls `onEnter`. |
| `allowRepeat` | `boolean` | `false` | When `false`, holding Enter calls `onEnter` only on the first keydown. |
| `preventDefault` | `boolean` | `true` | Prevents the browser default (newline or implicit form submission) for handled Enter, including suppressed repeats. |

Behavior details:

- Enter that confirms an IME conversion is never prevented, so the IME
  receives it.
- Ctrl, Meta, and Alt + Enter pass through untouched, leaving them free for
  your own shortcuts.
- `onKeyDown` keeps the same identity across renders and always uses the
  latest committed options, so it is safe to pass inline callbacks.

### `useIME()`

Tracks composition state for **rendering**, such as showing a
"composing…" indicator.

```tsx
import { isIMEComposing, useIME } from "ime-safe";

function Input({ send }: { send: () => void }) {
  const { isComposing, compositionProps } = useIME();

  return (
    <>
      <textarea
        {...compositionProps}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isIMEComposing(event)) {
            event.preventDefault();
            send();
          }
        }}
      />
      {isComposing && <span>Composing…</span>}
    </>
  );
}
```

Returns:

- `isComposing: boolean`: true between `compositionstart` and `compositionend`.
- `compositionProps`: `onCompositionStart`, `onCompositionEnd`, and `onBlur`
  handlers to spread onto the element. `onBlur` resets the state if focus
  leaves before `compositionend` fires.

> [!WARNING]
> Do not use `isComposing` to guard keyboard actions. Safari ends composition
> before the confirming Enter keydown, and React state updates are not
> synchronous. Use `isIMEComposing(event)` or `useIMESafeEnter` instead.

### `isIMEComposing(event)`

A stateless check that returns `true` when a keyboard event belongs to an IME
composition. It accepts native `KeyboardEvent`s, React keyboard events, or
plain objects.

```ts
import { isIMEComposing } from "ime-safe/core"; // no React import

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !isIMEComposing(event)) submit();
});
```

It returns `true` if the event or its `nativeEvent` has any of the following:

| Signal | Why |
| --- | --- |
| `isComposing === true` | Standard flag (Chrome, Edge, Firefox) |
| `keyCode === 229` | Safari's confirming Enter, after `compositionend` |
| `key === "Process"` | Chrome on Windows |

### Exports

| Entry point | Exports |
| --- | --- |
| `ime-safe` | `useIMESafeEnter`, `useIME`, `isIMEComposing`, and the types `UseIMESafeEnterOptions`, `UseIMESafeEnterResult`, `UseIMEResult`, `KeyboardEventLike` |
| `ime-safe/core` | `isIMEComposing`, `KeyboardEventLike` (React-free) |

## Recipes

### Single-line `<input>` inside a `<form>`

Shift/Ctrl/Meta/Alt + Enter pass through to the browser, so on an `<input>`
inside a `<form>` they can trigger native implicit submission without calling
`onEnter`. To route every submission through your own code, prevent the form
default:

```tsx
<form onSubmit={(event) => event.preventDefault()}>
  <input onKeyDown={onKeyDown} />
</form>
```

### Adding your own `onBlur`

`compositionProps` includes `onBlur`. An `onBlur` placed after the spread
replaces it, so call it explicitly:

```tsx
<textarea
  {...compositionProps}
  onBlur={(event) => {
    compositionProps.onBlur(event);
    saveDraft();
  }}
/>
```

## Compatibility

| Environment | Support |
| --- | --- |
| React | 17 or later |
| SSR | Supported. With React Server Components, use the hooks in a `"use client"` component. |
| Module format | ESM only. On Node.js 20.19+ or 22.12+, `require("ime-safe")` also works through [require(esm)](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require); older CommonJS environments can use `import("ime-safe")`. |
| Browsers | Chrome, Edge, Safari, Firefox |

Browser behavior is covered by automated tests that replay each browser's
event ordering. Verification with real OS IMEs is tracked in the
[manual testing checklist](https://github.com/Yoshiyuki-Iwasaki/ime-safe/blob/main/docs/manual-testing.md).

## Contributing

Issues and pull requests are welcome. Use Node.js 22.14 or later for development:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

When changing keyboard behavior, add a regression test, and add new browser
event orderings to `test/sequences.ts`. To check against a real IME, see the
[manual testing checklist](https://github.com/Yoshiyuki-Iwasaki/ime-safe/blob/main/docs/manual-testing.md).

## License

[MIT](LICENSE)
