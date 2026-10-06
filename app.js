/**
 * UI layer — parsing inputs, drawing timetable, wiring buttons.
 * Does NOT contain the search algorithm (see scheduler.js).
 */

const COLORS = [
  "#d97706", "#0d9488", "#e11d48", "#2563eb", "#ca8a04",
  "#059669", "#db2777", "#0891b2", "#b45309", "#4f46e5",
];

const DEMO_ROOMS = `CR-101, classroom, 60
CR-102, classroom, 60
SH-1, seminar, 200
SH-2, seminar, 120
LAB-A, lab, 40
LAB-B, lab, 40`;

const DEMO_EQUIP = `projector, 3
mic, 2
laptop, 10
camera, 1`;

const DEMO_EVENTS = `Guest Lecture, 2, 150, seminar, Dept-DS, projector=1;mic=1
Coding Contest, 3, 35, lab, CodeClub, laptop=10
AI Workshop, 2, 40, lab, Dept-DS, laptop=10;projector=1
Tech Quiz, 1, 50, classroom, QuizClub, projector=1
Alumni Talk, 2, 100, seminar, Alumni-Cell, projector=1;mic=1;camera=1
Robotics Demo, 2, 30, lab, RoboClub, laptop=5
Debate, 2, 55, classroom, LitClub, mic=1
Placement Talk, 2, 110, seminar, TnP-Cell, projector=1;mic=1;camera=1
Resume Clinic, 1, 30, classroom, TnP-Cell, laptop=5
Paper Presentation, 2, 45, classroom, Dept-DS, projector=1`;

/* ---------- parsers ---------- */

function lines(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

function parseRooms(text) {
  const rooms = {};
  for (const line of lines(text)) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) throw new Error(`Room line needs 3 parts: "${line}"`);
    const [name, type, capStr] = parts;
    const cap = Number(capStr);
    if (!name || !type || !(cap > 0)) throw new Error(`Bad room: "${line}"`);
    rooms[name] = { type: type.toLowerCase(), cap };
  }
  return rooms;
}

function parseEquip(text) {
  const equip = {};
  for (const line of lines(text)) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) throw new Error(`Equipment line needs 2 parts: "${line}"`);
    const [name, stockStr] = parts;
    const stock = Number(stockStr);
    if (!name || !(stock >= 0)) throw new Error(`Bad equipment: "${line}"`);
    equip[name.toLowerCase()] = stock;
  }
  return equip;
}

function parseEvents(text) {
  const events = {};
  for (const line of lines(text)) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) throw new Error(`Event needs at least 5 parts: "${line}"`);
    const [name, durStr, attStr, rtype, org, needStr = ""] = parts;
    const dur = Number(durStr);
    const att = Number(attStr);
    if (!name || !(dur > 0) || !(att > 0) || !rtype || !org) {
      throw new Error(`Bad event: "${line}"`);
    }
    const need = {};
    if (needStr) {
      for (const pair of needStr.split(";")) {
        const p = pair.trim();
        if (!p) continue;
        const [item, qtyStr] = p.split("=").map((x) => x.trim());
        const qty = Number(qtyStr);
        if (!item || !(qty > 0)) throw new Error(`Bad equipment need in: "${line}"`);
        need[item.toLowerCase()] = qty;
      }
    }
    events[name] = { dur, att, rtype: rtype.toLowerCase(), need, org };
  }
  return events;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- solve + render ---------- */

