# Changelog

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
