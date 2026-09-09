# About me
- I'm Tuan. I graduated from Hanoi University of Science and Technology in 2019
- Major : Information Technology
- My blog : https://tuannguyenhust.hashnode.dev/

### 📬 Contact me

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nguyenvantuan2391996@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tuan-nguyen-van-555315156)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/tuanelnino9/)

I will be super happy if you could help me endorse some skills or knowledge on my [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) profile that you believe I have.

# About password-generator-extension
- The extension is developed by Tuan Nguyen.

Generate strong, secure passwords in one click! This simple yet powerful extension lets you customize password length and character types (lowercase, uppercase, numbers, symbols, and more), or switch to memorable passphrases. Features include:

- 🔐 Cryptographically secure randomness (`crypto.getRandomValues`), with every selected character type guaranteed to appear
- 💡 One-click password generation, with a fresh password generated automatically as soon as you open the popup
- 🔀 Three modes: **Password** (character-based), **Passphrase** (word-based, e.g. `Coral-Willow-Ember-42`), and **Check** (estimate the strength of any password you paste in)
- 🎲 Click any word (or the number) in a generated passphrase to reroll just that piece
- 🧩 Custom character options (lowercase, uppercase, numbers, symbols, and more)
- 🙈 Exclude ambiguous characters (`I`, `l`, `1`, `O`, `0`, `o`) or your own custom characters
- 🎚️ Length slider (passwords) and word-count slider (passphrases)
- 📊 Live strength meter (Weak / Medium / Strong) that updates as you tweak your options
- 💾 Your chosen options are remembered across popup opens (synced via `chrome.storage.sync`)
- 🚫 Option to exclude duplicate characters, or avoid sequential runs (`abc`, `123`) and repeated triples (`aaa`)
- 🖱️ Right-click any input field on a page and choose **Generate & Fill Password** to fill it directly, using your saved settings — no popup needed
- 🕘 Recent history — click any past result to copy it again, optionally saved across sessions on this device
- 🗑️ One-click "Clear" to wipe recent history
- 📋 Auto-copy the new password to your clipboard as soon as it's generated (optional)
- ⌨️ Keyboard shortcut to open the popup instantly (`Ctrl+Shift+U` / `Cmd+Shift+U`, customizable in `chrome://extensions/shortcuts`)
- ⚠️ Clear warning if you deselect every character type instead of generating an empty/invalid password
- 📋 Copy password instantly with a single click

☕ Like the tool? Buy me a coffee 👉 [https://paypal.me/Newslette247](https://paypal.me/Newslette247)

Perfect for developers, security-conscious users, or anyone needing safe, random passwords. Lightweight, no ads, and privacy-friendly.

## Changelog

### 1.0.5
- Fixed: the Length slider/number/badge could show a value that didn't match the password actually generated (e.g. typing an out-of-range number, or "Exclude duplicates" shrinking the usable pool) — the display now always reflects the real generated length
- Fixed: the "no password generated" warning always said "Select at least 1 character type," even when a type was selected but exclusions had removed every character from it — it now shows the correct message for each case
- Fixed: reloading/updating the extension could throw a silent "duplicate id" error when recreating the right-click "Generate & Fill Password" menu item
- Fixed: "Generate & Fill Password" could leave an unhandled error in the background console on pages where script injection isn't allowed (e.g. `chrome://` pages)
- Added ARIA roles/labels to the Password/Passphrase/Check mode switch and live-region announcements for the strength label and warnings, for better screen-reader support
- Fixed: dragging the Length or Word Count slider regenerated (and re-saved settings, and pushed to history) on every tick instead of once you settle on a value — could spam the recent-history list and hit Chrome's storage write-rate limit during a fast drag
- UX: "Generate & Fill Password" (right-click menu) now gives visible feedback — the filled field flashes green, and the toolbar badge shows a ✓ or ! so you know it worked (or why it didn't) even with the popup closed
- UX: the password field auto-selects its contents when focused in Password/Passphrase mode, so Cmd/Ctrl+C copies immediately without manually selecting the text
- UX: the field gets a distinct dashed, accent-colored border in Check mode so it's visually clear it's now an editable input rather than a read-only result
- Fixed: pressing Enter in the Length or "Exclude specific characters" field could fire two generations back-to-back (the field's own change handler or a pending debounce, plus the form's implicit submit), pushing a duplicate entry into history — fixed with a re-entrancy guard in `generate()` plus clearing any pending debounce on submit
- Fixed: a fresh passphrase (or rerolling a single word) could land on the same word twice, e.g. `Ivory-Walnut-Tunic-Prism-Tunic-57` — word picks now exclude the other words already in the passphrase
- Fixed: typing in the Check field and switching to Password/Passphrase mode before its 150ms debounce fired could sneak in a phantom extra generation under the new mode — any explicit generate() call now cancels every pending debounce
- Fixed: keyboard users tabbing to the password field (in Password/Passphrase mode) or to the Length/Word Count sliders got no visible focus indicator at all — added a focus ring to both
- Added an `aria-label` to the copy button so screen readers announce it as "Copy to clipboard" instead of just reading the emoji

### 1.0.4
- Added a **Check** mode: paste or type any password to get a live strength estimate (based on character variety, length, and repeated/sequential-run patterns — an approximation, not a dictionary or breach check)
- Passphrase words and the trailing number are now individually clickable chips — reroll just one word instead of regenerating the whole passphrase

### 1.0.3
- Added **Generate & Fill**: right-click any input field on a page and fill it with a freshly generated password/passphrase (uses your saved settings), via `activeTab` + a context menu — no persistent content script or broad host permissions added
- Added "avoid sequential characters" option to skip runs like `abc`/`123` and repeated triples like `aaa`
- Expanded the passphrase wordlist from ~120 to ~770 words for stronger passphrase entropy
- Added optional auto-copy to clipboard as soon as a password/passphrase is generated
- Added optional persistent history (`chrome.storage.local`, this device only) plus a one-click "Clear" button
- Refactored password/passphrase generation into a shared module used by both the popup and the background script

### 1.0.2
- Switched password generation from `Math.random()` to `crypto.getRandomValues()` for cryptographically secure randomness
- Added Passphrase mode with customizable word count, separator, capitalization, and trailing number
- Guaranteed at least one character from each selected type in generated passwords
- Added "exclude ambiguous characters" and custom character exclusion options
- Added length/word-count sliders and a session-only recent history list
- Added a keyboard shortcut to open the popup
- Removed an unused `<all_urls>` content script injection to reduce the extension's footprint

### 1.0.1
- Initial tracked release
