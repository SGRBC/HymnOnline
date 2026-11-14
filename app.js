(function () {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const els = {
    title: $("title"), tabs: $("tabs"), search: $("search"), colFilter: $("columnFilter"), songSelect: $("songSelect"),
    count: $("count"), status: $("status"), table: $("table"), pager: $("pager"),
    prev: $("prev"), next: $("next"), pageInfo: $("pageInfo"),
    detail: $("detail"), detailTitle: $("detailTitle"), detailBody: $("detailBody"),
    closeDetail: $("closeDetail"), player: $("player"),
    trackSelect: $("trackSelect"), autoplay: $("autoplay"), driveLink: $("driveLink"), lyrics: $("lyrics"),
    loadPlayer: $("loadPlayer"),
    drivePlayer: $("drivePlayer")
  };

  const state = { headers: [], rows: [], view: [], page: 0, sortCol: -1, sortDir: 1, query: "", col: -1 };
  const cache = new Map();
  const pageSize = Math.max(1, Number(cfg.pageSize) || 50);

  // ---------- CSV parsing (RFC 4180) ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // ---------- Data loading ----------
  function sheetUrl(name) {
    const id = encodeURIComponent(cfg.sheetId || "");
    let url = "https://docs.google.com/spreadsheets/d/" + id + "/gviz/tq?tqx=out:csv";
    if (name) url += "&sheet=" + encodeURIComponent(name);
    return url;
  }

  async function loadSheet(name) {
    const key = name || "";
    if (cache.has(key)) return cache.get(key);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let res;
    try {
      res = await fetch(sheetUrl(name), { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error("http");
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error("html");
    const all = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
    if (!all.length) throw new Error("empty");
    const data = { headers: all[0].map((h, i) => h.trim() || "Column " + (i + 1)), rows: all.slice(1) };
    cache.set(key, data);
    return data;
  }

  function friendlyError(e) {
    const base = "Could not load the worksheet.\n\n";
    if (location.protocol === "file:") {
      return base +
        "This page was opened as a local file (file://), and Google blocks data requests from local files.\n" +
        "Run scripts/serve.ps1 and open http://127.0.0.1:8000/ instead, or open the GitHub Pages site.";
    }
    if (e && e.message === "empty") return base + "The sheet appears to be empty.";
    return base +
      "Check that:\n" +
      "• Sharing is set to \"Anyone with the link – Viewer\".\n" +
      "• sheetId and tab names in config.js are correct.";
  }

  // ---------- Rendering ----------
  function setStatus(msg, isError) {
    els.status.textContent = msg || "";
    els.status.className = isError ? "error" : "";
    els.status.hidden = !msg;
  }

  function highlight(td, text, q) {
    td.textContent = "";
    if (!q) { td.textContent = text; return; }
    const lower = text.toLowerCase();
    let pos = 0, idx;
    while ((idx = lower.indexOf(q, pos)) !== -1) {
      td.append(text.slice(pos, idx));
      const m = document.createElement("mark");
      m.textContent = text.slice(idx, idx + q.length);
      td.append(m);
      pos = idx + q.length;
    }
    td.append(text.slice(pos));
  }

  function applyFilter() {
    const q = state.query.trim().toLowerCase();
    let v = state.rows.map((r, i) => ({ r, i }));
    if (q) {
      v = v.filter(({ r }) =>
        state.col >= 0
          ? (r[state.col] || "").toLowerCase().includes(q)
          : r.some((c) => c.toLowerCase().includes(q)));
    }
    if (state.sortCol >= 0) {
      const c = state.sortCol, d = state.sortDir;
      v.sort((a, b) => {
        const x = a.r[c] || "", y = b.r[c] || "";
        const nx = parseFloat(x), ny = parseFloat(y);
        if (!isNaN(nx) && !isNaN(ny) && String(nx) === x.trim() && String(ny) === y.trim()) return (nx - ny) * d;
        return x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" }) * d;
      });
    }
    state.view = v;
    state.page = 0;
    render();
  }

  function renderHead() {
    const thead = els.table.tHead;
    thead.textContent = "";
    const tr = thead.insertRow();
    state.headers.forEach((h, i) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.tabIndex = 0;
      if (i === state.sortCol) th.className = state.sortDir === 1 ? "sorted-asc" : "sorted-desc";
      const sort = () => {
        if (state.sortCol === i) state.sortDir *= -1; else { state.sortCol = i; state.sortDir = 1; }
        renderHead(); applyFilter();
      };
      th.addEventListener("click", sort);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter") sort(); });
      tr.append(th);
    });
  }

  function render() {
    const body = els.table.tBodies[0];
    body.textContent = "";
    const total = state.view.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    state.page = Math.min(state.page, pages - 1);
    const q = state.query.trim().toLowerCase();
    const slice = state.view.slice(state.page * pageSize, (state.page + 1) * pageSize);
    const frag = document.createDocumentFragment();
    slice.forEach(({ r }) => {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      state.headers.forEach((_, i) => {
        const td = document.createElement("td");
        const text = r[i] || "";
        td.title = text;
        highlight(td, text, state.col < 0 || state.col === i ? q : "");
        tr.append(td);
      });
      const open = () => showDetail(r);
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
      frag.append(tr);
    });
    body.append(frag);
    els.count.textContent = total + " of " + state.rows.length + " rows";
    els.pageInfo.textContent = "Page " + (state.page + 1) + " / " + pages;
    els.prev.disabled = state.page === 0;
    els.next.disabled = state.page >= pages - 1;
    els.pager.hidden = pages <= 1;
    setStatus(total ? "" : "No matching rows.");
  }

  // ---------- Audio (played from the shared Drive folder via Drive's embedded player) ----------
  const audioByNum = new Map();
  (Array.isArray(window.AUDIO_MAP) ? window.AUDIO_MAP : []).forEach((t) => {
    if (!/^\d{3}[a-z]?$/.test(t.n || "") || !/^[\w-]+$/.test(t.id || "")) return;
    if (!audioByNum.has(t.n)) audioByNum.set(t.n, []);
    audioByNum.get(t.n).push(t);
  });

  // Header toggle: always OFF when the page loads (the state is intentionally not remembered).
  els.autoplay.checked = false;
  function syncAutoplayClass() { els.detail.classList.toggle("ap", els.autoplay.checked); }
  els.autoplay.addEventListener("change", syncAutoplayClass);

  const driveUrl = (id) => "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/view";
  const previewUrl = (id) => "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/preview";
  let currentTrack = null;

  function setTrack(t) {
    currentTrack = t;
    els.drivePlayer.removeAttribute("src");
    els.drivePlayer.hidden = true;
    els.driveLink.href = driveUrl(t.id);
  }

  // Loads Drive's player for the current track (on Verse 1 when the header toggle is on, or via "Show player").
  function playAudio() {
    if (!currentTrack) return;
    els.drivePlayer.src = previewUrl(currentTrack.id);
    els.drivePlayer.hidden = false;
  }

  els.loadPlayer.addEventListener("click", playAudio);

  function stopAudio() {
    currentTrack = null;
    els.drivePlayer.removeAttribute("src");
    els.drivePlayer.hidden = true;
  }

  function setupPlayer(row, ti) {
    stopAudio();
    // Song number = leading digits (+ optional letter, e.g. "002a") of the title, matched to the MP3 file name.
    const m = /^\s*(\d{1,3})([a-z]?)(?![\da-z])/i.exec(row[ti] || "");
    const tracks = (m && audioByNum.get(m[1].padStart(3, "0") + m[2].toLowerCase())) || [];
    els.player.hidden = !tracks.length;
    els.trackSelect.hidden = tracks.length < 2;
    els.trackSelect.textContent = "";
    tracks.forEach((t, i) => els.trackSelect.add(new Option(t.name.replace(/\.mp3$/i, ""), String(i))));
    if (tracks.length) setTrack(tracks[0]); else currentTrack = null;
    els.trackSelect.onchange = () => { setTrack(tracks[Number(els.trackSelect.value)]); playAudio(); };
    syncAutoplayClass();
    return tracks.length > 0;
  }

  // ---------- Lyrics sections ----------
  const SECTION_RE = /^\s*(?:\[([^\]]+)\]|((?:final\s+|grand\s+)?(?:verse|chorus|refrain|bridge|outro)\s*\d*\s*(?:x\d+)?))\s*:?\s*$/i;
  function parseLyrics(text) {
    const out = [];
    let cur = null;
    text.split(/\r?\n/).forEach((line) => {
      const m = SECTION_RE.exec(line);
      if (m) { cur = { label: (m[1] || m[2]).trim(), lines: [] }; out.push(cur); return; }
      if (!cur) { cur = { label: "", lines: [] }; out.push(cur); }
      cur.lines.push(line);
    });
    return out
      .map((s) => ({ label: s.label, text: s.lines.join("\n").trim() }))
      .filter((s) => s.text || s.label);
  }

  function renderLyrics(text, hasAudio) {
    const wrap = document.createElement("div");
    wrap.className = "lyrics-block";
    const h = document.createElement("div");
    h.className = "stanza-label";
    h.textContent = cfg.lyricsColumn;
    wrap.append(h);
    const stanzas = parseLyrics(text);
    // Verse 1 = first "Verse"/"Verse 1" section; if none is labelled, the first stanza.
    let v1 = stanzas.findIndex((s) => /^verse\s*1?$/i.test(s.label));
    if (v1 < 0) v1 = 0;
    const nodes = [];
    stanzas.forEach((s, idx) => {
      const box = document.createElement("div");
      box.className = "stanza";
      if (s.label) {
        const l = document.createElement("div");
        l.className = "stanza-label";
        l.textContent = s.label;
        box.append(l);
      }
      const t = document.createElement("div");
      t.className = "stanza-text";
      t.textContent = s.text;
      box.append(t);
      if (idx === v1 && hasAudio) {
        box.classList.add("verse1");
        box.tabIndex = 0;
        box.setAttribute("role", "button");
        const go = () => {
          nodes.forEach((n) => n.classList.remove("playing"));
          box.classList.add("playing");
          if (els.autoplay.checked) playAudio();
        };
        box.addEventListener("click", go);
        box.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      }
      nodes.push(box);
      wrap.append(box);
    });
    return wrap;
  }

  function showDetail(row) {
    const ti = Math.max(0, state.headers.indexOf(cfg.titleColumn));
    const li = cfg.lyricsColumn ? state.headers.indexOf(cfg.lyricsColumn) : -1;
    els.detailTitle.textContent = row[ti] || "Details";
    els.detailBody.textContent = "";
    const hasAudio = setupPlayer(row, ti);
    els.lyrics.textContent = "";
    if (li >= 0 && (row[li] || "").trim()) els.lyrics.append(renderLyrics(row[li], hasAudio));
    state.headers.forEach((h, i) => {
      if (!(row[i] || "").trim()) return;
      if (i === li) return;
      const dt = document.createElement("dt");
      dt.textContent = h;
      const dd = document.createElement("dd");
      dd.textContent = row[i];
      els.detailBody.append(dt, dd);
    });
    els.detail.showModal();
  }

  // Dropdown of all songs (titles from the title column, in sheet order). Selecting one opens its lyrics.
  function fillSongSelect() {
    const ti = Math.max(0, state.headers.indexOf(cfg.titleColumn));
    els.songSelect.textContent = "";
    els.songSelect.add(new Option("Select a song…", ""));
    state.rows.forEach((r, i) => {
      const title = (r[ti] || "").trim();
      if (title) els.songSelect.add(new Option(title, String(i)));
    });
  }

  els.songSelect.addEventListener("change", () => {
    const row = state.rows[Number(els.songSelect.value)];
    els.songSelect.value = ""; // back to the placeholder so the same song can be picked again
    if (row) showDetail(row);
  });

  function fillColumnFilter() {
    els.colFilter.textContent = "";
    const all = new Option("All columns", "-1");
    els.colFilter.add(all);
    state.headers.forEach((h, i) => els.colFilter.add(new Option(h, String(i))));
    state.col = -1;
  }

  async function select(name) {
    setStatus("Loading…");
    els.table.hidden = true;
    try {
      const data = await loadSheet(name);
      state.headers = data.headers;
      state.rows = data.rows;
      state.sortCol = -1; state.sortDir = 1; state.col = -1;
      els.table.hidden = false;
      fillColumnFilter();
      fillSongSelect();
      renderHead();
      applyFilter();
    } catch (e) {
      setStatus(friendlyError(e), true);
      els.count.textContent = "";
      els.pager.hidden = true;
    }
  }

  function buildTabs() {
    const names = Array.isArray(cfg.sheets) ? cfg.sheets : [];
    els.tabs.hidden = names.length < 2;
    names.forEach((n, i) => {
      const b = document.createElement("button");
      b.textContent = n;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.addEventListener("click", () => {
        els.tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", "false"));
        b.setAttribute("aria-selected", "true");
        els.search.value = ""; state.query = "";
        select(n);
      });
      els.tabs.append(b);
    });
    return names[0] || "";
  }

  // ---------- Events ----------
  let debounce;
  els.search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.query = els.search.value; applyFilter(); }, 150);
  });
  els.colFilter.addEventListener("change", () => { state.col = Number(els.colFilter.value); applyFilter(); });
  els.prev.addEventListener("click", () => { state.page--; render(); window.scrollTo(0, 0); });
  els.next.addEventListener("click", () => { state.page++; render(); window.scrollTo(0, 0); });
  els.closeDetail.addEventListener("click", () => els.detail.close());
  els.detail.addEventListener("close", stopAudio);
  els.detail.addEventListener("click", (e) => { if (e.target === els.detail) els.detail.close(); });

  // ---------- Init ----------
  if (cfg.title) { els.title.textContent = cfg.title; document.title = cfg.title; }
  select(buildTabs());
})();
