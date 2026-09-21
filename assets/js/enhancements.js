(function () {
  "use strict";

  var base = document.currentScript.getAttribute("data-vendor");
  if (!base) return;

  function loadScript(path) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = base + path;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Could not load " + path)); };
      document.head.appendChild(script);
    });
  }

  function report(error) {
    console.warn("Optional page enhancement unavailable.", error);
  }

  if (document.querySelector(".grid")) {
    Promise.all([
      loadScript("masonry-layout-4.2.2/dist/masonry.pkgd.min.js"),
      loadScript("imagesloaded-5.0.0/imagesloaded.pkgd.min.js")
    ]).then(function () {
      var $grid = window.jQuery(".grid").masonry({
        percentPosition: true,
        itemSelector: ".grid-item",
        columnWidth: ".grid-sizer"
      });
      $grid.imagesLoaded().progress(function () { $grid.masonry("layout"); });
      window.jQuery(".lazy").on("load", function () { $grid.masonry("layout"); });
    }).catch(report);
  }

  if (document.querySelector(".github-button")) {
    loadScript("github-buttons-2.14.2/dist/buttons.min.js").catch(report);
  }

  // Ignore scripts/code just as KaTeX auto-render does. Existing content keeps
  // its $ / $$ delimiters; pages without math don't download KaTeX or its fonts.
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      return node.parentElement.closest("script, noscript, style, textarea, pre, code, option, .katex")
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  var node;
  var hasMath = false;
  while ((node = walker.nextNode())) {
    if (/\$[\s\S]+?\$/.test(node.textContent)) { hasMath = true; break; }
  }
  if (hasMath) {
    var stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = base + "katex-0.16.11/dist/katex.min.css";
    var stylesReady = new Promise(function (resolve, reject) {
      stylesheet.onload = resolve;
      stylesheet.onerror = reject;
    });
    document.head.appendChild(stylesheet);
    Promise.all([stylesReady, loadScript("katex-0.16.11/dist/katex.min.js")])
      .then(function () { return loadScript("katex-0.16.11/dist/contrib/auto-render.min.js"); })
      .then(function () {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      }).catch(report);
  }
}());
