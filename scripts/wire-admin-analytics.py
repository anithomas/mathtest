"""One-off patch: mount the shared admin analytics panel (/admin-analytics.js) in a course's Admin page.
usage: python scripts/wire-admin-analytics.py MPT/index.html [LMCA/index.html ...]
Adds mountAnalytics() before renderAdmin() and calls it right before the "Add a user" handler is attached.
Every anchor must match exactly once or the script stops without writing that file."""
import sys

SNIPPET = r'''// Admin analytics: class and per-student progress and section use (shared /admin-analytics.js, loaded on demand
// so students never download it). Reads the progress collections that firestore.rules opens read-only to admins.
function mountAnalytics(){
  if (!adminMode) return;
  const card = document.createElement("div");
  card.className = "card"; card.id = "ad-analytics"; card.style.marginTop = "14px";
  card.innerHTML = `<h3 style="margin-bottom:4px">📊 Analytics</h3><p class="note" style="margin:0 0 10px">Class and per-student progress and section use, from students' saved progress. Visible to administrators only.</p><div id="ad-analytics-body"><p class="note">Loading…</p></div>`;
  views.appendChild(card);
  const body = card.querySelector("#ad-analytics-body");
  const COURSES = [["MPT", "MPT prep", "mpt"], ["MHF4U", "Grade 12 · MHF4U", "mhf4u"], ["MCR3U", "Grade 11 · MCR3U", "mcr3u"], ["SCH4U", "Grade 12 · SCH4U Chemistry", "sch4u"], ["LMCA", "Lakehead Math Competency", "lmca"]];
  const fetchCourse = async coll => {
    const f = cloud.fns, docs = [], profiles = {};
    (await f.getDocs(f.collection(cloud.db, coll))).forEach(d => docs.push({ uid: d.id, data: d.data() }));
    try { (await f.getDocs(f.collection(cloud.db, "profiles"))).forEach(d => { const v = d.data(); profiles[d.id] = { email: v.email, displayName: v.displayName }; }); } catch (_) { /* names are optional */ }
    return { docs, profiles };
  };
  const describe = id => {
    const q = typeof QB !== "undefined" ? QB[id] : typeof BANK !== "undefined" ? BANK.find(x => x.id === id) : null;
    const text = q ? String(q.p || q.q || "") : "";
    return text ? (typeof plain === "function" ? plain(text) : text) : id;
  };
  const order = typeof D !== "undefined" && D.UNITS ? D.UNITS.map(u => u.name) : null;
  const ready = window.LMAdminAnalytics ? Promise.resolve() : new Promise((ok, bad) => {
    const s = document.createElement("script"); s.src = "/admin-analytics.js"; s.onload = ok; s.onerror = () => bad(new Error("couldn't load /admin-analytics.js")); document.head.appendChild(s);
  });
  ready.then(() => LMAdminAnalytics.render(body, { courses: COURSES.map(c => ({ id: c[0], label: c[1], coll: c[2] })), courseId: COURSE_ID, fetchCourse, describe, order }))
    .catch(e => { body.textContent = "Analytics couldn't load: " + e.message; });
}
'''

for path in sys.argv[1:]:
    s = open(path, encoding='utf-8', newline='').read()
    crlf = '\r\n' in s
    s = s.replace('\r\n', '\n')

    def rep(a, b):
        global s
        assert s.count(a) == 1, (path, a[:60], s.count(a))
        s = s.replace(a, b)

    rep('async function renderAdmin(){', SNIPPET + 'async function renderAdmin(){')
    rep('  $("#ad-add").onclick = async () => {', '  mountAnalytics();\n  $("#ad-add").onclick = async () => {')
    open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
    print('mounted', path)
