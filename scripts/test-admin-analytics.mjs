// Tests for the admin-analytics feature. Run: node scripts/test-admin-analytics.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let failed = 0, passed = 0;
function test(name, fn){ try { fn(); passed++; console.log('  ok   ' + name); } catch (e){ failed++; console.error('  FAIL ' + name + '\n       ' + (e && e.message)); } }

/* ---------- Task 1: usage counters ---------- */
const U = require('../usage.js');
test('weekKey: ISO week for 2026-11-06 is 2026-W45', () => assert.equal(U.weekKey(Date.UTC(2026, 10, 6)), '2026-W45'));
test('weekKey: 2026-01-01 is 2026-W01', () => assert.equal(U.weekKey(Date.UTC(2026, 0, 1)), '2026-W01'));
test('weekKey: 2027-01-01 belongs to 2026-W53', () => assert.equal(U.weekKey(Date.UTC(2027, 0, 1)), '2026-W53'));
test('bump: twice gives count 2', () => { const s = {}; U.bump(s, 'quiz', Date.UTC(2026, 10, 6)); U.bump(s, 'quiz', Date.UTC(2026, 10, 6)); assert.equal(s.usage['2026-W45'].quiz, 2); });
test('bump: unknown section ignored', () => { const s = {}; U.bump(s, 'admin', Date.UTC(2026, 10, 6)); U.bump(s, 'bob@x.com', Date.UTC(2026, 10, 6)); assert.deepEqual(s.usage || {}, {}); });
test('bump: 20 distinct weeks prune to the newest 16', () => {
  const s = {}; for (let i = 0; i < 20; i++) U.bump(s, 'home', Date.UTC(2026, 0, 5) + i * 7 * 864e5);
  const keys = Object.keys(s.usage).sort(); assert.equal(keys.length, 16); assert.equal(keys[15], U.weekKey(Date.UTC(2026, 0, 5) + 19 * 7 * 864e5)); assert.ok(!keys.includes(U.weekKey(Date.UTC(2026, 0, 5))));
});
test('merge: larger count per week and section', () => assert.deepEqual(U.merge({ w: { quiz: 3 } }, { w: { quiz: 5, home: 1 } }), { w: { quiz: 5, home: 1 } }));
test('merge: undefined inputs give {}', () => assert.deepEqual(U.merge(undefined, undefined), {}));
test('merge: ignores non-object and non-numeric values', () => assert.deepEqual(U.merge({ w: { quiz: 'x' } }, null), {}));

