# 🐦 Flappy Friend

A browser-based Flappy Bird game where you fly your friend's photo through pipes.
Three themes (OG, Desert, Mountain), each with unique animations, death sequences,
and a win celebration. Score 15 to win!

---

## Play the Game

Open `index.html` in any browser. No server or build step required.

- **Click / Spacebar** — flap
- **Upload a photo** — your friend's face becomes the bird
- **Choose a theme** — OG 🌿 · Desert 🏜️ · Mountain 🏔️

---

## Automated Tests

Tests run in **Microsoft Edge headless** via PowerShell and the Chrome DevTools
Protocol. No npm, Node.js, Python, or any installation is needed — Edge is
already on your machine.

### Run once

```powershell
cd "C:\Users\akmambet.ali\Documents\Vibe Coding\Flappy Birds"
powershell -ExecutionPolicy Bypass -File tests\Run-Tests.ps1
```

### Watch mode (re-runs on every `.js` or `.html` save)

```powershell
powershell -ExecutionPolicy Bypass -File tests\Watch-Tests.ps1
```

### Auto-run on project open (VS Code)

VS Code will prompt **"Allow automatic tasks to run?"** the first time you open
the workspace. Click **Allow** and the test suite will run automatically every
time you open the project.

You can also trigger it manually: **Terminal → Run Task → Run Tests (once)**.

---

## What the tests cover

| Area | Details |
|---|---|
| **Canvas dimensions** | Width = 720 px, Height = 640 px |
| **Collision detection** | `rectsOverlap()` — 7 cases including edge-touch and bird-vs-pipe |
| **High score** | Saves new records, never overwrites a better score, persists to localStorage |
| **Pipe variant patterns** | All 3 themes, full 16-pipe cycles |
| **Theme switcher** | Active CSS class moves to the correct button |
| **Smoke tests** | 14 critical functions must exist by name |

---

## Project structure

```
Flappy Birds/
├── index.html          # Game page
├── game.js             # All game logic (~2650 lines)
├── style.css           # Styles
├── tests/
│   ├── browser-tests.html  # Self-contained test page (open in any browser too)
│   ├── Run-Tests.ps1       # Headless test runner (PowerShell + Edge CDP)
│   └── Watch-Tests.ps1     # File watcher — re-runs tests on save
└── .vscode/
    ├── tasks.json          # Auto-run + watch tasks
    └── extensions.json     # Recommended extensions
```
