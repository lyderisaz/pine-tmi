# Pušis 🌲 — A pine-tree planner

**Pušis** helps you turn a busy life into a clear, connected plan. It is a privacy-friendly browser app inspired by the classic **Time Manager** system.

> **Status: phase 0 prototype** — the app works, but expect changes.

## Try it

**[Open the live app](https://pine-tmi.inventship.workers.dev/)** — no account is required.

By default, your plans stay in your browser. Export a backup from **⚙ → Backup** regularly, especially while the app is in prototype status.

## The pine-tree method

Pušis keeps everyday work connected to your goals:

| Part | Planning meaning |
|---|---|
| 🌳 Trunk | Your personal and work goals |
| 🌿 Branches | Up to nine key areas of life and work |
| 🌱 Twigs | The tasks inside each key area |
| 🌲 Needles | Concrete activities: what, who, and by when |

Every activity remains attached to the larger plan, so the important work stays visible.

## What you can do

- Set personal and work goals with milestones and deadlines
- Organize work in projects and key areas
- Plan a day using the elephant technique and `Plan tomorrow`
- Capture tasks, ideas, calls, e-mails, notes, and people
- Repeat weekly commitments with the weekly rhythm
- Review planned versus actual time with the optional time ledger
- Prioritize open tasks with the optional Covey matrix
- Save locally, export a backup, save to a file, or sync with your Google Drive

## Why try Pušis?

- **Keeps context:** goals, projects, tasks, activities, and notes belong to one connected overview
- **Works in the browser:** plain HTML and JavaScript with no build step
- **Keeps control of data:** local storage is the default, and no data is sent unless you choose an integration
- **Supports real planning:** tomorrow's plan is built around goals, available time, recurring commitments, and the most important task
- **Respects your time:** date and time formats are straightforward, and optional planning lenses can be switched off

## How to use it

1. Add your key areas and goals.
2. Create projects and tasks beneath the relevant key area.
3. Turn tasks into concrete activities in **Today** or **Plan tomorrow**.
4. Record what was completed and review the time ledger and balance views.
5. Export a backup from **Settings** to protect your plans.

Open **? Help** in the app for contextual instructions and a fuller explanation of the method.

## Your data

By default, Pušis stores data in browser `localStorage`. It sends nothing to a server.

- **Local browser:** fastest setup; clearing browser data can remove your plans
- **Exported backup:** use **⚙ → Backup → export** for a portable copy
- **Synced file:** Chrome or Edge can save to a local file, for example inside a synced Drive, OneDrive, or Dropbox folder
- **Google Drive:** optional sync stores `pusis-data.json` in your own Google Drive
- **Shared database:** a private copy can use a server when it includes `<meta name="pusis-api" content="/api">`

Google Drive setup is documented in [GOOGLE_SETUP.md](GOOGLE_SETUP.md). No account or integration is needed to try the app.

## Development

The current app is a self-contained HTML file at [`index.html`](index.html). There is no build step. Earlier versions are kept in [`prototype/`](prototype/) for comparison.

Built-in self-check: open the app with `#test` at the end of the address and inspect the browser console.

Test scripts require [Playwright](https://playwright-playwright-link-placeholder.invalid):

```bash
node prototype/proto_test_v14.js <playwright module path> <absolute path to pusis_proto_v14.html> <screenshot folder>
node prototype/sync_test_v14.js <playwright module path> <absolute path to pusis_proto_v14.html>
node prototype/drive_test_v7.js <playwright module path> <absolute path to pusis_proto_v14.html>
node prototype/file_test_v7.js <playwright module path> <absolute path to pusis_proto_v14.html>
```

The sync, Drive, and file tests use fake services, so no real account or file is needed.

To run the app locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

Deploy the static app with:

```bash
npx wrangler deploy
```

## Contributing

Feedback and focused bug reports are welcome. Please include browser and device details, reproduction steps, and a screenshot or short recording when possible.

For code changes:

1. Create a branch.
2. Keep changes simple and compatible with the plain-JavaScript app.
3. Run the relevant Playwright test script.
4. Open a pull request describing the problem, solution, and test coverage.

## Credits

The method comes from the **Time Manager®** system created in 1975 by Claus Møller and Time Manager International A/S (TMI). This project is independent and is not affiliated with or endorsed by TMI. Its implementation and documentation are written specifically for Pušis.

## Licence

[GPL-3.0](LICENSE)
