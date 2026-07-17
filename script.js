/*
 * North Star Support Bot — logic
 * Deterministic state machine + keyword intent matcher. No network, no deps.
 * All business copy is verbatim from .local/SPEC.md §3.1 / §3.4 — do not reword.
 */
"use strict";

/* ── Business data — copy EXACTLY (SPEC §3.1) ─────────────────────────── */
const ORDERS = {
  "111": "Shipped, arriving tomorrow",
  "222": "Processing, ships in 24 hours",
  "333": "Delivered"
};

const RETURN_POLICY = ["30-day returns", "Items must be unused", "Original packaging required"];
const SHIPPING = { standard: "3–5 business days", expedited: "1–2 business days" };
const RETURNS_LINK = "./returns.html";

/* Recommendation matrix (SPEC §3.4) — categories only, no invented SKUs */
const RECO = {
  hiking:   { apparel: "Moisture-wicking layers & hiking pants", footwear: "Hiking boots & trail shoes",     gear: "Daypacks & trekking poles" },
  camping:  { apparel: "Fleece & insulated outerwear",           footwear: "Camp shoes & waterproof boots",   gear: "Tents, sleeping bags & stoves" },
  winter:   { apparel: "Insulated jackets & base layers",        footwear: "Winter boots & gaiters",          gear: "Snow gear & thermal accessories" },
  everyday: { apparel: "Casual outdoor apparel & rain shells",   footwear: "Everyday trail sneakers",         gear: "Backpacks & water bottles" }
};
const ADVENTURE_LABEL = { hiking: "Hiking", camping: "Camping", winter: "Winter sports", everyday: "Everyday outdoors" };
const NEED_LABEL = { apparel: "Apparel", footwear: "Footwear", gear: "Gear & equipment" };

/* ── Chip decks (reused across states) ────────────────────────────────── */
const MENU_CHIPS = [
  { label: "Track my order",       value: "Track my order" },
  { label: "Returns & exchanges",  value: "Returns & exchanges" },
  { label: "Gear recommendations", value: "Gear recommendations" },
  { label: "Shipping info",        value: "Shipping info" },
  { label: "Talk to a live agent", value: "Talk to a live agent" }
];

/* ── State ────────────────────────────────────────────────────────────── */
const STATE = {
  MAIN_MENU: "MAIN_MENU",
  AWAIT_ORDER_NUM: "AWAIT_ORDER_NUM",
  DELIVERED_FOLLOWUP: "DELIVERED_FOLLOWUP",
  RECO_Q1: "RECO_Q1",
  RECO_Q2: "RECO_Q2",
  LIVE_AGENT: "LIVE_AGENT"
};

const session = {
  state: STATE.MAIN_MENU,
  fallbackStreak: 0,
  adventure: null,
  typing: false
};

/* ── DOM ──────────────────────────────────────────────────────────────── */
/* Declared once; bound only in a browser so this file can also load under
   Node for the dev test harness in .local/tests/ (never shipped). */
let app, chatEl, chipsEl, formEl, inputEl, statusEl, modeLabel;
if (typeof document !== "undefined") {
  app       = document.querySelector(".app");
  chatEl    = document.getElementById("chat");
  chipsEl   = document.getElementById("chips");
  formEl    = document.getElementById("composer");
  inputEl   = document.getElementById("input");
  statusEl  = document.getElementById("statusPill");
  modeLabel = document.getElementById("modeLabel");
}

/* ── Rendering helpers ────────────────────────────────────────────────── */
function scrollToBottom() {
  chatEl.scrollTop = chatEl.scrollHeight;
}

function addUserMessage(text) {
  const el = document.createElement("div");
  el.className = "msg user";
  el.textContent = text;               // user text is never treated as HTML
  chatEl.appendChild(el);
  scrollToBottom();
}

/* Bot bubbles carry only hardcoded copy, so limited inline HTML is safe. */
function addBotBubble(html, { agent = false, speaker = null } = {}) {
  const el = document.createElement("div");
  el.className = "msg bot" + (agent ? " agent-msg" : "");
  el.innerHTML = (speaker ? `<span class="speaker">${speaker}</span>` : "") + html;
  chatEl.appendChild(el);
  scrollToBottom();
}

