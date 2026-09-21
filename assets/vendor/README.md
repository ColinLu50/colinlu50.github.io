# Site dependencies

These are the same library versions previously loaded from cdnjs, Google Fonts,
jsDelivr and unpkg. They now ship with GitHub Pages so rendering does not depend
on those services. No package manager or additional build step is needed.

- `sources.json` records package versions, npm archive URLs and verified archive
  integrity values. Upstream license files and minified license headers are kept.
- Only runtime files are included: no node_modules, source maps or development
  bundles. Source-map comments are removed to avoid requests for absent maps.
- Font Awesome and KaTeX retain WOFF2 fonts; Academicons 1.9.1 supplies WOFF.
  Font `src` lists only reference those included formats. Other CSS declarations
  and the original font binaries are unchanged.
- Lato v25 retains normal/italic weights 300, 400, 700 and 900, including Latin
  and Latin Extended subsets, with the original `font-display: swap`. Raleway
  was requested by the old template but is not used by any active site style.
- After the first paint, KaTeX (including its fonts), Masonry, imagesLoaded and
  GitHub Buttons automatically load if the page contains their matching content.
  Research panel assets also load in the background without waiting for a scroll;
  offscreen animations stay paused. GitHub Buttons still contacts GitHub when used.
- Three.js, Konva and GSAP remain under `assets/js/vendor`.

The visitor counter is a live third-party service, not a static asset. Its loader
starts asynchronously after the site's load event and never gates page controls
or animations.
