// Edit this file to point the app at your Google Sheet.
window.APP_CONFIG = {
  title: "SGRBC Hymn Online",

  // The ID from the sheet URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
  // The shared worksheet is used as-is (no conversion or copy needed); keep it shared as
  // "Anyone with the link - Viewer".
  sheetId: "1YqBE2cUhL8rwm_dBSBCMkmzJnL0CdVz2",

  // Only these columns (header text) are used; any other column of the sheet (e.g. Author) is ignored.
  columns: ["Title", "Lyrics"],

  // Tabs to show. Leave empty to load only the first tab.
  // Example: ["Hymns", "Index", "Categories"]
  sheets: [],

  // Optional: column header (exact text) used as the title in the detail popup.
  // Leave "" to use the first column.
  titleColumn: "",

  // Column (header text) holding the lyrics. It is hidden in the table; clicking a song title shows
  // the lyrics (split into [Verse]/[Chorus] blocks) and, if available, the matching MP3 (matched by the
  // number at the start of the title, see audio-map.js).
  lyricsColumn: "Lyrics",

  // Optional but REQUIRED for real auto-play of the MP3s. Browsers never let a page press play inside Drive's
  // embedded player, so with no key the app shows Drive's player and the visitor presses play once.
  // With a Google API key the app loads the MP3 through the Drive API and plays it itself.
  // Create the key in Google Cloud Console (APIs & Services): enable "Google Drive API", create an API key, then
  // restrict it to (1) "HTTP referrers" = your GitHub Pages site, e.g. https://<user>.github.io/*  and
  // (2) API restrictions = "Google Drive API" only. Such a browser key is visible to anyone who opens the site,
  // so these two restrictions are what protect it. Leave "" to disable.
  driveApiKey: "AIzaSyA59kql1jn5lsQQN6KTT44tID_ePWirFMQ",

  pageSize: 50
};
