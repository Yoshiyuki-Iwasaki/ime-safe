/** The keyboard fields used for IME detection, including React's native event. */
export type KeyboardEventLike = {
  key?: string;
  keyCode?: number;
  isComposing?: boolean;
  nativeEvent?: {
    key?: string;
    keyCode?: number;
    isComposing?: boolean;
  };
};

function hasIMEMarker(event: Omit<KeyboardEventLike, "nativeEvent">): boolean {
  return event.isComposing === true || event.keyCode === 229 || event.key === "Process";
}

/** Stateless detection for native keyboard events, React events, or plain objects. */
export function isIMEComposing(event: KeyboardEventLike): boolean {
  return hasIMEMarker(event) || (event.nativeEvent !== undefined && hasIMEMarker(event.nativeEvent));
}
