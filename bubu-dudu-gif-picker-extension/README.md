# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About Bubu Dudu GIF Picker Extension
- The extension is developed by Tuan Nguyen.
The Bubu Dudu GIF Picker Extension lets you add a touch of cuteness to any website with just one click! Choose a GIF from the built-in picker, and it will gracefully float across your screen — left → right, right → left, top → bottom, or bottom → top.

🧸 Key Features:

- 🎞️ Select a Bubu Dudu GIF from a curated collection, or add your own via URL, file upload, or right-click "Add this image as a Bubu Dudu GIF" on any webpage
- 🎯 Display the GIF on any webpage with 4 animation directions: left → right, right → left, top → bottom, bottom → top
- 🎛️ Fine-tune size, position, and duration to your liking
- 🔀 Optionally show a random GIF from your library on every visit, instead of always the same one
- 🚫 Turn Bubu Dudu off for individual sites without losing your saved GIFs
- 📦 Export or import your saved GIF list as a JSON file — handy for backups or switching browsers
- 🌐 Works on any website you visit
- 🪶 Lightweight, simple, and charming

Whether you're spicing up a presentation, surprising a friend, or just enjoying the vibe — this extension brings Bubu Dudu's cuteness wherever you browse.

## How to use
1. Click the extension icon to open the picker.
2. Pick a GIF from the grid, or hit **+ Add GIF** to bring in your own (via URL or by uploading a `.gif` file) — or just right-click any GIF on a webpage and choose "Add this image as a Bubu Dudu GIF".
3. Adjust Size, Position, Direction, and Duration from the toolbar — changes apply instantly to the current tab.
4. Use the **Show on this site** switch to turn Bubu Dudu off just for the site you're on, or **Random GIF each visit** to get a surprise pick every time.

## What's new in 1.0.3
- Fixed a bug where changing a setting (Size, Position, Direction, Duration) would show a "success" message even when it silently failed to apply — e.g. when the popup is opened on a page Bubu Dudu can't run on. You now get accurate feedback, including a clear inline notice on unsupported pages (like Chrome's settings pages)
- Fixed a bug where repeatedly adjusting settings on the same page kept stacking duplicate `<style>` tags into the page instead of replacing the previous one
- New: turn Bubu Dudu off for the current site with a single switch, without deleting the GIF from your library
- New: right-click any image on a webpage and choose "Add this image as a Bubu Dudu GIF" to add it straight to your library
- New: "Random GIF each visit" toggle — shows a different GIF from your library on every page load instead of always the same one
- New: export your saved GIF list to a JSON file, or import one back in
- Removed the Tailwind CSS CDN dependency from the popup — it now renders fully offline, with no external network request
- Fixed the GIF not appearing on tabs that finished loading in the background (e.g. opened with a middle-click) — it now shows up as soon as you switch to them
- The extension now targets the exact tab that navigated instead of guessing from the "active" tab, avoiding mix-ups when multiple browser windows are open
- Page loads inside iframes no longer trigger redundant re-renders
- First-time setup no longer reloads your current tab — the picker is wired up in place instead
- Saving a GIF that would exceed the browser's storage limit now shows a clear warning instead of silently failing

## What's new in 1.0.2
- Unified storage backend (`chrome.storage.local`) for your saved GIFs and settings, instead of splitting across `localStorage` and `chrome.storage.local` — fixes a rare desync where your selected GIF could reset after a browser/extension update
- Adding a GIF that's already in your list now shows a clear "already in your list" message instead of creating a duplicate
- Size (20–600px) and Duration (5–300s) are now validated — invalid input reverts to a safe default with an explanation, instead of silently breaking the animation
- Uploaded GIF files are capped at 3MB to keep your saved list from ballooning past the storage limit
- Deeper Apple-style polish: spring-like button/tile animations, a frosted-glass toast for notifications, and a "pop" effect when you select a GIF

## What's new in 1.0.1
- Redesigned popup with an Apple-inspired UI — compact toolbar, no more scrolling to see your GIFs
- Fixed animation: Top → Bottom and Bottom → Top now actually animate vertically, instead of only pinning to an edge
- Stricter GIF URL validation — the picker now checks the image actually loads before adding it
- Keyboard-accessible GIF grid and an empty-state hint when your list is cleared out
- Sharper toolbar icon at every size (16/32/48/128px)

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)