function renderChips(chips) {
  chipsEl.innerHTML = "";
  if (!chips || !chips.length) return;
  for (const chip of chips) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (chip.accent ? " accent" : "");
    btn.textContent = chip.label;
    btn.addEventListener("click", () => {
      if (session.typing) return;
      submitInput(chip.value);
    });
    chipsEl.appendChild(btn);
  }
}

function setBusy(busy) {
  session.typing = busy;
  formEl.classList.toggle("busy", busy);
  inputEl.disabled = busy;
  if (!busy) inputEl.focus();
}

/* Show a typing indicator, then reveal the queued bot turn. */
function botTurn(turn, delay = 1000) {
  setBusy(true);
  chipsEl.innerHTML = "";
  const dots = document.createElement("div");
  dots.className = "msg bot typing";
  dots.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  chatEl.appendChild(dots);
  scrollToBottom();

  setTimeout(() => {
    dots.remove();
    turn();          // turn() emits bubbles + chips
    setBusy(false);
  }, delay);
}

/* Emit one or more bubbles (with a small gap) followed by chips. */
function say(bubbles, chips, opts = {}) {
  const list = Array.isArray(bubbles) ? bubbles : [bubbles];
  list.forEach((b, i) => {
    setTimeout(() => {
      addBotBubble(typeof b === "string" ? b : b.html, typeof b === "string" ? {} : b);
      if (i === list.length - 1) renderChips(chips);
    }, i * 420);
  });
  if (opts.after) setTimeout(opts.after, (list.length - 1) * 420 + 40);
}

/* ── Mode switching (bot ⇄ live agent) ────────────────────────────────── */
function enterAgentMode() {
  session.state = STATE.LIVE_AGENT;
  app.classList.add("live-agent");
  modeLabel.textContent = "Live Agent";
  statusEl.hidden = false;
}

function exitAgentMode() {
  app.classList.remove("live-agent");
  modeLabel.textContent = "Support Bot";
  statusEl.hidden = true;
}

/* ── Intent detection (SPEC §3.2) ─────────────────────────────────────── */
function hasAny(t, terms) { return terms.some(k => t.includes(k)); }

const MENU_COMMANDS = ["menu", "main menu", "start over", "back to menu", "options", "help", "start", "reset"];
const GREETINGS = ["hi", "hello", "hey", "howdy", "hiya", "hey there", "hello there", "yo"];

/* Deterministic OSA distance (Levenshtein + adjacent transposition, so a
   swapped pair like "retrun"→"return" costs 1) — no deps, no network. */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev2 = null;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

/* Real English words one edit from a keyword that share its first letter —
   the one case the guards below can't reject ("truck"→"track"). */
const FUZZY_STOPLIST = new Set(["truck", "trick"]);

/* Conservative typo tolerance: tokens shorter than 4 chars must match exactly
   (guards short words like "buy"/"rep"/"yo"); the first letter must match
   (rejects real-word neighbors like "bear"→"gear"); distance ≤1 for keywords
   up to 6 chars, ≤2 from 7 (rejects "cheese"→"choose" while transpositions
   like "retrun"→"return" still pass via OSA). */
function fuzzyTokenMatches(token, keyword) {
  if (token === keyword) return true;
  if (token.length < 4) return false;
  if (token[0] !== keyword[0]) return false;
  if (FUZZY_STOPLIST.has(token)) return false;
  const maxDist = keyword.length >= 7 ? 2 : 1;
  return editDistance(token, keyword) <= maxDist;
}

/* Single-word keywords per intent, in the SAME priority order as the exact
   checks below. Multi-word phrases stay exact-only (fuzzing phrases misroutes). */
const FUZZY_INTENTS = [
  ["human_handoff",  ["agent", "human", "representative"]],
  ["order_tracking", ["order", "track", "tracking", "package", "parcel", "shipment"]],
  ["returns",        ["return", "refund", "exchange"]],
  ["shipping_info",  ["shipping", "delivery", "expedited"]],
  ["recommendations",["recommend", "suggest", "gift", "choose", "gear"]]
];

