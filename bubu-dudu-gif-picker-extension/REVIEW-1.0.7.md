# Review cho version 1.0.7 — Improve UI/UX & Fix bug

> Trạng thái code lúc review: `manifest.json` version **1.0.6**, branch `master`.
> Mỗi item có: vị trí trong code → vấn đề → hướng fix. Tick `[x]` khi làm xong.

---

## P0 — Bug ảnh hưởng trực tiếp tới trang web của user (fix trước)

### [x] P0-1. Content script ghi đè `body { margin: 0 }` lên MỌI trang web
**File:** `js/content.js:109-111`
```js
style.textContent = `body {
          margin: 0;
        }
        ...`
```
- **Vấn đề:** Extension inject CSS global làm mất `margin: 8px` mặc định của `<body>`. Trang nào không tự set margin (blog thuần HTML, trang docs, trang nội bộ...) sẽ bị vỡ layout — dính sát mép trái/trên. Đây là side effect ngoài phạm vi của extension.
- **Fix:** Xoá hẳn rule `body { margin: 0 }`. GIF dùng `position: fixed` nên không cần body margin = 0. Chỉ giữ lại rule cho `.character` và keyframes.

### [x] P0-2. Style tag không được dọn khi tắt extension cho site
**File:** `js/content.js:88-93` (`removeGif`)
- **Vấn đề:** `removeGif()` chỉ xoá `#bubu-dudu-gif-picker` container, còn `<style id="bubu-dudu-gif-picker-style">` vẫn nằm lại trong `<head>`. Nghĩa là sau khi user tắt Bubu Dudu cho site đó, CSS (gồm cả `body{margin:0}` ở P0-1) vẫn tiếp tục ảnh hưởng trang cho tới khi reload.
- **Fix:** Trong `removeGif()` xoá luôn `document.getElementById(STYLE_ID)`.

### [x] P0-3. Tên class & keyframes quá generic → đụng CSS của trang chủ nhà
**File:** `js/content.js:113` (`.character`), `js/content.js:124-146` (`moveLeftToRight`, `moveRightToLeft`, `moveTopToBottom`, `moveBottomToTop`)
- **Vấn đề:** `.character` và các tên `@keyframes` này rất phổ biến. Nếu trang web đang dùng cùng tên → animation của trang bị đè, hoặc GIF của mình bị style của trang đè lên. Bug kiểu này rất khó debug và user chỉ thấy "extension làm hỏng web".
- **Fix:** Đổi hết sang prefix `bubu-dudu-`: `.bubu-dudu-character`, `@keyframes bubuDuduMoveLeftToRight`, ... Nhớ update `bubu_dudu.className` ở `js/content.js:162`.

### [x] P0-4. `contextMenus.create` throw lỗi "duplicate id" khi update extension
**File:** `js/background.js:3-10`
- **Vấn đề:** `chrome.runtime.onInstalled` fire cả khi **install** lẫn khi **update**. Context menu đã tồn tại từ bản trước → `create()` với cùng `id` sẽ throw `Cannot create item with duplicate id`. Service worker log error, và tuỳ thời điểm có thể mất luôn menu chuột phải.
- **Fix:**
```js
chrome.runtime.onInstalled.addListener(async function () {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({ id: ADD_GIF_MENU_ID, ... })
})
```

---

## P1 — Bug logic / UX sai lệch

### [x] P1-1. Search không tìm được GIF chưa render (thư viện > 48 ảnh)
**File:** `js/popup.js:133-146` (`applyGifSearchFilter`), `js/popup.js:3-12` (`GIF_PAGE_SIZE = 48`)
- **Vấn đề:** Search chỉ filter các `.gif-item` **đã render trong DOM**. GIF nằm trong `pendingGifs` (chưa bấm "Load more") không được tìm. Tệ hơn: dòng `btn-load-more-gifs.hidden = query.length > 0 || ...` **ẩn luôn nút Load more khi đang search**, nên user không có cách nào tìm ra GIF thứ 49 trở đi. Kết quả: "No GIFs match your search" trong khi GIF đó có thật.
- **Fix:** Search phải chạy trên nguồn dữ liệu đầy đủ (`gifs` + `gifNames`), không phải trên DOM. Hướng đơn giản: khi có query → render toàn bộ kết quả match từ full list (bỏ paging trong lúc search), khi clear query → quay lại chế độ paging.

