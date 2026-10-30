/* MCR3U interactive models: function transformations, exponential growth, sequences & series, the sine-law
   ambiguous case and sinusoids, plus unit concept maps. Self-contained (plain SVG + DOM, no dependencies). The
   course page loads this with a dynamic import and calls mountAll(root) after rendering the Study Hub. */

const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const num = v => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : fmt(v, 2)).replace("-", "−");
const sgn = v => v < 0 ? "− " + num(-v) : "+ " + num(v);
const money = v => "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rad = d => d * Math.PI / 180;

// A small square plotting frame: maps math coordinates in [x0, x1] × [y0, y1] to an SVG viewBox.
function frame(x0, x1, y0, y1, W = 360, H = 260, pad = 26){
  const X = x => pad + (x - x0) * (W - 2 * pad) / (x1 - x0), Y = y => H - pad - (y - y0) * (H - 2 * pad) / (y1 - y0);
  const path = (f, step = (x1 - x0) / 300) => {
    let d = "", pen = false;
    for (let x = x0; x <= x1 + 1e-9; x += step){
      const y = f(x);
      if (!isFinite(y) || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)){ pen = false; continue; }
      d += (pen ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1); pen = true;
    }
    return d;
  };
  let grid = "";
  for (let x = Math.ceil(x0); x <= x1; x++) grid += `<line x1="${X(x)}" y1="${pad}" x2="${X(x)}" y2="${H - pad}" class="mdl-grid"/>`;
  for (let y = Math.ceil(y0); y <= y1; y++) grid += `<line x1="${pad}" y1="${Y(y)}" x2="${W - pad}" y2="${Y(y)}" class="mdl-grid"/>`;
  const axes = `${x0 < 0 && x1 > 0 ? `<line x1="${X(0)}" y1="${pad}" x2="${X(0)}" y2="${H - pad}" class="mdl-axis"/>` : ""}${y0 < 0 && y1 > 0 ? `<line x1="${pad}" y1="${Y(0)}" x2="${W - pad}" y2="${Y(0)}" class="mdl-axis"/>` : ""}`;
  return { X, Y, path, grid, axes, W, H, pad };
}
const slider = (id, label, min, max, step, val) => `<label>${label} <output id="${id}-o">${val}</output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;

/* ---------------- 1. Transformations explorer ---------------- */
const PARENTS = {
  sq: ["y = x²", x => x * x, [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]]],
  sqrt: ["y = √x", x => x < 0 ? NaN : Math.sqrt(x), [[0, 0], [1, 1], [4, 2]]],
  recip: ["y = 1/x", x => Math.abs(x) < 1e-6 ? NaN : 1 / x, [[-1, -1], [1, 1], [2, 0.5]]],
  abs: ["y = |x|", x => Math.abs(x), [[-2, 2], [0, 0], [2, 2]]],
};
function transformModel(el){
  el.innerHTML = `
    <p>Pick a parent function, then change a, k, d and c in <b>y = a f(k(x − d)) + c</b>. Watch the key points move by the mapping rule.</p>
    <div class="lenrow" role="group" aria-label="Parent function">${Object.entries(PARENTS).map(([k, p], i) => `<button class="lenbtn ${i ? "" : "sel"}" data-parent="${k}">${p[0]}</button>`).join("")}</div>
    <div class="mdl-controls two">
      ${slider("tr-a", "a (vertical stretch / reflection)", -3, 3, 0.5, 1)}
      ${slider("tr-k", "k (horizontal stretch / reflection)", -3, 3, 0.5, 1)}
      ${slider("tr-d", "d (horizontal shift)", -5, 5, 1, 0)}
      ${slider("tr-c", "c (vertical shift)", -5, 5, 1, 0)}
    </div>
    <svg id="tr-svg" viewBox="0 0 360 260" role="img" aria-labelledby="tr-t" class="mdl-svg"><title id="tr-t">Parent function (dashed) and transformed function (solid)</title></svg>
    <div class="mdl-readout" id="tr-read" aria-live="polite"></div>`;
  let parent = "sq";
  const g = id => el.querySelector(id);
  function draw(){
    let a = +g("#tr-a").value, k = +g("#tr-k").value; const d = +g("#tr-d").value, c = +g("#tr-c").value;
    if (a === 0){ a = 0.5; g("#tr-a").value = a; } if (k === 0){ k = 0.5; g("#tr-k").value = k; }
    ["a", "k", "d", "c"].forEach(n => g(`#tr-${n}-o`).textContent = num(+g(`#tr-${n}`).value));
    const [name, f, pts] = PARENTS[parent], fr = frame(-8, 8, -8, 8);
    const T = x => a * f(k * (x - d)) + c;
    const mapped = pts.map(([px, py]) => [px / k + d, a * py + c]);
    g("#tr-svg").innerHTML = `<title>${name} and its transformation</title>${fr.grid}${fr.axes}
      <path d="${fr.path(f, 0.02)}" class="mdl-curve cool"/>
      <path d="${fr.path(T, 0.02)}" class="mdl-curve main"/>
      ${mapped.filter(([x, y]) => Math.abs(x) <= 8 && Math.abs(y) <= 8).map(([x, y]) => `<circle cx="${fr.X(x)}" cy="${fr.Y(y)}" r="4.5" class="mdl-dot now"/>`).join("")}`;
    const parts = [];
    if (a < 0) parts.push("reflection in the x-axis"); if (Math.abs(a) !== 1) parts.push(`vertical ${Math.abs(a) > 1 ? "stretch" : "compression"} by a factor of ${num(Math.abs(a))}`);
    if (k < 0) parts.push("reflection in the y-axis"); if (Math.abs(k) !== 1) parts.push(`horizontal ${Math.abs(k) > 1 ? "compression" : "stretch"} by a factor of ${num(1 / Math.abs(k))}`);
    if (d) parts.push(`shift ${num(Math.abs(d))} ${d > 0 ? "right" : "left"}`); if (c) parts.push(`shift ${num(Math.abs(c))} ${c > 0 ? "up" : "down"}`);
    g("#tr-read").innerHTML = `<b>Equation:</b> y = ${num(a)} f(${num(k)}(x ${sgn(-d)})) ${sgn(c)} · <b>Mapping rule:</b> (x, y) → (x/${num(k)} ${sgn(d)}, ${num(a)}y ${sgn(c)})<br>` +
      `<b>Transformations:</b> ${parts.length ? parts.join(", ") : "none (this is the parent)"}.<br>` +
      `<b>Key points:</b> ${pts.map(([px, py], i) => `(${num(px)}, ${num(py)}) → (${num(mapped[i][0])}, ${num(mapped[i][1])})`).join(" · ")}` +
      (k !== 1 && d !== 0 ? `<br>🔍 Factor k out first: k(x − d) shifts by d, not by kd. That's the most common transformation error.` : "");
  }
  el.querySelectorAll("[data-parent]").forEach(b => b.addEventListener("click", () => { parent = b.dataset.parent; el.querySelectorAll("[data-parent]").forEach(x => x.classList.toggle("sel", x === b)); draw(); }));
  el.querySelectorAll("input").forEach(i => i.addEventListener("input", draw));
  draw();
}