function detectIntent(text) {
  let norm = text.toLowerCase().replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
  // "in order to" is an idiom, not an order reference — strip it so its
  // "order" can't trigger tracking ("in order to get a refund" → returns).
  norm = norm.replace(/\bin order to\b/g, " ").replace(/\s+/g, " ").trim();
  const t = " " + norm + " ";

  // Menu is a command match on the whole message, so "shipping options" and
  // "help me choose gear" are NOT swallowed as menu requests.
  if (MENU_COMMANDS.includes(norm) || /\b(main menu|start over|back to menu)\b/.test(norm)) return "menu";

  // Human handoff — checked early so "agent"/"human" always wins. "live"
  // only counts paired with a role word ("I live in Denver" must not match).
  if (hasAny(t, [" agent", " human", " representative", " rep ",
                 "live agent", "live person", "live chat", "live support", "live rep",
                 "talk to", "speak to", "speak with", "customer service", "real person"]))
    return "human_handoff";

  // Order tracking beats shipping when order/track words are present
  // (disambiguation rule). "where('s) my" needs a trackable object — a bare
  // or gibberish object ("where is my ?") falls through to the fallback.
  if (hasAny(t, [" order", " track", "tracking", " package", " parcel", " shipment"]) ||
      /\bwhere('?s| is| was)? my (orders?|package|parcel|shipment|delivery|stuff|items?|gear|purchase)\b/.test(norm))
    return "order_tracking";

  if (hasAny(t, [" return", " refund", " exchange", "money back"]) ||
      /\bsend (it |this |that |them )?back\b/.test(norm))
    return "returns";

  // "how long" alone is too weak ("how long is the tent") — it needs
  // shipping context. Bare "standard" is dropped for the same reason.
  if (hasAny(t, [" shipping", "delivery time", " delivery", " expedited"]) ||
      (t.includes("how long") && hasAny(t, [" ship", " deliver", " arriv", " take "])))
    return "shipping_info";

  if (hasAny(t, ["recommend", " suggest", "looking for", " buy ", " gift", " need a",
                 "what should", " choose", " gear "]))
    return "recommendations";

  if (GREETINGS.includes(norm) || /^(hi|hello|hey|howdy)\b/.test(norm)) return "greeting";
  if (/ (thanks|thank you|bye|goodbye|that's all|thats all) /.test(t)) return "thanks_bye";

  // Fuzzy fallback — only reached when no exact intent, greeting, or thanks
  // matched. Same priority order as the exact checks above.
  const tokens = norm.split(" ").filter(Boolean);
  for (const [intent, keywords] of FUZZY_INTENTS) {
    for (const kw of keywords) {
      for (const tok of tokens) {
        if (fuzzyTokenMatches(tok, kw)) return intent;
      }
    }
  }

  return "fallback";
}

function extractOrderNumber(text) {
  const m = text.match(/#?\s*(\d+)/);
  return m ? m[1] : null;
}

/* Menu-level inline detection is stricter than the explicit ask: only a
   "#"-prefixed or 3+ digit number counts, so "I ordered 2 tents" asks for
   the order number instead of looking up order #2. */
function extractInlineOrderNumber(text) {
  const m = text.match(/#\s*(\d+)/) || text.match(/\b(\d{3,})\b/);
  return m ? m[1] : null;
}

/* ── Flow handlers (exact copy deck, SPEC §3.4) ───────────────────────── */
function showMenu(prompt) {
  say(prompt || "What can I help you with next?", MENU_CHIPS);
}

function welcome() {
  session.state = STATE.MAIN_MENU;
  say(
    "Hey there, trailblazer! I'm North Star, the support bot for North Star Outfitters. Here's what I can help with:",
    MENU_CHIPS
  );
}

function answerOrder(num) {
  session.fallbackStreak = 0;
  if (num === "111") {
    session.state = STATE.MAIN_MENU;
    say(["Great news — order #111 has <strong>Shipped, arriving tomorrow</strong>.",
         "What can I help you with next?"], MENU_CHIPS);
  } else if (num === "222") {
    session.state = STATE.MAIN_MENU;
    say(["Order #222 is <strong>Processing, ships in 24 hours</strong>. Hang tight!",
         "What can I help you with next?"], MENU_CHIPS);
  } else if (num === "333") {
    session.state = STATE.DELIVERED_FOLLOWUP;
    say("Order #333 shows as <strong>Delivered</strong>. Did it make it to you okay?", [
      { label: "Yes, got it", value: "Yes, got it" },
      { label: "No, it's missing", value: "No, it's missing" }
    ]);
  } else {
    // invalid — stay in AWAIT_ORDER_NUM so a retry is a bare number again
    session.state = STATE.AWAIT_ORDER_NUM;
    say("Hmm, I can't find an order with that number. Double-check it and try again, or type 'menu' to head back.");
  }
}

function startOrderFlow(inlineNumber) {
  session.fallbackStreak = 0;
  if (inlineNumber) {
    answerOrder(inlineNumber);            // inline number → skip the ask
  } else {
    session.state = STATE.AWAIT_ORDER_NUM;
    say("Happy to check on that! What's your order number?");
  }
}

function doReturns() {
  session.fallbackStreak = 0;
  session.state = STATE.MAIN_MENU;
  say([
    `Here's our return policy: • ${RETURN_POLICY[0]} • ${RETURN_POLICY[1]} • ${RETURN_POLICY[2]}.`,
    `Ready to start? <a href="${RETURNS_LINK}">Start a return</a>`,
    "What can I help you with next?"
  ], MENU_CHIPS);
}

function doShipping() {
  session.fallbackStreak = 0;
  session.state = STATE.MAIN_MENU;
  say([
    `Standard shipping: ${SHIPPING.standard}. Expedited shipping: ${SHIPPING.expedited}.`,
    "What can I help you with next?"
  ], MENU_CHIPS);
}

function startReco() {
  session.fallbackStreak = 0;
  session.adventure = null;
  session.state = STATE.RECO_Q1;
  say("Fun! What kind of adventure are you gearing up for?", [
    { label: "Hiking", value: "Hiking" },
    { label: "Camping", value: "Camping" },
    { label: "Winter sports", value: "Winter sports" },
    { label: "Everyday outdoors", value: "Everyday outdoors" }
  ]);
}

function startHandoff() {
  session.fallbackStreak = 0;
  say("No problem — connecting you with a live agent now…", null, {
    after: () => botTurn(() => {
      enterAgentMode();
      say([
        "You're now chatting with Keats from North Star Support.",
        { html: "Hi, this is Keats! I can see your chat history — how can I help?", agent: true, speaker: "Keats · Live Agent" }
      ], [{ label: "Return to main menu", value: "Return to main menu", accent: true }]);
    }, 1500)
  });
}

function fallback() {
  session.fallbackStreak += 1;
  if (session.fallbackStreak >= 2) {
    say("Still not getting it — my bad! Want me to connect you with a live agent?", [
      { label: "Yes, live agent", value: "Yes, live agent", accent: true },
      { label: "Back to menu", value: "Back to menu" }
    ]);
  } else {
    say("Sorry, I didn't quite catch that. Here's what I can help with:", MENU_CHIPS);
  }
}

/* ── Reco answer matching ─────────────────────────────────────────────── */
function matchAdventure(t) {
  if (/hik/.test(t)) return "hiking";
  if (/camp/.test(t)) return "camping";
  if (/winter|snow|ski/.test(t)) return "winter";
  if (/everyday|every day|casual|daily|outdoors/.test(t)) return "everyday";
  return null;
}
function matchNeed(t) {
  // footwear first — "footwear" contains "wear", so apparel must not grab it.
  if (/foot|boot|shoe|sneaker/.test(t)) return "footwear";
  if (/apparel|clothing|clothes|layer|jacket|outerwear/.test(t)) return "apparel";
  if (/gear|equip/.test(t)) return "gear";
  return null;
}

/* ── Router ───────────────────────────────────────────────────────────── */
function routeInput(text) {
  const t = text.toLowerCase();

  // LIVE AGENT: only the return-to-menu command leaves; everything else is agent chatter.
  if (session.state === STATE.LIVE_AGENT) {
    if (/return to main menu|main menu|\bmenu\b|back to menu|start over/.test(t)) {
      exitAgentMode();
      session.state = STATE.MAIN_MENU;
      session.fallbackStreak = 0;
      say("You're back with the North Star bot!", MENU_CHIPS);
    } else {
      say({ html: "Thanks — noted! (Simulated live-agent response.) Anything else, or ready to head back to the menu?", agent: true, speaker: "Keats · Live Agent" },
          [{ label: "Return to main menu", value: "Return to main menu", accent: true }]);
    }
    return;
  }

  // Global escapes (any non-agent state).
  const intent = detectIntent(text);
  if (intent === "menu") {
    session.state = STATE.MAIN_MENU;
    session.fallbackStreak = 0;
    showMenu("Back to the main menu. What can I help you with next?");
    return;
  }
  if (intent === "human_handoff") { startHandoff(); return; }

  // State-specific handling.
  switch (session.state) {
    case STATE.AWAIT_ORDER_NUM: {
      const num = extractOrderNumber(text);
      if (num) { answerOrder(num); }
      else {
        say("Hmm, I can't find an order with that number. Double-check it and try again, or type 'menu' to head back.");
      }
      return;
    }

    case STATE.DELIVERED_FOLLOWUP: {
      if (/\b(yes|yep|yeah|yup|got it|received|okay|ok)\b/.test(t)) {
        session.state = STATE.MAIN_MENU;
        say(["Awesome — enjoy the outdoors!", "What can I help you with next?"], MENU_CHIPS);
      } else if (/\b(no|nope|missing|didn't|didnt|not|lost|never)\b/.test(t)) {
        say("Sorry about that — let me connect you with a live agent who can help.", null,
            { after: () => botTurn(() => {
                enterAgentMode();
                say([
                  "You're now chatting with Keats from North Star Support.",
                  { html: "Hi, this is Keats! I can see your chat history — how can I help?", agent: true, speaker: "Keats · Live Agent" }
                ], [{ label: "Return to main menu", value: "Return to main menu", accent: true }]);
              }, 1500) });
      } else {
        say("Sorry, did order #333 arrive okay?", [
          { label: "Yes, got it", value: "Yes, got it" },
          { label: "No, it's missing", value: "No, it's missing" }
        ]);
      }
      return;
    }

    case STATE.RECO_Q1: {
      const adv = matchAdventure(t);
      if (adv) {
        session.adventure = adv;
        session.state = STATE.RECO_Q2;
        say("Nice choice. What do you need most?", [
          { label: "Apparel", value: "Apparel" },
          { label: "Footwear", value: "Footwear" },
          { label: "Gear & equipment", value: "Gear & equipment" }
        ]);
      } else {
        say("Pick an adventure so I can point you the right way:", [
          { label: "Hiking", value: "Hiking" },
          { label: "Camping", value: "Camping" },
          { label: "Winter sports", value: "Winter sports" },
          { label: "Everyday outdoors", value: "Everyday outdoors" }
        ]);
      }
      return;
    }

    case STATE.RECO_Q2: {
      const need = matchNeed(t);
      if (need) {
        const category = RECO[session.adventure][need];
        session.state = STATE.MAIN_MENU;
        say([
          `For ${ADVENTURE_LABEL[session.adventure].toLowerCase()}, I'd point you to <strong>${category}</strong>.`,
          "Want to explore anything else?"
        ], MENU_CHIPS);
      } else {
        say("Which of these do you need most?", [
          { label: "Apparel", value: "Apparel" },
          { label: "Footwear", value: "Footwear" },
          { label: "Gear & equipment", value: "Gear & equipment" }
        ]);
      }
      return;
    }

    default: /* MAIN_MENU */ handleMainMenu(text, intent);
  }
}

function handleMainMenu(text, intent) {
  switch (intent) {
    case "order_tracking": startOrderFlow(extractInlineOrderNumber(text)); break;
    case "returns":        doReturns(); break;
    case "shipping_info":  doShipping(); break;
    case "recommendations":startReco(); break;
    case "greeting":       session.fallbackStreak = 0; welcome(); break;
    case "thanks_bye":
      session.fallbackStreak = 0;
      say("Anytime! Happy trails.", MENU_CHIPS);
      break;
    default:               fallback();
  }
}

/* ── Input entry point ────────────────────────────────────────────────── */
function submitInput(rawText) {
  const text = (rawText || "").trim();
  if (!text || session.typing) return;
  addUserMessage(text);
  botTurn(() => routeInput(text));
}

/* ── Boot (browser only) ──────────────────────────────────────────────── */
if (typeof document !== "undefined") {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value;
    inputEl.value = "";
    submitInput(text);
  });
  botTurn(welcome, 600);
}

/* ── Dev harness export (Node only; never runs in the browser) ────────── */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { detectIntent, editDistance };
}