### [x] P1-2. Mọi thay đổi setting đều bị delay 3 giây vì `alert()` chặn
**File:** `js/utils.js:18-29` (`notifyActiveTab`), `js/utils.js:211-223` (`alert`)
- **Vấn đề:** `alert()` có `await delay(3000)` bên trong, và `notifyActiveTab()` `await` nó. Nên mọi caller (`setGifSize`, `setSiteDisabled`, `setRandomMode`, ...) đều bị treo 3s. Hệ quả thấy rõ ở `js/popup.js:350-360` và `379-382`: `updateGifStatusBanner()` chỉ chạy **sau 3 giây** kể từ lúc user gạt toggle → banner trạng thái cập nhật trễ, cảm giác lag.
- **Fix:** Không `await` phần hiển thị toast. Tách `showAlert()` thành fire-and-forget (không block), hoặc `notifyActiveTab` gọi `void showAlert(...)`.

### [x] P1-3. Toast chồng timer → biến mất sớm
**File:** `js/utils.js:211-223`
- **Vấn đề:** `alert()` dùng chung 1 element và không quản lý timer. Bắn toast A (t=0), bắn toast B (t=1s) → tới t=3s timer của A ẩn element, toast B chỉ hiện được 2s. Nếu bắn nhiều liên tiếp, toast cuối gần như không kịp đọc.
- **Fix:** Lưu timeout id theo element, `clearTimeout` trước khi set timer mới (giống cách `showUndoDelete` đang làm ở `js/popup.js:265`).

### [x] P1-4. 3 loại toast đè chồng lên nhau
**File:** `src/popup.html:131-149` (`.alert` = `position: fixed; top: 10px; left: 50%`), markup `1102-1116`
- **Vấn đề:** `#success-alert`, `#error-alert`, `#undo-alert` cùng toạ độ tuyệt đối. Xoá GIF (hiện undo toast) rồi làm thao tác khác (hiện success toast) → 2 toast chồng khít nhau, đọc không ra.
- **Fix:** Bọc chung 1 `.toast-stack` (`position: fixed; top: 10px; display:flex; flex-direction: column; gap: 8px`), các alert thành item bên trong.

### [x] P1-5. Undo xoá 2 GIF liên tiếp → bấm Undo khôi phục cả 2
**File:** `js/popup.js:265-319` (`showUndoDelete`)
- **Vấn đề:** Lần gọi thứ 2 `clearTimeout` timer cũ nhưng **không gỡ listener `onUndo` cũ** (listener cũ dùng `{ once: true }`, chưa từng fire nên vẫn còn treo). Bấm Undo → cả 2 handler chạy → khôi phục 2 GIF, trong khi message chỉ nói về GIF cuối.
- **Fix:** Giữ ref tới `onUndo` hiện tại ở scope ngoài và `removeEventListener` nó ở đầu mỗi lần gọi; hoặc `undoBtn.replaceWith(undoBtn.cloneNode(true))` để reset listener.

### [x] P1-6. GIF mới thêm không tuân theo filter search đang bật
**File:** `js/popup.js:196-260` (`addGifToDOM`), `js/popup.js:610` (import)
- **Vấn đề:** Đang search "bubu", thêm GIF tên "dudu" → nó vẫn hiện trong lưới dù không match. Import cũng vậy (`newOnes.forEach(src => addGifToDOM(...))` render thẳng, bỏ qua cả filter lẫn paging).
- **Fix:** Gọi `applyGifSearchFilter()` sau khi add/import xong.