/* ---------------- 2. Exponential growth & compound interest ---------------- */
function growthModel(el){
  el.innerHTML = `
    <p>Compare simple interest with compound interest, and see how compounding more often changes the result.</p>
    <div class="mdl-controls two">
      ${slider("gr-p", "Principal $", 500, 10000, 500, 5000)}
      ${slider("gr-r", "Annual rate %", 1, 12, 0.25, 6)}
      ${slider("gr-t", "Years", 1, 40, 1, 20)}
      <label>Compounding<select id="gr-n" class="field"><option value="1">annually</option><option value="2">semi-annually</option><option value="4">quarterly</option><option value="12" selected>monthly</option><option value="365">daily</option></select></label>
    </div>
    <svg id="gr-svg" viewBox="0 0 360 240" role="img" aria-labelledby="gr-tt" class="mdl-svg"><title id="gr-tt">Growth of an investment over time</title></svg>
    <div class="mdl-readout" id="gr-read" aria-live="polite"></div>`;
  const g = id => el.querySelector(id);
  function draw(){
    const P = +g("#gr-p").value, r = +g("#gr-r").value / 100, T = +g("#gr-t").value, n = +g("#gr-n").value;
    g("#gr-p-o").textContent = P; g("#gr-r-o").textContent = (+g("#gr-r").value).toFixed(2); g("#gr-t-o").textContent = T;
    const A = t => P * Math.pow(1 + r / n, n * t), S = t => P * (1 + r * t);
    const top = A(T) * 1.1, W = 360, H = 240, L = 46, B = 24;
    const X = t => L + t * (W - L - 12) / T, Y = v => H - B - v * (H - B - 12) / top;
    let bars = ""; const bw = Math.max(2, (W - L - 12) / T * 0.6);
    for (let t = 1; t <= T; t++) bars += `<rect x="${X(t) - bw / 2}" y="${Y(A(t))}" width="${bw}" height="${Y(0) - Y(A(t))}" class="gr-bar"><title>Year ${t}: ${money(A(t))}</title></rect>`;
    let ticks = ""; for (let i = 0; i <= 4; i++){ const v = top * i / 4; ticks += `<text x="${L - 4}" y="${Y(v) + 4}" text-anchor="end" class="mdl-lbl">${v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v)}</text><line x1="${L}" y1="${Y(v)}" x2="${W - 12}" y2="${Y(v)}" class="mdl-grid"/>`; }
    g("#gr-svg").innerHTML = `<title>Growth of ${money(P)} over ${T} years</title>${ticks}${bars}
      <path d="M${X(0)} ${Y(S(0))}L${X(T)} ${Y(S(T))}" class="mdl-curve cool"/>
      <path d="M${L} 12V${H - B}H${W - 12}" class="mdl-axis"/><text x="${W - 12}" y="${H - 6}" text-anchor="end" class="mdl-lbl">years →</text>
      <text x="${L + 6}" y="22" class="mdl-lbl a-coral">bars: compound</text><text x="${L + 6}" y="36" class="mdl-lbl a-teal">dashed: simple</text>`;
    const yearly = P * Math.pow(1 + r, T), dbl = Math.log(2) / (n * Math.log(1 + r / n));
    g("#gr-read").innerHTML = `<b>Compound:</b> A = ${money(P)}(1 + ${fmt(r / n, 5)})<sup>${n * T}</sup> = <b>${money(A(T))}</b> · <b>Simple:</b> ${money(S(T))} · difference ${money(A(T) - S(T))}<br>` +
      `<b>Doubling time:</b> ${fmt(dbl, 1)} years (rule of 72 estimate: ${fmt(72 / (r * 100), 1)}) · compounding ${g("#gr-n").selectedOptions[0].text} instead of annually adds ${money(A(T) - yearly)}.` +
      `<br>🔍 Simple interest grows by the same amount each year (linear); compound interest grows by the same <b>factor</b> (exponential).`;
  }
  el.querySelectorAll("input,select").forEach(i => i.addEventListener("input", draw));
  draw();
}

