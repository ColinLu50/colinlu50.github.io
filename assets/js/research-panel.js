/* Shared panel lifecycle. Scenes supply content and a paused GSAP timeline. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.ResearchPanel = factory(root);
}(typeof window !== "undefined" ? window : this, function (window) {
  "use strict";

  var document = window.document;
  var mounted = new WeakMap();
  var CONTENT_HEIGHT = 188;

  class ResearchPanel {
    constructor(viewport, renderer) {
      this.viewport = viewport;
      this.wrapper = viewport.closest(".research-demo");
      this.replay = this.wrapper.querySelector("[data-research-demo-replay]");
      this.renderer = renderer;
      this.type = viewport.getAttribute("data-research-viz");
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.visible = !("IntersectionObserver" in window);
      this.hasPlayed = false;
      this.playing = false;
      this.finished = false;
      this.scrubProgress = null;
      this.destroyed = false;
      this.listeners = [];
      this.motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
      this.reduced = !!(this.motionQuery && this.motionQuery.matches);
      this.finished = this.reduced;
      this.hasPlayed = this.reduced;
      viewport.__researchVisual = this;

      if (typeof renderer === "function") {
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("aria-hidden", "true");
        viewport.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        viewport.setAttribute("data-renderer", "canvas");
      } else {
        this.stage = new window.Konva.Stage({ container: viewport, width: 0, height: 0, listening: false });
        this.layer = new window.Konva.Layer({ listening: false });
        this.group = new window.Konva.Group({ listening: false });
        this.stage.add(this.layer);
        this.layer.add(this.group);
        // The DOM viewport owns accessibility and pointer events, not hit canvases.
        this.stage.content.setAttribute("aria-hidden", "true");
        viewport.setAttribute("data-renderer", "konva");
      }

      this.listen(this.replay, "click", () => this.start(true));
      this.listen(viewport, "pointermove", event => {
        if (!this.finished || this.playing || this.reduced || !this.timeline) return;
        var rect = viewport.getBoundingClientRect();
        if (!rect.width) return;
        this.scrubProgress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        this.wrapper.classList.add("is-scrubbing");
        this.timeline.pause().progress(this.scrubProgress, true);
        this.draw();
      });
      ["pointerleave", "pointercancel", "pointerup"].forEach(name => {
        this.listen(viewport, name, () => this.endScrub());
      });
      this.listen(document, "visibilitychange", () => this.syncPlayback());
      this.motionChange = () => {
        this.reduced = this.motionQuery.matches;
        if (this.reduced) this.complete();
        this.updateControl();
      };
      if (this.motionQuery) {
        if (this.motionQuery.addEventListener) this.motionQuery.addEventListener("change", this.motionChange);
        else if (this.motionQuery.addListener) this.motionQuery.addListener(this.motionChange);
      }
      if ("ResizeObserver" in window) {
        this.resizeObserver = new window.ResizeObserver(() => this.resize());
        this.resizeObserver.observe(viewport);
      } else this.listen(window, "resize", () => this.resize());
      this.resize();
      this.updateControl();
      if ("IntersectionObserver" in window) {
        this.intersectionObserver = new window.IntersectionObserver(entries => {
          entries.forEach(entry => {
            this.visible = entry.isIntersecting;
            if (this.visible) this.start(false);
            else this.syncPlayback();
          });
        }, { threshold: .12 });
        this.intersectionObserver.observe(viewport);
      } else this.start(false);
    }

    listen(target, event, handler) {
      if (!target) return;
      target.addEventListener(event, handler);
      this.listeners.push(() => target.removeEventListener(event, handler));
    }

    updateControl() {
      if (this.replay) this.replay.hidden = this.reduced;
      this.wrapper.classList.toggle("is-playing", this.playing);
    }

    theme() {
      var style = window.getComputedStyle(this.wrapper);
      function token(name, fallback) {
        return style.getPropertyValue("--research-demo-" + name).trim() || fallback;
      }
      return {
        ink: token("ink", "#303438"), muted: token("muted", "#626a6e"),
        surface: token("surface", "#f1f2f1"),
        accent: "rgb(" + token("accent", "159, 89, 104") + ")",
        rule: token("border", "rgba(39,49,57,.17)")
      };
    }

    resize() {
      if (this.destroyed) return;
      var rect = this.viewport.getBoundingClientRect();
      var width = Math.max(0, Math.round(rect.width));
      var height = Math.max(0, Math.round(rect.height));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!width || !height) return;
      if (width === this.width && height === this.height && dpr === this.dpr) return;
      var progress = this.progress();
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.scale = Math.min(Math.max(width / 720, 1), height / CONTENT_HEIGHT);
      this.offsetY = (height - CONTENT_HEIGHT * this.scale) / 2;
      if (this.stage) {
        // Re-layout only on resize; the timeline restores the current scene state.
        if (this.timeline) this.timeline.kill();
        if (this.scene && this.scene.destroy) this.scene.destroy();
        this.group.destroyChildren();
        this.layer.getCanvas().setPixelRatio(dpr);
        this.stage.size({ width: width, height: height });
        this.group.setAttrs({ scaleX: this.scale, scaleY: this.scale, y: this.offsetY });
        this.scene = this.renderer.create({
          Konva: window.Konva, gsap: window.gsap, root: this.group,
          width: width / this.scale, height: CONTENT_HEIGHT, theme: this.theme()
        });
        this.timeline = this.scene.timeline;
      } else {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        if (!this.timeline) {
          this.state = { progress: 0 };
          this.timeline = window.gsap.timeline({ paused: true }).to(this.state, {
            progress: 1, duration: 7.1, ease: "none"
          });
        }
      }
      this.timeline.eventCallback("onUpdate", () => this.draw());
      this.timeline.eventCallback("onComplete", () => this.complete());
      this.timeline.pause().progress(progress, true);
      this.draw();
      this.syncPlayback();
    }

    progress() {
      if (this.reduced) return 1;
      if (this.scrubProgress !== null) return this.scrubProgress;
      if (this.finished) return 1;
      return this.timeline ? this.timeline.progress() : 0;
    }

    draw() {
      if (this.destroyed || !this.width || !this.height) return;
      if (this.scene) {
        this.scene.render();
        // Konva batches attribute changes into one draw automatically.
      } else if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale,
          0, this.dpr * (this.offsetY - 32 * this.scale));
        this.renderer(this.ctx, this.width / this.scale, 220, this.state.progress);
      }
    }

    start(restart) {
      if (this.destroyed) return;
      if (this.reduced) { this.complete(); return; }
      if (!this.hasPlayed || restart) {
        this.hasPlayed = true;
        this.playing = true;
        this.finished = false;
        this.scrubProgress = null;
        this.wrapper.classList.remove("is-scrubbing");
        if (this.timeline) this.timeline.pause().progress(0, true);
        this.updateControl();
        this.draw();
      }
      this.syncPlayback();
    }

    syncPlayback() {
      if (!this.timeline) return;
      var active = !this.destroyed && this.visible && !document.hidden && this.playing && !this.reduced;
      if (active) this.timeline.play();
      else this.timeline.pause();
    }

    complete() {
      this.hasPlayed = true;
      this.playing = false;
      this.finished = true;
      this.scrubProgress = null;
      this.wrapper.classList.remove("is-scrubbing");
      if (this.timeline) this.timeline.pause().progress(1, true);
      this.updateControl();
      this.draw();
    }

    endScrub() {
      if (this.scrubProgress === null) return;
      this.scrubProgress = null;
      this.wrapper.classList.remove("is-scrubbing");
      if (this.timeline) this.timeline.pause().progress(1, true);
      this.draw();
    }

    destroy() {
      this.destroyed = true;
      this.playing = false;
      if (this.timeline) this.timeline.kill();
      if (this.scene && this.scene.destroy) this.scene.destroy();
      if (this.stage) this.stage.destroy();
      else if (this.canvas) this.canvas.remove();
      this.listeners.forEach(remove => remove());
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      if (this.motionQuery) {
        if (this.motionQuery.removeEventListener) this.motionQuery.removeEventListener("change", this.motionChange);
        else if (this.motionQuery.removeListener) this.motionQuery.removeListener(this.motionChange);
      }
      this.wrapper.classList.remove("is-playing", "is-scrubbing");
      delete this.viewport.__researchVisual;
      mounted.delete(this.viewport);
    }

    static mountAll(renderers, scope) {
      if (!window.gsap) return [];
      return Array.from((scope || document).querySelectorAll(".research-demo-viewport")).reduce((panels, viewport) => {
        var renderer = renderers[viewport.getAttribute("data-research-viz")];
        if (!renderer || (typeof renderer !== "function" && (!window.Konva || typeof renderer.create !== "function"))) return panels;
        if (!mounted.has(viewport)) mounted.set(viewport, new ResearchPanel(viewport, renderer));
        panels.push(mounted.get(viewport));
        return panels;
      }, []);
    }
  }

  return ResearchPanel;
}));
