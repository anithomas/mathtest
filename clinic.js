/* LogicManse Mistake Clinic: one shared module used by every course so the experience stays identical.

   What it does
   - Mistake cards: the slips that cost the most marks, with the wrong answer, why it fails, the fix and a redo.
   - Self-learning loop, driven only by the student's own answers (no AI, nothing leaves the browser except the
     student's own progress document):
       1. Every missed question is logged ("My mistake log"), tagged or not, with the option that was chosen.
       2. A miss on a question tagged with a card (q.mx) reopens that card and counts toward its priority.
       3. Priority = recent misses (half-life one week) + open + due-for-review. The top items become "Your focus".
       4. Untagged misses are grouped by unit; two or more recent misses in one unit become a focus item too.
       5. A fixed card returns for review after 1, 3, 7 and 21 days (spaced repetition).
       6. "Smart review" builds a quiz from the focus cards plus the questions still unresolved in the log.
   - Pure data in, plain HTML out. The course supplies an adapter (see create()) so any quiz engine can use it.

   Stored on the student's own progress doc (the same doc the course already syncs):
     store.clinic = { [cardId]: { f: lastFixed, m: lastMissed, b: box 0-3, h: [recent miss times] } }
     store.mlog   = { [questionId]: { n: misses, t: lastMiss, c: chosenOption|typed value, r: resolvedAt } } */
