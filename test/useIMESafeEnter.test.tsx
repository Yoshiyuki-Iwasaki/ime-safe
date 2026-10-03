import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { startTransition, Suspense, useState, type KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useIMESafeEnter, type UseIMESafeEnterOptions } from "../src/react";
import {
  chromeConfirm,
  firefoxConfirm,
  koreanChromeEnter,
  plainEnter,
  safariConfirm,
  windowsChromeConfirm,
} from "./sequences";

type Options = UseIMESafeEnterOptions;
type Target = "input" | "textarea" | "contentEditable";

function Field({ target = "textarea", ...options }: Options & { target?: Target }) {
  const { onKeyDown } = useIMESafeEnter(options);
  if (target === "input") return <input data-testid="field" onKeyDown={onKeyDown} />;
  if (target === "contentEditable") {
    return <div data-testid="field" contentEditable suppressContentEditableWarning onKeyDown={onKeyDown} />;
  }
  return <textarea data-testid="field" onKeyDown={onKeyDown} />;
}

function setup(options: Partial<Options> & { target?: Target } = {}) {
  const onEnter = vi.fn();
  render(<Field onEnter={onEnter} {...options} />);
  return { onEnter, field: screen.getByTestId("field") };
}

describe("useIMESafeEnter", () => {
  it("suppresses held-key submissions and their browser default", () => {
    const { field, onEnter } = setup();
    plainEnter(field);
    expect(fireEvent.keyDown(field, { key: "Enter", repeat: true })).toBe(false);
    expect(onEnter).toHaveBeenCalledTimes(1);
    plainEnter(field);
    expect(onEnter).toHaveBeenCalledTimes(2);
  });

  it("preserves default actions for suppressed repeats when prevention is disabled", () => {
    const { field, onEnter } = setup({ preventDefault: false });
    expect(fireEvent.keyDown(field, { key: "Enter", repeat: true })).toBe(true);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("supports enabling repeat submissions after rerender", () => {
    const onEnter = vi.fn();
    const { rerender } = render(<Field onEnter={onEnter} />);
    const field = screen.getByTestId("field");
    fireEvent.keyDown(field, { key: "Enter", repeat: true });
    expect(onEnter).not.toHaveBeenCalled();
    rerender(<Field onEnter={onEnter} allowRepeat />);
    fireEvent.keyDown(field, { key: "Enter", repeat: true });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it.each([
    { isComposing: true }, { keyCode: 229 }, { ctrlKey: true },
    { metaKey: true }, { altKey: true }, { shiftKey: true },
  ])("leaves repeated passthrough events untouched: %o", (init) => {
    const { field, onEnter } = setup();
    expect(fireEvent.keyDown(field, { key: "Enter", repeat: true, ...init })).toBe(true);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("suppresses repeat submission in Shift+Enter submit mode", () => {
    const { field, onEnter } = setup({ shiftEnter: "submit" });
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true, repeat: true })).toBe(false);
    expect(onEnter).not.toHaveBeenCalled();
  });

  describe.each<Target>(["input", "textarea", "contentEditable"])("on %s", (target) => {
    it("calls onEnter for a normal Enter", () => {
      const { onEnter, field } = setup({ target });
      plainEnter(field);
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it("does not call onEnter when Enter confirms an IME composition", () => {
      const { onEnter, field } = setup({ target });
      chromeConfirm(field);
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe("Enter during IME composition", () => {
    it("ignores keydown with isComposing === true", () => {
      const { onEnter, field } = setup();
      fireEvent.keyDown(field, { key: "Enter", keyCode: 13, isComposing: true });
      expect(onEnter).not.toHaveBeenCalled();
    });

    it("ignores keydown with keyCode === 229", () => {
      const { onEnter, field } = setup();
      fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
      expect(onEnter).not.toHaveBeenCalled();
    });

    it('ignores keydown with key === "Process"', () => {
      const { onEnter, field } = setup();
      fireEvent.keyDown(field, { key: "Process", keyCode: 229 });
      expect(onEnter).not.toHaveBeenCalled();
    });

    it("does not preventDefault an ignored Enter (the IME needs it)", () => {
      const { field } = setup();
      const notCancelled = fireEvent.keyDown(field, { key: "Enter", keyCode: 229, isComposing: true });
      expect(notCancelled).toBe(true);
    });
  });

  describe("browser-specific confirmation sequences", () => {
    it.each([
      ["Chrome / Edge", chromeConfirm],
      ["Safari (compositionend before keydown)", safariConfirm],
      ["Firefox", firefoxConfirm],
      ["Chrome on Windows (key=Process)", windowsChromeConfirm],
    ])("%s: confirming does not call onEnter", (_, confirm) => {
      const { onEnter, field } = setup();
      confirm(field);
      expect(onEnter).not.toHaveBeenCalled();
    });

    it.each([
      ["Chrome / Edge", chromeConfirm],
      ["Safari", safariConfirm],
      ["Firefox", firefoxConfirm],
      ["Chrome on Windows", windowsChromeConfirm],
    ])("%s: a normal Enter right after confirming calls onEnter (no time window)", (_, confirm) => {
      const { onEnter, field } = setup();
      confirm(field);
      plainEnter(field);
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it("Korean IME on Chrome: the second (real) keydown calls onEnter exactly once", () => {
      const { onEnter, field } = setup();
      koreanChromeEnter(field);
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it("handles consecutive compositions", () => {
      const { onEnter, field } = setup();
      chromeConfirm(field, "今日は");
      safariConfirm(field, "いい天気");
      chromeConfirm(field, "ですね");
      expect(onEnter).not.toHaveBeenCalled();
      plainEnter(field);
      expect(onEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe("shiftEnter", () => {
    it('defaults to "newline": Shift+Enter does not call onEnter and is not prevented', () => {
      const { onEnter, field } = setup();
      const notCancelled = fireEvent.keyDown(field, { key: "Enter", keyCode: 13, shiftKey: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(notCancelled).toBe(true);
    });

    it('"submit": Shift+Enter calls onEnter', () => {
      const { onEnter, field } = setup({ shiftEnter: "submit" });
      fireEvent.keyDown(field, { key: "Enter", keyCode: 13, shiftKey: true });
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('"submit": Shift+Enter during composition is still ignored', () => {
      const { onEnter, field } = setup({ shiftEnter: "submit" });
      fireEvent.keyDown(field, { key: "Enter", keyCode: 229, isComposing: true, shiftKey: true });
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe("other modifiers", () => {
    it.each(["ctrlKey", "metaKey", "altKey"])("passes %s+Enter through untouched", (modifier) => {
      const { onEnter, field } = setup();
      const notCancelled = fireEvent.keyDown(field, { key: "Enter", keyCode: 13, [modifier]: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(notCancelled).toBe(true);
    });
  });

  describe("non-Enter keys", () => {
    it.each(["a", " ", "Tab", "Escape", "NumpadEnter"])("ignores %j", (key) => {
      const { onEnter, field } = setup();
      fireEvent.keyDown(field, { key });
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe("preventDefault", () => {
    it("defaults to true: prevents default only when onEnter is called", () => {
      const { field } = setup();
      const notCancelled = fireEvent.keyDown(field, { key: "Enter", keyCode: 13 });
      expect(notCancelled).toBe(false);
    });

    it("false: does not prevent default", () => {
      const { onEnter, field } = setup({ preventDefault: false });
      const notCancelled = fireEvent.keyDown(field, { key: "Enter", keyCode: 13 });
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(notCancelled).toBe(true);
    });
  });

  it("passes the keyboard event to onEnter", () => {
    const { onEnter, field } = setup();
    plainEnter(field);
    const event = onEnter.mock.calls[0][0] as KeyboardEvent<HTMLElement>;
    expect(event.key).toBe("Enter");
    expect(event.target).toBe(field);
  });

  it("returns a referentially stable onKeyDown", () => {
    const { result, rerender } = renderHook((props: Options) => useIMESafeEnter(props), {
      initialProps: { onEnter: () => {} },
    });
    const first = result.current.onKeyDown;
    rerender({ onEnter: () => {} });
    expect(result.current.onKeyDown).toBe(first);
  });

  it("always calls the latest onEnter", () => {
    function Counter() {
      const [count, setCount] = useState(0);
      const { onKeyDown } = useIMESafeEnter({ onEnter: () => setCount(count + 1) });
      return (
        <>
          <textarea data-testid="field" onKeyDown={onKeyDown} />
          <output data-testid="count">{count}</output>
        </>
      );
    }
    render(<Counter />);
    const field = screen.getByTestId("field");
    plainEnter(field);
    plainEnter(field);
    plainEnter(field);
    expect(screen.getByTestId("count").textContent).toBe("3");
  });

  it("keeps committed options when a subsequent render suspends", () => {
    const committed = vi.fn();
    const pending = vi.fn();
    const suspendedRender = vi.fn();
    const neverResolves = new Promise<void>(() => {});

    function Input({ suspend }: { suspend: boolean }) {
      const { onKeyDown } = useIMESafeEnter({
        onEnter: suspend ? pending : committed,
        shiftEnter: suspend ? "submit" : "newline",
        preventDefault: !suspend,
      });
      if (suspend) {
        suspendedRender();
        throw neverResolves;
      }
      return <textarea data-testid="field" onKeyDown={onKeyDown} />;
    }

    function App() {
      const [suspend, setSuspend] = useState(false);
      return (
        <>
          <button onClick={() => startTransition(() => setSuspend(true))}>Update</button>
          <Suspense fallback={<span>Loading</span>}>
            <Input suspend={suspend} />
          </Suspense>
        </>
      );
    }

    render(<App />);
    const field = screen.getByTestId("field");
    fireEvent.click(screen.getByText("Update"));
    expect(suspendedRender).toHaveBeenCalled();
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(field, { key: "Enter" })).toBe(false);
    expect(committed).toHaveBeenCalledTimes(1);
    expect(pending).not.toHaveBeenCalled();
  });

  it("uses updated shiftEnter and preventDefault options without changing the handler", () => {
    const onEnter = vi.fn();
    const { rerender } = render(<Field onEnter={onEnter} />);
    const field = screen.getByTestId("field");
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true })).toBe(true);
    expect(onEnter).not.toHaveBeenCalled();
    rerender(<Field onEnter={onEnter} shiftEnter="submit" preventDefault={false} />);
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true })).toBe(true);
    expect(onEnter).toHaveBeenCalledTimes(1);
    rerender(<Field onEnter={onEnter} shiftEnter="submit" preventDefault />);
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true })).toBe(false);
    expect(onEnter).toHaveBeenCalledTimes(2);
  });
});
