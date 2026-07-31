(function () {
  "use strict";

  var root = document.querySelector("[data-view-switch-root]");
  var control = document.querySelector("[data-view-switch]");
  if (!root || !control) return;

  var editorialView = root.querySelector("[data-view-editorial]");
  var classicView = root.querySelector("[data-view-classic]");
  var label = control.querySelector("[data-view-switch-label]");
  var storageKey = "site-view-style";

  function setView(mode, remember) {
    var classic = mode === "classic";
    root.classList.toggle("is-classic", classic);

    if (editorialView) {
      editorialView.hidden = classic;
      editorialView.setAttribute("aria-hidden", classic ? "true" : "false");
    }
    if (classicView) {
      classicView.hidden = !classic;
      classicView.setAttribute("aria-hidden", classic ? "false" : "true");
    }

    control.dataset.viewMode = classic ? "classic" : "editorial";
    control.setAttribute("aria-pressed", classic ? "true" : "false");
    control.setAttribute("aria-label", "Switch to " + (classic ? "Editorial" : "Classic") + " presentation style");
    if (label) label.textContent = classic ? "Classic" : "Editorial";

    if (remember) {
      try {
        window.localStorage.setItem(storageKey, classic ? "classic" : "editorial");
      } catch (error) {
        // The control still works when storage is unavailable.
      }
    }
  }

  var savedMode = null;
  try {
    savedMode = window.localStorage.getItem(storageKey);
    if (!savedMode) {
      var legacyMode = window.localStorage.getItem("home-page-version");
      if (legacyMode === "original") savedMode = "classic";
    }
  } catch (error) {
    savedMode = null;
  }

  setView(savedMode === "classic" ? "classic" : "editorial", false);

  control.addEventListener("click", function () {
    setView(control.dataset.viewMode === "classic" ? "editorial" : "classic", true);
  });
}());