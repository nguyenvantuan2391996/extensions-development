# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About clipboardiq-extension
- The extension is developed by Tuan Nguyen.

ClipboardIQ is a clipboard manager built for support and sales teams who type the same kind of reply over and over ("Thanks for reaching out about order #...", "Sorry for the delay, it will now arrive on...", refund confirmations, apologies). Instead of just keeping a passive history like a typical clipboard manager, it actively learns from what you copy:

- 📋 **Clipboard history** — every text snippet you copy on a web page is captured and kept, searchable, entirely on your own device
- 🧠 **Pattern detection** — a client-side similarity engine (Jaccard similarity over word n-grams, no external API, no LLM) watches for snippets you've copied 3+ times that are close variations of each other
- ✨ **Auto-generated templates** — once a pattern is found, a word-level diff (longest-common-subsequence alignment against a backbone snippet) figures out which parts of the text stay the same and which parts change, and rewrites the varying parts as `{{placeholder}}` tokens
- 🏷️ **Smart placeholder naming** — variable spans are classified with lightweight regex heuristics into `{{customer_name}}`, `{{order_id}}`, `{{email}}`, `{{date}}`, `{{number}}`, or a generic `{{value}}`
- 🖊️ **Fill and copy from the popup** — the popup itself lists your saved templates; hit Use, fill in one input per placeholder, watch the preview update live, and copy — no need to open the dashboard for the common case
- ⌨️ **Right-click to insert, anywhere** — right-click any text field or editable area on any page and pick a template from the ClipboardIQ submenu; if it has placeholders, a small floating form appears next to the field to fill them in, then the composed text is typed straight into that field (no manual copy-paste, no tab switching)
- ✍️ **Manual templates too** — you can also write a template by hand with `{{placeholder}}` syntax if you don't want to wait for auto-detection
- 🔒 **Local-only, privacy-first** — capture can be toggled off any time, and nothing ever leaves the device; there is no network request anywhere in the extension

The popup is a quick-glance launcher (capture toggle, stats, the newest suggestion, last few copies, and now a usable template list). The full dashboard tab (history, suggestions, all templates, settings) is there for the less common, more involved tasks.

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

## How the detection works

1. A content script listens for the browser's native `copy` event on every page and reports the copied text (and nothing else) to the background service worker.
2. The background worker compares the new snippet against existing clusters (and recent unclustered history) using `similarity.js` — Jaccard similarity over word bigrams, blended with unigram overlap.
3. Once a cluster reaches the configured minimum size (3 snippets by default) at or above the similarity threshold (60% by default), `placeholder-extractor.js` builds a template: it aligns every member against a backbone snippet with a word-level LCS diff, marks positions that don't match across every member as "variable," and merges consecutive variable positions into a placeholder span.
4. Each placeholder span is classified from its sample values (email / order id / date / number / name / generic) and named accordingly, so `{{customer_name}}` and `{{order_id}}` show up instead of `{{value_1}}` wherever the pattern is obvious.
5. The suggestion appears in the dashboard's Suggestions tab; accepting it saves a real template, dismissing it hides that cluster.

## File overview

| File                             | Purpose                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `manifest.json`                   | Extension manifest (Manifest V3)                                                     |
| `src/popup.html`                  | Toolbar popup: capture toggle, stats, top suggestion, template list, recent copies    |
| `src/dashboard.html`              | Full-tab app: History / Suggestions / Templates / Settings                           |
| `css/popup.css`                   | Popup theme and layout                                                                |
| `css/dashboard.css`               | Dashboard layout: tabs, entry lists, suggestion cards, modals, settings              |
| `js/constants.js`                 | Storage keys, defaults, id/format helpers shared by every context                     |
| `js/similarity.js`                | Jaccard similarity over word n-grams (pure JS, no dependencies)                       |
| `js/placeholder-extractor.js`     | Word-level diff/alignment engine that builds `{{placeholder}}` templates from a cluster |
| `js/store.js`                     | `chrome.storage.local` read/write helpers (used by the background worker)             |
| `js/background.js`                | Service worker: clustering, suggestion generation, template CRUD, badge count, right-click context menu |
| `js/content.js`                   | Captures `copy` events; also renders the floating fill-in form and inserts text when a template is picked from the right-click menu |
| `js/popup.js`                     | Popup UI logic, including the in-popup "Use template" fill-in modal                    |
| `js/dashboard.js`                 | Dashboard UI logic (tabs, lists, fill-in modal, template editor)                       |

## Installing (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `clipboardiq-extension` folder

## Notes

Written in vanilla JavaScript/HTML/CSS with no external libraries or frameworks. All data (clipboard history, clusters, suggestions, templates, settings) is stored in `chrome.storage.local` and never transmitted anywhere — there is no `host_permissions` entry and no network call in the codebase.
