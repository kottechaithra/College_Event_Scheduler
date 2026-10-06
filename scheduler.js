/**
 * College Event Scheduling — Backtracking core
 * Port of event_scheduler.py (APSH 2026, Project 19)
 *
 * Goal: assign every event a (room, start_slot) with no conflicts:
 *   1. Room      — one event per room at a time
 *   2. Equipment — demand never exceeds stock in any hour
 *   3. Organiser — one person/club cannot run two events at once
 * Rooms must also match required type and capacity.
 *
 * Algorithm:
 *   try → place → recurse → if fail, undo (BACKTRACK) → try next choice
 * Optional MRV heuristic: always schedule the event with fewest options first.
 */

const SLOTS = 8;        // 09:00–17:00, 1 hour each
const START_HOUR = 9;

class Scheduler {
  constructor(rooms, equip, events, smart = true) {
    this.rooms = rooms;     // { name: { type, cap } }
    this.equip = equip;     // { item: stock }
    this.events = events;   // { name: { dur, att, rtype, need, org } }
    this.smart = smart;     // true = MRV, false = plain order

    // State that changes while searching
    this.roomBusy = Object.fromEntries(
      Object.keys(rooms).map((r) => [r, Array(SLOTS).fill(null)])
    );
    this.eqUsed = Object.fromEntries(
      Object.keys(equip).map((e) => [e, Array(SLOTS).fill(0)])
    );
    this.orgBusy = {};      // { organiser: [bool × SLOTS] }
    this.assign = {};       // result: { event: [room, startSlot] }
    this.nodes = 0;         // how many recursive calls (search effort)
  }

  /** All legal (room, start) pairs for one event given current state. */
  *options(ev) {
    const { dur, att, rtype } = this.events[ev];
    for (const [r, info] of Object.entries(this.rooms)) {
      if (info.type !== rtype || info.cap < att) continue;
      for (let s = 0; s <= SLOTS - dur; s++) {
        if (this.ok(ev, r, s)) yield [r, s];
      }
    }
  }

  /** Constraint check for placing event in room r starting at slot s. */
  ok(ev, r, s) {
    const { dur, need, org } = this.events[ev];
    if (!this.orgBusy[org]) this.orgBusy[org] = Array(SLOTS).fill(false);

    for (let t = s; t < s + dur; t++) {
      // 1) room free?
      if (this.roomBusy[r][t]) return false;
      // 2) organiser free?
      if (this.orgBusy[org][t]) return false;
      // 3) enough equipment?
      for (const [e, q] of Object.entries(need)) {
        if ((this.eqUsed[e]?.[t] ?? 0) + q > (this.equip[e] ?? 0)) return false;
      }
    }
    return true;
  }

  /** Apply or undo an assignment (on=true place, on=false BACKTRACK undo). */
  place(ev, r, s, on) {
    const { dur, need, org } = this.events[ev];
    if (!this.orgBusy[org]) this.orgBusy[org] = Array(SLOTS).fill(false);

    for (let t = s; t < s + dur; t++) {
      this.roomBusy[r][t] = on ? ev : null;
      this.orgBusy[org][t] = on;
      for (const [e, q] of Object.entries(need)) {
        if (!this.eqUsed[e]) this.eqUsed[e] = Array(SLOTS).fill(0);
        this.eqUsed[e][t] += on ? q : -q;
      }
    }

    if (on) this.assign[ev] = [r, s];
    else delete this.assign[ev];
  }

  /**
   * Recursive backtracking search.
   * Returns true if all pending events are scheduled.
   */
  solve(pending = null) {
    pending = pending ?? Object.keys(this.events);

    // Base case: nothing left → full schedule found
    if (!pending.length) return true;
    this.nodes++;

    let ev, choices;
    if (this.smart) {
      // MRV = Minimum Remaining Values: pick hardest event first
      const opts = Object.fromEntries(
        pending.map((e) => [e, [...this.options(e)]])
      );
      ev = pending.reduce((a, b) =>
        opts[a].length <= opts[b].length ? a : b
      );
      choices = opts[ev];
    } else {
      // Plain: take events in input order
      ev = pending[0];
      choices = [...this.options(ev)];
    }

    const rest = pending.filter((e) => e !== ev);

    // Try each candidate; undo and try next on failure  ← THIS IS BACKTRACKING
    for (const [r, s] of choices) {
      this.place(ev, r, s, true);       // TRY
      if (this.solve(rest)) return true; // recurse
      this.place(ev, r, s, false);      // BACKTRACK (undo)
    }
    return false; // no choice worked → fail this branch
  }
}

function fmtHour(h) {
  return String(START_HOUR + h).padStart(2, "0") + ":00";
}
