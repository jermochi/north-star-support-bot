# TESTING — QA Matrix

Run every row by hand (Phase 4). Source: `.local/SPEC.md` §5. Fill in results
once the bot is built.

| # | Do this | Expect | Contract ref | Pass |
|---|---|---|---|---|
| 1 | Type "Where is my order?" | Asks for order number | 3.a.i | [ ] |
| 2 | Type "Track my package" | Same flow (variation) | 3.a.i, 7.d.4 | [ ] |
| 3 | Type "has my order shipped" | Same flow (variation) | 3.a.i | [ ] |
| 4 | Enter `111` | Exact: Shipped, arriving tomorrow | 3.c.i.1, 7.d.2 | [ ] |
| 5 | New run, enter `#222` | Exact: Processing, ships in 24 hours | 3.c.i.2 | [ ] |
| 6 | Type "track order 333" (inline) | Skips ask; Delivered + follow-up | 3.c.i.3 | [ ] |
| 7 | Answer "No, it's missing" | Escalates to live agent | 3.c.i.3, 3.e | [ ] |
| 8 | Enter `999` | Invalid-order message, retry or "menu" | 3.c.i.4 | [ ] |
| 9 | While awaiting number, type "banana" | Gentle re-prompt, no crash | 3.b.i | [ ] |
| 10 | Type "return policy" | 30-day / unused / original packaging + link | 3.d.i.1, 2.a.ii | [ ] |
| 11 | Click the returns link | returns.html opens, branded | 2.a.ii.2 | [ ] |
| 12 | Type "how long does shipping take" | Standard 3–5, Expedited 1–2 | 3.d.i.2, 7.d.3 | [ ] |
| 13 | Type "recommend me something" | Asks Q1 → Q2 (exactly 2 questions) | 2.a.iii.1 | [ ] |
| 14 | Pick Camping → Gear | "Tents, sleeping bags & stoves" | 2.a.iii.2 | [ ] |
| 15 | Redo reco by typing answers | Same flow works typed | 3.a.i | [ ] |
| 16 | Type "talk to a human" | Handoff → LIVE AGENT mode, clear | 3.e.i.1–2 | [ ] |
| 17 | Send a message in agent mode | Simulated agent responds | 3.e.i.3 | [ ] |
| 18 | Click "Return to main menu" | Back to bot + menu chips | 7.d.6 | [ ] |
| 19 | Type gibberish "asdfjkl" | "didn't understand" + options | 3.e.ii, 7.d.5 | [ ] |
| 20 | Type gibberish again | Escalation offer (live agent) | 3.e.ii.2 | [ ] |
| 21 | Finish any flow | "Anything else?" + return to main flow | 3.b.ii | [ ] |
| 22 | Type "menu" mid-flow | Returns to main menu from anywhere | 3.b | [ ] |
| 23 | Full run chips-only, then typing-only | Both input modes work everywhere | 6.e | [ ] |
| 24 | Open via file:// with Wi-Fi off; check console | Functional, zero errors, zero requests | 7.a.i | [ ] |
| 25 | Test at 375px and a second browser | Layout intact | 6.e | [ ] |
| 26 | Type "wats my ordir" (typo) | Order tracking flow starts (asks for / accepts order #) — fuzzy "ordir"→order | 3.a.i | [ ] |
| 27 | Type "retrun policy" (typo) | Returns policy verbatim (30-day / unused / original packaging) — fuzzy "retrun"→return | 3.d.i.1 | [ ] |
| 28 | Type "shiping times" (typo) | Shipping info verbatim (Standard 3–5, Expedited 1–2) — fuzzy "shiping"→shipping | 3.d.i.2 | [ ] |
| 29 | Type "recomend a tent" (typo) | Recommendation flow starts (asks adventure type) — fuzzy "recomend"→recommend | 2.a.iii.1 | [ ] |
| 30 | Type "yo" | Greeting, not fuzzy-routed (regression guard) | 3.a.i | [ ] |
| 31 | Type "cat" | Two-strike fallback path, no false fuzzy match | 3.e.ii | [ ] |
