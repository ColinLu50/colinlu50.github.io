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
}());