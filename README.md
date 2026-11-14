# SGRBC Hymn Online – Worksheet Browser

A static web app (HTML/CSS/JS, no build step, no dependencies) that lets visitors browse, search, sort and
open details of rows from a shared Google Sheet. It is designed for GitHub Pages.

## 1. The Google Sheet

The app reads your shared worksheet directly (no conversion or copy needed). Keep it shared as
**Anyone with the link > Viewer**. The sheet ID is the part of the URL between `/d/` and `/edit`.

> Anyone with the link (and the GitHub Pages site) can read the data. Do not use this with private information.
> Edits to the sheet appear in the app on the next page load.

## 2. Configure

Edit [`config.js`](config.js):

- `sheetId` – the sheet ID (already set to your worksheet).
- `sheets` – list of tab names to show, e.g. `["Hymns", "Index"]` (empty = first tab only).
- `titleColumn` – header used as popup title (default: first column).
- `pageSize` – rows per page.

## 3. Test locally

Do **not** double-click `index.html`: Google blocks data requests from `file://` pages, so the sheet won't load.
Start the local server instead (no Python/Node needed):

```
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
```
Open http://127.0.0.1:8000/ (Ctrl+C to stop). Once hosted on GitHub Pages this isn't needed.

## 4. Host on GitHub Pages

1. Create a GitHub repository and push these files to the root of the `main` branch.
2. Repo **Settings > Pages > Build and deployment > Deploy from a branch > main / (root)**.
3. Your site will be at `https://<user>.github.io/<repo>/`.

## MP3 playback (from the shared Drive folder)

The lyrics of a song are split into Verse / Chorus blocks. With the **Auto-play MP3** toggle (top right, next to the page title; **off** every time the page loads) switched on, selecting the **Verse 1** block loads Drive's
embedded MP3 player for that song (the MP3 whose file name starts with the same 3-digit number, e.g.
`001 Holy Holy Holy.mp3` for `001 Holy, Holy, Holy`). Nothing is downloaded or stored in this repo; the audio is
streamed from the Drive folder. Notes:

- Drive's embedded player may need one click on its play button, because browsers often block scripted auto-play
  of cross-site players. With the toggle off, use the **Show player** button in the song popup to load the player.
- The Drive folder must stay shared as **Anyone with the link - Viewer**.
- **New songs / new MP3s are matched automatically.** A song is matched to an MP3 by the number at the start of
  its name: the sheet row `117 My New Hymn` uses an MP3 named `117 ....mp3` in the Drive folder (or any of its
  sub-folders). A letter suffix is kept (`002a` only matches `002a ...mp3`). If a song has several MP3s, a
  dropdown lets you choose. A song with no matching MP3 simply shows no player.
- The song list is read live from the sheet, but the MP3 list ([`audio-map.js`](audio-map.js)) is a snapshot of the
  Drive folder (Drive does not allow a website to list a folder directly). The GitHub Action
  [`update-audio-map.yml`](.github/workflows/update-audio-map.yml) refreshes it **every 6 hours** and commits it, so a new
  MP3 shows up within hours without any action. To refresh immediately: repo **Actions > Update MP3 map from Google
  Drive > Run workflow** (or run `powershell -ExecutionPolicy Bypass -File scripts/build-audio-map.ps1` and commit).
- Name new MP3s starting with the song number, exactly as in the worksheet title.


## Features

- Tabs for multiple sheets, full-text search with highlighting, per-column search
- Click-to-sort headers (numeric aware), pagination
- Row detail popup, responsive layout
- All cell content rendered via `textContent` (no HTML injection) and a strict Content-Security-Policy
