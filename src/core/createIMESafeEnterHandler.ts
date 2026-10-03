import { isIMEComposing, type KeyboardEventLike } from "./isIMEComposing.js";

/** The keyboard fields read by IME-safe Enter handling; native and React events both fit. */
export type IMESafeKeyboardEvent = KeyboardEventLike & {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  preventDefault?: () => void;
};

export type IMESafeEnterOptions<T extends IMESafeKeyboardEvent = IMESafeKeyboardEvent> = {
  onEnter: (event: T) => void;
  /** Defaults to "newline", passing Shift+Enter through untouched. */
  shiftEnter?: "newline" | "submit";
  /** Defaults to false, suppressing held-key submissions. */
  allowRepeat?: boolean;
  /** Defaults to true; also prevents the default action of suppressed repeats. */
  preventDefault?: boolean;
};

export type IMESafeEnterHandler<T extends IMESafeKeyboardEvent = IMESafeKeyboardEvent> = (event: T) => void;

/** The single Enter decision shared by the Core handler and the React hook. */
export function handleIMESafeEnter<T extends IMESafeKeyboardEvent>(
  event: T,
  options: IMESafeEnterOptions<T>,
): void {
  if (
    event.key !== "Enter" || isIMEComposing(event) ||
    event.ctrlKey || event.metaKey || event.altKey
  ) return;
  const { onEnter, shiftEnter = "newline", preventDefault = true, allowRepeat = false } = options;
  if (event.shiftKey && shiftEnter !== "submit") return;
  if (preventDefault) event.preventDefault?.();
  if (event.repeat && !allowRepeat) return;
  onEnter(event);
}

/** Creates a keydown listener that handles Enter without intercepting IME confirmation or modifier shortcuts. */
export function createIMESafeEnterHandler<T extends IMESafeKeyboardEvent = IMESafeKeyboardEvent>(
  options: IMESafeEnterOptions<T>,
): IMESafeEnterHandler<T> {
  return (event) => handleIMESafeEnter(event, options);
}
