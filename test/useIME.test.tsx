import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { CompositionEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { isIMEComposing, useIME } from "../src";
import { chromeConfirm, safariConfirm } from "./sequences";

type Target = "input" | "textarea" | "contentEditable";

function Field({ target = "textarea", onSend = () => {} }: { target?: Target; onSend?: () => void }) {
  const { isComposing, compositionProps } = useIME();
  const props = {
    "data-testid": "field",
    ...compositionProps,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && !isIMEComposing(event)) onSend();
    },
  };
  return (
    <>
      {target === "input" && <input {...props} />}
      {target === "textarea" && <textarea {...props} />}
      {target === "contentEditable" && <div {...props} contentEditable suppressContentEditableWarning />}
      <output data-testid="state">{String(isComposing)}</output>
    </>
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("useIME", () => {
  it("is not composing initially", () => {
    const { result } = renderHook(() => useIME());
    expect(result.current.isComposing).toBe(false);
  });

  it("exposes onCompositionStart / onCompositionEnd handlers", () => {
    const { result } = renderHook(() => useIME());
    expect(result.current.compositionProps.onCompositionStart).toBeTypeOf("function");
    expect(result.current.compositionProps.onCompositionEnd).toBeTypeOf("function");
  });

  it("toggles isComposing on composition start / end via the hook API", () => {
    const { result } = renderHook(() => useIME());
    const event = {} as CompositionEvent;
    act(() => result.current.compositionProps.onCompositionStart(event));
    expect(result.current.isComposing).toBe(true);
    act(() => result.current.compositionProps.onCompositionEnd(event));
    expect(result.current.isComposing).toBe(false);
  });

  describe.each<Target>(["input", "textarea", "contentEditable"])("on %s", (target) => {
    it("resets on blur without compositionend and allows a new composition", () => {
      render(<Field target={target} />);
      const field = screen.getByTestId("field");
      fireEvent.compositionStart(field);
      expect(state()).toBe("true");
      fireEvent.blur(field);
      expect(state()).toBe("false");
      fireEvent.compositionStart(field);
      expect(state()).toBe("true");
      fireEvent.compositionEnd(field);
      expect(state()).toBe("false");
    });
    it("is true after compositionstart", () => {
      render(<Field target={target} />);
      fireEvent.compositionStart(screen.getByTestId("field"), { data: "" });
      expect(state()).toBe("true");
    });

    it("stays true during compositionupdate", () => {
      render(<Field target={target} />);
      const field = screen.getByTestId("field");
      fireEvent.compositionStart(field, { data: "" });
      fireEvent.compositionUpdate(field, { data: "に" });
      fireEvent.compositionUpdate(field, { data: "にほ" });
      expect(state()).toBe("true");
    });

    it("is false after compositionend", () => {
      render(<Field target={target} />);
      const field = screen.getByTestId("field");
      fireEvent.compositionStart(field, { data: "" });
      fireEvent.compositionEnd(field, { data: "日本" });
      expect(state()).toBe("false");
    });
  });

  it("tracks consecutive compositions", () => {
    render(<Field />);
    const field = screen.getByTestId("field");
    for (const word of ["今日", "は", "晴れ"]) {
      fireEvent.compositionStart(field, { data: "" });
      expect(state()).toBe("true");
      fireEvent.compositionEnd(field, { data: word });
      expect(state()).toBe("false");
    }
  });

  it("keeps stable compositionProps handlers across renders", () => {
    const { result, rerender } = renderHook(() => useIME());
    const { onCompositionStart, onCompositionEnd, onBlur } = result.current.compositionProps;
    rerender();
    expect(result.current.compositionProps.onCompositionStart).toBe(onCompositionStart);
    expect(result.current.compositionProps.onCompositionEnd).toBe(onCompositionEnd);
    expect(result.current.compositionProps.onBlur).toBe(onBlur);
  });

  describe("recommended usage with isIMEComposing (README example)", () => {
    it("does not send on Chrome-style confirmation", () => {
      const onSend = vi.fn();
      render(<Field onSend={onSend} />);
      chromeConfirm(screen.getByTestId("field"));
      expect(onSend).not.toHaveBeenCalled();
    });

    it("does not send on Safari-style confirmation, even though isComposing is already false", () => {
      const onSend = vi.fn();
      render(<Field onSend={onSend} />);
      safariConfirm(screen.getByTestId("field"));
      expect(state()).toBe("false");
      expect(onSend).not.toHaveBeenCalled();
    });

    it("sends on a normal Enter", () => {
      const onSend = vi.fn();
      render(<Field onSend={onSend} />);
      fireEvent.keyDown(screen.getByTestId("field"), { key: "Enter", keyCode: 13 });
      expect(onSend).toHaveBeenCalledTimes(1);
    });
  });
});
