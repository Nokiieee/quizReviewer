const STORAGE_KEY = "quiz_items_v2";

let allItems = [];
let remaining = [];
let currentItem = null;
let total = 0;
let quizStarted = false;

function load() {
  try {
    allItems = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    allItems = [];
  }
  updateBadge();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allItems));
}

function updateBadge() {
  const n = allItems.length;
  document.getElementById("count-badge").textContent =
    n + (n === 1 ? " item" : " items");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function insert() {
  const val = document.getElementById("input").value.trim();
  if (!val) {
    showToast("Nothing to add");
    return;
  }
  const parts = val
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  allItems.push(...parts);
  save();
  updateBadge();
  document.getElementById("input").value = "";
  showToast(
    "Added " + parts.length + (parts.length === 1 ? " item" : " items"),
  );
}

function startQuiz() {
  if (allItems.length === 0) {
    showToast("Add some items first!");
    return;
  }
  remaining = [...allItems].sort(() => Math.random() - 0.5);
  total = remaining.length;
  quizStarted = true;
  document.getElementById("start-btn").style.display = "none";
  document.getElementById("flip-btn").style.display = "";
  document.getElementById("next-btn").style.display = "";
  document.getElementById("progress-wrap").style.display = "";
  updateProgress();
  showNext();
}

function updateProgress() {
  const done = total - remaining.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("prog-label").textContent =
    remaining.length + " remaining";
  document.getElementById("prog-pct").textContent = pct + "%";
  document.getElementById("prog-fill").style.width = pct + "%";
}

function parseItem(raw) {
  if (raw.includes("::")) {
    const [q, ...aParts] = raw.split("::");
    return {
      question: q.trim(),
      answer: aParts.join("::").trim(),
      hasPair: true,
    };
  }
  return { question: raw, answer: null, hasPair: false };
}

function showNext() {
  if (remaining.length === 0) {
    showDone();
    return;
  }
  const idx = Math.floor(Math.random() * remaining.length);
  currentItem = parseItem(remaining[idx]);
  remaining.splice(idx, 1);
  updateProgress();
  renderCard(currentItem);
  document.getElementById("flip-btn").style.display = currentItem.hasPair
    ? ""
    : "none";
}

function renderCard(item) {
  const area = document.getElementById("card-area");
  if (item.hasPair) {
    area.innerHTML = `
            <div class="flip-scene" onclick="flipCard()">
                <div class="flip-card" id="flip-card">
                    <div class="card-face front">
                        <div class="card-label">DEFINITION</div>
                        <div class="card-text">${esc(item.answer)}</div>
                        <div class="card-tip">Click to reveal term</div>
                    </div>
                    <div class="card-face back">
                        <div class="card-label">Term</div>
                        <div class="card-text">${esc(item.question)}</div>
                        <div class="card-tip">Press Next for another</div>
                    </div>
                </div>
            </div>`;
  } else {
    area.innerHTML = `
            <div class="plain-card">
                <div class="card-label">Item</div>
                <div class="card-text">${esc(item.question)}</div>
            </div>`;
  }
}

function flipCard() {
  const fc = document.getElementById("flip-card");
  if (fc) fc.classList.toggle("flipped");
}

function nextCard() {
  if (!quizStarted) {
    showToast("Press Start first");
    return;
  }
  showNext();
}

function showDone() {
  document.getElementById("card-area").innerHTML = `
        <div class="done-card">
            <div class="done-check">✓</div>
            <div class="done-title">All done!</div>
            <div class="done-sub">You reviewed all ${total} item${total === 1 ? "" : "s"}. Want another go? Press Start Again.</div>
        </div>`;
  document.getElementById("flip-btn").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
  const startBtn = document.getElementById("start-btn");
  startBtn.textContent = "Start Again";
  startBtn.style.display = "";
  quizStarted = false;
}

function confirmReset() {
  if (confirm("Clear all items and reset?")) {
    localStorage.removeItem(STORAGE_KEY);
    allItems = [];
    remaining = [];
    total = 0;
    quizStarted = false;
    updateBadge();
    document.getElementById("card-area").innerHTML =
      '<div class="empty-card">Add items above, then press <strong>Start</strong></div>';
    document.getElementById("progress-wrap").style.display = "none";
    document.getElementById("flip-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    const startBtn = document.getElementById("start-btn");
    startBtn.textContent = "Start";
    startBtn.style.display = "";
    showToast("Reset!");
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

document.getElementById("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") insert();
});

document.addEventListener("keydown", (e) => {
  if (document.activeElement === document.getElementById("input")) return;
  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  }
  if (e.code === "ArrowRight") nextCard();
});

load();
