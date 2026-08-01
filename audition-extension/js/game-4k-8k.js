// Variable
let audio = new Audio();
let isReverse = false;
let isSpaced = false;
// True for the entire 3s gap where the box is hidden between rounds
// (whether the round ended via Space or timed out), so arrow-key presses
// during that gap don't get matched against the still-stale listKeyRandom
// (it isn't regenerated until pos next crosses 1150).
let isBoxHidden = false;
let increase = 1;
let pos = 0;
let count = 0;
let countToIncreaseLevel = 0;
let score = 0;
let level = 6;
let listKeyRandom = [];
let listKeyPress = [];
const boxElement = document.getElementById("box");
let picElement = document.getElementById("pic");
let scoreElement = document.getElementById("score");
let comboElement = document.getElementById("combo");
let intervalID = null;
let typeDance = "4k";

// Shared across game-4k-8k.js / game-beat-up.js so both game modes can feed
// the same HUD (combo, best score) and be paused/resumed generically.
let comboCount = 0;
let maxCombo = 0;
let judgementCounts = { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
let bestScore = 0;
let isPaused = false;
let isCountingDown = true;
const gameLoopControl = { start: null, stop: null };

// The currently picked local file + dance type, kept around so "Play again"
// can restart the exact same run without going back through setup.
let currentFile = null;
let currentTypeDance = null;

// Consecutive-Perfect streak: each Perfect beyond the first in a row adds a
// growing bonus on top of the normal judgement score (capped so late-game
// streaks don't dwarf the base scoring).
let perfectStreak = 0;
const PERFECT_STREAK_BONUS_STEP = 50;
const PERFECT_STREAK_BONUS_CAP = 500;
let perfectStreakElement = document.getElementById("perfect-streak");

function updatePerfectStreak(isPerfect) {
  if (!isPerfect) {
    perfectStreak = 0;
    if (perfectStreakElement) perfectStreakElement.textContent = "";
    return;
  }
  perfectStreak++;
  if (perfectStreak > 1) {
    score += Math.min(
      PERFECT_STREAK_BONUS_STEP * (perfectStreak - 1),
      PERFECT_STREAK_BONUS_CAP
    );
    updateScoreDisplay();
  }
  if (perfectStreakElement) {
    perfectStreakElement.textContent =
      perfectStreak > 1 ? "Perfect x" + perfectStreak : "";
  }
}

function startMoveLoop() {
  if (intervalID === null) {
    intervalID = setInterval(move, 0);
  }
}

function stopMoveLoop() {
  clearInterval(intervalID);
  intervalID = null;
}

function updateCombo(hit) {
  comboCount = hit ? comboCount + 1 : 0;
  if (comboCount > maxCombo) maxCombo = comboCount;
  if (comboElement) {
    comboElement.textContent = comboCount > 1 ? comboCount + "x combo" : "";
    if (hit && comboCount > 1) {
      comboElement.classList.remove("combo-pop");
      void comboElement.offsetWidth;
      comboElement.classList.add("combo-pop");
    }
  }
}

// Bumps the score number with a quick pulse so increases are felt, not just read.
function updateScoreDisplay() {
  scoreElement.textContent = score;
  scoreElement.classList.remove("score-pulse");
  void scoreElement.offsetWidth;
  scoreElement.classList.add("score-pulse");
}

function compareKeyPressAndRandom(key) {
  if (isBoxHidden || listKeyPress.length === listKeyRandom.length) {
    return;
  }

  const mapKey = typeDance === "4k" ? MAP_KEY_4K : MAP_KEY_8K;
  if (mapKey.get(listKeyRandom[listKeyPress.length]) === key) {
    const hitElement = document.getElementById(String(listKeyPress.length + 1));
    listKeyPress.push(key + "-success");
    setKey(key + "-success", listKeyPress.length);
    highlightCurrentKey();
    hitElement.classList.remove("key-hit");
    void hitElement.offsetWidth;
    hitElement.classList.add("key-hit");
  } else {
    listKeyPress = [];
    for (let i = 0; i < listKeyRandom.length; i++) {
      setKey(listKeyRandom[i], i + 1);
    }
    highlightCurrentKey();
  }
}

function getListKey(level, listRandom) {
  let list = [];
  Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
  };
  for (let i = 0; i < level; i++) {
    list.push(listRandom.random());
  }
  return list;
}

