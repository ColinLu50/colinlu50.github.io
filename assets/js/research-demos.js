(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvases = Array.prototype.slice.call(document.querySelectorAll(".research-demo-canvas"));
  if (!canvases.length) return;

  var DURATION = 7.1;
  var colors = {
    ink: "#f4f1eb",
    muted: "#9b9995",
    quiet: "#696967",
    line: "rgba(238,235,228,.17)",
    lineStrong: "rgba(238,235,228,.29)",
    panel: "rgba(255,255,255,.045)",
    cobalt: "#72a4ff",
    teal: "#62d1b5",
    coral: "#ef8d78",
    amber: "#e2b361",
    violet: "#a396ff",
    graphite: "#797b80"
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, value) {
    return a + (b - a) * value;
  }

  function smooth(value) {
    var x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function phase(progress, start, end) {
    if (end <= start) return progress >= end ? 1 : 0;
    return smooth((progress - start) / (end - start));
  }

  function roundedPath(ctx, x, y, width, height, radius) {
    var r = Math.min(radius || 8, width / 2, height / 2);
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

  function box(ctx, x, y, width, height, options) {
    var opts = options || {};
    ctx.save();
    ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
    roundedPath(ctx, x, y, width, height, opts.radius || 8);
    ctx.fillStyle = opts.fill || colors.panel;
    ctx.fill();
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = opts.lineWidth || 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function text(ctx, value, x, y, options) {
    var opts = options || {};
    ctx.save();
    ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
    var fontSize = Math.max(opts.size || 10, 7.4) * 1.18;
    ctx.font = (opts.weight || 600) + " " + fontSize +
      "px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "middle";
    ctx.fillStyle = opts.color || colors.ink;
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2, options) {
    var opts = options || {};
    ctx.save();
    ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
    if (opts.dash) ctx.setLineDash(opts.dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = opts.color || colors.line;
    ctx.lineWidth = opts.width || 1;
    ctx.lineCap = opts.cap || "round";
    ctx.stroke();
    ctx.restore();
  }

  function dot(ctx, x, y, radius, color, alpha, stroke) {
    ctx.save();
    ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
    ctx.restore();
  }

  function pill(ctx, value, x, y, width, options) {
    var opts = options || {};
    var height = opts.height || 22;
    box(ctx, x, y, width, height, {
      radius: height / 2,
      fill: opts.fill || colors.panel,
      stroke: opts.stroke || colors.line,
      alpha: opts.alpha
    });
    if (opts.dotColor) dot(ctx, x + 11, y + height / 2, 2.4, opts.dotColor, opts.alpha);
    text(ctx, value, x + (opts.dotColor ? 19 : width / 2), y + height / 2 + .2, {
      align: opts.dotColor ? "left" : "center",
      size: opts.size || 9.2,
      weight: opts.weight || 650,
      color: opts.color || colors.ink,
      alpha: opts.alpha
    });
  }

  function arrow(ctx, x1, y1, x2, y2, progress, options) {
    var opts = options || {};
    var p = clamp(progress, 0, 1);
    var ex = lerp(x1, x2, p);
    var ey = lerp(y1, y2, p);
    line(ctx, x1, y1, ex, ey, opts);
    if (p > .94) {
      var angle = Math.atan2(y2 - y1, x2 - x1);
      var size = opts.head || 4;
      ctx.save();
      ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = opts.color || colors.line;
      ctx.fill();
      ctx.restore();
    }
  }

  function bezier(ctx, points, progress, options) {
    var opts = options || {};
    var samples = 36;
    var visible = Math.max(1, Math.floor(samples * clamp(progress, 0, 1)));
    ctx.save();
    ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
    if (opts.dash) ctx.setLineDash(opts.dash);
    ctx.beginPath();
    for (var i = 0; i <= visible; i += 1) {
      var t = i / samples;
      var mt = 1 - t;
      var x = mt * mt * mt * points[0][0] + 3 * mt * mt * t * points[1][0] +
        3 * mt * t * t * points[2][0] + t * t * t * points[3][0];
      var y = mt * mt * mt * points[0][1] + 3 * mt * mt * t * points[1][1] +
        3 * mt * t * t * points[2][1] + t * t * t * points[3][1];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = opts.color || colors.line;
    ctx.lineWidth = opts.width || 1;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  function sceneTitle(ctx, title, width) {
    text(ctx, title, 17, 18, {
      size: clamp(width / 66, 9.2, 10.7),
      weight: 720,
      color: colors.muted
    });
  }

  function playhead(ctx, x, top, bottom, alpha) {
    line(ctx, x, top, x, bottom, { color: "rgba(244,241,235,.44)", width: 1, alpha: alpha });
    dot(ctx, x, top, 2.1, colors.ink, alpha);
  }

  function phaseRail(ctx, width, height, progress, labels) {
    var left = 18;
    var right = width - 18;
    var y = height - 15;
    var count = labels.length;
    line(ctx, left, y, right, y, { color: "rgba(255,255,255,.10)", width: 1 });
    line(ctx, left, y, lerp(left, right, progress), y, {
      color: "rgba(244,241,235,.38)", width: 1.25
    });
    for (var i = 0; i < count; i += 1) {
      var x = lerp(left, right, count === 1 ? 0 : i / (count - 1));
      var active = Math.min(count - 1, Math.floor(progress * count)) === i;
      var done = progress >= i / count;
      dot(ctx, x, y, active ? 3.1 : 2.2, active ? colors.ink : (done ? colors.muted : colors.quiet), 1);
      if (width > 430 || active) {
        text(ctx, labels[i], x, y - 10, {
          align: i === 0 ? "left" : (i === count - 1 ? "right" : "center"),
          size: width > 430 ? 7.4 : 8.2,
          weight: active ? 700 : 560,
          color: active ? colors.ink : colors.quiet
        });
      }
    }
  }

  function skeleton(ctx, x, y, width, color, alpha) {
    line(ctx, x, y, x + width, y, { color: color, width: 2.2, alpha: alpha });
    line(ctx, x, y + 6, x + width * .72, y + 6, { color: color, width: 2.2, alpha: alpha * .72 });
  }

  function drawPaW(ctx, width, height, progress) {
    var compact = width < 460;
    var left = compact ? 12 : 16;
    var diagramRight = width - (compact ? 12 : 18);
    var updateSpace = compact ? 0 : 94;
    var labelWidth = compact ? 64 : 104;
    var tokensLeft = left + labelWidth;
    var tokensRight = diagramRight - updateSpace;
    var trajectoryP = phase(progress, 0, .27);
    var policyP = phase(progress, .20, .57);
    var worldP = phase(progress, .50, .87);
    var jointP = phase(progress, .82, .98);
    var tokenY = 82;
    var policyY = 47;
    var worldY = 126;
    var tokenH = 30;
    var laneH = 24;
    var gap = compact ? 3 : 4;
    var weights = [1.24, 1.04, 1.24, 1.04, .42, 1.24];
    var labels = ["Obs 0", "Act 0", "Obs 1", "Act 1", "…", "Obs T"];
    var kinds = ["obs", "act", "obs", "act", "ellipsis", "obs"];
    var weightTotal = weights.reduce(function (sum, value) { return sum + value; }, 0);
    var usable = tokensRight - tokensLeft - gap * (weights.length - 1);
    var cells = [];
    var cursor = tokensLeft;
    var palette = {
      ink: "#292621",
      muted: "#766f65",
      quiet: "#aaa398",
      mask: "#77736d",
      maskText: "#f2efe7",
      line: "rgba(50,45,39,.14)",
      inactiveStroke: "rgba(68,61,54,.13)",
      action: "#bd6548",
      actionSoft: "#efd9ce",
      actionStroke: "rgba(189,101,72,.32)",
      observation: "#4d8ea2",
      observationSoft: "#d9e9ed",
      observationStroke: "rgba(77,142,162,.30)"
    };

    function flameGlyph(ctx2, centerX, centerY, size, color, alpha) {
      ctx2.save();
      ctx2.globalAlpha *= alpha;
      ctx2.translate(centerX, centerY);
      ctx2.scale(size, size);
      ctx2.beginPath();
      ctx2.moveTo(0, .56);
      ctx2.bezierCurveTo(-.52, .34, -.48, -.12, -.13, -.58);
      ctx2.bezierCurveTo(-.10, -.34, .10, -.20, .13, -.74);
      ctx2.bezierCurveTo(.59, -.23, .55, .35, 0, .56);
      ctx2.closePath();
      ctx2.fillStyle = color;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.moveTo(0, .38);
      ctx2.bezierCurveTo(-.22, .22, -.16, -.04, .04, -.29);
      ctx2.bezierCurveTo(.26, -.02, .24, .25, 0, .38);
      ctx2.closePath();
      ctx2.fillStyle = "#f2efe7";
      ctx2.globalAlpha *= .72;
      ctx2.fill();
      ctx2.restore();
    }

    function maskGlyph(ctx2, x, y, cellWidth, alpha) {
      var inset = Math.min(2, cellWidth * .04);
      var maskX = x + inset;
      var maskWidth = Math.max(1, cellWidth - inset * 2);
      var maskHeight = laneH - 4;
      var maskY = y + 2;

      box(ctx2, maskX, maskY, maskWidth, maskHeight, {
        radius: 4, fill: palette.mask, alpha: alpha
      });
      text(ctx2, "Mask", maskX + maskWidth / 2, maskY + maskHeight / 2 + .2, {
        align: "center", size: Math.max(5.2, Math.min(7.2, maskWidth * .12)),
        color: palette.maskText, weight: 650, alpha: alpha
      });
    }

    function laneOutline(ctx2, y, color, alpha) {
      ctx2.save();
      ctx2.globalAlpha *= alpha * .72;
      ctx2.setLineDash([4, 3]);
      roundedPath(ctx2, tokensLeft - 2, y - 1, tokensRight - tokensLeft + 4, laneH + 2, 5);
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 1;
      ctx2.stroke();
      ctx2.restore();
    }
    text(ctx, "ONE ROLLOUT, TWO LEARNING SIGNALS", left, 18, {
      size: compact ? 7.5 : 8.6, color: palette.muted, weight: 720
    });
    text(ctx, "trajectory", left, tokenY + tokenH / 2, {
      size: compact ? 7 : 7.8, color: palette.muted, weight: 650, alpha: trajectoryP
    });

    for (var i = 0; i < weights.length; i += 1) {
      var cellWidth = usable * weights[i] / weightTotal;
      cells.push({ x: cursor, width: cellWidth, kind: kinds[i] });
      cursor += cellWidth + gap;
    }

    for (var j = 0; j < cells.length; j += 1) {
      var cell = cells[j];
      var appear = phase(trajectoryP, j * .10, j * .10 + .31);
      var isObs = cell.kind === "obs";
      if (cell.kind === "ellipsis") {
        text(ctx, labels[j], cell.x + cell.width / 2, tokenY + tokenH / 2, {
          align: "center", size: compact ? 10 : 12, color: palette.muted, weight: 700, alpha: appear
        });
      } else {
        box(ctx, cell.x, tokenY, cell.width, tokenH, {
          radius: 5,
          fill: isObs ? palette.observationSoft : palette.actionSoft,
          stroke: isObs ? palette.observationStroke : palette.actionStroke,
          alpha: appear
        });
        text(ctx, labels[j], cell.x + cell.width / 2, tokenY + tokenH / 2, {
          align: "center", size: compact ? 6.8 : 7.8,
          color: isObs ? palette.observation : palette.action, weight: 690, alpha: appear
        });
      }
    }

    text(ctx, "POLICY LOSS", (tokensLeft + tokensRight) / 2, policyY - 10, {
      align: "center", size: compact ? 6.5 : 7.4,
      color: palette.action, weight: 740, alpha: policyP
    });
    laneOutline(ctx, policyY, palette.action, policyP);
    laneOutline(ctx, worldY, palette.observation, worldP);
    text(ctx, "WORLD MODELING LOSS", (tokensLeft + tokensRight) / 2, worldY + laneH + 10, {
      align: "center", size: compact ? 6.4 : 7.3,
      color: palette.observation, weight: 740, alpha: worldP
    });

    for (var k = 0; k < cells.length; k += 1) {
      var laneCell = cells[k];
      var laneObs = laneCell.kind === "obs";
      var laneAct = laneCell.kind === "act";
      var policyAppear = phase(policyP, k * .08, k * .08 + .36);
      var worldAppear = phase(worldP, k * .08, k * .08 + .36);

      if (laneCell.kind === "ellipsis") {
        text(ctx, "…", laneCell.x + laneCell.width / 2, policyY + laneH / 2, {
          align: "center", size: 9, color: palette.quiet, alpha: policyP
        });
        text(ctx, "…", laneCell.x + laneCell.width / 2, worldY + laneH / 2, {
          align: "center", size: 9, color: palette.quiet, alpha: worldP
        });
        continue;
      }

      if (laneAct) {
        flameGlyph(ctx, laneCell.x + laneCell.width / 2, policyY + laneH / 2 + .4,
          Math.min(8.5, laneCell.width * .17), palette.action, policyAppear);
      } else {
        maskGlyph(ctx, laneCell.x, policyY, laneCell.width, policyAppear);
      }

      if (k === 0 && cells.length > 1) {
        var prefixWidth = cells[1].x + cells[1].width - laneCell.x;
        maskGlyph(ctx, laneCell.x, worldY, prefixWidth, worldAppear);
      } else if (k === 1) {
        continue;
      } else if (laneObs) {
        flameGlyph(ctx, laneCell.x + laneCell.width / 2, worldY + laneH / 2 + .4,
          Math.min(8.5, laneCell.width * .17), palette.action, worldAppear);
      } else {
        maskGlyph(ctx, laneCell.x, worldY, laneCell.width, worldAppear);
      }
    }

    if (!compact) {
      var updateX = diagramRight - 54;
      var updateY = 98;
      bezier(ctx, [
        [tokensRight + 4, policyY + laneH / 2],
        [tokensRight + 28, policyY + laneH / 2],
        [updateX - 24, updateY],
        [updateX - 5, updateY]
      ], jointP, { color: palette.action, width: 1, alpha: jointP * .62 });
      bezier(ctx, [
        [tokensRight + 4, worldY + laneH / 2],
        [tokensRight + 28, worldY + laneH / 2],
        [updateX - 24, updateY],
        [updateX - 5, updateY]
      ], jointP, { color: palette.observation, width: 1, alpha: jointP * .62 });
      line(ctx, updateX, updateY - 12, updateX, updateY + 12, {
        color: palette.ink, width: 2, alpha: jointP
      });
      text(ctx, "shared", updateX + 8, updateY - 5, {
        size: 6.5, color: palette.muted, weight: 650, alpha: jointP
      });
      text(ctx, "policy update", updateX + 8, updateY + 5, {
        size: 7.2, color: palette.ink, weight: 720, alpha: jointP
      });
    }

    text(ctx, "standard RL leaves observations unused", tokensLeft, 190, {
      size: compact ? 6.2 : 7.2, color: palette.muted, weight: 620,
      alpha: policyP * (1 - worldP) * .92
    });
    text(ctx, compact ? "same rollout learns actions + consequences" :
      "same rollout learns what to do + what happens next", tokensLeft, 190, {
      size: compact ? 6.25 : 7.4, color: palette.ink, weight: 690, alpha: jointP
    });
  }
  function drawHIVE(ctx, width, height, progress) {
    var compact = width < 460;
    var palette = {
      ink: "#273139",
      muted: "#65717a",
      quiet: "#929ba1",
      line: "rgba(39,49,57,.18)",
      lineStrong: "rgba(39,49,57,.30)",
      accent: "#9f5968",
      accentSoft: "rgba(159,89,104,.10)",
      paper: "rgba(255,255,255,.72)"
    };
    var plotLeft = 30;
    var plotRight = width * (compact ? .70 : .72);
    var plotTop = 48;
    var plotBottom = 160;
    var sideLeft = plotRight + 17;
    var sideRight = width - 18;
    var driftP = phase(progress, .11, .38);
    var historyP = phase(progress, .27, .48);
    var verifyP = phase(progress, .45, .70);
    var rolloutP = phase(progress, .68, .89);
    var historyEdge = .37;
    var currentEdge = lerp(.37, .67, driftP);
    var gamma = .57;
    var regionWidth = Math.max(48, (plotRight - plotLeft) * .19);

    text(ctx, compact ? "TRACK THE MOVING EDGE" : "TRACK THE CURRENT LEARNING EDGE BEFORE ROLLOUT", 20, 20, {
      size: compact ? 9.3 : 10.4, weight: 740, color: palette.muted
    });

    line(ctx, plotLeft, plotBottom, plotRight, plotBottom, {
      color: palette.lineStrong, width: 1.1
    });
    line(ctx, plotLeft, plotTop, plotLeft, plotBottom, {
      color: palette.lineStrong, width: 1.1
    });
    text(ctx, "easy", plotLeft, plotBottom + 11, { size: 8, color: palette.quiet });
    text(ctx, "hard", plotRight, plotBottom + 11, {
      align: "right", size: 8, color: palette.quiet
    });
    text(ctx, "current V(x)", plotLeft + 2, plotTop - 9, {
      size: 7.7, color: palette.muted, weight: 680
    });

    var historyX = lerp(plotLeft, plotRight, historyEdge);
    var edgeX = lerp(plotLeft, plotRight, currentEdge);
    var historyLeft = historyX - regionWidth / 2;
    var historyRight = historyX + regionWidth / 2;
    var edgeLeft = edgeX - regionWidth / 2;
    var edgeRight = edgeX + regionWidth / 2;

    if (historyP > .02) {
      line(ctx, historyLeft, plotTop + 6, historyLeft, plotBottom - 5, {
        color: palette.quiet, width: 1.1, dash: [4, 4], alpha: historyP * .62
      });
      line(ctx, historyRight, plotTop + 6, historyRight, plotBottom - 5, {
        color: palette.quiet, width: 1.1, dash: [4, 4], alpha: historyP * .62
      });
      text(ctx, driftP > .62 ? "history: stale" : "history", historyX, plotTop + 5, {
        align: "center", size: 7.8, color: palette.quiet,
        weight: 680, alpha: historyP
      });
    }

    if (driftP > .03) {
      ctx.save();
      ctx.globalAlpha = driftP;
      ctx.fillStyle = palette.accentSoft;
      ctx.fillRect(edgeLeft, plotTop + 5, regionWidth, plotBottom - plotTop - 10);
      ctx.restore();
      line(ctx, edgeLeft, plotTop + 5, edgeLeft, plotBottom - 5, {
        color: palette.accent, width: 1.35, alpha: driftP
      });
      line(ctx, edgeRight, plotTop + 5, edgeRight, plotBottom - 5, {
        color: palette.accent, width: 1.35, alpha: driftP
      });
      text(ctx, compact ? "current edge" : "current-policy entropy", edgeX, plotTop + 17, {
        align: "center", size: compact ? 7.2 : 7.8,
        color: palette.accent, weight: 720, alpha: driftP
      });
    }

    var pointCount = compact ? 24 : 30;
    var survivors = [];
    for (var i = 0; i < pointCount; i += 1) {
      var xf = (i + .5) / pointCount;
      var jitter = Math.sin(i * 2.37) * .07 + Math.cos(i * .83) * .035;
      var historyV = clamp(.16 + .77 * Math.exp(-Math.pow((xf - historyEdge) / .19, 2)) + jitter, .08, .98);
      var currentV = clamp(.16 + .77 * Math.exp(-Math.pow((xf - currentEdge) / .19, 2)) + jitter, .08, .98);
      var value = lerp(historyV, currentV, verifyP);
      var x = lerp(plotLeft + 6, plotRight - 6, xf);
      var y = lerp(plotBottom - 6, plotTop + 11, value);
      var inHistory = Math.abs(xf - historyEdge) < .105;
      var inCurrent = Math.abs(xf - currentEdge) < .105;
      var survivor = inCurrent && value > gamma && verifyP > .18;
      if (survivor) survivors.push({ x: x, y: y });
      dot(ctx, x, y, survivor ? 3.5 : 2.6,
        survivor ? palette.accent : palette.muted,
        survivor ? verifyP : (inHistory ? .55 : .30),
        survivor ? palette.accent : null);
    }

    var gammaY = lerp(plotBottom - 6, plotTop + 11, gamma);
    if (verifyP > .03) {
      line(ctx, plotLeft, gammaY, plotRight, gammaY, {
        color: palette.accent, width: 1, dash: [4, 4], alpha: verifyP * .55
      });
      text(ctx, "median", plotRight - 3, gammaY - 8, {
        align: "right", size: 7.4, color: palette.accent, alpha: verifyP
      });
    }

    var resultX = sideLeft;
    var resultWidth = Math.max(78, sideRight - sideLeft);
    var resultCenter = resultX + resultWidth / 2;
    if (rolloutP > .02) {
      var sourceY = survivors.length ? survivors[Math.floor(survivors.length / 2)].y : 105;
      arrow(ctx, edgeRight + 3, sourceY, resultX - 9, 108, rolloutP, {
        color: palette.accent, width: 1.35, alpha: rolloutP, head: 5
      });
      box(ctx, resultX, 78, resultWidth, 60, {
        radius: 10, fill: palette.paper,
        stroke: "rgba(159,89,104,.46)", lineWidth: 1.2, alpha: rolloutP
      });
      text(ctx, "ROLLOUT", resultCenter, 97, {
        align: "center", size: compact ? 7.3 : 8,
        color: palette.muted, weight: 680, alpha: rolloutP
      });
      text(ctx, "GRPO", resultCenter, 118, {
        align: "center", size: compact ? 9.2 : 10.4,
        color: palette.accent, weight: 760, alpha: rolloutP
      });
      text(ctx, compact ? "verified only" : "verified prompts only", resultCenter, 151, {
        align: "center", size: compact ? 7.1 : 7.8,
        color: palette.accent, weight: 680, alpha: rolloutP
      });
    }

    var railLeft = 22;
    var railRight = width - 22;
    var railY = 205;
    var stages = ["history", "online verify", "rollout"];
    line(ctx, railLeft, railY, railRight, railY, { color: palette.line, width: 1 });
    line(ctx, railLeft, railY, lerp(railLeft, railRight, progress), railY, {
      color: palette.accent, width: 1.3, alpha: .72
    });
    stages.forEach(function (label, index) {
      var x = lerp(railLeft, railRight, index / (stages.length - 1));
      var reached = progress >= index / stages.length;
      dot(ctx, x, railY, reached ? 2.8 : 2.1,
        reached ? palette.accent : palette.quiet, 1);
      text(ctx, label, x, 191, {
        align: index === 0 ? "left" : (index === stages.length - 1 ? "right" : "center"),
        size: 7.5, color: reached ? palette.ink : palette.quiet,
        weight: reached ? 700 : 560
      });
    });
  }
  function trace(ctx, points, progress, options) {
    if (!points.length) return null;
    var visible = Math.max(2, Math.floor((points.length - 1) * clamp(progress, 0, 1)) + 1);
    ctx.save();
    ctx.globalAlpha *= options.alpha === undefined ? 1 : options.alpha;
    if (options.dash) ctx.setLineDash(options.dash);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < visible; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.width || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    return points[Math.min(visible - 1, points.length - 1)];
  }

  function drawPRM(ctx, width, height, progress) {
    var compact = width < 460;
    var palette = {
      ink: "#29342e",
      muted: "#65736b",
      quiet: "#929c96",
      line: "rgba(41,52,46,.18)",
      accent: "#47715a",
      accentLight: "#789381",
      accentSoft: "rgba(71,113,90,.10)",
      paper: "rgba(255,255,255,.60)"
    };
    var contentWidth = Math.min(width - 32, 560);
    var left = (width - contentWidth) / 2;
    var gap = compact ? 18 : 24;
    var conceptWidth = Math.round((contentWidth - gap) * (compact ? .60 : .58));
    var chartLeft = left + conceptWidth + gap;
    var chartRight = left + contentWidth;
    var bridgeWidth = compact ? 30 : 34;
    var panelWidth = (conceptWidth - bridgeWidth) / 2;
    var bridgeCenter = left + panelWidth + bridgeWidth / 2;
    var rightPanel = left + panelWidth + bridgeWidth;
    var panelTop = 45;
    var panelHeight = 143;
    var frameP = phase(progress, .04, .18);
    var solveP = phase(progress, .13, .36);
    var bridgeP = phase(progress, .28, .48);
    var judgeP = phase(progress, .40, .64);
    var findingP = phase(progress, .54, .72);
    var curveP = phase(progress, .67, .97);

    text(ctx, compact ? "ONE ABILITY: SOLVE = JUDGE" :
      "ONE REASONING ABILITY, TWO USES", left, 18, {
        size: compact ? 9.2 : 10.4, weight: 740, color: palette.muted
      });

    box(ctx, left, panelTop, panelWidth, panelHeight, {
      radius: 10,
      fill: palette.paper,
      stroke: "rgba(71,113,90,.28)",
      lineWidth: 1.15,
      alpha: frameP
    });
    text(ctx, "GENERATE", left + 10, panelTop + 17, {
      size: compact ? 7.4 : 7.8,
      color: palette.accent, weight: 760, alpha: frameP
    });
    text(ctx, compact ? "12\u00f73+5" : "12 \u00f7 3 + 5",
      left + panelWidth / 2, panelTop + 39, {
        align: "center", size: compact ? 8 : 8.7,
        color: palette.ink, weight: 700, alpha: solveP
      });
    line(ctx, left + 10, panelTop + 53, left + panelWidth - 10, panelTop + 53, {
      color: palette.line, width: 1, alpha: solveP
    });
    text(ctx, compact ? "12\u00f73=4" : "12 \u00f7 3 = 4",
      left + 10, panelTop + 75, {
        size: compact ? 7.4 : 7.9, color: palette.muted,
        weight: 630, alpha: phase(solveP, 0, .72)
      });
    text(ctx, compact ? "4+5=9" : "4 + 5 = 9",
      left + 10, panelTop + 102, {
        size: compact ? 8 : 8.8, color: palette.accent,
        weight: 760, alpha: phase(solveP, .35, 1)
      });
    line(ctx, left + 10, panelTop + 112,
      lerp(left + 10, left + Math.min(panelWidth - 10, compact ? 59 : 72), solveP),
      panelTop + 112, {
        color: palette.accent, width: 1.6, alpha: solveP
      });
    text(ctx, "CORRECT", left + 10, panelTop + 128, {
      size: 7.4, color: palette.accent, weight: 740,
      alpha: phase(solveP, .58, 1)
    });

    text(ctx, "=", bridgeCenter, panelTop + 58, {
      align: "center", size: compact ? 17 : 20,
      color: palette.accent, weight: 520, alpha: bridgeP
    });
    text(ctx, "SAME", bridgeCenter, panelTop + 91, {
      align: "center", size: 7.4, color: palette.quiet,
      weight: 680, alpha: bridgeP
    });
    text(ctx, "MODEL", bridgeCenter, panelTop + 106, {
      align: "center", size: 7.4, color: palette.quiet,
      weight: 680, alpha: bridgeP
    });

    box(ctx, rightPanel, panelTop, panelWidth, panelHeight, {
      radius: 10,
      fill: palette.paper,
      stroke: "rgba(71,113,90,.28)",
      lineWidth: 1.15,
      alpha: bridgeP
    });
    text(ctx, "JUDGE", rightPanel + 10, panelTop + 17, {
      size: compact ? 7.4 : 7.8,
      color: palette.accent, weight: 760, alpha: bridgeP
    });
    text(ctx, compact ? "OTHER SOLUTION" : "ANOTHER SOLUTION",
      rightPanel + panelWidth / 2, panelTop + 39, {
        align: "center", size: 7.4,
        color: palette.quiet, weight: 650, alpha: judgeP
      });
    text(ctx, compact ? "12\u00f73=4" : "12 \u00f7 3 = 4",
      rightPanel + 10, panelTop + 65, {
        size: compact ? 7.4 : 7.9, color: palette.muted,
        weight: 630, alpha: phase(judgeP, 0, .65)
      });
    box(ctx, rightPanel + 7, panelTop + 76,
      Math.min(panelWidth - 14, compact ? 70 : 86), 27, {
        radius: 6,
        fill: palette.accentSoft,
        stroke: "rgba(71,113,90,.48)",
        lineWidth: 1.1,
        alpha: findingP
      });
    text(ctx, compact ? "4+5=8" : "4 + 5 = 8",
      rightPanel + 10, panelTop + 89, {
        size: compact ? 8 : 8.8, color: palette.ink,
        weight: 720, alpha: phase(judgeP, .18, .82)
      });
    text(ctx, compact ? "WRONG" : "ERROR FOUND", rightPanel + 10, panelTop + 121, {
      size: 7.4, color: palette.accent,
      weight: 760, alpha: findingP
    });

    text(ctx, "BOTH RISE WITH RL", chartLeft, panelTop + 2, {
      size: compact ? 7.4 : 7.9,
      color: palette.muted, weight: 740, alpha: curveP
    });
    line(ctx, chartLeft, panelTop + 23, chartLeft + 18, panelTop + 23, {
      color: palette.accent, width: 2.2, alpha: curveP
    });
    text(ctx, compact ? "SOLVING" : "PROBLEM SOLVING", chartLeft + 24, panelTop + 23, {
      size: compact ? 7.4 : 7.6,
      color: palette.accent, weight: 700, alpha: curveP
    });
    line(ctx, chartLeft, panelTop + 39, chartLeft + 18, panelTop + 39, {
      color: palette.accentLight, width: 1.9, dash: [4, 3], alpha: curveP
    });
    text(ctx, compact ? "PRM JUDGE" : "PRM JUDGMENT", chartLeft + 24, panelTop + 39, {
      size: compact ? 7.4 : 7.6,
      color: palette.accentLight, weight: 700, alpha: curveP
    });

    var plotLeft = chartLeft + 4;
    var plotRight = chartRight - 4;
    var plotTop = panelTop + 51;
    var plotBottom = panelTop + panelHeight;
    line(ctx, plotLeft, plotBottom, plotRight, plotBottom, {
      color: palette.line, width: 1, alpha: curveP
    });
    line(ctx, plotLeft, plotTop, plotLeft, plotBottom, {
      color: palette.line, width: 1, alpha: curveP
    });

    var solving = [];
    var judging = [];
    for (var i = 0; i <= 40; i += 1) {
      var u = i / 40;
      var x = lerp(plotLeft + 3, plotRight, u);
      var solvingValue = .08 + .84 * (1 - Math.exp(-3.25 * u));
      var judgingValue = .06 + .70 * (1 - Math.exp(-2.55 * u));
      solving.push([x, lerp(plotBottom - 4, plotTop + 5, solvingValue)]);
      judging.push([x, lerp(plotBottom - 4, plotTop + 5, judgingValue)]);
    }
    var solvingEnd = trace(ctx, solving, curveP, {
      color: palette.accent, width: 2.25, alpha: curveP
    });
    var judgingEnd = trace(ctx, judging, phase(curveP, .08, 1), {
      color: palette.accentLight, width: 1.95, dash: [4, 3], alpha: curveP
    });
    if (solvingEnd) {
      dot(ctx, solvingEnd[0], solvingEnd[1], 2.5,
        palette.accent, curveP, palette.paper);
    }
    if (judgingEnd) {
      dot(ctx, judgingEnd[0], judgingEnd[1], 2.4,
        palette.accentLight, curveP, palette.paper);
    }
    text(ctx, "training", (plotLeft + plotRight) / 2, plotBottom + 13, {
      align: "center", size: 7.4,
      color: palette.quiet, weight: 600, alpha: curveP
    });
  }
  function miniGauge(ctx, x, y, width, value, color, label, alpha) {
    text(ctx, label, x, y - 6, { size: 7.1, color: colors.muted, alpha: alpha });
    line(ctx, x, y, x + width, y, { color: colors.lineStrong, width: 3, alpha: alpha });
    line(ctx, x, y, x + width * value, y, { color: color, width: 3, alpha: alpha });
  }

  function drawSafeDelta(ctx, width, height, progress) {
    var compact = width < 460;
    var palette = {
      ink: "#29343c",
      muted: "#65727b",
      quiet: "#949da3",
      line: "rgba(41,52,60,.18)",
      lineStrong: "rgba(41,52,60,.30)",
      utility: "#456b83",
      utilitySoft: "rgba(69,107,131,.12)",
      safety: "#a26057",
      paper: "rgba(255,255,255,.62)"
    };
    var cellsP = phase(progress, .05, .21);
    var utilityP = phase(progress, .18, .43);
    var safetyP = phase(progress, .40, .64);
    var greedyP = phase(progress, .61, .92);
    var utility = [
      .92, .55, .78, .88,
      .43, .81, .96, .63,
      .72, .90, .57, .84,
      .38, .76, .68, .86
    ];
    var safetyCost = [
      .18, .22, .62, .31,
      .15, .27, .58, .20,
      .41, .19, .71, .34,
      .12, .29, .45, .25
    ];
    var greedyOrder = [0, 9, 15, 5, 3];
    var rankByIndex = {};
    greedyOrder.forEach(function (index, rank) { rankByIndex[index] = rank + 1; });
    var selectedCount = Math.min(greedyOrder.length,
      Math.floor(greedyP * greedyOrder.length + .999));
    var cellSize = compact ? 25 : 28;
    var gap = compact ? 6 : 7;
    var gridWidth = cellSize * 4 + gap * 3;
    var gridLeft = compact ? 26 : 38;
    var gridTop = 52;
    var panelWidth = compact ? 126 : 148;
    var panelLeft = width - panelWidth - 20;
    var panelCenter = panelLeft + panelWidth / 2;

    text(ctx, compact ? "GREEDY SELECT SAFE, USEFUL UPDATES" :
      "GREEDILY SELECT HIGH-UTILITY, LOW-SAFETY-COST UPDATES", 20, 20, {
        size: compact ? 9.1 : 10.2, weight: 740, color: palette.muted
      });
    text(ctx, "4 x 4 DELTA W", gridLeft, 40, {
      size: 7.7, color: palette.muted, weight: 700
    });

    for (var i = 0; i < utility.length; i += 1) {
      var column = i % 4;
      var row = Math.floor(i / 4);
      var x = gridLeft + column * (cellSize + gap);
      var y = gridTop + row * (cellSize + gap);
      var greedyRank = rankByIndex[i] || 0;
      var isSelected = greedyRank > 0 && greedyRank <= selectedCount;
      var highUtility = utility[i] >= .80;
      var utilityHighlight = highUtility ? phase(utilityP,
        (i % 4) * .10, Math.min(1, (i % 4) * .10 + .42)) : utilityP;
      var fade = greedyP > .04 && !isSelected ? lerp(1, .42, greedyP) : 1;
      box(ctx, x, y, cellSize, cellSize, {
        radius: 5,
        fill: palette.paper,
        stroke: isSelected ? palette.utility :
          (highUtility && utilityP > .15 ? "rgba(69,107,131,.54)" : palette.lineStrong),
        lineWidth: isSelected ? 2 : 1,
        alpha: cellsP * fade
      });

      var innerHeight = cellSize - 8;
      var innerWidth = (cellSize - 11) / 2;
      var utilityHeight = innerHeight * utility[i] * utilityHighlight;
      var harmHeight = innerHeight * safetyCost[i] * safetyP;
      var barBottom = y + cellSize - 4;
      ctx.save();
      ctx.globalAlpha = cellsP * fade;
      ctx.fillStyle = palette.utility;
      ctx.fillRect(x + 4, barBottom - utilityHeight, innerWidth, utilityHeight);
      ctx.fillStyle = palette.safety;
      ctx.fillRect(x + cellSize - 4 - innerWidth, barBottom - harmHeight,
        innerWidth, harmHeight);
      ctx.restore();

    }

    var legendX = gridLeft + gridWidth + (compact ? 18 : 24);
    text(ctx, "U+  utility gain", legendX, 82, {
      size: 7.8, color: palette.utility, weight: 720, alpha: utilityP
    });
    text(ctx, "higher is better", legendX, 96, {
      size: 7, color: palette.quiet, alpha: utilityP
    });
    text(ctx, "S-  safety harm", legendX, 119, {
      size: 7.8, color: palette.safety, weight: 720, alpha: safetyP
    });
    text(ctx, "higher is worse", legendX, 133, {
      size: 7, color: palette.quiet, alpha: safetyP
    });

    arrow(ctx, legendX + (compact ? 70 : 90), 107, panelLeft - 10, 107, greedyP, {
      color: palette.utility, width: 1.4, alpha: greedyP, head: 5
    });

    box(ctx, panelLeft, 56, panelWidth, 105, {
      radius: 11, fill: palette.paper,
      stroke: "rgba(69,107,131,.40)", lineWidth: 1.2, alpha: greedyP
    });
    text(ctx, "GREEDY KEEP", panelCenter, 75, {
      align: "center", size: compact ? 7.7 : 8.4,
      color: palette.muted, weight: 720, alpha: greedyP
    });
    text(ctx, "best remaining trade-off", panelCenter, 91, {
      align: "center", size: compact ? 6.4 : 7.1,
      color: palette.quiet, alpha: greedyP
    });

    var keptSize = compact ? 16 : 18;
    var keptGap = compact ? 4 : 5;
    var keptWidth = greedyOrder.length * keptSize + (greedyOrder.length - 1) * keptGap;
    var keptLeft = panelCenter - keptWidth / 2;
    greedyOrder.forEach(function (cellIndex, rank) {
      var active = rank < selectedCount;
      var keptX = keptLeft + rank * (keptSize + keptGap);
      box(ctx, keptX, 108, keptSize, keptSize, {
        radius: 3,
        fill: active ? palette.utilitySoft : "rgba(41,52,60,.035)",
        stroke: active ? palette.utility : palette.line,
        lineWidth: active ? 1.3 : 1,
        alpha: greedyP
      });
      if (active) {
        var keptInnerHeight = keptSize - 6;
        var keptBarWidth = (keptSize - 9) / 2;
        var keptBottom = 108 + keptSize - 3;
        var keptUtilityHeight = keptInnerHeight * utility[cellIndex];
        var keptHarmHeight = keptInnerHeight * safetyCost[cellIndex];
        ctx.save();
        ctx.globalAlpha = greedyP;
        ctx.fillStyle = palette.utility;
        ctx.fillRect(keptX + 3, keptBottom - keptUtilityHeight,
          keptBarWidth, keptUtilityHeight);
        ctx.fillStyle = palette.safety;
        ctx.fillRect(keptX + keptSize - 3 - keptBarWidth,
          keptBottom - keptHarmHeight, keptBarWidth, keptHarmHeight);
        ctx.restore();
      }
    });
    text(ctx, "greedy order", panelCenter, 146, {
      align: "center", size: 7.2,
      color: palette.utility, weight: 700, alpha: greedyP
    });

    var railLeft = 22;
    var railRight = width - 22;
    var railY = 205;
    var stages = ["utility", "safety cost", "greedy select"];
    line(ctx, railLeft, railY, railRight, railY, { color: palette.line, width: 1 });
    line(ctx, railLeft, railY, lerp(railLeft, railRight, progress), railY, {
      color: palette.utility, width: 1.3, alpha: .72
    });
    stages.forEach(function (label, index) {
      var x = lerp(railLeft, railRight, index / (stages.length - 1));
      var reached = progress >= index / stages.length;
      dot(ctx, x, railY, reached ? 2.8 : 2.1,
        reached ? palette.utility : palette.quiet, 1);
      text(ctx, label, x, 191, {
        align: index === 0 ? "left" : (index === stages.length - 1 ? "right" : "center"),
        size: 7.5, color: reached ? palette.ink : palette.quiet,
        weight: reached ? 700 : 560
      });
    });
  }
  function lock(ctx, x, y, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = colors.amber;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y - 3, 4, Math.PI, 0);
    ctx.stroke();
    roundedPath(ctx, x - 6, y - 2, 12, 10, 3);
    ctx.stroke();
    ctx.restore();
  }

  function drawSICO(ctx, width, height, progress) {
    sceneTitle(ctx, "ITERATE ONE IN-CONTEXT EXAMPLE, THEN GENERATE", width);
    var compact = width < 460;
    var exampleP = phase(progress, .06, .24);
    var optimizeP = phase(progress, .22, .59);
    var modelP = phase(progress, .57, .76);
    var outputP = phase(progress, .73, .93);
    var left = 20;
    var exampleWidth = compact ? 122 : 158;
    var exampleHeight = 100;
    var exampleY = 57;
    var modelWidth = compact ? 64 : 82;
    var modelX = width / 2 - modelWidth / 2;
    var outputWidth = compact ? 120 : 154;
    var outputX = width - outputWidth - 20;

    box(ctx, left, exampleY, exampleWidth, exampleHeight, {
      radius: 10,
      fill: "rgba(226,179,97,.055)",
      stroke: "rgba(226,179,97,.34)",
      lineWidth: 1.2,
      alpha: exampleP
    });
    text(ctx, compact ? "IN-CONTEXT EXAMPLE" : "IN-CONTEXT EXAMPLE", left + exampleWidth / 2, 73, {
      align: "center", size: compact ? 7.5 : 8.3,
      color: colors.amber, weight: 720, alpha: exampleP
    });
    var lineWidths = [.76, .91, .64, .82];
    for (var i = 0; i < lineWidths.length; i += 1) {
      var refinedWidth = lerp(lineWidths[i] * .76, lineWidths[i], optimizeP);
      line(ctx, left + 13, 93 + i * 13,
        left + 13 + (exampleWidth - 26) * refinedWidth, 93 + i * 13, {
          color: i === 2 ? colors.amber : colors.graphite,
          width: i === 2 ? 2.2 : 1.8,
          alpha: exampleP * (i === 2 ? .82 : .55)
        });
    }
    text(ctx, optimizeP > .72 ? "optimized" : "iterating",
      left + exampleWidth / 2, 146, {
        align: "center", size: compact ? 7.1 : 7.8,
        color: colors.amber, weight: 700, alpha: Math.max(exampleP, optimizeP)
      });
    var versionY = 174;
    for (var v = 0; v < 3; v += 1) {
      var reached = optimizeP >= v / 3;
      var versionX = left + exampleWidth / 2 - 21 + v * 21;
      dot(ctx, versionX, versionY, reached ? 3.1 : 2.2,
        reached ? colors.amber : colors.quiet, 1);
      if (v < 2) line(ctx, versionX + 4, versionY, versionX + 17, versionY, {
        color: reached ? colors.amber : colors.line, width: 1
      });
    }
    text(ctx, "iterate example", left + exampleWidth / 2, 188, {
      align: "center", size: 7.3, color: colors.muted, alpha: optimizeP
    });

    arrow(ctx, left + exampleWidth + 8, 107, modelX - 9, 107, modelP, {
      color: colors.amber, width: 1.35, alpha: modelP, head: 5
    });
    box(ctx, modelX, 80, modelWidth, 55, {
      radius: 10,
      fill: "rgba(163,150,255,.07)",
      stroke: "rgba(163,150,255,.34)",
      lineWidth: 1.2,
      alpha: modelP
    });
    text(ctx, "LLM", modelX + modelWidth / 2, 107, {
      align: "center", size: compact ? 9.4 : 10.6,
      color: colors.violet, weight: 760, alpha: modelP
    });

    arrow(ctx, modelX + modelWidth + 8, 107, outputX - 9, 107, outputP, {
      color: colors.teal, width: 1.4, alpha: outputP, head: 5
    });
    box(ctx, outputX, exampleY, outputWidth, exampleHeight, {
      radius: 10,
      fill: "rgba(98,209,181,.06)",
      stroke: "rgba(98,209,181,.35)",
      lineWidth: 1.2,
      alpha: outputP
    });
    text(ctx, "HUMAN-LIKE TEXT", outputX + outputWidth / 2, 75, {
      align: "center", size: compact ? 7.7 : 8.6,
      color: colors.teal, weight: 740, alpha: outputP
    });
    for (var k = 0; k < 4; k += 1) {
      line(ctx, outputX + 13, 96 + k * 13,
        outputX + 13 + (outputWidth - 26) * [.86, .69, .91, .73][k], 96 + k * 13, {
          color: k === 1 ? colors.teal : colors.graphite,
          width: k === 1 ? 2.2 : 1.8,
          alpha: outputP * (k === 1 ? .86 : .58)
        });
    }
    text(ctx, "direct output", outputX + outputWidth / 2, 174, {
      align: "center", size: compact ? 7.1 : 7.8,
      color: colors.teal, weight: 700, alpha: outputP
    });

    phaseRail(ctx, width, height, progress, ["example", "optimize", "generate"]);
  }
  var renderers = {
    paw: drawPaW,
    hive: drawHIVE,
    prm: drawPRM,
    "safe-delta": drawSafeDelta,
    sico: drawSICO
  };

  var visuals = canvases.map(function (canvas) {
    var wrapper = canvas.closest(".research-demo");
    return {
      canvas: canvas,
      wrapper: wrapper,
      replay: wrapper && wrapper.querySelector("[data-research-demo-replay]"),
      ctx: canvas.getContext("2d"),
      type: canvas.getAttribute("data-research-viz"),
      width: 0,
      height: 0,
      dpr: 1,
      visible: !("IntersectionObserver" in window),
      hasPlayed: false,
      playing: false,
      finished: reduceMotion,
      startedAt: 0,
      scrubProgress: null
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

  function visualProgress(visual, timestamp) {
    if (reduceMotion) return 1;
    if (visual.scrubProgress !== null) return visual.scrubProgress;
    if (visual.playing) {
      return clamp((timestamp - visual.startedAt) / (DURATION * 1000), 0, 1);
    }
    return visual.finished ? 1 : 0;
  }

  function draw(visual, progress) {
    resize(visual);
    var ctx = visual.ctx;
    var stageHeight = 220;
    var widthScale = visual.width / 720;
    var stageScale = Math.min(Math.max(widthScale, 1), visual.height / stageHeight);
    var stageWidth = visual.width / stageScale;
    var offsetY = Math.max(0, (visual.height - stageHeight * stageScale) / 2);

    ctx.setTransform(visual.dpr, 0, 0, visual.dpr, 0, 0);
    ctx.clearRect(0, 0, visual.width, visual.height);
    ctx.setTransform(
      visual.dpr * stageScale, 0, 0, visual.dpr * stageScale,
      0, visual.dpr * offsetY
    );
    renderers[visual.type](ctx, stageWidth, stageHeight, clamp(progress, 0, 1));
  }

  var rafId = 0;
  function ensureLoop() {
    if (!rafId && !reduceMotion) rafId = window.requestAnimationFrame(frame);
  }

  function startVisual(visual, restart) {
    if (reduceMotion) {
      visual.finished = true;
      draw(visual, 1);
      return;
    }
    if (visual.hasPlayed && !restart) {
      if (visual.playing) ensureLoop();
      return;
    }
    visual.hasPlayed = true;
    visual.playing = true;
    visual.finished = false;
    visual.scrubProgress = null;
    visual.startedAt = performance.now();
    if (visual.wrapper) visual.wrapper.classList.add("is-playing");
    ensureLoop();
  }

  function frame(timestamp) {
    rafId = 0;
    var needsMore = false;
    visuals.forEach(function (visual) {
      if (!visual.visible || !visual.playing) return;
      var progress = visualProgress(visual, timestamp);
      draw(visual, progress);
      if (progress >= 1) {
        visual.playing = false;
        visual.finished = true;
        if (visual.wrapper) visual.wrapper.classList.remove("is-playing");
      } else {
        needsMore = true;
      }
    });
    if (needsMore) ensureLoop();
  }

  visuals.forEach(function (visual) {
    visual.canvas.__researchVisual = visual;
    if (visual.replay) {
      visual.replay.addEventListener("click", function () { startVisual(visual, true); });
    }
    visual.canvas.addEventListener("pointermove", function (event) {
      if (!visual.finished || visual.playing || reduceMotion) return;
      var rect = visual.canvas.getBoundingClientRect();
      visual.scrubProgress = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      if (visual.wrapper) visual.wrapper.classList.add("is-scrubbing");
      draw(visual, visual.scrubProgress);
    });
    visual.canvas.addEventListener("pointerleave", function () {
      if (visual.scrubProgress === null) return;
      visual.scrubProgress = null;
      if (visual.wrapper) visual.wrapper.classList.remove("is-scrubbing");
      draw(visual, 1);
    });
  });

  if ("IntersectionObserver" in window) {
    var canvasObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var visual = entry.target.__researchVisual;
        if (!visual) return;
        visual.visible = entry.isIntersecting;
        if (entry.isIntersecting) startVisual(visual, false);
      });
    }, { rootMargin: "100px 0px", threshold: .12 });
    visuals.forEach(function (visual) { canvasObserver.observe(visual.canvas); });
  } else {
    visuals.forEach(function (visual) { startVisual(visual, false); });
  }

  if ("ResizeObserver" in window) {
    var resizeObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var visual = entry.target.__researchVisual;
        if (visual) draw(visual, visualProgress(visual, performance.now()));
      });
    });
    visuals.forEach(function (visual) { resizeObserver.observe(visual.canvas); });
  }

  visuals.forEach(function (visual) { draw(visual, reduceMotion ? 1 : 0); });
}());
