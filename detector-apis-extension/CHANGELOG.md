# Changelog

## 1.1.3 - 2026-08-10

### Added
- **Response size column**, next to Time — from the `Content-Length` header when present, otherwise the actual captured body's byte length. Sortable like the other columns.
- **Duplicate-call highlighting.** A request whose URL was called more than once now shows a small "×N" badge, making repeated/polling calls easy to spot at a glance.
- **"Copy as fetch"** alongside curl — a format selector next to Copy All switches what every Copy button produces, a ready-to-paste `fetch(url, options)` JS snippet built with `JSON.stringify` (no hand-rolled escaping needed, unlike curl's shell-quoting).
- **Filters, sort, and copy format now persist** across popup close/reopen (search text, method/status filters, sort column+direction, curl/fetch choice) — previously reset every time.
- **Options page** (gear icon in the footer) to configure how many recent requests are kept before the oldest get evicted (default 150, was previously hardcoded), and to reveal sensitive header values (see below).
- **Sensitive header values are masked by default** — `Authorization`, `Cookie`, `Set-Cookie`, and API-key-style headers show as `[REDACTED]` in the detail panel, copied curl/fetch commands, and Postman/HAR exports. The Options page's "Show sensitive header values" toggle reveals real values when you actually need them.
- **GraphQL operation names.** GraphQL clients POST every operation to one endpoint, so every row used to look identical — a request whose body has an `operationName` field now shows it as a badge next to the URL.
- **Slow requests are highlighted** — the Time column turns red/bold past 1 second.
- **Replay a captured request** from the detail panel (↻ Replay) — resends the exact method/headers/body; since the extension already has broad host permissions this isn't blocked by page-level CORS, and the replay shows up as a new row on its own.
- **Export HAR**, alongside Postman, for opening captured traffic in other tools.

### Changed
- **Toolbar is back to its simpler 1.1.2-era look in the small popup, and shows everything once undocked.** Clear/Export/Copy All are icon-only (tooltip explains each), and the Postman/HAR and curl/fetch format pickers are hidden entirely — Export/Copy All still work with whatever format was last chosen, and their tooltips point at "Open in Tab" for switching format. The Preserve log/All tabs *switches* keep their text label even in the small popup, since a bare toggle doesn't say what it does the way an icon-only action button still can. Undocking into a full tab shows the format pickers and every button's text label, since there's room. Keeps the popup from feeling crowded without hiding anything behind an unlabeled menu or losing the ability to change format entirely.
- Curl commands are now built on demand in `js/popup.js` (same on-the-fly approach `buildFetchSnippet` already used), instead of being pre-assembled and stored by `js/background.js` — needed so sensitive header values can be redacted header-by-header rather than against an already-escaped string.

## 1.1.2 - 2026-08-06

### Added
- **"Open in Tab"** button to undock the popup into a normal browser tab (`chrome.tabs.create` + closes the small popup behind it), which stays open instead of closing on blur — useful for extended debugging sessions. Hidden automatically once already running as a tab.
- **Request duration.** Every row now shows how long the request took (e.g. `128ms`, `2.5s`), including failed/canceled ones. Computed from `chrome.webRequest`'s own per-event timestamps, no extra API needed.
- **Search now also matches request/response body**, not just the URL.
- **Sortable columns.** Click URL/Status/Time column headers to sort (ascending → descending → back to natural arrival order); pending rows always stay at the bottom, unsorted.

### Removed
- **The "cached row" fallback capture added in 1.1.1.** Live-tested it further this round (disk-cache-hit reloads, concurrent duplicate `fetch()` calls) and it never triggered — `chrome.webRequest` tracks cache-served responses fine on current Chrome/Chromium, so the premise didn't hold up under more scrutiny. Removed the retry/synthetic-row logic (`createSyntheticEntry`, the 300ms delay, the `-synthetic` tag) rather than keep ~150 lines of defensive code for a scenario that's never been observed to happen.

## 1.1.1 - 2026-08-05

### Added
- **Failed/canceled requests now show up instead of silently vanishing.** A request that errors out at the network level (CORS block, DNS failure, connection refused, page-initiated cancel) used to flash as "pending" and then disappear with no trace. It now gets a real row tagged "Failed" or "Canceled" (the latter for `net::ERR_ABORTED` specifically), counted in the badge like any other completed request, with the raw Chrome error string available in the row's detail panel.
- **Manual "Clear" button** in the toolbar to wipe the captured log on demand — previously the only way to clear it was navigating with Preserve log off.
- **Method and status filters** in the search bar, alongside the existing URL search. Status buckets are 2xx/3xx/4xx/5xx/Pending/Failed; all three filters (search text, method, status) combine with AND. Copy All Curl and Export Postman already only acted on visible rows, so they automatically respect these filters too.
- **Defensive fallback capture for requests `chrome.webRequest` never sees.** `response-capture.js`'s page-context `fetch`/XHR hook is now also used as a backstop: if no `chrome.webRequest`-tracked request claims a captured response within 300ms, it's recorded as a "cached" row instead of being silently dropped (no request/response headers are available for these, since none of that is visible from page-context JS). Live testing found `chrome.webRequest` actually does track disk-cache-served responses on current Chrome/Chromium, so this path is not expected to trigger in normal browsing — it's a safety net for cases we haven't identified yet, not a fix for a reproduced symptom.

### Fixed
- **Race condition in `chrome.storage.local`'s `REQUEST_ORDER_KEY` bookkeeping could silently drop a request from the list** (pre-existing since the 1.0.9 requestId-based rewrite, found via live testing while verifying the above). `trackAndEvict`/`clearTabRequests`/`clearAllRequests` all do an unguarded read-modify-write of the same shared order array; two firing close together (e.g. a page making two requests in the same tick, or a request completing right as a navigation clears the tab) could race, with whichever wrote last silently discarding the other's change. The request's own data (headers/body/status) was still captured correctly under its own keys — it just never appeared in the popup and was never cleaned up by eviction. All three now go through a shared in-memory lock (`withRequestOrderLock` in `js/background.js`) so each read-through-write runs to completion before the next one starts.

### Changed
- `buildCurlCommandBase` moved from `js/background.js` to `js/utils.js` so `js/popup.js` can reuse it (needed for the cached-row curl fallback above).

## 1.1.0 - 2026-07-21

### Fixed
- **REST API calls that didn't respond with a JSON-ish content-type were silently invisible.** The popup, the toolbar badge count, and response-body capture all used to require a response's `Content-Type` to match a narrow whitelist (JSON/form-urlencoded/GraphQL) before showing/counting/capturing a completed request — so `DELETE` calls returning `204 No Content` (no header at all), vendor content-types like `application/vnd.api+json`, `text/json`, etc. never appeared, with no indication anything had been filtered out. Every completed fetch/XHR request now shows up regardless of content-type.
- **CORS preflight `OPTIONS` requests drowned out real API calls (and inflated the badge count).** Once the above fix stopped hiding rows, preflight requests — which `chrome.webRequest` reports with the same resource type as the real call they precede, and which the page itself never even sees the response to — started showing up too, usually outnumbering the actual GET/POST/etc. calls for any cross-origin API. `OPTIONS` requests are no longer tracked at all.
- Exported curl commands only special-cased the `PUT` method (`--request PUT`); every other verb — `DELETE`, `PATCH`, `HEAD`, `OPTIONS` while it was still tracked, and `POST` with no request body — had no `--request` flag and silently ran as **GET** when the copied command was executed.
- "Clear on navigate" (when Preserve log is off) only fired when the navigating tab happened to also be the currently *active* tab — a background tab's stale pre-navigation requests were never cleared, and would resurface mixed with its new requests once viewed.
- A response-body FIFO desync introduced while fixing the content-type issue above (registering every completed request for body capture, while the page-side hook still only dispatches for responses with *some* content-type) could permanently misattribute a captured body to an earlier, unrelated same-url request. Fixed by keeping both sides' conditions in sync.
- The "Preserve log" checkbox could briefly show its default state instead of the saved one when the popup opened, due to mixing `await` with the callback form of `chrome.storage.local.get`.
- **Toolbar badge count could disagree with the popup's own request count.** The badge always counted requests across every tab, even when "All tabs" was switched off and the popup was showing just the active tab's subset. The badge also went stale (kept showing a too-high count) whenever old, already-counted requests were evicted to stay under the 150-tracked-request cap, since eviction never triggered a recount — only the next completed response did. The badge now respects the "All tabs" toggle exactly like the popup, and recalculates immediately after every eviction.

### Added
- Tooltips on the toolbar switches/buttons, table column headers, and each row explaining what they do (Preserve log, Export Postman, Copy All Curl, click-to-expand, pending rows).

### Changed
- `src/popup.html` now loads `js/constants.js` and `js/utils.js` before `js/popup.js` (previously reversed, which happened not to break anything but was fragile).

## 1.0.9 - 2026-07-18

### Added
- "All tabs" toggle in the toolbar. Requests are captured extension-wide across every tab; this lets the popup show them all together (the default, so switching tabs never looks like the log got wiped) or, switched off, filter down to just the active tab (DevTools' per-tab Network panel style). The choice is remembered across popup opens.

### Fixed
- `trackAndEvict` and `updateBadgeCount` in the background service worker used to call `chrome.storage.local.get(null)` (reading every stored key) followed by nested loops on every single network request/response, an O(n²) cost that grew heavier the longer Preserve log stayed on and caused visible lag with many requests. Both now read/write only `REQUEST_ORDER_KEY` and the bounded set of tracked requests, making per-request cost independent of total storage size.
- Popup's `renderTable` had the same `get(null)` + nested-loop join, plus it rebuilt the entire `<tbody>` innerHTML and rebound a click listener on every row on every single storage change (debounced 300ms, but still O(n) DOM churn per tick). It now reads only the tracked requests, diffs against the existing rows (patching in place / inserting only what changed, removing only what's gone), and uses one delegated click listener for the whole table instead of one per row.
- Generated curl commands broke if a header name/value or request body contained a single quote (e.g. `-H 'X-Custom: it's here'`), since nothing escaped shell metacharacters inside the single-quoted segments. All curl fragments are now shell-escaped.
- **Repeated calls to the same URL silently overwrote each other.** Everything used to be keyed by `url`, so GraphQL apps (which post every operation to one `/graphql` endpoint) or polling/paginated REST calls only ever showed the *last* call to a given url — every earlier call's headers/body/response for that url was clobbered. Storage is now keyed by `chrome.webRequest`'s own `requestId` (unique per request, stable across redirects), so each call gets its own row. One caveat: response bodies are captured from the page's own JS context (hooking `fetch`/`XHR`, since `chrome.webRequest` can't read response bodies), which has no visibility into Chrome's internal `requestId` — so body-to-request matching is best-effort FIFO per url (`registerPendingBodyMatch`/`claimPendingBodyMatch` in `js/background.js`), correct for the overwhelming majority of traffic but not mathematically guaranteed if identical concurrent requests to the same url resolve out of order.
- `Uncaught (in promise) Error: Resource::kQuotaBytes quota exceeded` from `chrome.storage.local.set()`. Every `.set()` call is now routed through `safeStorageSet`, which catches and logs instead of throwing — previously a single rejected write (e.g. from quota, before `unlimitedStorage` takes effect, which requires reloading the extension after a manifest change, not just the page) aborted the rest of that listener, leaving the request stuck in "pending" forever and skipping the badge update. Also added a `MAX_BODY_LENGTH` cap (`truncateBody` in `js/utils.js`) on stored request bodies, matching the cap `response-capture.js` already applied to response bodies, so one oversized upload can't balloon storage on its own.

