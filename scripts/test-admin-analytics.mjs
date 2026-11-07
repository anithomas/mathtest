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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