### [x] P1-7. `window.confirm` / `window.prompt` trong popup extension
**File:** `js/popup.js:654` (reset), `js/popup.js:710` (đặt tên preset)
- **Vấn đề:** Dialog native trong popup extension không đáng tin — tuỳ phiên bản Chrome nó có thể bị chặn hoàn toàn (user bấm "Reset" không thấy gì xảy ra) hoặc làm popup mất focus và **tự đóng**, mất luôn thao tác đang dở. Về mặt UI cũng lạc quẻ với thiết kế còn lại.
- **Fix:** Thay bằng UI inline: reset → confirm 2 bước ngay trong card Library ("Reset to defaults" → "Bấm lần nữa để xác nhận" / hoặc dialog custom); đặt tên preset → 1 ô input nhỏ hiện ra cạnh nút Save.
- **Cần verify trước:** load extension thật, bấm Save preset và Reset xem dialog có hiện không.

### [x] P1-8. Thumbnail GIF chết không có fallback
**File:** `js/popup.js:200-208`
- **Vấn đề:** Danh sách mặc định toàn URL ngoài (Tenor, Pinterest). Link chết là user thấy icon ảnh vỡ, không biết phải làm gì, cũng không rõ có nên xoá không.
- **Fix:** Thêm `img.onerror` → gắn class `is-broken` cho `.gif-item`, hiện placeholder + tooltip "Ảnh này không tải được — bấm ✕ để xoá".

### [x] P1-9. Nguy cơ đầy storage khi upload file
**File:** `manifest.json:39-44`, `js/constants.js` (`MAX_GIF_FILE_SIZE_BYTES = 3MB`)
- **Vấn đề:** Chưa xin quyền `unlimitedStorage` → `chrome.storage.local` giới hạn ~10MB. File GIF lưu dạng base64 (phình ~1.33x), nên chỉ **2 file 3MB là hết quota**. Code đã catch lỗi và báo "storage is full" (tốt) nhưng user sẽ gặp rất sớm.
- **Fix:** Thêm `"unlimitedStorage"` vào `permissions`. Kèm theo: hiện dung lượng đang dùng trong card Library (`navigator.storage.estimate()` hoặc `chrome.storage.local.getBytesInUse()`).

---

## P2 — Accessibility (đang thiếu khá nhiều, ảnh hưởng cả điểm review store)

### [x] P2-1. Nút Xoá / Ghim không dùng được bằng bàn phím
**File:** `js/popup.js:210-232`
- `.delete-icon` và `.favorite-icon` là `<div role="button">` nhưng **không có `tabIndex`** và không có handler `keydown`. Keyboard user không thể xoá hay ghim GIF. CSS `:focus-within` ở `src/popup.html:713-715, 739-742` vì thế không bao giờ kích hoạt.
- **Fix:** Đổi sang `<button type="button">` thật (bỏ được cả `role`/`aria-label` thủ công), hoặc thêm `tabIndex = 0` + handler Enter/Space.

### [x] P2-2. Toggle switch không có focus indicator
**File:** `src/popup.html:829-833`
- `.switch input { opacity: 0; width: 0; height: 0 }` và không có rule `:focus-visible`. Tab tới toggle → không thấy gì đang được focus.
- **Fix:** `.switch input:focus-visible + .switch-slider { box-shadow: 0 0 0 3px rgba(0,113,227,.35); }`

### [x] P2-3. Các button khác cũng không có `:focus-visible`
**File:** `src/popup.html` — `.tab-btn` (871+), `.pill-btn` (595+), `#toggle-add-gif` (470+), `.mini-icon-btn` (350+), `.search-clear-btn` (400+)
- Chỉ có `:hover`, không có style focus. Duy nhất `.gif-item` có (`661`).
- **Fix:** Thêm 1 rule chung `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` cho button, rồi override riêng chỗ nào cần.

