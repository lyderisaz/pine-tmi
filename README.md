# Pušis 🌲 — a pine-tree planner

**Pušis** (Lithuanian for *pine*) is a small personal planner built on the "pine tree" planning method of the classic Time Manager system:

| Tree | Meaning |
|---|---|
| Trunk | you and your **goals** (personal and work) |
| Branches | up to 9 **key areas** of your life and work |
| Twigs | the **tasks** in each key area |
| Needles | the **activities** that complete a task: what, who, by when |

Every needle is attached to the tree, so you keep the overview. Each evening you plan tomorrow's available time around your goals.

> Status: **phase 0 prototype**. It works, but expect changes.

## Try it
**Live: https://lyderisaz.github.io/pine-tmi/**. `index.html` is the current app; `prototype/` keeps the versioned history (v2–v10). You can also open `index.html` from a local copy in a modern browser. There is nothing to install. Use **⚙ → load demo** to see an example.

## What it does
- **Goals**: 6 personal and 6 work goals, each with up to 3 milestones and a deadline. A goal moves from draft ○○ to signed ●○ to achieved ●●. The goal check uses five rules: clear, realistic, challenging, time-limited, worthwhile.
- **Key areas**: one screen with three panes (key areas | task sheet | activity sheet). Codes such as 1.1 and 1.1.3, ! for important tasks, ongoing (∞) vs temporary tasks, an ideas bank, and an optional link on each item.
- **Today**: the elephant of the day, a time column from 08:00 to 21:00 for booked and planned time, Tasks / Activities / Calls & e-mails lists, a Don't forget list, and minutes per key area. Items due today appear here by themselves.
- **Plan tomorrow**: an evening routine of 7 short steps (close today, booked slots, elephant bite, tasks, activities, calls and e-mails, don't forget).
- **INFO**: a **Notes** inbox (write notes of several lines, then sort each one to a task, an idea, Don't forget or Reference), **People** (phone and e-mail directory with categories; names are offered as "who") and **Reference** (kept information by key area or task, with search).
- **📊 Time ledger** (optional, ⚙ → Planning): the Lyubishchev way of looking back. You get plan vs actual minutes per key area, lost time and why, how long finished tasks really took, and a **Balance** view (week, month, year) with your estimating factor.
- **🧭 Covey matrix** (optional, ⚙ → Planning): every open task is sorted into important × urgent quadrants automatically. *Important* means ! or a signed goal; *urgent* means due within N days or late. You get a Matrix view, Q1–Q4 tags, a Q2 hint in Plan tomorrow, and the Q2 share of planned time.
- **? Help**: *Using Pušis* (opens at the page you are on) and *The method* (pine tree, overview, results, goals, key areas, tasks, elephant technique, planning rhythm, the Lyubishchev time ledger, Covey's matrix).
- **⚙ Settings**: day start and end, weekly review day, Flapsi meter on/off, sync (📁 file / ☁ Google Drive), backup. Dates are always shown as YYYY-MM-DD and times as 24 h.
- **Capture**: press **+** or **N** to note something. It goes to the Notes inbox, Don't forget, Ideas, a task, or a call or e-mail.

## Your data
By default your data stays **in your browser only** (localStorage), and nothing is sent anywhere. Use **⚙ → Backup → export** regularly. If you clear the browser data, you lose your plans.

**Optional: save to a file (simplest).** In Chrome or Edge on a computer: **⚙ → 📁 new file…**, and put it in your **Google Drive for desktop** folder (or OneDrive, Dropbox…). Pušis then writes every change to that file, and the folder app syncs it. There is no sign-in. On another computer, use **⚙ → 📁 open file…**. If the file was changed elsewhere, you choose which copy to keep.

**Optional: Google Drive sync.** Pušis can save your data as `pusis-data.json` in *your own* Google Drive and load it on another device. Click **☁ Drive** to connect (the live app has a built-in Client ID; Google lets only the owner's test users in while the project is in testing mode). It can see only the files it creates. Nothing is overwritten without asking when the Drive copy was changed elsewhere. Setup: [GOOGLE_SETUP.md](GOOGLE_SETUP.md).

## Development
- One self-contained HTML file with plain JavaScript and no build step. Older versions are kept in `prototype/` for comparison.
- Built-in self-check: open the page with `#test` at the end of the address and look at the browser console.
- Tests (need [Playwright](https://playwright.dev)):
  ```
  node prototype/proto_test_v10.js <playwright module path> <absolute path to pusis_proto_v10.html> <screenshot folder>
  node prototype/drive_test_v7.js <playwright module path> <absolute path to pusis_proto_v10.html>
  node prototype/file_test_v7.js <playwright module path> <absolute path to pusis_proto_v10.html>
  ```
  `drive_test_v7.js` and `file_test_v7.js` check syncing against a fake Google and a fake file, so no account or real file is needed.

## Credits
The method comes from the **Time Manager®** system created in 1975 by Claus Møller and Time Manager International A/S (TMI). This project is independent and is **not affiliated with or endorsed by TMI**. "Time Manager" is a trademark of its owner.

## Licence
[GPL-3.0](LICENSE)
