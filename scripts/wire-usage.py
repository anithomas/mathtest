"""One-off patch: make a course page record weekly section usage (see usage.js).
usage: python scripts/wire-usage.py MHF4U/index.html [MCR3U/index.html ...]
MHF4U, MCR3U and SCH4U save through payload()/mergeInto(); MPT and LMCA build the saved object inline in persist()
and merge in loadCloud(), so they take the "legacy" branch. Every anchor must match exactly once or the script stops
without writing that file."""
import sys

for path in sys.argv[1:]:
    s = open(path, encoding='utf-8', newline='').read()
    crlf = '\r\n' in s
    s = s.replace('\r\n', '\n')

    def rep(a, b):
        global s
        assert s.count(a) == 1, (path, a[:70], s.count(a))
        s = s.replace(a, b)

    legacy = 'function payload(){' not in s
    rep('<script src="/clinic.js"></script>', '<script src="/clinic.js"></script>\n<script src="/usage.js"></script>')
    rep('store.mlog = store.mlog || {}; }', 'store.mlog = store.mlog || {}; store.usage = store.usage || {}; }')
    if legacy:
        rep('mlog: store.mlog || {}, updated: Date.now() };', 'mlog: store.mlog || {}, usage: store.usage || {}, updated: Date.now() };')
        rep('let data = null; const lc = store.clinic, lm = store.mlog;', 'let data = null; const lc = store.clinic, lm = store.mlog, lu = store.usage;')
        rep('store.mlog = CL.mergeLog(data.mlog, lm); }', 'store.mlog = CL.mergeLog(data.mlog, lm); }\n  store.usage = LMUsage.merge(data && data.usage, lu);')
        rep('function go(view){\n  if (view === "study" && !adminMode && window.lmTrackEvent) window.lmTrackEvent("study_hub_opened");',
            'function go(view){\n  if (view === "study" && !adminMode && window.lmTrackEvent) window.lmTrackEvent("study_hub_opened");\n'
            '  if (!adminMode){ LMUsage.bump(store, view); persist(); }')
        rep('function startSession(kind, questions, label){\n', 'function startSession(kind, questions, label){\n  if (!adminMode && /Challenge/.test(label || "")) LMUsage.bump(store, "challenge");\n')
    else:
        rep('mlog: store.mlog || {}, updated: Date.now() }; }', 'mlog: store.mlog || {}, usage: store.usage || {}, updated: Date.now() }; }')
        rep('localMlog = store.mlog || {};\n', 'localMlog = store.mlog || {}, localUsage = store.usage || {};\n')
        rep('store.mlog = CL.mergeLog(d.mlog, localMlog);', 'store.mlog = CL.mergeLog(d.mlog, localMlog); store.usage = LMUsage.merge(d.usage, localUsage);')
        rep('function go(view, opt){\n  if (view === "study" && !adminMode && window.lmTrackEvent) window.lmTrackEvent("study_hub_opened");',
            'function go(view, opt){\n  if (view === "study" && !adminMode && window.lmTrackEvent) window.lmTrackEvent("study_hub_opened");\n'
            '  if (!adminMode){ LMUsage.bump(store, view); persist(); }')
        # Challenge quiz or simulation starts (their session labels contain "Challenge")
        rep('function startSession(kind, questions, label){\n', 'function startSession(kind, questions, label){\n  if (!adminMode && /Challenge/.test(label || "")) LMUsage.bump(store, "challenge");\n')
        # a guided problem is solved
        rep('st.vals[st.step] = val; st.step++;', 'st.vals[st.step] = val; st.step++; if (st.step === g.steps.length && !adminMode) LMUsage.bump(store, "guided");')
        # interactive models opened (at most once a minute: the Study Hub re-renders often)
        rep('function mountModels(){\n', 'let modelBumpAt = 0;\nfunction mountModels(){\n  if (!adminMode && views.querySelector("[data-model]") && Date.now() - modelBumpAt > 60000){ modelBumpAt = Date.now(); LMUsage.bump(store, "model"); }\n')
    open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
    print('wired' + (' (legacy persist)' if legacy else ''), path)
