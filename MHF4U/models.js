/* MHF4U concept maps. Self-contained (plain SVG + DOM, no dependencies); the course page loads this with a dynamic
   import and calls mountAll(root) after rendering the Study Hub. MHF4U's interactive graphs live in its Tools tab. */

// nodes: [id, label (\n for a second line), column 0–2, row, lessonId]; edges: [from, to, label]
const MAPS = {
  u1: { n: [["deg", "Degree &\nend behaviour", 0, 0, "u1-1"], ["zer", "Zeros &\nmultiplicity", 1, 0, "u1-2"], ["eo", "Even & odd\nsymmetry", 2, 0, "u1-3"], ["fd", "Finite\ndifferences", 0, 1, "u1-4"], ["rem", "Division &\nRemainder Thm", 1, 1, "u1-5"], ["fac", "Factor\nTheorem", 2, 1, "u1-6"], ["sol", "Equations &\ninequalities", 1, 2, "u1-8"], ["fam", "Families of\npolynomials", 2, 2, "u1-7"]],
        e: [["deg", "zer", "sketch with"], ["zer", "eo", "symmetry"], ["deg", "fd", "degree from"], ["rem", "fac", "remainder 0"], ["fac", "zer", "finds"], ["rem", "sol", "factor to solve"], ["fac", "fam", "same zeros, any a"]] },
  u2: { n: [["rec", "Reciprocal\ny = 1/f(x)", 0, 0, "u2-1"], ["rat", "Rational\n(ax + b)/(cx + d)", 1, 0, "u2-2"], ["hol", "Holes &\nasymptotes", 2, 0, "u2-3"], ["eq", "Rational\nequations", 0, 1, "u2-5"], ["inq", "Rational\ninequalities", 1, 1, "u2-6"], ["beh", "Rates near\nasymptotes", 2, 1, "u2-4"]],
        e: [["rec", "rat", "generalize"], ["rat", "hol", "factor first"], ["hol", "beh", "near a VA"], ["rat", "eq", "set equal"], ["eq", "inq", "sign chart"], ["hol", "inq", "critical values"]] },
  u3: { n: [["rad", "Radians\narc length", 0, 0, "u3-1"], ["uc", "Unit circle\n& CAST", 1, 0, "u3-2"], ["gr", "Sine, cosine\n& tangent graphs", 2, 0, "u3-3"], ["mod", "Periodic\nmodels", 0, 1, "u3-6"], ["tr", "Transformations\na, k, d, c", 1, 1, "u3-5"], ["rc", "csc · sec · cot", 2, 1, "u3-4"], ["id", "Identities\n& proofs", 0, 2, "u3-7"], ["cmp", "Compound &\ndouble angle", 1, 2, "u3-8"], ["sol", "Trig\nequations", 2, 2, "u3-9"]],
        e: [["rad", "uc", "measure"], ["uc", "gr", "unwrap"], ["gr", "rc", "reciprocals"], ["gr", "tr", "a, k, d, c"], ["tr", "mod", "fit data"], ["uc", "id", "Pythagorean"], ["id", "cmp", "build on"], ["cmp", "sol", "use in"]] },
  u4: { n: [["ex", "Exponential\nfunctions", 0, 0, "u4-1"], ["lg", "Logarithms", 1, 0, "u4-2"], ["lgr", "Log graphs", 2, 0, "u4-3"], ["se", "Exponential\nequations", 0, 1, "u4-5"], ["law", "Laws of\nlogarithms", 1, 1, "u4-4"], ["sl", "Log\nequations", 2, 1, "u4-6"], ["app", "Applications\ndecay · pH · dB", 1, 2, "u4-7"]],
        e: [["ex", "lg", "inverse"], ["lg", "lgr", "graph"], ["lg", "law", "rules"], ["law", "se", "take log"], ["law", "sl", "combine"], ["se", "app", "solve for t"], ["sl", "app", "log scales"]] },
  u5: { n: [["arc", "Average rate\nof change", 0, 0, "u5-1"], ["irc", "Instantaneous\nrate", 1, 0, "u5-2"], ["rd", "Rates from\ngraphs", 2, 0, "u5-3"], ["cb", "Combining\nfunctions", 0, 1, "u5-4"], ["cmp", "Composition\nf(g(x))", 1, 1, "u5-5"], ["inv", "Inverse\nfunctions", 2, 1, "u5-6"], ["tr", "Transforming\nany f", 0, 2, "u5-7"], ["mdl", "Choosing\na model", 1, 2, "u5-8"]],
        e: [["arc", "irc", "shrink interval"], ["irc", "rd", "tangent slope"], ["cb", "cmp", "f(g(x))"], ["cmp", "inv", "undo"], ["cb", "tr", "any f"], ["tr", "mdl", "fit"], ["arc", "cb", ""]] },
};
function conceptMap(el){
  const map = MAPS[el.dataset.cmap]; if (!map) return;
  const W = 112, H = 46, pos = {}, rows = Math.max(...map.n.map(n => n[3])) + 1;
  map.n.forEach(([id, , c, r]) => pos[id] = [8 + c * 168 + W / 2, 14 + r * 86 + H / 2]);
  const edge = ([a, b, lbl]) => {
    const [x1, y1] = pos[a], [x2, y2] = pos[b], dx = x2 - x1, dy = y2 - y1;
    const t = Math.min(Math.abs(dx) > 1 ? (W / 2 + 4) / Math.abs(dx) : 1, Math.abs(dy) > 1 ? (H / 2 + 4) / Math.abs(dy) : 1);
    const sx = x1 + dx * t, sy = y1 + dy * t, ex = x2 - dx * t, ey = y2 - dy * t;
    return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" class="cm-edge" marker-end="url(#cm-ah-${el.dataset.cmap})"/>` + (lbl ? `<text x="${(sx + ex) / 2}" y="${(sy + ey) / 2 - 4}" text-anchor="middle" class="cm-elbl">${lbl}</text>` : "");
  };
  const node = ([id, label, , , lesson]) => {
    const [x, y] = pos[id], lines = label.split("\n");
    return `<g class="cm-node" tabindex="0" role="button" data-cm-lesson="${lesson}" aria-label="${lines.join(" ")}: open lesson">
      <rect x="${x - W / 2}" y="${y - H / 2}" width="${W}" height="${H}" rx="10"/>
      ${lines.map((t, i) => `<text x="${x}" y="${y + (i - (lines.length - 1) / 2) * 15 + 4}" text-anchor="middle" class="${i ? "cm-sub" : "cm-main"}">${t}</text>`).join("")}</g>`;
  };
  el.innerHTML = `<svg viewBox="0 0 464 ${rows * 86 + 14}" role="group" aria-label="Concept map: select a box to open its lesson" class="cm-svg">
    <defs><marker id="cm-ah-${el.dataset.cmap}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" class="cm-ah"/></marker></defs>
    ${map.e.map(edge).join("")}${map.n.map(node).join("")}</svg>
    <p class="note">🗺 How the ideas in this unit connect. Select any box to jump to its lesson.</p>`;
  el.querySelectorAll("[data-cm-lesson]").forEach(gEl => {
    const open = () => el.dispatchEvent(new CustomEvent("lm-open-lesson", { bubbles: true, detail: gEl.dataset.cmLesson }));
    gEl.addEventListener("click", open);
    gEl.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
}

export function mountAll(root){
  root.querySelectorAll("[data-cmap]").forEach(el => { if (!el.dataset.mounted){ el.dataset.mounted = "1"; conceptMap(el); } });
}
