// key localstorage
const ACCESS_TOKEN = "access-token";

// handle action
const POPUP_SCREEN = "popup";
const HANDLE_LOAD_EXTENSION = "handleLoadExtension";

// msg
const NOT_FOUND_MSG = "not found";
const DATA_EMPTY_MSG = "The data is empty";
const INVALID_WEBSITE_MSG =
  "The website is not https://beta.tala.xyz or https://tiki.vn. So, we will redirect to https://beta.tala.xyz";
const INVALID_SUPPORT_DEV_MSG = "The website is not https://beta.tala.xyz";

// pattern API name
const PATTERN_API_NAME = "tiki360-extension-";
const PATTERN_DS_INSURANCE = "ds-insurance";

// status
const COMPLETE = "complete";
const LOADING = "loading";

const X_REQUEST_ID = "x-request-id";

// env
const PREFIX_URL_DEV = "https://beta.tala.xyz";
const PREFIX_URL_PROD = "https://tiki.vn";
const PREFIX_API_DEV = "https://api.tala.xyz";
const PREFIX_API_PROD = "https://api.tiki.vn";
const PREFIX_API_PROD_STORE_FRONT = "https://tiki.vn/api";

// user agent
const ARRAY_USER_AGENT = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.94 Chrome/37.0.2062.94 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/8.0.8 Safari/600.8.9",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12",
  "Mozilla/5.0 (Windows NT 6.1; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/600.5.17 (KHTML, like Gecko) Version/8.0.5 Safari/600.5.17",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4",
  "Mozilla/5.0 (iPad; CPU OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53",
  "Mozilla/5.0 (X11; CrOS x86_64 7077.134.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.156 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/7.1.7 Safari/537.85.16",
  "Mozilla/5.0 (iPad; CPU OS 8_1_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B466 Safari/600.1.4",
  "Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; KFTT Build/IML74K) AppleWebKit/537.36 (KHTML, like Gecko) Silk/3.68 like Chrome/39.0.2171.93 Safari/537.36",
  "Mozilla/5.0 (Linux; U; Android 4.4.3; en-us; KFTHWI Build/KTU84M) AppleWebKit/537.36 (KHTML, like Gecko) Silk/3.68 like Chrome/39.0.2171.93 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; Touch; TNJB; rv:11.0) like Gecko",
  "Mozilla/5.0 (Linux; Android 5.0.2; LG-V410/V41020b Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/34.0.1847.118 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 5.0.1; SAMSUNG SM-N910T Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.1 Chrome/34.0.1847.76 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.132 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.0.9895 Safari/537.36",
];

const ARRAY_ID_BIKE_CAR = [
  11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 34,
  35, 36, 37, 38, 43, 44, 47, 48, 49, 50, 60, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 81, 82, 83, 84, 85, 86, 88, 89,
  90, 92, 93, 94, 95, 97, 98, 99,
];

const ARRAY_ID_CHARACTER_BIKE_CAR = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "K",
  "L",
  "M",
  "N",
  "P",
  "S",
  "T",
  "U",
  "V",
  "X",
  "Y",
  "Z",
];

const ARRAY_LAST_NAME = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
];

const ARRAY_FIST_NAME = [
  "An",
  "Anh",
  "Khoa",
  "Mai",
  "Thu",
  "Hạnh",
  "Khôi",
  "Tuấn",
  "Yến",
  "Nga",
  "Bách",
  "Giang",
  "Bảo",
  "Ngọc",
  "Khanh",
  "Lâm",
  "Hà",
  "Long",
  "Hương",
  "Thảo",
  "Vinh",
  "Trang",
  "Nam",
  "Lý",
  "Hiền",
  "Thiên",
  "Bình",
  "Huyền",
  "Minh",
  "Chiến",
  "Công",
  "Cường",
  "Đăng",
  "Khôi",
  "Đạt",
  "Đức",
  "Vân",
  "Hoa",
  "Huy",
  "Linh",
];

const EXTRAS_ADD_ON =
  '{"data":[{"name":"Bảo hiểm thời trang - 1,000 VND","mid":"2471075"},{"name":"Bảo hiểm thời trang - 2,000 VND","mid":"2471073"},{"name":"Bảo hiểm thời trang - 2,500 VND","mid":"2471074"},{"name":"Bảo hiểm thiết bị điện tử - 1,000 VND","mid":"2465060"},{"name":"Bảo hiểm thiết bị điện tử - 1,500 VND","mid":"2467504"},{"name":"Bảo hiểm thiết bị điện tử - 5,000 VND","mid":"2467505"},{"name":"Bảo hiểm rơi vỡ màn hình điện thoại - 13,000 VND","mid":"2460042"},{"name":"Bảo hiểm rơi vỡ màn hình điện thoại - 35,000 VND","mid":"2460753"},{"name":"Bảo hiểm rơi vỡ màn hình điện thoại - 52,000 VND","mid":"2460762"},{"name":"Bảo hiểm rơi vỡ màn hình điện thoại - 84,000 VND","mid":"2460763"},{"name":"Bảo hiểm trách nhiệm sản phẩm - 1,000 VND","mid":"2463212"},{"name":"Bảo hiểm trách nhiệm sản phẩm - 2,000 VND","mid":"2462653"},{"name":"Bảo hiểm trách nhiệm sản phẩm - 3,000 VND","mid":"2463321"},{"name":"Bảo hiểm trách nhiệm sản phẩm - 4,000 VND","mid":"2463322"}]}';