/* ---------- Tasks 2-3: students' pages record usage ---------- */
import fs from 'node:fs';
for (const c of ['MHF4U', 'MCR3U', 'SCH4U']) {
  const html = fs.readFileSync(new URL('../' + c + '/index.html', import.meta.url), 'utf8');
  test(c + ': loads /usage.js', () => assert.match(html, /<script src="\/usage\.js"><\/script>/));
  test(c + ': normalizeStore defaults usage', () => assert.match(html, /function normalizeStore\(\)\{[^\n]*store\.usage = store\.usage \|\| \{\};/));
  test(c + ': payload saves usage', () => assert.match(html, /function payload\(\)\{[^\n]*usage: store\.usage \|\| \{\}/));
  test(c + ': mergeInto merges usage from both devices', () => assert.match(html, /store\.usage = LMUsage\.merge\(d\.usage, localUsage\)/));
  test(c + ': go() counts the section only for students', () => assert.match(html, /function go\(view, opt\)\{[\s\S]{0,400}!adminMode[\s\S]{0,80}LMUsage\.bump\(store, view\)/));
  test(c + ': Challenge, guided and model starts are counted', () => {
    assert.match(html, /LMUsage\.bump\(store, "challenge"\)/);
    assert.match(html, /LMUsage\.bump\(store, "guided"\)/);
    assert.match(html, /LMUsage\.bump\(store, "model"\)/);
  });
}

for (const c of ['MPT', 'LMCA']) {
  const html = fs.readFileSync(new URL('../' + c + '/index.html', import.meta.url), 'utf8');
  test(c + ': loads /usage.js', () => assert.match(html, /<script src="\/usage\.js"><\/script>/));
  test(c + ': normalizeStore defaults usage', () => assert.match(html, /function normalizeStore\(\)\{[^\n]*store\.usage = store\.usage \|\| \{\};/));
  test(c + ': persist saves usage', () => assert.match(html, /mlog: store\.mlog \|\| \{\}, usage: store\.usage \|\| \{\}, updated: Date\.now\(\) \};/));
  test(c + ': loadCloud merges usage from both devices', () => assert.match(html, /store\.usage = LMUsage\.merge\(data && data\.usage, lu\)/));
  test(c + ': go() counts the section only for students', () => assert.match(html, /function go\(view\)\{[\s\S]{0,400}!adminMode[\s\S]{0,80}LMUsage\.bump\(store, view\)/));
}

/* ---------- Task 4: aggregation ---------- */
const AA = require('../admin-analytics.js');
const NOW = Date.UTC(2026, 10, 7, 12), DAYMS = 864e5;
const att = (daysAgo, pct, kind, strands) => ({ t: NOW - daysAgo * DAYMS, kind: kind || 'quiz', label: 'x', score: 1, total: 10, pct, strands: strands || {} });
const U12 = { U1: { c: 2, t: 5 }, U2: { c: 5, t: 5 } };
const fixture = {
  docs: [
    { uid: 'a', data: { email: 'a@x.com', attempts: [att(6, 50, 'quiz', U12), att(5, 60, 'mock', U12), att(4, 70, 'quiz', U12), att(3, 80, 'quiz', U12), att(2, 90, 'mock', U12), att(1, 100, 'quiz', U12)],
        lessons: { l1: true, l2: true, l3: false }, reviews: 12, missed: { q1: 1, q2: 1 }, mlog: { q1: { n: 3 }, q2: { n: 1 } },
        usage: { '2026-W45': { quiz: 4, study: 2 }, '2026-W44': { quiz: 1 } } } },
    { uid: 'b', data: {} },
    { uid: 'c', data: { email: 'c@x.com', attempts: [att(3, 40), att(-5, 60)], missed: { q1: 1 } } },
  ],
  profiles: { a: { email: 'a@x.com', displayName: 'Ann <b>' } },
};
const R = AA.aggregate(fixture.docs, fixture.profiles, { now: NOW });
const byUid = Object.fromEntries(R.students.map(x => [x.uid, x]));
test('aggregate: one student per document, in order', () => assert.deepEqual(R.students.map(x => x.uid), ['a', 'b', 'c']));
test('aggregate: names fall back profile name, data email, then Unknown student', () => {
  assert.equal(byUid.a.name, 'Ann <b>'); assert.equal(byUid.c.name, 'c@x.com'); assert.equal(byUid.b.name, 'Unknown student');
});
test('aggregate: recentAvg is the mean of the last five sessions', () => { assert.equal(byUid.a.recentAvg, 80); assert.equal(byUid.c.recentAvg, 50); assert.equal(byUid.b.recentAvg, null); });
test('aggregate: trend is the least-squares slope, null under 3 sessions', () => { assert.ok(Math.abs(byUid.a.trend - 10) < 1e-9); assert.equal(byUid.c.trend, null); assert.equal(byUid.b.trend, null); });
test('aggregate: weakest unit needs 6+ answered questions', () => { assert.equal(byUid.a.weakest, 'U1'); assert.equal(byUid.c.weakest, null); });
test('aggregate: unit accuracy, lessons, cards, sessions', () => {
  assert.deepEqual(byUid.a.unitAcc.U1, { c: 12, t: 30, p: 40 }); assert.deepEqual(byUid.a.unitAcc.U2, { c: 30, t: 30, p: 100 });
  assert.equal(byUid.a.lessonsDone, 2); assert.equal(byUid.a.cardsReviewed, 12); assert.equal(byUid.a.sessions, 6); assert.equal(byUid.b.sessions, 0);
});
test('aggregate: topMissed prefers mlog counts and never double-counts missed', () => assert.deepEqual(byUid.a.topMissed, [{ id: 'q1', n: 3 }, { id: 'q2', n: 1 }]));
test('aggregate: series keeps the last 20 sessions as {t,pct,kind}', () => { assert.equal(byUid.a.series.length, 6); assert.deepEqual(Object.keys(byUid.a.series[0]).sort(), ['kind', 'pct', 't']); });
test('aggregate: empty or future data gives zeros, never NaN or negative', () => {
  assert.equal(byUid.b.lastActive, 0); assert.equal(byUid.b.lessonsDone, 0); assert.equal(byUid.b.cardsReviewed, 0);
  assert.deepEqual(byUid.b.unitAcc, {}); assert.deepEqual(byUid.b.series, []);
  assert.equal(byUid.c.lastActive, NOW + 5 * DAYMS);
  assert.equal(AA.daysSince(byUid.c.lastActive, NOW), 0); assert.equal(AA.daysSince(0, NOW), null); assert.equal(AA.daysSince(NOW - 3 * DAYMS, NOW), 3);
});
test('overview: totals, active windows and class average', () => {
  const o = R.overview; assert.equal(o.total, 3); assert.equal(o.active7, 2); assert.equal(o.active30, 2); assert.equal(o.classAvg, 65); assert.deepEqual(o.inactive, ['b']);
});
test('overview: histogram bands add up to the students with an average', () => {
  const h = R.overview.histogram; assert.deepEqual(h.map(b => b.label), ['<50', '50-59', '60-69', '70-79', '80-89', '90-100']);
  assert.deepEqual(h.map(b => b.count), [0, 1, 0, 0, 1, 0]);
});
test('overview: sessions per week covers the last 12 weeks and ignores future sessions', () => {
  const w = R.overview.sessionsPerWeek; assert.equal(w.length, 12); assert.equal(w[11].week, '2026-W45'); assert.equal(w[11].count, 6); assert.equal(w[10].count, 1);
  assert.equal(w.reduce((n, x) => n + x.count, 0), 7);
});
test('overview: class unit accuracy and most missed questions', () => {
  assert.deepEqual(R.overview.unitAcc, [{ unit: 'U1', p: 40, t: 30 }, { unit: 'U2', p: 100, t: 30 }]);
  assert.deepEqual(R.overview.mostMissed, [{ id: 'q1', n: 4 }, { id: 'q2', n: 1 }]);
  assert.deepEqual(AA.aggregate(fixture.docs, {}, { now: NOW, order: ['U2', 'U1'] }).overview.unitAcc.map(x => x.unit), ['U2', 'U1']);
});
test('features: usage totals and weekly counts over the last 12 weeks', () => {
  assert.deepEqual(R.features.totals, { quiz: 5, study: 2 });
  assert.equal(R.features.weekly.length, 12); assert.deepEqual(R.features.weekly[11], { week: '2026-W45', counts: { quiz: 4, study: 2 } }); assert.deepEqual(R.features.weekly[10], { week: '2026-W44', counts: { quiz: 1 } });
});
test('aggregate: empty class and malformed documents do not throw', () => {
  const e = AA.aggregate([], {}, { now: NOW }); assert.equal(e.overview.total, 0); assert.equal(e.overview.classAvg, null); assert.equal(e.overview.sessionsPerWeek.length, 12); assert.deepEqual(e.overview.histogram.map(b => b.count), [0, 0, 0, 0, 0, 0]);
  const m = AA.aggregate([{ uid: 'x', data: null }, { uid: 'y', data: { attempts: 'oops', lessons: 5, usage: 'bad', mlog: [], missed: null } }, { uid: 'z', data: { attempts: [{ pct: NaN }, { t: 'x', pct: 'y' }, null] } }], null, { now: NOW });
  assert.equal(m.students.length, 3); m.students.forEach(x => { assert.equal(x.recentAvg, null); assert.equal(x.sessions >= 0, true); });
  assert.equal(JSON.stringify(m).includes('NaN'), false);
});

/* ---------- Task 5: chart and table helpers ---------- */
test('escapeHtml escapes & < > " and apostrophes', () => assert.equal(AA.escapeHtml('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;'));
test('escapeHtml tolerates non-strings', () => { assert.equal(AA.escapeHtml(null), ''); assert.equal(AA.escapeHtml(undefined), ''); assert.equal(AA.escapeHtml(5), '5'); });
test('barChartSvg: labelled bars, escaped text, empty state', () => {
  const svg = AA.barChartSvg([{ label: 'Unit <1>', value: 40 }, { label: 'U2', value: 100 }], { max: 100, unit: '%' });
  assert.ok(svg.includes('<svg') && svg.includes('Unit &lt;1&gt;') && svg.includes('40%') && svg.includes('100%') && !svg.includes('<1>'));
  const none = AA.barChartSvg([]); assert.ok(!none.includes('<svg') && none.includes('aa-empty'));
});
test('lineChartSvg: points, single point, empty state', () => {
  const two = AA.lineChartSvg([{ label: 'Quiz A', value: 50 }, { label: 'Exam B', value: 80 }]);
  assert.ok(two.includes('<polyline') && two.includes('Quiz A') && two.includes('Exam B'));
  assert.ok(AA.lineChartSvg([{ label: 'only', value: 70 }]).includes('<circle'));
  assert.ok(!AA.lineChartSvg([]).includes('<svg') && AA.lineChartSvg([]).includes('aa-empty'));
});
test('histogramSvg: counts and labels, empty when nobody has a score', () => {
  const bins = [{ label: '<50', count: 0 }, { label: '50-59', count: 2 }];
  const svg = AA.histogramSvg(bins); assert.ok(svg.includes('<svg') && svg.includes('50-59') && svg.includes('>2<'));
  assert.ok(AA.histogramSvg([{ label: 'a', count: 0 }]).includes('aa-empty') && !AA.histogramSvg([{ label: 'a', count: 0 }]).includes('<svg'));
});
test('stackedBarsSvg: legend names every series with its total, empty when all zero', () => {
  const weeks = [{ week: '2026-W44', counts: { quiz: 1 } }, { week: '2026-W45', counts: { quiz: 4, study: 2 } }];
  const out = AA.stackedBarsSvg(weeks, [{ key: 'quiz', label: 'Quiz' }, { key: 'study', label: 'Study Hub' }]);
  assert.ok(out.includes('<svg') && out.includes('Quiz') && out.includes('Study Hub') && out.includes('5') && out.includes('2026-W45'));
  assert.ok(AA.stackedBarsSvg([{ week: 'w', counts: {} }], [{ key: 'quiz', label: 'Quiz' }]).includes('aa-empty'));
});
test('SECTION_LABELS names every section the usage counter can record', () => U.SECTIONS.forEach(k => assert.ok(AA.SECTION_LABELS[k], 'missing label for ' + k)));
const people = [
  { uid: '1', name: 'bob', email: '', sessions: 3, recentAvg: 60, trend: -2, weakest: 'U1', lessonsDone: 1, cardsReviewed: 0, lastActive: NOW - DAYMS },
  { uid: '2', name: 'Ann <img src=x>', email: 'ann@x.com', sessions: 9, recentAvg: 90, trend: 4, weakest: null, lessonsDone: 5, cardsReviewed: 20, lastActive: NOW - 30 * DAYMS },
  { uid: '3', name: 'cy', email: '', sessions: 0, recentAvg: null, trend: null, weakest: null, lessonsDone: 0, cardsReviewed: 0, lastActive: 0 },
];
test('sortStudents: numeric with nulls last, names case-insensitive, input untouched', () => {
  assert.deepEqual(AA.sortStudents(people, 'recentAvg', 'desc').map(x => x.uid), ['2', '1', '3']);
  assert.deepEqual(AA.sortStudents(people, 'recentAvg', 'asc').map(x => x.uid), ['1', '2', '3']);
  assert.deepEqual(AA.sortStudents(people, 'name', 'asc').map(x => x.uid), ['2', '1', '3']);
  assert.deepEqual(people.map(x => x.uid), ['1', '2', '3']);
});
test('rosterHtml: escapes names, marks the sorted column, filters, flags inactive students', () => {
  const html = AA.rosterHtml(people, { sort: 'recentAvg', dir: 'desc', filter: '' }, NOW);
  assert.ok(!html.includes('<img src=x>') && html.includes('Ann &lt;img src=x&gt;'));
  assert.ok(/aria-sort="descending"/.test(html) && (html.match(/aria-sort="none"/g) || []).length >= 5);
  assert.equal((html.match(/data-aa-uid=/g) || []).length, 3);
  assert.ok(html.includes('aa-badge') && html.includes('inactive') && html.includes('never'));
  const filtered = AA.rosterHtml(people, { sort: 'name', dir: 'asc', filter: 'ANN@' }, NOW);
  assert.equal((filtered.match(/data-aa-uid=/g) || []).length, 1);
  assert.ok(AA.rosterHtml([], { sort: 'name', dir: 'asc', filter: '' }, NOW).includes('aa-empty'));
});
test('describeError separates missing rules from other failures', () => {
  const denied = AA.describeError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
  assert.equal(denied.kind, 'denied'); assert.ok(denied.message.includes('firebase deploy --only firestore:rules'));
  const other = AA.describeError(new Error('network down')); assert.equal(other.kind, 'error'); assert.ok(other.message.includes('network down'));
  assert.equal(AA.describeError(null).kind, 'error');
});

/* ---------- Task 6: Admin page mounts the analytics panel ---------- */
for (const c of ['MPT', 'LMCA', 'MHF4U', 'MCR3U', 'SCH4U']) {
  const html = fs.readFileSync(new URL('../' + c + '/index.html', import.meta.url), 'utf8');
  test(c + ': Admin mounts analytics after rendering, for admins only', () => {
    assert.match(html, /function mountAnalytics\(\)\{\s*\n\s*if \(!adminMode\) return;/);
    assert.match(html, /mountAnalytics\(\);\s*\n\s*\$\("#ad-add"\)\.onclick/);
  });
  test(c + ': the admin script is loaded on demand, never as a static student script', () => {
    assert.ok(html.includes('s.src = "/admin-analytics.js"'));
    assert.ok(!/<script[^>]*src="\/admin-analytics\.js"/.test(html));
  });
  test(c + ': fetches only the progress collections and profiles, read-only', () => {
    const body = html.slice(html.indexOf('function mountAnalytics(){'), html.indexOf('async function renderAdmin()'));
    assert.ok(body.includes('f.getDocs(f.collection(cloud.db, coll))') && body.includes('"profiles"'));
    assert.ok(!/setDoc|updateDoc|deleteDoc|addDoc/.test(body));
  });
}

/* ---------- Task 7: Google Analytics events, Firestore rules, event hooks ---------- */
import vm from 'node:vm';
function loadAnalytics() {
  const store = { 'logicmanse-analytics-consent': 'yes' };
  const el = () => ({ setAttribute() {}, appendChild() {}, addEventListener() {}, querySelectorAll: () => [], style: {}, remove() {} });
  const ctx = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    location: { hostname: 'mathtest.logicmanse.ca', origin: 'https://mathtest.logicmanse.ca' },
    document: { readyState: 'complete', createElement: el, head: el(), body: el(), addEventListener() {} },
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8'), ctx);
  const events = () => (ctx.dataLayer || []).map(a => Array.from(a)).filter(a => a[0] === 'event');
  return { ctx, events };
}
const GA_KEYS = new Set(['course_code', 'page_location', 'page_referrer', 'page_title', 'section_name']);
test('GA: SCH4U and MCR3U are registered pages', () => {
  for (const [c, path] of [['SCH4U', '/SCH4U/'], ['MCR3U', '/MCR3U/']]) {
    const g = loadAnalytics(); g.ctx.lmTrackPage(c);
    const view = g.events().find(e => e[1] === 'page_view'); assert.ok(view, c + ' page_view'); assert.equal(view[2].page_location, 'https://mathtest.logicmanse.ca' + path);
  }
});
test('GA: section_opened carries only a fixed section name', () => {
  const g = loadAnalytics(); g.ctx.lmTrackPage('SCH4U');
  g.ctx.lmTrackEvent('section_opened', 'study');
  const e = g.events().filter(x => x[1] === 'section_opened'); assert.equal(e.length, 1); assert.equal(e[0][2].section_name, 'study'); assert.equal(e[0][2].course_code, 'SCH4U');
});
test('GA: an unknown or identifying section is dropped, not sent', () => {
  const g = loadAnalytics(); g.ctx.lmTrackPage('SCH4U');
  ['bob@x.com', 'Ann Lee', '', undefined, 'admin', 'study '].forEach(v => g.ctx.lmTrackEvent('section_opened', v));
  assert.equal(g.events().filter(x => x[1] === 'section_opened').length, 0);
});
test('GA: new events are allowed and an unknown event is ignored', () => {
  const g = loadAnalytics(); g.ctx.lmTrackPage('MHF4U');
  ['challenge_started', 'review_started', 'guided_completed', 'made_up_event'].forEach(n => g.ctx.lmTrackEvent(n));
  assert.deepEqual(Array.from(g.events().map(x => x[1]).filter(n => n !== 'page_view')), ['challenge_started', 'review_started', 'guided_completed']);
});
test('GA: no event ever carries a key outside the fixed list', () => {
  const g = loadAnalytics(); g.ctx.lmTrackPage('SCH4U');
  g.ctx.lmTrackEvent('section_opened', 'quiz', { email: 'a@b.c', score: 99 }); g.ctx.lmTrackEvent('study_hub_opened'); g.ctx.lmTrackEvent('challenge_started', 'study', { name: 'x' });
  g.events().forEach(e => Object.keys(e[2] || {}).forEach(k => assert.ok(GA_KEYS.has(k), 'unexpected GA key ' + k)));
});
test('Firestore rules: admins can read every course progress collection and never write it', () => {
  const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const coll of ['mpt', 'mhf4u', 'lmca', 'sch4u', 'mcr3u']) {
    const m = rules.match(new RegExp('match /' + coll + String.raw`/\{uid\} \{([\s\S]*?)
    \}`));
    assert.ok(m, 'no rule block for ' + coll);
    const stmts = m[1].replace(/\/\/.*$/gm, '').split(';').map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.startsWith('allow'));
    const adminStmts = stmts.filter(x => x.includes('isAdmin()'));
    assert.equal(adminStmts.length, 1, coll + ': exactly one admin rule');
    assert.match(adminStmts[0], /^allow read: if isAdmin\(\)$/, coll + ': admin rule is read-only');
    assert.ok(stmts.some(x => /request\.auth\.uid == uid/.test(x)), coll + ': owner rule still present');
  }
});
for (const c of ['MPT', 'LMCA', 'MHF4U', 'MCR3U', 'SCH4U']) {
  const html = fs.readFileSync(new URL('../' + c + '/index.html', import.meta.url), 'utf8');
  test(c + ': section and Challenge events are sent for students only', () => {
    assert.match(html, /if \(!adminMode\)\{ LMUsage\.bump\(store, view\); persist\(\); if \(window\.lmTrackEvent\) window\.lmTrackEvent\("section_opened", view\); \}/);
    assert.match(html, /if \(!adminMode && \/Challenge\/\.test\(label \|\| ""\)\)\{ LMUsage\.bump\(store, "challenge"\); persist\(\); if \(window\.lmTrackEvent\) window\.lmTrackEvent\("challenge_started"\); \}/);
  });
}
for (const c of ['MHF4U', 'MCR3U', 'SCH4U']) {
  const html = fs.readFileSync(new URL('../' + c + '/index.html', import.meta.url), 'utf8');
  test(c + ': guided and review events are sent for students only', () => {
    assert.match(html, /LMUsage\.bump\(store, "guided"\); persist\(\); if \(window\.lmTrackEvent\) window\.lmTrackEvent\("guided_completed"\); \}/);
    assert.match(html, /LMUsage\.bump\(store, "model"\); persist\(\); \}/);
    assert.match(html, /if \(s\) s\.onclick = \(\) => \{\s*\n\s*if \(!adminMode && window\.lmTrackEvent\) window\.lmTrackEvent\("review_started"\);/);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
