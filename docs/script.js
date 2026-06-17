// ── Storage keys ──────────────────────────────────────────────
const SETS_KEY = "qr_sets_v1"; // { id, name, items[] }[]
const ACTIVE_KEY = "qr_active_set_v1"; // active set id

// ── State ─────────────────────────────────────────────────────
let sets = [];
let activeSetId = null;

let remaining = [];
let skipped = [];
let skippedQueue = []; // copy used during skip-review mode
let currentItem = null;
let total = 0;
let quizStarted = false;
let reviewingSkipped = false;

// ── Persistence ───────────────────────────────────────────────
function loadSets() {
  try {
    sets = JSON.parse(localStorage.getItem(SETS_KEY)) || [];
  } catch {
    sets = [];
  }
  try {
    activeSetId = localStorage.getItem(ACTIVE_KEY);
  } catch {
    activeSetId = null;
  }
  if (sets.length === 0) {
    const defaultSet = { id: uid(), name: "General", items: [] };
    sets.push(defaultSet);
    activeSetId = defaultSet.id;
  }
  if (!sets.find((s) => s.id === activeSetId)) activeSetId = sets[0].id;
  saveSets();
}

function saveSets() {
  localStorage.setItem(SETS_KEY, JSON.stringify(sets));
  localStorage.setItem(ACTIVE_KEY, activeSetId);
}

