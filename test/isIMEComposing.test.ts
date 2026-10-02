import { describe, expect, it } from "vitest";
import { isIMEComposing } from "../src";

describe("isIMEComposing", () => {
  describe("native KeyboardEvent", () => {
    it("returns false for a normal Enter", () => {
      const event = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13 });
      expect(isIMEComposing(event)).toBe(false);
    });

    it("returns true when isComposing is true", () => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 13,
        isComposing: true,
      });
      expect(isIMEComposing(event)).toBe(true);
    });

    it("returns true when keyCode is 229 even if isComposing is false (Safari)", () => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 229,
        isComposing: false,
      });
      expect(isIMEComposing(event)).toBe(true);
    });

    it('returns true when key is "Process" (Chrome on Windows)', () => {
      const event = new KeyboardEvent("keydown", { key: "Process" });
      expect(isIMEComposing(event)).toBe(true);
    });
  });

  describe("plain objects (KeyboardEventLike)", () => {
    it("returns false for an empty object", () => {
      expect(isIMEComposing({})).toBe(false);
    });

    it.each([
      [{ key: "Enter", keyCode: 13, isComposing: false }, false],
      [{ key: "a", keyCode: 65 }, false],
      [{ isComposing: true }, true],
      [{ keyCode: 229 }, true],
      [{ key: "Process" }, true],
    ])("%o → %s", (event, expected) => {
      expect(isIMEComposing(event)).toBe(expected);
    });
  });

  describe("React-style events (nativeEvent)", () => {
    it("reads isComposing from nativeEvent", () => {
      expect(
        isIMEComposing({ key: "Enter", keyCode: 13, nativeEvent: { isComposing: true } }),
      ).toBe(true);
    });

    it("reads keyCode 229 from nativeEvent", () => {
      expect(isIMEComposing({ key: "Enter", nativeEvent: { keyCode: 229 } })).toBe(true);
    });

    it("reads Process from nativeEvent even when the wrapper has a normal key", () => {
      expect(isIMEComposing({ key: "Enter", nativeEvent: { key: "Process" } })).toBe(true);
    });

    it("does not let false native fields override an outer IME marker", () => {
      expect(isIMEComposing({ isComposing: true, nativeEvent: { isComposing: false } })).toBe(true);
      expect(isIMEComposing({ keyCode: 229, nativeEvent: { keyCode: 13 } })).toBe(true);
    });

    it("returns false when neither the event nor nativeEvent is composing", () => {
      expect(
        isIMEComposing({
          key: "Enter",
          keyCode: 13,
          nativeEvent: { isComposing: false, keyCode: 13, key: "Enter" },
        }),
      ).toBe(false);
    });
  });

  it("does not depend on any previous event (stateless)", () => {
    expect(isIMEComposing({ isComposing: true })).toBe(true);
    expect(isIMEComposing({ key: "Enter", keyCode: 13 })).toBe(false);
  });
});
