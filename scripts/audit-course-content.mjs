import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const courses = [
  ['MHF4U/index.html', 'MHF4U', 'var MHF4U', 'MHF4U'],
  ['SCH4U/index.html', 'SCH4U', 'var SCH4U', 'SCH4U'],
  ['MPT/index.html', 'MPT', 'const BANK', 'BANK'],
  ['LMCA/index.html', 'LMCA', 'const BANK', 'BANK'],
  ['MCR3U/index.html', 'MCR3U', 'var MCR3U', 'MCR3U'],
];
let failures = 0;
const allowedStrands = {
  MPT: ['Number', 'Algebra', 'Data & Probability', 'Spatial Sense', 'Financial Literacy', 'Pedagogy'],
  LMCA: ['Number Sense & Numeration', 'Measurement', 'Patterning & Algebra', 'Data Management & Probability', 'Commercial & Financial Math'],
};

function check(ok, message) {
  if (!ok) { failures++; console.error(`  FAIL ${message}`); }
}

function extractFunction(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`function ${escaped}\\(\\)\\{[\\s\\S]*?\\n\\}`))?.[0];
}

function testFractionWidget(html, name, prefix) {
  const fn = extractFunction(html, name);
  check(Boolean(fn), `${prefix}: fraction interaction function is present`);
  if (!fn) return;
  const track = { style: { setProperty() {} }, setAttribute() {} };
  const elements = {
    [`#${prefix}-frac-num`]: { value: '3', max: '8', oninput: null },
    [`#${prefix}-frac-den`]: { value: '8', oninput: null },
    [`#${prefix}-frac-num-out`]: { value: '' },
    [`#${prefix}-frac-den-out`]: { value: '' },
    [`#${prefix}-frac-fill`]: { style: { width: '' }, parentElement: track },
    [`#${prefix}-frac-readout`]: { textContent: '' },
  };
  const context = { $: selector => elements[selector] };
  try {
    vm.runInNewContext(fn, context);
    vm.runInNewContext(`${name}()`, context);
    check(elements[`#${prefix}-frac-readout`].textContent === '3/8 = 37.5%', `${prefix}: initial fraction visual is correct`);
    elements[`#${prefix}-frac-num`].value = '4';
    elements[`#${prefix}-frac-num`].oninput();
    check(elements[`#${prefix}-frac-readout`].textContent === '4/8 = 50.0%', `${prefix}: changing the slider updates the fraction visual`);
  } catch (error) { check(false, `${prefix}: fraction interaction runs (${error.message})`); }
}

function testEquilibriumWidget(html) {
  const name = 'wireEquilibriumModel', fn = extractFunction(html, name);
  check(Boolean(fn), 'SCH4U: equilibrium graph interaction function is present');
  if (!fn) return;
  const nodes = {
    '#eq-start-a': { value: '8', oninput: null },
    '#eq-start-label': { textContent: '' }, '#eq-start-b': { textContent: '' },
    '#eq-path-a': { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } },
    '#eq-path-b': { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } },
  };
  const context = { $: selector => nodes[selector] };
  try {
    vm.runInNewContext(fn, context);
    vm.runInNewContext(`${name}()`, context);
    check(nodes['#eq-path-a'].attributes.d && nodes['#eq-path-b'].attributes.d, 'SCH4U: initial equilibrium curves render');
    check(nodes['#eq-path-a'].attributes.d !== nodes['#eq-path-b'].attributes.d, 'SCH4U: the two equilibrium curves differ');
    nodes['#eq-start-a'].value = '6'; nodes['#eq-start-a'].oninput();
    check(nodes['#eq-start-label'].textContent === 6 && nodes['#eq-start-b'].textContent === 4, 'SCH4U: changing the starting mixture updates labels');
  } catch (error) { check(false, `SCH4U: equilibrium graph interaction runs (${error.message})`); }
}

