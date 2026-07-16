# Changelog

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
