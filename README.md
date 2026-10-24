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
**Live: https://lyderisaz.github.io/pine-tmi/**. You can also open `index.html` (or `prototype/pusis_proto_v3.html`) from a local copy in a modern browser. There is nothing to install. Use **⋯ → Load demo data** to see an example.

## What it does
- **Goals**: 6 personal and 6 work goals, each with up to 3 milestones and a deadline. A goal moves from draft ○○ to signed ●○ to achieved ●●. The goal check uses five rules: clear, realistic, challenging, time-limited, worthwhile.
- **Key areas**: one screen with three panes (key areas | task sheet | activity sheet). Codes such as 1.1 and 1.1.3, ! for important tasks, ongoing (∞) vs temporary tasks, an ideas bank, and an optional link on each item.
- **Today**: the elephant of the day, a time column from 08:00 to 21:00 for booked and planned time, Tasks / Activities / Calls & e-mails lists, a Don't forget list, and minutes per key area. Items due today appear here by themselves.
- **Plan tomorrow**: an evening routine of 7 short steps (close today, booked slots, elephant bite, tasks, activities, calls and e-mails, don't forget).
- **Capture**: press **+** or **N** to note something. It goes to the Notes inbox, Don't forget, Ideas, a task, or a call or e-mail.

## Your data
By default your data stays **in your browser only** (localStorage), and nothing is sent anywhere. Use **⋯ → Export JSON backup** regularly. If you clear the browser data, you lose your plans.

**Optional: Google Drive sync.** Pušis can save your data as `pusis-data.json` in *your own* Google Drive and load it on another device. It uses your own Google Client ID and can see only the files it creates. Nothing is overwritten without asking when the Drive copy was changed elsewhere. Setup: [GOOGLE_SETUP.md](GOOGLE_SETUP.md).

## Development
- One self-contained HTML file with plain JavaScript and no build step. Older versions (v2) are kept for comparison.
- Built-in self-check: open the page with `#test` at the end of the address and look at the browser console.
- Tests (need [Playwright](https://playwright.dev)):
  ```
  node prototype/proto_test_v2.js <playwright module path> <absolute path to pusis_proto_v3.html> <screenshot folder>
  node prototype/drive_test_v3.js <playwright module path> <absolute path to pusis_proto_v3.html>
  ```
  `drive_test_v3.js` checks Drive sync against a fake Google: no account needed.

## Credits
The method comes from the **Time Manager®** system created in 1975 by Claus Møller and Time Manager International A/S (TMI). This project is independent and is **not affiliated with or endorsed by TMI**. "Time Manager" is a trademark of its owner.

## Licence
[GPL-3.0](LICENSE)