for (const [file, name, marker, variable] of courses) {
  const html = fs.readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const allScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [index, match] of allScripts.entries()) {
    const attributes = match[1].toLowerCase(), script = match[2];
    if (!script.trim()) continue;
    try {
      if (/type\s*=\s*["']module["']/i.test(attributes)) {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mathtest-audit-'));
        const tempFile = path.join(tempDir, `inline-${index}.mjs`);
        try {
          fs.writeFileSync(tempFile, script);
          const result = spawnSync(process.execPath, ['--check', tempFile], { encoding: 'utf8' });
          check(result.status === 0, `${name}: inline module ${index + 1} parses${result.status === 0 ? '' : ` (${(result.stderr || result.stdout).trim()})`}`);
        } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
      } else {
        new vm.Script(script, { filename: `${file}:inline-${index + 1}` });
      }
    } catch (error) { check(false, `${name}: inline script ${index + 1} parses (${error.message})`); }
  }
  const source = blocks.find(block => block.includes(marker));
  check(Boolean(source), `${name}: inline content script found`);
  if (!source) continue;

  const context = { module: { exports: {} }, console, globalThis: null };
  context.globalThis = context;
  const exportCode = name === 'MPT' || name === 'LMCA'
    ? '\nglobalThis.__content = BANK;'
    : `\nglobalThis.__content = ${variable};`;
  try {
    vm.runInNewContext(`${source}${exportCode}`, context, { timeout: 5000, filename: file });
    if (name === 'MPT' || name === 'LMCA') {
      const additions = [...html.matchAll(/BANK\.push\([\s\S]*?\n\);/g)];
      for (const addition of additions) vm.runInNewContext(addition[0], context, { timeout: 5000, filename: `${file}:extension` });
    }
  } catch (error) {
    check(false, `${name}: content script evaluates (${error.message})`);
    continue;
  }

  const data = context.__content;
  const questions = ['MHF4U', 'SCH4U', 'MCR3U'].includes(name) ? data.Q : data;
  const ids = new Set();
  const units = new Set((data.UNITS || []).map(unit => unit.id));
  const buckets = new Map();
  for (const question of questions) {
    check(question.id && !ids.has(question.id), `${name}: unique nonempty ID ${question.id || '(missing)'}`);
    ids.add(question.id);
    if (question.u) {
      check(units.has(question.u), `${name}: ${question.id} references existing unit ${question.u}`);
      buckets.set(question.u, (buckets.get(question.u) || 0) + 1);
      check(['K', 'A', 'T', 'C'].includes(question.c), `${name}: ${question.id} has valid achievement category`);
      if (question.t === 'mc') {
        check(Array.isArray(question.o) && question.a >= 0 && question.a < question.o.length, `${name}: ${question.id} has valid MC answer`);
        if (Array.isArray(question.o)) check(new Set(question.o.map(option => String(option).trim().toLowerCase())).size === question.o.length, `${name}: ${question.id} has distinct answer choices`);
      }
      else if (question.t === 'num') check(Number.isFinite(question.ans), `${name}: ${question.id} has numeric answer`);
      else if (question.t === 'write') check(question.model && Array.isArray(question.chk), `${name}: ${question.id} has model and rubric`);
      else check(false, `${name}: ${question.id} has supported question type`);
      if (question.t !== 'write') check(question.h && Array.isArray(question.s) && question.s.length > 0, `${name}: ${question.id} has hint and worked solution`);
    } else {
      const group = question.sec || 'unknown';
      buckets.set(group, (buckets.get(group) || 0) + 1);
      check(question.q && Array.isArray(question.opts) && question.ans >= 0 && question.ans < question.opts.length,
        `${name}: ${question.id} has prompt, choices, valid answer`);
      check(question.exp, `${name}: ${question.id} has explanation`);
      check(question.strand, `${name}: ${question.id} has a curriculum strand`);
      if (allowedStrands[name]) check(allowedStrands[name].includes(question.strand), `${name}: ${question.id} uses a strand included in the course quiz filters`);
    }
  }
  const strandCounts = new Map();
  for (const question of questions) strandCounts.set(question.strand, (strandCounts.get(question.strand) || 0) + 1);
  const subgroups = questions[0]?.u ? Object.fromEntries(buckets) : Object.fromEntries([...strandCounts].sort(([a], [b]) => a.localeCompare(b)));
  console.log(`${name}: ${questions.length} questions; ${ids.size} unique IDs; bucket counts ${JSON.stringify(subgroups)}`);
  if (data.LESSONS) console.log(`  ${data.LESSONS.length} lessons, ${data.WORKED?.length ?? 0} worked examples`);
  if (name === 'MPT') testFractionWidget(html, 'wireMptFractionModel', 'mpt');
  if (name === 'LMCA') testFractionWidget(html, 'wireLmcaFractionModel', 'lmca');
  if (name === 'SCH4U') testEquilibriumWidget(html);
}

if (failures) {
  console.error(`\nAudit failed: ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('\nAudit passed: all checked content has unique IDs, valid answer structures, and feedback.');
}