### [x] P2-4. Label ở tab Settings không gắn với input
**File:** `src/popup.html:1189, 1193, 1200, 1209, 1214`
- `<label>Size (px)</label>` không có `for`, input có `id="gif_size"`. Screen reader đọc input không có tên; click vào label cũng không focus input.
- **Fix:** thêm `for="gif_size"`, `for="gif_position"`, `for="gif_animation"`, `for="gif_duration"`, `for="preset_select"`.

### [x] P2-5. Tablist thiếu chuẩn ARIA
**File:** `src/popup.html:1123-1131`, `js/popup.js:744-760`
- Thiếu: điều hướng bằng phím ←/→, `tabindex="-1"` cho tab không active, `aria-labelledby` trên `[role="tabpanel"]`, `tabindex="0"` cho panel.
- **Fix:** implement đúng ARIA tabs pattern.

### [x] P2-6. Chưa hỗ trợ `prefers-reduced-motion`
**File:** `src/popup.html` (không có `@media` nào), `js/content.js:109-146`
- Popup có nhiều animation (spring, spinner, drop-in), GIF trên trang chạy animation vô hạn. User bật "giảm chuyển động" trong OS vẫn thấy đủ.
- **Fix:** `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important } }` cho popup; với content script thì đứng yên ở 1 vị trí thay vì chạy ngang.

---

## P3 — Cải thiện UI/UX (phần chính của 1.0.7)

### [x] P3-1. Dark mode
**File:** `src/popup.html` (`:root` ở dòng 8-25)
- Design token đã tách sẵn rồi nên làm rất nhanh: thêm block `@media (prefers-color-scheme: dark) { :root { --bg: #1c1c1e; --card-bg: #2c2c2e; --text-primary: #f5f5f7; ... } }`. Đây là thứ user hay yêu cầu nhất ở extension.

### [x] P3-2. Thông báo thành công quá ồn
**File:** `js/utils.js:18-29` (`notifyActiveTab` → `alert(SUCCESS_ALERT)`)
- Mỗi lần đổi size / position / direction / duration / gạt toggle đều bắn toast xanh 3 giây. Chỉnh vài setting liên tục là toast nhấp nháy liên tục, che nội dung.
- **Fix:** Bỏ toast cho các thay đổi setting (bản thân thay đổi đã có phản hồi trực quan trên trang rồi). Chỉ giữ toast cho hành động rời rạc: thêm GIF, import, export, reset, lưu preset.

### [x] P3-3. Không sửa/xoá được tên GIF sau khi đã thêm
**File:** `js/popup.js:390-394` (`saveGifName` chỉ được gọi lúc add)
- Đặt sai tên là chịu, phải xoá GIF rồi thêm lại. `GIF_NAMES` đã có sẵn trong storage, chỉ thiếu UI.
- **Fix:** Double-click vào `.gif-item` (hoặc thêm 1 icon bút chì) → input inline để đổi tên.

### [x] P3-4. Không xem/quản lý được danh sách site đã tắt
**File:** `js/utils.js:257-279` (`DISABLED_HOSTS` / `ENABLED_HOSTS`), tab Settings
- User tắt Bubu Dudu ở 20 site rồi quên mất là site nào. Đặc biệt ở **Allowlist mode** — bật mode lên là extension biến mất khắp nơi mà không có chỗ nào xem danh sách site đang được cho phép.
- **Fix:** Trong card Behavior, dưới "Allowlist mode" thêm mục "Managed sites (N)" mở ra list hostname kèm nút ✕ để bỏ khỏi list.

### [x] P3-5. Thiếu bộ đếm & thông tin thư viện
**File:** khu vực `.quick-bar` — `src/popup.html:1135-1141`
- Không biết mình đang có bao nhiêu GIF, đang xem 48/200, search ra bao nhiêu kết quả.
- **Fix:** Thêm dòng nhỏ cạnh ô search: "24 GIFs" → khi search đổi thành "3 of 24 match".