### Changed
- Added the `unlimitedStorage` permission. Without it, `chrome.storage.local` is capped around 10MB; a long Preserve-log session with sizeable response bodies could silently hit that cap and start failing writes.
- Every `chrome.webRequest` listener now bails out immediately for anything that isn't an `xmlhttprequest` (fetch/XHR) — images, stylesheets, fonts, etc. never take a slot in the bounded tracked-request list and never get any storage keys written for them, so the 150-request budget is spent entirely on requests that could plausibly be API traffic.
- Removed the `generateUniqueKey`/per-request `uniqueKey` storage entries. They were the only way to enumerate tracked urls before `REQUEST_ORDER_KEY` existed; now that `REQUEST_ORDER_KEY` is the source of truth, they were pure dead writes on every request.
- Each tracked request now records which tab it came from (`<requestId>-tab-id`), which the new "All tabs" toggle (see Added) filters on. Navigating one tab with Preserve log off now only clears that tab's requests (`clearTabRequests` in `js/background.js`), instead of wiping `chrome.storage.local` for every tab.

## 1.0.8 - 2026-07-16

### Added
- Click a row to expand full request headers, response headers, request body, and response body.
- Response body capture via a `fetch`/`XHR` hook running in the page context (no `chrome.debugger` banner needed).
- Detect `application/x-www-form-urlencoded` and GraphQL traffic, not just JSON.
- "Copy All Curl" button to copy every visible request at once.
- Export the visible list as a Postman collection JSON, including a saved example response.
- Realtime updates while the popup stays open: new requests appear live and briefly highlight; in-flight requests show as a "pending" row before their response arrives.
- Badge count on the toolbar icon shows how many requests were detected without opening the popup.
- Light/dark mode following `prefers-color-scheme`.

### Fixed
- `onBeforeSendHeaders` was missing `extraHeaders` in its `opt_extraInfoSpec`, so Chrome silently stripped `Cookie`/`Origin`/`Referer` from captured requests. Copied curl commands and the request headers detail view now include them.
- Toolbar and search bar had mismatched heights; unified to a consistent 48px row height.
- Footer redesigned for a cleaner, single-row layout with a divider and circular social icon chips.

### Changed
- `chrome.storage.local` usage is now bounded: repeated calls to the same URL no longer leave stale duplicate keys, and the least-recently-seen requests are evicted once 150 tracked requests are exceeded.
