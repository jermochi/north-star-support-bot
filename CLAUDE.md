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
8. **No emojis anywhere** — not in bot copy, UI, or docs. Status/mode indicators
   use styled CSS elements (e.g. a colored dot), never emoji glyphs.

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

## Design direction & tokens (locked in Phase 2)

**Concept: celestial navigation meets the trail.** North Star (night sky, a
guiding star) × outdoorsy (pine, trail) × modern (restraint, whitespace, one
focal point per view). Build all styling from these tokens — no one-off values.

```css
/* Color — light is the primary experience; dark mirrors it */
--ink:        #10201A;  /* night-sky spruce — header, primary text */
--pine:       #1E5B45;  /* brand green — user bubbles, primary actions */
--pine-deep:  #164033;  /* hover/pressed */
--star:       #E8B04B;  /* guiding-star gold — ONE focal accent per view (send, active chip) */
--paper:      #F7F5EF;  /* app background, warm off-white */
--surface:    #FFFFFF;  /* chat panel */
--bot-bubble: #ECF0EC;  /* soft sage-grey — bot messages */
--text:       #14211C;
--text-muted: #5C6B63;
--hairline:   #E3E1D8;  /* borders/dividers */
--agent:      #0FA37F;  /* LIVE AGENT mode accent — distinct from brand pine, pairs with a CSS status dot */

/* Type — system stack only (no external fonts) */
--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

/* Radius — restrained, consistent */
--r-panel: 16px;  --r-bubble: 14px;  --r-chip: 999px;  /* pill */

/* Motion — purposeful only; honor prefers-reduced-motion */
--ease: cubic-bezier(0.2, 0, 0, 1);  --dur-fast: 120ms;  --dur: 200ms;
```

Rules: gold (`--star`) is an accent, not a fill — one focal point per view.
LIVE AGENT mode visibly shifts the header to `--agent` with a small CSS status
dot (a styled `<span>`, NOT an emoji). WCAG AA contrast minimum. No gradient
text, no glow, no decorative left-border stripes.

## Build phases (see `.local/SPEC.md` for full detail)

- **Phase 1 — Set up:** file structure + these build rules. ← current
- **Phase 2 — Design:** conversation spec locked (already in `.local/SPEC.md` §3).
- **Phase 3 — Build:** implement state machine, intents, disambiguation,
  two-strike fallback, inline order-number detection, exact copy deck.
- **Phase 4 — QA:** run every row of the matrix by hand, fill in `TESTING.md`.
- **Phase 5–8:** deploy (GitHub Pages), README, video demo, submit.
