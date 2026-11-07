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

  const api = { aggregate: aggregate, daysSince: daysSince };
  global.LMAdminAnalytics = Object.assign(global.LMAdminAnalytics || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = global.LMAdminAnalytics;
})(typeof window !== "undefined" ? window : globalThis);
