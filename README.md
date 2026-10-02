# ime-safe

Small TypeScript utilities for IME-safe keyboard handling in React 17 and later.
Supports inputs, textareas, and `contentEditable`, with no runtime dependencies
other than the React peer dependency. The package ships ES modules and TypeScript declarations.

```sh
npm install ime-safe
```

## Safe Enter handling

```tsx
import { useIMESafeEnter } from "ime-safe";

function MessageInput({ sendMessage }: { sendMessage: () => void }) {
  const { onKeyDown } = useIMESafeEnter<HTMLTextAreaElement>({
    onEnter: sendMessage,
  });
  return <textarea onKeyDown={onKeyDown} />;
}
```

Plain Enter calls `onEnter(event)` and prevents the default action, avoiding an
extra newline or implicit form submission. IME confirmation passes through untouched.

| Option | Default | Behavior |
| --- | --- | --- |
| `onEnter` | Required | Receives the React keyboard event |
| `shiftEnter` | `"newline"` | Passes Shift+Enter through; `"submit"` calls `onEnter` |
| `preventDefault` | `true` | Prevents the default action only when invoking `onEnter` |

Ctrl, Meta, and Alt + Enter pass through untouched. `onKeyDown` keeps the same
identity across renders and uses the latest committed callback and options.
No composition handlers are required. Use the same handler on `<input>` or
`<div contentEditable onKeyDown={onKeyDown} />`.

## Composition state and custom keyboard handling

```tsx
import { isIMEComposing, useIME } from "ime-safe";

function Input({ sendMessage }: { sendMessage: () => void }) {
  const { isComposing, compositionProps } = useIME();
  return (
    <>
      <textarea
        {...compositionProps}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isIMEComposing(event)) {
            event.preventDefault();
            sendMessage();
          }
        }}
      />
      {isComposing && <span>Composing…</span>}
    </>
  );
}
```

`useIME()` tracks `compositionstart` and `compositionend` for rendering indicators.
Its state must **not** guard keyboard actions: Safari can end composition before
the confirming Enter keydown, and React state updates are not synchronous.
If you attach your own composition handlers, call the corresponding
`compositionProps` handler as well; spreading props does not merge handlers.

`isIMEComposing(event)` is stateless and accepts native events, React events, or
plain objects with optional `key`, `keyCode`, `isComposing`, and `nativeEvent` fields.
It returns true if either event contains `isComposing === true`, `keyCode === 229`,
or `key === "Process"`. The deprecated `keyCode` is intentionally retained for
Safari's confirming Enter. It uses no timeout after composition ends, allowing
the real second Enter keydown emitted by Korean IMEs to submit immediately.

For non-React code, the core export does not import React:

```ts
import { isIMEComposing } from "ime-safe/core";
```

Hooks can render on the server. In React Server Component applications, use
hooks inside a client component (`"use client"`).

## Development and verification

Use Node.js 22.14+ for the development tooling.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm pack` runs type checking, tests, and the build before packaging. Only the
built library, documentation, README, license, and package metadata are shipped.
The React peer dependency is not bundled. This is an ESM package.

Unit tests replay Chrome/Edge, Safari, Firefox, Windows Chrome, and Korean IME
event orderings in jsdom; they do not operate a real IME. Real-browser verification
and its current status are documented in [the manual checklist](docs/manual-testing.md).
