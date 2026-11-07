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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
