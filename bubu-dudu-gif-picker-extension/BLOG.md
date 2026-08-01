# Bubu Dudu GIF Picker: Xây dựng một Chrome Extension mang "cục cưng" lên mọi trang web

> Tác giả: Tuan Nguyen — [blog cá nhân](https://tuannguyenhust.hashnode.dev/)

Bạn có bao giờ muốn màn hình trình duyệt của mình bớt khô khan bằng cách để một chú Bubu hoặc Dudu chạy ngang qua màn hình mỗi khi mở một trang web? Đó chính là ý tưởng đằng sau **Bubu Dudu GIF Picker Extension** — một Chrome Extension nhỏ gọn nhưng đầy đủ tính năng mà mình đã xây dựng, từ việc chọn GIF, tuỳ chỉnh hoạt ảnh, cho đến việc đồng bộ trạng thái giữa các tab.

Bài viết này sẽ đi qua toàn bộ ý tưởng, kiến trúc, các thành phần chính, và cách extension này được xây dựng.

---

## 1. Extension này làm gì?

Chỉ với một cú click, bạn có thể chọn một GIF Bubu Dudu yêu thích và để nó **bay ngang qua màn hình** trên bất kỳ trang web nào bạn ghé thăm — theo 4 hướng: trái → phải, phải → trái, trên → dưới, dưới → trên.

### Tính năng chính

- 🎞️ **Chọn GIF** từ bộ sưu tập có sẵn, hoặc thêm GIF của riêng bạn qua URL, upload file, hoặc **click chuột phải** vào bất kỳ ảnh nào trên trang web và chọn "Add this image as a Bubu Dudu GIF"
- 🎯 **4 hướng hoạt ảnh**: trái→phải, phải→trái, trên→dưới, dưới→trên
- 🎛️ **Tuỳ chỉnh** kích thước, vị trí, và thời lượng animation theo ý thích
- 🔀 **Random GIF mỗi lần ghé thăm** — thay vì luôn hiện cùng một GIF
- 🚫 **Tắt riêng theo từng site** mà không mất GIF đã lưu
- 📦 **Export/Import** danh sách GIF dưới dạng JSON — hữu ích khi backup hoặc đổi trình duyệt
- 🌐 Hoạt động trên **mọi website**
- 🪶 Nhẹ, đơn giản, không phụ thuộc CDN ngoài (kể cả Tailwind CSS cũng được bundle offline)

---

## 2. Kiến trúc tổng thể

Một Chrome Extension (Manifest V3) thường có 3 "sân khấu" chính: **popup**, **background service worker**, và **content script**. Bubu Dudu tận dụng đúng mô hình này:

```
┌─────────────────┐        chrome.runtime.sendMessage       ┌──────────────────┐
│   Popup (UI)     │ ───────────────────────────────────────▶│  Content Script  │
│  popup.html/js    │                                          │   content.js     │
└─────────────────┘                                          └──────────────────┘
        │                                                              ▲
        │ chrome.storage.local                                        │
        ▼                                                              │
┌─────────────────┐        chrome.tabs.sendMessage           ┌──────────────────┐
│  chrome.storage   │ ◀─────────────────────────────────────│ Background Worker │
│      .local        │                                        │  background.js    │
└─────────────────┘                                          └──────────────────┘
```

- **Popup** là nơi người dùng tương tác: chọn GIF, chỉnh size/position/direction/duration.
- **Background service worker** lắng nghe sự kiện điều hướng trang (`chrome.webNavigation`) và context menu (chuột phải).
- **Content script** được inject vào mọi trang (`document_start`), chịu trách nhiệm render GIF thật sự lên DOM.
- Tất cả state (GIF đã chọn, cài đặt) được lưu tập trung trong `chrome.storage.local` để tránh lệch dữ liệu giữa các phần.

---

## 3. Các thành phần chính trong mã nguồn

### 3.1. `manifest.json` — Khai báo extension

```json
{
  "manifest_version": 3,
  "action": { "default_popup": "src/popup.html" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["js/content.js", "js/constants.js", "js/utils.js"],
      "run_at": "document_start"
    }
  ],
  "background": { "service_worker": "js/background.js" },
  "permissions": ["webNavigation", "storage", "scripting", "contextMenus"],
  "host_permissions": ["*://*/*"]
}
```

Điểm đáng chú ý:
- Dùng **Manifest V3** với service worker thay vì background page truyền thống.
- `content_scripts` chạy ở `document_start` trên **mọi URL** (`<all_urls>`) để đảm bảo GIF luôn kịp xuất hiện.
- `contextMenus` permission phục vụ tính năng "Add this image as a Bubu Dudu GIF" khi chuột phải vào ảnh.

### 3.2. `js/constants.js` — Nguồn sự thật duy nhất (Single Source of Truth)

File này định nghĩa toàn bộ key lưu trữ, giá trị mặc định, và tên các message action, ví dụ:

```js
GIF_SIZE = "gif_size"
GIF_POSITION = "gif_position"
GIF_SIZE_MIN = 20
GIF_SIZE_MAX = 600
GIF_DURATION_DEFAULT = 60
MAX_GIF_FILE_SIZE_BYTES = 3 * 1024 * 1024
LIST_GIFS_DEFAULT = [ /* 24 GIF Bubu Dudu curated sẵn */ ]
```

Nhờ tập trung constants ở một chỗ, cả `popup.js`, `content.js`, và `background.js` đều tham chiếu cùng một "ngôn ngữ chung" — tránh magic string rải rác khắp nơi.

### 3.3. `js/background.js` — Service Worker

Đảm nhiệm 2 việc:

1. **Context menu "Add this image as a Bubu Dudu GIF"**: khi cài đặt xong, tạo menu chuột phải trên ảnh; khi người dùng click, kiểm tra URL có đúng định dạng `.gif` không, tránh trùng lặp, rồi lưu vào `chrome.storage.local`. Có phản hồi trực quan bằng **badge màu** trên icon (✓ xanh = thành công, ✓ xám = đã tồn tại, ! đỏ = lỗi).

2. **Theo dõi điều hướng trang** qua `chrome.webNavigation.onDOMContentLoaded`, chỉ xử lý frame chính (`frameId === 0`, bỏ qua iframe), rồi gửi message tới content script của đúng tab đó để render lại GIF — kể cả khi trang được mở nền (middle-click) mà chưa từng active.

### 3.4. `js/content.js` — "Sân khấu" hiển thị GIF

Đây là trái tim của phần hiệu ứng. Content script lắng nghe message từ popup và background, đọc state từ storage, rồi:

- Kiểm tra site hiện tại có nằm trong `disabled_hosts` không → nếu có, gỡ GIF và dừng.
- Nếu bật **Random mode**, chọn ngẫu nhiên 1 GIF từ danh sách; ngược lại dùng GIF đã chọn.
- **Inject CSS keyframes động** cho 4 hướng chuyển động (`moveLeftToRight`, `moveRightToLeft`, `moveTopToBottom`, `moveBottomToTop`), tái sử dụng cùng một `<style>` tag thay vì chèn tag mới mỗi lần đổi setting (tránh phình DOM).
- Tạo `<img>` với `position: fixed`, `z-index: 9999`, `pointer-events: none` (để không chặn tương tác người dùng với trang), rồi gắn vào `document.body`.

### 3.5. `js/popup.js` + `src/popup.html` — Giao diện người dùng

Popup theo phong cách lấy cảm hứng từ Apple: toolbar gọn, lưới GIF dạng thumbnail, toggle switch mượt. Các chức năng chính:
- Chọn / thêm / xoá GIF (qua URL, upload file, hoặc từ context menu).
- Validate kích thước file (tối đa 3MB) và validate URL bằng cách thực sự load ảnh trước khi lưu.
- Điều chỉnh Size (20–600px), Duration (5–300s) với validation khi nhập sai.
- Toggle "Show on this site" và "Random GIF each visit".
- Export/Import danh sách GIF ra file JSON.

### 3.6. `js/utils.js` — Hàm tiện ích dùng chung

Chứa các helper (validate input, gửi message, xử lý storage...) được `content.js` và `popup.js` dùng chung, giữ cho logic nghiệp vụ không bị lặp lại.

---

## 4. Các bước xây dựng extension (workflow thực tế)

Nếu bạn muốn tự làm một extension tương tự, đây là các bước chính đã áp dụng:

1. **Thiết kế data model trước**: xác định các key sẽ lưu trong `chrome.storage.local` (GIF đã chọn, danh sách GIF, size, position, direction, duration, disabled hosts, random mode) và đặt tên hằng số tập trung ngay từ đầu.
2. **Viết `manifest.json`** với đúng permission tối thiểu cần thiết (`storage`, `scripting`, `webNavigation`, `contextMenus`) — tránh xin quá nhiều quyền không cần.
3. **Xây content script** để render hiệu ứng lên trang, đảm bảo idempotent (gọi lại nhiều lần không bị chèn trùng style/DOM).
4. **Xây background service worker** để lắng nghe sự kiện vòng đời trang và context menu, đóng vai trò "điều phối viên" giữa các tab.
5. **Xây popup UI** làm nơi cấu hình, gửi message tới content script qua `chrome.tabs.sendMessage` để áp dụng thay đổi tức thời trên tab hiện tại.
6. **Thêm validation & UX feedback**: giới hạn dung lượng file, validate URL/GIF hợp lệ, hiển thị toast/badge phản hồi rõ ràng thay vì fail âm thầm.
7. **Kiểm thử đa tình huống**: trang mở nền, nhiều iframe, nhiều cửa sổ trình duyệt, trang không hỗ trợ content script (như `chrome://settings`) — đảm bảo không throw lỗi và có thông báo hợp lý.
8. **Đóng gói & phát hành**: chuẩn bị icon nhiều kích thước (16/32/48/128px), ảnh promo cho Chrome Web Store, viết changelog rõ ràng theo từng version.

---

## 5. Những bài học rút ra khi làm Manifest V3 extension

- **Service worker không "sống" liên tục** như background page cũ — mọi state quan trọng phải nằm trong `chrome.storage`, không được giữ trong biến global của service worker.
- **`frameId !== 0`** là điều kiện quan trọng để tránh xử lý trùng lặp khi trang có nhiều iframe.
- **Tái sử dụng `<style>` tag** thay vì luôn tạo mới giúp tránh rò rỉ DOM khi người dùng đổi cấu hình liên tục.
- **Validate ở boundary**: chỉ validate khi nhận input từ người dùng (URL, file upload, giá trị số), không cần validate lại dữ liệu nội bộ đã tin cậy.
- **Badge + toast feedback** là cách rẻ tiền nhưng hiệu quả để người dùng luôn biết hành động của họ đã thành công hay chưa.

---

## 6. Kết

Bubu Dudu GIF Picker là một ví dụ nhỏ nhưng đầy đủ về cách xây dựng một Chrome Extension "vui vẻ" theo đúng chuẩn Manifest V3: tách bạch rõ ràng giữa popup, background, và content script; state tập trung; UX được chăm chút bằng validation và feedback tức thời.

Nếu bạn thấy công cụ này dễ thương và hữu ích, đừng ngại [mời mình một ly cà phê ☕](https://paypal.me/Newslette247), hoặc kết nối với mình qua [LinkedIn](https://www.linkedin.com/in/tuan-nguyen-van-555315156) để cùng trao đổi thêm về Chrome Extension development!