function resetKeyRandom() {
  for (let i = 1; i <= 11; i++) {
    const el = document.getElementById(i.toString());
    el.textContent = "";
    el.classList.add("key-slot--empty");
    el.classList.remove("key-slot--reverse", "key-slot--success", "current-key");
  }
}

function resetListKeyPress() {
  listKeyPress = [];
}

// Highlights the next key the player needs to press in the preview row.
function highlightCurrentKey() {
  for (let i = 1; i <= listKeyRandom.length; i++) {
    document.getElementById(i.toString()).classList.remove("current-key");
  }
  if (listKeyPress.length < listKeyRandom.length) {
    const nextIndex = listKeyPress.length + 1;
    const el = document.getElementById(nextIndex.toString());
    if (el) el.classList.add("current-key");
  }
}

function setScore(pos) {
  if (listKeyPress.length !== listKeyRandom.length) {
    showJudgement(picElement, "Miss");
    judgementCounts.miss++;
    updateCombo(false);
    updatePerfectStreak(false);
    return;
  }
  if (840 <= pos && pos <= 860) {
    showJudgement(picElement, "Perfect");
    score += isReverse ? 1200 : 800;
    judgementCounts.perfect++;
    updateCombo(true);
    updatePerfectStreak(true);
  } else if ((790 <= pos && pos < 840) || (860 < pos && pos <= 910)) {
    showJudgement(picElement, "Great");
    score += isReverse ? 600 : 350;
    judgementCounts.great++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((760 <= pos && pos < 790) || (910 < pos && pos <= 940)) {
    showJudgement(picElement, "Cool");
    score += isReverse ? 350 : 150;
    judgementCounts.cool++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else if ((750 <= pos && pos < 760) || (940 < pos && pos <= 950)) {
    showJudgement(picElement, "Bad");
    score += isReverse ? 200 : 50;
    judgementCounts.bad++;
    updateCombo(true);
    updatePerfectStreak(false);
  } else {
    showJudgement(picElement, "Miss");
    judgementCounts.miss++;
    updateCombo(false);
    updatePerfectStreak(false);
  }
  updateScoreDisplay();
}

function move() {
  if (pos > 1150) {
    pos = 0;
    count++;
    if (count >= MIN_COUNT_TO_PLAY) {
      resetKeyRandom();
      setTimeout(function () {
        listKeyRandom = isReverse
          ? typeDance === "4k"
            ? getListKey(level, LIST_KEY_HAS_REVERSE_4K)
            : getListKey(level, LIST_KEY_HAS_REVERSE_8K)
          : typeDance === "4k"
          ? getListKey(level, LIST_KEY_4K)
          : getListKey(level, LIST_KEY_8K);
        for (let i = 0; i < listKeyRandom.length; i++) {
          setKey(listKeyRandom[i], i + 1);
        }
        highlightCurrentKey();
      }, 1000);
    }
    if (
      count >= MIN_COUNT_TO_PLAY &&
      countToIncreaseLevel % ROUNDS_PER_LEVEL_UP === 0
    ) {
      level++;
    }
    if (level > MAX_LEVEL) {
      level = MAX_LEVEL;
    }
    if (count > MIN_COUNT_TO_PLAY && !isSpaced) {
      countToIncreaseLevel++;
      showJudgement(picElement, "Miss");
      updateCombo(false);
      updatePerfectStreak(false);
      resetListKeyPress();
      hide("box");
      isBoxHidden = true;
      setTimeout(function () {
        show("box");
        pos = 0;
        isBoxHidden = false;
      }, 3000);
    }
  }

  pos += increase;
  boxElement.style.left = pos + "px";
}

// Shared by the real keyup listener below and by the on-screen touch pad
// (see initTouchControls), so both input sources drive the exact same logic.
function handleGameKeyCode(code) {
  switch (typeDance) {
    case "4k":
    case "8k":
      if (code === "Space" && count >= MIN_COUNT_TO_PLAY && !isSpaced) {
        isSpaced = true;
        setScore(pos);
        hide("box");
        isBoxHidden = true;
        resetListKeyPress();
        setTimeout(function () {
          show("box");
          pos = 0;
          isSpaced = false;
          isBoxHidden = false;
        }, 3000);
        countToIncreaseLevel++;
      }

      // Key dance
      if (code === "ArrowUp" || code === "Numpad8") {
        compareKeyPressAndRandom("up");
      }
      if (code === "ArrowDown" || code === "Numpad2") {
        compareKeyPressAndRandom("down");
      }
      if (code === "ArrowRight" || code === "Numpad6") {
        compareKeyPressAndRandom("right");
      }
      if (code === "ArrowLeft" || code === "Numpad4") {
        compareKeyPressAndRandom("left");
      }
      if (code === "Numpad7") {
        compareKeyPressAndRandom("left-up");
      }
      if (code === "Numpad9") {
        compareKeyPressAndRandom("right-up");
      }
      if (code === "Numpad1") {
        compareKeyPressAndRandom("left-down");
      }
      if (code === "Numpad3") {
        compareKeyPressAndRandom("right-down");
      }

      // Key turn on, turn off reverse
      if (code === "NumpadDecimal") {
        isReverse = !isReverse;
        if (isReverse) {
          document.getElementById("reverse").textContent = "Reverse";
          show("reverse");
        } else {
          hide("reverse");
        }
      }
      break;
    case "beat-up":
      if (code === "Space" || code === "Numpad5") {
        hide("box-beat-up");
        setScoreBeatUpSpace(posSpaceBeatUp);
        setTimeout(function () {
          show("box-beat-up");
          posSpaceBeatUp = 0;
        }, 3000);
      }

      // Key dance
      if (code === "ArrowLeft" || code === "Numpad4") {
        setScoreBeatUpLeft(posLeft);
        posLeft = 0;
      }
      if (code === "Numpad7") {
        setScoreBeatUpLeft(posLeftUp);
        posLeftUp = 0;
      }
      if (code === "Numpad1") {
        setScoreBeatUpLeft(posLeftDown);
        posLeftDown = 0;
      }
      if (code === "ArrowRight" || code === "Numpad6") {
        setScoreBeatUpRight(posRight);
        posRight = 0;
      }
      if (code === "Numpad9") {
        setScoreBeatUpRight(posRightUp);
        posRightUp = 0;
      }
      if (code === "Numpad3") {
        setScoreBeatUpRight(posRightDown);
        posRightDown = 0;
      }
      break;
  }
}

// Event press key
document.body.onkeyup = function (e) {
  if (e.code === "Escape") {
    togglePause();
    return;
  }

  if (isPaused || isCountingDown) {
    return;
  }

  handleGameKeyCode(e.code);
};

// On-screen numpad-style pad (7/9/1/3 diagonals, 8/2/4/6 cardinals, center
// = Space) mirroring the desktop Numpad shortcuts 1:1, so phones/tablets
// without a physical keyboard can still play. Buttons irrelevant to the
// current dance type (e.g. diagonals in 4k) are hidden once typeDance is known.
function initTouchControls() {
  const touchControls = document.getElementById("touch-controls");
  if (!touchControls) return;

  touchControls.querySelectorAll("[data-code]").forEach(function (btn) {
    const modes = btn.dataset.modes;
    if (modes && modes.split(",").indexOf(typeDance) === -1) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "";
    const code = btn.dataset.code;
    const press = function (e) {
      e.preventDefault();
      btn.classList.add("is-pressed");
      if (isPaused || isCountingDown) return;
      handleGameKeyCode(code);
    };
    const release = function (e) {
      e.preventDefault();
      btn.classList.remove("is-pressed");
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
  });

  const pauseBtn = document.getElementById("touch-pause-btn");
  if (pauseBtn) {
    pauseBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      togglePause();
    });
  }
}

function togglePause() {
  if (isCountingDown || !gameLoopControl.start) {
    return;
  }
  isPaused = !isPaused;
  if (isPaused) {
    audio.pause();
    gameLoopControl.stop();
    show("pause-overlay");
  } else {
    audio.play();
    gameLoopControl.start();
    hide("pause-overlay");
  }
}

function resumeFromPause() {
  if (isPaused) {
    togglePause();
  }
}

// Stops playback/loops and returns to the setup view so the player can pick
// a different song or dance mode (there's no separate home.html - it's all
// one extension tab).
function quitToHome() {
  audio.pause();
  if (gameLoopControl.stop) gameLoopControl.stop();
  hide("pause-overlay");
  document.getElementById("play-view").hidden = true;
  document.getElementById("setup-view").hidden = false;
}

function initVariable() {
  isReverse = false;
  isSpaced = false;
  isBoxHidden = false;
  increase = 1;
  pos = 0;
  count = 0;
  countToIncreaseLevel = 0;
  score = 0;
  level = 6;
  listKeyRandom = [];
  listKeyPress = [];
  comboCount = 0;
  maxCombo = 0;
  judgementCounts = { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
  perfectStreak = 0;
  picElement = document.getElementById("pic");
  scoreElement = document.getElementById("score");
  comboElement = document.getElementById("combo");
  perfectStreakElement = document.getElementById("perfect-streak");
  hide("reverse");
  // A prior playthrough may have ended mid-hide (see hide("box") in
  // setScore()/move()) - force it visible again since this page never
  // reloads between runs the way the original site did.
  show("box");
  resetKeyRandom();
}

// Shows a 3-2-1 countdown before the audio and game loop start, so players
// aren't thrown in mid-motion the instant the run begins.
function startCountdownThenPlay() {
  isCountingDown = true;
  show("countdown-overlay");
  const countdownText = document.getElementById("countdown-text");
  let secondsLeft = COUNTDOWN_SECONDS;
  countdownText.textContent = secondsLeft;

  const countdownInterval = setInterval(function () {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownText.textContent = secondsLeft;
      return;
    }
    if (secondsLeft === 0) {
      countdownText.textContent = "Go!";
      return;
    }
    clearInterval(countdownInterval);
    hide("countdown-overlay");
    isCountingDown = false;
    audio.play().catch(function (error) {
      console.log(
        "Chrome cannot play sound without user interaction first" + error
      );
    });
    gameLoopControl.start();
  }, 700);
}

// Entry point called from game-setup.js once a local file + dance type have
// been picked - replaces the original's URL-param + IndexedDB handoff since
// setup and gameplay now live on the same page/tab.
function startAuditionGame(file, danceType) {
  stopMoveLoop();
  if (typeof stopBeatUpLoops === "function") stopBeatUpLoops();

  currentFile = file;
  currentTypeDance = danceType;

  audio.pause();
  audio = new Audio(URL.createObjectURL(file));
  audio.onended = function () {
    gameLoopControl.stop();
    const result = saveBestScoreIfHigher(typeDance, score);
    showScoreSummary({
      score,
      best: result.best,
      isNewBest: result.isNewBest,
      maxCombo,
      judgementCounts,
      onReplay: function () {
        startAuditionGame(currentFile, currentTypeDance);
      },
      onHome: quitToHome,
    });
  };

  typeDance = danceType;
  bestScore = getBestScore(typeDance);
  const bestScoreElement = document.getElementById("best-score");
  if (bestScoreElement) {
    bestScoreElement.textContent = bestScore;
  }

  if (typeDance !== "4k" && typeDance !== "8k") {
    hide("4k-8k-dance");
    initVariableBeatUp();
    gameLoopControl.start = startBeatUpLoops;
    gameLoopControl.stop = stopBeatUpLoops;
  } else {
    hide("beat-up-dance");
    initVariable();
    gameLoopControl.start = startMoveLoop;
    gameLoopControl.stop = stopMoveLoop;
  }

  document.getElementById("setup-view").hidden = true;
  document.getElementById("play-view").hidden = false;
  show(typeDance === "4k" || typeDance === "8k" ? "4k-8k-dance" : "beat-up-dance");

  initTouchControls();
  startCountdownThenPlay();
}

document.getElementById("btn-pause-resume").addEventListener("click", resumeFromPause);
document.getElementById("btn-pause-quit").addEventListener("click", quitToHome);
