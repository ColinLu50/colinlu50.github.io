import "./leaf-walker.js";
import { AntRenderer } from "./ant-renderer.js?v=20260920-light-motion";
import { SkyRenderer } from "./sky-renderer.js?v=20260920-light-motion";
import { SkyMotion } from "./sky-motion.js";

(function () {
  "use strict";
  var hero = document.querySelector("[data-sky-scene]");
  if (!hero) return;
  var controls = hero.querySelector("[data-sky-controls]");
  var clock = hero.querySelector("[data-sky-clock-text]");
  var reset = hero.querySelector("[data-sky-reset]");
  var looks = Array.from(hero.querySelectorAll("[data-sky-look]"));
  var copy = hero.querySelector(".home-hero-copy");
  var antButton = hero.querySelector("[data-sky-ant]");
  var antCanvas = hero.querySelector("[data-ant-canvas]");
  var antAnnouncement = hero.querySelector("[data-ant-announcement]");
  var skyCanvas = hero.querySelector("[data-sky-canvas]");
  var skyRenderer = null;
  try { skyRenderer = new SkyRenderer(skyCanvas); }
  catch (error) { console.warn("Using the gradient sky fallback.", error); }
  var antRenderer = null;
  try { antRenderer = new AntRenderer(antCanvas); }
  catch (error) { console.warn("The foreground insect needs WebGL; the sky remains available.", error); }
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var paused = reduced.matches;
  var visible = false;
  var manual = null;
  var frame = 0;
  var previous = 0;
  var motion = new SkyMotion();
  var pointer = motion.pointer;
  var sceneTimes = { dawn: "06:30", noon: "12:00", sunset: "18:00", night: "21:00" };
  var ant = antRenderer ? new window.LeafWalker(antRenderer.grass.surface) : null;
  var hovered = false;
  var keyboard = false;
  function localLook(now) {
    var hour = now.getHours() + now.getMinutes() / 60;
    if (hour >= 5 && hour < 9) return "dawn";
    if (hour >= 9 && hour < 17) return "noon";
    if (hour >= 17 && hour < 19.5) return "sunset";
    return "night";
  }
  function updateTime() {
    var now = new Date();
    var look = manual || localLook(now);
    var label = manual ? sceneTimes[look] : String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    clock.textContent = label;
    clock.dateTime = label;
    if (hero.dataset.skyLook === look) return;
    var immediate = paused || !visible || document.hidden || !hero.dataset.skyLook || !skyRenderer;
    hero.dataset.skyLook = look;
    looks.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.skyLook === look)); });
    motion.select(look, immediate);
    applyLighting();
    drawScene();
  }
  looks.forEach(function (button) {
    button.addEventListener("click", function () { manual = button.dataset.skyLook; updateTime(); });
  });
  reset.addEventListener("click", function () {
    manual = null;
    updateTime();
  });

  function syncMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    var stopped = paused || !visible || document.hidden;
    hero.dataset.skyPaused = String(stopped);
    if (stopped) {
      motion.release(true);
      if (motion.transitioning) { motion.finish(); applyLighting(); }
      drawScene();
    }
    if (!stopped) frame = requestAnimationFrame(animate);
  }
  function applyLighting() {
    // Change the text palette when the sky crosses into night, not on click.
    var theme = motion.weights.night > .5 ? "night" : "day";
    if (hero.dataset.skyTheme !== theme) hero.dataset.skyTheme = theme;
    if (skyRenderer) skyRenderer.setBlend(motion.weights);
    if (antRenderer) antRenderer.setBlend(motion.weights);
  }
  function drawScene() {
    if (skyRenderer) skyRenderer.render(0, pointer);
    drawAnt(0);
  }
  reduced.addEventListener("change", function () {
    paused = reduced.matches;
    motion.release(true);
    syncMotion();
  });

  function drawAnt(dt) {
    if (!antRenderer) return;
    antButton.hidden = ant.state === "away";
    antCanvas.hidden = false;
    var focused = ant.state !== "away" && (hovered || keyboard || ant.reacting);
    antButton.dataset.antState = ant.state;
    var position = antRenderer.render(ant, focused, dt);
    antButton.style.transform = "translate3d(" + (position.x - 40).toFixed(2) + "px," + (position.y - 40).toFixed(2) + "px,0)";
  }
  function updateAttention() {
    if (!ant) return;
    ant.setAttention(hovered || keyboard);
    drawAnt();
  }
  antButton.addEventListener("pointerenter", function (event) {
    if (event.pointerType !== "touch") hovered = true;
    updateAttention();
  });
  antButton.addEventListener("pointerleave", function () { hovered = false; updateAttention(); });
  antButton.addEventListener("focus", function () { keyboard = antButton.matches(":focus-visible"); updateAttention(); });
  antButton.addEventListener("blur", function () { keyboard = false; updateAttention(); });
  antButton.addEventListener("click", function () {
    if (!ant) return;
    if (paused) {
      antAnnouncement.textContent = "The ant is resting while reduced motion is enabled.";
    } else {
      ant.react();
      antAnnouncement.textContent = "The ant startles and scurries away.";
    }
    drawAnt();
  });
  if (paused && ant) ant.showResting();
  antCanvas.addEventListener("webglcontextlost", function () {
    antButton.hidden = antCanvas.hidden = true;
    antRenderer = ant = null;
    hero.dataset.antRenderer = "unavailable";
  });
  skyCanvas.addEventListener("webglcontextlost", function () {
    skyCanvas.hidden = true;
    hero.dataset.skyRenderer = "gradient";
    skyRenderer = null;
    motion.finish();
    applyLighting();
    drawAnt(0);
  });

  function animate(now) {
    frame = 0;
    if (paused || !visible || document.hidden) return;
    if (previous && now - previous < 32) { frame = requestAnimationFrame(animate); return; }
    var dt = previous ? Math.min((now - previous) / 1000, .06) : .033;
    previous = now;
    if (motion.step(dt)) applyLighting();
    if (skyRenderer) skyRenderer.render(dt, pointer);
    if (antRenderer) ant.tick(dt);
    drawAnt(dt);
    frame = requestAnimationFrame(animate);
  }
  hero.addEventListener("pointermove", function (event) {
    if (paused || !visible || event.pointerType === "touch") return;
    var rect = hero.getBoundingClientRect();
    if (rect.width && rect.height) motion.move((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
  }, { passive: true });
  hero.addEventListener("pointerleave", function () { motion.release(); });
  window.addEventListener("blur", function () { motion.release(); });
  function resize() {
    if (!hero.clientWidth || !hero.clientHeight) return;
    var width = hero.clientWidth, height = hero.clientHeight;
    var frameRect = hero.getBoundingClientRect();
    if (skyRenderer) {
      var regions = Array.from(hero.querySelectorAll(".home-eyebrow, .home-name, .home-hero-thesis, .home-position, .home-bio, .home-profile-links, [data-sky-controls]"))
        .filter(function (element) { return element.textContent.trim() && element.clientHeight; })
        .map(function (element) {
          var range = document.createRange(); range.selectNodeContents(element);
          var r = range.getBoundingClientRect();
          return { left: r.left - frameRect.left, top: r.top - frameRect.top,
            right: r.right - frameRect.left, bottom: r.bottom - frameRect.top };
        });
      var portraitElement = hero.querySelector('.home-portrait');
      var portraitTop = portraitElement && portraitElement.clientHeight ? portraitElement.getBoundingClientRect().top - frameRect.top : 260;
      skyRenderer.resize(width, height, regions, portraitTop, window.innerHeight);
      skyRenderer.render(0, pointer);
    }
    if (antRenderer) antRenderer.resize(width, height);
    if (ant) ant.resizeSurface();
    drawAnt();
  }
  if ("ResizeObserver" in window) {
    var layoutObserver = new ResizeObserver(resize);
    layoutObserver.observe(hero); layoutObserver.observe(copy);
  }
  else window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; syncMotion(); }).observe(hero);
  else visible = true;
  document.addEventListener("visibilitychange", function () { updateTime(); syncMotion(); });
  window.addEventListener("pageshow", function () { visible = hero.getBoundingClientRect().bottom > 0; updateTime(); syncMotion(); });
  window.addEventListener("pagehide", function () { visible = false; syncMotion(); });
  controls.hidden = false;
  hero.dataset.skyRenderer = skyRenderer ? "procedural" : "gradient";
  hero.dataset.antRenderer = antRenderer ? "three-webgl" : "unavailable";
  resize();
  updateTime();
  syncMotion();
  setInterval(updateTime, 10000);
}());
