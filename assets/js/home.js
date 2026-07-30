(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealElements = document.querySelectorAll(".home-reveal");

  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealElements.forEach(function (element) { revealObserver.observe(element); });
  } else {
    revealElements.forEach(function (element) { element.classList.add("is-visible"); });
  }

  var canvases = Array.prototype.slice.call(document.querySelectorAll(".home-publication-canvas"));
  if (!canvases.length) return;

  var colors = {
    ink: "#f1f0f6",
    muted: "#8f919e",
    faint: "rgba(255,255,255,.09)",
    line: "rgba(207,210,224,.28)",
    panel: "rgba(255,255,255,.055)",
    violet: "#9185ff",
    blue: "#6d9bff",
    mint: "#63d8bd",
    coral: "#f18b76",
    amber: "#edbd68"
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedPath(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function panel(ctx, x, y, width, height, radius, fill, stroke) {
    roundedPath(ctx, x, y, width, height, radius || 10);
    ctx.fillStyle = fill || colors.panel;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function write(ctx, text, x, y, options) {
    var opts = options || {};
    var size = opts.size || 10;
    var weight = opts.weight || 600;
    ctx.save();
    ctx.font = weight + " " + size + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "middle";
    ctx.fillStyle = opts.color || colors.ink;
    if (opts.letterSpacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = opts.letterSpacing;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function header(ctx, text, width) {
    write(ctx, text, width / 2, 18, {
      align: "center",
      color: colors.muted,
      size: clamp(width / 64, 8.5, 10.5),
      weight: 700,
      letterSpacing: "1.1px"
    });
  }

  function card(ctx, x, y, width, height, title, subtitle, accent) {
    panel(ctx, x, y, width, height, 10, "rgba(255,255,255,.047)", "rgba(255,255,255,.105)");
    ctx.fillStyle = accent;
    roundedPath(ctx, x + 8, y + 9, 3, height - 18, 2);
    ctx.fill();
    write(ctx, title, x + 18, y + height / 2 - (subtitle ? 7 : 0), {
      size: clamp(width / 12, 8.2, 10.8),
      weight: 680
    });
    if (subtitle) {
      write(ctx, subtitle, x + 18, y + height / 2 + 9, {
        size: clamp(width / 15, 7.3, 9.2),
        weight: 500,
        color: colors.muted
      });
    }
  }

  function connector(ctx, x1, y1, x2, y2, color, dashed) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.beginPath();
    if (dashed) ctx.setLineDash([4, 4]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || colors.line;
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5 * Math.cos(angle - Math.PI / 6), y2 - 5 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 5 * Math.cos(angle + Math.PI / 6), y2 - 5 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color || colors.line;
    ctx.fill();
    ctx.restore();
  }

  function movingDot(ctx, x1, y1, x2, y2, progress, color, radius) {
    var x = x1 + (x2 - x1) * progress;
    var y = y1 + (y2 - y1) * progress;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 11;
    ctx.beginPath();
    ctx.arc(x, y, radius || 3.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function pill(ctx, text, x, y, width, color) {
    panel(ctx, x, y, width, 25, 12.5, "rgba(255,255,255,.045)", "rgba(255,255,255,.10)");
    ctx.beginPath();
    ctx.arc(x + 12, y + 12.5, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    write(ctx, text, x + 21, y + 12.5, {
      size: clamp(width / 12.5, 7.6, 9.5),
      weight: 620,
      color: colors.ink
    });
  }

  function drawPaW(ctx, width, height, time) {
    header(ctx, "ONE ROLLOUT · TWO LEARNING SIGNALS", width);
    var pad = clamp(width * .035, 12, 24);
    var leftWidth = clamp(width * .205, 78, 118);
    var middleWidth = clamp(width * .19, 76, 112);
    var rightWidth = clamp(width * .19, 76, 112);
    var leftX = pad;
    var middleX = width * .41 - middleWidth / 2;
    var rightX = width - pad - rightWidth;
    var splitX = leftX + leftWidth;
    var joinX = rightX;
    var topY = 49;
    var bottomY = 104;
    var centerY = 86;

    card(ctx, leftX, 62, leftWidth, 48, "RL rollout", "action → next state", colors.violet);
    card(ctx, middleX, topY, middleWidth, 35, "Policy", "what to do", colors.blue);
    card(ctx, middleX, bottomY, middleWidth, 35, "World", "what happens", colors.mint);
    card(ctx, rightX, 62, rightWidth, 48, "Same model", "joint update", colors.violet);

    connector(ctx, splitX + 5, centerY, middleX - 6, topY + 17.5, colors.line);
    connector(ctx, splitX + 5, centerY, middleX - 6, bottomY + 17.5, colors.line);
    connector(ctx, middleX + middleWidth + 6, topY + 17.5, joinX - 6, centerY, colors.line);
    connector(ctx, middleX + middleWidth + 6, bottomY + 17.5, joinX - 6, centerY, colors.line);

    var p = (time * .22) % 1;
    movingDot(ctx, splitX + 5, centerY, middleX - 6, topY + 17.5, p, colors.blue);
    movingDot(ctx, splitX + 5, centerY, middleX - 6, bottomY + 17.5, p, colors.mint);
    if (p > .48) {
      var q = (p - .48) / .52;
      movingDot(ctx, middleX + middleWidth + 6, topY + 17.5, joinX - 6, centerY, q, colors.blue);
      movingDot(ctx, middleX + middleWidth + 6, bottomY + 17.5, joinX - 6, centerY, q, colors.mint);
    }
  }

  function drawHIVE(ctx, width, height, time) {
    header(ctx, "FOLLOW THE POLICY'S MOVING LEARNING EDGE", width);
    var pad = clamp(width * .045, 14, 28);
    var gap = clamp(width * .025, 8, 16);
    var flowWidth = width - pad * 2;
    var pillWidth = (flowWidth - gap * 2) / 3;
    var firstX = pad;
    var secondX = firstX + pillWidth + gap;
    var thirdX = secondX + pillWidth + gap;

    pill(ctx, "history", firstX, 37, pillWidth, colors.violet);
    pill(ctx, "online entropy", secondX, 37, pillWidth, colors.mint);
    pill(ctx, "roll out edge", thirdX, 37, pillWidth, colors.blue);
    connector(ctx, firstX + pillWidth + 3, 49.5, secondX - 3, 49.5, colors.line);
    connector(ctx, secondX + pillWidth + 3, 49.5, thirdX - 3, 49.5, colors.line);

    var lineStart = pad + 4;
    var lineEnd = width - pad - 4;
    var axisY = 115;
    ctx.beginPath();
    ctx.moveTo(lineStart, axisY);
    ctx.lineTo(lineEnd, axisY);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var staleX = lineStart + (lineEnd - lineStart) * .34;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(staleX, 78);
    ctx.lineTo(staleX, 138);
    ctx.strokeStyle = "rgba(241,139,118,.42)";
    ctx.stroke();
    ctx.restore();
    write(ctx, "static", staleX, 145, { align: "center", size: 8, color: colors.coral, weight: 600 });

    var travel = reduceMotion ? .68 : .5 + .18 * Math.sin(time * .58);
    var edgeX = lineStart + (lineEnd - lineStart) * travel;
    var bandWidth = clamp(width * .12, 38, 72);
    panel(ctx, edgeX - bandWidth / 2, 84, bandWidth, 55, 14, "rgba(99,216,189,.10)", "rgba(99,216,189,.34)");
    write(ctx, "edge now", edgeX, 75, { align: "center", size: 8.5, color: colors.mint, weight: 700 });

    for (var i = 0; i < 11; i += 1) {
      var x = lineStart + (lineEnd - lineStart) * (i / 10);
      var distance = Math.abs(x - edgeX);
      var active = distance < bandWidth * .48;
      ctx.save();
      if (active) {
        ctx.shadowColor = colors.mint;
        ctx.shadowBlur = 9;
      }
      ctx.beginPath();
      ctx.arc(x, axisY + Math.sin(i * 1.7) * 5, active ? 4.2 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = active ? colors.mint : "rgba(202,204,215,.32)";
      ctx.fill();
      ctx.restore();
    }
    write(ctx, "easy", lineStart, 145, { size: 8, color: colors.muted });
    write(ctx, "hard", lineEnd, 145, { size: 8, color: colors.muted, align: "right" });
  }

  function traceCurve(ctx, points, progress, color, dashed) {
    if (points.length < 2) return;
    var visible = Math.max(2, Math.ceil((points.length - 1) * progress) + 1);
    ctx.save();
    if (dashed) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < visible; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    return points[Math.min(visible - 1, points.length - 1)];
  }

  function drawPRM(ctx, width, height, time) {
    header(ctx, "PROCESS JUDGMENT EMERGES WITHOUT PROCESS LABELS", width);
    var pad = clamp(width * .035, 12, 24);
    var sideWidth = clamp(width * .18, 72, 105);
    var leftX = pad;
    var rightX = width - pad - sideWidth;
    var chartLeft = leftX + sideWidth + clamp(width * .055, 20, 38);
    var chartRight = rightX - clamp(width * .055, 20, 38);
    var chartTop = 51;
    var chartBottom = 130;

    card(ctx, leftX, 66, sideWidth, 51, "Outcome RL", "final reward only", colors.blue);
    card(ctx, rightX, 66, sideWidth, 51, "Self-PRM", "judge own paths", colors.coral);
    connector(ctx, leftX + sideWidth + 4, 91.5, chartLeft - 7, 91.5, colors.line);
    connector(ctx, chartRight + 7, 91.5, rightX - 4, 91.5, colors.line);

    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var solve = [];
    var judge = [];
    for (var i = 0; i <= 24; i += 1) {
      var u = i / 24;
      var x = chartLeft + (chartRight - chartLeft) * u;
      solve.push([x, chartBottom - (chartBottom - chartTop - 10) * (1 - Math.exp(-2.1 * u))]);
      judge.push([x, chartBottom - (chartBottom - chartTop - 4) * (1 - Math.exp(-4.8 * u))]);
    }
    var progress = reduceMotion ? 1 : .78 + .22 * (.5 + .5 * Math.sin(time * .55));
    var solveEnd = traceCurve(ctx, solve, progress, colors.blue, false);
    var judgeEnd = traceCurve(ctx, judge, progress, colors.coral, true);
    movingDot(ctx, solveEnd[0], solveEnd[1], solveEnd[0], solveEnd[1], 1, colors.blue, 2.8);
    movingDot(ctx, judgeEnd[0], judgeEnd[1], judgeEnd[0], judgeEnd[1], 1, colors.coral, 2.8);
    write(ctx, "solve", chartLeft + 4, chartTop + 8, { size: 7.8, color: colors.blue, weight: 650 });
    write(ctx, "judge", chartLeft + 4, chartTop + 21, { size: 7.8, color: colors.coral, weight: 650 });
  }

  function miniBar(ctx, x, y, width, value, color, label) {
    write(ctx, label, x, y - 6, { size: 7.5, color: colors.muted, weight: 600 });
    panel(ctx, x, y, width, 5, 2.5, "rgba(255,255,255,.09)");
    panel(ctx, x, y, width * value, 5, 2.5, color);
  }

  function drawSafeDelta(ctx, width, height, time) {
    header(ctx, "KEEP USEFUL DELTAS · REPAIR THE SAFETY LOSS", width);
    var pad = clamp(width * .035, 12, 24);
    var sideWidth = clamp(width * .19, 78, 112);
    var leftX = pad;
    var rightX = width - pad - sideWidth;
    var gridWidth = clamp(width * .16, 64, 96);
    var gridX = width / 2 - gridWidth / 2;
    var cardY = 54;
    var cardH = 75;

    panel(ctx, leftX, cardY, sideWidth, cardH, 11, "rgba(255,255,255,.047)", "rgba(255,255,255,.105)");
    write(ctx, "Fine-tune", leftX + 12, cardY + 15, { size: 9.5, weight: 680 });
    miniBar(ctx, leftX + 12, cardY + 37, sideWidth - 24, .84, colors.blue, "utility ↑");
    miniBar(ctx, leftX + 12, cardY + 59, sideWidth - 24, .28, colors.coral, "safety ↓");

    panel(ctx, rightX, cardY, sideWidth, cardH, 11, "rgba(255,255,255,.047)", "rgba(255,255,255,.105)");
    write(ctx, "Safe model", rightX + 12, cardY + 15, { size: 9.5, weight: 680 });
    miniBar(ctx, rightX + 12, cardY + 37, sideWidth - 24, .81, colors.blue, "utility");
    miniBar(ctx, rightX + 12, cardY + 59, sideWidth - 24, .88, colors.mint, "safety");

    connector(ctx, leftX + sideWidth + 5, 91, gridX - 8, 91, colors.line);
    connector(ctx, gridX + gridWidth + 8, 91, rightX - 5, 91, colors.mint);

    var cols = 4;
    var rows = 3;
    var gap = 4;
    var cell = (gridWidth - gap * (cols - 1)) / cols;
    var gridY = 62;
    var selected = { 0: true, 2: true, 5: true, 7: true, 10: true };
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var index = r * cols + c;
        var active = !!selected[index];
        var pulse = .72 + .18 * Math.sin(time * 1.4 + index);
        panel(
          ctx,
          gridX + c * (cell + gap),
          gridY + r * (cell + gap),
          cell,
          cell,
          3,
          active ? "rgba(109,155,255," + pulse + ")" : "rgba(241,139,118,.16)",
          active ? "rgba(160,186,255,.65)" : "rgba(241,139,118,.28)"
        );
      }
    }
    write(ctx, "select Δ", width / 2, 121, { align: "center", size: 8.5, color: colors.blue, weight: 680 });
    write(ctx, "+ compensate", width / 2, 138, { align: "center", size: 8, color: colors.mint, weight: 650 });
  }

  function drawSICO(ctx, width, height, time) {
    header(ctx, "DETECTOR FEEDBACK REVEALS FRAGILE WRITING CUES", width);
    var pad = clamp(width * .035, 12, 24);
    var sideWidth = clamp(width * .19, 78, 112);
    var leftX = pad;
    var rightX = width - pad - sideWidth;
    var centerX = width / 2;

    panel(ctx, leftX, 51, sideWidth, 32, 9, "rgba(241,139,118,.065)", "rgba(241,139,118,.30)");
    panel(ctx, leftX, 94, sideWidth, 32, 9, "rgba(99,216,189,.055)", "rgba(99,216,189,.28)");
    write(ctx, "AI text", leftX + 13, 67, { size: 9, color: colors.coral, weight: 680 });
    write(ctx, "Human text", leftX + 13, 110, { size: 9, color: colors.mint, weight: 680 });

    var ringRadius = clamp(width * .062, 24, 36);
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, 88, ringRadius, -.35 * Math.PI, 1.45 * Math.PI);
    ctx.strokeStyle = "rgba(237,189,104,.38)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    write(ctx, "detector", centerX, 78, { align: "center", size: 8.5, color: colors.amber, weight: 680 });
    var score = reduceMotion ? .22 : .5 + .3 * Math.sin(time * .62);
    write(ctx, "P(AI) " + score.toFixed(2), centerX, 96, { align: "center", size: 8, color: colors.ink, weight: 650 });
    write(ctx, "substitute ↻", centerX, 115, { align: "center", size: 7.7, color: colors.muted, weight: 600 });

    card(ctx, rightX, 61, sideWidth, 57, "Reusable prompt", "cues + examples", colors.violet);
    connector(ctx, leftX + sideWidth + 6, 67, centerX - ringRadius - 8, 79, colors.line);
    connector(ctx, leftX + sideWidth + 6, 110, centerX - ringRadius - 8, 97, colors.line);
    connector(ctx, centerX + ringRadius + 8, 88, rightX - 6, 88, colors.line);

    var p = (time * .18) % 1;
    var angle = -.35 * Math.PI + p * 1.8 * Math.PI;
    var dotX = centerX + Math.cos(angle) * ringRadius;
    var dotY = 88 + Math.sin(angle) * ringRadius;
    movingDot(ctx, dotX, dotY, dotX, dotY, 1, colors.amber, 3);
  }

  var renderers = {
    paw: drawPaW,
    hive: drawHIVE,
    prm: drawPRM,
    "safe-delta": drawSafeDelta,
    sico: drawSICO
  };

  var visuals = canvases.map(function (canvas) {
    return {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      type: canvas.getAttribute("data-home-viz"),
      width: 0,
      height: 0,
      dpr: 1,
      visible: true
    };
  }).filter(function (visual) {
    return visual.ctx && renderers[visual.type];
  });

  function resize(visual) {
    var rect = visual.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var pixelWidth = Math.round(width * dpr);
    var pixelHeight = Math.round(height * dpr);

    if (visual.canvas.width !== pixelWidth || visual.canvas.height !== pixelHeight) {
      visual.canvas.width = pixelWidth;
      visual.canvas.height = pixelHeight;
    }
    visual.width = width;
    visual.height = height;
    visual.dpr = dpr;
  }

  function draw(visual, time) {
    resize(visual);
    var ctx = visual.ctx;
    ctx.setTransform(visual.dpr, 0, 0, visual.dpr, 0, 0);
    ctx.clearRect(0, 0, visual.width, visual.height);
    renderers[visual.type](ctx, visual.width, visual.height, time);
  }

  if ("IntersectionObserver" in window) {
    var canvasObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var visual = entry.target.__homeVisual;
        if (visual) visual.visible = entry.isIntersecting;
      });
    }, { rootMargin: "180px 0px", threshold: 0 });

    visuals.forEach(function (visual) {
      visual.canvas.__homeVisual = visual;
      canvasObserver.observe(visual.canvas);
    });
  }

  if ("ResizeObserver" in window) {
    var resizeObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var visual = entry.target.__homeVisual;
        if (visual) draw(visual, reduceMotion ? 4 : performance.now() / 1000);
      });
    });
    visuals.forEach(function (visual) { resizeObserver.observe(visual.canvas); });
  }

  function frame(timestamp) {
    var seconds = timestamp / 1000;
    visuals.forEach(function (visual) {
      if (visual.visible) draw(visual, seconds);
    });
    if (!reduceMotion) window.requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    visuals.forEach(function (visual) { draw(visual, 4); });
  } else {
    window.requestAnimationFrame(frame);
  }
}());