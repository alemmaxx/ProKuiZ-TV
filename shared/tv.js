/* ===== ProKuiz TV — lapisan kawalan jauh untuk Android TV =====
 * Dimuatkan SELEPAS skrip utama app. Tidak mengubah fail asal app telefon.
 *  - Navigasi D-pad (atas/bawah/kiri/kanan + OK)
 *  - Butang Back remote: kembali / berhenti / keluar
 *  - Buang aktiviti menulis: surih huruf, papan conteng, esei, rakam suara
 */
(function () {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("tv");
  const $id = id => document.getElementById(id);
  const en = () => { try { return LANG === "en"; } catch (e) { return false; } };

  /* ---------- 1. Buang subjek tulisan tangan (soalan "surih") ---------- */
  try {
    const isWriting = (y, k) => ((BANK[y] || {})[k] || []).some(q => q && q.trace);
    Object.keys(APP.subjects).forEach(y => { APP.subjects[y] = APP.subjects[y].filter(k => !isWriting(y, k)); });
    if (Array.isArray(APP.groups)) APP.groups.forEach(g => { g.keys = g.keys.filter(k => !Object.keys(APP.subjects).some(y => isWriting(y, k))); });
  } catch (e) { console.warn("TV: subjek", e); }

  /* Papan conteng sentiasa tertutup */
  try { padOpen = false; } catch (e) {}

  /* Teks PKSK: tiada esei (Bahagian C) di TV */
  function fixTexts() {
    document.querySelectorAll('[data-pk="sim"] .sub').forEach(el => {
      el.textContent = el.textContent.replace(/,?\s*kemudian terus ke esei/i, "").replace(/,?\s*then [a-z ]*?to the essay/i, "");
    });
    const pk = document.querySelector("#pkskOpen small");
    if (pk) pk.textContent = pk.textContent.replace(/A, B, C dan/, "A, B dan").replace(/A, B, C and/, "A, B and");
  }
  fixTexts();

  /* Nama: tidak perlu menaip. Isi automatik jika kosong (boleh ditukar). */
  const nm = $id("nameInput");
  if (nm && !nm.value.trim()) nm.value = en() ? "Student" : "Murid";

  /* ---------- 2. Saiz paparan untuk skrin TV lebar ---------- */
  function fitZoom() {
    const w = window.innerWidth;
    doc.style.zoom = w > 1200 ? String(Math.min(2, w / 1000)) : "";
  }
  fitZoom(); window.addEventListener("resize", fitZoom);

  /* ---------- 3. Navigasi D-pad (spatial navigation) ---------- */
  const SEL = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const visible = el => {
    if (el.disabled || el.closest("[hidden]")) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  function scope() {
    const gate = $id("gate");
    return gate && !gate.hidden ? gate : document;
  }
  const focusables = () => [...scope().querySelectorAll(SEL)].filter(visible);

  let lastRect = null;
  function focusEl(el) {
    if (!el) return;
    document.querySelectorAll(".tv-focus").forEach(x => x.classList.remove("tv-focus"));
    el.focus({ preventScroll: true });
    el.classList.add("tv-focus");
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight - 60) el.scrollIntoView({ block: "center", behavior: "smooth" });
    lastRect = el.getBoundingClientRect();
  }
  document.addEventListener("focusin", e => {
    document.querySelectorAll(".tv-focus").forEach(x => { if (x !== e.target) x.classList.remove("tv-focus"); });
    if (e.target && e.target.matches && e.target.matches(SEL)) { e.target.classList.add("tv-focus"); lastRect = e.target.getBoundingClientRect(); }
  });

  const inView = r => r.bottom > 0 && r.top < window.innerHeight;
  function best(dir, from, viewOnly) {
    const cx = from.left + from.width / 2, cy = from.top + from.height / 2;
    let win = null, winScore = Infinity;
    for (const el of focusables()) {
      if (el === document.activeElement) continue;
      const r = el.getBoundingClientRect();
      if (viewOnly && !inView(r)) continue;
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      let main, cross, overlap;
      if (dir === "left" || dir === "right") {
        main = dir === "right" ? r.left - from.right : from.left - r.right;
        if (dir === "right" ? ex <= cx + 1 : ex >= cx - 1) continue;
        overlap = Math.min(r.bottom, from.bottom) - Math.max(r.top, from.top);
        cross = overlap > 0 ? 0 : Math.abs(ey - cy);
      } else {
        main = dir === "down" ? r.top - from.bottom : from.top - r.bottom;
        if (dir === "down" ? ey <= cy + 1 : ey >= cy - 1) continue;
        overlap = Math.min(r.right, from.right) - Math.max(r.left, from.left);
        cross = overlap > 0 ? Math.abs(ex - cx) * 0.15 : Math.abs(ex - cx);
      }
      const score = Math.max(main, 0) + cross * 2;
      if (score < winScore) { winScore = score; win = el; }
    }
    return win;
  }

  function firstIn(root) {
    const pref = root.querySelector(".opt:not([disabled]), #nextBtn, #gatePw, .ychip[aria-pressed=\"true\"], [data-pk], .btn:not(.ghost)");
    if (pref && visible(pref)) return pref;
    return [...root.querySelectorAll(SEL)].find(visible);
  }
  function focusFirst() {
    const gate = $id("gate");
    if (gate && !gate.hidden) return focusEl($id("gatePw"));
    const sec = [...document.querySelectorAll("main section, body > section, section")].find(s => !s.hidden && s.id && visible(s.querySelector(SEL) || s));
    const el = sec ? firstIn(sec) : focusables()[0];
    focusEl(el);
  }

  function move(dir) {
    const act = document.activeElement;
    const hasFocus = act && act !== document.body && visible(act);
    if (!hasFocus) {
      if (lastRect) { const n = best(dir, lastRect) || best(dir === "up" ? "down" : "up", lastRect); if (n) return focusEl(n); }
      return focusFirst();
    }
    const ar = act.getBoundingClientRect();
    const offscreen = !inView(ar);
    const next = offscreen && (dir === "up" || dir === "down")
      ? best(dir, { left: ar.left, right: ar.right, width: ar.width, height: 0,
                    top: dir === "down" ? -1 : window.innerHeight + 1, bottom: dir === "down" ? -1 : window.innerHeight + 1 }, true)
      : best(dir, ar);
    if (next) return focusEl(next);
    /* Tiada butang ke arah itu: tatal halaman (contoh: senarai semakan panjang) */
    if (dir === "down" || dir === "up") window.scrollBy({ top: (dir === "down" ? 1 : -1) * window.innerHeight * 0.45, behavior: "auto" });
  }

  /* ---------- 4. Butang Back ---------- */
  let exitArm = 0;
  function tvToast(msg) {
    try { toast(msg); } catch (e) { console.log(msg); }
  }
  function exitApp() {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.exitApp) App.exitApp();
  }
  function back() {
    const vis = id => { const el = $id(id); return el && !el.hidden; };
    const click = id => { const el = $id(id); if (el) { el.click(); return true; } return false; };
    if (vis("gate")) return exitApp();
    if (document.querySelector(".toast")) { try { document.querySelector(".toast").remove(); } catch (e) {} }
    if (vis("quiz")) { click("quitBtn"); setTimeout(() => { if (vis("quiz")) focusEl($id("quitBtn")); }, 30); return; }
    if (vis("result")) return click("homeBtn");
    if (vis("pksk")) return click("pkskBack");
    if (vis("records")) return click("recBack");
    if (vis("voice")) return click("voiceBack");
    if (vis("essay")) return click("eQuit");
    /* Laman utama: tekan dua kali untuk keluar */
    const now = Date.now();
    if (now - exitArm < 2500) return exitApp();
    exitArm = now;
    tvToast(en() ? "Press Back again to exit" : "Tekan Back sekali lagi untuk keluar");
  }
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener("backButton", back);
  } catch (e) {}

  /* ---------- 5. Kekunci remote ---------- */
  const DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Up: "up", Down: "down", Left: "left", Right: "right" };
  document.addEventListener("keydown", e => {
    const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && t.type !== "checkbox";
    const dir = DIRS[e.key];
    if (dir) {
      if (typing && (dir === "left" || dir === "right") && t.value) {
        const atStart = t.selectionStart === 0, atEnd = t.selectionEnd === t.value.length;
        if (!((dir === "left" && atStart) || (dir === "right" && atEnd))) return; // gerak kursor dalam teks
      }
      e.preventDefault(); move(dir); return;
    }
    if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack" || (e.key === "Backspace" && !typing)) { e.preventDefault(); back(); return; }
    /* Butang nombor 1-4 pada remote = pilihan A-D */
    if (!typing && /^[1-4]$/.test(e.key)) {
      const quiz = $id("quiz");
      if (quiz && !quiz.hidden) { const o = document.querySelectorAll("#slideHost .opt")[Number(e.key) - 1]; if (o && !o.disabled) { o.click(); e.preventDefault(); } }
    }
  }, true);

  /* ---------- 6. Fokus automatik bila skrin bertukar ---------- */
  const wrap = (name, after) => {
    try {
      const orig = (0, eval)(name);
      if (typeof orig !== "function") return;
      window.__tvWrap = function () { const r = orig.apply(this, arguments); try { after(arguments); } catch (e) {} return r; };
      (0, eval)(name + " = window.__tvWrap");
      delete window.__tvWrap;
    } catch (e) { console.warn("TV wrap", name, e); }
  };
  const later = f => setTimeout(f, 60);
  wrap("show", args => later(() => {
    const sec = $id(args[0]), a = document.activeElement;
    if (sec && a && sec.contains(a) && visible(a)) return; // fokus sudah dalam skrin baharu
    focusFirst();
  }));
  wrap("renderQ", () => later(() => { const o = document.querySelector("#slideHost .opt:not([disabled])") || document.querySelector("#slideHost button"); if (o) focusEl(o); }));
  wrap("showNext", () => later(() => { const n = $id("nextBtn"); if (n) focusEl(n); }));
  wrap("renderHome", () => later(() => {
    const a = document.activeElement;
    if (a && a !== document.body && visible(a)) return;
    const y = document.querySelector('.ychip[aria-pressed="true"]'); if (y) focusEl(y);
  }));
  wrap("openPksk", () => later(focusFirst));
  wrap("applyStatic", fixTexts);

  /* Selepas kata laluan betul: fokus ke laman utama */
  const gateForm = $id("gateForm");
  if (gateForm) gateForm.addEventListener("submit", () => later(() => { const g = $id("gate"); if (g && g.hidden) focusFirst(); }));

  /* Petunjuk kawalan jauh di laman utama */
  const home = $id("home");
  if (home) {
    const h = document.createElement("div");
    h.className = "tv-help";
    h.innerHTML = en()
      ? "<span><b>▲▼◀▶</b>Move</span><span><b>OK</b>Choose</span><span><b>1-4</b>Answer A-D</span><span><b>Back</b>Return</span>"
      : "<span><b>▲▼◀▶</b>Gerak</span><span><b>OK</b>Pilih</span><span><b>1-4</b>Jawapan A-D</span><span><b>Back</b>Kembali</span>";
    (home.querySelector(".wrap") || home).appendChild(h);
  }

  try { renderHome(); } catch (e) {}
  later(focusFirst);
})();
