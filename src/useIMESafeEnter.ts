import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { isIMEComposing } from "./isIMEComposing.js";

export type UseIMESafeEnterOptions<T extends HTMLElement = HTMLElement> = {
  onEnter: (event: KeyboardEvent<T>) => void;
  /** Defaults to "newline", passing Shift+Enter through untouched. */
  shiftEnter?: "newline" | "submit";
  /** Defaults to false, suppressing held-key submissions. */
  allowRepeat?: boolean;
  /** Defaults to true; also prevents the default action of suppressed repeats. */
  preventDefault?: boolean;
};

export type UseIMESafeEnterResult<T extends HTMLElement = HTMLElement> = {
  onKeyDown: (event: KeyboardEvent<T>) => void;
};

/** Handles Enter without intercepting IME confirmation or modifier shortcuts. */
export function useIMESafeEnter<T extends HTMLElement = HTMLElement>(
  options: UseIMESafeEnterOptions<T>,
): UseIMESafeEnterResult<T> {
  const latestOptions = useRef(options);
  // Publish committed options before browser events without leaking suspended renders.
  // Select the effect at render time so server imports never read browser globals.
  const useCommitEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useCommitEffect(() => {
    latestOptions.current = options;
  });

  const onKeyDown = useCallback((event: KeyboardEvent<T>) => {
    if (
      event.key !== "Enter" || isIMEComposing(event) ||
      event.ctrlKey || event.metaKey || event.altKey
    ) return;
    const { onEnter, shiftEnter = "newline", preventDefault = true, allowRepeat = false } = latestOptions.current;
    if (event.shiftKey && shiftEnter !== "submit") return;
    if (preventDefault) event.preventDefault();
    if (event.repeat && !allowRepeat) return;
    onEnter(event);
  }, []);

  return { onKeyDown };
}