/* ---------------- 3. Sequences & series ---------------- */
function seriesModel(el){
  el.innerHTML = `
    <p>Bars show each term t<sub>n</sub>; the line shows the running total S<sub>n</sub>. Try a geometric ratio between −1 and 1 to see an infinite series settle down.</p>
    <div class="lenrow" role="group" aria-label="Sequence type"><button class="lenbtn sel" data-kind="ar">Arithmetic</button><button class="lenbtn" data-kind="ge">Geometric</button></div>
    <div class="mdl-controls two">
      ${slider("se-a", "First term a", -10, 20, 1, 3)}
      <label id="se-d-l">Common difference d <output id="se-d-o">2</output><input id="se-d" type="range" min="-5" max="5" step="1" value="2"></label>
      <label id="se-r-l" style="display:none">Common ratio r <output id="se-r-o">0.5</output><input id="se-r" type="range" min="-2" max="2" step="0.1" value="0.5"></label>
      ${slider("se-n", "Number of terms n", 2, 20, 1, 10)}
    </div>
    <svg id="se-svg" viewBox="0 0 360 240" role="img" aria-labelledby="se-t" class="mdl-svg"><title id="se-t">Terms and partial sums</title></svg>
    <div class="mdl-readout" id="se-read" aria-live="polite"></div>`;
  let kind = "ar"; const g = id => el.querySelector(id);
  function draw(){
    const a = +g("#se-a").value, dd = +g("#se-d").value, r = +g("#se-r").value, n = +g("#se-n").value;
    g("#se-a-o").textContent = a; g("#se-d-o").textContent = dd; g("#se-r-o").textContent = r.toFixed(1); g("#se-n-o").textContent = n;
    g("#se-d-l").style.display = kind === "ar" ? "" : "none"; g("#se-r-l").style.display = kind === "ge" ? "" : "none";
    const term = i => kind === "ar" ? a + (i - 1) * dd : a * Math.pow(r, i - 1);
    const terms = Array.from({ length: n }, (_, i) => term(i + 1)), sums = terms.map((_, i) => terms.slice(0, i + 1).reduce((x, y) => x + y, 0));
    const lo = Math.min(0, ...terms, ...sums), hi = Math.max(1, ...terms, ...sums), W = 360, H = 240, L = 40, B = 22;
    const X = i => L + (i - 0.5) * (W - L - 10) / n, Y = v => 10 + (hi - v) * (H - B - 10) / (hi - lo), bw = (W - L - 10) / n * 0.6;
    const bars = terms.map((t, i) => `<rect x="${X(i + 1) - bw / 2}" y="${Math.min(Y(t), Y(0))}" width="${bw}" height="${Math.abs(Y(t) - Y(0))}" class="gr-bar ${t < 0 ? "neg" : ""}"><title>t${i + 1} = ${num(t)}</title></rect>`).join("");
    const line = sums.map((s, i) => (i ? "L" : "M") + X(i + 1).toFixed(1) + " " + Y(s).toFixed(1)).join(" ");
    const Sinf = kind === "ge" && Math.abs(r) < 1 ? a / (1 - r) : null;
    g("#se-svg").innerHTML = `<title>Terms and partial sums</title>
      <line x1="${L}" y1="${Y(0)}" x2="${W - 10}" y2="${Y(0)}" class="mdl-axis"/>${bars}
      ${Sinf !== null ? `<line x1="${L}" y1="${Y(Sinf)}" x2="${W - 10}" y2="${Y(Sinf)}" class="mdl-guide strong"/><text x="${W - 12}" y="${Y(Sinf) - 4}" text-anchor="end" class="mdl-lbl a-coral">S∞ = ${num(Sinf)}</text>` : ""}
      <path d="${line}" class="mdl-curve main"/>${sums.map((s, i) => `<circle cx="${X(i + 1)}" cy="${Y(s)}" r="3" class="mdl-dot now"/>`).join("")}
      <text x="${L - 4}" y="${Y(hi) + 8}" text-anchor="end" class="mdl-lbl">${num(hi)}</text><text x="${L - 4}" y="${Y(lo) + 4}" text-anchor="end" class="mdl-lbl">${num(lo)}</text>`;
    const tn = kind === "ar" ? `t<sub>n</sub> = ${num(a)} + (n − 1)(${num(dd)})` : `t<sub>n</sub> = ${num(a)}(${fmt(r, 1)})<sup>n − 1</sup>`;
    const Sn = kind === "ar" ? `S<sub>n</sub> = {n}/2 [2a + (n − 1)d]` : `S<sub>n</sub> = a(r<sup>n</sup> − 1)/(r − 1)`;
    g("#se-read").innerHTML = `${tn} · t<sub>${n}</sub> = <b>${num(terms[n - 1])}</b> · ${Sn.replace("{n}", "n")} = <b>${num(sums[n - 1])}</b><br>` +
      (kind === "ar" ? `🔍 Constant first differences (${num(dd)}) make the terms linear, so the partial sums are quadratic.`
        : r === 1 ? "r = 1: every term is the same, so the sum formula divides by zero. Use S<sub>n</sub> = na."
        : Math.abs(r) < 1 ? `🔍 |r| < 1, so the terms shrink toward 0 and the infinite series converges to S∞ = a/(1 − r) = ${num(Sinf)}.`
        : `🔍 |r| ≥ 1, so the terms don't shrink: the infinite series diverges.`);
  }
  el.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => { kind = b.dataset.kind; el.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("sel", x === b)); draw(); }));
  el.querySelectorAll("input").forEach(i => i.addEventListener("input", draw));
  draw();
}

