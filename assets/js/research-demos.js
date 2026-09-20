/* Register native Konva scenes after the lazy loader has supplied shared libraries. */
(function () {
  "use strict";
  if (!window.ResearchPanel || !window.ResearchScenes) return;
  window.ResearchPanel.mountAll({
    hive: window.ResearchScenes.hive,
    prm: window.ResearchScenes.prm,
    paw: window.ResearchScenes.paw,
    "safe-delta": window.ResearchScenes["safe-delta"],
    sico: window.ResearchScenes.sico
  });
}());
