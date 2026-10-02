// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useIME, useIMESafeEnter } from "../src";

function App() {
  const { isComposing, compositionProps } = useIME();
  const { onKeyDown } = useIMESafeEnter({ onEnter: () => {} });
  return <textarea {...compositionProps} onKeyDown={onKeyDown} data-composing={isComposing} />;
}

describe("SSR", () => {
  it("renders on the server without touching window / document", () => {
    expect(typeof window).toBe("undefined");
    expect(() => renderToString(<App />)).not.toThrow();
  });
});
