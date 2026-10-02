# Real IME verification

Automated tests replay keyboard/composition sequences in jsdom. They cannot
verify actual OS IME behavior. WebKit automation is not a Safari verification.
The checks below still require a person with the relevant browser and IME.

## Run the test page

From the repository root, run:

```sh
npm run build
python3 -m http.server 8080
```

Open http://localhost:8080/docs/manual-testing.html. The page uses the built
package and loads React from esm.sh, so an internet connection is required.
It displays a submission count, composition state, and the keyboard event log.

## Checklist

Repeat on input, textarea, and contentEditable in Chrome, Safari, and Firefox,
using Japanese, Chinese, and Korean IMEs where available. Record browser version,
OS version, IME name, date, and any failed steps.

- Plain Enter increments the submission count once.
- Holding Enter increments the count only once with the default repeat policy.
- Moving focus away mid-composition resets the composition indicator.
- Enter confirming Japanese or Chinese conversion leaves the count unchanged.
- A new Enter immediately after confirmation increments the count once.
- Korean Enter submits exactly once when the IME emits a second real keydown.
- Consecutive compositions do not submit accidentally.
- Composition state becomes true on start and false on end.
- Shift+Enter in newline mode leaves the count unchanged and inserts a newline
  on textarea/contentEditable (input has no multiline behavior).
- Shift+Enter in submit mode increments the count once.
- Ctrl/Meta/Alt + Enter does not increment the count. In a form, passthrough
  modifiers can still cause native submission; test the form onSubmit policy.
- IME confirmation is not canceled in either Shift+Enter mode.
- With preventDefault disabled, Enter submits while preserving the default action.

## Results

| Browser | OS / IME | Result | Date / notes |
| --- | --- | --- | --- |
| Chrome 154 | macOS 15.7.9 / Japanese | Pass (partial) | 2026-10-02: Japanese confirmation Enter and the next Enter passed. Other items not executed. |
| Safari 18.6 | macOS 15.7.9 / Japanese | Pass (partial) | 2026-10-02: Japanese confirmation Enter and the next Enter passed. Other items not executed. |
| Chrome / Safari | macOS / Chinese, Korean | Not executed | Includes the Korean second-Enter check |
| Firefox | Pending | Not executed | Real IME verification required |

Do not interpret passing jsdom sequence tests as these manual checks passing.