/* ---------------- 4. Sine law ambiguous case ---------------- */
function ambiguousModel(el){
  el.innerHTML = `
    <p>Given acute ∠A, side b (next to A) and side a (opposite A), side a swings from C toward the base line. How many triangles can it make?</p>
    <div class="mdl-controls two">
      ${slider("am-A", "∠A (degrees)", 15, 80, 1, 40)}
      ${slider("am-b", "side b", 4, 14, 0.5, 11)}
      ${slider("am-a", "side a", 2, 16, 0.25, 8)}
    </div>
    <svg id="am-svg" viewBox="0 0 360 230" role="img" aria-labelledby="am-t" class="mdl-svg"><title id="am-t">Ambiguous case construction</title></svg>
    <div class="mdl-readout" id="am-read" aria-live="polite"></div>`;
  const g = id => el.querySelector(id);
  function draw(){
    const A = +g("#am-A").value, b = +g("#am-b").value, a = +g("#am-a").value;
    g("#am-A-o").textContent = A; g("#am-b-o").textContent = b; g("#am-a-o").textContent = a;
    const s = 18, ox = 24, oy = 200, Cx = b * Math.cos(rad(A)), Cy = b * Math.sin(rad(A)), h = Cy;
    const P = (x, y) => [ox + x * s, oy - y * s];
    const [cx, cy] = P(Cx, Cy);
    // B lies on the base line (y = 0) at distance a from C: x = Cx ± √(a² − h²)
    const disc = a * a - h * h, Bs = disc < -1e-9 ? [] : [Cx - Math.sqrt(Math.max(0, disc)), Cx + Math.sqrt(Math.max(0, disc))].filter((x, i, arr) => x > 1e-6 && (i === 0 || Math.abs(x - arr[0]) > 1e-6));
    const tri = Bs.map((bx, i) => { const [px, py] = P(bx, 0); return `<path d="M${ox} ${oy}L${cx} ${cy}L${px} ${py}Z" class="am-tri t${i}"/><circle cx="${px}" cy="${py}" r="4" class="mdl-dot now"/><text x="${px - 4}" y="${py + 16}" class="mdl-lbl b">B${Bs.length > 1 ? i + 1 : ""}</text>`; }).join("");
    g("#am-svg").innerHTML = `<title>Ambiguous case: ${Bs.length} triangle${Bs.length === 1 ? "" : "s"}</title>
      <line x1="${ox}" y1="${oy}" x2="350" y2="${oy}" class="mdl-axis"/>
      <circle cx="${cx}" cy="${cy}" r="${a * s}" class="am-arc"/>
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${oy}" class="mdl-guide"/><text x="${cx + 4}" y="${(cy + oy) / 2}" class="mdl-lbl">h = ${fmt(h)}</text>
      ${tri}<line x1="${ox}" y1="${oy}" x2="${cx}" y2="${cy}" class="am-b"/>
      <text x="${ox - 4}" y="${oy + 16}" class="mdl-lbl b">A</text><text x="${cx - 4}" y="${cy - 8}" class="mdl-lbl b">C</text>`;
    let verdict;
    if (a < h - 1e-9) verdict = `a = ${a} < h = ${fmt(h)}: side a is too short to reach the base line, so there is <b>no triangle</b>.`;
    else if (Math.abs(a - h) < 1e-9) verdict = `a = h: side a just touches the base line, giving <b>one right triangle</b>.`;
    else if (a >= b) verdict = `a ≥ b: side a reaches the base line only once on the far side of A, so there is <b>one triangle</b>.`;
    else verdict = `h < a < b (${fmt(h)} < ${a} < ${b}): side a meets the base line twice, so there are <b>two triangles</b>.`;
    const sinB = b * Math.sin(rad(A)) / a;
    g("#am-read").innerHTML = verdict + (sinB <= 1 ? `<br>sin B = b sin A ÷ a = ${fmt(sinB, 4)}, so B = ${fmt(Math.asin(sinB) * 180 / Math.PI, 1)}°${Bs.length === 2 ? ` or 180° − B = ${fmt(180 - Math.asin(sinB) * 180 / Math.PI, 1)}°` : ""}.` : `<br>sin B = ${fmt(sinB, 3)} > 1, which is impossible, confirming there is no triangle.`) +
      `<br>🔍 Always check the obtuse option 180° − B: if A + (180° − B) < 180°, a second triangle exists.`;
  }
  el.querySelectorAll("input").forEach(i => i.addEventListener("input", draw));
  draw();
}

