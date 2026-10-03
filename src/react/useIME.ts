import { useCallback, useMemo, useState, type FocusEvent, type CompositionEvent } from "react";

export type UseIMEResult = {
  /** Composition state for rendering; use isIMEComposing(event) to guard keydown. */
  isComposing: boolean;
  compositionProps: {
    onCompositionStart: (event: CompositionEvent) => void;
    onCompositionEnd: (event: CompositionEvent) => void;
    onBlur: (event: FocusEvent) => void;
  };
};

/** Tracks composition state for an input, textarea, or contentEditable element. */
export function useIME(): UseIMEResult {
  const [isComposing, setIsComposing] = useState(false);
  const onCompositionStart = useCallback((_event: CompositionEvent) => setIsComposing(true), []);
  const onCompositionEnd = useCallback((_event: CompositionEvent) => setIsComposing(false), []);
  const onBlur = useCallback((_event: FocusEvent) => setIsComposing(false), []);
  const compositionProps = useMemo(
    () => ({ onCompositionStart, onCompositionEnd, onBlur }),
    [onCompositionStart, onCompositionEnd, onBlur],
  );
  return { isComposing, compositionProps };
}
