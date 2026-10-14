/*
 * LogicManse Study analytics. Add a GA4 measurement ID only after setting
 * two-month retention and disabling Google Signals / ad personalization in GA.
 * Events use fixed page names and an allow-list; never pass student data here.
 */
(() => {
  const MEASUREMENT_ID = "G-287BL8NXV3";
  const CONSENT_KEY = "logicmanse-analytics-consent";
  const isProduction = window.location.hostname === "mathtest.logicmanse.ca";
  const pages = {
    catalog: { path: "/", title: "LogicManse Study · Courses" },
    MPT: { path: "/MPT/", title: "MathTest Trail · MPT Prep" },
    MHF4U: { path: "/MHF4U/", title: "MathTest Trail · MHF4U" },
    LMCA: { path: "/LMCA/", title: "MathTest Trail · Lakehead Math Competency" }
  };
  const events = new Set(["study_hub_opened", "desmos_opened", "practice_started"]);
  let currentPage = "";
  let loaded = false;

  function consent() {
    try { return localStorage.getItem(CONSENT_KEY) === "yes"; }
    catch (_) { return false; }
  }

  function sendPage() {
    const page = pages[currentPage];
    if (loaded && page && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_location: window.location.origin + page.path,
        page_referrer: window.location.origin,
        page_title: page.title
      });
    }
  }

  function loadAnalytics() {
    if (loaded || !currentPage || !/^G-[A-Z0-9]+$/i.test(MEASUREMENT_ID) || !consent()) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      page_location: window.location.origin + pages[currentPage].path,
      page_referrer: window.location.origin,
      page_title: pages[currentPage].title,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 5184000,
      cookie_update: false
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
    sendPage();
  }

  window.lmTrackPage = function(pageKey) {
    if (!Object.prototype.hasOwnProperty.call(pages, pageKey)) return;
    currentPage = pageKey;
    if (consent()) loadAnalytics();
    else sendPage();
  };

  window.lmTrackEvent = function(eventName) {
    if (!events.has(eventName) || !loaded || !currentPage || typeof window.gtag !== "function") return;
    const page = pages[currentPage];
    window.gtag("event", eventName, {
      course_code: currentPage === "catalog" ? "catalog" : currentPage,
      page_location: window.location.origin + page.path,
      page_referrer: window.location.origin,
      page_title: page.title
    });
  };

  function showConsent() {
    let saved = "";
    try { saved = localStorage.getItem(CONSENT_KEY) || ""; } catch (_) { return; }
    if (!isProduction || !/^G-[A-Z0-9]+$/i.test(MEASUREMENT_ID) || saved) return;
    const banner = document.createElement("aside");
    banner.setAttribute("aria-label", "Optional analytics choice");
    banner.innerHTML = '<div class="lm-consent-copy"><strong>Help improve LogicManse Study?</strong><br>Optional Google Analytics uses a first-party client ID and may collect browser/device details and approximate location. We do not send names, emails, answers, or scores. <a href="/privacy.html">Details</a></div><div class="lm-consent-actions"><button type="button" data-choice="no">No thanks</button><button type="button" data-choice="yes">Allow analytics</button></div>';
    Object.assign(banner.style, { position:"fixed", zIndex:"1000", left:"16px", right:"16px", bottom:"16px", maxWidth:"920px", margin:"auto", padding:"16px 18px", border:"1px solid #d8e1d9", borderRadius:"16px", background:"#fffdf8", boxShadow:"0 12px 44px rgba(28,43,38,.18)", color:"#2b3a3a", font:"14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"16px", flexWrap:"wrap" });
    const style = document.createElement("style");
    style.textContent = '.lm-consent-copy{flex:1;min-width:250px}.lm-consent-copy a{color:#0f6b6e;font-weight:700}.lm-consent-actions{display:flex;gap:8px}.lm-consent-actions button{border:1px solid #0f6b6e;border-radius:10px;padding:9px 13px;background:#fffdf8;color:#0a4f52;font:600 13px system-ui;cursor:pointer}.lm-consent-actions button[data-choice="yes"]{background:#0f6b6e;color:white}';
    document.head.appendChild(style);
    document.body.appendChild(banner);
    banner.querySelectorAll("button[data-choice]").forEach(button => button.addEventListener("click", () => {
      try { localStorage.setItem(CONSENT_KEY, button.dataset.choice); } catch (_) {}
      banner.remove();
      if (button.dataset.choice === "yes") loadAnalytics();
    }));
  }

  if (isProduction && /^G-[A-Z0-9]+$/i.test(MEASUREMENT_ID)) {
    if (consent()) { /* load after the page sets its fixed course key */ }
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showConsent, { once: true });
    else showConsent();
  }
})();