/* ---------------- 5. Sinusoid builder ---------------- */
function sinusoidModel(el){
  el.innerHTML = `
    <p>Build <b>y = a sin(k(x − d)) + c</b> in degrees. Read the amplitude, period, phase shift and midline straight off the graph.</p>
    <div class="mdl-controls two">
      ${slider("si-a", "a (amplitude)", -4, 4, 0.5, 2)}
      ${slider("si-k", "k (period = 360°/k)", 0.5, 4, 0.5, 2)}
      ${slider("si-d", "d (phase shift, °)", -90, 90, 15, 30)}
      ${slider("si-c", "c (midline)", -3, 3, 0.5, 1)}
    </div>
    <svg id="si-svg" viewBox="0 0 360 240" role="img" aria-labelledby="si-t" class="mdl-svg"><title id="si-t">Sinusoidal function</title></svg>
    <div class="mdl-readout" id="si-read" aria-live="polite"></div>`;
  const g = id => el.querySelector(id);
  function draw(){
    let a = +g("#si-a").value; const k = +g("#si-k").value, d = +g("#si-d").value, c = +g("#si-c").value;
    if (a === 0){ a = 0.5; g("#si-a").value = a; }
    g("#si-a-o").textContent = num(a); g("#si-k-o").textContent = num(k); g("#si-d-o").textContent = d; g("#si-c-o").textContent = num(c);
    const W = 360, H = 240, L = 30, B = 22, X = x => L + x * (W - L - 10) / 360, Y = y => H / 2 - 4 - y * (H - B - 20) / 16;
    const f = x => a * Math.sin(rad(k * (x - d))) + c;
    let dd = ""; for (let x = 0; x <= 360; x += 2) dd += (x ? "L" : "M") + X(x).toFixed(1) + " " + Y(f(x)).toFixed(1);
    let grid = ""; for (let x = 0; x <= 360; x += 90) grid += `<line x1="${X(x)}" y1="10" x2="${X(x)}" y2="${H - B}" class="mdl-grid"/><text x="${X(x) - 8}" y="${H - 8}" class="mdl-lbl">${x}°</text>`;
    for (let y = -8; y <= 8; y += 2) grid += `<text x="${L - 4}" y="${Y(y) + 4}" text-anchor="end" class="mdl-lbl">${y}</text>`;
    const P = 360 / k, firstMax = ((d + (a > 0 ? 90 : 270) / k) % P + P) % P;
    g("#si-svg").innerHTML = `<title>y = ${num(a)} sin(${num(k)}(x − ${d}°)) + ${num(c)}</title>${grid}
      <line x1="${L}" y1="${Y(0)}" x2="${W - 10}" y2="${Y(0)}" class="mdl-axis"/>
      <line x1="${L}" y1="${Y(c)}" x2="${W - 10}" y2="${Y(c)}" class="mdl-guide strong"/>
      <path d="${(() => { let s = ""; for (let x = 0; x <= 360; x += 2) s += (x ? "L" : "M") + X(x).toFixed(1) + " " + Y(Math.sin(rad(x))).toFixed(1); return s; })()}" class="mdl-curve cool"/>
      <path d="${dd}" class="mdl-curve main"/>
      ${firstMax <= 360 ? `<circle cx="${X(firstMax)}" cy="${Y(c + Math.abs(a))}" r="4.5" class="mdl-dot now"/>` : ""}`;
    g("#si-read").innerHTML = `<b>Amplitude</b> |a| = ${num(Math.abs(a))} · <b>Period</b> 360°/k = ${num(P)}° · <b>Phase shift</b> ${d}° ${d >= 0 ? "right" : "left"} · <b>Midline</b> y = ${num(c)}<br>` +
      `<b>Max</b> ${num(c + Math.abs(a))} · <b>Min</b> ${num(c - Math.abs(a))} · first maximum at x = ${num(firstMax)}°${a < 0 ? " (a < 0 reflects the curve, so the maximum moves half a period)" : ""}.<br>🔍 The dashed curve is y = sin x, for comparison.`;
  }
  el.querySelectorAll("input").forEach(i => i.addEventListener("input", draw));
  draw();
}

