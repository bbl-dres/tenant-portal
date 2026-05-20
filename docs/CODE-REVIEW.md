# CODE-REVIEW.md — JS code review (senior pass)

Focus: bugs, race conditions, redundant code, simplification opportunities,
maintainability. Five JS modules in scope:
[`js/app.js`](../js/app.js), [`js/shell.js`](../js/shell.js),
[`js/wizard.js`](../js/wizard.js), [`js/state.js`](../js/state.js),
[`js/lib.js`](../js/lib.js).

This pass was run after a thorough Explore sweep; every finding below
was verified against the actual code. The Explore agent's report had
several false positives — those are listed in §6 as "claims that
don't apply" so they aren't re-investigated next round.

**Status legend**: ◻ open · ◐ partial · ✓ done · — won't fix

---

## TL;DR

Three real high-severity bugs. All share the same architectural anti-
pattern: per-view wiring functions register *global* side-effects
(document-level event listeners, IntersectionObservers) without ever
removing them, causing handler accumulation + memory leaks across
hash-route navigations.

1. **§1.1 `refreshAttachmentList` unimported** ([wizard.js:488](../js/wizard.js#L488), [app.js:2732, 2735](../js/app.js#L2732)) — same class of bug as the `attachmentLi` + `SERVICES_MENU` bugs we already fixed. Demo upload silently fails.
2. **§1.2 `wireQueueShortcuts` keydown leak** ([app.js:1481](../js/app.js#L1481)) — adds `document.addEventListener('keydown', …)` every time `renderQueue()` runs; never removed. Navigate to `/queue` three times → `j`/`k`/`Enter`/`x` fire three handlers, all targeting the first render's stale `rows` array.
3. **§1.3 `wireInfoScrollSpy` observer leak** ([app.js:648](../js/app.js#L648)) — `new IntersectionObserver(…)` created locally on every `renderInfoPage()`; never `disconnect()`-ed. Observed elements become unreachable but the observer keeps DOM references alive.

Fixes are surgical (~20-50 lines total). Recommended order: §1.1 first
(real broken feature), then §1.2 + §1.3 with a shared cleanup pattern
(§4.1).

---

## 1. High-severity bugs

### 1.1 `refreshAttachmentList` unimported (third instance of this bug class)

[wizard.js:488](../js/wizard.js#L488):
```js
function refreshAttachmentList(draft) { … }   // private to wizard.js
```

[app.js:2732, 2735](../js/app.js#L2732) (inside `window.t3lite.fakeUpload`):
```js
setTimeout(() => { … refreshAttachmentList(draft); … }, 1200 + i * 600);
…
refreshAttachmentList(draft);
```

**Same class as the two bugs we already fixed this session** —
`attachmentLi` (wizard.js → app.js) and `SERVICES_MENU` (shell.js →
app.js). The function is private to wizard.js but called from app.js
without being imported. The call throws `ReferenceError` silently in
the setTimeout, and the second call at L2735 throws synchronously.

User-visible: clicking "Beispieldateien hochladen (Demo)" in wizard
step 3 fires the toast for each fake-upload but the attachment list
never updates visually.

**Severity**: high · **Status**: ◻

**Fix**: Export `refreshAttachmentList` from wizard.js + import in
app.js. Or — since this is the third instance — move all three
wizard-shared functions (`refreshAttachmentList`, `attachmentLi`-already-done,
`submitDraft`-already-imported) into a single barrel export and treat
wizard.js as a fully-exported module.

### 1.2 `wireQueueShortcuts` keydown handler accumulates per navigation

[app.js:1472-1488](../js/app.js#L1472):

```js
function wireQueueShortcuts() {
  const rows = Array.from(document.querySelectorAll('tbody tr[data-app-id]'));
  let idx = -1;
  …
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); focus(idx + 1); }
    …
  });
}
```

Called from `renderQueue()` at [app.js:1469](../js/app.js#L1469).

**Problem**: each `renderQueue()` invocation adds a new
`document.addEventListener('keydown', …)`. The handlers are never
removed. After 3 visits to `/queue`:
- 3 handlers fire on every keypress (anywhere in the document, not
  just on `/queue`).
- The first two close over stale `rows` arrays — pointing at DOM
  nodes that have been replaced by `innerHTML`.
- Pressing `j` or `k` updates `idx` on stale closures; visual focus
  outline targets the wrong elements (or no elements).

**Why this is worse than it sounds**: even after the user navigates
*away* from `/queue` to, say, `/inbox`, the `j`/`k`/`Enter`/`x` keys
still fire — and `Enter` triggers `location.hash = '#/review/' +
rows[idx].getAttribute('data-app-id')` against a stale row reference,
navigating the user to a review page for an unexpected application.

**Severity**: high · **Status**: ◻

**Fix**: Store the handler reference at module scope and replace it
on each render:

```js
let _queueKeydownHandler = null;
function wireQueueShortcuts() {
  if (_queueKeydownHandler) document.removeEventListener('keydown', _queueKeydownHandler);
  _queueKeydownHandler = (e) => { … };
  document.addEventListener('keydown', _queueKeydownHandler);
}
```

Better: use a `data-route` attribute on body and route-scope the
handler via `e.target.closest('[data-route="queue"]')`. Even better:
introduce a generic `routeCleanup` Set that all per-view wires push
into, drained on `handleHash`. See §4.1.

### 1.3 `wireInfoScrollSpy` IntersectionObserver never disconnected

[app.js:648-654](../js/app.js#L648):

```js
const observer = new IntersectionObserver((entries) => { … }, { rootMargin: '-30% 0% -55% 0%', threshold: 0 });
targets.forEach(t => observer.observe(t));
```

The observer is created in a local `const`, attached to the article
+ kontakt-section elements, then the function returns. Every
subsequent `renderInfoPage()` creates a new observer; the previous
one is never disconnected.

**Consequences**:
- Memory leak: the old observer holds references to the previous
  render's DOM nodes (since replaced by `innerHTML`). GC can't
  reclaim them.
- Phantom firing: when the new render's articles intersect the
  viewport, the *old* observer's callback also fires on the new
  elements (which share the same IDs). `setActive(id)` runs twice;
  one of them flips the `--active` class on a DOM tree the user
  doesn't see.

**Severity**: high · **Status**: ◻

**Fix**: stash the observer at module scope and disconnect before
creating a new one:

```js
let _infoScrollObserver = null;
function wireInfoScrollSpy() {
  if (_infoScrollObserver) _infoScrollObserver.disconnect();
  …
  _infoScrollObserver = new IntersectionObserver(…);
  …
}
```

Same pattern as §1.2 — both should land in the same cleanup helper
(§4.1).

---

## 2. Medium-severity findings

### 2.1 `loadData()` failure swallowed

[app.js:170](../js/app.js#L170):

```js
async function init() {
  await P.loadData('data/');
  P.wireGlobalShortcuts();
  registerRoutes();
  window.addEventListener('hashchange', P.handleHash);
  P.handleHash();
}
```

If any of the 8 JSON fetches in `state.js loadData()` rejects (404,
malformed JSON, network), the `await` throws, `init` returns a
rejected Promise that nobody catches, and the rest of `init` is
skipped. Result: no routes registered, no router handler attached.
The user sees a blank page indefinitely with a console error they
won't see.

**Severity**: medium · **Status**: ◻

**Fix**:

```js
async function init() {
  try {
    await P.loadData('data/');
  } catch (err) {
    console.error('Mock data load failed:', err);
    document.getElementById('root').innerHTML =
      '<div class="container section"><h1>Daten konnten nicht geladen werden</h1>' +
      '<p>Bitte laden Sie die Seite neu, oder kontaktieren Sie BBL.</p></div>';
    return;
  }
  …
}
```

### 2.2 `setTimeout(0, focus())` patterns lack route-guard

Multiple sites defer focus to the next tick:
- [shell.js:485](../js/shell.js#L485) — language switcher option focus
- [app.js:387](../js/app.js#L387) — search-hero input focus on render
- [lib.js:406](../js/lib.js#L406) — modal initial focus

If the user navigates routes between the render and the timer
firing, `target.focus()` runs on a detached DOM node. Doesn't crash,
but focus jumps to `<body>` (a11y regression — keyboard users lose
their place).

**Severity**: medium (a11y edge case) · **Status**: ◻

**Fix**: guard each with `if (document.contains(target)) target.focus();`.

### 2.3 Inconsistent "not found" handling across routes

Three different patterns currently in use:
- [app.js:79-81](../js/app.js#L79) — generic 404 div if no route matches
- [app.js:1187, 1495](../js/app.js#L1187), [2059](../js/app.js#L2059) — `<p>… nicht gefunden.</p>` inline
- [app.js:705](../js/app.js#L705) — `shell()` then inline "Nachricht nicht gefunden" (correct chrome, simple body)

Inconsistent visual treatment + breadcrumb behaviour confuse users
who hit a stale link.

**Severity**: medium · **Status**: ◻

**Fix**: extract `renderNotFound({ message, backTo })` helper in
lib.js or shell.js. Call from every "id not in state.X" branch.

### 2.4 Toast timing magic numbers

[lib.js:321-322](../js/lib.js#L321):

```js
setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; }, 3500);
setTimeout(() => el.remove(), 3800);
```

3500 / 3800 / 200 are scattered as raw numbers. The relationship
between them (fade starts at 3500, completes at 3700, remove at 3800
with 100ms cushion) is invisible.

**Severity**: low · **Status**: ◻

**Fix**:

```js
const TOAST_HOLD_MS = 3500;
const TOAST_FADE_MS = 200;
const TOAST_REMOVE_MS = TOAST_HOLD_MS + TOAST_FADE_MS + 100;
```

### 2.5 Inline `onclick="…"` handlers can't be cleaned up

Pervasive pattern across renderers, e.g.
[app.js:1209](../js/app.js#L1209):

```js
<button … onclick="window.t3lite.startResubmit('${P.escapeJs(a.id)}')">…</button>
```

These work *because* the handler is a string lookup at call time
(late binding), not a closure. So `window.t3lite.X` only needs to
exist *when the user clicks*, not when the markup renders. That's
fine for synchronous setup — but it means:

- No way to differentiate `<button>` from a different render that
  happens to have the same handler name (the handler operates on
  the click target's `data-*` attributes only).
- Cannot be removed by re-rendering the parent — the inline string
  is removed with the DOM, but if the user takes a screenshot of a
  modal and the underlying view re-renders, the inline handler
  refers to the new `window.t3lite` state.

For a prototype this is acceptable. Documenting the trade-off so
nobody confuses this for delegated event handling.

**Severity**: low · **Status**: — deliberate

---

## 3. Redundant / dead code

### 3.1 Retired CSS rules kept as comment stubs

[styles.css:3164](../css/styles.css), [styles.css:3710](../css/styles.css) — after the §18.1 `meta-info` refactor I left the old `.news-detail__meta` and `.news-list__meta` rules as commented breadcrumbs. Functional, but should be deleted in the next CSS pass since no markup references them.

**Severity**: low · **Status**: ◻ next sweep

### 3.2 `.attachment-list li` legacy selector kept alongside `__item`

[styles.css:4203-4214](../css/styles.css) — when I introduced the `.attachment-list__item` BEM child, I left the bare `li` selectors in the rule list for backward-compat. The wizard's step 3 now uses `attachmentLi()` from lib.js (BEM-flavoured). No remaining markup uses plain `<li>` inside `.attachment-list`. Safe to drop the bare `li` selectors.

**Severity**: low · **Status**: ◻ next sweep

### 3.3 Module-scoped `newsPage` mutation

[app.js:659](../js/app.js#L659) — `let newsPage = 0` lives at module scope, mutated by the news-section paging buttons. Survives across navigations. Probably intentional (user pages news on landing, goes elsewhere, returns — same page). Document the intent in a comment.

**Severity**: low · **Status**: ◻ document

### 3.4 No dead exports detected

Verified: every export from lib.js, shell.js, wizard.js, state.js is consumed by at least one other module. PIPELINE_STANDARD/BK/GREENFIELD are read by `renderPipeline` in lib.js itself. `attachmentLi` (recently moved) is consumed by both wizard.js and app.js.

**Severity**: — · **Status**: ✓ clean

---

## 4. Simplification opportunities

### 4.1 Per-view cleanup pattern (would close §1.2 + §1.3 + future leaks)

Both §1.2 and §1.3 add document-level side effects that survive
navigations. A small `routeCleanup` registry would solve this class
once:

```js
// at module scope in app.js
let _cleanups = [];
function onRouteChange(fn) { _cleanups.push(fn); }
function flushCleanups() { _cleanups.forEach(fn => { try { fn(); } catch {} }); _cleanups = []; }

// in handleHash, before invoking the new route handler:
function handleHash() {
  flushCleanups();
  …
}

// in wireQueueShortcuts():
const handler = (e) => { … };
document.addEventListener('keydown', handler);
onRouteChange(() => document.removeEventListener('keydown', handler));

// in wireInfoScrollSpy():
const observer = new IntersectionObserver(…);
observer.observe(…);
onRouteChange(() => observer.disconnect());
```

~15 lines of plumbing. Cleans up both current leaks and any future
per-view side effect that follows the pattern.

**Severity**: medium · **Status**: ◻

### 4.2 Long route renderers

| Function | Lines | Notes |
|---|---|---|
| `renderDownloads` (incl. helpers) | [app.js:2185](../js/app.js#L2185) ~ 230 lines | Filter state + render + wiring all inline. Acceptable; closes over `docState`. Splitting requires elevating state to module scope. |
| `renderProperties` | [app.js:1619](../js/app.js#L1619) ~ 90 lines | Already split: `propertiesToolbar`, `renderPropertiesFilterPills`, `renderGalleryView`, `renderListView`, `renderMapView` are extracted. Body is mostly composition + URL parsing. ✓ OK |
| `renderReviewerSplit` | [app.js:1491](../js/app.js#L1491) ~ 200+ lines (estimated) | The reviewer split-pane is the longest single renderer. Would benefit from extracting the marks-pane sub-renderer. |
| `renderDetailTab` | [app.js:1282](../js/app.js#L1282) ~ 100 lines | Four if-branches stacked — `daten` / `anhaenge` / `historie` / `sap`. Each branch is short; splitting into 4 helpers would clean it up. |

**Severity**: low (maintainability) · **Status**: ◐ document

### 4.3 Repeated `parseHashQuery` + inline `location.hash.split('?')`

Both patterns appear:
- [app.js:1623](../js/app.js#L1623) — `parseHashQuery(hash)` helper
- [app.js:208](../js/app.js#L208), [697](../js/app.js#L697), [2065](../js/app.js#L2065) — inline `location.hash.split('?')[1]` parsing

Inconsistent. The helper is already there; the inline patterns should use it.

**Severity**: low · **Status**: ◻

### 4.4 Pagination wiring already deduplicated

Earlier session unified `wirePaginationInput` + `renderPagination`. Verified no duplicate wiring remains across `/properties`, `/inbox`, `/queue`, `/news`.

**Severity**: — · **Status**: ✓

---

## 5. Maintainability

### 5.1 `window.portal` vs `window.t3lite` distinction

Two namespaces on `window`:
- `window.portal` ([app.js:146-158](../js/app.js#L146)) — module re-exports for inline-handler bridge + cross-module imports
- `window.t3lite` ([app.js:2670-2815](../js/app.js#L2670)) — inline-handler-only methods (no module-level imports)

The distinction makes sense — `portal.*` is the "public API"
re-exported from modules so inline handlers can call without
imports; `t3lite.*` is the "internal handlers" that exist only for
inline-onclick bridges. Comment header at [app.js:3-10](../js/app.js#L3) documents it.

A skeptical reviewer might still ask: why not collapse them? Three
reasons to keep them split:
1. `t3lite` is the "things that would be private if we had a build
   step" set. Keeping it separate marks the boundary.
2. Migration target: `portal` calls survive a future refactor to ES
   modules + delegated events; `t3lite` calls don't.
3. The `t3lite` namespace is a known portal joke (T3-lite = a
   neutered T3 stand-in). Removing it removes a piece of project
   memory.

**Severity**: — · **Status**: — deliberate

### 5.2 Transient flags on state records

Examples:
- `state.draft._isNew` ([wizard.js:729](../js/wizard.js)) — cleared after first render
- `a._marks` ([app.js:1497](../js/app.js#L1497), [1578](../js/app.js#L1578)) — reviewer marks persisted on the application object during review

These violate the "data records are pure" convention. For a
prototype it's fine; for production, move to a side-Map keyed by
record id.

**Severity**: low · **Status**: ◻ document

### 5.3 `setTimeout` for `document.contains()` checks (already covered)

See §2.2.

---

## 6. Claims from the automated review that don't apply

The Explore agent's report flagged several things I verified are
not bugs. Documenting them here so the next review doesn't
re-investigate.

### 6.1 "shell.js module-level listeners leak per navigation"

[shell.js:349](../js/shell.js#L349), [356](../js/shell.js#L356), [507](../js/shell.js#L507), [513](../js/shell.js#L513) — four `document.addEventListener` calls at module top-level.

These are **module-level side effects** — they run *once* when the
ES module is first imported. They do *not* re-register on
navigation (the module is loaded once per page load). Memory cost
is constant. Not a leak.

Confirmed by inspection: all four are at the top level, not inside
`renderShell()` or another per-call function.

### 6.2 "Race: `handleHash` runs before `loadData` completes"

[app.js:170-175](../js/app.js#L170):

```js
async function init() {
  await P.loadData('data/');   // <- blocks
  …
  P.handleHash();              // <- only runs after await resolves
}
```

The `await` is a hard barrier. `handleHash()` cannot run until
`loadData` resolves. The agent imagined a scenario where the user
"manually changes the hash before the await completes" — but
`handleHash` is *only attached as a listener* after `loadData`
resolves (L174), so a hash change before that has no effect.

The remaining edge case — `init` itself throws because `loadData`
rejects — is covered by §2.1.

### 6.3 "addEventListener leaks in paginated routes"

`renderInbox`, `renderQueue`, `renderProperties` re-render via
`innerHTML = …` which destroys the previous DOM tree. Element-level
event listeners on those nodes are auto-collected by the GC (the
listener and the element die together). Not a leak.

The exception is *document-level* listeners attached from inside a
render handler — §1.2 covers the one instance (`wireQueueShortcuts`).

### 6.4 "`toggleAuflage` / `startResubmit` race condition"

Both are inline `onclick="window.t3lite.X()"` handlers. The
referenced functions are defined synchronously when `app.js`
executes ([L2670-2815](../js/app.js#L2670)). By the time any HTML containing the inline
handler is rendered (after `init()` completes), `window.t3lite.*`
exists. No race.

### 6.5 "Magic numbers `INBOX_PAGE_SIZE` etc. should be extracted"

Already extracted as `const`s at module scope in app.js. Toast
timings (§2.4) are the one remaining instance.

---

## 7. Recommended fix order

1. **§1.1 — Export + import `refreshAttachmentList`.** 2 minutes. Closes a real broken feature (demo upload).
2. **§4.1 — Add `routeCleanup` registry.** 15 minutes. Infrastructure for §1.2 + §1.3.
3. **§1.2 — Wire `wireQueueShortcuts` cleanup.** 5 minutes via §4.1 helper.
4. **§1.3 — Wire `wireInfoScrollSpy` cleanup.** 5 minutes via §4.1 helper.
5. **§2.1 — Wrap `loadData` in try/catch.** 5 minutes. Production-readiness.
6. **§2.2 — Add `document.contains()` guards** to the three `setTimeout(focus)` sites. 5 minutes total.
7. **§2.3 — Extract `renderNotFound`** helper + replace the inline patterns. 15 minutes.
8. **§2.4 — Toast timing constants.** 2 minutes.
9. **§3.1 + §3.2 — CSS dead-code sweep.** 5 minutes.
10. **§4.3 — Replace inline hash parsing with `parseHashQuery`.** 10 minutes.

Total: ~60-75 minutes of focused work to clear all real findings.
