# North Star Support Bot

Rule-based customer support chatbot for a simulated outdoor apparel & camping
gear store ("North Star Outfitters"). Built for the Upwork Talent Accelerator
program.

## Try it now (no setup, no keys, no accounts)

**Live demo:** https://jermochi.github.io/north-star-support-bot/

Nothing to install, sign up for, or configure. Open the link and start typing.

**Or run it locally:** download this repo (Code → Download ZIP), unzip, and
double-click `index.html`. It works offline — turn your Wi-Fi off and it still
runs, because there are no network requests of any kind.

## Video demo

https://drive.google.com/file/d/1OKc8AZMbJGMH2naVi-l3htvgOysgamUF/view?usp=sharing

Covers all four core use cases plus the fallback path.

## Requirements coverage

| Contract requirement | Where it's implemented |
|---|---|
| Use case 1 — Order tracking | `script.js` → `startOrderFlow()` / `answerOrder()`. Asks for an order number, or reads one inline from the message ("track order 111"). |
| Use case 2 — Returns & exchanges | `script.js` → `doReturns()`. Returns the policy verbatim plus a working link to the in-repo `returns.html`. |
| Use case 3 — Gear recommendations | `script.js` → `startReco()`, states `RECO_Q1` / `RECO_Q2`. Exactly two clarifying questions, then a category from a 12-combo matrix. |
| Use case 4 — Human handoff | `script.js` → `startHandoff()`, state `LIVE_AGENT`. Header visibly switches to LIVE AGENT mode with a CSS status dot; the simulated agent keeps replying. |
| Shipping information (3.d.i.2) | `script.js` → `doShipping()`. Its own intent and menu option, quoted verbatim. |
| Intent variations (3.a.i) | `script.js` → `detectIntent()`. Keyword matching across nine intents, plus deterministic fuzzy matching (`fuzzyTokenMatches()`) so common typos still resolve. |
| Disambiguation | `detectIntent()` checks order/tracking words before shipping words, so "what's the shipping status of my order" routes to tracking. |
| Mock order data (3.c.i) | `ORDERS` constant at the top of `script.js`. Statuses are returned word-for-word. |
| Return policy data | `RETURN_POLICY` constant in `script.js`. |
| Shipping data | `SHIPPING` constant in `script.js`. |
| Return to main flow (3.b.ii) | `showMenu()` runs after every resolved flow; typing `menu` or `start over` escapes from any state. |
| Two-strike fallback (3.e.ii) | `script.js` → `fallback()`. First miss offers options; the second consecutive miss offers a live agent — both, not either. |
| Both input modes everywhere (6.e) | Every state accepts quick-reply chips and free-typed text; `submitInput()` is the single entry point for both. |
| No keys / accounts / setup (7.a.i) | Static vanilla HTML/CSS/JS. No frameworks, no npm, no build step, no external requests. |

## Try these phrases

| Type this | You should get |
|---|---|
| `Where is my order?` | A prompt for your order number |
| `track order 111` | Shipped, arriving tomorrow (inline number, no second prompt) |
| `#222` | Processing, ships in 24 hours |
| `track order 333` | Delivered, plus a follow-up question |
| `999` | Invalid-order message, with a retry or an escape to the menu |
| `return policy` | The three policy points and a clickable returns link |
| `how long does shipping take` | Standard and expedited times |
| `recommend gear` | Two clarifying questions, then a category |
| `talk to a human` | LIVE AGENT mode with a visible header change |
| `asdfjkl` (twice) | Fallback options, then an escalation offer |
| `menu` | Back to the main menu from anywhere |

## Mock data used (as provided in the brief)

**Orders**

| Order number | Status |
|---|---|
| 111 | Shipped, arriving tomorrow |
| 222 | Processing, ships in 24 hours |
| 333 | Delivered |

Any other number is treated as an invalid order.

**Return policy**

- 30-day returns
- Items must be unused
- Original packaging required

**Shipping**

- Standard: 3–5 business days
- Expedited: 1–2 business days

These strings are reproduced verbatim in the bot's replies — nothing is
paraphrased, and no SKUs, prices, or other details were invented.

## How it works

A deterministic state machine (`MAIN_MENU`, `AWAIT_ORDER_NUM`,
`DELIVERED_FOLLOWUP`, `RECO_Q1`, `RECO_Q2`, `LIVE_AGENT`) paired with a keyword
intent matcher. There is no LLM and no API behind it: the same input always
produces the same reply, which is what makes the responses auditable against the
data above.

Context beats intent — while awaiting an order number, a bare number is read as
an order number rather than re-matched as an intent — and requests for the menu
or a live agent are honored from any state.

## Project structure

```
index.html    the chatbot
returns.html  branded returns page (the destination of the returns link)
styles.css    design tokens and all styling
script.js     state machine, intents, and copy deck
TESTING.md    QA matrix, every row run by hand
```

## Testing

`TESTING.md` contains the full QA matrix — 25 rows covering each contract
clause, including a `file://` run with Wi-Fi off (zero console errors, zero
network requests) and a 375px-wide mobile check.
