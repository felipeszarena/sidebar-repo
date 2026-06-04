import Lenis from "lenis";

const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
(function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);

const state = {
  rows: [],
  filtered: [],
  currentDayOffset: Number(localStorage.getItem("sidebar.currentDayOffset") || 0),
  read: new Set(JSON.parse(localStorage.getItem("sidebar.read") || "[]")),
  reminderTimer: null
};

const weights = {
  pm: {
    label: "Product Manager",
    preferred: ["PM Core", "Discovery & Research", "AI for Product", "Career & Communication"]
  },
  founder: {
    label: "Founder",
    preferred: ["PM Core", "AI for Product", "Discovery & Research", "Technical Fluency"]
  },
  consultant: {
    label: "Product Consultant",
    preferred: ["Discovery & Research", "Career & Communication", "PM Core", "UX/UI Execution"]
  },
  designer: {
    label: "UX / Product Designer",
    preferred: ["Discovery & Research", "UX/UI Execution", "Career & Communication", "Design Culture"]
  },
  tech: {
    label: "Technical PM",
    preferred: ["AI for Product", "Technical Fluency", "PM Core", "UX/UI Execution"]
  }
};

const seniorityCopy = {
  junior: "prioritize fundamentals, applied knowledge, and well-justified small decisions.",
  mid: "blend strategy, execution, and cross-team influence.",
  senior: "focus on ambiguity, trade-offs, systems thinking, and executive narrative.",
  lead: "use the queue to calibrate direction, decision patterns, and team leverage."
};

const colors = ["#f15b2a", "#d8ff50", "#8fb8ff", "#ff88b7", "#7ee0a1", "#f4f0e7", "#a49f93", "#d4a95f"];

const $ = (id) => document.getElementById(id);

init();

async function init() {
  bindEvents();
  const rows = await loadCsv();
  state.rows = rows;
  render();
}

function bindEvents() {
  ["linksPerDay", "careerPath", "seniority", "cadence", "reminderTime"].forEach((id) => {
    const update = () => {
      savePreferences();
      render();
      scheduleReminder();
    };
    $(id).addEventListener("change", update);
    $(id).addEventListener("input", update);
  });

  $("shuffleDay").addEventListener("click", () => {
    state.currentDayOffset += 1;
    localStorage.setItem("sidebar.currentDayOffset", String(state.currentDayOffset));
    renderToday();
  });

  $("markAllRead").addEventListener("click", () => {
    todayItems().forEach((item) => state.read.add(item.url));
    persistRead();
    renderToday();
  });

  $("enableNotifications").addEventListener("click", enableNotifications);

  restorePreferences();
}

function restorePreferences() {
  const prefs = JSON.parse(localStorage.getItem("sidebar.prefs") || "{}");
  for (const [key, value] of Object.entries(prefs)) {
    if ($(key)) $(key).value = value;
  }
}

function savePreferences() {
  const prefs = {
    linksPerDay: $("linksPerDay").value,
    careerPath: $("careerPath").value,
    seniority: $("seniority").value,
    cadence: $("cadence").value,
    reminderTime: $("reminderTime").value
  };
  localStorage.setItem("sidebar.prefs", JSON.stringify(prefs));
}

async function loadCsv() {
  const response = await fetch("sidebar_reading_queue.csv");
  const csv = await response.text();
  const records = parseCsv(csv);
  const [headers, ...lines] = records;
  return lines.filter((values) => values.length > 1).map((values) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    row.score = Number(row.score || 0);
    row.reading_day = Number(row.reading_day || 0);
    return row;
  });
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function render() {
  if (!state.rows.length) return;
  const linksPerDay = getLinksPerDay();
  const career = $("careerPath").value;
  const seniority = $("seniority").value;
  const plan = weights[career];

  state.filtered = rankedRows(plan.preferred, seniority);
  $("totalLinks").textContent = state.rows.length.toLocaleString("en-US");
  $("totalDays").textContent = Math.ceil(state.filtered.length / linksPerDay).toLocaleString("en-US");
  $("planTitle").textContent = `${plan.label} · ${linksPerDay} links/day`;
  $("planNarrative").textContent = `At your seniority, ${seniorityCopy[seniority]} Queue starts with ${plan.preferred.slice(0, 2).join(" and ")}.`;

  renderTracks(plan.preferred);
  renderStats();
  renderToday();
  renderNotificationCopy();
}

function rankedRows(preferred, seniority) {
  const seniorityBoost = {
    junior: ["Discovery & Research", "PM Core", "Career & Communication"],
    mid: ["PM Core", "UX/UI Execution", "AI for Product"],
    senior: ["PM Core", "AI for Product", "Career & Communication"],
    lead: ["Career & Communication", "PM Core", "AI for Product"]
  };

  return [...state.rows].sort((a, b) => {
    const aScore = adjustedScore(a, preferred, seniorityBoost[seniority]);
    const bScore = adjustedScore(b, preferred, seniorityBoost[seniority]);
    return bScore - aScore;
  });
}

