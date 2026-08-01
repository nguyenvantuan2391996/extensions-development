function show(id) {
  document.getElementById(id).style.display = "block";
}

function hide(id) {
  document.getElementById(id).style.display = "none";
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// Splits a raw key-prompt symbol (e.g. "right-reverse", "left-success") into
// its base direction plus reverse/success flags, so rendering never needs an
// image lookup - just a glyph plus a couple of CSS classes.
function parseKeySymbol(raw) {
  let base = raw;
  let isReverseTag = false;
  let isSuccess = false;
  if (base.endsWith("-reverse")) {
    isReverseTag = true;
    base = base.slice(0, -"-reverse".length);
  } else if (base.endsWith("-success")) {
    isSuccess = true;
    base = base.slice(0, -"-success".length);
  }
  return { base, isReverseTag, isSuccess };
}

function setKey(key, id) {
  const el = document.getElementById(id);
  if (!el) return;
  const { base, isReverseTag, isSuccess } = parseKeySymbol(key);
  el.textContent = GLYPH_MAP[base] || "";
  el.classList.toggle("key-slot--reverse", isReverseTag);
  el.classList.toggle("key-slot--success", isSuccess);
  el.classList.toggle("key-slot--empty", !base);
}

// Sets the judgement badge text/color and restarts its pop-in animation,
// even if the same judgement was already showing.
const JUDGEMENT_LABELS = {
  Ready: "Ready",
  Perfect: "Perfect!",
  Great: "Great!",
  Cool: "Cool!",
  Bad: "Bad!",
  Miss: "Miss!",
};

function showJudgement(badgeElement, judgement) {
  badgeElement.textContent = JUDGEMENT_LABELS[judgement] || judgement;
  badgeElement.className = "judgement-badge judgement-badge--" + judgement.toLowerCase();
  void badgeElement.offsetWidth;
  badgeElement.classList.add(judgement === "Perfect" ? "judgement-pop--perfect" : "judgement-pop");
}

function getBestScore(danceType) {
  return Number(localStorage.getItem(BEST_SCORE_PREFIX + danceType)) || 0;
}

function saveBestScoreIfHigher(danceType, finalScore) {
  const best = getBestScore(danceType);
  if (finalScore > best) {
    localStorage.setItem(BEST_SCORE_PREFIX + danceType, String(finalScore));
    return { isNewBest: true, best: finalScore };
  }
  return { isNewBest: false, best };
}

// Lightweight modal styled to match the game's own overlay system.
function showModal({ icon, title, html, confirmText = "OK", onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.display = "block";
  overlay.innerHTML =
    '<div class="overlay__inner">' +
    '<div class="modal-panel">' +
    (icon ? '<div class="modal-icon modal-icon--' + icon + '"></div>' : "") +
    '<p class="modal-title">' + title + "</p>" +
    (html ? '<div class="modal-body">' + html + "</div>" : "") +
    '<div class="modal-actions">' +
    '<button type="button" class="overlay-btn modal-confirm-btn">' + confirmText + "</button>" +
    "</div></div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-confirm-btn").addEventListener("click", function () {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
}

function AlertError(msg) {
  showModal({ icon: "error", title: "Oops...", html: msg });
}

// Rough letter-grade derived from the judgement breakdown, purely cosmetic.
function computeRank(counts) {
  const total =
    counts.perfect + counts.great + counts.cool + counts.bad + counts.miss;
  if (total === 0) return { letter: "-", className: "rank-c" };

  const weighted =
    (counts.perfect * 1 + counts.great * 0.8 + counts.cool * 0.55 + counts.bad * 0.25) /
    total;
  const missRatio = counts.miss / total;

  if (weighted >= 0.92 && missRatio === 0) return { letter: "S", className: "rank-s" };
  if (weighted >= 0.75 && missRatio < 0.08) return { letter: "A", className: "rank-a" };
  if (weighted >= 0.5) return { letter: "B", className: "rank-b" };
  if (weighted >= 0.25) return { letter: "C", className: "rank-c" };
  return { letter: "D", className: "rank-d" };
}

// End-of-song results screen: score, best score, best combo and a
// Perfect/Great/Cool/Bad/Miss breakdown with relative bars.
function showScoreSummary({ score, best, isNewBest, maxCombo, judgementCounts, onReplay, onHome }) {
  const counts = judgementCounts || { perfect: 0, great: 0, cool: 0, bad: 0, miss: 0 };
  const rank = computeRank(counts);
  const maxCount = Math.max(counts.perfect, counts.great, counts.cool, counts.bad, counts.miss, 1);

  const rows = [
    { key: "perfect", label: "Perfect" },
    { key: "great", label: "Great" },
    { key: "cool", label: "Cool" },
    { key: "bad", label: "Bad" },
    { key: "miss", label: "Miss" },
  ];

  const breakdownHtml = rows
    .map((row) => {
      const count = counts[row.key] || 0;
      const widthPct = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
      return (
        '<div class="judgement-row judgement-row--' + row.key + '">' +
        '<span class="judgement-row__label">' + row.label + "</span>" +
        '<span class="judgement-row__bar"><span style="width:' + widthPct + '%"></span></span>' +
        '<span class="judgement-row__count">' + count + "</span>" +
        "</div>"
      );
    })
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.display = "block";
  overlay.innerHTML =
    '<div class="overlay__inner">' +
    '<div class="modal-panel summary-panel">' +
    '<div class="summary-rank ' + rank.className + '">' + rank.letter + "</div>" +
    '<div class="modal-icon modal-icon--' + (isNewBest ? "trophy" : "success") + '"></div>' +
    '<p class="modal-title">' + (isNewBest ? "New record!" : "Song complete!") + "</p>" +
    '<div class="summary-score">' +
    '<span class="summary-score__value">' + score + "</span>" +
    '<span class="summary-score__label">points</span>' +
    "</div>" +
    '<div class="summary-stats">' +
    '<div class="stat-chip"><span class="stat-chip__label">Best</span><span class="stat-chip__value">' + best + "</span></div>" +
    '<div class="stat-chip"><span class="stat-chip__label">Best combo</span><span class="stat-chip__value">' + (maxCombo || 0) + "x</span></div>" +
    "</div>" +
    '<div class="judgement-breakdown">' + breakdownHtml + "</div>" +
    '<div class="modal-actions">' +
    '<button type="button" class="overlay-btn summary-replay-btn">Play again</button>' +
    '<button type="button" class="overlay-btn overlay-btn--ghost summary-home-btn">Change song / mode</button>' +
    "</div>" +
    "</div></div>";
  document.body.appendChild(overlay);

  overlay.querySelector(".summary-replay-btn").addEventListener("click", function () {
    overlay.remove();
    if (onReplay) onReplay();
  });
  overlay.querySelector(".summary-home-btn").addEventListener("click", function () {
    overlay.remove();
    if (onHome) onHome();
  });
}
