# College Event Scheduler

A college event scheduling application that assigns events to suitable rooms and time slots while checking resource and availability constraints.

## Overview

Planning several college events at once can lead to room, equipment, and organiser clashes. This project uses a backtracking algorithm to find a schedule that fits the available rooms, equipment, and time slots.

The browser application lets users enter room, equipment, and event details, then displays the resulting timetable. It also offers two solver modes: backtracking with the Minimum Remaining Values (MRV) heuristic, and plain backtracking.

## Features

- Enter rooms, equipment stock, and event requirements.
- Check room type and capacity before assigning an event.
- Avoid room, equipment, and organiser conflicts.
- View a generated timetable and a schedule table.
- Compare MRV backtracking with plain backtracking.
- View solver status, search nodes, and elapsed time.
- Load sample data to try the application.

## How the scheduler works

The scheduler tries a room and time slot for each event. If that choice prevents the remaining events from being scheduled, it undoes the choice and tries another one. This is backtracking.

In MRV mode, the scheduler prioritizes the event with the fewest currently valid placement options. This can help it find conflicts earlier than plain backtracking.

## Constraints checked

- **Room availability:** a room cannot host overlapping events.
- **Room suitability:** the room must match the event's required type and attendee capacity.
- **Equipment availability:** equipment demand cannot exceed the available stock during an event.
- **Organiser availability:** an organiser cannot run overlapping events.

## Technologies

- HTML and CSS
- JavaScript
- Python (separate command-line implementation)

## Run the browser application

1. Download or clone this repository.
2. Open `index.html` in a web browser.
3. Click **Load Demo** to populate the sample rooms, equipment, and events and generate a schedule.
4. Use **Solve (MRV)** or **Plain backtracking** to compare the solver modes.

No build step is required for the browser application.

## Run the Python implementation

If Python is installed, open a terminal in the project folder and run:

```bash
python event_scheduler.py
```

On some Windows installations, use `py` instead:

```bash
py event_scheduler.py
```

## Input formats

Each non-comment line describes one room, equipment item, or event. For example:

**Room**
```text
CR-101, classroom, 60
```

**Equipment**
```text
projector, 3
```

**Event**
```text
Guest Lecture, 2, 150, seminar, Dept-DS, projector=1;mic=1
```

The event fields are: name, duration in hours, attendee count, required room type, organiser, and optional equipment requirements.

## Example output

The application displays whether a schedule was found, the solver mode, search-node count, elapsed time, a room-by-time timetable, and a results table listing each event's room, time, and organiser.

## Screenshots

<img width="1502" height="675" alt="Screenshot 2026-10-06 210433" src="https://github.com/user-attachments/assets/5fecba32-9457-4017-9456-f4320359477b" />
<img width="1381" height="772" alt="image" src="https://github.com/user-attachments/assets/d6ab859f-1a0b-4c0d-87f5-9456dab5cdb5" />




### Generated schedule

<img width="1392" height="561" alt="image" src="https://github.com/user-attachments/assets/ac2f48d5-aea9-4d5d-8cf3-773e0af2d023" />




## Future scope

- Allow users to set the available day, opening hours, and slot length.
- Support events with more flexible durations and start times.
- Save and load room, equipment, and event data.
- Export the generated timetable to CSV or PDF.
- Add a database and user accounts for persistent, multi-user scheduling.
- Improve the interface for printing and mobile use.
- Add more scheduling strategies and compare their performance on larger datasets.

## Project files

- `index.html` — browser interface and styling.
- `app.js` — input parsing, validation, and display of results.
- `scheduler.js` — JavaScript backtracking solver.
- `event_scheduler.py` — Python command-line implementation.
- `PROJECT_EXPLANATION.txt` — additional project explanation.
