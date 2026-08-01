const MAX_LEVEL = 11;
const MIN_COUNT_TO_PLAY = 5;
const ROUNDS_PER_LEVEL_UP = 2;
const COUNTDOWN_SECONDS = 3;
const BEST_SCORE_PREFIX = "audition_best_";

const LIST_KEY_HAS_REVERSE_4K = [
  "right",
  "up",
  "down",
  "left",
  "right-reverse",
  "up-reverse",
  "down-reverse",
  "left-reverse",
];
const LIST_KEY_4K = ["right", "up", "down", "left"];
const MAP_KEY_4K = new Map([
  ["right", "right"],
  ["up", "up"],
  ["down", "down"],
  ["left", "left"],
  ["right-reverse", "left"],
  ["up-reverse", "down"],
  ["down-reverse", "up"],
  ["left-reverse", "right"],
]);

const LIST_KEY_HAS_REVERSE_8K = [
  "right",
  "up",
  "down",
  "left",
  "right-reverse",
  "up-reverse",
  "down-reverse",
  "left-reverse",
  "right-up",
  "left-up",
  "right-down",
  "left-down",
  "right-up-reverse",
  "left-up-reverse",
  "right-down-reverse",
  "left-down-reverse",
];
const LIST_KEY_8K = [
  "right",
  "up",
  "down",
  "left",
  "right-up",
  "left-up",
  "right-down",
  "left-down",
];
const MAP_KEY_8K = new Map([
  ["right", "right"],
  ["up", "up"],
  ["down", "down"],
  ["left", "left"],
  ["right-reverse", "left"],
  ["up-reverse", "down"],
  ["down-reverse", "up"],
  ["left-reverse", "right"],
  ["right-up", "right-up"],
  ["left-up", "left-up"],
  ["right-down", "right-down"],
  ["left-down", "left-down"],
  ["right-up-reverse", "left-down"],
  ["left-up-reverse", "right-down"],
  ["right-down-reverse", "left-up"],
  ["left-down-reverse", "right-up"],
]);

// Arrow glyph shown for each base direction (no image assets - keeps the
// extension free of any bundled art/media).
const GLYPH_MAP = {
  right: "→",
  left: "←",
  up: "↑",
  down: "↓",
  "right-up": "↗",
  "left-up": "↖",
  "right-down": "↘",
  "left-down": "↙",
};