### [x] P3-6. Phím tắt trong popup
**File:** `js/popup.js`
- Đề xuất: `/` hoặc `Ctrl/Cmd+F` → focus ô search; `Esc` → clear search nếu đang có query, ngược lại đóng panel Add GIF; `Esc` khi panel Add GIF đang mở → đóng panel. Hiện tại `Esc` đóng luôn cả popup.

### [x] P3-7. Nhớ tab đang mở lần trước
**File:** `js/popup.js:744-760` (`activateTab`)
- Mỗi lần mở popup luôn về tab GIFs. User đang chỉnh setting, đóng popup, mở lại → phải bấm sang Settings lần nữa.
- **Fix:** lưu tab cuối vào `chrome.storage.local`, restore khi mở.

### [x] P3-8. Empty state của search nên có nút thoát
**File:** `src/popup.html:1177`
- "No GIFs match your search." — nên kèm nút "Clear search" ngay dưới thay vì bắt user tự tìm nút ✕ nhỏ trên ô input.

### [x] P3-9. Lazy load thumbnail
**File:** `js/popup.js:206-208`
- 48 ảnh GIF động tải + chạy cùng lúc khi mở popup → popup giật, tốn RAM/CPU.
- **Fix:** `img.loading = 'lazy'`, `img.decoding = 'async'`. Cân nhắc hạ `GIF_PAGE_SIZE` xuống 32.

### [x] P3-10. Preview lớn khi hover
- Thumbnail trong lưới 8 cột khá nhỏ (~65px), khó phân biệt các GIF Bubu Dudu na ná nhau. Hover 500ms → hiện preview to hơn ở góc popup.

### [x] P3-11. Không cuộn tới GIF đang được chọn khi mở popup
**File:** `js/utils.js:89-117` (`displayCheckmark`)
- GIF đang chọn nằm ở vị trí 80 → mở popup không thấy nó đâu.
- **Fix:** sau `displayCheckmark()`, `scrollIntoView({ block: 'nearest' })` phần tử `.selected`.

### [x] P3-12. Nút "+ Add GIF" đổi chữ thành "Close" làm nhảy layout
**File:** `js/popup.js:764-777`
- Chiều rộng nút thay đổi → ô search co giãn theo. Nên set `min-width` cố định cho nút, hoặc giữ nguyên chữ và chỉ xoay icon `+` thành `×`.

### [x] P3-13. Không giới hạn số GIF ở chế độ "Show multiple"
**File:** `js/utils.js:43-72` (`toggleGifSelected`), `js/content.js:157-205`
- Chọn 20 GIF → 20 ảnh động render cùng lúc trên mọi trang, ăn CPU thấy rõ.
- **Fix:** giới hạn mềm (VD 5) + báo "Tối đa 5 GIF cùng lúc".

### [x] P3-14. Footer chiếm chỗ dọc cố định
**File:** `src/popup.html:1273+` (`.app-footer`)
- Popup bị khoá `height: 600px` (`src/popup.html:32-34`) mà header + tabs + toolbar + footer ăn khá nhiều, lưới GIF còn lại ít. Cân nhắc rút footer thành 1 dòng gọn, đưa phần "Feedback / socials" xuống cuối tab Settings.

---

## P4 — Cân nhắc thêm (không bắt buộc trong 1.0.7)

### [x] P4-1. Bỏ quyền `webNavigation` để giảm cảnh báo lúc cài
**File:** `manifest.json:39-44`, `js/background.js:66-81`, `js/content.js`
- `webNavigation` khiến Chrome hiện cảnh báo "Read your browsing history" lúc cài — làm giảm tỉ lệ cài đặt. Thực tế nó chỉ dùng để báo content script "trang đã load".
- **Fix:** content script tự gọi `handleWebsiteLoaded()` khi nó load (thêm entry `run_at: document_idle`, hoặc gọi trực tiếp trong `content.js` khi `document.readyState` đã sẵn sàng), rồi bỏ hẳn `webNavigation`.