function adjustedScore(row, preferred, boosted) {
  let score = row.score;
  const preferredIndex = preferred.indexOf(row.track);
  const boostedIndex = boosted.indexOf(row.track);
  if (preferredIndex >= 0) score += 24 - preferredIndex * 4;
  if (boostedIndex >= 0) score += 10 - boostedIndex * 2;
  if (row.tier.startsWith("1")) score += 20;
  if (row.tier.startsWith("2")) score += 9;
  if (row.isSponsored === "true") score -= 12;
  return score;
}

function renderTracks(preferred) {
  const counts = countBy(state.filtered, "track");
  const max = Math.max(...Object.values(counts));
  $("trackList").innerHTML = preferred.concat(Object.keys(counts).filter((track) => !preferred.includes(track))).slice(0, 8).map((track, index) => {
    const value = counts[track] || 0;
    const width = Math.max(6, Math.round((value / max) * 100));
    return `
      <div class="track-row">
        <span>${track}</span>
        <strong>${value.toLocaleString("pt-BR")}</strong>
        <div class="bar" style="grid-column: 1 / -1"><span style="--w:${width}%;--c:${colors[index % colors.length]}"></span></div>
      </div>
    `;
  }).join("");
}

function renderStats() {
  const tierCounts = countBy(state.rows, "tier");
  const trackCounts = countBy(state.rows, "track");
  const linksPerDay = getLinksPerDay();
  const firstTier = tierCounts["1 - Ler primeiro"] || 0;
  const secondTier = tierCounts["2 - Proximo trimestre"] || 0;
  $("statsGrid").innerHTML = [
    ["Read first", firstTier, `${Math.ceil(firstTier / linksPerDay)} days`],
    ["Next quarter", secondTier, `${Math.ceil(secondTier / linksPerDay)} days`],
    ["Tracks", Object.keys(trackCounts).length, "study categories"],
    ["Pace", linksPerDay, "links per day"]
  ].map(([label, value, caption]) => `
    <div class="stat">
      <strong>${Number(value).toLocaleString("pt-BR")}</strong>
      <span>${label}</span>
      <p>${caption}</p>
    </div>
  `).join("");
}

function renderToday() {
  const items = todayItems();
  const readCount = items.filter((item) => state.read.has(item.url)).length;
  $("readToday").textContent = `${readCount}/${items.length}`;
  $("todayList").innerHTML = items.map((item) => `
    <article class="link-card">
      <input type="checkbox" ${state.read.has(item.url) ? "checked" : ""} data-url="${escapeHtml(item.url)}" aria-label="Marcar ${escapeHtml(item.title)} como lido">
      <div>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
        <p>${escapeHtml(item.body)}</p>
        <div class="meta">
          <span>${escapeHtml(item.track)}</span>
          <span>${escapeHtml(item.domain)}</span>
          <span>${escapeHtml(item.tier)}</span>
        </div>
      </div>
    </article>
  `).join("");

  $("todayList").querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const url = event.currentTarget.dataset.url;
      if (event.currentTarget.checked) state.read.add(url);
      else state.read.delete(url);
      persistRead();
      renderToday();
    });
  });
}

function todayItems() {
  const linksPerDay = getLinksPerDay();
  const start = state.currentDayOffset * linksPerDay;
  return state.filtered.slice(start, start + linksPerDay);
}

function renderNotificationCopy() {
  const cadence = $("cadence").value;
  const labels = {
    daily: "Daily reminder",
    weekly: "Weekly digest",
    monthly: "Monthly digest",
    off: "Reminders off"
  };
  $("notificationTitle").textContent = `${labels[cadence]} at ${$("reminderTime").value}`;
  $("notificationCopy").textContent = cadence === "off"
    ? "No active reminders. Your queue is saved in the browser."
    : "Browser notifications work while the tab is open. For background delivery, wire the update script to a cron or backend.";
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    $("notificationStatus").textContent = "This browser does not support notifications.";
    return;
  }

  const permission = await Notification.requestPermission();
  $("notificationStatus").textContent = permission === "granted"
    ? "Notifications enabled for this browser session."
    : "Notification permission not granted.";
  scheduleReminder();
}

function scheduleReminder() {
  clearTimeout(state.reminderTimer);
  renderNotificationCopy();
  if ($("cadence").value === "off" || Notification?.permission !== "granted") return;

  const now = new Date();
  const [hour, minute] = $("reminderTime").value.split(":").map(Number);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  state.reminderTimer = setTimeout(() => {
    const items = todayItems();
    new Notification("Your Sidebar reading queue is ready", {
      body: `${items.length} links lined up for today. Start with: ${items[0]?.title || "your queue"}.`
    });
    scheduleReminder();
  }, next - now);
}


function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1;
    return acc;
  }, {});
}

function getLinksPerDay() {
  return Math.min(60, Math.max(1, Number($("linksPerDay").value || 12)));
}

function persistRead() {
  localStorage.setItem("sidebar.read", JSON.stringify([...state.read]));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
