# North Star Support Bot — Project Build Rules

Rule-based, 100% client-side customer support chatbot for a simulated outdoor
apparel & camping gear store ("North Star Outfitters"). Static web app: vanilla
HTML/CSS/JS, no frameworks, no build step. Full design spec lives in
`.local/SPEC.md`.

## HARD BUILD RULES (non-negotiable — these protect contract section 7.a.i)

1. **No frameworks, no npm, no `package.json`, no build step.** Vanilla
   HTML/CSS/JS only.
2. **No external requests of any kind** — no CDNs, no Google Fonts, no
   `fetch`/XHR, no analytics, no APIs. System fonts only.
3. **Must run from `file://` with Wi-Fi off.** This is the proof of zero
   dependencies — if it needs a network, it's wrong.
4. **Zero console errors.**
5. **No LLM/API dependency.** The bot is a deterministic state machine +
   keyword intent matcher.
6. **Business data is verbatim.** Never paraphrase order statuses, the return
   policy, or shipping times. Wording is a graded criterion (6.c). Copy exact
   strings from `.local/SPEC.md`.
7. **Both input modes everywhere.** Every state must accept both quick-reply
   chip clicks and free-typed input.

## File structure

```
north-star-support-bot/
├── CLAUDE.md         ← this file: build rules + structure
├── index.html        ← the chatbot
├── returns.html      ← minimal branded returns page (real, in-repo returns link)
├── styles.css
├── script.js
├── TESTING.md        ← QA matrix (Section 5 of the spec)
├── README.md         ← evaluator instructions (Section 7 of the spec)
└── .local/
    └── SPEC.md       ← full execution plan + conversation spec (not tracked as root deliverable)
```

## Build phases (see `.local/SPEC.md` for full detail)

- **Phase 1 — Set up:** file structure + these build rules. ← current
- **Phase 2 — Design:** conversation spec locked (already in `.local/SPEC.md` §3).
- **Phase 3 — Build:** implement state machine, intents, disambiguation,
  two-strike fallback, inline order-number detection, exact copy deck.
- **Phase 4 — QA:** run every row of the matrix by hand, fill in `TESTING.md`.
- **Phase 5–8:** deploy (GitHub Pages), README, video demo, submit.