### [x] P4-2. GIF biến mất trên SPA (Facebook, YouTube, Gmail...)
**File:** `js/background.js:66-81`
- Chỉ lắng nghe `onDOMContentLoaded`. SPA điều hướng bằng history API → không fire; nếu app thay toàn bộ nội dung `body`, GIF bị gỡ và không được render lại.
- **Fix:** thêm listener `chrome.webNavigation.onHistoryStateUpdated` (nếu vẫn giữ `webNavigation`), hoặc dùng `MutationObserver` nhẹ trong content script để tự gắn lại.

### [x] P4-3. Thứ tự load script sai và đặt sai chỗ
**File:** `src/popup.html:1305-1309`
```html
</html>
<script src="../js/popup.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/constants.js"></script>
```
- Script nằm **sau `</html>`** (HTML không hợp lệ, browser tự hoisting), và thứ tự ngược: `popup.js` chạy trước `constants.js` dù nó phụ thuộc vào hằng số trong đó. Hiện tại chạy được chỉ vì hằng số chỉ được dùng bên trong callback. Rất dễ vỡ khi refactor.
- **Fix:** chuyển vào trong `<body>` (trước `</body>`), đổi thứ tự thành `constants.js` → `utils.js` → `popup.js`.
- Cùng vấn đề ở `manifest.json:25-29` (`content.js` khai báo trước `constants.js`).

### [x] P4-4. `alert()` trong `utils.js` che mất `window.alert` global
**File:** `js/utils.js:211`
- Vì thế chỗ khác phải viết `window.confirm` / `window.prompt` cho rõ. Đổi tên thành `showToast()` cho sạch, tránh bug ngầm.
- Lưu ý `js/background.js:1` `importScripts("utils.js")` — service worker cũng nạp hàm này dù không dùng.

### [x] P4-5. Export file có thể bị huỷ do revoke URL quá sớm
**File:** `js/popup.js:557-560`
```js
a.click()
URL.revokeObjectURL(url)
```
- Revoke ngay sau `click()` có thể làm hỏng download (nhất là khi popup đóng ngay sau đó). Nên `setTimeout(() => URL.revokeObjectURL(url), 1000)` hoặc dùng `chrome.downloads`.
- Tên file cũng nên có ngày: `bubu-dudu-gifs-2026-08-29.json`.

### [x] P4-6. Nút "Delete preset" tự ẩn lại sau khi re-render
**File:** `js/popup.js:685` (`renderPresetOptions` luôn set `btn-delete-preset.hidden = true`)
- Sau khi xoá 1 preset, select reset về "Load preset…" — hành vi này ổn, nhưng label option mặc định không đồng nhất: HTML ghi `None` (`src/popup.html:1217`) còn JS render ra `Load preset…` (`js/popup.js:678`). Thống nhất lại 1 chữ.

---

## Chore trước khi release

- [x] Bump `manifest.json` version `1.0.6` → `1.0.7`
- [x] Thêm mục `## What's new in 1.0.7` vào `README.md`
- [x] Chụp lại screenshot store (`images/store/screenshot-1-popup.png`, `screenshot-3-customize.png`)
- [x] Test checklist (qua harness giả lập, chưa test trên extension thật đã đóng gói): trang HTML thuần, trang SPA, `chrome://` page, thư viện > 48 GIF, storage gần đầy, keyboard-only navigation

---

## Thứ tự làm đề xuất

1. **P0-1 → P0-4** — bug ảnh hưởng trang web người dùng, làm trước, nhanh.
2. **P1-2, P1-3, P1-4** — nhóm toast, sửa 1 lần được cả 3, cải thiện cảm giác "mượt" ngay.
3. **P1-1** — search, đây là bug khó chịu nhất về mặt chức năng.
4. **P1-5 → P1-9**
5. **P2** — accessibility, làm gọn trong 1 lượt vì đa số là thêm CSS.
6. **P3-1 (dark mode), P3-2, P3-5, P3-6, P3-9** — nhóm UX ăn tiền nhất.
7. Còn lại tuỳ thời gian.
