(function () {
  "use strict";

  var reveals = document.querySelectorAll(".studio-reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (element, index) {
      element.style.transitionDelay = Math.min(index % 3, 2) * 80 + "ms";
      revealObserver.observe(element);
    });
  } else {
    reveals.forEach(function (element) { element.classList.add("is-visible"); });
  }

  var canvases = Array.prototype.slice.call(document.querySelectorAll(".studio-paper-canvas"));
  if (!canvases.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 640;
  var H = 400;
  var C = {
    bg: "#0b0f17",
    panel: "#151b27",
    panel2: "#1b2231",
    line: "#3b465b",
    text: "#f4f1ea",
    muted: "#9aa4b6",
    blue: "#72a7ff",
    cobalt: "#5d73ff",
    coral: "#f08c72",
    mint: "#58c5a5",
    violet: "#b184f5",
    amber: "#e8b45e",
    red: "#df6c74",
    gray: "#667085"
  };

  var states = canvases.map(function (canvas) {
    return { canvas: canvas, visible: true, dirty: true };
  });

  if ("IntersectionObserver" in window) {
    var canvasObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = states.find(function (item) { return item.canvas === entry.target; });
        if (state) state.visible = entry.isIntersecting;
      });
    }, { rootMargin: "180px" });
    states.forEach(function (state) { canvasObserver.observe(state.canvas); });
  }

  if ("ResizeObserver" in window) {
    var resizeObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = states.find(function (item) { return item.canvas === entry.target; });
        if (state) state.dirty = true;
      });
    });
    states.forEach(function (state) { resizeObserver.observe(state.canvas); });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function wave(t, offset) { return .5 + .5 * Math.sin((t + (offset || 0)) * Math.PI * 2); }

  function setup(state) {
    var rect = state.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.max(1, Math.round(rect.height * dpr));
    if (state.canvas.width !== width || state.canvas.height !== height) {
      state.canvas.width = width;
      state.canvas.height = height;
    }
    var ctx = state.canvas.getContext("2d");
    ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  }

  function rr(ctx, x, y, w, h, r) {
    var radius = Math.min(r || 10, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function background(ctx, glowA, glowB) {
    var gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#0a0e16");
    gradient.addColorStop(.58, "#111725");
    gradient.addColorStop(1, "#171421");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    var rg = ctx.createRadialGradient(520, 70, 0, 520, 70, 230);
    rg.addColorStop(0, glowA || "rgba(93,115,255,.17)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(250, 0, 390, 330);

    var rg2 = ctx.createRadialGradient(90, 360, 0, 90, 360, 210);
    rg2.addColorStop(0, glowB || "rgba(240,140,114,.10)");
    rg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg2;
    ctx.fillRect(0, 180, 310, 220);

    ctx.strokeStyle = "rgba(255,255,255,.025)";
    ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y <= H; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.save();
    ctx.fillStyle = color || C.text;
    ctx.font = (weight || 500) + " " + (size || 12) + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function smallCaps(ctx, text, x, y, color) {
    ctx.save();
    ctx.fillStyle = color || C.muted;
    ctx.font = "600 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(String(text).toUpperCase(), x, y);
    ctx.restore();
  }

  function node(ctx, x, y, w, h, title, subtitle, color, active) {
    ctx.save();
    rr(ctx, x, y, w, h, 12);
    ctx.fillStyle = active ? "rgba(255,255,255,.095)" : "rgba(255,255,255,.055)";
    ctx.fill();
    ctx.strokeStyle = color || C.line;
    ctx.globalAlpha = active ? 1 : .72;
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, title, x + w / 2, y + (subtitle ? h * .40 : h / 2), 12, C.text, "center", 600);
    if (subtitle) label(ctx, subtitle, x + w / 2, y + h * .68, 9, C.muted, "center", 500);
    ctx.restore();
  }

  function pill(ctx, x, y, w, text, color, fill) {
    ctx.save();
    rr(ctx, x, y, w, 24, 12);
    ctx.fillStyle = fill || "rgba(255,255,255,.06)";
    ctx.fill();
    ctx.strokeStyle = color || C.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, text, x + w / 2, y + 12, 9, color || C.text, "center", 600);
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2, color, width, dashed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || C.line;
    ctx.lineWidth = width || 1.5;
    if (dashed) ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, progress, dashed) {
    var p = progress == null ? 1 : clamp(progress, 0, 1);
    var xe = x1 + (x2 - x1) * p;
    var ye = y1 + (y2 - y1) * p;
    line(ctx, x1, y1, xe, ye, color, 1.7, dashed);
    if (p > .92) {
      var angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.fillStyle = color || C.line;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 7 * Math.cos(angle - .48), y2 - 7 * Math.sin(angle - .48));
      ctx.lineTo(x2 - 7 * Math.cos(angle + .48), y2 - 7 * Math.sin(angle + .48));
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  function curveArrow(ctx, x1, y1, cx, cy, x2, y2, color, dashed) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.strokeStyle = color || C.line; ctx.lineWidth = 1.6;
    if (dashed) ctx.setLineDash([5, 5]);
    ctx.stroke();
    var dx = x2 - cx, dy = y2 - cy, angle = Math.atan2(dy, dx);
    ctx.fillStyle = color || C.line;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 7 * Math.cos(angle - .48), y2 - 7 * Math.sin(angle - .48));
    ctx.lineTo(x2 - 7 * Math.cos(angle + .48), y2 - 7 * Math.sin(angle + .48));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function movingDot(ctx, x1, y1, x2, y2, t, color, radius) {
    var p = t - Math.floor(t);
    var x = x1 + (x2 - x1) * p;
    var y = y1 + (y2 - y1) * p;
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius || 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTokens(ctx, tokens, x, y, width, activeCount, actionColor, obsColor) {
    var gap = 4;
    var tw = (width - gap * (tokens.length - 1)) / tokens.length;
    tokens.forEach(function (token, i) {
      var isAction = token.charAt(0) === "a";
      var active = i < activeCount;
      rr(ctx, x + i * (tw + gap), y, tw, 28, 6);
      ctx.fillStyle = active ? (isAction ? "rgba(240,140,114,.25)" : "rgba(114,167,255,.22)") : "rgba(255,255,255,.035)";
      ctx.fill();
      ctx.strokeStyle = active ? (isAction ? actionColor : obsColor) : "rgba(255,255,255,.1)";
      ctx.lineWidth = 1; ctx.stroke();
      label(ctx, token, x + i * (tw + gap) + tw / 2, y + 14, 9, active ? C.text : C.gray, "center", 600);
    });
  }

  function drawPaW(ctx, t) {
    background(ctx, "rgba(80,130,255,.19)", "rgba(80,197,165,.10)");
    smallCaps(ctx, "one model · two learning signals", 108, 28, C.muted);

    node(ctx, 34, 64, 118, 60, "Environment", "observations + reward", C.blue, true);
    node(ctx, 244, 56, 152, 76, "Shared policy πθ", "standard inference", C.cobalt, true);
    node(ctx, 484, 64, 120, 60, "On-policy rollout", "trajectory group g", C.violet, true);
    arrow(ctx, 152, 83, 244, 83, C.blue, 1);
    arrow(ctx, 244, 108, 152, 108, C.coral, 1);
    arrow(ctx, 396, 94, 484, 94, C.violet, 1);
    label(ctx, "oₜ", 194, 75, 9, C.blue, "center", 600);
    label(ctx, "aₜ", 194, 117, 9, C.coral, "center", 600);
    movingDot(ctx, 153, 83, 243, 83, t * 2.4, C.blue, 3);
    movingDot(ctx, 243, 108, 153, 108, t * 2.4 + .5, C.coral, 3);

    smallCaps(ctx, "shared transition sequence", 34, 153, C.muted);
    var tokens = ["o₀", "a₀", "o₁", "a₁", "o₂", "a₂", "o₃", "a₃", "o₄"];
    var count = reduceMotion ? tokens.length : Math.max(1, Math.floor((t * 14) % (tokens.length + 2)));
    drawTokens(ctx, tokens, 34, 166, 570, count, C.coral, C.blue);

    node(ctx, 42, 232, 246, 84, "Policy learning L_RL", "all action spans + advantages Aₜ", C.amber, true);
    node(ctx, 352, 232, 246, 84, "World modeling L_WM^CMAE", "top-α entropy transitions → next o", C.mint, true);
    pill(ctx, 64, 278, 68, "a₀", C.coral, "rgba(240,140,114,.18)");
    pill(ctx, 137, 278, 68, "a₁", C.coral, "rgba(240,140,114,.18)");
    pill(ctx, 210, 278, 56, "a₂", C.coral, "rgba(240,140,114,.18)");
    pill(ctx, 372, 278, 92, "high H(aₜ)", C.violet, "rgba(177,132,245,.16)");
    pill(ctx, 470, 278, 102, "predict oₜ₊₁", C.mint, "rgba(88,197,165,.15)");
    arrow(ctx, 170, 194, 170, 232, C.amber, 1);
    arrow(ctx, 478, 194, 478, 232, C.mint, 1);

    pill(ctx, 186, 342, 268, "L_PaW = L_RL + λWM,g · L_WM^CMAE", C.text, "rgba(255,255,255,.075)");
    arrow(ctx, 165, 316, 250, 342, C.amber, 1);
    arrow(ctx, 475, 316, 390, 342, C.mint, 1);
    curveArrow(ctx, 320, 342, 320, 210, 320, 132, C.cobalt, false);
    pill(ctx, 458, 342, 140, "λWM,g = 1 − R̄g/Rmax", C.violet, "rgba(177,132,245,.12)");
    movingDot(ctx, 250, 354, 390, 354, t * 1.8, C.cobalt, 3);
  }

  function drawHIVE(ctx, t) {
    background(ctx, "rgba(71,188,210,.16)", "rgba(232,180,94,.08)");
    smallCaps(ctx, "follow the moving learning edge", 108, 28, C.muted);

    var px = 34, py = 76, pw = 250, ph = 220;
    rr(ctx, px, py, pw, ph, 14); ctx.fillStyle = "rgba(255,255,255,.035)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.stroke();
    label(ctx, "uncertainty", px + 6, py - 12, 9, C.muted, "left", 500);
    label(ctx, "difficulty →", px + pw - 4, py + ph + 14, 9, C.muted, "right", 500);

    var dots = [[.08,.20],[.12,.42],[.18,.72],[.25,.32],[.31,.61],[.36,.80],[.42,.18],[.48,.54],[.52,.78],[.58,.36],[.63,.68],[.69,.84],[.74,.28],[.79,.55],[.84,.73],[.91,.38]];
    var edgeShift = reduceMotion ? .55 : .48 + .10 * Math.sin(t * Math.PI * 2);
    ctx.save(); ctx.strokeStyle = C.amber; ctx.globalAlpha = .45; ctx.setLineDash([5,5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px + pw * (edgeShift - .15), py + ph); ctx.quadraticCurveTo(px + pw * (edgeShift + .02), py + ph * .42, px + pw * (edgeShift + .14), py); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = C.mint; ctx.shadowColor = C.mint; ctx.shadowBlur = 9; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(px + pw * edgeShift, py + ph); ctx.quadraticCurveTo(px + pw * (edgeShift + .17), py + ph * .42, px + pw * (edgeShift + .26), py); ctx.stroke(); ctx.restore();
    label(ctx, "current edge", px + pw * (edgeShift + .09), py + 18, 9, C.mint, "left", 600);

    dots.forEach(function (d, i) {
      var dx = px + 14 + d[0] * (pw - 28), dy = py + ph - 14 - d[1] * (ph - 28);
      var nearEdge = Math.abs(d[0] - edgeShift - d[1] * .12) < .18;
      ctx.save(); ctx.fillStyle = nearEdge ? C.mint : (i % 4 === 0 ? C.violet : C.gray);
      ctx.globalAlpha = nearEdge ? .95 : .48; if (nearEdge) { ctx.shadowColor = C.mint; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(dx, dy, nearEdge ? 4 : 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    node(ctx, 320, 70, 126, 64, "Stage 1", "history T · zero-cost", C.amber, true);
    node(ctx, 474, 70, 132, 64, "Coarse candidates Cₜ", "reward + response entropy", C.amber, false);
    arrow(ctx, 446, 102, 474, 102, C.amber, 1);
    pill(ctx, 329, 145, 108, "preserve explore", C.amber, "rgba(232,180,94,.12)");

    node(ctx, 320, 190, 126, 72, "Stage 2", "current πθₜ", C.mint, true);
    node(ctx, 474, 184, 132, 84, "Prompt entropy Vₜ(x)", "gate: Vₜ ≥ median γₜ", C.mint, true);
    arrow(ctx, 540, 134, 540, 184, C.line, 1);
    arrow(ctx, 446, 225, 474, 225, C.mint, 1);
    pill(ctx, 329, 274, 108, "one forward pass", C.mint, "rgba(88,197,165,.12)");

    node(ctx, 338, 324, 118, 52, "G rollouts", "selected Bₜ", C.blue, true);
    node(ctx, 488, 324, 118, 52, "GRPO update", "πθₜ → πθₜ₊₁", C.cobalt, true);
    arrow(ctx, 540, 268, 420, 324, C.mint, 1);
    arrow(ctx, 456, 350, 488, 350, C.cobalt, 1);
    curveArrow(ctx, 548, 324, 612, 190, 400, 70, C.violet, true);
    label(ctx, "reward + entropy → history", 470, 44, 9, C.violet, "center", 600);
    movingDot(ctx, 446, 102, 474, 102, t * 2, C.amber, 3);
    movingDot(ctx, 446, 225, 474, 225, t * 2 + .35, C.mint, 3);
  }

  function drawPRM(ctx, t) {
    background(ctx, "rgba(93,115,255,.17)", "rgba(240,140,114,.10)");
    smallCaps(ctx, "reasoning learns to judge itself", 108, 28, C.muted);

    node(ctx, 28, 75, 112, 52, "Math problem", "outcome only", C.blue, true);
    node(ctx, 28, 164, 112, 62, "Same LLM", "Qwen2.5-7B", C.cobalt, true);
    node(ctx, 28, 272, 112, 58, "0 / 1 reward", "final answer", C.mint, true);
    arrow(ctx, 84, 127, 84, 164, C.blue, 1);
    arrow(ctx, 84, 226, 84, 272, C.mint, 1);
    curveArrow(ctx, 28, 300, 2, 210, 28, 194, C.coral, false);
    label(ctx, "DAPO RL", 12, 246, 9, C.coral, "center", 600);
    pill(ctx, 20, 346, 128, "no process labels", C.muted, "rgba(255,255,255,.035)");

    var gx = 180, gy = 78, gw = 230, gh = 205;
    rr(ctx, gx, gy, gw, gh, 14); ctx.fillStyle = "rgba(255,255,255,.035)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.stroke();
    smallCaps(ctx, "RL training steps", gx + 14, gy + 18, C.muted);
    line(ctx, gx + 20, gy + gh - 28, gx + gw - 18, gy + gh - 28, C.line, 1, false);
    line(ctx, gx + 20, gy + 38, gx + 20, gy + gh - 28, C.line, 1, false);

    var accuracy = [[0,.08],[.16,.12],[.32,.21],[.48,.30],[.64,.42],[.82,.53],[1,.62]];
    var judgment = [[0,.07],[.12,.22],[.25,.46],[.42,.58],[.62,.64],[.82,.68],[1,.72]];
    function plot(points, color, dashed, progress) {
      ctx.save(); ctx.beginPath(); ctx.rect(gx + 18, gy + 30, (gw - 34) * progress, gh - 52); ctx.clip();
      ctx.beginPath(); points.forEach(function (p, i) {
        var x = gx + 20 + p[0] * (gw - 38), y = gy + gh - 28 - p[1] * (gh - 70);
        if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; if (dashed) ctx.setLineDash([6,5]); ctx.stroke(); ctx.restore();
    }
    var scan = reduceMotion ? 1 : clamp((t * 1.35) % 1.25, 0, 1);
    plot(accuracy, C.blue, false, scan); plot(judgment, C.coral, true, scan);
    line(ctx, gx + 20 + scan * (gw - 38), gy + 36, gx + 20 + scan * (gw - 38), gy + gh - 28, "rgba(255,255,255,.18)", 1, false);
    pill(ctx, gx + 26, gy + 44, 88, "accuracy", C.blue, "rgba(114,167,255,.10)");
    pill(ctx, gx + 120, gy + 44, 92, "Process F1", C.coral, "rgba(240,140,114,.10)");
    label(ctx, "judgment emerges early", gx + 116, gy + gh - 11, 9, C.coral, "center", 600);

    node(ctx, 448, 72, 158, 56, "Self-PRM", "same model · internal reward", C.coral, true);
    var ys = [154, 200, 246, 292];
    var scores = [".42", ".77", ".91", ".55"];
    ys.forEach(function (y, i) {
      var winner = i === 2;
      line(ctx, 462, 101, 462 + i * 17, y, winner ? C.mint : C.line, winner ? 2 : 1, false);
      pill(ctx, 486 + (i % 2) * 12, y - 12, 88, "trace " + (i + 1) + "  " + scores[i], winner ? C.mint : C.muted, winner ? "rgba(88,197,165,.15)" : "rgba(255,255,255,.04)");
    });
    curveArrow(ctx, 590, 128, 628, 205, 590, 246, C.coral, true);
    label(ctx, "score + rerank", 603, 188, 9, C.coral, "center", 600);
    node(ctx, 466, 330, 126, 44, "Reranked answer", "best reasoning trace", C.mint, true);
    arrow(ctx, 530, 280, 530, 330, C.mint, 1);
    movingDot(ctx, 84, 127, 84, 271, t * 1.7, C.mint, 3);
  }

  function drawSafeDelta(ctx, t) {
    background(ctx, "rgba(177,132,245,.15)", "rgba(88,197,165,.10)");
    smallCaps(ctx, "adaptive safety after fine-tuning", 108, 28, C.muted);

    node(ctx, 28, 58, 118, 52, "Aligned Worig", "safety dataset", C.blue, true);
    node(ctx, 180, 58, 136, 52, "Compute curvature", "H = ∇² Lsafe", C.violet, true);
    node(ctx, 352, 58, 126, 52, "Cache H⁻¹", "computed once", C.violet, true);
    arrow(ctx, 146, 84, 180, 84, C.violet, 1);
    arrow(ctx, 316, 84, 352, 84, C.violet, 1);
    line(ctx, 478, 84, 604, 84, C.violet, 1.3, true);
    pill(ctx, 490, 58, 112, "reuse per request", C.violet, "rgba(177,132,245,.10)");

    node(ctx, 28, 164, 112, 62, "Fine-tuning", "dataset Dsft", C.coral, true);
    node(ctx, 164, 164, 112, 62, "Delta ΔWsft", "Wsft − Worig", C.coral, true);
    arrow(ctx, 140, 195, 164, 195, C.coral, 1);

    smallCaps(ctx, "score every delta", 306, 148, C.muted);
    var cellScores = [.92,.18,.78,.36,.84,.23,.64,.48,.71,.15,.57,.31];
    cellScores.forEach(function (score, i) {
      var col = i % 4, row = Math.floor(i / 4), x = 306 + col * 25, y = 164 + row * 25;
      var selected = score > .52;
      rr(ctx, x, y, 18, 18, 4);
      ctx.fillStyle = selected ? "rgba(93,115,255," + (.20 + score * .35) + ")" : "rgba(223,108,116,.08)";
      ctx.fill(); ctx.strokeStyle = selected ? C.cobalt : C.red; ctx.globalAlpha = selected ? 1 : .45; ctx.stroke(); ctx.globalAlpha = 1;
    });
    label(ctx, "utility / safety ratio rₘ", 355, 251, 9, C.muted, "center", 500);

    node(ctx, 426, 164, 92, 84, "Select M", "Σ cost < ε", C.cobalt, true);
    arrow(ctx, 406, 202, 426, 202, C.cobalt, 1);
    ctx.fillStyle = "rgba(255,255,255,.08)"; rr(ctx, 440, 218, 64, 7, 3); ctx.fill();
    ctx.fillStyle = C.amber; rr(ctx, 440, 218, 46 + wave(t,.2) * 4, 7, 3); ctx.fill();
    line(ctx, 492, 213, 492, 230, C.amber, 1, true);

    node(ctx, 542, 156, 72, 100, "Wsd", "safe + useful", C.mint, true);
    arrow(ctx, 518, 202, 542, 202, C.mint, 1);
    curveArrow(ctx, 414, 110, 516, 126, 560, 156, C.violet, true);
    label(ctx, "safety compensation C", 475, 132, 9, C.mint, "center", 600);

    pill(ctx, 60, 305, 156, "Worig", C.blue, "rgba(114,167,255,.10)");
    pill(ctx, 242, 305, 156, "M ⊙ ΔWsft", C.cobalt, "rgba(93,115,255,.12)");
    pill(ctx, 424, 305, 156, "+ compensation C", C.mint, "rgba(88,197,165,.12)");
    arrow(ctx, 216, 317, 242, 317, C.line, 1); arrow(ctx, 398, 317, 424, 317, C.line, 1);
    pill(ctx, 196, 354, 250, "utility retained · safety restored", C.text, "rgba(255,255,255,.06)");
    movingDot(ctx, 140, 195, 518, 202, t * 1.4, C.cobalt, 3);
  }

  function drawSICO(ctx, t) {
    background(ctx, "rgba(240,140,114,.15)", "rgba(93,115,255,.10)");
    smallCaps(ctx, "detector-guided prompt construction", 108, 28, C.muted);

    node(ctx, 28, 66, 116, 64, "Paired examples", "AI text ↔ human text", C.blue, true);
    node(ctx, 172, 66, 118, 64, "LLM extracts", "human-writing features", C.cobalt, true);
    arrow(ctx, 144, 98, 172, 98, C.blue, 1);
    pill(ctx, 316, 66, 72, "clarity", C.cobalt, "rgba(93,115,255,.12)");
    pill(ctx, 316, 95, 78, "variation", C.cobalt, "rgba(93,115,255,.12)");
    pill(ctx, 316, 124, 82, "concision", C.cobalt, "rgba(93,115,255,.12)");
    arrow(ctx, 290, 98, 316, 98, C.cobalt, 1);

    node(ctx, 28, 190, 152, 82, "In-context example yic", "semantic meaning locked", C.amber, true);
    node(ctx, 220, 176, 154, 110, "Word / sentence", "substitution candidates", C.violet, true);
    arrow(ctx, 180, 231, 220, 231, C.violet, 1);
    pill(ctx, 238, 240, 54, "c₁", C.muted, "rgba(255,255,255,.04)");
    pill(ctx, 296, 240, 54, "c₂", C.mint, "rgba(88,197,165,.14)");

    node(ctx, 416, 186, 118, 90, "Proxy detector", "keep min PAI", C.coral, true);
    arrow(ctx, 374, 231, 416, 231, C.coral, 1);
    var score = reduceMotion ? .30 : .30 + .60 * (1 - ease((t * 1.3) % 1));
    label(ctx, "P_AI " + score.toFixed(2), 475, 248, 13, score < .5 ? C.mint : C.coral, "center", 700);
    curveArrow(ctx, 454, 276, 350, 322, 180, 258, C.coral, true);
    label(ctx, "GreedyOPT feedback", 320, 316, 9, C.coral, "center", 600);

    node(ctx, 548, 66, 66, 202, "Best p*", "feature\n+ task\n+ examples", C.mint, true);
    arrow(ctx, 398, 114, 548, 114, C.cobalt, 1);
    arrow(ctx, 534, 231, 548, 231, C.mint, 1);

    pill(ctx, 54, 335, 112, "user task x", C.violet, "rgba(177,132,245,.13)");
    node(ctx, 232, 326, 112, 48, "LLM", "reuse prompt p*", C.cobalt, true);
    node(ctx, 430, 326, 154, 48, "Output text", "low detector score", C.mint, true);
    arrow(ctx, 166, 347, 232, 347, C.violet, 1);
    curveArrow(ctx, 580, 268, 414, 310, 344, 347, C.mint, false);
    arrow(ctx, 344, 350, 430, 350, C.mint, 1);
    movingDot(ctx, 166, 347, 430, 350, t * 1.7, C.mint, 3);
  }

  var drawers = {
    paw: drawPaW,
    hive: drawHIVE,
    prm: drawPRM,
    "safe-delta": drawSafeDelta,
    sico: drawSICO
  };

  function render(state, timestamp) {
    var ctx = setup(state);
    var drawer = drawers[state.canvas.getAttribute("data-viz")];
    var t = reduceMotion ? .72 : (timestamp % 8000) / 8000;
    if (drawer) drawer(ctx, t);
  }

  function frame(timestamp) {
    states.forEach(function (state) {
      if (state.visible || state.dirty) {
        render(state, timestamp || 0);
        state.dirty = false;
      }
    });
    if (!reduceMotion) window.requestAnimationFrame(frame);
  }

  if (reduceMotion) frame(5600);
  else window.requestAnimationFrame(frame);
}());