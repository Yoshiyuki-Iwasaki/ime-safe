import { fireEvent } from "@testing-library/react";

/**
 * Replays the event sequences that real browsers emit when the user confirms
 * an IME composition with Enter. jsdom cannot drive a real IME, so each
 * browser's ordering is reproduced by hand.
 */

const enter = { key: "Enter", code: "Enter" } as const;

export function plainEnter(el: Element, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(el, { ...enter, keyCode: 13, ...init });
  fireEvent.keyUp(el, { ...enter, keyCode: 13, ...init });
}

/** Chrome / Edge: keydown(isComposing, 229) → compositionend */
export function chromeConfirm(el: Element, data = "日本語") {
  fireEvent.compositionStart(el, { data: "" });
  fireEvent.compositionUpdate(el, { data });
  fireEvent.keyDown(el, { ...enter, keyCode: 229, isComposing: true });
  fireEvent.compositionEnd(el, { data });
  fireEvent.keyUp(el, { ...enter, keyCode: 13 });
}

/** Safari (macOS): compositionend → keydown(isComposing=false, 229) */
export function safariConfirm(el: Element, data = "日本語") {
  fireEvent.compositionStart(el, { data: "" });
  fireEvent.compositionUpdate(el, { data });
  fireEvent.compositionEnd(el, { data });
  fireEvent.keyDown(el, { ...enter, keyCode: 229, isComposing: false });
  fireEvent.keyUp(el, { ...enter, keyCode: 13 });
}

/** Firefox: keydown(isComposing) → compositionend */
export function firefoxConfirm(el: Element, data = "日本語") {
  fireEvent.compositionStart(el, { data: "" });
  fireEvent.compositionUpdate(el, { data });
  fireEvent.keyDown(el, { ...enter, keyCode: 13, isComposing: true });
  fireEvent.compositionEnd(el, { data });
  fireEvent.keyUp(el, { ...enter, keyCode: 13 });
}

/** Chrome on Windows: keydown(key="Process", 229) → compositionend */
export function windowsChromeConfirm(el: Element, data = "中文") {
  fireEvent.compositionStart(el, { data: "" });
  fireEvent.compositionUpdate(el, { data });
  fireEvent.keyDown(el, { key: "Process", code: "Enter", keyCode: 229 });
  fireEvent.compositionEnd(el, { data });
  fireEvent.keyUp(el, { ...enter, keyCode: 13 });
}

/**
 * Korean IME on Chrome (macOS): keydown(isComposing, 229) → compositionend →
 * keydown(13). The second keydown is a real Enter the user intends to submit.
 */
export function koreanChromeEnter(el: Element, data = "한") {
  fireEvent.compositionStart(el, { data: "" });
  fireEvent.compositionUpdate(el, { data });
  fireEvent.keyDown(el, { ...enter, keyCode: 229, isComposing: true });
  fireEvent.compositionEnd(el, { data });
  fireEvent.keyDown(el, { ...enter, keyCode: 13, isComposing: false });
  fireEvent.keyUp(el, { ...enter, keyCode: 13 });
}
