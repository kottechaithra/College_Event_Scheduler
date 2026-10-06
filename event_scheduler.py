"""College Event Scheduling using Backtracking (APSH 2026, Project 19).

Assigns every event a (room, start slot) so that there is no
  1. room conflict      - two events in one room at overlapping times
  2. equipment conflict - total demand for an item exceeds stock in any slot
  3. organiser conflict - one faculty/club running two events at once
Rooms must also match the required type and have enough capacity.
"""
import time

SLOTS = 8                       # 09:00-17:00, one slot = 1 hour
START_HOUR = 9

ROOMS = {                       # name: (type, capacity)
    "CR-101": ("classroom", 60), "CR-102": ("classroom", 60),
    "SH-1":   ("seminar",  200), "SH-2":   ("seminar",  120),
    "LAB-A":  ("lab",       40), "LAB-B":  ("lab",       40),
}
EQUIPMENT = {"projector": 3, "mic": 2, "laptop": 10, "camera": 1}

# name: (duration, attendees, room type, equipment needed, organiser)
EVENTS = {
    "Guest Lecture":      (2, 150, "seminar",   {"projector": 1, "mic": 1}, "Dept-DS"),
    "Coding Contest":     (3,  35, "lab",       {"laptop": 10},             "CodeClub"),
    "AI Workshop":        (2,  40, "lab",       {"laptop": 10, "projector": 1}, "Dept-DS"),
    "Tech Quiz":          (1,  50, "classroom", {"projector": 1},           "QuizClub"),
    "Alumni Talk":        (2, 100, "seminar",   {"projector": 1, "mic": 1, "camera": 1}, "Alumni-Cell"),
    "Robotics Demo":      (2,  30, "lab",       {"laptop": 5},              "RoboClub"),
    "Debate":             (2,  55, "classroom", {"mic": 1},                 "LitClub"),
    "Placement Talk":     (2, 110, "seminar",   {"projector": 1, "mic": 1, "camera": 1}, "TnP-Cell"),
    "Resume Clinic":      (1,  30, "classroom", {"laptop": 5},              "TnP-Cell"),
    "Paper Presentation": (2,  45, "classroom", {"projector": 1},           "Dept-DS"),
}

class Scheduler:
    def __init__(self, rooms, equipment, events, smart=True):
        self.rooms, self.equip, self.events, self.smart = rooms, equipment, events, smart
        self.room_busy = {r: [None] * SLOTS for r in rooms}
        self.eq_used = {e: [0] * SLOTS for e in equipment}
        self.org_busy = {}
        self.assign, self.nodes = {}, 0

    def options(self, ev):
        dur, n, rtype, need, org = self.events[ev]
        for r, (t, cap) in self.rooms.items():
            if t != rtype or cap < n:
                continue
            for s in range(SLOTS - dur + 1):
                if self.ok(ev, r, s):
                    yield r, s

    def ok(self, ev, r, s):
        dur, n, rtype, need, org = self.events[ev]
        span = range(s, s + dur)
        if any(self.room_busy[r][t] for t in span):
            return False
        if any(self.eq_used[e][t] + q > self.equip[e] for e, q in need.items() for t in span):
            return False
        busy = self.org_busy.setdefault(org, [False] * SLOTS)
        return not any(busy[t] for t in span)

    def place(self, ev, r, s, on):
        dur, n, rtype, need, org = self.events[ev]
        busy = self.org_busy.setdefault(org, [False] * SLOTS)
        for t in range(s, s + dur):
            self.room_busy[r][t] = ev if on else None
            busy[t] = on
            for e, q in need.items():
                self.eq_used[e][t] += q if on else -q
        if on: self.assign[ev] = (r, s)
        else:  self.assign.pop(ev)

    def solve(self, pending=None):
        pending = list(self.events) if pending is None else pending
        if not pending:
            return True
        self.nodes += 1
        if self.smart:     # MRV: pick the most constrained event; dead end if one has 0 options
            opts = {e: list(self.options(e)) for e in pending}
            ev = min(pending, key=lambda e: len(opts[e]))
            choices = opts[ev]
        else:              # naive: fixed input order, no look-ahead
            ev = pending[0]
            choices = list(self.options(ev))
        rest = [e for e in pending if e != ev]
        for r, s in choices:
            self.place(ev, r, s, True)
            if self.solve(rest):
                return True
            self.place(ev, r, s, False)      # BACKTRACK
        return False

def fmt(h): return f"{START_HOUR + h:02d}:00"

def show(sch):
    print(f"{'Event':20}{'Room':8}{'Time':14}Organiser")
    for ev, (r, s) in sorted(sch.assign.items(), key=lambda x: (x[1][0], x[1][1])):
        d = sch.events[ev][0]
        print(f"{ev:20}{r:8}{fmt(s)}-{fmt(s+d):8}{sch.events[ev][4]}")

def run(rooms, equip, events, smart=True):
    sch = Scheduler(rooms, equip, events, smart)
    t = time.perf_counter()
    found = sch.solve()
    return sch, found, time.perf_counter() - t

if __name__ == "__main__":
    for smart in (True, False):
        sch, found, dt = run(ROOMS, EQUIPMENT, EVENTS, smart)
        print(f"\n== {'Backtracking + MRV' if smart else 'Plain backtracking'} ==")
        print("Feasible:", found, "| nodes:", sch.nodes, f"| time: {dt*1000:.2f} ms")
        if found and smart: show(sch)
