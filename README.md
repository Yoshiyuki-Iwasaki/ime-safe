# ime-safe

[![npm version](https://img.shields.io/npm/v/ime-safe.svg)](https://www.npmjs.com/package/ime-safe)
[![CI](https://github.com/Yoshiyuki-Iwasaki/ime-safe/actions/workflows/ci.yml/badge.svg)](https://github.com/Yoshiyuki-Iwasaki/ime-safe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Stop sending half-typed messages when users press Enter to confirm IME conversion.**

`ime-safe` provides small, typed, framework-agnostic utilities for safely
handling keyboard events during IME input, with optional React helpers. It
handles Enter safely for Japanese, Chinese, Korean, and other IME users.

## The problem

Users of an input method editor (IME) press Enter to *confirm* a conversion,
not to submit. Browsers still fire a `keydown` event with `key === "Enter"`, so
the common pattern below submits the message mid-composition:

```ts
// ❌ Also fires on the Enter that confirms a conversion, sending unfinished text
textarea.addEventListener("keydown", (e) => e.key === "Enter" && send());
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
- 🌐 **Framework-agnostic core**: a plain DOM `keydown` listener that works
  in vanilla JavaScript and in any framework exposing DOM keyboard events.
- ⚛️ **Optional React helpers**: `ime-safe/react` adds hooks; React is an
  optional peer dependency.
- 🔷 **TypeScript first**: ships ES modules with type declarations. SSR safe.

## Installation

```sh
npm install ime-safe
```

React is only needed for `ime-safe/react` (React 17 or later).

## Quick start

```ts
import { createIMESafeEnterHandler } from "ime-safe";

const textarea = document.querySelector("textarea");

textarea?.addEventListener(
  "keydown",
  createIMESafeEnterHandler({
    onEnter() {
      sendMessage();
    },
  }),
);
```

That's it. No composition event handlers are needed. Enter sends, Shift+Enter
inserts a newline, and Enter that confirms an IME conversion is left to the IME.

## Core API

Import from `ime-safe`. The Core API has no React dependency and is safe to
import during SSR.

### `createIMESafeEnterHandler(options)`

Returns a `keydown` handler for an `<input>`, `<textarea>`, or
`contentEditable` element. It accepts native `KeyboardEvent`s and
framework events with the same fields.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `onEnter` | `(event: T) => void` | Required | Called on a plain Enter that is not part of an IME composition. |
| `shiftEnter` | `"newline" \| "submit"` | `"newline"` | `"newline"` passes Shift+Enter through to the browser; `"submit"` calls `onEnter`. |
| `allowRepeat` | `boolean` | `false` | When `false`, holding Enter calls `onEnter` only on the first keydown. |
| `preventDefault` | `boolean` | `true` | Prevents the browser default (newline or implicit form submission) for handled Enter, including suppressed repeats. |

Behavior details:

- Enter that confirms an IME conversion never calls `onEnter` and is never
  prevented, so the IME receives it.
- Ctrl, Meta, and Alt + Enter pass through untouched, leaving them free for
  your own shortcuts.
- `T` defaults to `IMESafeKeyboardEvent`. Pass a type argument, such as
  `createIMESafeEnterHandler<KeyboardEvent>(...)`, to type `onEnter`'s event.

### `isIMEComposing(event)`

A stateless check that returns `true` when a keyboard event belongs to an IME
composition. It accepts native `KeyboardEvent`s, React keyboard events, or
plain objects. Use it to build your own key handling:

```ts
import { isIMEComposing } from "ime-safe";

input.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !isIMEComposing(event)) closeDialog();
});
```

It returns `true` if the event or its `nativeEvent` has any of the following:

| Signal | Why |
| --- | --- |
| `isComposing === true` | Standard flag (Chrome, Edge, Firefox) |
| `keyCode === 229` | Safari's confirming Enter, after `compositionend` |
| `key === "Process"` | Chrome on Windows |

## React API

Import from `ime-safe/react`.

### `useIMESafeEnter(options)`

Returns `{ onKeyDown }` to attach to an `<input>`, `<textarea>`, or
`contentEditable` element. It takes the same options as
`createIMESafeEnterHandler`, with `onEnter` receiving a React `KeyboardEvent<T>`.

```tsx
import { useIMESafeEnter } from "ime-safe/react";

function MessageInput() {
  const { onKeyDown } = useIMESafeEnter<HTMLTextAreaElement>({
    onEnter() {
      sendMessage();
    },
  });

  return <textarea onKeyDown={onKeyDown} />;
}
```

`onKeyDown` keeps the same identity across renders and always uses the latest
committed options, so it is safe to pass inline callbacks.

### `useIME()`

Tracks composition state for **rendering**, such as showing a
"composing…" indicator.

```tsx
import { isIMEComposing } from "ime-safe";
import { useIME } from "ime-safe/react";

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

## Framework examples

There are no framework-specific packages besides React. Pass the Core handler
to the element's `keydown` event.

### Vue

```vue
<script setup lang="ts">
import { createIMESafeEnterHandler } from "ime-safe";

const onKeyDown = createIMESafeEnterHandler({
  onEnter() {
    sendMessage();
  },
});
</script>

<template>
  <textarea @keydown="onKeyDown" />
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { createIMESafeEnterHandler } from "ime-safe";

  const onKeyDown = createIMESafeEnterHandler({
    onEnter() {
      sendMessage();
    },
  });
</script>

<!-- Svelte 5; in Svelte 4 use on:keydown={onKeyDown} -->
<textarea onkeydown={onKeyDown}></textarea>
```

### Other frameworks

Solid, Preact, Lit, and other libraries that expose DOM `keydown` events can
use the handler the same way, for example `<textarea onKeyDown={onKeyDown} />`
in Solid.

## Exports

| Entry point | Exports |
| --- | --- |
| `ime-safe` | `createIMESafeEnterHandler`, `isIMEComposing`, and the types `IMESafeEnterOptions`, `IMESafeEnterHandler`, `IMESafeKeyboardEvent`, `KeyboardEventLike` (React-free) |
| `ime-safe/core` | Same as `ime-safe`; kept for compatibility with 0.1 |
| `ime-safe/react` | `useIMESafeEnter`, `useIME`, and the types `UseIMESafeEnterOptions`, `UseIMESafeEnterResult`, `UseIMEResult` |

### Migrating from 0.1

The React hooks moved from `ime-safe` to `ime-safe/react`, so the root entry no
longer imports React:

```diff
- import { useIMESafeEnter, useIME } from "ime-safe";
+ import { useIMESafeEnter, useIME } from "ime-safe/react";
```

`isIMEComposing` remains available from `ime-safe` and `ime-safe/core`.

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
| Frameworks | Vanilla JavaScript and TypeScript, React 17 or later (`ime-safe/react`), and any framework that exposes DOM `keydown` events, such as Vue, Svelte, and Solid |
| Browsers | Chrome, Edge, Safari, Firefox |
| IMEs | Japanese, Chinese, Korean |
| SSR | The Core API is safe to import and call on the server. React hooks are safe to import on the server; call them only from React components (with React Server Components, in a `"use client"` component). |
| Module format | ESM only. On Node.js 20.19+ or 22.12+, `require("ime-safe")` also works through [require(esm)](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require); older CommonJS environments can use `import("ime-safe")`. |

Browser behavior is covered by automated tests that replay each browser's
event ordering against both the Core handler and the React hook. Vue, Svelte,
and Solid examples are not covered by automated tests; they rely on the same DOM
`keydown` events. Verification with real OS IMEs is tracked in the
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