function getActive() {
  return sets.find((s) => s.id === activeSetId) || sets[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Sets panel ────────────────────────────────────────────────
function openSetsPanel() {
  renderSetsList();
  document.getElementById("sets-panel").classList.add("open");
  document.getElementById("sets-overlay").classList.add("visible");
}

function closeSetsPanel() {
  document.getElementById("sets-panel").classList.remove("open");
  document.getElementById("sets-overlay").classList.remove("visible");
}

function renderSetsList() {
  const list = document.getElementById("sets-list");
  list.innerHTML = sets
    .map(
      (s) => `
    <div class="set-item ${s.id === activeSetId ? "active" : ""}" onclick="switchSet('${s.id}')">
      <div class="set-item-info">
        <div class="set-item-name">${esc(s.name)}</div>
        <div class="set-item-count">${s.items.length} item${s.items.length !== 1 ? "s" : ""}</div>
      </div>
      <button class="set-item-delete" onclick="deleteSet(event,'${s.id}')" title="Delete set">✕</button>
    </div>
  `,
    )
    .join("");
}

function switchSet(id) {
  if (id === activeSetId) {
    closeSetsPanel();
    return;
  }
  activeSetId = id;
  saveSets();
  resetQuizState();
  updateUI();
  closeSetsPanel();
  showToast('Switched to "' + getActive().name + '"');
}

function createSet() {
  const input = document.getElementById("new-set-input");
  const name = input.value.trim();
  if (!name) {
    showToast("Enter a name");
    return;
  }
  const newSet = { id: uid(), name, items: [] };
  sets.push(newSet);
  activeSetId = newSet.id;
  saveSets();
  input.value = "";
  renderSetsList();
  resetQuizState();
  updateUI();
  showToast('Created "' + name + '"');
}

function deleteSet(e, id) {
  e.stopPropagation();
  const target = sets.find((s) => s.id === id);
  if (!target) return;
  if (sets.length === 1) {
    showToast("Can't delete the last set");
    return;
  }
  if (!confirm(`Delete "${target.name}" and all its items?`)) return;
  sets = sets.filter((s) => s.id !== id);
  if (activeSetId === id) activeSetId = sets[0].id;
  saveSets();
  renderSetsList();
  resetQuizState();
  updateUI();
  showToast("Deleted");
}

// ── Items ──────────────────────────────────────────────────────
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
  const set = getActive();
  set.items.push(...parts);
  saveSets();
  updateBadge();
  document.getElementById("input").value = "";
  showToast(
    "Added " + parts.length + (parts.length === 1 ? " item" : " items"),
  );
}

// ── Quiz ───────────────────────────────────────────────────────
function startQuiz() {
  const set = getActive();
  if (set.items.length === 0) {
    showToast("Add some items first!");
    return;
  }
  remaining = [...set.items].sort(() => Math.random() - 0.5);
  skipped = [];
  skippedQueue = [];
  total = remaining.length;
  quizStarted = true;
  reviewingSkipped = false;
  show("start-btn", false);
  show("flip-btn", false);
  show("next-btn", true);
  show("skip-btn", true);
  show("progress-wrap", true);
  updateProgress();
  updateSkippedBanner();
  showNext();
}

function showNext() {
  if (remaining.length === 0) {
    if (skipped.length > 0) {
      showMainDone();
    } else {
      showAllDone();
    }
    return;
  }
  const idx = Math.floor(Math.random() * remaining.length);
  currentItem = parseItem(remaining[idx]);
  remaining.splice(idx, 1);
  updateProgress();
  renderCard(currentItem, false);
  show("flip-btn", currentItem.hasPair);
  show("skip-btn", true);
}

function nextCard() {
  if (!quizStarted) {
    showToast("Press Start first");
    return;
  }
  if (reviewingSkipped) {
    showNextSkipped();
  } else {
    showNext();
  }
}

function skipCard() {
  if (!currentItem) return;
  // Put the raw string back
  const raw = currentItem.hasPair
    ? currentItem.question + "::" + currentItem.answer
    : currentItem.question;
  skipped.push(raw);
  updateSkippedBanner();
  showToast("Skipped — you'll see it again");
  if (reviewingSkipped) {
    showNextSkipped();
  } else {
    showNext();
  }
}

function flipCard() {
  const fc = document.getElementById("flip-card");
  if (fc) fc.classList.toggle("flipped");
}

// ── Skip review ───────────────────────────────────────────────
function reviewSkipped() {
  if (skipped.length === 0) {
    showToast("No skipped items");
    return;
  }
  skippedQueue = [...skipped].sort(() => Math.random() - 0.5);
  skipped = [];
  total = skippedQueue.length;
  remaining = [];
  reviewingSkipped = true;
  quizStarted = true;
  show("start-btn", false);
  show("next-btn", true);
  show("skip-btn", true);
  show("progress-wrap", true);
  updateProgress();
  updateSkippedBanner();
  showNextSkipped();
  showToast(
    "Reviewing " +
      skippedQueue.length +
      " skipped item" +
      (skippedQueue.length !== 1 ? "s" : ""),
  );
}

function showNextSkipped() {
  if (skippedQueue.length === 0) {
    if (skipped.length > 0) {
      showSkippedRound();
    } else {
      showAllDone();
    }
    return;
  }
  const idx = Math.floor(Math.random() * skippedQueue.length);
  currentItem = parseItem(skippedQueue[idx]);
  skippedQueue.splice(idx, 1);
  updateProgress();
  renderCard(currentItem, true);
  show("flip-btn", currentItem.hasPair);
}

function showSkippedRound() {
  // After a round of skip-review, some were skipped again
  document.getElementById("card-area").innerHTML = `
    <div class="done-card">
      <div class="done-check">↺</div>
      <div class="done-title">Round complete</div>
      <div class="done-sub">
        You still have <strong>${skipped.length}</strong> skipped item${skipped.length !== 1 ? "s" : ""}.
      </div>
      <div class="done-skipped-cta">
        <button onclick="reviewSkipped()">Review again</button>
        <button class="btn-danger" onclick="clearSkippedAndEnd()">Dismiss</button>
      </div>
    </div>`;
  show("flip-btn", false);
  show("next-btn", false);
  show("skip-btn", false);
  updateSkippedBanner();
}

function clearSkippedAndEnd() {
  skipped = [];
  updateSkippedBanner();
  showAllDone();
}

// ── End states ────────────────────────────────────────────────
function showMainDone() {
  document.getElementById("card-area").innerHTML = `
    <div class="done-card">
      <div class="done-check">✓</div>
      <div class="done-title">Main set done!</div>
      <div class="done-sub">
        You have <strong>${skipped.length}</strong> skipped item${skipped.length !== 1 ? "s" : ""} to go.<br>
        Ready to tackle them?
      </div>
      <div class="done-skipped-cta">
        <button onclick="reviewSkipped()">Review skipped</button>
        <button class="btn-danger" onclick="clearSkippedAndEnd()">Skip for now</button>
      </div>
    </div>`;
  show("flip-btn", false);
  show("next-btn", false);
  show("skip-btn", false);
}

function showAllDone() {
  const set = getActive();
  document.getElementById("card-area").innerHTML = `
    <div class="done-card">
      <div class="done-check">✓</div>
      <div class="done-title">All done!</div>
      <div class="done-sub">You reviewed all ${set.items.length} item${set.items.length !== 1 ? "s" : ""}. Want another go? Press Start Again.</div>
    </div>`;
  show("flip-btn", false);
  show("next-btn", false);
  show("skip-btn", false);
  const startBtn = document.getElementById("start-btn");
  startBtn.textContent = "Start Again";
  show("start-btn", true);
  quizStarted = false;
  reviewingSkipped = false;
  skipped = [];
  updateSkippedBanner();
}

// ── Rendering ─────────────────────────────────────────────────
function renderCard(item, isSkipReview) {
  const area = document.getElementById("card-area");
  const skipTag = isSkipReview ? `<div class="skipped-tag">Skipped</div>` : "";
  if (item.hasPair) {
    area.innerHTML = `
      <div class="flip-scene" onclick="flipCard()">
        <div class="flip-card" id="flip-card">
          <div class="card-face front ${isSkipReview ? "is-skipped" : ""}">
            ${skipTag}
            <div class="card-label">Definition</div>
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
      <div class="plain-card ${isSkipReview ? "is-skipped" : ""}">
        ${skipTag}
        <div class="card-label">Item</div>
        <div class="card-text">${esc(item.question)}</div>
      </div>`;
  }
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

// ── UI helpers ────────────────────────────────────────────────
function show(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? "" : "none";
}

function updateBadge() {
  const n = getActive().items.length;
  document.getElementById("count-badge").textContent =
    n + (n === 1 ? " item" : " items");
}

function updateProgress() {
  const inFlight = reviewingSkipped ? skippedQueue.length : remaining.length;
  const done = total - inFlight;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("prog-label").textContent = inFlight + " remaining";
  document.getElementById("prog-pct").textContent = pct + "%";
  document.getElementById("prog-fill").style.width = pct + "%";
}

function updateSkippedBanner() {
  const banner = document.getElementById("skipped-banner");
  const label = document.getElementById("skipped-count-label");
  if (skipped.length > 0 && quizStarted && !reviewingSkipped) {
    label.textContent =
      skipped.length + " skipped item" + (skipped.length !== 1 ? "s" : "");
    banner.style.display = "";
  } else {
    banner.style.display = "none";
  }
}

function updateSetNameLabel() {
  const s = getActive();
  document.getElementById("set-name-label").textContent = s.name;
}

function updateUI() {
  updateBadge();
  updateSetNameLabel();
  show("progress-wrap", false);
  show("flip-btn", false);
  show("next-btn", false);
  show("skip-btn", false);
  const startBtn = document.getElementById("start-btn");
  startBtn.textContent = "Start";
  show("start-btn", true);
  document.getElementById("card-area").innerHTML =
    '<div class="empty-card">Add items above, then press <strong>Start</strong></div>';
  updateSkippedBanner();
}

function resetQuizState() {
  remaining = [];
  skipped = [];
  skippedQueue = [];
  currentItem = null;
  total = 0;
  quizStarted = false;
  reviewingSkipped = false;
}

function confirmReset() {
  const set = getActive();
  if (!confirm(`Clear all items in "${set.name}" and reset?`)) return;
  set.items = [];
  saveSets();
  resetQuizState();
  updateUI();
  showToast("Reset!");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Keyboard shortcuts ────────────────────────────────────────
document.getElementById("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") insert();
});

document.getElementById("new-set-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") createSet();
});

document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  const isTyping = active.tagName === "INPUT" || active.tagName === "TEXTAREA";
  if (isTyping) return;
  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  }
  if (e.code === "ArrowRight") nextCard();
  if (e.code === "KeyS") skipCard();
});

// ── Init ──────────────────────────────────────────────────────
loadSets();
updateUI();