(function (global) {
  "use strict";
  const DAY = 864e5, BOX = [1, 3, 7, 21], HALF = 7 * DAY, LOG_CAP = 120, H_CAP = 6;
  const CSS = `
.mx-block,.mx-card{border:1px solid var(--line,#e2ddd0);border-radius:12px;background:var(--card,#fff);margin:8px 0}
.mx-block>summary,.mx-card>summary{cursor:pointer;padding:10px 14px;font-weight:600;color:var(--teal-deep,#14574f);list-style:none;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mx-block>summary::-webkit-details-marker,.mx-card>summary::-webkit-details-marker{display:none}
.mx-block>summary::before,.mx-card>summary::before{content:"▸";display:inline-block;transition:transform .15s}
.mx-block[open]>summary::before,.mx-card[open]>summary::before{transform:rotate(90deg)}
.mx-block>.mx-card{margin:6px 10px}
.mx-card.open{border-color:#e76f51;box-shadow:0 0 0 2px rgba(231,111,81,.15)}
.mx-card.due{border-color:#d9a21b;box-shadow:0 0 0 2px rgba(217,162,27,.18)}
.mx-card.fixed{border-color:#7fa37f;background:#f6fbf7}
.mx-t{flex:1;min-width:160px}
.mx-body{padding:0 14px 14px}
.mx-row{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;margin:6px 0;background:var(--parchment,#f6f2e8)}
.mx-row.bad{background:#fdf0ec}.mx-row.good{background:#e8f3ed}
.mx-k{font-size:.78rem;font-weight:700;color:var(--ink-soft,#5b6670);text-transform:uppercase;letter-spacing:.03em}
.mx-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.mx-recover{margin-top:10px}
.mx-bar{height:10px;border-radius:6px;background:var(--parchment-deep,#ebe5d4);overflow:hidden;margin:8px 0}.mx-bar i{display:block;height:100%;background:var(--teal,#2a9d8f)}
.mx-focus{border:1.5px solid var(--teal,#2a9d8f);border-radius:12px;padding:10px 14px;margin:10px 0;background:var(--card,#fff)}
.mx-focus h4{margin:0 0 6px}
.mx-focus .fi{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line,#e2ddd0)}
.mx-focus .fi:first-of-type{border-top:0}
.mx-focus .fi span.t{flex:1;min-width:150px}
.mx-log{margin:6px 0}.mx-log .li{padding:8px 10px;border:1px solid var(--line,#e2ddd0);border-radius:10px;margin:6px 0;background:var(--card,#fff)}
.mx-log .li .q{font-weight:600}.mx-log .li .a{font-size:.88rem;margin-top:4px}
`;

  function create(cfg) {
    // cfg: course, store(), persist(), cards[], questions(), view(q)->{id,unit,prompt,options,correct,explain[],type,tag,dx},
    //      fmt(s)->html, units[{id,label}], openLesson(id), lessonLabel(id), startQuiz(key), openCard(id), refresh(), toast(msg)
    if (!document.getElementById("lm-clinic-css")) {
      const st = document.createElement("style"); st.id = "lm-clinic-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    const MX = {}; (cfg.cards || []).forEach(m => (MX[m.id] = m));
    const fmt = cfg.fmt || (s => String(s));
    const checked = {}, openSet = new Set();
    let filter = "all";
    const S = () => cfg.store();
    const now = () => Date.now();

    function normalize() { const s = S(); s.clinic = s.clinic || {}; s.mlog = s.mlog || {}; }
    function card(id) { normalize(); return S().clinic[id] || {}; }
    function dueNow(c) { return !!(c.f && c.f >= (c.m || 0) && now() - c.f > BOX[Math.min(c.b || 0, BOX.length - 1)] * DAY); }
    function stateOf(id) {
      const c = card(id);
      if (!c.f && !c.m) return "new";
      if (c.m && c.m > (c.f || 0)) return "open";
      return dueNow(c) ? "due" : "fixed";
    }
    function mark(id, kind) {
      if (!MX[id]) return; normalize();
      const s = S(), prev = s.clinic[id] || {}, c = (s.clinic[id] = Object.assign({}, prev)), t = now();
      if (kind === "m") { c.m = t; c.b = 0; c.h = (c.h || []).concat(t).slice(-H_CAP); }
      else { c.b = prev.f && prev.f >= (prev.m || 0) && dueNow(prev) ? Math.min((prev.b || 0) + 1, BOX.length - 1) : (prev.b || 0); c.f = t; }
      cfg.persist();
    }
    function view(q) { try { return cfg.view(q); } catch (e) { return null; } }

    /* ---- logging: called once per answered question ---- */
    function record(q, correct, chosen) {
      const v = view(q); if (!v || v.type === "write" || !v.id) return;
      normalize(); const s = S(), t = now();
      if (!correct) {
        const e = s.mlog[v.id] = Object.assign({ n: 0 }, s.mlog[v.id]);
        e.n++; e.t = t; e.c = chosen == null ? null : chosen; delete e.r;
        if (v.tag && MX[v.tag]) mark(v.tag, "m");
        const ids = Object.keys(s.mlog);
        if (ids.length > LOG_CAP) {
          ids.sort((a, b) => ((s.mlog[a].r ? 0 : 1) - (s.mlog[b].r ? 0 : 1)) || ((s.mlog[a].r || s.mlog[a].t) - (s.mlog[b].r || s.mlog[b].t)));
          ids.slice(0, ids.length - LOG_CAP).forEach(id => delete s.mlog[id]);
        }
      } else if (s.mlog[v.id] && !s.mlog[v.id].r) { s.mlog[v.id] = Object.assign({}, s.mlog[v.id], { r: t }); }
      cfg.persist();
    }

    /* ---- self-learning: what should the student work on now? ---- */
    function cardScore(m) {
      const c = card(m.id), t = now(); let sc = 0;
      (c.h || []).forEach(h => { sc += 2 * Math.pow(0.5, (t - h) / HALF); });
      const st = stateOf(m.id);
      if (st === "open") sc += 3; else if (st === "due") sc += 2;
      return sc;
    }
    function unresolved() { normalize(); const s = S(); return Object.keys(s.mlog).filter(id => !s.mlog[id].r); }
    function qById() { const m = {}; (cfg.questions() || []).forEach(q => { const v = view(q); if (v) m[v.id] = q; }); return m; }
    function focus() {
      const items = [];
      (cfg.cards || []).forEach(m => { const sc = cardScore(m); if (sc > 0 && stateOf(m.id) !== "fixed") items.push({ kind: "card", m, sc }); });
      const byU = {}, map = qById(), t = now();
      unresolved().forEach(id => {
        const q = map[id]; if (!q) return; const v = view(q), e = S().mlog[id];
        if (v.tag && MX[v.tag]) return; // already covered by its card
        if (t - e.t > 14 * DAY) return;
        (byU[v.unit] = byU[v.unit] || []).push(id);
      });
      Object.keys(byU).forEach(u => { if (byU[u].length >= 2) items.push({ kind: "unit", unit: u, n: byU[u].length, sc: 1 + byU[u].length * 0.4 }); });
      return items.sort((a, b) => b.sc - a.sc).slice(0, 3);
    }
    function unitLabel(u) { const x = (cfg.units || []).find(y => y.id === u); return x ? x.label : u; }
    function smartIds() {
      const ids = new Set(), map = qById();
      focus().forEach(f => { if (f.kind === "card") (cfg.questions() || []).forEach(q => { const v = view(q); if (v && v.tag === f.m.id) ids.add(v.id); }); });
      unresolved().forEach(id => ids.add(id));
      return Array.from(ids).filter(id => map[id]);
    }
    function pool(key) {
      const qs = cfg.questions() || [];
      if (key === "clinic") return qs.filter(q => { const v = view(q); return v && v.tag; });
      if (key === "smart") { const s = new Set(smartIds()); const p = qs.filter(q => { const v = view(q); return v && s.has(v.id); }); return p.length ? p : pool("clinic"); }
      if (key && key.indexOf("mx:") === 0) return qs.filter(q => { const v = view(q); return v && v.tag === key.slice(3); });
      return null;
    }
    function isPoolKey(key) { return key === "clinic" || key === "smart" || (key && key.indexOf("mx:") === 0); }
    function label(key) {
      if (key === "clinic") return "Mistake Clinic";
      if (key === "smart") return "Smart review";
      if (key && key.indexOf("mx:") === 0 && MX[key.slice(3)]) return "Mistake: " + plain(MX[key.slice(3)].t);
      return "";
    }
    function plain(s) { return String(s).replace(/[_^]\{([^}]*)\}/g, "$1").replace(/[{}]/g, ""); }
    function quizOptions() {
      const f = focus(), n = pool("smart").length, c = pool("clinic").length;
      return [["smart", "🧠 Smart review", f.length ? "Questions picked from your own mistakes: " + n + " ready" : "Picks questions from your own mistakes. Misses appear here automatically (" + n + " to start)"],
              ["clinic", "🩹 Mistake Clinic quiz", c + " questions that rehearse the slips students lose the most marks on"]];
    }
    function counts() {
      const all = cfg.cards || [], st = all.map(m => stateOf(m.id));
      return { n: all.length, fixed: st.filter(x => x === "fixed" || x === "due").length, open: st.filter(x => x === "open").length, due: st.filter(x => x === "due").length, log: unresolved().length };
    }

    /* ---- HTML ---- */
    function lessonLink(m) { return m.l && cfg.openLesson ? `<button class="btn ghost" data-mxl="${m.l}" style="padding:8px 16px">Open lesson ${cfg.lessonLabel ? cfg.lessonLabel(m.l) : ""} →</button>` : ""; }
    function cardHTML(m, inLesson) {
      const st = stateOf(m.id), c = checked[m.id], redo = m.redo, nq = pool("mx:" + m.id).length, ch = card(m.id);
      const badge = st === "fixed" ? `<span class="pill teal">✔ Fixed</span>` : st === "due" ? `<span class="pill gold">Review due</span>` : st === "open" ? `<span class="pill coral">Needs another look</span>` : `<span class="pill gold">New</span>`;
      const opts = redo.o.map((o, i) => { let cls = "opt"; if (c !== undefined) { if (i === redo.a) cls += " correct"; else if (i === c) cls += " wrong"; }
        return `<button class="${cls}" data-mxc="${m.id}" data-i="${i}" ${c !== undefined ? "disabled" : ""}><span class="key">${"ABCD"[i]}</span><span class="m">${fmt(o)}</span></button>`; }).join("");
      const missed = (ch.h || []).length;
      return `<details class="mx-card ${st}" data-mx="${m.id}" ${openSet.has(m.id) ? "open" : ""}>
    <summary><span class="mx-t">${fmt(m.t)}</span>${badge}</summary>
    <div class="mx-body">
      ${missed ? `<p class="note" style="margin:6px 0 0">You have missed this ${missed >= H_CAP ? H_CAP + "+" : missed} time${missed === 1 ? "" : "s"} recently.</p>` : ""}
      <div class="mx-row bad"><span class="mx-k">❌ A common answer</span><span class="m">${fmt(m.wrong)}</span></div>
      <div class="mx-row"><span class="mx-k">🤔 Why it goes wrong</span><span class="m">${fmt(m.why)}</span></div>
      <div class="mx-row good"><span class="mx-k">✅ The fix</span><span class="m">${fmt(m.fix)}</span></div>
      <div class="qcheck"><h4 style="margin-top:0">Redo it</h4><p class="m">${fmt(redo.p)}</p><div class="opts" style="margin-top:8px">${opts}</div>
        ${c !== undefined ? `<div class="explain ${c === redo.a ? "good" : "bad"}"><b>${c === redo.a ? "Fixed it! ✔" : "Not quite. Read the fix again, then try once more."}</b> <span class="m">${fmt(redo.why)}</span></div><button class="btn soft" data-mxr="${m.id}" style="margin-top:8px;padding:7px 14px">Try again</button>` : ""}</div>
      <div class="mx-actions">${nq ? `<button class="btn primary" data-mxq="${m.id}" style="padding:8px 16px">Practise this mistake (${nq} questions) →</button>` : ""}${inLesson ? "" : lessonLink(m)}</div>
    </div></details>`;
    }
    function blockHTML(lessonId, ids) {
      const cards = (ids || []).map(id => MX[id]).filter(Boolean); if (!cards.length) return "";
      const open = cards.filter(m => stateOf(m.id) === "open").length;
      return `<details class="mx-block" data-mxblk="${lessonId}" ${openSet.has("b:" + lessonId) ? "open" : ""}><summary>🩹 Common mistakes in this lesson (${cards.length})${open ? ` · <b>${open} need another look</b>` : ""}</summary>${cards.map(m => cardHTML(m, true)).join("")}</details>`;
    }
    function focusHTML() {
      const f = focus();
      if (!f.length) return `<div class="mx-focus"><h4>🎯 Your focus</h4><p class="note" style="margin:0">Nothing needs attention right now. Every time you miss a question it is logged here, repeated slips become your focus, and fixed cards come back for a quick review after a few days.</p></div>`;
      return `<div class="mx-focus"><h4>🎯 Your focus right now</h4>${f.map(x => x.kind === "card"
        ? `<div class="fi"><span class="t"><b>${fmt(x.m.t)}</b><br><span class="note">${stateOf(x.m.id) === "due" ? "Due for a review" : "You have missed this recently"}</span></span><button class="btn primary" data-mxopen="${x.m.id}" style="padding:7px 14px">Review the card</button></div>`
        : `<div class="fi"><span class="t"><b>${unitLabel(x.unit)}</b><br><span class="note">${x.n} recent misses with no card yet</span></span><button class="btn soft" data-mxu="${x.unit}" style="padding:7px 14px">Practise this unit</button></div>`).join("")}
        <div class="mx-actions"><button class="btn primary" data-mxq="smart" style="padding:8px 16px">🧠 Smart review →</button></div></div>`;
    }
    function logHTML() {
      normalize(); const s = S(), map = qById();
      const ids = unresolved().sort((a, b) => s.mlog[b].t - s.mlog[a].t).slice(0, 8).filter(id => map[id]);
      if (!ids.length) return `<details class="mx-block" data-mxlog="1"><summary>📒 My mistake log (0)</summary><p class="note" style="padding:0 14px">Questions you miss are saved here until you get them right.</p></details>`;
      return `<details class="mx-block" data-mxlog="1" ${openSet.has("log") ? "open" : ""}><summary>📒 My mistake log (${unresolved().length})</summary><div class="mx-log" style="padding:0 10px 10px">${ids.map(id => {
        const v = view(map[id]), e = s.mlog[id];
        const mine = v.options && typeof e.c === "number" ? v.options[e.c] : (e.c != null && v.type === "num" ? e.c : null);
        const right = v.options ? v.options[v.correct] : v.answerText;
        return `<div class="li"><div class="q m">${fmt(v.prompt)}</div>
          ${mine != null ? `<div class="a">You answered: <b class="m">${fmt(String(mine))}</b></div>` : ""}
          ${right != null ? `<div class="a">Correct: <b class="m">${fmt(String(right))}</b></div>` : ""}
          ${v.explain && v.explain.length ? `<div class="a m">${v.explain.map(fmt).join(" ")}</div>` : ""}
          <span class="note">Missed ${e.n} time${e.n === 1 ? "" : "s"}</span></div>`; }).join("")}</div></details>`;
    }
    function sectionHTML() {
      normalize(); const k = counts(), pct = k.n ? Math.round(100 * k.fixed / k.n) : 0;
      const unitsWith = (cfg.units || []).filter(u => (cfg.cards || []).some(m => m.u === u.id));
      const list = (cfg.cards || []).filter(m => filter === "all" || m.u === filter);
      return `<p style="font-size:.92rem">These are the slips that cost the most marks on graded tests. Each card shows the typical wrong answer, <b>why</b> it fails, the fix and a quick redo. The clinic also learns from <b>your own</b> answers: every miss is logged, repeated slips become your focus, and fixed cards return for a short review after a few days.</p>
    <div class="mx-bar" role="img" aria-label="${k.fixed} of ${k.n} mistake cards fixed"><i style="width:${pct}%"></i></div>
    <p class="note" style="margin:0 0 8px"><b>${k.fixed} of ${k.n}</b> fixed${k.open ? ` · <b>${k.open} need another look</b>` : ""}${k.due ? ` · <b>${k.due} due for review</b>` : ""}</p>
    ${focusHTML()}${logHTML()}
    <div class="lenrow" style="margin-top:10px">${[["all", "All"]].concat(unitsWith.map(u => [u.id, (u.icon ? u.icon + " " : "") + u.label])).map(([v, l]) => `<button class="lenbtn ${filter === v ? "sel" : ""}" data-mxf="${v}">${l}</button>`).join("")}</div>
    <div style="margin:10px 0"><button class="btn soft" data-mxq="clinic" style="padding:9px 16px">🩹 Quiz me on all these mistakes →</button></div>
    ${list.map(m => cardHTML(m, false)).join("")}`;
    }
    function homeHTML() {
      const k = counts();
      const bits = [];
      if (k.open) bits.push(`<b>${k.open} card${k.open === 1 ? "" : "s"} need another look.</b>`);
      if (k.due) bits.push(`<b>${k.due} due for review.</b>`);
      if (k.log) bits.push(`${k.log} missed question${k.log === 1 ? "" : "s"} to revisit.`);
      return `<div class="card homecard c-prog" data-goclinic="1"><h3>🩹 Mistake Clinic</h3><p>${bits.join(" ")} ${k.fixed} of ${k.n} common mistakes fixed. It learns from your answers and tells you what to work on next.</p><div class="go">Open the clinic →</div></div>`;
    }
    function dxHTML(q, chosen) {
      const v = view(q); if (!v || v.type !== "mc" || !v.dx || chosen == null || chosen === v.correct || !v.dx[chosen]) return "";
      return `<div class="explain hintbox" style="margin-top:8px"><b>🤔 Why that answer is tempting</b><br><span class="m">${fmt(v.dx[chosen])}</span></div>`;
    }
    function recoverHTML(q) {
      const v = view(q), m = v && v.tag && MX[v.tag]; if (!m) return "";
      return `<div class="explain mx-recover"><b>🩹 A common mistake: ${fmt(m.t)}</b>
    <div class="mx-row bad"><span class="mx-k">❌ A common answer</span><span class="m">${fmt(m.wrong)}</span></div>
    <div class="mx-row good"><span class="mx-k">✅ The fix</span><span class="m">${fmt(m.fix)}</span></div>
    <button class="btn soft" data-mxopen="${m.id}" style="margin-top:8px;padding:7px 14px">Open this card in the Mistake Clinic</button></div>`;
    }

    /* ---- events ---- */
    function wire(root) {
      const $$ = sel => root.querySelectorAll(sel);
      $$("[data-mxc]").forEach(b => b.onclick = () => {
        const id = b.dataset.mxc, i = +b.dataset.i, ok = i === MX[id].redo.a;
        checked[id] = i; openSet.add(id); mark(id, ok ? "f" : "m"); cfg.refresh();
        if (ok && cfg.toast) cfg.toast("Mistake fixed ✔ +15 XP");
      });
      $$("[data-mxr]").forEach(b => b.onclick = () => { delete checked[b.dataset.mxr]; openSet.add(b.dataset.mxr); cfg.refresh(); });
      $$("[data-mxq]").forEach(b => b.onclick = () => cfg.startQuiz(b.dataset.mxq === "clinic" || b.dataset.mxq === "smart" ? b.dataset.mxq : "mx:" + b.dataset.mxq));
      $$("[data-mxl]").forEach(b => b.onclick = () => cfg.openLesson(b.dataset.mxl));
      $$("[data-mxu]").forEach(b => b.onclick = () => cfg.startQuiz(b.dataset.mxu));
      $$("[data-mxf]").forEach(b => b.onclick = () => { filter = b.dataset.mxf; cfg.refresh(); });
      $$("[data-mxopen]").forEach(b => b.onclick = () => { openSet.add(b.dataset.mxopen); cfg.openCard(b.dataset.mxopen); });
      $$("details.mx-card").forEach(d => d.addEventListener("toggle", () => { if (d.open) openSet.add(d.dataset.mx); else openSet.delete(d.dataset.mx); }));
      $$("details.mx-block").forEach(d => d.addEventListener("toggle", () => { const k = d.dataset.mxblk ? "b:" + d.dataset.mxblk : "log"; if (d.open) openSet.add(k); else openSet.delete(k); }));
      $$("[data-goclinic]").forEach(c => c.onclick = () => cfg.openCard(null));
    }

    /* ---- sync helpers ---- */
    function mergeClinic(a, b) {
      const out = {}; a = a || {}; b = b || {};
      new Set(Object.keys(a).concat(Object.keys(b))).forEach(id => {
        const x = a[id] || {}, y = b[id] || {};
        const newer = Math.max(x.f || 0, x.m || 0) >= Math.max(y.f || 0, y.m || 0) ? x : y;
        out[id] = { f: Math.max(x.f || 0, y.f || 0), m: Math.max(x.m || 0, y.m || 0), b: newer.b || 0, h: Array.from(new Set((x.h || []).concat(y.h || []))).sort((p, q) => p - q).slice(-H_CAP) };
      });
      return out;
    }
    function mergeLog(a, b) {
      const out = {}; a = a || {}; b = b || {};
      new Set(Object.keys(a).concat(Object.keys(b))).forEach(id => {
        const x = a[id], y = b[id]; if (!x || !y) { out[id] = x || y; return; }
        const base = (x.t || 0) >= (y.t || 0) ? x : y, r = Math.max(x.r || 0, y.r || 0);
        out[id] = Object.assign({}, base, { n: Math.max(x.n || 0, y.n || 0) }); delete out[id].r; if (r && r >= (base.t || 0)) out[id].r = r;
      });
      return out;
    }

    return { record, mark, stateOf, counts, focus, pool, isPoolKey, label, quizOptions, sectionHTML, blockHTML, homeHTML, dxHTML, recoverHTML, wire, mergeClinic, mergeLog, normalize, cards: MX };
  }
  global.LMClinic = { create };
})(window);
