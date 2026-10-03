import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { handleIMESafeEnter, type IMESafeEnterOptions } from "../core/createIMESafeEnterHandler.js";

export type UseIMESafeEnterOptions<T extends HTMLElement = HTMLElement> = IMESafeEnterOptions<KeyboardEvent<T>>;

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
    handleIMESafeEnter(event, latestOptions.current);
  }, []);

  return { onKeyDown };
}
