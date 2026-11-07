/* LogicManse usage counters: how often a student opens each section of a course, kept per ISO week.

   Stored on the student's own progress document as store.usage = { "2026-W45": { quiz: 3, study: 1, ... } }.
   Counts only: no timestamps beyond the week key and no content. The newest 16 weeks are kept. Admins read these
   counts in the Analytics tab; nothing here is sent to Google Analytics. */
(function (global) {
  "use strict";
  const SECTIONS = ["home", "quiz", "mock", "progress", "study", "cheat", "cards", "notes", "clinic", "guided", "model", "challenge"];
  const KEEP_WEEKS = 16;

  // ISO-8601 week key, e.g. "2026-W45" (weeks start Monday; week 1 contains the year's first Thursday).
  function weekKey(when) {
    const d = new Date(when === undefined ? Date.now() : when);
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const day = new Date(t).getUTCDay() || 7;
    const thursday = new Date(t + (4 - day) * 864e5);
    const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((thursday - yearStart) / 864e5 + 1) / 7);
    return thursday.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
  }

  function bump(store, section, now) {
    if (!store || SECTIONS.indexOf(section) === -1) return;
    const usage = store.usage = store.usage && typeof store.usage === "object" ? store.usage : {};
    const wk = weekKey(now);
    const row = usage[wk] = usage[wk] || {};
    row[section] = (row[section] || 0) + 1;
    const keys = Object.keys(usage).sort();
    keys.slice(0, Math.max(0, keys.length - KEEP_WEEKS)).forEach(function (k) { delete usage[k]; });
  }

  // Per week and section the larger count wins, so merging two devices never loses visits.
  function merge(a, b) {
    const out = {};
    [a, b].forEach(function (src) {
      if (!src || typeof src !== "object") return;
      Object.keys(src).forEach(function (wk) {
        const row = src[wk];
        if (!row || typeof row !== "object") return;
        Object.keys(row).forEach(function (sec) {
          const n = row[sec];
          if (typeof n !== "number" || !isFinite(n)) return;
          out[wk] = out[wk] || {};
          out[wk][sec] = Math.max(out[wk][sec] || 0, n);
        });
      });
    });
    return out;
  }

  const api = { SECTIONS: SECTIONS, weekKey: weekKey, bump: bump, merge: merge };
  global.LMUsage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
