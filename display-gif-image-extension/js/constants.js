const API_KEY_GIF_B64 = "bXVkMllXYm9ZQ2d3dmd6V2YyQ0l5ZHBYdElUUndVaFI=";
const API_KEY_GIF = atob(API_KEY_GIF_B64);
const DEFAULT_GIF_URL = "https://iili.io/FSWmTTg.gif";
const DEFAULT_CHARACTER_SIZE = 180;
const DEFAULT_ANIMATION_DURATION = 30;
const GIF_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const BACKGROUND_SCREEN = "background";
const POPUP_SCREEN = "popup";

const HANDLE_MAIN_WEBSITE_LOADED = "main-website-loaded";
const HANDLE_SAVE_CONFIG = "save-config";
const HANDLE_ON_OFF = "on-off";
const HANDLE_CLEAR_CONFIG = "clear-config";

const STORAGE_KEY_SELECT_TYPE = "gif_extension_select_type";
const STORAGE_KEY_KEY_SEARCH = "gif_extension_key_search";
const STORAGE_KEY_SELECT_POSITION = "gif_extension_select_position";
const STORAGE_KEY_SIZE = "gif_extension_size";
const STORAGE_KEY_SPEED = "gif_extension_speed";
const STORAGE_KEY_BLOCKLIST = "gif_extension_blocklist";
const STORAGE_KEY_GIF_CACHE = "gif_extension_gif_cache";
const STORAGE_KEY_TURN_ON_OFF = "turn_on_off";
