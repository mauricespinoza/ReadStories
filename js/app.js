/* CamiloReading — app logic (no build step, no dependencies). */
(() => {
  "use strict";

  const STORIES = window.STORIES || [];
  const DICT = window.DICT || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const WORD_RE = /([A-Za-z]+(?:['’][A-Za-z]+)*)/g;

  /* ------------------------------------------------------------------ */
  /*  Topics, themes, fonts                                              */
  /* ------------------------------------------------------------------ */
  const TOPICS = [
    { id: "magia",       label: "Magia y magos",  sub: "hechizos, varitas",   icon: "🪄", cover: "#e3dbfa" },
    { id: "aventuras",   label: "Aventuras",      sub: "mapas y tesoros",     icon: "🗺️", cover: "#fde5c2" },
    { id: "ciencia",     label: "Ciencia",        sub: "por qué pasan cosas", icon: "🔬", cover: "#d4ecfb" },
    { id: "animales",    label: "Animales",       sub: "fábulas y bichos",    icon: "🦁", cover: "#f9e2a6" },
    { id: "espacio",     label: "Espacio",        sub: "cohetes y planetas",  icon: "🚀", cover: "#cfd6f7" },
    { id: "dinosaurios", label: "Dinosaurios",    sub: "y fósiles",           icon: "🦕", cover: "#d4efd9" },
    { id: "deportes",    label: "Deportes",       sub: "fútbol y carreras",   icon: "⚽", cover: "#d8f0e4" },
    { id: "misterio",    label: "Misterio",       sub: "pistas y detectives", icon: "🔍", cover: "#f6d7e3" },
  ];
  const topicById = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const LEVELS = { 1: "Fácil", 2: "Medio", 3: "Desafío" };

  const READER_THEMES = [
    { id: "auto",  label: "Auto",  bg: "linear-gradient(135deg,#fffdf8 50%,#1b2035 50%)", fg: "#2f3a78" },
    { id: "papel", label: "Papel", bg: "#fffdf8", fg: "#262320" },
    { id: "sepia", label: "Sepia", bg: "#f4e8d0", fg: "#4a3a27" },
    { id: "menta", label: "Menta", bg: "#e6f3ec", fg: "#1f3a30" },
    { id: "cielo", label: "Cielo", bg: "#e8eefb", fg: "#1f2b4b" },
    { id: "noche", label: "Noche", bg: "#1b2035", fg: "#e2e4ee" },
  ];
  const FONTS = [
    { id: "atkinson", label: "Clara",   family: "'Atkinson Hyperlegible', Verdana, sans-serif" },
    { id: "literata", label: "Libro",   family: "Literata, Georgia, serif" },
    { id: "lexend",   label: "Redonda", family: "Lexend, 'Trebuchet MS', sans-serif" },
    { id: "andika",   label: "Escolar", family: "Andika, Verdana, sans-serif" },
  ];
  const LINES = [{ id: 1.45, label: "Junto" }, { id: 1.7, label: "Normal" }, { id: 2.05, label: "Separado" }];
  const RATES = [{ id: 0.65, label: "Lenta" }, { id: 0.85, label: "Normal" }, { id: 1.0, label: "Rápida" }];

  /* ------------------------------------------------------------------ */
  /*  Saved state                                                        */
  /* ------------------------------------------------------------------ */
  const KEY = "camiloreading.v1";
  const DEFAULTS = {
    name: "Camilo", interests: [], onboarded: false,
    settings: { size: 22, line: 1.7, font: "atkinson", theme: "auto", rate: 0.85, voice: "" },
    saved: {}, read: {}, filter: "para-ti",
  };
  const state = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    s = Object.assign({}, DEFAULTS, s || {});
    s.settings = Object.assign({}, DEFAULTS.settings, (s && s.settings) || {});
    return s;
  })();
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage off */ } };

  /* ------------------------------------------------------------------ */
  /*  The owl (original character: "Profe Plumas")                       */
  /* ------------------------------------------------------------------ */
  function owlSVG() {
    return `<svg class="owl" viewBox="0 0 120 132" aria-hidden="true">
      <ellipse cx="60" cy="127" rx="30" ry="4" fill="rgba(0,0,0,.12)"/>
      <path class="wing-l" d="M24 72c-12 10-14 32-4 44 6-2 12-10 14-22z" fill="#5a4790"/>
      <path class="wing-r" d="M96 72c12 10 14 32 4 44-6-2-12-10-14-22z" fill="#5a4790"/>
      <path d="M30 56 22 36l18 12zM90 56l8-20-18 12z" fill="#5a4790"/>
      <ellipse cx="60" cy="86" rx="38" ry="40" fill="var(--owl-body)"/>
      <ellipse cx="60" cy="100" rx="23" ry="24" fill="var(--owl-belly)"/>
      <path d="M50 92q3 3 6 0M60 98q3 3 6 0M50 104q3 3 6 0M60 110q3 3 6 0" stroke="#b9a6dc" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="44" cy="74" r="15" fill="#fff"/>
      <circle cx="76" cy="74" r="15" fill="#fff"/>
      <circle cx="44" cy="74" r="15" fill="none" stroke="var(--owl-hat-band)" stroke-width="3"/>
      <circle cx="76" cy="74" r="15" fill="none" stroke="var(--owl-hat-band)" stroke-width="3"/>
      <circle cx="46" cy="76" r="6.5" fill="#24203a"/>
      <circle cx="74" cy="76" r="6.5" fill="#24203a"/>
      <circle cx="48" cy="73.5" r="2.2" fill="#fff"/>
      <circle cx="76" cy="73.5" r="2.2" fill="#fff"/>
      <g class="lids"><circle cx="44" cy="74" r="15" fill="var(--owl-body)"/><circle cx="76" cy="74" r="15" fill="var(--owl-body)"/></g>
      <path d="M55 86h10l-5 9z" fill="var(--owl-beak)"/>
      <path d="M48 124q4-5 8 0M64 124q4-5 8 0" stroke="var(--owl-beak)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M33 50 56 4q4-3 7 2l24 44z" fill="var(--owl-hat)"/>
      <path d="M33 50q27 9 54 0l-3-7q-24 7-48 0z" fill="var(--owl-hat-band)"/>
      <path d="m61 18 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="var(--owl-hat-band)"/>
      <circle cx="71" cy="36" r="1.8" fill="#fff" opacity=".8"/>
      <circle cx="50" cy="31" r="1.3" fill="#fff" opacity=".7"/>
    </svg>`;
  }
  $$("[data-owl]").forEach(el => (el.innerHTML = owlSVG()));
  const owlCheer = () => {
    $$(".owl").forEach(o => { o.classList.remove("happy"); void o.offsetWidth; o.classList.add("happy"); });
  };

  /* ------------------------------------------------------------------ */
  /*  Dictionary + pronunciation                                         */
  /* ------------------------------------------------------------------ */
  const norm = w => w.toLowerCase().replace(/’/g, "'");

  function guessPron(word) {
    // Very rough fallback for words that are not in the dictionary yet.
    let s = norm(word).replace(/'/g, "");
    const rules = [
      [/tion/g, "shon"], [/sion/g, "shon"], [/ough/g, "of"], [/igh/g, "ai"], [/sh/g, "§"], [/ch/g, "¢"],
      [/th/g, "z"], [/ph/g, "f"], [/ck/g, "k"], [/qu/g, "ku"], [/wh/g, "u"],
      [/ee|ea|ie/g, "i"], [/oo/g, "u"], [/ou|ow/g, "au"], [/ay|ai|ey/g, "ei"], [/oa/g, "ou"], [/oy|oi/g, "oi"],
      [/^y/, "¥"], [/y$/, "i"], [/y/g, "i"], [/¥/g, "y"],
      [/([^aeiou])e$/, "$1"], [/c(?=[eiy])/g, "s"], [/c/g, "k"], [/x/g, "ks"], [/g(?=[ei])/g, "y"],
      [/j/g, "y"], [/h/g, "j"], [/w/g, "u"], [/z/g, "s"], [/(.)\1/g, "$1"], [/§/g, "sh"], [/¢/g, "ch"],
    ];
    for (const [re, rep] of rules) s = s.replace(re, rep);
    return s || word;
  }

  function lookup(word) {
    const k = norm(word);
    if (DICT[k]) return { pron: DICT[k][0], mean: DICT[k][1], known: true };
    if (k.endsWith("'s") && DICT[k.slice(0, -2)]) {
      const b = DICT[k.slice(0, -2)];
      return { pron: b[0] + "s", mean: `de ${b[1].split(/[;(]/)[0].trim()} ('s = "de")`, known: true };
    }
    return { pron: guessPron(word), mean: null, known: false };
  }

  // "uí-serd" -> <b>uí</b><span class=sep>-</span>serd   (stressed syllable in bold)
  function pronHTML(pron, inPhrase = false) {
    const syl = pron.split("-");
    if (syl.length === 1) return inPhrase ? esc(pron) : `<b>${esc(pron)}</b>`;
    return syl.map(x => (/[áéíóú]/.test(x) ? `<b>${esc(x)}</b>` : esc(x))).join('<span class="sep">-</span>');
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ------------------------------------------------------------------ */
  /*  Speech (English voice from the device)                             */
  /* ------------------------------------------------------------------ */
  const synth = window.speechSynthesis || null;
  let voices = [], voicesEs = [];
  function loadVoices() {
    if (!synth) return;
    const all = synth.getVoices();
    voices = all.filter(v => /^en[-_]/i.test(v.lang) || v.lang === "en");
    voicesEs = all.filter(v => /^es([-_]|$)/i.test(v.lang));
    renderVoiceSelect();
  }
  function esVoiceScore(v) {
    let s = 0;
    if (/es[-_]CL/i.test(v.lang)) s += 45;
    else if (/es[-_](419|MX|US|AR|CO|PE)/i.test(v.lang)) s += 35;
    else if (/es[-_]ES/i.test(v.lang)) s += 20;
    if (/google|natural|neural|premium|enhanced|siri/i.test(v.name)) s += 40;
    if (/compact|eloquence/i.test(v.name)) s -= 30;
    if (v.localService) s += 3;
    return s;
  }
  function currentEsVoice() {
    return voicesEs.length ? [...voicesEs].sort((a, b) => esVoiceScore(b) - esVoiceScore(a))[0] : null;
  }
  function voiceScore(v) {
    let s = 0;
    if (/en[-_]US/i.test(v.lang)) s += 30;
    if (/en[-_]GB/i.test(v.lang)) s += 25;
    if (/google|natural|neural|premium|enhanced|siri/i.test(v.name)) s += 40;
    if (/samantha|daniel|karen|serena|aria|jenny|guy|libby|sonia|ava|allison/i.test(v.name)) s += 15;
    if (/compact|eloquence|novelty|bells|whisper|zarvox|trinoids|albert|bad news|bubbles|jester|organ|cellos|boing|hysterical|superstar|wobble|grandma|grandpa|fred|junior|ralph|kathy|rocko|shelley|sandy|flo|reed|eddy/i.test(v.name)) s -= 50;
    if (v.localService) s += 3;
    return s;
  }
  function currentVoice() {
    if (!voices.length) return null;
    const chosen = state.settings.voice && voices.find(v => v.voiceURI === state.settings.voice);
    return chosen || [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }
  if (synth) {
    loadVoices();
    if ("onvoiceschanged" in synth) synth.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 600);
  }

  let speakToken = 0;
  function makeUtterance(text, rate, lang = "en") {
    const u = new SpeechSynthesisUtterance(text);
    const v = lang === "es" ? currentEsVoice() : currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === "es" ? "es-MX" : "en-US"; }
    u.rate = rate;
    u.pitch = 1;
    return u;
  }
  // words: [{el, pos}] to highlight while speaking (pos = character offset in text)
  function say(text, { rate = 0.9, button = null, lang = "en", words = null, onend = null } = {}) {
    if (!synth) { toast("Este navegador no tiene voces para leer en voz alta."); return; }
    stopReading(false);
    stopRec();
    stopEstimate();
    synth.cancel();
    const my = ++speakToken;
    const alive = () => my === speakToken;
    const u = makeUtterance(text, rate, lang);
    if (words && words.length) trackWords(u, words, alive);
    if (button) button.classList.add("playing");
    const done = () => {
      if (button) button.classList.remove("playing");
      if (alive()) { stopEstimate(); if (onend) onend(); }
    };
    u.onend = done; u.onerror = done;
    // Small delay: Chrome sometimes drops an utterance queued right after cancel().
    setTimeout(() => { if (my === speakToken) synth.speak(u); }, 60);
  }


  /* ---------- yellow "this word is being said" marker ---------- */
  let spokenEl = null, estTimer = null;
  function markSpoken(el) {
    if (el === spokenEl) return;
    if (spokenEl) spokenEl.classList.remove("spoken");
    if (el) el.classList.add("spoken");
    spokenEl = el;
  }
  function clearSpoken() { $$(".spoken").forEach(e => e.classList.remove("spoken")); spokenEl = null; }
  function stopEstimate() { clearTimeout(estTimer); estTimer = null; }
  // Follow a device utterance word by word; voices without word events get a timed estimate.
  function trackWords(u, list, alive) {
    let got = false;
    u.onboundary = e => {
      if (!alive() || (e.name && e.name !== "word")) return;
      got = true; stopEstimate();
      let hit = list[0];
      for (const w of list) { if (w.pos <= e.charIndex) hit = w; else break; }
      if (hit) markSpoken(hit.el);
    };
    u.onstart = () => setTimeout(() => { if (alive() && !got) estimateWords(list.map(w => w.el), u.rate || 1, alive); }, 450);
  }
  function estimateWords(els, rate, alive) {
    stopEstimate();
    let k = 0;
    const perWord = 400 / rate;
    const tick = () => {
      if (!alive() || k >= els.length) return;
      markSpoken(els[k]);
      estTimer = setTimeout(tick, perWord * (0.6 + els[k].textContent.length / 9));
      k++;
    };
    tick();
  }

  /* ------------------------------------------------------------------ */
  /*  Recorded voices (audio/ folder made by tools/make_audio.py)        */
  /* ------------------------------------------------------------------ */
  const AUD = window.AUDIO || { base: "audio/", voices: [] };
  const recVoices = (AUD.voices || []).map(v => Object.assign({}, v, { set: new Set((v.words || "").split(" ").filter(Boolean)) }));
  const recEs = AUD.es || [];
  function esVoiceObj() {
    let id = state.settings.esVoice;
    if (id === "device") return null;
    if (!id) id = recEs[0] && recEs[0].id;
    return recEs.find(v => v.id === id) || null;
  }
  const recRate = r => (r < 0.7 ? 0.8 : r < 0.9 ? 1 : 1.12);   // Lenta / Normal / Rápida
  function recVoiceObj() {
    let id = state.settings.recVoice;
    if (id === "device") return null;
    if (!id) id = recVoices[0] && recVoices[0].id;
    return recVoices.find(v => v.id === id) || null;
  }
  const wordSrc = (v, key) => `${AUD.base}${v.id}/w/${key.replace(/'/g, "_")}.mp3`;
  const sentSrc = (v, sid, n) => `${AUD.base}${v.id}/s/${sid}/${n}.mp3`;

  const rec = { el: null, tok: 0, raf: 0 };
  function recEl() {
    if (!rec.el) {
      rec.el = new Audio(); rec.el.preload = "auto";
      rec.el.preservesPitch = true; rec.el.webkitPreservesPitch = true;
    }
    return rec.el;
  }
  function stopRec() {
    rec.tok++; cancelAnimationFrame(rec.raf);
    if (rec.el) { rec.el.onerror = null; rec.el.onloadedmetadata = null; rec.el.pause(); }
    $$(".act.playing").forEach(b => b.classList.remove("playing"));
    clearSpoken();
  }
  // Play segments one after another: [{src, from, to, b, words}] (seconds; from/to optional).
  function playRec(segs, { rate = 1, button = null, onword = null, onend = null, onfail = null } = {}) {
    const A = recEl();
    stopRec();
    if (synth) synth.cancel();
    const my = rec.tok;
    const alive = () => my === rec.tok;
    if (button) button.classList.add("playing");
    const finish = fn => { if (!alive()) return; if (button) button.classList.remove("playing"); fn && fn(); };
    const fail = () => { if (!alive()) return; rec.tok++; cancelAnimationFrame(rec.raf); if (button) button.classList.remove("playing"); onfail && onfail(); };
    let k = 0;
    const next = () => {
      if (!alive()) return;
      if (k >= segs.length) { finish(onend); return; }
      const seg = segs[k++], from = seg.from || 0;
      A.onerror = fail;
      const abs = new URL(seg.src, document.baseURI).href;
      const begin = () => {
        if (!alive()) return;
        if (Math.abs(A.currentTime - from) > 0.15) A.currentTime = from;
        const end = Math.min(seg.to == null ? Infinity : seg.to, A.duration || Infinity);
        const tick = () => {
          if (!alive()) return;
          const t = A.currentTime;
          if (onword && seg.b) onword(seg, t);
          if (A.ended || t >= end - 0.02) { A.pause(); next(); return; }
          rec.raf = requestAnimationFrame(tick);
        };
        rec.raf = requestAnimationFrame(tick);
      };
      A.playbackRate = rate;
      if (A.src === abs && A.readyState >= 1) {
        A.currentTime = from;
        const pr = A.play(); if (pr && pr.catch) pr.catch(fail);
        begin();
      } else {
        A.onloadedmetadata = () => { A.onloadedmetadata = null; begin(); };
        A.src = seg.src;
        if (from > 0) A.currentTime = from;   // becomes the start position
        A.playbackRate = rate;
        const pr = A.play(); if (pr && pr.catch) pr.catch(fail);
      }
    };
    next();
  }

  function sayWord(text, { rate = state.settings.rate, slow = false, button = null } = {}) {
    const v = recVoiceObj(), key = norm(text);
    if (v && v.set.has(key)) {
      playRec([{ src: wordSrc(v, key) }], { rate: slow ? 0.6 : recRate(rate), button, onfail: () => say(text, { rate: slow ? 0.55 : rate * 0.95, button }) });
      return;
    }
    say(text, { rate: slow ? 0.55 : rate * 0.95, button });
  }
  // words[a..b] (global word indexes) as a phrase: cut it out of the sentence recordings
  function phraseSegments(v, a, b) {
    const segs = [];
    let i = a;
    while (i <= b) {
      const sIdx = +words[i].dataset.s;
      let j = i;
      while (j < b && +words[j + 1].dataset.s === sIdx) j++;
      const bd = v.sent && v.sent[story.id] && v.sent[story.id][sIdx];
      const sw = sentences[sIdx].words;
      if (!bd || bd.length !== sw.length + 1) return null;
      const i0 = sw.indexOf(words[i]), i1 = sw.indexOf(words[j]);
      segs.push({ src: sentSrc(v, story.id, sIdx), from: bd[i0], to: i1 === sw.length - 1 ? null : bd[i1 + 1], b: bd, words: sw });
      i = j + 1;
    }
    return segs;
  }
  function sayPhrase(text, a, b, { rate = state.settings.rate, slow = false, button = null } = {}) {
    const v = recVoiceObj();
    const segs = v && a >= 0 ? phraseSegments(v, a, b) : null;
    const fallback = () => say(text, { rate: slow ? 0.55 : rate, button, words: phraseWordList(text, a, b), onend: clearSpoken });
    if (segs) playRec(segs, { rate: slow ? 0.6 : recRate(rate), button, onword: highlightByTime, onend: clearSpoken, onfail: fallback });
    else fallback();
  }
  // selected word elements with their position inside the phrase text
  function phraseWordList(text, a, b) {
    const list = [];
    if (a < 0) return list;
    let cur = 0;
    for (let i = a; i <= b; i++) {
      const w = words[i].textContent, pos = text.indexOf(w, cur);
      if (pos < 0) continue;
      list.push({ el: words[i], pos }); cur = pos + w.length;
    }
    return list;
  }
  function highlightByTime(seg, t) {
    const bd = seg.b; let k = 0;
    t = Math.max(t, (seg.from || 0) + 0.005);   // mp3 seeking can land a hair early
    while (k < bd.length - 2 && t >= bd[k + 1]) k++;
    if (seg.words[k]) markSpoken(seg.words[k]);
  }
  function previewEsVoice(v) {
    const fb = () => say("¡Hola! Vamos a leer un cuento juntos.", { rate: state.settings.rate, lang: "es" });
    if (v && v.preview) playRec([{ src: `${AUD.base}${v.id}/preview.mp3` }], { rate: recRate(state.settings.rate), onfail: fb });
    else fb();
  }
  function previewVoice(v) {
    if (v && v.preview) {
      playRec([{ src: `${AUD.base}${v.id}/preview.mp3` }], { rate: recRate(state.settings.rate), onfail: () => say("Hello! I am ready to read with you.", { rate: state.settings.rate }) });
    } else say("Hello! I am ready to read with you.", { rate: state.settings.rate });
  }

  /* ------------------------------------------------------------------ */
  /*  Views                                                              */
  /* ------------------------------------------------------------------ */
  let currentView = null;
  function show(view) {
    ["splash", "welcome", "library", "reader", "words"].forEach(v => ($(`#view-${v}`).hidden = v !== view));
    currentView = view;
    closeBubble(); closeTip();
    document.body.dataset.view = view;
    if (view !== "reader") { stopReading(false); stopRec(); }
  }
  $$("[data-back]").forEach(b => b.addEventListener("click", () => { renderLibrary(); show("library"); }));

  /* ---------- welcome ---------- */
  function renderWelcome() {
    $("#kid-name").value = state.name || "";
    const grid = $("#topic-grid");
    grid.innerHTML = TOPICS.map(t => `
      <button type="button" class="topic" data-topic="${t.id}" aria-pressed="${state.interests.includes(t.id)}">
        <span class="t-icon" aria-hidden="true">${t.icon}</span>
        <span>${t.label}</span><span class="t-sub">${t.sub}</span>
      </button>`).join("");
    grid.onclick = e => {
      const b = e.target.closest(".topic"); if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on);
    };
  }
  $("#welcome-go").addEventListener("click", () => {
    state.name = ($("#kid-name").value || "").trim() || "Camilo";
    state.interests = $$(".topic[aria-pressed='true']").map(b => b.dataset.topic);
    state.onboarded = true;
    state.filter = state.interests.length ? "para-ti" : "todos";
    persist();
    renderLibrary(); show("library");
    owlCheer();
    setTimeout(() => showTip(`¡Listo, ${state.name}! Los cuentos que más te pueden gustar están primero. Elige uno.`), 400);
  });
  $("#go-prefs").addEventListener("click", () => { renderWelcome(); show("welcome"); });

  /* ---------- library ---------- */
  function storyScore(s) {
    const match = s.tags.filter(t => state.interests.includes(t)).length;
    return match * 10 - s.level - (state.read[s.id] ? 5 : 0);
  }
  function renderLibrary() {
    $("#lib-greeting").textContent = `¡Hola, ${state.name || "Camilo"}!`;
    const nRead = Object.keys(state.read).length;
    $("#lib-sub").textContent = nRead ? "¿Qué cuento leemos ahora?" : "Elige un cuento para leer hoy.";
    $("#lib-progress").innerHTML = nRead
      ? `<span class="stars" aria-hidden="true">${"★".repeat(Math.min(nRead, 12))}</span><span>${nRead} de ${STORIES.length} cuentos leídos</span>`
      : `<span>${STORIES.length} cuentos para leer</span>`;
    $("#words-count").textContent = Object.keys(state.saved).length;

    const filters = [];
    if (state.interests.length) filters.push({ id: "para-ti", label: "Para ti" });
    filters.push({ id: "todos", label: "Todos" });
    TOPICS.forEach(t => { if (STORIES.some(s => s.tags.includes(t.id))) filters.push({ id: t.id, label: `${t.icon} ${t.label}` }); });
    if (!filters.some(f => f.id === state.filter)) state.filter = filters[0].id;
    $("#filter-row").innerHTML = filters.map(f =>
      `<button type="button" role="tab" class="filter" data-filter="${f.id}" aria-selected="${f.id === state.filter}">${f.label}</button>`).join("");

    let list = [...STORIES];
    if (state.filter === "para-ti") list = list.filter(s => s.tags.some(t => state.interests.includes(t)));
    else if (state.filter !== "todos") list = list.filter(s => s.tags.includes(state.filter));
    list.sort((a, b) => storyScore(b) - storyScore(a));
    if (!list.length) list = [...STORIES];

    $("#story-grid").innerHTML = list.map((s, i) => {
      const t = topicById[s.tags[0]] || TOPICS[0];
      const mins = Math.max(1, Math.round(s.words / 70));
      const pick = i === 0 && state.filter === "para-ti" && !state.read[s.id];
      return `<button type="button" class="card" data-story="${s.id}">
        <div class="cover" style="--cover:${t.cover}">
          <div class="cover-dots"></div>
          ${pick ? '<span class="badge-pick">TE RECOMIENDO</span>' : ""}
          ${state.read[s.id] ? '<span class="badge-read">✓ Leído</span>' : ""}
          <span class="cover-emoji" aria-hidden="true">${s.emoji || t.icon}</span>
        </div>
        <div class="card-body">
          <h2 class="card-title" lang="en">${esc(s.title)}</h2>
          <p class="card-es">${esc(s.title_es || "")}</p>
          <div class="card-meta">
            <span class="level" title="Nivel ${LEVELS[s.level]}">${[1, 2, 3].map(n => `<i class="${n <= s.level ? "on" : ""}"></i>`).join("")}</span>
            <span>${LEVELS[s.level]}</span><span>·</span><span>${s.words} palabras</span><span>·</span><span>${mins} min</span>
          </div>
        </div>
      </button>`;
    }).join("");
  }
  $("#filter-row").addEventListener("click", e => {
    const b = e.target.closest(".filter"); if (!b) return;
    state.filter = b.dataset.filter; persist(); renderLibrary();
  });
  $("#story-grid").addEventListener("click", e => {
    const c = e.target.closest(".card"); if (c) openStory(c.dataset.story);
  });
  $("#go-words").addEventListener("click", () => { renderWords(); show("words"); });

  /* ---------- words ---------- */
  function renderWords() {
    const items = Object.entries(state.saved).sort((a, b) => b[1].t - a[1].t);
    $("#word-list").innerHTML = items.length ? items.map(([w, d]) => `
      <div class="wcard">
        <span class="w-en" lang="en">${esc(d.w || w)}</span>
        <div class="w-btns">
          <button type="button" class="icon-btn" data-say="${esc(d.w || w)}" aria-label="Escuchar ${esc(w)}">
            <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z"/></svg></button>
          <button type="button" class="icon-btn" data-unsave="${esc(w)}" aria-label="Quitar ${esc(w)}">
            <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7Zm3-3h6l1 2H8l1-2Z"/></svg></button>
        </div>
        <span class="w-pron">${pronHTML(d.p)}</span>
        <span class="w-es">${esc(d.m || "")}</span>
      </div>`).join("")
      : `<p class="empty">Todavía no guardas palabras.<br>En un cuento, toca una palabra y luego la estrella ☆.</p>`;
  }
  $("#word-list").addEventListener("click", e => {
    const s = e.target.closest("[data-say]"); if (s) { sayWord(s.dataset.say, { rate: 0.85 }); return; }
    const u = e.target.closest("[data-unsave]");
    if (u) { delete state.saved[u.dataset.unsave]; persist(); renderWords(); }
  });

  /* ------------------------------------------------------------------ */
  /*  Reader                                                             */
  /* ------------------------------------------------------------------ */
  let story = null;
  let sentences = [];   // [{en, es, el, esEl, words:[spanEls]}]
  let words = [];       // all word spans in order (title + body)
  let mode = "word";    // "word" | "phrase"

  function openStory(id) {
    story = STORIES.find(s => s.id === id);
    if (!story) return;
    buildReader();
    show("reader");
    $("#pane-en").scrollTop = 0; $("#pane-es").scrollTop = 0;
    if (!state.seenReaderTip) {
      state.seenReaderTip = true; persist();
      setTimeout(() => showTip("Toca cualquier palabra y te digo cómo se lee. Si quieres una frase entera, cambia arriba a «Frase»."), 500);
    }
  }

  const ES_WORD_RE = /\p{L}+(?:['’]\p{L}+)*/gu;   // same rule as tools/make_audio.py
  function esSpans(text) {
    let html = "", last = 0, m;
    ES_WORD_RE.lastIndex = 0;
    while ((m = ES_WORD_RE.exec(text))) {
      html += esc(text.slice(last, m.index)) + `<span class="wes" data-c="${m.index}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return html + esc(text.slice(last));
  }
  function wordSpans(text, sIdx) {
    let html = "", last = 0, m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) {
      html += esc(text.slice(last, m.index));
      html += `<span class="w" data-s="${sIdx}" data-c="${m.index}" data-k="${esc(norm(m[1]))}">${esc(m[1])}</span>`;
      last = m.index + m[1].length;
    }
    return html + esc(text.slice(last));
  }

  function buildReader() {
    const en = $("#page-en"), es = $("#page-es");
    sentences = [];
    const t = topicById[story.tags[0]];
    let enHTML = `<p class="story-kicker">${t ? t.label : "Cuento"} · Nivel ${LEVELS[story.level]}</p>`;
    let esHTML = `<p class="story-kicker">En español</p>`;
    // sentence 0 = title
    sentences.push({ en: story.title, es: story.title_es || "" });
    enHTML += `<h1 class="story-title"><span class="sent" data-s="0">${wordSpans(story.title, 0)}</span></h1>`;
    esHTML += `<h1 class="story-title"><span class="sent-es" data-s="0">${esSpans(story.title_es || "")}</span></h1>`;
    const playIcon = `<span class="ra-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>`;
    enHTML += `<div class="read-row" lang="es">
        <button type="button" class="read-all" id="read-all">${playIcon}Escuchar en inglés</button>
        <button type="button" class="read-all read-es" id="read-all-es">${playIcon}Escuchar en español</button>
      </div>`;
    story.paragraphs.forEach(p => {
      enHTML += "<p>"; esHTML += "<p>";
      p.forEach(([e, s], j) => {
        const i = sentences.length;
        sentences.push({ en: e, es: s });
        enHTML += `<span class="sent" data-s="${i}">${wordSpans(e, i)}</span>${j < p.length - 1 ? " " : ""}`;
        esHTML += `<span class="sent-es" data-s="${i}">${esSpans(s)}</span>${j < p.length - 1 ? " " : ""}`;
      });
      enHTML += "</p>"; esHTML += "</p>";
    });
    enHTML += `<div class="story-end" lang="es">
        <p>${state.read[story.id] ? "Ya leíste este cuento. ¡Puedes leerlo otra vez!" : "¿Llegaste al final?"}</p>
        <button type="button" class="btn btn-primary" id="finish-story">${state.read[story.id] ? "Volver a la biblioteca" : "¡Terminé de leer!"}</button>
      </div>
      <p class="story-source" lang="es">Fuente: ${esc(story.source || "")}</p>`;
    en.innerHTML = enHTML; es.innerHTML = esHTML;
    sentences.forEach((s, i) => {
      s.el = $(`.sent[data-s="${i}"]`, en);
      s.esEl = $(`.sent-es[data-s="${i}"]`, es);
      s.words = $$(".w", s.el);
      s.esWords = s.esEl ? $$(".wes", s.esEl) : [];
    });
    words = $$(".w", en);
    words.forEach((w, i) => (w.dataset.i = i));
    $("#read-all").addEventListener("click", () => startReading(1, "en"));
    $("#read-all-es").addEventListener("click", () => startReading(1, "es"));
    $("#finish-story").addEventListener("click", finishStory);
    clearSelection();
  }

  function finishStory() {
    const first = !state.read[story.id];
    state.read[story.id] = Date.now(); persist();
    renderLibrary(); show("library");
    if (first) {
      owlCheer();
      const n = Object.keys(state.read).length;
      setTimeout(() => showTip(`¡Muy bien, ${state.name}! Ya llevas ${n} ${n === 1 ? "cuento" : "cuentos"}. ¿Probamos otro?`), 350);
    }
  }

  /* ---------- reader toolbar ---------- */
  $$(".seg-btn").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  function setMode(m) {
    mode = m;
    $$(".seg-btn").forEach(b => { const on = b.dataset.mode === m; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    clearSelection(); closeBubble();
    if (m === "phrase") showTip("Modo frase: toca la primera palabra y después la última. También puedes mantener el dedo y arrastrar.");
    else closeTip();
  }
  $("#toggle-es").addEventListener("click", () => setSplit(!state.split));
  function setSplit(on) {
    state.split = on; persist();
    $("#toggle-es").setAttribute("aria-pressed", on);
    $("#pane-es").hidden = !on;
    $("#panes").classList.toggle("split", on);
    if (on) {
      const marked = $(".sent-es.mark, .sent-es.speaking", $("#page-es"));
      if (marked) scrollIntoPane(marked, $("#pane-es"));
    }
  }

  /* ---------- selection ---------- */
  let selA = -1, selB = -1, anchor = -1;
  function clearSelection() {
    $$(".w.sel, .w.anchor").forEach(w => w.classList.remove("sel", "anchor"));
    $$(".sent-es.mark").forEach(s => s.classList.remove("mark"));
    selA = selB = anchor = -1;
  }
  function paintSelection(a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    $$(".w.sel, .w.anchor").forEach(w => w.classList.remove("sel", "anchor"));
    for (let i = lo; i <= hi; i++) words[i].classList.add("sel");
    selA = lo; selB = hi;
  }
  function selectionSentences() {
    const set = new Set();
    for (let i = selA; i <= selB; i++) set.add(+words[i].dataset.s);
    return [...set].sort((a, b) => a - b);
  }
  function markSpanish(sIdx) {
    $$(".sent-es.mark").forEach(s => s.classList.remove("mark"));
    sIdx.forEach(i => sentences[i] && sentences[i].esEl && sentences[i].esEl.classList.add("mark"));
    if (state.split && sIdx.length) scrollIntoPane(sentences[sIdx[0]].esEl, $("#pane-es"));
  }
  function selectionText() {
    // original text between first and last selected word, within / across sentences
    const parts = [];
    let cur = null;
    for (let i = selA; i <= selB; i++) {
      const w = words[i], s = +w.dataset.s;
      if (!cur || cur.s !== s) { cur = { s, from: +w.dataset.c, to: +w.dataset.c + w.textContent.length }; parts.push(cur); }
      else cur.to = +w.dataset.c + w.textContent.length;
    }
    return parts.map(p => sentences[p.s].en.slice(p.from, p.to)).join(" ");
  }

  function finishSelection() {
    if (selA < 0) return;
    const sIdx = selectionSentences();
    markSpanish(sIdx);
    if (selA === selB) openWordBubble(words[selA]);
    else openPhraseBubble();
  }

  // Pointer handling: tap = word; drag (mouse) or long-press + drag (touch) = phrase
  const enPage = $("#page-en");
  let press = null;
  const wordAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.classList && el.classList.contains("w") ? el : null; };

  enPage.addEventListener("pointerdown", e => {
    const w = e.target.closest(".w"); if (!w) return;
    if (reading.on) pauseReading();
    press = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, start: +w.dataset.i, dragging: false, timer: null, moved: false };
    if (e.pointerType === "mouse") return;
    press.timer = setTimeout(() => {
      if (!press || press.moved) return;
      press.dragging = true;
      closeBubble();
      paintSelection(press.start, press.start);
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) { /* ignore */ }
    }, 380);
  });
  enPage.addEventListener("pointermove", e => {
    if (!press || e.pointerId !== press.id) return;
    const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (press.type === "mouse") {
      if (e.buttons !== 1) return;
      if (!press.dragging && dist > 6) { press.dragging = true; closeBubble(); }
    } else if (!press.dragging) {
      if (dist > 10) { press.moved = true; clearTimeout(press.timer); }
      return;
    }
    if (press.dragging) {
      const w = wordAt(e.clientX, e.clientY);
      if (w) paintSelection(press.start, +w.dataset.i);
    }
  });
  // while long-press dragging on touch, stop the page from scrolling
  enPage.addEventListener("touchmove", e => { if (press && press.dragging) e.preventDefault(); }, { passive: false });
  const endPress = e => {
    if (!press || (e && e.pointerId !== press.id)) return;
    clearTimeout(press.timer);
    const p = press; press = null;
    if (p.dragging) { finishSelection(); return; }
    if (p.moved || (e && e.type === "pointercancel")) return;
    tapWord(p.start);
  };
  enPage.addEventListener("pointerup", endPress);
  enPage.addEventListener("pointercancel", endPress);
  enPage.addEventListener("contextmenu", e => { if (e.target.closest(".w")) e.preventDefault(); });

  function tapWord(i) {
    if (mode === "phrase") {
      if (anchor < 0 || selA >= 0 && selB > selA) {
        clearSelection(); closeBubble();
        anchor = i; words[i].classList.add("anchor");
        showTip("Ahora toca la última palabra de la frase.");
        return;
      }
      closeTip();
      paintSelection(anchor, i); anchor = -1;
      finishSelection();
      return;
    }
    if (selA === i && selB === i && !$("#bubble").hidden) { closeBubble(); clearSelection(); return; }
    paintSelection(i, i);
    finishSelection();
  }

  /* ---------- bubble ---------- */
  const bubble = $("#bubble");
  let bubbleData = null;

  function openWordBubble(wEl) {
    const word = wEl.textContent;
    const d = lookup(word);
    bubbleData = { kind: "word", text: word, d, key: norm(word) };
    bubble.classList.remove("phrase");
    $("#bubble-word").textContent = word;
    $("#bubble-pron").innerHTML = pronHTML(d.pron) + (d.known ? "" : `<span class="guess">(más o menos — esta palabra aún no está en mi diccionario)</span>`);
    $("#act-mean-label").textContent = "Significado";
    $("#act-save").hidden = false;
    $("#act-save").setAttribute("aria-pressed", !!state.saved[bubbleData.key]);
    resetMeaning();
    placeBubble(wEl);
    sayWord(word, { button: $("#act-listen") });
  }

  function openPhraseBubble() {
    const text = selectionText();
    const prons = [];
    for (let i = selA; i <= selB; i++) prons.push(`<span class="pw">${pronHTML(lookup(words[i].textContent).pron, true)}</span>`);
    bubbleData = { kind: "phrase", text, sIdx: selectionSentences(), a: selA, b: selB };
    bubble.classList.add("phrase");
    $("#bubble-word").textContent = text;
    $("#bubble-pron").innerHTML = prons.join(" ");
    $("#act-mean-label").textContent = "En español";
    $("#act-save").hidden = true;
    resetMeaning();
    placeBubble(words[selB]);
    sayPhrase(text, selA, selB, { button: $("#act-listen") });
  }

  function resetMeaning() {
    $("#bubble-meaning").hidden = true;
    $("#act-mean").setAttribute("aria-expanded", "false");
    bubble.hidden = false;
    document.body.classList.add("bubble-open");
    closeTip();
  }

  function placeBubble(target) {
    const narrow = window.innerWidth < 600;
    bubble.classList.toggle("sheet-mode", narrow);
    bubble.classList.remove("above", "below");
    bubble.style.left = bubble.style.top = "";
    if (narrow) {
      // make sure the word stays visible above the sheet
      requestAnimationFrame(() => keepAboveSheet(target));
      return;
    }
    const r = target.getBoundingClientRect();
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight, m = 12;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(m, Math.min(left, window.innerWidth - bw - m));
    let top = r.bottom + 14, cls = "below";
    if (top + bh > window.innerHeight - m) { top = r.top - bh - 14; cls = "above"; }
    if (top < m) top = m;
    bubble.classList.add(cls);
    bubble.style.left = left + "px"; bubble.style.top = top + "px";
    bubble.style.setProperty("--tail-x", Math.max(18, Math.min(bw - 36, r.left + r.width / 2 - left - 9)) + "px");
  }

  function keepAboveSheet(target) {
    const pane = target.closest(".pane"); if (!pane) return;
    const r = target.getBoundingClientRect(), pr = pane.getBoundingClientRect();
    const limit = Math.min(pr.bottom, window.innerHeight - bubble.offsetHeight) - 24;
    if (r.bottom > limit) pane.scrollTop += r.bottom - limit + 16;
    else if (r.top < pr.top + 8) pane.scrollTop -= pr.top + 24 - r.top;
  }

  function closeBubble() {
    bubble.hidden = true;
    document.body.classList.remove("bubble-open");
    bubbleData = null;
  }
  $("#bubble-close").addEventListener("click", () => { closeBubble(); clearSelection(); });

  $("#act-listen").addEventListener("click", e => {
    if (!bubbleData) return;
    if (bubbleData.kind === "word") sayWord(bubbleData.text, { button: e.currentTarget });
    else sayPhrase(bubbleData.text, bubbleData.a, bubbleData.b, { button: e.currentTarget });
  });
  $("#act-slow").addEventListener("click", e => {
    if (!bubbleData) return;
    if (bubbleData.kind === "word") sayWord(bubbleData.text, { slow: true, button: e.currentTarget });
    else sayPhrase(bubbleData.text, bubbleData.a, bubbleData.b, { slow: true, button: e.currentTarget });
  });
  $("#act-mean").addEventListener("click", e => {
    if (!bubbleData) return;
    const box = $("#bubble-meaning");
    const open = box.hidden;
    box.hidden = !open;
    e.currentTarget.setAttribute("aria-expanded", open);
    if (!open) return;
    if (bubbleData.kind === "word") {
      const d = bubbleData.d;
      box.innerHTML = d.mean
        ? esc(d.mean)
        : `Todavía no tengo esta palabra.<span class="m-note"><a href="https://translate.google.com/?sl=en&tl=es&text=${encodeURIComponent(bubbleData.text)}" target="_blank" rel="noopener">Buscarla en el traductor</a></span>`;
      const s = +words[selA].dataset.s;
      if (sentences[s] && sentences[s].es) box.innerHTML += `<span class="m-note">En la frase: «${esc(sentences[s].es)}»</span>`;
    } else {
      box.innerHTML = bubbleData.sIdx.map(i => esc(sentences[i].es)).join(" ") +
        `<span class="m-note">${state.split ? "Está marcado en verde en el texto en español." : "Toca «Español al lado» para verlo marcado en el cuento."}</span>`;
    }
    if (selB >= 0) {
      if (bubble.classList.contains("sheet-mode")) keepAboveSheet(words[selB]); else placeBubble(words[selB]);
    }
  });
  $("#act-save").addEventListener("click", e => {
    if (!bubbleData || bubbleData.kind !== "word") return;
    const k = bubbleData.key;
    if (state.saved[k]) { delete state.saved[k]; toast("Quitada de Mis palabras"); }
    else { state.saved[k] = { w: bubbleData.text, p: bubbleData.d.pron, m: bubbleData.d.mean || "", t: Date.now() }; toast("★ Guardada en Mis palabras"); }
    persist();
    e.currentTarget.setAttribute("aria-pressed", !!state.saved[k]);
  });

  document.addEventListener("pointerdown", e => {
    if (bubble.hidden) return;
    if (e.target.closest("#bubble") || e.target.closest(".w") || e.target.closest(".seg")) return;
    closeBubble(); if (mode === "word") clearSelection();
  });
  window.addEventListener("resize", () => { if (!bubble.hidden && selB >= 0) placeBubble(words[selB]); });
  $$(".pane").forEach(p => p.addEventListener("scroll", () => {
    if (!bubble.hidden && !bubble.classList.contains("sheet-mode") && selB >= 0) placeBubble(words[selB]);
  }, { passive: true }));

  /* ------------------------------------------------------------------ */
  /*  Read the whole story aloud, following along                        */
  /* ------------------------------------------------------------------ */
  const reading = { on: false, paused: false, s: 1, token: 0, lang: "en" };
  const playbar = $("#playbar");
  const textOf = (i, lang) => (lang === "es" ? sentences[i].es : sentences[i].en) || "";
  const wordEls = (i, lang) => (lang === "es" ? sentences[i].esWords : sentences[i].words);
  const wordList = (i, lang) => wordEls(i, lang).map(el => ({ el, pos: +el.dataset.c }));
  const recVoiceFor = lang => (lang === "es" ? esVoiceObj() : recVoiceObj());

  function startReading(from = 1, lang = "en") {
    if (!synth && !recVoiceFor(lang)) { toast("Este navegador no tiene voces para leer en voz alta."); return; }
    closeBubble(); clearSelection(); closeTip();
    stopRec(); stopEstimate();
    if (synth) synth.cancel();
    if (lang === "es" && !state.split) setSplit(true);   // show the Spanish text being read
    reading.on = true; reading.paused = false; reading.s = from; reading.lang = lang;
    playbar.hidden = false; playbar.classList.remove("paused");
    $(".pb-title").textContent = lang === "es" ? "Leyendo en español" : "Leyendo en inglés";
    document.body.classList.add("reading-aloud");
    $("#pb-speed").textContent = RATES.find(r => r.id === state.settings.rate)?.label || "Normal";
    // recorded audio must start inside the tap (iOS); the device voice needs a short delay (Chrome)
    if (recVoiceFor(lang)) speakSentence(); else setTimeout(speakSentence, 80);
  }

  function recSentence(i, lang) {
    const v = recVoiceFor(lang), ws = wordEls(i, lang);
    const bd = v && v.sent && v.sent[story.id] && v.sent[story.id][i];
    return bd && bd.length === ws.length + 1 ? { src: sentSrc(v, story.id, i), b: bd, words: ws } : null;
  }

  function speakSentence() {
    if (!reading.on || reading.paused) return;
    if (reading.s >= sentences.length) { endReading(); return; }
    const i = reading.s, lang = reading.lang;
    if (!textOf(i, lang).trim()) { reading.s++; speakSentence(); return; }
    const my = ++reading.token;
    paintSpeaking(i);
    $("#pb-fill").style.width = Math.round((i / (sentences.length - 1)) * 100) + "%";
    const next = () => {
      if (my !== reading.token || !reading.on || reading.paused) return;
      reading.s++;
      setTimeout(speakSentence, 220);
    };
    const rs = recSentence(i, lang);
    if (rs) {
      playRec([{ src: rs.src, b: rs.b, words: rs.words }], {
        rate: recRate(state.settings.rate),
        onword: highlightByTime,
        onend: next,
        onfail: () => { if (my === reading.token) speakDevice(i, lang, my, next); },
      });
      return;
    }
    speakDevice(i, lang, my, next);
  }

  function speakDevice(i, lang, my, next) {
    if (!synth) { stopReading(); toast("Este navegador no tiene voces para leer en voz alta."); return; }
    const u = makeUtterance(textOf(i, lang), state.settings.rate, lang);
    trackWords(u, wordList(i, lang), () => my === reading.token);
    u.onend = () => { if (my !== reading.token) return; stopEstimate(); next(); };
    u.onerror = u.onend;
    synth.speak(u);
  }

  function paintSpeaking(i) {
    $$(".sent.speaking, .sent-es.speaking").forEach(s => s.classList.remove("speaking"));
    clearSpoken();
    const s = sentences[i];
    s.el.classList.add("speaking");
    if (s.esEl) s.esEl.classList.add("speaking");
    scrollIntoPane(s.el, $("#pane-en"));
    if (state.split && s.esEl) scrollIntoPane(s.esEl, $("#pane-es"));
  }

  function pauseReading() {
    if (!reading.on) return;
    reading.paused = true; reading.token++; stopEstimate();
    stopRec();
    synth && synth.cancel();
    playbar.classList.add("paused");
    $("#pb-toggle").setAttribute("aria-label", "Seguir leyendo");
  }
  function resumeReading() {
    if (!reading.on) return;
    closeBubble(); clearSelection();
    reading.paused = false; playbar.classList.remove("paused");
    $("#pb-toggle").setAttribute("aria-label", "Pausar");
    speakSentence();
  }
  function stopReading(hideBar = true) {
    if (!reading.on) return;
    reading.on = false; reading.paused = false; reading.token++; stopEstimate();
    stopRec();
    synth && synth.cancel();
    $$(".sent.speaking, .sent-es.speaking").forEach(s => s.classList.remove("speaking"));
    clearSpoken();
    playbar.hidden = true;
    document.body.classList.remove("reading-aloud");
  }
  function endReading() {
    stopReading();
    $("#pb-fill").style.width = "100%";
    owlCheer();
    showTip("¡Fin del cuento! Ahora intenta leerlo tú solo. Si una palabra se te olvida, tócala.");
  }
  $("#pb-toggle").addEventListener("click", () => (reading.paused ? resumeReading() : pauseReading()));
  $("#pb-stop").addEventListener("click", () => stopReading());
  $("#pb-speed").addEventListener("click", () => {
    const idx = RATES.findIndex(r => r.id === state.settings.rate);
    const next = RATES[(idx + 1) % RATES.length];
    state.settings.rate = next.id; persist();
    $("#pb-speed").textContent = next.label;
    renderSettings();
    if (reading.on && !reading.paused) { reading.token++; stopRec(); stopEstimate(); synth && synth.cancel(); setTimeout(speakSentence, 100); }
  });
  // double-tap a sentence to start reading from there (English or Spanish side)
  enPage.addEventListener("dblclick", e => {
    const s = e.target.closest(".sent"); if (!s) return;
    startReading(Math.max(1, +s.dataset.s), "en");
  });
  $("#page-es").addEventListener("dblclick", e => {
    const s = e.target.closest(".sent-es"); if (!s) return;
    startReading(Math.max(1, +s.dataset.s), "es");
  });

  function scrollIntoPane(el, pane) {
    if (!el || !pane || pane.hidden) return;
    const r = el.getBoundingClientRect(), pr = pane.getBoundingClientRect();
    if (r.top < pr.top + 60 || r.bottom > pr.bottom - 120) {
      pane.scrollBy({ top: r.top - pr.top - pr.height * 0.33, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Settings (font, size, spacing, background, voice, speed)           */
  /* ------------------------------------------------------------------ */
  function applySettings() {
    const st = state.settings, b = document.body;
    document.documentElement.style.setProperty("--read-size", st.size + "px");
    document.documentElement.style.setProperty("--read-line", st.line);
    b.dataset.font = st.font;
    if (st.theme === "auto") delete b.dataset.reader; else b.dataset.reader = st.theme;
  }
  function optButtons(list, current, attr, extra = () => "") {
    return list.map(o => `<button type="button" role="radio" class="opt" data-${attr}="${o.id}" aria-checked="${String(o.id) === String(current)}" ${extra(o)}>${o.label}</button>`).join("");
  }
  function renderSettings() {
    const st = state.settings;
    $("#size-range").value = st.size;
    $("#line-opts").innerHTML = optButtons(LINES, st.line, "line");
    $("#font-opts").innerHTML = optButtons(FONTS, st.font, "font", o => `style="font-family:${o.family}"`);
    $("#theme-opts").innerHTML = optButtons(READER_THEMES, st.theme, "theme", o => `style="background:${o.bg};color:${o.fg}" aria-label="Fondo ${o.label}"`);
    $("#rate-opts").innerHTML = optButtons(RATES, st.rate, "rate");
    renderVoiceList();
    renderEsVoiceList();
    renderVoiceSelect();
  }
  function renderEsVoiceList() {
    const row = $("#voice-list-es"), cur = esVoiceObj(), dev = currentEsVoice();
    const playBtn = (id, name) => `<button type="button" class="voice-play" data-preview-es="${esc(id)}" aria-label="Escuchar a ${esc(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>`;
    const card = (id, face, name, meta, on, extra) => `
      <div class="voice">
        <button type="button" role="radio" class="voice-pick" data-esvoice="${esc(id)}" aria-checked="${on}">
          <span class="voice-face" aria-hidden="true">${face}</span>
          <span class="voice-txt"><b>${esc(name)}</b><small>${esc(meta)}</small></span>
        </button>${extra}
      </div>`;
    row.innerHTML = recEs.map(v => card(v.id, VOICE_FACES[v.gender] || "🙂", v.name, `voz grabada · ${v.gender === "m" ? "hombre" : "mujer"}`, !!cur && cur.id === v.id, playBtn(v.id, v.name))).join("")
      + card("device", "📱", "Este dispositivo", dev ? dev.name : "voz del sistema", !cur, playBtn("device", "la voz del dispositivo"));
  }
  const VOICE_FACES = { f: "👩", m: "👨" };
  function renderVoiceList() {
    const row = $("#voice-list"), cur = recVoiceObj();
    if (!recVoices.length) { row.hidden = true; $("#device-voice").hidden = false; $("#lbl-voice").textContent = "Voz en inglés (de este dispositivo)"; return; }
    row.hidden = false;
    const card = (id, face, name, meta, on, previewBtn) => `
      <div class="voice">
        <button type="button" role="radio" class="voice-pick" data-voice="${esc(id)}" aria-checked="${on}">
          <span class="voice-face" aria-hidden="true">${face}</span>
          <span class="voice-txt"><b>${esc(name)}</b><small>${esc(meta)}</small></span>
        </button>${previewBtn}
      </div>`;
    row.innerHTML = recVoices.map(v => card(v.id, VOICE_FACES[v.gender] || "🙂", v.name,
      `${v.accent === "uk" ? "🇬🇧 Reino Unido" : "🇺🇸 EE.UU."} · ${v.gender === "m" ? "hombre" : "mujer"}`,
      !!cur && cur.id === v.id,
      `<button type="button" class="voice-play" data-preview="${esc(v.id)}" aria-label="Escuchar a ${esc(v.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>`)).join("")
      + card("device", "📱", "Este dispositivo", "voz del sistema", !cur, "");
    $("#device-voice").hidden = !!cur;
  }
  function renderVoiceSelect() {
    const sel = $("#voice-select"); if (!sel) return;
    const best = currentVoice();
    if (!synth || !voices.length) {
      sel.innerHTML = `<option>Sin voces en inglés</option>`; sel.disabled = true;
      $("#voice-hint").textContent = synth ? "Este dispositivo no muestra voces en inglés todavía. Puedes instalarlas en Ajustes > Accesibilidad > Texto a voz." : "Este navegador no puede leer en voz alta.";
      return;
    }
    sel.disabled = false;
    sel.innerHTML = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))
      .map(v => `<option value="${esc(v.voiceURI)}" ${best && v.voiceURI === best.voiceURI ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("");
    $("#voice-hint").textContent = "Las voces “Google”, “Natural” o “Enhanced” suenan más reales.";
  }
  $("#size-range").addEventListener("input", e => { state.settings.size = +e.target.value; applySettings(); persist(); });
  $("#size-down").addEventListener("click", () => { state.settings.size = Math.max(16, state.settings.size - 2); applySettings(); renderSettings(); persist(); });
  $("#size-up").addEventListener("click", () => { state.settings.size = Math.min(40, state.settings.size + 2); applySettings(); renderSettings(); persist(); });
  $("#settings").addEventListener("click", e => {
    const o = e.target.closest(".opt"); if (!o) return;
    const st = state.settings;
    if (o.dataset.line) st.line = +o.dataset.line;
    if (o.dataset.font) st.font = o.dataset.font;
    if (o.dataset.theme) st.theme = o.dataset.theme;
    if (o.dataset.rate) { st.rate = +o.dataset.rate; previewVoice(recVoiceObj()); }
    applySettings(); renderSettings(); persist();
  });
  $("#voice-list").addEventListener("click", e => {
    const pv = e.target.closest("[data-preview]");
    if (pv) { previewVoice(recVoices.find(v => v.id === pv.dataset.preview)); return; }
    const pick = e.target.closest("[data-voice]"); if (!pick) return;
    state.settings.recVoice = pick.dataset.voice; persist();
    renderVoiceList();
    previewVoice(recVoiceObj());
  });
  $("#voice-list-es").addEventListener("click", e => {
    const pv = e.target.closest("[data-preview-es]");
    if (pv) { previewEsVoice(recEs.find(v => v.id === pv.dataset.previewEs) || null); return; }
    const pick = e.target.closest("[data-esvoice]"); if (!pick) return;
    state.settings.esVoice = pick.dataset.esvoice; persist();
    renderEsVoiceList();
    previewEsVoice(esVoiceObj());
  });
  $("#voice-select").addEventListener("change", e => {
    state.settings.voice = e.target.value; persist();
    say("Hello! I am ready to read with you.", { rate: state.settings.rate });
  });
  function openSettings() {
    renderSettings();
    $("#settings").hidden = false; $("#settings-backdrop").hidden = false;
    document.body.classList.add("sheet-open");
    closeBubble(); closeTip();
  }
  function closeSettings() {
    $("#settings").hidden = true; $("#settings-backdrop").hidden = true;
    document.body.classList.remove("sheet-open");
  }
  $("#open-settings").addEventListener("click", openSettings);
  $("#settings-done").addEventListener("click", closeSettings);
  $("#settings-backdrop").addEventListener("click", closeSettings);

  /* ------------------------------------------------------------------ */
  /*  Profe Plumas tips + toast                                          */
  /* ------------------------------------------------------------------ */
  const TIPS = {
    library: [
      "Los cuentos con puntitos amarillos ● son fáciles. Con tres ●●● son un desafío.",
      "Si un cuento te gustó, léelo otra vez: la segunda vez es mucho más fácil.",
      "En «Mis palabras» quedan las palabras que guardas con la estrella.",
      "Con la ruedita de arriba puedes cambiar tus gustos.",
    ],
    reader: [
      "Toca una palabra y te digo cómo se lee. La parte en rojo es la que suena más fuerte.",
      "¿Quieres una frase completa? Cambia arriba a «Frase», toca la primera palabra y después la última.",
      "Con «Español al lado» ves el cuento en español. Lo que elijas se marca en verde.",
      "Con «Aa» puedes agrandar la letra y cambiar el color del fondo.",
      "Toca «Escuchar en inglés» y sigue con los ojos la palabra amarilla. ¿No entiendes? Prueba «Escuchar en español».",
      "Cuando veas una «z» en cómo se lee, pon la puntita de la lengua entre los dientes, como en «three».",
      "La «j» en cómo se lee suena suavecita, como cuando echas aire en un vidrio: «jaus» (house).",
    ],
    words: ["Repite cada palabra en voz alta después de escucharla. ¡Así se te queda!"],
    welcome: ["Elige los temas que más te gusten. Después puedes cambiarlos."],
  };
  let tipIdx = 0;
  function showTip(text) {
    $("#owl-tip-text").textContent = text;
    $("#owl-tip").hidden = false;
  }
  function closeTip() { $("#owl-tip").hidden = true; }
  function nextTip() {
    const list = TIPS[currentView] || TIPS.reader;
    showTip(list[tipIdx++ % list.length]);
  }
  $("#owl-fab").addEventListener("click", () => {
    owlCheer();
    if ($("#owl-tip").hidden) nextTip(); else closeTip();
  });
  $("#owl-tip-next").addEventListener("click", nextTip);

  let toastT = null;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 1800);
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeBubble(); clearSelection(); closeSettings(); closeTip(); }
    if (e.key === " " && currentView === "reader" && reading.on && e.target === document.body) { e.preventDefault(); reading.paused ? resumeReading() : pauseReading(); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseReading(); });

  /* ------------------------------------------------------------------ */
  /*  Start                                                              */
  /* ------------------------------------------------------------------ */
  applySettings();
  setSplit(!!state.split);
  // Greeting screen: browsers only allow sound after a tap, so the greeting is spoken on the button.
  const greetName = () => (state.name || "Camilo").trim() || "Camilo";
  const greetingText = () => `Hello ${greetName()}, let's read beautiful stories together!`;
  function renderSplash() {
    const h = $("#splash-hello"), n = greetName();
    h.textContent = "";
    h.append("Hello ");
    const sp = document.createElement("span"); sp.textContent = n; h.append(sp);
    h.append(", let's read beautiful stories together!");
    $("#splash-es").textContent = `Hola ${n}, ¡leamos hermosos cuentos juntos!`;
  }
  function speakGreeting() {
    const v = recVoiceObj();
    const fallback = () => say(greetingText(), { rate: state.settings.rate });
    if (v && v.greeting && norm(v.greetName || "") === norm(greetName())) {
      playRec([{ src: `${AUD.base}${v.id}/greeting.mp3` }], { rate: recRate(state.settings.rate), onfail: fallback });
    } else fallback();
  }
  function enterApp() {
    if (state.onboarded) { renderLibrary(); show("library"); }
    else { renderWelcome(); show("welcome"); }
  }
  $("#splash-go").addEventListener("click", () => {
    enterApp();          // first: show() stops any sound from the previous screen
    speakGreeting();     // then speak, still inside the tap
    owlCheer();
  });
  renderSplash();
  show("splash");

  // Expose a tiny API for debugging / tests
  window.CamiloReading = { openStory, lookup, state };
})();
