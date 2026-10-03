import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIMESafeEnterHandler,
  type IMESafeEnterHandler,
  type IMESafeEnterOptions,
  type IMESafeKeyboardEvent,
} from "../src/core";
import {
  chromeConfirm,
  firefoxConfirm,
  koreanChromeEnter,
  plainEnter,
  safariConfirm,
  windowsChromeConfirm,
} from "./sequences";

type Options = Partial<IMESafeEnterOptions>;

/** Plain-object events, as any framework or test double might pass them. */
function press(init: IMESafeKeyboardEvent, options: Options = {}) {
  const onEnter = vi.fn();
  const preventDefault = vi.fn();
  const event = { key: "Enter", keyCode: 13, preventDefault, ...init };
  createIMESafeEnterHandler({ onEnter, ...options })(event);
  return { onEnter, preventDefault, event };
}

/** A real DOM element wired up the way the README tells vanilla users to. */
function setup(options: Options = {}) {
  const onEnter = vi.fn();
  const field = document.createElement("textarea");
  document.body.append(field);
  field.addEventListener("keydown", createIMESafeEnterHandler({ onEnter, ...options }));
  return { onEnter, field };
}

describe("createIMESafeEnterHandler", () => {
  afterEach(() => document.body.replaceChildren());

  describe("plain events", () => {
    it("calls onEnter once for a normal Enter and prevents its default", () => {
      const { onEnter, preventDefault, event } = press({});
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledWith(event);
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it.each(["a", " ", "Tab", "Escape", "NumpadEnter"])("ignores non-Enter key %j", (key) => {
      const { onEnter, preventDefault } = press({ key });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it.each<[string, IMESafeKeyboardEvent]>([
      ["isComposing", { isComposing: true }],
      ["keyCode 229", { keyCode: 229 }],
      ["key Process", { key: "Process", keyCode: 229 }],
      ["nativeEvent.isComposing", { nativeEvent: { isComposing: true } }],
      ["nativeEvent.keyCode 229", { nativeEvent: { keyCode: 229 } }],
      ["nativeEvent.key Process", { nativeEvent: { key: "Process" } }],
    ])("leaves IME events to the IME: %s", (_, init) => {
      const { onEnter, preventDefault } = press(init);
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it.each(["ctrlKey", "metaKey", "altKey"])("passes %s+Enter through untouched", (modifier) => {
      const { onEnter, preventDefault } = press({ [modifier]: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("does not call onEnter for IME events even when repeats are allowed", () => {
      const { onEnter, preventDefault } = press({ isComposing: true, repeat: true }, { allowRepeat: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("tolerates events without preventDefault", () => {
      const onEnter = vi.fn();
      const handler = createIMESafeEnterHandler({ onEnter });
      expect(() => handler({ key: "Enter" })).not.toThrow();
      expect(() => handler({ key: "Enter", repeat: true })).not.toThrow();
      expect(onEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe("shiftEnter", () => {
    it('defaults to "newline": Shift+Enter keeps the browser default', () => {
      const { onEnter, preventDefault } = press({ shiftKey: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('"newline" explicitly: Shift+Enter keeps the browser default', () => {
      const { onEnter, preventDefault } = press({ shiftKey: true }, { shiftEnter: "newline" });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('"submit": Shift+Enter is handled like Enter', () => {
      const { onEnter, preventDefault } = press({ shiftKey: true }, { shiftEnter: "submit" });
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it('"submit": Shift+Enter during composition is still ignored', () => {
      const { onEnter, preventDefault } = press({ shiftKey: true, isComposing: true }, { shiftEnter: "submit" });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("allowRepeat", () => {
    it("defaults to false: suppresses repeats but still prevents their default", () => {
      const { onEnter, preventDefault } = press({ repeat: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it("true: calls onEnter for repeats", () => {
      const { onEnter, preventDefault } = press({ repeat: true }, { allowRepeat: true });
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it('suppresses repeats in Shift+Enter "submit" mode', () => {
      const { onEnter, preventDefault } = press({ shiftKey: true, repeat: true }, { shiftEnter: "submit" });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it("leaves repeated Shift+Enter newlines untouched", () => {
      const { onEnter, preventDefault } = press({ shiftKey: true, repeat: true });
      expect(onEnter).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("preventDefault: false", () => {
    it.each<[string, IMESafeKeyboardEvent, number]>([
      ["Enter", {}, 1],
      ["suppressed repeat", { repeat: true }, 0],
    ])("never prevents default (%s)", (_, init, calls) => {
      const { onEnter, preventDefault } = press(init, { preventDefault: false });
      expect(onEnter).toHaveBeenCalledTimes(calls);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("on a real DOM element (addEventListener)", () => {
    it("calls onEnter with the native KeyboardEvent and cancels it", () => {
      const { onEnter, field } = setup();
      expect(fireEvent.keyDown(field, { key: "Enter", keyCode: 13 })).toBe(false);
      expect(onEnter).toHaveBeenCalledTimes(1);
      const event = onEnter.mock.calls[0][0];
      expect(event).toBeInstanceOf(KeyboardEvent);
      expect(event.target).toBe(field);
    });

    it("does not cancel an IME confirmation keydown", () => {
      const { onEnter, field } = setup();
      expect(fireEvent.keyDown(field, { key: "Enter", keyCode: 229, isComposing: true })).toBe(true);
      expect(onEnter).not.toHaveBeenCalled();
    });

    it("suppresses held-key submissions and their browser default", () => {
      const { onEnter, field } = setup();
      plainEnter(field);
      expect(fireEvent.keyDown(field, { key: "Enter", repeat: true })).toBe(false);
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

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

  it("types onEnter with the event type the handler receives", () => {
    const handler: IMESafeEnterHandler<KeyboardEvent> = createIMESafeEnterHandler<KeyboardEvent>({
      onEnter: (event) => {
        // A native-only method: compiles only if onEnter receives T.
        event.getModifierState("Shift");
      },
    });
    // Assignable to a DOM listener without casts.
    document.createElement("input").addEventListener("keydown", handler);
    // React-like synthetic events are accepted through KeyboardEventLike.
    createIMESafeEnterHandler({ onEnter: () => {} })({
      key: "Enter",
      nativeEvent: { isComposing: false },
      preventDefault: () => {},
    });
  });
});