/* ---------------- 6. Unit concept maps ---------------- */
// nodes: [id, label (\n for a second line), column 0–2, row, lessonId]; edges: [from, to, label]
const MAPS = {
  u1: { n: [["fn", "Functions\ndomain · range", 0, 0, "u1-1"], ["tr", "Transformations\na, k, d, c", 1, 0, "u1-3"], ["inv", "Inverse\nfunctions", 2, 0, "u1-4"], ["vf", "Quadratics\nvertex form", 0, 1, "u1-5"], ["qe", "Quadratic\nequations", 1, 1, "u1-6"], ["disc", "Discriminant\nb² − 4ac", 2, 1, "u1-6"], ["app", "Applications\nmax · min", 0, 2, "u1-7"], ["rad", "Radical\nexpressions", 1, 2, "u1-8"], ["rat", "Rational\nexpressions", 2, 2, "u1-9"]],
        e: [["fn", "tr", "change by"], ["tr", "inv", "reflect in y = x"], ["fn", "vf", "family"], ["vf", "qe", "solve"], ["qe", "disc", "how many roots"], ["vf", "app", "vertex"], ["qe", "rad", "√ answers"], ["disc", "rat", ""]] },
  u2: { n: [["el", "Exponent\nlaws", 0, 0, "u2-1"], ["re", "Rational\nexponents", 1, 0, "u2-2"], ["pr", "Exponential\nfunctions", 2, 0, "u2-3"], ["tf", "Transformations\n& tables", 2, 1, "u2-4"], ["eq", "Exponential\nequations", 1, 1, "u2-5"], ["gd", "Growth &\ndecay", 0, 1, "u2-6"], ["ci", "Compound\ninterest", 0, 2, "u2-7"]],
        e: [["el", "re", "extend to"], ["re", "pr", "define"], ["pr", "tf", "shift · stretch"], ["el", "eq", "common base"], ["pr", "gd", "model"], ["gd", "ci", "money version"], ["eq", "gd", "solve for t"]] },
  u3: { n: [["ar", "Arithmetic\nsequences", 0, 0, "u3-1"], ["ge", "Geometric\nsequences", 1, 0, "u3-2"], ["rc", "Recursion &\nPascal", 2, 0, "u3-3"], ["as", "Arithmetic\nseries", 0, 1, "u3-4"], ["gs", "Geometric\nseries", 1, 1, "u3-5"], ["ci", "Compound\ninterest", 2, 1, "u3-6"], ["fv", "Annuity\nfuture value", 1, 2, "u3-7"], ["pv", "Annuity\npresent value", 2, 2, "u3-8"]],
        e: [["ar", "as", "add terms"], ["ge", "gs", "add terms"], ["ar", "ge", "+d vs ×r"], ["ge", "rc", "rules"], ["ge", "ci", "×(1 + i)"], ["gs", "fv", "sum payments"], ["fv", "pv", "discount"]] },
  u4: { n: [["sp", "Standard\nposition · CAST", 0, 0, "u4-1"], ["id", "Reciprocal ratios\n& identities", 1, 0, "u4-2"], ["sl", "Sine law\nambiguous case", 0, 1, "u4-3"], ["cl", "Cosine law", 1, 1, "u4-4"], ["ch", "Choosing\nthe tool", 2, 1, "u4-5"], ["br", "Bearings &\nnavigation", 2, 2, "u4-6"], ["gr", "Sine & cosine\ngraphs", 0, 2, "u4-7"], ["md", "Periodic\nmodels", 1, 2, "u4-8"]],
        e: [["sp", "id", "ratios"], ["sp", "sl", "any angle"], ["sl", "cl", "or"], ["cl", "ch", "SAS · SSS"], ["ch", "br", "apply"], ["sp", "gr", "unwrap circle"], ["gr", "md", "a, k, d, c"]] },
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

const MODELS = { transform: transformModel, growth: growthModel, series: seriesModel, ambiguous: ambiguousModel, sinusoid: sinusoidModel };
export function mountAll(root){
  root.querySelectorAll("[data-model]").forEach(el => { if (!el.dataset.mounted && MODELS[el.dataset.model]){ el.dataset.mounted = "1"; MODELS[el.dataset.model](el); } });
  root.querySelectorAll("[data-cmap]").forEach(el => { if (!el.dataset.mounted){ el.dataset.mounted = "1"; conceptMap(el); } });
}
