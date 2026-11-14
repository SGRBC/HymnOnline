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

  // Column (header text) holding the lyrics. Its [Verse 1]/[Chorus]... sections are shown as
  // separate blocks; selecting Verse 1 plays the matching MP3 (matched by the 3-digit song
  // number at the start of the title, see audio-map.js).
  lyricsColumn: "Lyrics",

  pageSize: 50
};
