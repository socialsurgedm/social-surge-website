/* Social Surge consent banner — Consent Mode v2.
   Loaded synchronously in <head> right after the gtag consent-default block,
   so a returning visitor's stored consent is applied BEFORE gtag.js sends
   its first ping (gtag.js is async; pushes here are queued ahead of it). */
(function () {
  "use strict";
  var KEY = "ss_consent"; // "granted" | "denied"
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  function grantAll() {
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted"
    });
  }

  if (stored === "granted") { grantAll(); return; }
  if (stored === "denied") { return; }

  // No stored choice — show the banner once the DOM is ready.
  function showBanner() {
    var style = document.createElement("style");
    style.textContent =
      "#ss-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:100;max-width:440px;" +
      "background:#152337;color:#fff;border-radius:14px;padding:20px 22px;" +
      "box-shadow:0 18px 50px rgba(21,35,55,.35);font-family:Inter,system-ui,sans-serif;font-size:.9rem;line-height:1.5}" +
      "#ss-consent p{margin:0 0 14px;color:#d7dee8}" +
      "#ss-consent a{color:#5299E0;text-decoration:underline}" +
      "#ss-consent .row{display:flex;gap:10px;flex-wrap:wrap}" +
      "#ss-consent button{cursor:pointer;border-radius:10px;padding:10px 18px;font-family:Sora,Inter,sans-serif;" +
      "font-weight:700;font-size:.88rem;border:0}" +
      "#ss-consent .accept{background:#5299E0;color:#fff}" +
      "#ss-consent .accept:hover{background:#3d86d3}" +
      "#ss-consent .decline{background:transparent;color:#d7dee8;border:1px solid rgba(255,255,255,.25)}" +
      "#ss-consent .decline:hover{border-color:rgba(255,255,255,.5)}" +
      "@media(max-width:600px){#ss-consent{left:10px;right:10px;bottom:10px;padding:16px 18px}}";
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.id = "ss-consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Cookie consent");
    el.innerHTML =
      "<p><strong style='color:#fff'>Cookies &amp; analytics.</strong> We use cookies to measure how the site performs and improve it. No consent, no tracking, simple as that. <a href='/privacy/'>Privacy policy</a></p>" +
      "<div class='row'>" +
      "<button type='button' class='accept'>Accept</button>" +
      "<button type='button' class='decline'>Decline</button>" +
      "</div>";

    el.querySelector(".accept").addEventListener("click", function () {
      try { localStorage.setItem(KEY, "granted"); } catch (e) {}
      grantAll();
      el.remove();
    });
    el.querySelector(".decline").addEventListener("click", function () {
      try { localStorage.setItem(KEY, "denied"); } catch (e) {}
      el.remove();
    });

    document.body.appendChild(el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();
