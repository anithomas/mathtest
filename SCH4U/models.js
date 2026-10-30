/* SCH4U interactive models: energy diagrams, titration curves, galvanic cells, VSEPR shapes and unit concept maps.
   Self-contained (plain SVG + DOM, no dependencies). The course page loads this with a dynamic import and calls
   mountAll(root) after rendering the Study Hub; every model is keyboard-operable through native form controls. */

const NS = "http://www.w3.org/2000/svg";
const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const sup = s => s.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>").replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");
const sci = v => { if (v === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(v))); const m = v / 10 ** e; return e >= -2 && e <= 3 ? v.toPrecision(3) : `${m.toFixed(2)} × 10<sup>${e}</sup>`; };
const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- 1. Potential energy diagram + Maxwell–Boltzmann ---------------- */
function erfc(x){ // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * x);
  return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
}
// fraction of molecules with kinetic energy >= a (in units of the reference kT) when the temperature ratio is s
const tailFraction = (a, s) => { const z = a / s; return erfc(Math.sqrt(z)) + 2 * Math.sqrt(z / Math.PI) * Math.exp(-z); };
const mb = (x, s) => 2 / Math.sqrt(Math.PI) * Math.sqrt(x) / s ** 1.5 * Math.exp(-x / s);

function energyModel(el){
  el.innerHTML = `
    <p>Drag the sliders to shape the reaction's energy profile. Then switch on a catalyst and see which values change, and which don't.</p>
    <div class="mdl-controls">
      <label>Activation energy, E<sub>a</sub> <output id="pe-ea-o">80</output> kJ<input id="pe-ea" type="range" min="10" max="160" value="80"></label>
      <label>Enthalpy change, ΔH <output id="pe-dh-o">−40</output> kJ<input id="pe-dh" type="range" min="-100" max="100" value="-40"></label>
      <label class="mdl-check"><input id="pe-cat" type="checkbox"><span>Add a catalyst (lowers E<sub>a</sub> by 35%)</span></label>
    </div>
    <svg id="pe-svg" viewBox="0 0 380 230" role="img" aria-labelledby="pe-t" class="mdl-svg"><title id="pe-t">Potential energy diagram</title></svg>
    <div class="mdl-readout" id="pe-read" aria-live="polite"></div>
    <h4 style="margin-top:16px">Why does temperature matter so much?</h4>
    <p>Only molecules with energy above E<sub>a</sub> (the shaded tail) can react. Raise the temperature and watch the tail grow.</p>
    <div class="mdl-controls"><label>Temperature <output id="mb-t-o">340</output> K<input id="mb-t" type="range" min="300" max="450" value="340"></label></div>
    <svg id="mb-svg" viewBox="0 0 380 190" role="img" aria-labelledby="mb-tt" class="mdl-svg"><title id="mb-tt">Maxwell–Boltzmann energy distribution at two temperatures</title></svg>
    <div class="mdl-readout" id="mb-read" aria-live="polite"></div>
    <p class="note">The curves are illustrative (the E<sub>a</sub> line is drawn closer to the peak than in a real reaction so you can see the tail). The "times as many" figure is calculated from the E<sub>a</sub> slider using the Arrhenius relationship.</p>`;
  const ea = el.querySelector("#pe-ea"), dh = el.querySelector("#pe-dh"), cat = el.querySelector("#pe-cat"), tt = el.querySelector("#mb-t");
  const yOf = e => 130 - e * 0.72; // kJ → px; reactants sit at E = 0
  const curve = (peak, prod) => {
    const yR = yOf(0), yP = yOf(prod), yT = yOf(peak);
    return `M30 ${yR} L95 ${yR} C145 ${yR} 150 ${yT} 190 ${yT} C230 ${yT} 235 ${yP} 285 ${yP} L350 ${yP}`;
  };
  const arrow = (x, y1, y2, label, cls, left) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="${cls}" marker-end="url(#pe-ah)"/><text x="${left ? x - 6 : x + 6}" y="${(y1 + y2) / 2 + 4}" text-anchor="${left ? "end" : "start"}" class="mdl-lbl ${cls}">${label}</text>`;
  function drawPE(){
    let E = +ea.value; const H = +dh.value;
    if (E < H + 10){ E = H + 10; ea.value = E; }
    const Ec = cat.checked ? Math.round(E * 0.65) < H + 5 ? H + 5 : Math.round(E * 0.65) : E;
    el.querySelector("#pe-ea-o").textContent = E; el.querySelector("#pe-dh-o").textContent = H > 0 ? "+" + H : String(H).replace("-", "−");
    const yR = yOf(0), yP = yOf(H);
    el.querySelector("#pe-svg").innerHTML = `<title>Potential energy diagram</title>
      <defs><marker id="pe-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
      <path d="M24 8V212H360" class="mdl-axis"/>
      <text x="356" y="226" text-anchor="end" class="mdl-lbl">reaction progress →</text><text x="14" y="110" text-anchor="middle" class="mdl-lbl" transform="rotate(-90 14 110)">potential energy</text>
      ${cat.checked ? `<path d="${curve(E, H)}" class="mdl-curve ghost"/>` : ""}
      <path d="${curve(Ec, H)}" class="mdl-curve main"/>
      <text x="34" y="${yR - 6}" class="mdl-lbl">reactants</text><text x="292" y="${yP - 6}" class="mdl-lbl">products</text>
      <line x1="95" y1="${yR}" x2="184" y2="${yR}" class="mdl-guide"/><line x1="196" y1="${yP}" x2="285" y2="${yP}" class="mdl-guide"/>
      ${arrow(184, yR, yOf(Ec) + 3, "E<tspan baseline-shift='sub' font-size='8'>a</tspan> " + Ec, "a-teal", true)}
      ${arrow(196, yP, yOf(Ec) + 3, "E<tspan baseline-shift='sub' font-size='8'>a</tspan>(rev) " + (Ec - H), "a-gold")}
      <line x1="300" y1="${yR}" x2="355" y2="${yR}" class="mdl-guide"/>
      ${H !== 0 ? arrow(345, yR, yP, "ΔH", "a-coral") : ""}`;
    const kind = H < 0 ? "exothermic: products are lower in energy, so heat is released" : H > 0 ? "endothermic: products are higher in energy, so heat is absorbed" : "thermoneutral";
    el.querySelector("#pe-read").innerHTML = `<b>E<sub>a</sub> (forward)</b> = ${Ec} kJ · <b>E<sub>a</sub> (reverse)</b> = E<sub>a</sub> − ΔH = ${Ec - H} kJ · <b>ΔH</b> = ${H > 0 ? "+" : H < 0 ? "−" : ""}${Math.abs(H)} kJ (${kind}).` +
      (cat.checked ? `<br>🔍 The catalyst lowered <b>both</b> activation energies by ${E - Ec} kJ, but ΔH did not change. So K does not change either; equilibrium is just reached faster.` : "");
  }
  function drawMB(){
    const T = +tt.value, s = T / 300, aPlot = 3.2;
    el.querySelector("#mb-t-o").textContent = T;
    const X = x => 30 + x * 40, Y = f => 160 - f * 230;
    const line = sc => { let d = ""; for (let i = 0; i <= 160; i++){ const x = i * 0.05; d += (i ? "L" : "M") + X(x).toFixed(1) + " " + Y(mb(x, sc)).toFixed(1); } return d; };
    let tail = `M${X(aPlot)} 160`; for (let i = 0; i <= 76; i++){ const x = aPlot + i * 0.05; tail += `L${X(x).toFixed(1)} ${Y(mb(x, s)).toFixed(1)}`; } tail += `L${X(8)} 160Z`;
    el.querySelector("#mb-svg").innerHTML = `<title>Maxwell–Boltzmann energy distribution at two temperatures</title>
      <path d="M30 10V160H360" class="mdl-axis"/><text x="250" y="178" class="mdl-lbl">kinetic energy →</text><text x="16" y="88" text-anchor="middle" class="mdl-lbl" transform="rotate(-90 16 88)">molecules</text>
      <path d="${tail}" class="mdl-tail"/>
      <path d="${line(1)}" class="mdl-curve cool"/><path d="${line(s)}" class="mdl-curve main"/>
      <line x1="${X(aPlot)}" y1="14" x2="${X(aPlot)}" y2="160" class="mdl-guide strong"/><text x="${X(aPlot) + 4}" y="24" class="mdl-lbl">E<tspan baseline-shift='sub' font-size='8'>a</tspan></text>
      <text x="96" y="40" class="mdl-lbl a-teal">300 K (dashed)</text><text x="96" y="54" class="mdl-lbl a-coral">${T} K (solid)</text>`;
    const ratioPlot = tailFraction(aPlot, s) / tailFraction(aPlot, 1);
    const realRatio = Math.exp(+ea.value * 1000 / 8.314 * (1 / 300 - 1 / T));
    el.querySelector("#mb-read").innerHTML = `Shaded tail: <b>${fmt(ratioPlot, 1)}×</b> the area at 300 K in this picture. With E<sub>a</sub> = ${ea.value} kJ/mol, raising 300 K → ${T} K gives about <b>${realRatio < 1000 ? fmt(realRatio, 1) : sci(realRatio)}×</b> as many molecules with enough energy, while the collision rate rises only about ${fmt((Math.sqrt(s) - 1) * 100, 1)}%.`;
  }
  [ea, dh, cat].forEach(c => c.addEventListener("input", () => { drawPE(); drawMB(); }));
  tt.addEventListener("input", drawMB);
  drawPE(); drawMB();
}

/* ---------------- 2. Titration curve builder ---------------- */
const KW = 1e-14;
function titrationPH(Ka, Ca, Va, Cb, Vb){
  // exact charge balance: [H+] + [Na+] = [OH−] + [A−]
  const V = Va + Vb, CA = Ca * Va / V, Na = Cb * Vb / V;
  const f = h => h + Na - KW / h - CA * Ka / (Ka + h);
  let lo = -15, hi = 1;
  for (let i = 0; i < 80; i++){ const mid = (lo + hi) / 2; if (f(10 ** mid) > 0) hi = mid; else lo = mid; }
  return -(lo + hi) / 2;
}
const INDICATORS = [["methyl orange", 3.1, 4.4], ["methyl red", 4.4, 6.2], ["bromothymol blue", 6.0, 7.6], ["phenolphthalein", 8.2, 10.0]];
function titrationModel(el){
  el.innerHTML = `
    <p>25.00 mL of 0.100 mol/L acid is titrated with 0.100 mol/L NaOH. Add base with the slider and watch the pH curve build, then compare a strong acid with a weak one.</p>
    <div class="mdl-controls">
      <div class="lenrow" role="group" aria-label="Acid type"><button class="lenbtn sel" data-acid="weak">Weak acid</button><button class="lenbtn" data-acid="strong">Strong acid (HCl)</button></div>
      <label id="ti-pka-l">Weak acid pK<sub>a</sub> <output id="ti-pka-o">4.74</output> (4.74 = acetic acid)<input id="ti-pka" type="range" min="3" max="7" step="0.01" value="4.74"></label>
      <label>NaOH added <output id="ti-v-o">12.50</output> mL<input id="ti-v" type="range" min="0" max="50" step="0.25" value="12.5"></label>
    </div>
    <svg id="ti-svg" viewBox="0 0 380 240" role="img" aria-labelledby="ti-t" class="mdl-svg"><title id="ti-t">Titration curve of pH against volume of base added</title></svg>
    <div class="mdl-readout" id="ti-read" aria-live="polite"></div>`;
  let acid = "weak";
  const pka = el.querySelector("#ti-pka"), vol = el.querySelector("#ti-v");
  const X = v => 36 + v * 6.5, Y = p => 210 - p * 14;
  function draw(){
    const Ka = acid === "strong" ? 1e8 : 10 ** -pka.value, v = +vol.value;
    el.querySelector("#ti-pka-l").style.display = acid === "strong" ? "none" : "";
    el.querySelector("#ti-pka-o").textContent = (+pka.value).toFixed(2); el.querySelector("#ti-v-o").textContent = v.toFixed(2);
    const ph = vb => titrationPH(Ka, 0.100, 25, 0.100, vb);
    let d = ""; for (let i = 0; i <= 200; i++){ const vb = i * 0.25; d += (i ? "L" : "M") + X(vb).toFixed(1) + " " + Y(ph(vb)).toFixed(1); }
    const pNow = ph(v), pEq = ph(25), pHalf = ph(12.5);
    const ind = INDICATORS.find(([, a, b]) => pEq >= a && pEq <= b) || INDICATORS.slice().sort((p, q) => Math.abs((p[1] + p[2]) / 2 - pEq) - Math.abs((q[1] + q[2]) / 2 - pEq))[0];
    let ticks = ""; for (let p = 0; p <= 14; p += 2) ticks += `<text x="18" y="${Y(p) + 4}" class="mdl-lbl">${p}</text><line x1="36" y1="${Y(p)}" x2="361" y2="${Y(p)}" class="mdl-grid"/>`;
    for (let vb = 0; vb <= 50; vb += 10) ticks += `<text x="${X(vb) - 6}" y="226" class="mdl-lbl">${vb}</text>`;
    el.querySelector("#ti-svg").innerHTML = `<title>Titration curve of pH against volume of base added</title>${ticks}
      <rect x="36" y="${Y(ind[2])}" width="325" height="${Y(ind[1]) - Y(ind[2])}" class="mdl-band"/>
      <path d="M36 8V210H361" class="mdl-axis"/><text x="290" y="238" class="mdl-lbl">mL NaOH</text><text x="42" y="16" class="mdl-lbl b">pH</text>
      <path d="${d}" class="mdl-curve main"/>
      <line x1="${X(25)}" y1="8" x2="${X(25)}" y2="210" class="mdl-guide"/><text x="${X(25) + 4}" y="20" class="mdl-lbl">equivalence</text>
      ${acid === "weak" ? `<circle cx="${X(12.5)}" cy="${Y(pHalf)}" r="4" class="mdl-dot gold"/><text x="${X(12.5) - 30}" y="${Y(pHalf) - 9}" class="mdl-lbl a-gold">pH = pKa</text>` : ""}
      <circle cx="${X(v)}" cy="${Y(pNow)}" r="6" class="mdl-dot now"/>`;
    const nA = 2.5, nB = 0.100 * v; // mmol
    const region = v === 0 ? "Only acid is present." : v < 25 ? (acid === "weak" ? `Buffer region: the flask holds HA and A<sup>−</sup> together, so pH changes slowly.${Math.abs(v - 12.5) < 0.3 ? " Half-way to equivalence, [HA] = [A<sup>−</sup>], so pH = pK<sub>a</sub>." : ""}` : "Excess H<sup>+</sup> remains, so the pH stays low.") : v === 25 ? (acid === "weak" ? "Equivalence: all HA has become A<sup>−</sup>, a weak base, so pH > 7." : "Equivalence: only NaCl and water remain, so pH = 7.") : "Past equivalence: excess OH<sup>−</sup> controls the pH.";
    el.querySelector("#ti-read").innerHTML = `<b>pH now:</b> ${fmt(pNow)} · base added ${fmt(nB)} mmol of ${fmt(nA)} mmol needed · <b>pH at equivalence:</b> ${fmt(pEq)}<br>${region}<br>🎨 Suitable indicator: <b>${ind[0]}</b> (changes over pH ${ind[1]}–${ind[2]}, shaded band).`;
  }
  el.querySelectorAll("[data-acid]").forEach(b => b.addEventListener("click", () => { acid = b.dataset.acid; el.querySelectorAll("[data-acid]").forEach(x => x.classList.toggle("sel", x === b)); draw(); }));
  [pka, vol].forEach(c => c.addEventListener("input", draw));
  draw();
}

/* ---------------- 3. Galvanic cell ---------------- */
const METALS = [["Mg", 2, -2.37], ["Al", 3, -1.66], ["Zn", 2, -0.76], ["Fe", 2, -0.44], ["Ni", 2, -0.26], ["Sn", 2, -0.14], ["Pb", 2, -0.13], ["Cu", 2, 0.34], ["Ag", 1, 0.80]];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const volts = e => (e > 0 ? "+" : e < 0 ? "−" : "") + Math.abs(e).toFixed(2);
const eCount = n => (n > 1 ? n : "") + "e<sup>−</sup>";
function cellModel(el){
  const opts = sel => METALS.map(([m, n, e]) => `<option value="${m}" ${m === sel ? "selected" : ""}>${m} (E° = ${volts(e)} V)</option>`).join("");
  el.innerHTML = `
    <p>Pick two metals. The model decides which is the anode and which is the cathode, animates the electrons and ions, and builds the balanced cell reaction.</p>
    <div class="mdl-controls two">
      <label>Metal 1<select id="gc-a" class="field">${opts("Zn")}</select></label>
      <label>Metal 2<select id="gc-b" class="field">${opts("Cu")}</select></label>
    </div>
    <svg id="gc-svg" viewBox="0 0 380 230" role="img" aria-labelledby="gc-t" class="mdl-svg"><title id="gc-t">Galvanic cell diagram</title></svg>
    <div class="mdl-readout" id="gc-read" aria-live="polite"></div>`;
  const a = el.querySelector("#gc-a"), b = el.querySelector("#gc-b");
  function draw(){
    const m1 = METALS.find(m => m[0] === a.value), m2 = METALS.find(m => m[0] === b.value);
    if (m1 === m2){ el.querySelector("#gc-svg").innerHTML = ""; el.querySelector("#gc-read").innerHTML = "Pick two <b>different</b> metals: identical half-cells give E°<sub>cell</sub> = 0 V and no current."; return; }
    const [an, ca] = m1[2] < m2[2] ? [m1, m2] : [m2, m1], E = ca[2] - an[2];
    const ion = m => m[0] + "<tspan baseline-shift='super' font-size='9'>" + (m[1] > 1 ? m[1] : "") + "+</tspan>";
    const flow = reduceMotion() ? "" : "mdl-flow";
    el.querySelector("#gc-svg").innerHTML = `<title>Galvanic cell: ${an[0]} anode, ${ca[0]} cathode</title>
      <path d="M70 150V60H310V150" class="mdl-wire"/>
      <path d="M78 58H302" class="mdl-electrons ${flow}"/>
      <circle cx="190" cy="60" r="22" class="mdl-meter"/><text x="190" y="57" text-anchor="middle" class="mdl-lbl b">${E.toFixed(2)}</text><text x="190" y="70" text-anchor="middle" class="mdl-lbl">V</text>
      <text x="120" y="48" class="mdl-lbl a-teal">e<tspan baseline-shift='super' font-size='8'>−</tspan> flow →</text>
      <path d="M40 120V200Q40 212 52 212H128Q140 212 140 200V120" class="mdl-beaker"/><path d="M42 140H138V200Q138 210 128 210H52Q42 210 42 200Z" class="mdl-soln anode"/>
      <path d="M240 120V200Q240 212 252 212H328Q340 212 340 200V120" class="mdl-beaker"/><path d="M242 140H338V200Q338 210 328 210H252Q242 210 242 200Z" class="mdl-soln cathode"/>
      <rect x="62" y="96" width="16" height="96" class="mdl-electrode"/><rect x="302" y="96" width="16" height="96" class="mdl-electrode"/>
      <path d="M118 150V108Q118 96 130 96H250Q262 96 262 108V150" class="mdl-bridge"/>
      <text x="152" y="120" class="mdl-lbl">salt bridge</text>
      <text x="136" y="140" class="mdl-lbl a-coral">← anions</text><text x="200" y="140" class="mdl-lbl a-teal">cations →</text>
      <text x="44" y="226" class="mdl-lbl b">ANODE (−): ${an[0]}</text><text x="236" y="226" class="mdl-lbl b">CATHODE (+): ${ca[0]}</text>
      <text x="86" y="178" class="mdl-lbl">${ion(an)}</text><text x="270" y="178" class="mdl-lbl">${ion(ca)}</text>`;
    const L = an[1] * ca[1] / gcd(an[1], ca[1]), kA = L / an[1], kC = L / ca[1], c = k => k > 1 ? k : "";
    const chg = m => (m[1] > 1 ? m[1] : "") + "+";
    el.querySelector("#gc-read").innerHTML =
      `<b>Anode (oxidation):</b> ${an[0]} → ${an[0]}<sup>${chg(an)}</sup> + ${eCount(an[1])} · the ${an[0]} electrode slowly dissolves.<br>` +
      `<b>Cathode (reduction):</b> ${ca[0]}<sup>${chg(ca)}</sup> + ${eCount(ca[1])} → ${ca[0]} · ${ca[0]} plates onto the electrode.<br>` +
      `<b>Overall (${L} e<sup>−</sup> transferred):</b> ${c(kA)}${an[0]} + ${c(kC)}${ca[0]}<sup>${chg(ca)}</sup> → ${c(kA)}${an[0]}<sup>${chg(an)}</sup> + ${c(kC)}${ca[0]}<br>` +
      `<b>E°<sub>cell</sub></b> = E°<sub>cathode</sub> − E°<sub>anode</sub> = ${volts(ca[2])} − (${volts(an[2])}) = <b>+${E.toFixed(2)} V</b> (positive, so spontaneous).` +
      (kA > 1 || kC > 1 ? `<br>🔍 The half-reactions were multiplied to balance electrons, but their E° values were <b>not</b>, because E° doesn't depend on amount.` : "");
  }
  [a, b].forEach(s => s.addEventListener("change", draw));
  draw();
}

