/* LogicManse admin analytics: class and per-student progress and section usage, for course administrators.

   Loaded on demand by each course's Admin page (never for students). aggregate() is pure data in, data out;
   render() (added below) draws it as inline-SVG charts and tables. It reads students' saved progress documents,
   which firestore.rules lets administrators read (and never write). Nothing here is sent to Google Analytics. */
(function (global) {
  "use strict";
  const U = global.LMUsage || (typeof require !== "undefined" ? require("./usage.js") : null);
  const DAY = 864e5, WEEKS = 12, BANDS = ["<50", "50-59", "60-69", "70-79", "80-89", "90-100"];
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const num = v => (typeof v === "number" && isFinite(v) ? v : null);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  const round1 = v => Math.round(v * 10) / 10;

  // Whole days since a timestamp: null when there is none, never negative (clock skew or future times give 0).
  function daysSince(ts, now) { return ts ? Math.max(0, Math.floor((now - ts) / DAY)) : null; }

  // The last n ISO weeks ending with the week of `now`, oldest first.
  function lastWeeks(now, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(U.weekKey(now - i * 7 * DAY));
    return out;
  }

  // Least-squares slope of pct against session number, in percentage points per session.
  function slope(ys) {
    const n = ys.length, xm = (n - 1) / 2, ym = mean(ys);
    let num_ = 0, den = 0;
    ys.forEach((y, i) => { num_ += (i - xm) * (y - ym); den += (i - xm) * (i - xm); });
    return den ? num_ / den : 0;
  }

  function summarizeStudent(doc, profile, now) {
    const d = isObj(doc.data) ? doc.data : {};
    const attempts = (Array.isArray(d.attempts) ? d.attempts : []).filter(a => isObj(a) && num(a.pct) !== null)
      .map(a => ({ t: num(a.t) || 0, pct: a.pct, kind: typeof a.kind === "string" ? a.kind : "quiz", strands: isObj(a.strands) ? a.strands : {} }))
      .sort((x, y) => x.t - y.t);
    const unitAcc = {};
    attempts.forEach(a => Object.keys(a.strands).forEach(u => {
      const v = a.strands[u], c = isObj(v) ? num(v.c) : null, t = isObj(v) ? num(v.t) : null;
      if (c === null || t === null) return;
      const row = unitAcc[u] = unitAcc[u] || { c: 0, t: 0, p: 0 };
      row.c += c; row.t += t;
    }));
    Object.keys(unitAcc).forEach(u => { unitAcc[u].p = unitAcc[u].t ? Math.round(100 * unitAcc[u].c / unitAcc[u].t) : 0; });
    let weakest = null;
    Object.keys(unitAcc).filter(u => unitAcc[u].t >= 6).forEach(u => { if (weakest === null || unitAcc[u].p < unitAcc[weakest].p) weakest = u; });
    const pcts = attempts.map(a => a.pct);
    const recent = pcts.slice(-5);
    const mlog = isObj(d.mlog) ? d.mlog : {}, missed = isObj(d.missed) ? d.missed : {};
    const counts = {};
    Object.keys(mlog).forEach(id => { const n = isObj(mlog[id]) ? num(mlog[id].n) : null; if (n) counts[id] = n; });
    Object.keys(missed).forEach(id => { if (missed[id] && !(id in counts)) counts[id] = 1; });
    const lessons = isObj(d.lessons) ? d.lessons : {};
    const email = (profile && profile.email) || (typeof d.email === "string" ? d.email : "");
    return {
      uid: doc.uid,
      name: (profile && profile.displayName) || email || "Unknown student",
      email: email,
      sessions: attempts.length,
      recentAvg: recent.length ? round1(mean(recent)) : null,
      trend: pcts.length >= 3 ? slope(pcts.slice(-10)) : null,
      weakest: weakest,
      lessonsDone: Object.keys(lessons).filter(k => lessons[k]).length,
      cardsReviewed: num(d.reviews) || 0,
      lastActive: attempts.reduce((m, a) => Math.max(m, a.t), 0),
      unitAcc: unitAcc,
      series: attempts.slice(-20).map(a => ({ t: a.t, pct: a.pct, kind: a.kind })),
      topMissed: Object.keys(counts).map(id => ({ id: id, n: counts[id] })).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, 5),
      _counts: counts,
      _attemptTimes: attempts.map(a => a.t),
      _usage: isObj(d.usage) ? d.usage : {},
    };
  }

  function aggregate(docs, profiles, opts) {
    const now = (opts && num(opts.now)) || Date.now(), order = (opts && opts.order) || null;
    const weeks = lastWeeks(now, WEEKS), weekIndex = {};
    weeks.forEach((w, i) => { weekIndex[w] = i; });
    const profs = isObj(profiles) ? profiles : {};
    const students = (Array.isArray(docs) ? docs : []).filter(isObj).map(doc => summarizeStudent(doc, profs[doc.uid], now));

    const sessionsPerWeek = weeks.map(w => ({ week: w, count: 0 }));
    const features = { totals: {}, weekly: weeks.map(w => ({ week: w, counts: {} })) };
    const classUnits = {}, missedTotals = {};
    students.forEach(s => {
      s._attemptTimes.forEach(t => { const i = weekIndex[U.weekKey(t)]; if (i !== undefined && t <= now) sessionsPerWeek[i].count++; });
      Object.keys(s._usage).forEach(w => {
        const i = weekIndex[w], row = s._usage[w];
        if (i === undefined || !isObj(row)) return;
        Object.keys(row).forEach(sec => {
          const n = num(row[sec]); if (!n) return;
          features.totals[sec] = (features.totals[sec] || 0) + n;
          features.weekly[i].counts[sec] = (features.weekly[i].counts[sec] || 0) + n;
        });
      });
      Object.keys(s.unitAcc).forEach(u => { const r = classUnits[u] = classUnits[u] || { c: 0, t: 0 }; r.c += s.unitAcc[u].c; r.t += s.unitAcc[u].t; });
      Object.keys(s._counts).forEach(id => { missedTotals[id] = (missedTotals[id] || 0) + s._counts[id]; });
    });

    const withAvg = students.filter(s => s.recentAvg !== null);
    const band = p => (p < 50 ? 0 : p < 60 ? 1 : p < 70 ? 2 : p < 80 ? 3 : p < 90 ? 4 : 5);
    const histogram = BANDS.map(label => ({ label: label, count: 0 }));
    withAvg.forEach(s => { histogram[band(s.recentAvg)].count++; });
    let unitAcc = Object.keys(classUnits).map(u => ({ unit: u, p: classUnits[u].t ? Math.round(100 * classUnits[u].c / classUnits[u].t) : 0, t: classUnits[u].t }));
    if (order) unitAcc.sort((a, b) => (order.indexOf(a.unit) + 1 || 99) - (order.indexOf(b.unit) + 1 || 99));
    else unitAcc.sort((a, b) => (a.unit < b.unit ? -1 : 1));
    const active = days => students.filter(s => s.lastActive && now - s.lastActive <= days * DAY).length;

    students.forEach(s => { delete s._counts; delete s._attemptTimes; delete s._usage; });
    return {
      students: students,
      overview: {
        total: students.length, active7: active(7), active30: active(30),
        classAvg: withAvg.length ? round1(mean(withAvg.map(s => s.recentAvg))) : null,
        sessionsPerWeek: sessionsPerWeek, histogram: histogram, unitAcc: unitAcc,
        mostMissed: Object.keys(missedTotals).map(id => ({ id: id, n: missedTotals[id] })).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1)).slice(0, 10),
        inactive: students.filter(s => !s.lastActive || now - s.lastActive > 7 * DAY).map(s => s.uid),
      },
      features: features,
    };
  }

  /* ================= presentation helpers (strings, no DOM) ================= */
  const SECTION_LABELS = { home: "Home", quiz: "Quiz", mock: "Exam simulation", progress: "Progress", study: "Study Hub", cheat: "Cheatsheet",
    cards: "Review (flashcards)", notes: "Notes", clinic: "Mistake Clinic", guided: "Guided problems", model: "Interactive models", challenge: "Challenge" };
  const PALETTE = ["#0f6b6e", "#e76f51", "#d9a441", "#7fa37f", "#7fa7c9", "#8e6bb0", "#c4657e", "#8a8f94", "#5b7f95", "#b08968", "#6c8e4e", "#a05a2c"];

  function escapeHtml(v) {
    return String(v === null || v === undefined ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const empty = msg => '<p class="aa-empty">' + escapeHtml(msg) + "</p>";
  const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

  // Horizontal bars: items [{label, value}], opts {max, unit}. Every bar prints its value, so colour is never the only cue.
  function barChartSvg(items, opts) {
    if (!items || !items.length) return empty("No data yet.");
    const max = (opts && opts.max) || Math.max.apply(null, items.map(i => i.value).concat([1])), unit = (opts && opts.unit) || "";
    const rowH = 26, left = 170, W = 440, plot = W - left - 54, H = items.length * rowH + 6;
    const rows = items.map((it, i) => {
      const y = 4 + i * rowH, w = Math.max(0, Math.min(1, it.value / max)) * plot;
      return '<g><title>' + escapeHtml(it.label) + ": " + escapeHtml(it.value) + escapeHtml(unit) + "</title>" +
        '<text x="' + (left - 8) + '" y="' + (y + 15) + '" text-anchor="end" class="aa-lbl">' + escapeHtml(clip(it.label, 27)) + "</text>" +
        '<rect x="' + left + '" y="' + (y + 3) + '" width="' + plot + '" height="14" rx="4" class="aa-track"/>' +
        '<rect x="' + left + '" y="' + (y + 3) + '" width="' + w.toFixed(1) + '" height="14" rx="4" class="aa-bar"/>' +
        '<text x="' + (left + plot + 6) + '" y="' + (y + 15) + '" class="aa-val">' + escapeHtml(it.value) + escapeHtml(unit) + "</text></g>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Bar chart" class="aa-svg">' + rows + "</svg>";
  }

  // Line over points [{label, value}] on a 0-100 scale.
  function lineChartSvg(points, opts) {
    if (!points || !points.length) return empty("No sessions yet.");
    const W = 420, H = 190, L = 34, R = 12, T = 12, B = 24, lo = (opts && opts.min) || 0, hi = (opts && opts.max) || 100;
    const X = i => L + (points.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (points.length - 1)), Y = v => T + (hi - Math.max(lo, Math.min(hi, v))) * (H - T - B) / (hi - lo);
    const grid = [lo, (lo + hi) / 2, hi].map(v => '<line x1="' + L + '" y1="' + Y(v) + '" x2="' + (W - R) + '" y2="' + Y(v) + '" class="aa-grid"/><text x="' + (L - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="aa-lbl">' + Math.round(v) + "</text>").join("");
    const line = points.length > 1 ? '<polyline points="' + points.map((p, i) => X(i).toFixed(1) + "," + Y(p.value).toFixed(1)).join(" ") + '" class="aa-line"/>' : "";
    const dots = points.map((p, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.value).toFixed(1) + '" r="3.5" class="aa-dot"><title>' + escapeHtml(p.label) + ": " + escapeHtml(p.value) + "</title></circle>").join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Line chart" class="aa-svg">' + grid + line + dots +
      '<text x="' + L + '" y="' + (H - 6) + '" class="aa-lbl">' + escapeHtml(points[0].label) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" class="aa-lbl">' + escapeHtml(points[points.length - 1].label) + "</text></svg>";
  }

  function histogramSvg(bins) {
    if (!bins || !bins.some(b => b.count > 0)) return empty("No scores yet.");
    const W = 420, H = 180, L = 10, B = 28, T = 18, max = Math.max.apply(null, bins.map(b => b.count)), slot = (W - L * 2) / bins.length;
    const bars = bins.map((b, i) => {
      const h = b.count / max * (H - B - T), x = L + i * slot + 6;
      return '<g><title>' + escapeHtml(b.label) + ": " + b.count + '</title><rect x="' + x.toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + (slot - 12).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" class="aa-bar"/>' +
        '<text x="' + (x + (slot - 12) / 2).toFixed(1) + '" y="' + (H - B - h - 4).toFixed(1) + '" text-anchor="middle" class="aa-val">' + b.count + "</text>" +
        '<text x="' + (x + (slot - 12) / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="aa-lbl">' + escapeHtml(b.label) + "</text></g>";
    }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Score distribution" class="aa-svg">' + bars + "</svg>";
  }

  // Weekly stacked bars: weeks [{week, counts}], keys [{key, label}]. The legend prints each series total.
  function stackedBarsSvg(weeks, keys) {
    const totals = keys.map(k => weeks.reduce((n, w) => n + (w.counts[k.key] || 0), 0));
    if (!totals.some(n => n > 0)) return empty("No section visits recorded yet.");
    const W = 420, H = 190, L = 10, B = 26, T = 10, slot = (W - L * 2) / weeks.length;
    const max = Math.max.apply(null, weeks.map(w => keys.reduce((n, k) => n + (w.counts[k.key] || 0), 0)).concat([1]));
    const bars = weeks.map((w, i) => {
      let y = H - B; const x = L + i * slot + 4;
      const segs = keys.map((k, ki) => {
        const n = w.counts[k.key] || 0; if (!n) return "";
        const h = n / max * (H - B - T); y -= h;
        return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (slot - 8).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + PALETTE[ki % PALETTE.length] + '"><title>' + escapeHtml(w.week) + " · " + escapeHtml(k.label) + ": " + n + "</title></rect>";
      }).join("");
      return segs + '<text x="' + (x + (slot - 8) / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="aa-lbl">' + escapeHtml(w.week.slice(-3)) + "</text>";
    }).join("");
    const legend = keys.map((k, ki) => totals[ki] ? '<li><i style="background:' + PALETTE[ki % PALETTE.length] + '"></i>' + escapeHtml(k.label) + " <b>" + totals[ki] + "</b></li>" : "").join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Weekly section visits" class="aa-svg">' + bars + '</svg><ul class="aa-legend">' + legend + "</ul>" +
      '<p class="aa-note">Weeks are ISO weeks (' + escapeHtml(weeks[0].week) + " to " + escapeHtml(weeks[weeks.length - 1].week) + ").</p>";
  }

  /* ---------- roster ---------- */
  const COLUMNS = [["name", "Student"], ["sessions", "Sessions"], ["recentAvg", "Recent avg"], ["trend", "Trend"], ["weakest", "Weakest unit"], ["lessonsDone", "Lessons"], ["cardsReviewed", "Cards"], ["lastActive", "Last active"]];
  function sortStudents(students, key, dir) {
    const sign = dir === "desc" ? -1 : 1;
    return students.slice().sort((a, b) => {
      const x = a[key], y = b[key], xn = x === null || x === undefined || x === "", yn = y === null || y === undefined || y === "";
      if (xn || yn) return xn && yn ? 0 : xn ? 1 : -1; // empty values always sink to the bottom
      const c = typeof x === "string" ? String(x).toLowerCase().localeCompare(String(y).toLowerCase()) : x - y;
      return c * sign;
    });
  }
  function trendText(t) { return t === null ? "–" : t > 0.5 ? "▲ +" + t.toFixed(1) : t < -0.5 ? "▼ " + t.toFixed(1) : "▬ steady"; }
  function agoText(ts, now) { const d = daysSince(ts, now); return d === null ? "never" : d === 0 ? "today" : d + "d ago"; }
  function rosterHtml(students, state, now) {
    const q = String(state.filter || "").trim().toLowerCase();
    const rows = sortStudents(students.filter(s => !q || (s.name + " " + s.email).toLowerCase().indexOf(q) !== -1), state.sort, state.dir);
    if (!rows.length) return empty(students.length ? "No student matches that filter." : "No students have saved progress for this course yet.");
    const head = COLUMNS.map(c => '<th scope="col" aria-sort="' + (state.sort === c[0] ? (state.dir === "desc" ? "descending" : "ascending") : "none") + '"><button type="button" data-aa-sort="' + c[0] + '">' + escapeHtml(c[1]) + (state.sort === c[0] ? (state.dir === "desc" ? " ▼" : " ▲") : "") + "</button></th>").join("");
    const body = rows.map(s => {
      const idle = !s.lastActive || now - s.lastActive > 7 * DAY;
      return '<tr data-aa-uid="' + escapeHtml(s.uid) + '" tabindex="0"><th scope="row">' + escapeHtml(s.name) + (idle ? ' <span class="aa-badge">inactive</span>' : "") + "</th><td>" + s.sessions + "</td><td>" + (s.recentAvg === null ? "–" : s.recentAvg + "%") + "</td><td>" + escapeHtml(trendText(s.trend)) + "</td><td>" + escapeHtml(s.weakest || "–") + "</td><td>" + s.lessonsDone + "</td><td>" + s.cardsReviewed + "</td><td>" + escapeHtml(agoText(s.lastActive, now)) + "</td></tr>";
    }).join("");
    return '<div class="aa-scroll"><table class="aa-table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function describeError(e) {
    if (e && (e.code === "permission-denied" || /missing or insufficient permissions/i.test(String(e.message || "")))) {
      return { kind: "denied", message: "Student progress is not readable yet. Deploy the updated Firestore rules with the command firebase deploy --only firestore:rules, then reload this tab." };
    }
    return { kind: "error", message: "Couldn't load analytics: " + ((e && e.message) || "unknown error") };
  }

  /* ================= the Analytics panel (DOM) ================= */
  const CSS = `
.aa{font-size:.92rem;color:var(--ink,#2b3a3a)}
.aa-head{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.aa-head select{padding:7px 10px;border:1.5px solid var(--line,#e6dcc8);border-radius:10px;background:#fff;font:inherit}
.aa-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 12px}
.aa-btn{border:1.5px solid var(--line,#e6dcc8);background:var(--card,#fffdf8);color:inherit;border-radius:999px;padding:6px 14px;font:inherit;font-weight:600;cursor:pointer}
.aa-btn[aria-pressed=true]{background:var(--teal-tint,#e3efef);border-color:var(--teal,#0f6b6e);color:var(--teal-deep,#0a4f52)}
.aa-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px}
.aa-kpi{background:var(--parchment,#faf5ec);border:1px solid var(--line,#e6dcc8);border-radius:12px;padding:10px 12px}
.aa-kpi b{display:block;font-size:1.5rem;font-family:var(--font-mono,monospace);color:var(--teal-deep,#0a4f52)}
.aa-kpi span{font-size:.78rem;color:var(--ink-soft,#5c6b6b)}
.aa-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.aa-card{border:1px solid var(--line,#e6dcc8);border-radius:12px;padding:12px 14px;background:var(--card,#fffdf8);margin-bottom:12px}
.aa-card h4{margin:0 0 6px;font-size:.95rem}
.aa-svg{width:100%;height:auto;display:block}
.aa-lbl{font-size:11px;fill:var(--ink-soft,#5c6b6b)}
.aa-val{font-size:11px;font-weight:700;fill:var(--ink,#2b3a3a)}
.aa-bar{fill:var(--teal,#0f6b6e)}
.aa-track{fill:var(--parchment-deep,#f3ecdd)}
.aa-line{fill:none;stroke:var(--teal-deep,#0a4f52);stroke-width:2.4;stroke-linejoin:round}
.aa-dot{fill:var(--coral,#e76f51)}
.aa-grid{stroke:currentColor;stroke-opacity:.12}
.aa-legend{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.8rem}
.aa-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
.aa-note,.aa-empty{color:var(--ink-soft,#5c6b6b);font-size:.82rem;margin:6px 0}
.aa-scroll{overflow-x:auto}
.aa-table{border-collapse:collapse;width:100%;min-width:640px}
.aa-table th,.aa-table td{padding:7px 8px;border-bottom:1px solid var(--line,#e6dcc8);text-align:left;white-space:nowrap}
.aa-table thead th{position:sticky;top:0;background:var(--card,#fffdf8)}
.aa-table th button{all:unset;cursor:pointer;font-weight:700}
.aa-table tbody tr{cursor:pointer}
.aa-table tbody tr:hover,.aa-table tbody tr:focus{background:var(--teal-tint,#e3efef);outline:none}
.aa-badge{font-size:.7rem;font-weight:700;border-radius:999px;padding:1px 8px;background:var(--coral-tint,#fbe9e3);color:#a2452c;margin-left:4px}
.aa-filter{padding:7px 10px;border:1.5px solid var(--line,#e6dcc8);border-radius:10px;font:inherit;max-width:100%;width:240px}
.aa-err{border:1px solid #e0b8a8;background:var(--coral-tint,#fbe9e3);border-radius:12px;padding:12px 14px}
.aa-list{margin:4px 0 0;padding-left:20px}
.aa-list li{margin:3px 0}
`;
  function injectCss() {
    if (typeof document === "undefined" || document.getElementById("aa-css")) return;
    const st = document.createElement("style"); st.id = "aa-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  const fmtDate = ts => new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  // ctx: {courses:[{id,label,coll}], courseId, fetchCourse(coll)->Promise<{docs,profiles}>, describe(qid)->string, order?, now?}
  // Never throws: every failure is shown inside the container.
  async function render(container, ctx) {
    try {
      injectCss();
      const courses = ctx.courses && ctx.courses.length ? ctx.courses : [{ id: ctx.courseId, label: ctx.courseId, coll: ctx.coll }];
      const st = { courseId: ctx.courseId, tab: "overview", sort: "lastActive", dir: "desc", filter: "", uid: null, data: null, err: null, loading: true };
      const now = () => ctx.now || Date.now();
      const course = () => courses.find(c => c.id === st.courseId) || courses[0];
      const describe = id => { try { return (ctx.describe && ctx.describe(id)) || id; } catch (_) { return id; } };

      const kpis = o => '<div class="aa-kpis">' + [[o.total, "students with progress"], [o.active7, "active in 7 days"], [o.active30, "active in 30 days"], [o.classAvg === null ? "–" : o.classAvg + "%", "class average (last 5 sessions)"]]
        .map(k => '<div class="aa-kpi"><b>' + escapeHtml(k[0]) + "</b><span>" + escapeHtml(k[1]) + "</span></div>").join("") + "</div>";
      const overview = d => {
        const o = d.overview, names = {}; d.students.forEach(s => { names[s.uid] = s.name; });
        return kpis(o) + '<div class="aa-grid2">' +
          '<div class="aa-card"><h4>Sessions per week</h4>' + (o.sessionsPerWeek.some(w => w.count > 0) ? lineChartSvg(o.sessionsPerWeek.map(w => ({ label: w.week, value: w.count })), { max: Math.max(4, ...o.sessionsPerWeek.map(w => w.count)) }) : empty("No sessions yet.")) + '<p class="aa-note">Completed quizzes and exam simulations per week, last 12 weeks.</p></div>' +
          '<div class="aa-card"><h4>Score distribution</h4>' + histogramSvg(o.histogram) + '<p class="aa-note">Each student counted once, by their last 5 sessions.</p></div>' +
          '<div class="aa-card"><h4>Accuracy by unit</h4>' + barChartSvg(o.unitAcc.map(u => ({ label: u.unit, value: u.p })), { max: 100, unit: "%" }) + "</div>" +
          '<div class="aa-card"><h4>Most missed questions</h4>' + (o.mostMissed.length ? '<ol class="aa-list">' + o.mostMissed.map(m => "<li>" + escapeHtml(clip(describe(m.id), 90)) + " <b>×" + m.n + "</b></li>").join("") + "</ol>" : empty("No missed questions recorded yet.")) + "</div>" +
          "</div>" + '<div class="aa-card"><h4>Not active in the last 7 days <span class="aa-badge">' + o.inactive.length + "</span></h4>" +
          (o.inactive.length ? "<p>" + o.inactive.slice(0, 12).map(u => escapeHtml(names[u] || u)).join(", ") + (o.inactive.length > 12 ? " and " + (o.inactive.length - 12) + " more" : "") + "</p>" : empty("Everyone has been active this week.")) + "</div>";
      };
      const features = d => {
        const keys = Object.keys(SECTION_LABELS).map(k => ({ key: k, label: SECTION_LABELS[k] }));
        const items = keys.map(k => ({ label: k.label, value: d.features.totals[k.key] || 0 })).filter(i => i.value > 0).sort((a, b) => b.value - a.value);
        return '<div class="aa-grid2"><div class="aa-card"><h4>Which sections students open</h4>' + barChartSvg(items, { unit: "" }) + '<p class="aa-note">Visits in the last 12 weeks. Visits are counted when a student opens a section.</p></div>' +
          '<div class="aa-card"><h4>Visits by week</h4>' + stackedBarsSvg(d.features.weekly, keys) + "</div></div>";
      };
      const detail = d => {
        const s = d.students.find(x => x.uid === st.uid); if (!s) return "";
        const units = Object.keys(s.unitAcc).map(u => ({ label: u, value: s.unitAcc[u].p }));
        return '<div class="aa-card" data-aa-detail><h4>' + escapeHtml(s.name) + (s.email && s.email !== s.name ? ' <span class="aa-note">' + escapeHtml(s.email) + "</span>" : "") + ' <button type="button" class="aa-btn" data-aa-close>Close</button></h4>' +
          "<p>" + s.sessions + " sessions · recent average " + (s.recentAvg === null ? "–" : s.recentAvg + "%") + " · " + escapeHtml(trendText(s.trend)) + " · " + s.lessonsDone + " lessons · " + s.cardsReviewed + " flashcard reviews · last active " + escapeHtml(agoText(s.lastActive, now())) + "</p>" +
          '<div class="aa-grid2"><div><h4>Score trend</h4>' + lineChartSvg(s.series.map(x => ({ label: fmtDate(x.t) + " · " + x.kind, value: x.pct }))) + "</div><div><h4>Accuracy by unit</h4>" + barChartSvg(units, { max: 100, unit: "%" }) + "</div></div>" +
          "<h4>Most missed</h4>" + (s.topMissed.length ? '<ol class="aa-list">' + s.topMissed.map(m => "<li>" + escapeHtml(clip(describe(m.id), 90)) + " <b>×" + m.n + "</b></li>").join("") + "</ol>" : empty("No missed questions recorded.")) + "</div>";
      };
      const students = d => '<div class="aa-head"><label>Filter <input class="aa-filter" data-aa-filter type="search" placeholder="name or email" value="' + escapeHtml(st.filter) + '"></label></div>' +
        '<div data-aa-roster>' + rosterHtml(d.students, st, now()) + "</div>" + detail(d);

      function draw() {
        const head = '<div class="aa-head">' + (courses.length > 1 ? '<label>Course <select data-aa-course>' + courses.map(c => '<option value="' + escapeHtml(c.id) + '"' + (c.id === st.courseId ? " selected" : "") + ">" + escapeHtml(c.label) + "</option>").join("") + "</select></label>" : "") +
          '<button type="button" class="aa-btn" data-aa-refresh>↻ Refresh</button></div>';
        let body;
        if (st.loading) body = '<p class="aa-note">Loading student progress…</p>';
        else if (st.err) body = '<div class="aa-err" role="alert"><b>' + (st.err.kind === "denied" ? "Rules not deployed yet" : "Something went wrong") + "</b><p>" + escapeHtml(st.err.message) + "</p>" + (st.err.kind === "error" ? '<button type="button" class="aa-btn" data-aa-refresh>Retry</button>' : "") + "</div>";
        else body = '<div class="aa-tabs" role="group" aria-label="Analytics views">' + [["overview", "Class overview"], ["features", "Feature use"], ["students", "Students"]].map(t => '<button type="button" class="aa-btn" data-aa-tab="' + t[0] + '" aria-pressed="' + (st.tab === t[0]) + '">' + t[1] + "</button>").join("") + "</div>" +
          (st.tab === "overview" ? overview(st.data) : st.tab === "features" ? features(st.data) : students(st.data));
        container.innerHTML = '<div class="aa">' + head + body + "</div>";
      }
      async function load() {
        st.loading = true; st.err = null; draw();
        try { const r = await ctx.fetchCourse(course().coll); st.data = aggregate(r && r.docs, r && r.profiles, { now: now(), order: ctx.order }); }
        catch (e) { st.err = describeError(e); st.data = null; }
        st.loading = false; draw();
      }
      const pick = uid => { st.uid = uid; st.tab = "students"; draw(); const el = container.querySelector("[data-aa-detail]"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); };
      container.onclick = e => {
        const t = e.target.closest ? e.target : e.target.parentElement; if (!t || !t.closest) return;
        let el;
        if ((el = t.closest("[data-aa-tab]"))) { st.tab = el.dataset.aaTab; draw(); }
        else if ((el = t.closest("[data-aa-sort]"))) { const k = el.dataset.aaSort; st.dir = st.sort === k && st.dir === "desc" ? "asc" : (k === "name" || k === "weakest" ? "asc" : "desc"); st.sort = k; draw(); }
        else if (t.closest("[data-aa-close]")) { st.uid = null; draw(); }
        else if (t.closest("[data-aa-refresh]")) load();
        else if ((el = t.closest("[data-aa-uid]"))) pick(el.dataset.aaUid);
      };
      container.onkeydown = e => { const row = e.target && e.target.closest && e.target.closest("[data-aa-uid]"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(row.dataset.aaUid); } };
      container.onchange = e => { if (e.target && e.target.matches && e.target.matches("[data-aa-course]")) { st.courseId = e.target.value; st.uid = null; load(); } };
      container.oninput = e => {
        if (!(e.target && e.target.matches && e.target.matches("[data-aa-filter]")) || !st.data) return;
        st.filter = e.target.value; const r = container.querySelector("[data-aa-roster]"); if (r) r.innerHTML = rosterHtml(st.data.students, st, now());
      };
      await load();
    } catch (e) {
      container.innerHTML = '<div class="aa-err" role="alert">' + escapeHtml(describeError(e).message) + "</div>";
    }
  }

  const api = { aggregate: aggregate, daysSince: daysSince, escapeHtml: escapeHtml, barChartSvg: barChartSvg, lineChartSvg: lineChartSvg, histogramSvg: histogramSvg, stackedBarsSvg: stackedBarsSvg, sortStudents: sortStudents, rosterHtml: rosterHtml, describeError: describeError, SECTION_LABELS: SECTION_LABELS, render: render };
  global.LMAdminAnalytics = Object.assign(global.LMAdminAnalytics || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = global.LMAdminAnalytics;
})(typeof window !== "undefined" ? window : globalThis);
