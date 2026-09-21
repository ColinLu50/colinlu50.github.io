(function () {
  "use strict";

  var control = document.querySelector("[data-pageviews]");
  var value = document.querySelector("[data-pageviews-value]");
  var source = document.querySelector(".visitor-map-source");
  if (!control || !value || !source) return;

  function syncPageviews() {
    var providerValue = source.querySelector(".mapmyvisitors-visitors");
    if (!providerValue) return false;

    var match = providerValue.textContent.match(/[\d,.]+/);
    if (!match) return false;

    value.textContent = match[0];
    control.classList.add("is-ready");
    control.setAttribute("aria-label", match[0] + " total page views. Open visitor statistics.");
    return true;
  }

  if (syncPageviews()) return;

  var observer = new MutationObserver(function () {
    if (syncPageviews()) observer.disconnect();
  });

  observer.observe(source, { childList: true, subtree: true, characterData: true });

  function loadProvider() {
    var url = source.getAttribute("data-pageviews-src");
    if (!url || document.getElementById("mapmyvisitors")) return;
    var script = document.createElement("script");
    script.id = "mapmyvisitors";
    script.async = true;
    script.src = url;
    source.appendChild(script);
  }

  // The provider inserts its widget beside this script (no document.write).
  // Start after page load, so even the load event is independent of the counter
  // and its private jQuery cannot race the site's deferred jQuery script.
  function scheduleProvider() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadProvider, { timeout: 2000 });
    } else {
      window.setTimeout(loadProvider, 0);
    }
  }
  if (document.readyState === "complete") scheduleProvider();
  else window.addEventListener("load", scheduleProvider, { once: true });
}());