/* ---------------- 4. VSEPR shape explorer ---------------- */
const GEOM = {
  2: { name: "linear", dirs: [[1, 0, 0], [-1, 0, 0]] },
  3: { name: "trigonal planar", dirs: [[0, -1, 0], [-0.87, 0.5, 0], [0.87, 0.5, 0]] },
  4: { name: "tetrahedral", dirs: [[0, -1, 0], [0, 0.33, 0.94], [-0.82, 0.33, -0.47], [0.82, 0.33, -0.47]] },
  5: { name: "trigonal bipyramidal", dirs: [[-1, 0, 0], [0.5, 0, 0.87], [0.5, 0, -0.87], [0, -1, 0], [0, 1, 0]] }, // equatorial first: lone pairs go there
  6: { name: "octahedral", dirs: [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] },
};
const SHAPES = {
  "2,0": ["linear", "180°", "CO_{2}", true], "3,0": ["trigonal planar", "120°", "BF_{3}", true], "2,1": ["bent", "≈117° (< 120°)", "SO_{2}", false],
  "4,0": ["tetrahedral", "109.5°", "CH_{4}", true], "3,1": ["trigonal pyramidal", "≈107°", "NH_{3}", false], "2,2": ["bent", "≈104.5°", "H_{2}O", false],
  "5,0": ["trigonal bipyramidal", "90° and 120°", "PCl_{5}", true], "4,1": ["seesaw", "<90° and <120°", "SF_{4}", false], "3,2": ["T-shaped", "<90°", "ClF_{3}", false], "2,3": ["linear", "180°", "XeF_{2}", true],
  "6,0": ["octahedral", "90°", "SF_{6}", true], "5,1": ["square pyramidal", "<90°", "BrF_{5}", false], "4,2": ["square planar", "90°", "XeF_{4}", true],
};
function vseprModel(el){
  el.innerHTML = `
    <p>Choose how many atoms are bonded to the central atom and how many lone pairs it has. Lone pairs take up space too, which is why water is bent.</p>
    <div class="mdl-controls two">
      <label>Bonded atoms <output id="vs-b-o">4</output><input id="vs-b" type="range" min="2" max="6" value="4"></label>
      <label>Lone pairs on the central atom <output id="vs-l-o">0</output><input id="vs-l" type="range" min="0" max="3" value="0"></label>
      <label class="mdl-check"><input id="vs-mix" type="checkbox"><span>Make one bonded atom different (e.g. CH<sub>3</sub>Cl instead of CH<sub>4</sub>)</span></label>
    </div>
    <svg id="vs-svg" viewBox="-130 -110 260 220" role="img" aria-labelledby="vs-t" class="mdl-svg vs"><title id="vs-t">Molecular shape</title></svg>
    <div class="mdl-readout" id="vs-read" aria-live="polite"></div>`;
  const bS = el.querySelector("#vs-b"), lS = el.querySelector("#vs-l"), mix = el.querySelector("#vs-mix");
  function draw(){
    let b = +bS.value, l = +lS.value;
    if (b + l > 6){ l = 6 - b; lS.value = l; }
    el.querySelector("#vs-b-o").textContent = b; el.querySelector("#vs-l-o").textContent = l;
    const shape = SHAPES[b + "," + l], g = GEOM[b + l];
    if (!shape){ el.querySelector("#vs-svg").innerHTML = ""; el.querySelector("#vs-read").innerHTML = "That combination isn't one of the SCH4U shapes. Try fewer lone pairs."; return; }
    // lone pairs fill the first listed positions; a bent tetrahedral molecule is turned so its V lies in the page
    const base = b + l === 4 && l === 2 ? [[0, -0.58, 0.82], [0, -0.58, -0.82], [-0.82, 0.58, 0], [0.82, 0.58, 0]] : g.dirs;
    const dirs = base.map((d, i) => ({ d, lone: i < l }));
    const P = ([x, y, z]) => [x * 82 + z * 26, y * 82 + z * 18];
    const items = dirs.map((x, i) => ({ ...x, i, z: x.d[2] })).sort((p, q) => p.z - q.z);
    let bondIdx = 0, svg = "";
    items.forEach(it => {
      const [px, py] = P(it.d), back = it.z < -0.1, front = it.z > 0.1;
      if (it.lone){
        const ang = Math.atan2(py, px) * 180 / Math.PI;
        svg += `<g transform="translate(${px * 0.55} ${py * 0.55}) rotate(${ang})" class="vs-lone ${back ? "back" : ""}"><ellipse rx="30" ry="15"/><circle cx="6" cy="-5" r="3"/><circle cx="6" cy="5" r="3"/></g>`;
      } else {
        const diff = mix.checked && bondIdx === 0; bondIdx++;
        svg += `<line x1="0" y1="0" x2="${px}" y2="${py}" class="vs-bond ${back ? "back" : front ? "front" : ""}"/><circle cx="${px}" cy="${py}" r="${front ? 17 : back ? 12 : 15}" class="vs-atom ${diff ? "diff" : ""} ${back ? "back" : ""}"/>`;
      }
    });
    el.querySelector("#vs-svg").innerHTML = `<title>${shape[0]} molecular shape</title>${svg}<circle r="19" class="vs-centre"/>`;
    const polar = mix.checked || !shape[3];
    el.querySelector("#vs-read").innerHTML = `<b>Electron-domain geometry:</b> ${g.name} (${b + l} domains) · <b>Molecular shape:</b> ${shape[0]} · <b>Bond angle:</b> ${shape[1]} · <b>Example:</b> ${sup(shape[2])}<br>` +
      `<b>Polarity:</b> ${polar ? "polar: the bond dipoles don't cancel" + (mix.checked && shape[3] ? " (the different atom breaks the symmetry)" : " because the shape is asymmetric") : "nonpolar: the shape is symmetric, so identical bond dipoles cancel"}.` +
      (l ? `<br>🔍 Lone pairs repel more strongly than bonding pairs, so they squeeze the bond angles below the ideal values.` : "");
  }
  [bS, lS, mix].forEach(c => c.addEventListener("input", draw));
  draw();
}

