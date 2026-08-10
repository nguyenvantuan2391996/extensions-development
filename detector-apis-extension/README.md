# About me
- I'm Tuan. I graduated Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

Buy me a coffee ☕ or donate here 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About detector-api-extension
- The extension detects every fetch/XHR API request fired when a website loads (any content-type — JSON, form-urlencoded, GraphQL, or otherwise), and lets you inspect and export them as CURL commands or a Postman collection.
- The extension is developed by Tuan Nguyen.

## Features
- Detects fetch/XHR API requests fired while a page loads, regardless of response content-type — CORS preflight `OPTIONS` requests are excluded so they don't drown out the real calls.
- Failed/canceled requests (network errors, CORS blocks, DNS failures) show up as their own status instead of silently vanishing, with the raw error available in the detail panel.
- Every request shows its response time and size, and requests whose URL was called more than once are tagged with a "×N" badge so repeated/polling calls are easy to spot.
- Filter by HTTP method and response status (2xx/3xx/4xx/5xx/Pending/Failed), and search by URL or request/response body — all combinable, and remembered across popup opens.
- Sort the list by URL, status, time, or size by clicking the column header.
- "All tabs" toggle: see requests from every open tab at once, or narrow the list down to just the active tab (DevTools' per-tab Network panel style). Remembered across popup opens.
- "Open in Tab" to undock the popup into a normal browser tab that stays open instead of closing when you click elsewhere — handy for longer debugging sessions.
- Click a row to expand full request headers, response headers, request body, and response body.
- Copy any detected request as curl or as a JS `fetch()` snippet (switchable), or **Copy All** to grab every currently visible request at once.
- Export the visible list as a Postman collection JSON for sharing or importing elsewhere.
- Manual **Clear** button, and a **Preserve log** toggle to keep the list across page reloads (similar to DevTools Network tab).
- Realtime updates while the popup is open — new requests appear live and briefly highlight, no need to reopen the popup.
- Badge count on the toolbar icon shows how many requests were detected without opening the popup, respecting the "All tabs" toggle.
- Options page to configure how many recent requests are kept in storage before the oldest are evicted.
- Automatic storage cleanup keeps long sessions from growing unbounded, even with Preserve log on.
- Tooltips on toolbar controls, table headers, and rows explaining what they do.
- Light and dark mode, following your system appearance.

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.