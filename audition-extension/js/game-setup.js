const danceCards = document.querySelectorAll(".dance-card");
const btnLetsGo = document.getElementById("btn-lets-go");
const btnPickLocalFiles = document.getElementById("btn-pick-local-files");
const localFilesInput = document.getElementById("local-files-input");
const localFilesStatus = document.getElementById("local-files-status");
const localGrid = document.getElementById("song-grid-local");

let selectedFile = null;
let selectedDanceType = "";
let previewAudio = new Audio();
let previewingCard = null;
let previewObjectUrl = null;

function updateLetsGoState() {
  const ready = selectedFile !== null && selectedDanceType !== "";
  btnLetsGo.classList.toggle("is-ready", ready);
}

function renderBestScores() {
  danceCards.forEach((card) => {
    const best = getBestScore(card.dataset.value);
    card.querySelector(".dance-card__best").textContent = "Best: " + best;
  });
}

danceCards.forEach((card) => {
  card.addEventListener("click", () => {
    danceCards.forEach((c) => c.classList.remove("is-selected"));
    card.classList.add("is-selected");
    selectedDanceType = card.dataset.value;
    updateLetsGoState();
  });
});

function togglePreview(card, file) {
  if (previewingCard === card) {
    previewAudio.pause();
    previewingCard = null;
    card.querySelector(".preview-btn").textContent = "▶";
    return;
  }

  document.querySelectorAll(".preview-btn").forEach((btn) => {
    btn.textContent = "▶";
  });

  previewAudio.pause();
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  previewObjectUrl = URL.createObjectURL(file);
  previewAudio = new Audio(previewObjectUrl);
  previewAudio.play().catch(() => {});
  previewingCard = card;
  card.querySelector(".preview-btn").textContent = "⏸";
  previewAudio.onended = () => {
    card.querySelector(".preview-btn").textContent = "▶";
    previewingCard = null;
  };
}

function selectSongCard(card, file) {
  document.querySelectorAll(".song-card").forEach((c) => c.classList.remove("is-selected"));
  card.classList.add("is-selected");
  selectedFile = file;
  updateLetsGoState();
}

function buildLocalSongCard(file) {
  const card = document.createElement("div");
  card.className = "song-card";

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "preview-btn";
  previewBtn.title = "Preview";
  previewBtn.textContent = "▶";
  previewBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePreview(card, file);
  });

  const text = document.createElement("div");
  text.className = "song-card__text";
  const titleEl = document.createElement("div");
  titleEl.className = "song-card__title";
  titleEl.textContent = file.name.replace(/\.[^.]+$/, "");
  const artistEl = document.createElement("div");
  artistEl.className = "song-card__artist";
  artistEl.textContent = "From your computer";
  text.append(titleEl, artistEl);

  const badge = document.createElement("span");
  badge.className = "song-card__badge";
  badge.textContent = "Local";

  card.append(previewBtn, text, badge);
  card.addEventListener("click", () => selectSongCard(card, file));
  return card;
}

function renderLocalFiles(files) {
  localGrid.innerHTML = "";
  if (files.length === 0) {
    localFilesStatus.textContent = "No music files selected";
    return;
  }
  files.forEach((file) => localGrid.appendChild(buildLocalSongCard(file)));
  localFilesStatus.textContent = files.length + " music file(s)";
}

btnPickLocalFiles.addEventListener("click", () => localFilesInput.click());
localFilesInput.addEventListener("change", () => {
  const files = Array.from(localFilesInput.files).filter((file) => file.type.startsWith("audio/"));
  renderLocalFiles(files);
});

btnLetsGo.addEventListener("click", () => {
  if (!selectedFile || !selectedDanceType) {
    AlertError("Please pick a song and a dance mode");
    return;
  }
  previewAudio.pause();
  startAuditionGame(selectedFile, selectedDanceType);
});

renderBestScores();