/* ---------------- 5. Unit concept maps ---------------- */
// nodes: [id, label (\n for a second line), column 0–2, row, lessonId]; edges: [from, to, label]
const MAPS = {
  u1: { n: [["ar", "Aromatics\nbenzene ring", 0, 0, "u1-3"], ["al", "Alcohols\n& halides", 1, 0, "u1-4"], ["co", "Aldehydes\n& ketones", 2, 0, "u1-5"], ["hc", "Hydrocarbons\nalkanes · alkenes", 0, 1, "u1-1"], ["po", "Polymers", 1, 1, "u1-7"], ["ca", "Carboxylic\nacids", 2, 1, "u1-5"], ["es", "Esters", 1, 2, "u1-6"], ["am", "Amides", 2, 2, "u1-6"]],
        e: [["hc", "ar", "special case"], ["hc", "al", "addition"], ["al", "co", "oxidation"], ["co", "ca", "oxidation"], ["ca", "es", "+ alcohol"], ["ca", "am", "+ amine"], ["hc", "po", "addition"], ["es", "po", "condensation"]] },
  u2: { n: [["ec", "Electron\nconfiguration", 0, 0, "u2-1"], ["lw", "Lewis\nstructures", 1, 0, "u2-4"], ["vs", "VSEPR shape", 2, 0, "u2-5"], ["pt", "Periodic trends\nradius · IE", 0, 1, "u2-2"], ["bd", "Bond type\nionic · covalent", 1, 1, "u2-6"], ["po", "Molecular\npolarity", 2, 1, "u2-5"], ["en", "Electro-\nnegativity", 0, 2, "u2-3"], ["pp", "Properties\nb.p. · solubility", 1, 2, "u2-7"], ["im", "Intermolecular\nforces", 2, 2, "u2-7"]],
        e: [["ec", "pt", "explains"], ["pt", "en", ""], ["ec", "lw", "valence e⁻"], ["lw", "vs", "domains"], ["en", "bd", "ΔEN"], ["vs", "po", "symmetric?"], ["bd", "po", "dipoles"], ["po", "im", "decides"], ["im", "pp", "strength"]] },
  u3: { n: [["dh", "Enthalpy ΔH\nexo / endo", 0, 0, "u3-1"], ["cal", "Calorimetry\nq = mcΔT", 1, 0, "u3-2"], ["hl", "Hess's law", 2, 0, "u3-3"], ["ea", "Activation\nenergy Ea", 0, 1, "u3-7"], ["ct", "Collision\ntheory", 1, 1, "u3-5"], ["be", "Bond energies\n& ΔH°f", 2, 1, "u3-4"], ["cat", "Catalysts &\nmechanisms", 0, 2, "u3-7"], ["arr", "Temperature\nArrhenius", 1, 2, "u3-7"], ["rl", "Rate laws\nrate = k[A]ᵐ[B]ⁿ", 2, 2, "u3-6"]],
        e: [["dh", "cal", "measure"], ["cal", "hl", "combine"], ["hl", "be", "or calculate"], ["dh", "ea", "PE diagram"], ["ea", "cat", "lowered by"], ["ct", "ea", "needs"], ["ea", "arr", "sets T effect"], ["ct", "rl", "quantify"]] },
  u4: { n: [["de", "Dynamic\nequilibrium", 0, 0, "u4-1"], ["k", "K expression", 0, 1, "u4-1"], ["ice", "ICE tables", 0, 2, "u4-2"], ["lc", "Le Chatelier\nQ vs K", 1, 0, "u4-3"], ["ab", "Acids & bases\nconjugate pairs", 1, 1, "u4-4"], ["ph", "pH & pOH", 1, 2, "u4-5"], ["ka", "Weak acids\nKa · Kb", 2, 1, "u4-6"], ["ti", "Titrations", 2, 2, "u4-7"], ["ksp", "Solubility\nKsp", 2, 0, "u4-7"]],
        e: [["de", "k", "described by"], ["k", "ice", "solve with"], ["de", "lc", "stressed"], ["k", "ab", "applied to"], ["ab", "ph", "measured as"], ["ab", "ka", "partial"], ["ka", "ti", "curve shape"], ["k", "ksp", "for salts"], ["ph", "ti", ""]] },
  u5: { n: [["on", "Oxidation\nnumbers", 0, 0, "u5-1"], ["hr", "Half-reaction\nbalancing", 0, 1, "u5-2"], ["rt", "Redox\ntitrations", 0, 2, "u5-2"], ["eo", "E° table", 1, 0, "u5-3"], ["sp", "Spontaneity\nE°cell > 0", 1, 1, "u5-3"], ["gc", "Voltaic cells", 2, 0, "u5-4"], ["co", "Corrosion &\nprotection", 2, 1, "u5-4"], ["el", "Electrolytic\ncells", 1, 2, "u5-5"], ["fa", "Faraday's law\nQ = It", 2, 2, "u5-6"]],
        e: [["on", "hr", "track e⁻"], ["hr", "rt", "mole ratio"], ["on", "eo", ""], ["eo", "sp", "predicts"], ["sp", "gc", "E° > 0"], ["sp", "el", "E° < 0: needs power"], ["gc", "co", "same chemistry"], ["el", "fa", "how much?"]] },
};
function conceptMap(el){
  const map = MAPS[el.dataset.cmap]; if (!map) return;
  const W = 112, H = 46, pos = {};
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
  el.innerHTML = `<svg viewBox="0 0 464 272" role="group" aria-label="Concept map: select a box to open its lesson" class="cm-svg">
    <defs><marker id="cm-ah-${el.dataset.cmap}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" class="cm-ah"/></marker></defs>
    ${map.e.map(edge).join("")}${map.n.map(node).join("")}</svg>
    <p class="note">🗺 How the ideas in this unit connect. Select any box to jump to its lesson.</p>`;
  el.querySelectorAll("[data-cm-lesson]").forEach(g => {
    const open = () => el.dispatchEvent(new CustomEvent("lm-open-lesson", { bubbles: true, detail: g.dataset.cmLesson }));
    g.addEventListener("click", open);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
}

const MODELS = { energy: energyModel, titration: titrationModel, cell: cellModel, vsepr: vseprModel };

export function mountAll(root){
  root.querySelectorAll("[data-model]").forEach(el => { if (!el.dataset.mounted){ el.dataset.mounted = "1"; MODELS[el.dataset.model](el); } });
  root.querySelectorAll("[data-cmap]").forEach(el => { if (!el.dataset.mounted){ el.dataset.mounted = "1"; conceptMap(el); } });
}
export { titrationPH, tailFraction };
