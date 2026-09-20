/* Load the shared animation libraries only near a research panel. */
(function () {
  "use strict";
  var viewports = Array.from(document.querySelectorAll(".research-demo-viewport"));
  if (!viewports.length) return;
  var base = document.currentScript.getAttribute("data-assets");
  var scripts = new Map();
  var pending = null;
  var loaded = false;
  var observer;
  var controls = Array.from(document.querySelectorAll("[data-research-demo-replay]"));

  function script(file) {
    if (scripts.has(file)) return scripts.get(file);
    var result = new Promise(function (resolve, reject) {
      var element = document.createElement("script");
      element.src = base + file;
      element.async = true;
      element.onload = resolve;
      element.onerror = function () {
        scripts.delete(file);
        element.remove();
        reject(new Error("Research animation asset could not be loaded."));
      };
      document.head.appendChild(element);
    });
    scripts.set(file, result);
    return result;
  }

  function load() {
    if (loaded || pending) return pending;
    pending = Promise.all([
      script("vendor/konva/konva.min.js?v=10.5.0"),
      script("vendor/gsap/gsap.min.js?v=3.15.0")
    ]).then(function () {
      return Promise.all([
        script("research-panel.js?v=20260917-konva-panel"),
        script("research-scenes.js?v=20260917-paw-restored")
      ]);
    }).then(function () {
      viewports.forEach(function (viewport) {
        if (viewport.classList.contains("is-unavailable")) {
          viewport.textContent = "";
          viewport.classList.remove("is-unavailable");
        }
      });
      return script("research-demos.js?v=20260917-native-registry");
    }).then(function () {
      loaded = true;
      if (observer) observer.disconnect();
      controls.forEach(function (button) { button.removeEventListener("click", load); });
    }).catch(function () {
      pending = null;
      viewports.forEach(function (viewport) {
        viewport.textContent = "Diagram unavailable. Replay to retry.";
        viewport.classList.add("is-unavailable");
      });
    });
    return pending;
  }

  controls.forEach(function (button) { button.addEventListener("click", load); });
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) load();
    }, { rootMargin: "500px 0px" });
    viewports.forEach(function (viewport) { observer.observe(viewport); });
  } else load();
}());