function showError(msg) {
  const el = document.getElementById("parse-err");
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function readInputs() {
  const rooms = parseRooms(document.getElementById("rooms-in").value);
  const equip = parseEquip(document.getElementById("equip-in").value);
  const events = parseEvents(document.getElementById("events-in").value);
  if (!Object.keys(rooms).length) throw new Error("Add at least one room.");
  if (!Object.keys(events).length) throw new Error("Add at least one event.");
  return { rooms, equip, events };
}

function runSolve(smart) {
  try {
    showError("");
    const { rooms, equip, events } = readInputs();
    const t0 = performance.now();
    const sch = new Scheduler(rooms, equip, events, smart); // from scheduler.js
    const found = sch.solve();
    const ms = performance.now() - t0;
    renderStats(found, sch.nodes, ms, smart);
    renderBoard(rooms, sch, found);
    renderTable(sch, found);
  } catch (e) {
    showError(e.message || String(e));
  }
}

function renderStats(found, nodes, ms, smart) {
  document.getElementById("stats").innerHTML = `
    <span class="chip ${found ? "ok" : "bad"}">${found ? "Feasible" : "No schedule found"}</span>
    <span class="chip">${smart ? "Backtracking + MRV" : "Plain backtracking"}</span>
    <span class="chip">nodes: ${nodes}</span>
    <span class="chip">${ms.toFixed(2)} ms</span>`;
}

function renderBoard(rooms, sch, found) {
  const wrap = document.getElementById("board-wrap");
  const roomNames = Object.keys(rooms);

  if (!found) {
    wrap.innerHTML = `<div class="empty-msg">Could not schedule all events without conflicts</div>`;
    return;
  }

  const byRoom = {};
  for (const [ev, [r, s]] of Object.entries(sch.assign)) {
    (byRoom[r] ??= []).push({ ev, s, dur: sch.events[ev].dur, org: sch.events[ev].org });
  }

  let colorIdx = 0;
  const colorOf = {};
  let bi = 0;

  let html = `<div class="board" style="--cols:${SLOTS}">`;
  html += `<div class="hours"><div class="pad"></div>`;
  for (let s = 0; s < SLOTS; s++) html += `<div class="hour">${fmtHour(s)}</div>`;
  html += `</div>`;

  roomNames.forEach((rName, ri) => {
    const info = rooms[rName];
    html += `<div class="row" style="animation-delay:${ri * 0.05}s">
      <div class="room-label">${escapeHtml(rName)}<small>${escapeHtml(info.type)} · ${info.cap}</small></div>
      <div class="track">`;

    for (const item of byRoom[rName] || []) {
      if (colorOf[item.ev] == null) colorOf[item.ev] = COLORS[colorIdx++ % COLORS.length];
      const start = item.s + 1;
      const end = item.s + item.dur + 1;
      html += `<div class="block" style="grid-column:${start} / ${end};background:${colorOf[item.ev]};animation-delay:${bi * 0.08}s"
        title="${escapeHtml(item.ev)} | ${escapeHtml(rName)} | ${fmtHour(item.s)}-${fmtHour(item.s + item.dur)} | ${escapeHtml(item.org)}">
        ${escapeHtml(item.ev)}
        <span class="sub">${fmtHour(item.s)}–${fmtHour(item.s + item.dur)} · ${escapeHtml(item.org)}</span>
      </div>`;
      bi++;
    }

    html += `</div></div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

function renderTable(sch, found) {
  const wrap = document.getElementById("table-wrap");
  const body = document.getElementById("result-body");
  if (!found) {
    wrap.hidden = true;
    body.innerHTML = "";
    return;
  }
  const rows = Object.entries(sch.assign).sort(
    (a, b) => a[1][0].localeCompare(b[1][0]) || a[1][1] - b[1][1]
  );
  wrap.hidden = false;
  body.innerHTML = rows.map(([ev, [r, s]], i) => {
    const d = sch.events[ev].dur;
    return `<tr style="animation-delay:${0.05 * i}s"><td>${escapeHtml(ev)}</td><td>${escapeHtml(r)}</td><td>${fmtHour(s)}–${fmtHour(s + d)}</td><td>${escapeHtml(sch.events[ev].org)}</td></tr>`;
  }).join("");
}

/* ---------- wire UI ---------- */

document.getElementById("solve-mrv").onclick = () => runSolve(true);
document.getElementById("solve-plain").onclick = () => runSolve(false);
document.getElementById("load-demo").onclick = () => {
  document.getElementById("rooms-in").value = DEMO_ROOMS;
  document.getElementById("equip-in").value = DEMO_EQUIP;
  document.getElementById("events-in").value = DEMO_EVENTS;
  showError("");
  runSolve(true);
};

document.getElementById("rooms-in").value = DEMO_ROOMS;
document.getElementById("equip-in").value = DEMO_EQUIP;
document.getElementById("events-in").value = DEMO_EVENTS;
