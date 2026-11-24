/* Konva paper scenes. The shell owns size, controls, visibility and playback. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ResearchScenes = factory();
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  function mix(a, b, t) { return a + (b - a) * t; }

  function primitives(K, root, theme) {
    function add(Type, attrs) {
      var node = new K[Type](Object.assign({ listening: false, perfectDrawEnabled: false }, attrs));
      root.add(node);
      return node;
    }
    return {
      line: function (points, attrs) {
        return add("Line", Object.assign({ points: points, stroke: theme.rule,
          strokeWidth: .8, lineCap: "round", lineJoin: "round" }, attrs));
      },
      arrow: function (points, attrs) {
        return add("Arrow", Object.assign({ points: points, stroke: theme.rule,
          fill: theme.rule, strokeWidth: .8, pointerLength: 3, pointerWidth: 3 }, attrs));
      },
      dot: function (x, y, attrs) {
        return add("Circle", Object.assign({ x: x, y: y, radius: 2.8, fill: theme.accent }, attrs));
      },
      rect: function (x, y, width, height, attrs) {
        return add("Rect", Object.assign({ x: x, y: y, width: width, height: height,
          fill: theme.surface, stroke: theme.rule, strokeWidth: .8 }, attrs));
      },
      label: function (text, x, y, attrs) {
        var options = Object.assign({ fontSize: 10, fill: theme.muted, align: "left" }, attrs);
        var node = add("Text", Object.assign({ text: text, x: x, y: y,
          fontFamily: FONT, fontStyle: "normal", height: options.fontSize * 1.3,
          verticalAlign: "middle" }, options));
        node.offsetY(options.fontSize * .65);
        if (options.align === "center") node.offsetX(node.width() / 2);
        if (options.align === "right") node.offsetX(node.width());
        return node;
      }
    };
  }

  // https://arxiv.org/html/2603.25184v2 — keep the CURRENT medium-difficulty edge.
  function createHIVE(options) {
    var K = options.Konva, gsap = options.gsap, root = options.root, theme = options.theme;
    var width = options.width, compact = width < 320;
    var gutterLeft = compact ? 14 : 20, gutterWidth = compact ? 54 : 68;
    var plotLeft = gutterLeft + gutterWidth, plotRight = width - (compact ? 16 : 20), span = plotRight - plotLeft;
    var ui = primitives(K, root, theme);
    var state = { history: 0, current: 0, shift: 0, verification: 0, hold: 0 };
    // Same prompt identities, evaluated under two policies. Illustrative difficulties
    // and prompt-entropy scores are independent, not an entropy-to-difficulty law.
    var historical = [.07, .16, .26, .37, .47, .58, .69, .79, .91];
    var current =    [.04, .10, .17, .23, .30, .43, .53, .63, .87];
    var entropy =    [.08, .12, .18, .22, .29, .85, .94, .79, .14];
    var low = .34, high = .67;
    function x(value) { return plotLeft + span * value; }
    function smooth(t) { var u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); }
    // Stage 1: broad history-informed pool retaining exploration candidates [2..7].
    var candidates = [2, 3, 4, 5, 6, 7];
    var scores = candidates.map(function (i) { return entropy[i]; }).sort(function (a, b) { return a - b; });
    var median = (scores[2] + scores[3]) / 2;
    var staleColor = "#b85c52";
    var historyY = 43, currentY = 77, entropyBaseY = 152, maxBarH = 42;
    var medianY = entropyBaseY - median * maxBarH;
    var barW = Math.max(5.5, Math.min(11, span * .032));
    var poolLeft = x(current[2]) - barW * .85, poolRight = x(current[7]) + barW * .85;

    ui.line([x(low), 24, x(high), 24, x(high), 156, x(low), 156], {
      name: "medium-band", closed: true, fill: theme.accent, strokeEnabled: false, opacity: .065
    });
    ui.line([x(low), 24, x(high), 24], { stroke: theme.accent, opacity: .3 });
    ui.label("Easy", plotLeft, 13, { fontSize: 9.5 });
    ui.label("Medium", x((low + high) / 2), 13, { align: "center", fontSize: 10, fill: theme.accent, fontStyle: "600" });
    ui.label("Hard", plotRight, 13, { align: "right", fontSize: 9.5 });

    ui.line([plotLeft, historyY, plotRight, historyY], { opacity: .3 });
    var currentRule = ui.line([plotLeft, currentY, plotRight, currentY], { opacity: 0 });
    var historyLabel = ui.label("History", gutterLeft, historyY, { fontSize: 9.5 });
    var currentLabel = ui.label("Current", gutterLeft, currentY, { fontSize: 9.5, opacity: 0 });
    var entropyLabelTop = ui.label("Prompt", gutterLeft, 124, { fontSize: 9.5, fontStyle: "600", opacity: 0 });
    var entropyLabelBot = ui.label("entropy", gutterLeft, 136, { fontSize: 9.5, fontStyle: "600", opacity: 0 });

    var entropyBase = ui.line([poolLeft, entropyBaseY, poolRight, entropyBaseY], { stroke: theme.rule, opacity: 0 });
    var medianLine = ui.line([poolLeft, medianY, poolRight + 5, medianY], {
      name: "entropy-median", stroke: theme.accent, strokeWidth: .95, dash: [3, 3], opacity: 0
    });
    var medianLabel = ui.label("Median", poolRight + 9, medianY, { fontSize: 9.5, fill: theme.accent, opacity: 0 });

    var prompts = historical.map(function (difficulty, index) {
      var shortlisted = candidates.indexOf(index) !== -1;
      var favored = difficulty >= low && difficulty <= high;
      var verified = shortlisted && entropy[index] >= median;
      var becameStale = favored && !verified;
      var link = shortlisted ? ui.line([x(difficulty), historyY + 4, x(difficulty), currentY - 4], {
        name: "drift-" + index, stroke: becameStale ? staleColor : theme.accent,
        strokeWidth: favored ? .9 : .65, dash: [2, 3], opacity: 0
      }) : null;
      var old = ui.dot(x(difficulty), historyY, {
        name: "history-" + index, radius: shortlisted ? 3.2 : 2,
        fill: favored ? theme.accent : theme.surface,
        stroke: shortlisted ? theme.accent : theme.muted, strokeWidth: 1, opacity: 0
      });
      var outline = ui.dot(x(difficulty), currentY, {
        name: "prompt-" + index, radius: shortlisted ? 3.5 : 2,
        fill: theme.surface, stroke: shortlisted ? theme.accent : theme.muted,
        strokeWidth: 1, opacity: 0
      });
      var selected = ui.dot(x(difficulty), currentY, {
        name: "selected-" + index, radius: 3.5, fill: theme.accent, opacity: 0
      });
      var staleRing = becameStale ? ui.dot(x(difficulty), currentY, {
        name: "stale-ring-" + index, radius: 6, fillEnabled: false,
        stroke: staleColor, strokeWidth: 1.1, dash: [2, 2], opacity: 0
      }) : null;
      var barX = x(current[index]) - barW / 2;
      var barTopY = entropyBaseY - entropy[index] * maxBarH;
      var entropyBar = shortlisted ? ui.rect(barX, entropyBaseY, barW, 0, {
        name: "entropy-bar-" + index, cornerRadius: 1.8,
        fill: verified ? theme.accent : (becameStale ? staleColor : theme.muted),
        strokeEnabled: false, opacity: 0
      }) : null;
      var verifyLink = verified ? ui.line([x(current[index]), barTopY - 3, x(current[index]), barTopY - 3], {
        name: "verify-link-" + index, stroke: theme.accent, strokeWidth: .95, dash: [2, 2], opacity: 0
      }) : null;
      return {
        old: old, outline: outline, selected: selected, staleRing: staleRing, link: link,
        entropyBar: entropyBar, verifyLink: verifyLink, barTopY: barTopY,
        favored: favored, shortlisted: shortlisted, verified: verified, becameStale: becameStale
      };
    });

    var caption = ui.label("Target medium difficulty", gutterLeft, 174, { fontSize: 9.5 });

    var timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } })
      .addLabel("history", 0)
      .to(state, { history: 1, duration: .6 }, .15)
      .addLabel("policy-update", .9)
      .to(state, { current: 1, duration: .4 }, "policy-update")
      .to(state, { shift: 1, duration: 1.3 }, "policy-update+=.25")
      .addLabel("stale-history", 2.45)
      .addLabel("prompt-entropy", 3.15)
      .to(state, { verification: 1, duration: 1.75 }, "prompt-entropy")
      .to(state, { hold: 1, duration: 1.9 }, 4.9);

    function render() {
      var barGrow = smooth(state.verification * 1.45);
      var gateApply = smooth((state.verification - .35) / .65);
      var staleShow = smooth((state.shift - .55) / .45) * (1 - gateApply);

      historyLabel.opacity(mix(1, .52, state.shift));
      currentLabel.opacity(state.current);
      currentLabel.fill(state.current > 0 ? theme.ink : theme.muted);
      currentRule.opacity(state.current * .35);

      var entropyShow = smooth(state.verification * 2.5);
      entropyLabelTop.opacity(entropyShow);
      entropyLabelTop.fill(entropyShow > 0 ? theme.ink : theme.muted);
      entropyLabelBot.opacity(entropyShow);
      entropyLabelBot.fill(entropyShow > 0 ? theme.ink : theme.muted);
      entropyBase.opacity(entropyShow * .6);
      medianLine.opacity(smooth(state.verification * 2) * .78);
      medianLabel.opacity(smooth((state.verification - .1) * 2) * .95);

      prompts.forEach(function (prompt, index) {
        var px = x(mix(historical[index], current[index], state.shift));
        prompt.old.opacity(state.history * (prompt.shortlisted ? mix(.92, .38, state.shift) : .16));
        prompt.outline.x(px);
        prompt.outline.stroke(
          prompt.becameStale && (staleShow > .05 || gateApply > .05) ? staleColor :
          (prompt.shortlisted ? theme.accent : theme.muted)
        );
        prompt.outline.opacity(state.current * (prompt.shortlisted ? mix(.65, prompt.verified ? 1 : (prompt.becameStale ? .48 : .28), gateApply) : .16));

        prompt.selected.x(px);
        prompt.selected.fill(prompt.becameStale && staleShow > .05 ? staleColor : theme.accent);
        prompt.selected.opacity(state.current * mix(prompt.favored ? 1 : 0, prompt.verified ? 1 : 0, gateApply));

        if (prompt.staleRing) {
          prompt.staleRing.x(px);
          prompt.staleRing.opacity(state.current * staleShow * .92);
        }
        if (prompt.link) {
          prompt.link.points([x(historical[index]), historyY + 4, px, currentY - 4]);
          var baseLink = prompt.favored ? mix(.38, .18, gateApply) : .15;
          prompt.link.opacity(state.current * (prompt.becameStale ? mix(baseLink, .55, staleShow) : baseLink));
        }
        if (prompt.entropyBar) {
          var barH = entropy[index] * maxBarH * barGrow;
          prompt.entropyBar.setAttrs({
            y: entropyBaseY - barH,
            height: barH,
            opacity: entropyShow * mix(.5, prompt.verified ? .9 : (prompt.becameStale ? .45 : .28), gateApply)
          });
        }
        if (prompt.verifyLink) {
          var linkTop = mix(prompt.barTopY - 3, currentY + 6, gateApply);
          prompt.verifyLink.points([x(current[index]), prompt.barTopY - 3, x(current[index]), linkTop]);
          prompt.verifyLink.opacity(gateApply * .78);
        }
      });

      caption.text(state.verification >= .999 ? "Select current medium" :
        state.verification > 0 ? "Correct with prompt entropy" :
        state.shift >= .999 ? "History is stale" :
        state.current > 0 ? "Policy changes" : "Target medium difficulty");
    }
    render();
    return { timeline: timeline, render: render };
  }

  // https://arxiv.org/html/2505.11227v2 — co-development, not equal or perfect skills.
  function createPRM(options) {
    var K = options.Konva, gsap = options.gsap, root = options.root, theme = options.theme;
    var width = options.width, left = 43, right = width - 76, base = 127;
    var ui = primitives(K, root, theme);
    var state = { training: 0, judge: 0, labels: 0, conclusion: 0, hold: 0 };
    function x(u) { return mix(left, right, u); }
    function solving(u) { return base - (.06 + .87 * (1 - Math.exp(-2.3 * u)) / (1 - Math.exp(-2.3))) * 90; }
    function judging(u) { return base - (.025 + .60 * (1 - Math.exp(-5 * u)) / (1 - Math.exp(-5))) * 90; }

    ui.line([left, base, right + 5, base]);
    ui.arrow([left, base, left, 25], { stroke: theme.muted, fill: theme.muted, opacity: .6 });
    ui.label("Capability", 20, 79, { align: "center", rotation: -90 });
    for (var tick = 0; tick <= 4; tick++) ui.line([x(tick / 4), base, x(tick / 4), base + 3]);
    var traces = new K.Group({ listening: false, clipX: left, clipY: 22,
      clipWidth: 0, clipHeight: base - 22 });
    root.add(traces);
    var plot = primitives(K, traces, theme);
    var solvePoints = [], judgePoints = [];
    for (var i = 0; i <= 100; i++) {
      solvePoints.push(x(i / 100), solving(i / 100));
      judgePoints.push(x(i / 100), judging(i / 100));
    }
    plot.line(solvePoints, { name: "solve-trace", stroke: theme.ink, strokeWidth: 1.8 });
    var judgeTrace = plot.line(judgePoints, { name: "judge-trace", stroke: theme.accent, strokeWidth: 1.8, dash: [4, 3] });
    var checkpoint = ui.line([left, base, left, base], { dash: [2, 4], opacity: .35 });
    var solveDot = ui.dot(left, solving(0), { name: "solve-tip", fill: theme.ink });
    var judgeDot = ui.dot(left, judging(0), { name: "judge-tip", opacity: 0 });
    var solveLabel = ui.label("Solve", left + 12, solving(0), { fontStyle: "600", fill: theme.ink, fontSize: 11, opacity: 0 });
    var judgeLabel = ui.label("Judge", left + 12, judging(0), { fontStyle: "600", fill: theme.accent, fontSize: 11, opacity: 0 });
    ui.label("Outcome-only RL", left, 146);

    var timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } })
      .addLabel("train", .55)
      .to(state, { training: 1, duration: 4.3, ease: "none" }, "train")
      .to(state, { labels: 1, duration: .2 }, "train")
      .to(state, { judge: 1, duration: .65 }, "train+=.12")
      .addLabel("capabilities", 4.1)
      .addLabel("conclusion", 4.95)
      .to(state, { conclusion: 1, duration: .6 }, "conclusion")
      .to(state, { hold: 1, duration: 1.25 }, 5.55);

    function render() {
      traces.clipWidth((right - left) * state.training + .01);
      judgeTrace.opacity(state.judge);
      var solveY = solving(state.training), judgeY = judging(state.training);
      var labelPad = Math.max(0, (16 - (judgeY - solveY)) / 2);
      solveDot.position({ x: x(state.training), y: solveY });
      judgeDot.position({ x: x(state.training), y: judgeY });
      judgeDot.opacity(state.judge);
      checkpoint.points([x(state.training), base, x(state.training), Math.min(solveY, judgeY)]);
      checkpoint.opacity(.25 * (1 - state.conclusion));
      solveLabel.opacity(state.labels);
      judgeLabel.opacity(state.judge);
      solveLabel.position({ x: x(state.training) + 12, y: solveY - labelPad });
      judgeLabel.position({ x: x(state.training) + 12, y: judgeY + labelPad });
    }
    render();
    return { timeline: timeline, render: render };
  }

  // https://arxiv.org/html/2606.02388v1 — one rollout supplies both aligned losses.
  function createPaW(options) {
    var K = options.Konva, gsap = options.gsap, root = options.root, theme = options.theme;
    var width = options.width, ui = primitives(K, root, theme), left = 20, right = width - 20, wide = width >= 460;
    var state = { rollout: 0, policy: 0, world: 0, joint: 0, hold: 0 };
    var tokensRight = right - (wide ? 90 : 0), weights = [1.24, 1.04, 1.24, 1.04, .42, 1.24];
    var labels = ["Obs 0", "Act 0", "Obs 1", "Act 1", "…", "Obs T"], kinds = ["obs", "act", "obs", "act", "ellipsis", "obs"];
    var policyY = 26, trajectoryY = 68, worldY = 116, laneH = 25, tokenH = 32, gap = width < 340 ? 3 : 5;
    var total = weights.reduce(function (sum, value) { return sum + value; }, 0), usable = tokensRight - left - gap * 5, cursor = left;
    var clay = "#bd6548", claySoft = "#efd9ce", blue = "#4d8ea2", blueSoft = "#d9e9ed", maskFill = "#e7e2da";
    function reveal(progress, index) { return Math.max(0, Math.min(1, (progress - index * .12) / .36)); }
    function flame(x, y, size, name) {
      var outer = ui.line([x, y + size * .56, x - size * .52, y + size * .34, x - size * .48, y - size * .12,
        x - size * .13, y - size * .58, x - size * .10, y - size * .34, x + size * .10, y - size * .20,
        x + size * .13, y - size * .74, x + size * .59, y - size * .23, x + size * .55, y + size * .35, x, y + size * .56], {
        name: name, bezier: true, closed: true, fill: clay, strokeEnabled: false, opacity: 0
      });
      var inner = ui.line([x, y + size * .38, x - size * .22, y + size * .22, x - size * .16, y - size * .04,
        x + size * .04, y - size * .29, x + size * .26, y - size * .02, x + size * .24, y + size * .25, x, y + size * .38], {
        bezier: true, closed: true, fill: "#f5eee6", strokeEnabled: false, opacity: 0
      });
      return { outer: outer, inner: inner };
    }
    function masked(x, y, cellWidth, name) {
      var inset = Math.min(2, cellWidth * .04), box = ui.rect(x + inset, y + 2, cellWidth - inset * 2, laneH - 4, {
        name: name, cornerRadius: 5, fill: maskFill, stroke: theme.rule, opacity: 0
      });
      var text = ui.label("Mask", x + cellWidth / 2, y + laneH / 2, { align: "center", fontSize: width < 340 ? 9.5 : 10, fill: theme.muted, opacity: 0 });
      return { box: box, text: text };
    }
    var cells = weights.map(function (weight, index) {
      var cellWidth = usable * weight / total, x = cursor, kind = kinds[index];
      cursor += cellWidth + gap;
      var token = kind === "ellipsis" ? null : ui.rect(x, trajectoryY, cellWidth, tokenH, {
        name: "trajectory-" + index, cornerRadius: 6, fill: kind === "obs" ? blueSoft : claySoft,
        stroke: kind === "obs" ? "rgba(77,142,162,.30)" : "rgba(189,101,72,.32)", opacity: 0
      });
      var tokenText = ui.label(labels[index], x + cellWidth / 2, trajectoryY + tokenH / 2, {
        name: "trajectory-label-" + index, align: "center", fontSize: width < 340 ? 9.5 : 10.5, fontStyle: "600",
        fill: kind === "obs" ? blue : kind === "act" ? clay : theme.muted, opacity: 0
      });
      return { x: x, width: cellWidth, kind: kind, token: token, tokenText: tokenText };
    });
    var policyOutline = ui.rect(left - 2, policyY - 1, tokensRight - left + 4, laneH + 2, {
      name: "policy-lane", cornerRadius: 6, fillEnabled: false, dash: [4, 3], stroke: clay, opacity: 0
    });
    var worldOutline = ui.rect(left - 2, worldY - 1, tokensRight - left + 4, laneH + 2, {
      name: "world-lane", cornerRadius: 6, fillEnabled: false, dash: [4, 3], stroke: blue, opacity: 0
    });
    var policyTitle = ui.label("Policy loss", left, 13, { fontSize: 9.5, fontStyle: "600", fill: clay, opacity: 0 });
    var worldTitle = ui.label("World modeling loss", left, 157, { fontSize: 9.5, fontStyle: "600", fill: blue, opacity: 0 });
    var policyNodes = cells.map(function (cell, index) {
      if (cell.kind === "ellipsis") return { text: ui.label("…", cell.x + cell.width / 2, policyY + laneH / 2, { align: "center", fontSize: 10, fill: theme.muted, opacity: 0 }) };
      if (cell.kind === "act") return { flame: flame(cell.x + cell.width / 2, policyY + laneH / 2 + 1, width < 340 ? 9 : 10, "policy-train-" + index) };
      return { mask: masked(cell.x, policyY, cell.width, "policy-mask-" + index) };
    });
    var prefixWidth = cells[1].x + cells[1].width - cells[0].x;
    var worldPrefix = masked(cells[0].x, worldY, prefixWidth, "world-prefix-mask");
    var worldNodes = cells.map(function (cell, index) {
      if (index < 2) return null;
      if (cell.kind === "ellipsis") return { text: ui.label("…", cell.x + cell.width / 2, worldY + laneH / 2, { align: "center", fontSize: 10, fill: theme.muted, opacity: 0 }) };
      if (cell.kind === "obs") return { flame: flame(cell.x + cell.width / 2, worldY + laneH / 2 + 1, width < 340 ? 9 : 10, "world-train-" + index) };
      return { mask: masked(cell.x, worldY, cell.width, "world-mask-" + index) };
    });
    var compactFooter = !wide ? ui.label("Shared policy", left, 179, { fontSize: 9, fontStyle: "600", fill: theme.muted, opacity: 0 }) : null;
    var jointLines = [], jointBar, sharedLabel, updateLabel;
    if (wide) {
      var updateX = tokensRight + 18, updateY = 84;
      jointLines = [
        ui.line([tokensRight + 4, policyY + laneH / 2, tokensRight + 30, policyY + laneH / 2, updateX - 24, updateY, updateX - 4, updateY], { name: "policy-update-link", bezier: true, stroke: clay, opacity: 0 }),
        ui.line([tokensRight + 4, worldY + laneH / 2, tokensRight + 30, worldY + laneH / 2, updateX - 24, updateY, updateX - 4, updateY], { name: "world-update-link", bezier: true, stroke: blue, opacity: 0 })
      ];
      jointBar = ui.line([updateX, updateY - 12, updateX, updateY + 12], { name: "shared-policy-bar", stroke: theme.ink, strokeWidth: 1.5, opacity: 0 });
      sharedLabel = ui.label("Shared", updateX + 10, updateY - 7, { fontSize: 9, fontStyle: "600", fill: theme.muted, opacity: 0 });
      updateLabel = ui.label("policy update", updateX + 10, updateY + 7, { fontSize: 9, fontStyle: "600", fill: theme.ink, opacity: 0 });
    }
    var timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } })
      .addLabel("rollout", .1).to(state, { rollout: 1, duration: 1.4 }, "rollout")
      .addLabel("policy-loss", 1.6).to(state, { policy: 1, duration: 1.6 }, "policy-loss")
      .addLabel("world-modeling", 3.5).to(state, { world: 1, duration: 1.6 }, "world-modeling")
      .addLabel("shared-update", 5.4).to(state, { joint: 1, duration: .9 }, "shared-update")
      .to(state, { hold: 1, duration: .9 }, 6.3);
    function render() {
      cells.forEach(function (cell, index) {
        var tokenOpacity = reveal(state.rollout, index);
        if (cell.token) cell.token.opacity(tokenOpacity);
        cell.tokenText.opacity(tokenOpacity);
        var policyOpacity = reveal(state.policy, index), policyNode = policyNodes[index];
        if (policyNode.text) policyNode.text.opacity(policyOpacity);
        if (policyNode.mask) { policyNode.mask.box.opacity(policyOpacity); policyNode.mask.text.opacity(policyOpacity); }
        if (policyNode.flame) { policyNode.flame.outer.opacity(policyOpacity); policyNode.flame.inner.opacity(policyOpacity * .72); }
        if (index >= 2) {
          var worldOpacity = reveal(state.world, index - 2), worldNode = worldNodes[index];
          if (worldNode.text) worldNode.text.opacity(worldOpacity);
          if (worldNode.mask) { worldNode.mask.box.opacity(worldOpacity); worldNode.mask.text.opacity(worldOpacity); }
          if (worldNode.flame) { worldNode.flame.outer.opacity(worldOpacity); worldNode.flame.inner.opacity(worldOpacity * .72); }
        }
      });
      policyOutline.opacity(state.policy * .62); policyTitle.opacity(state.policy);
      worldOutline.opacity(state.world * .62); worldTitle.opacity(state.world);
      worldPrefix.box.opacity(reveal(state.world, 0)); worldPrefix.text.opacity(reveal(state.world, 0));
      if (compactFooter) compactFooter.opacity(state.joint);
      jointLines.forEach(function (line) { line.opacity(state.joint * .7); });
      if (jointBar) jointBar.opacity(state.joint);
      if (sharedLabel) sharedLabel.opacity(state.joint);
      if (updateLabel) updateLabel.opacity(state.joint);
    }
    render();
    return { timeline: timeline, render: render };
  }

  // https://arxiv.org/html/2505.12038 — selection preserves useful delta while reducing loss.
  function createSafeDelta(options) {
    var K = options.Konva, gsap = options.gsap, root = options.root, theme = options.theme;
    var width = options.width, ui = primitives(K, root, theme), left = 24, right = width - 24;
    var state = { sft: 0, selection: 0, hold: 0 };
    var compact = width < 340, cellSize = compact ? 22 : 28, gap = compact ? 4 : 7;
    var gridWidth = cellSize * 4 + gap * 3, gridX = compact ? 20 : 24, gridY = 99 - gridWidth / 2;
    var utility = [.92, .55, .78, .88, .43, .81, .96, .63, .72, .90, .57, .84, .38, .76, .68, .86];
    var safety = [.18, .22, .62, .31, .15, .27, .58, .20, .41, .19, .71, .34, .12, .29, .45, .25];
    var greedyOrder = [0, 9, 15, 5, 3], rankByIndex = {};
    greedyOrder.forEach(function (index, rank) { rankByIndex[index] = rank; });
    var blue = theme.accent, red = "#a26057", cells = utility.map(function (value, index) {
      var column = index % 4, row = Math.floor(index / 4), x = gridX + column * (cellSize + gap), y = gridY + row * (cellSize + gap);
      var innerHeight = cellSize - 8, innerWidth = (cellSize - 11) / 2, bottom = y + cellSize - 4;
      var surface = ui.rect(x, y, cellSize, cellSize, { name: "delta-cell-" + index, cornerRadius: 5,
        fill: "rgba(255,255,255,.62)", stroke: theme.rule, opacity: 0 });
      var utilityBar = ui.rect(x + 4, bottom, innerWidth, 0, { name: "delta-utility-" + index,
        fill: blue, strokeEnabled: false, opacity: 0 });
      var safetyBar = ui.rect(x + cellSize - 4 - innerWidth, bottom, innerWidth, 0, { name: "delta-safety-" + index,
        fill: red, strokeEnabled: false, opacity: 0 });
      var outline = ui.rect(x, y, cellSize, cellSize, { name: "delta-outline-" + index,
        cornerRadius: 5, fillEnabled: false, stroke: blue, strokeWidth: 2, opacity: 0 });
      return { surface: surface, utility: utilityBar, safety: safetyBar, outline: outline,
        bottom: bottom, innerHeight: innerHeight, rank: rankByIndex[index] };
    });
    ui.label("ΔW", gridX, 18, { fontSize: 10, fontStyle: "600", fill: theme.ink });
    ui.label("SFT", gridX + 26, 18, { fontSize: 9.5, fill: theme.muted });
    var chartLeft = gridX + gridWidth + 16, chartRight = right, chartSpan = chartRight - chartLeft;
    var utilityX = chartLeft + chartSpan * .22, safetyX = chartLeft + chartSpan * .78, barWidth = Math.max(18, Math.min(26, chartSpan * .22)), bottom = 147;
    ui.label("Utility", utilityX, 31, { align: "center", fontSize: 9.5, fontStyle: "600", fill: blue });
    ui.label("Safety loss", safetyX, 31, { align: "center", fontSize: 9.5, fontStyle: "600", fill: red });
    var utilityGhost = ui.rect(utilityX - barWidth / 2, bottom - 84, barWidth, 84, { name: "utility-sft-ghost",
      fill: "rgba(69,107,131,.08)", stroke: blue, strokeWidth: .8, opacity: 0 });
    var safetyGhost = ui.rect(safetyX - barWidth / 2, bottom - 67, barWidth, 67, { name: "safety-loss-sft-ghost",
      fill: "rgba(162,96,87,.06)", stroke: red, strokeWidth: .8, opacity: 0 });
    var utilityBar = ui.rect(utilityX - barWidth / 2, bottom - 18, barWidth, 18, { name: "utility-bar", fill: blue, strokeEnabled: false });
    var safetyBar = ui.rect(safetyX - barWidth / 2, bottom - 8, barWidth, 8, { name: "safety-loss-bar", fill: red, strokeEnabled: false });
    var stageCaption = ui.label("Base", (chartLeft + chartRight) / 2, 167, { name: "safe-delta-stage", align: "center", fontSize: 9.5, fill: theme.muted });
    var timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } })
      .addLabel("sft", .15).to(state, { sft: 1, duration: 1.7 }, "sft")
      .addLabel("selection", 2.2).to(state, { selection: 1, duration: 1.7 }, "selection")
      .to(state, { hold: 1, duration: 1.35 }, 4.2);
    function render() {
      cells.forEach(function (cell, index) {
        var selected = cell.rank !== undefined, fade = selected ? 1 : mix(1, .42, state.selection);
        var utilityHeight = cell.innerHeight * utility[index] * state.sft;
        var safetyHeight = cell.innerHeight * safety[index] * state.sft;
        var selectOpacity = selected ? Math.max(0, Math.min(1, state.selection * greedyOrder.length - cell.rank)) : 0;
        cell.surface.opacity(state.sft * fade);
        cell.utility.setAttrs({ y: cell.bottom - utilityHeight, height: utilityHeight, opacity: state.sft * fade });
        cell.safety.setAttrs({ y: cell.bottom - safetyHeight, height: safetyHeight, opacity: state.sft * fade });
        cell.outline.opacity(selectOpacity);
      });
      var utilityHeight = mix(18, 84, state.sft);
      var safetyHeight = mix(mix(8, 67, state.sft), 16, state.selection);
      utilityBar.setAttrs({ y: bottom - utilityHeight, height: utilityHeight });
      safetyBar.setAttrs({ y: bottom - safetyHeight, height: safetyHeight });
      utilityGhost.opacity(state.selection * .18);
      safetyGhost.opacity(state.selection * .18);
      stageCaption.text(state.selection >= .999 ? "Safe Delta" : state.selection > 0 ? "Select" : state.sft > 0 ? "SFT" : "Base");
      stageCaption.offsetX(stageCaption.width() / 2);
    }
    render();
    return { timeline: timeline, render: render };
  }

  // https://arxiv.org/html/2305.10847 — SICO-Gen optimizes one example, then reuses it.
  function createSICO(options) {
    var K = options.Konva, gsap = options.gsap, root = options.root, theme = options.theme;
    var width = options.width, ui = primitives(K, root, theme), left = 18, right = width - 18, span = right - left;
    var state = { example: 0, detector: 0, optimize: 0, reuse: 0, llm: 0, output: 0, hold: 0 };
    var coralRgb = [224, 114, 96], amberRgb = [226, 179, 97], tealRgb = [98, 184, 158];
    var coral = "rgb(224,114,96)", teal = "rgb(98,184,158)", inputBlue = "rgb(132,172,208)", cardFill = "rgba(255,255,255,.055)";
    function mixRgb(a, b, t) {
      var u = Math.max(0, Math.min(1, t));
      return "rgb(" + Math.round(mix(a[0], b[0], u)) + "," + Math.round(mix(a[1], b[1], u)) + "," + Math.round(mix(a[2], b[2], u)) + ")";
    }
    function smooth(t) { var u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); }

    var exampleWidth = Math.round(Math.min(260, Math.max(88, span * .43))), exampleLeft = left, exampleRight = exampleLeft + exampleWidth;
    var detectorWidth = Math.round(Math.min(210, Math.max(76, span * .34))), detectorLeft = right - detectorWidth;
    var exampleLabel = ui.label("Example", exampleLeft, 15, { fontSize: 9.5, fontStyle: "600", fill: theme.ink, opacity: 0 });
    var exampleCard = ui.rect(exampleLeft, 26, exampleWidth, 38, { name: "example-card", cornerRadius: 6, fill: cardFill, opacity: 0 });
    var strokeFractions = [.78, .90, .82], editStarts = [.44, .18, .50], editLengths = [.16, .50, .16];
    var exampleContentX = exampleLeft + 10, exampleContentW = exampleWidth - 20;
    var exampleStrokes = strokeFractions.map(function (fraction, index) {
      var y = 35 + index * 10;
      return ui.line([exampleContentX, y, exampleContentX + exampleContentW * fraction, y], {
        name: "example-stroke-" + index, stroke: theme.muted, strokeWidth: 1.2, opacity: 0
      });
    });
    var exampleCues = [0, 1, 2].map(function (index) {
      var y = 35 + index * 10, start = exampleContentX + exampleContentW * editStarts[index];
      return ui.line([start, y, start + exampleContentW * editLengths[index], y], {
        name: "example-cue-" + index, stroke: coral, strokeWidth: 1.9, opacity: 0
      });
    });
    var edits = [0, 1, 2].map(function (index) {
      var y = 35 + index * 10, start = exampleContentX + exampleContentW * editStarts[index];
      return ui.line([start, y, start, y], { name: "example-edit-" + index, stroke: theme.accent, strokeWidth: 2, opacity: 0 });
    });

    var forward = ui.arrow([exampleRight + 5, 45, detectorLeft - 6, 45], {
      name: "example-to-detector", stroke: theme.rule, fill: theme.rule, opacity: 0
    });
    var detectorLabel = ui.label("Detector", detectorLeft, 15, { fontSize: 9.5, fontStyle: "600", fill: theme.ink, opacity: 0 });
    var scoreLabel = ui.label("AI score", detectorLeft, 34, { fontSize: 9.5, fill: theme.muted, opacity: 0 });
    var meterX0 = detectorLeft, meterX1 = right, meterW = meterX1 - meterX0, meterY = 51, threshold = .45, baseScore = .86;
    var meterBase = ui.line([meterX0, meterY, meterX1, meterY], { name: "ai-score-meter", stroke: theme.rule, strokeWidth: 1.3, opacity: 0 });
    var meterGhost = ui.line([meterX0, meterY, meterX0 + meterW * baseScore, meterY], { name: "ai-score-ghost", stroke: coral, strokeWidth: 2, opacity: 0 });
    var threshX = meterX0 + meterW * threshold;
    var meterThreshold = ui.line([threshX, meterY - 5, threshX, meterY + 5], {
      name: "ai-score-threshold", stroke: theme.muted, strokeWidth: 1, dash: [2, 2], opacity: 0
    });
    var meterFill = ui.line([meterX0, meterY, meterX0, meterY], { name: "ai-score-fill", stroke: coral, strokeWidth: 2.4, opacity: 0 });
    var meterTip = ui.dot(meterX0, meterY, { name: "ai-score-tip", radius: 2.6, fill: coral, opacity: 0 });

    var feedbackReturnX = exampleRight - 14, feedbackLeaveX = detectorLeft + 12;
    var feedback = ui.arrow([feedbackLeaveX, 62, feedbackLeaveX, 80, feedbackReturnX, 80, feedbackReturnX, 67], {
      name: "detector-feedback", stroke: theme.accent, fill: theme.accent, opacity: 0
    });
    var rewrite = ui.label("Rewrite", (feedbackReturnX + feedbackLeaveX) / 2, 70, {
      name: "rewrite-label", align: "center", fontSize: 9.5, fill: theme.accent, opacity: 0
    });

    var arrowGap = Math.round(Math.max(14, Math.min(28, span * .07)));
    var llmW = Math.round(Math.max(32, Math.min(46, span * .11)));
    var usableBottom = span - llmW - arrowGap * 2;
    var promptWidth = Math.round(usableBottom * .54), promptLeft = left, promptRight = promptLeft + promptWidth;
    var textWidth = usableBottom - promptWidth, textLeft = right - textWidth;
    var llmX = promptRight + arrowGap + llmW / 2;

    var transferX = exampleLeft + Math.min(24, Math.round(exampleWidth * .22));
    var transfer = ui.arrow([transferX, 66, transferX, 66], { name: "example-transfer", stroke: theme.accent, fill: theme.accent, opacity: 0 });
    var promptLabel = ui.label("Prompt", promptLeft, 101, { fontSize: 9.5, fontStyle: "600", fill: theme.ink, opacity: 0 });
    var promptCard = ui.rect(promptLeft, 112, promptWidth, 44, { name: "prompt-card", cornerRadius: 6, fill: cardFill, opacity: 0 });
    var promptContentX = promptLeft + 9, promptContentW = promptWidth - 18;
    var promptStrokes = strokeFractions.map(function (fraction, index) {
      return ui.line([exampleContentX, 35 + index * 10, exampleContentX + exampleContentW * fraction, 35 + index * 10], {
        name: "prompt-example-" + index, stroke: theme.muted, strokeWidth: 1.15, opacity: 0
      });
    });
    var promptEdits = [0, 1, 2].map(function (index) {
      return ui.line([exampleContentX, 35 + index * 10, exampleContentX, 35 + index * 10], {
        name: "prompt-edit-" + index, stroke: theme.accent, strokeWidth: 1.9, opacity: 0
      });
    });
    var inputLabel = ui.label("Input", promptLeft + 9, 147, { fontSize: 9.5, fill: inputBlue, opacity: 0 });
    var inputStroke = ui.line([promptLeft + 38, 147, promptRight - 9, 147], {
      name: "prompt-input", stroke: inputBlue, strokeWidth: 1.35, opacity: 0
    });

    var promptArrow = ui.arrow([promptRight + 2, 134, llmX - llmW / 2 - 3, 134], {
      name: "prompt-to-llm", stroke: theme.rule, fill: theme.rule, opacity: 0
    });
    var llmCard = ui.rect(llmX - llmW / 2, 122, llmW, 24, { name: "llm-node", cornerRadius: 12, fill: cardFill, opacity: 0 });
    var llmLabel = ui.label("LLM", llmX, 134, { align: "center", fontSize: 9.5, fontStyle: "600", fill: theme.ink, opacity: 0 });

    var llmArrow = ui.arrow([llmX + llmW / 2 + 2, 134, textLeft - 3, 134], {
      name: "llm-to-text", stroke: theme.rule, fill: theme.rule, opacity: 0
    });
    var textLabel = ui.label("Text", textLeft, 106, { fontSize: 9.5, fontStyle: "600", fill: theme.ink, opacity: 0 });
    var textCard = ui.rect(textLeft, 117, textWidth, 34, { name: "text-card", cornerRadius: 6, fill: cardFill, opacity: 0 });
    var textContentX = textLeft + 9, textContentW = textWidth - 18;
    var textLines = [.74, .88, .62].map(function (fraction, index) {
      var y = 126 + index * 8;
      return ui.line([textContentX, y, textContentX + textContentW * fraction, y], {
        name: "new-text-" + index, stroke: theme.ink, strokeWidth: 1.2, opacity: 0
      });
    });
    var textMeterX0 = textLeft + 30, textMeterW = Math.max(22, textWidth - 30), textMeterY = 106;
    var textScoreBase = ui.line([textMeterX0, textMeterY, textMeterX0 + textMeterW, textMeterY], {
      name: "text-score-meter", stroke: theme.rule, strokeWidth: 1.2, opacity: 0
    });
    var textThreshX = textMeterX0 + textMeterW * threshold;
    var textScoreThreshold = ui.line([textThreshX, textMeterY - 3, textThreshX, textMeterY + 3], {
      name: "text-score-threshold", stroke: theme.muted, strokeWidth: 1, dash: [2, 2], opacity: 0
    });
    var textScoreFill = ui.line([textMeterX0, textMeterY, textMeterX0, textMeterY], {
      name: "text-score-fill", stroke: teal, strokeWidth: 2.2, opacity: 0
    });

    var caption = ui.label("Unoptimized example", left, 174, { name: "sico-caption", fontSize: 9.5, fill: theme.muted });

    var timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } })
      .addLabel("example", .1).to(state, { example: 1, duration: .65 }, "example")
      .addLabel("detector", .85).to(state, { detector: 1, duration: .5 }, "detector")
      .addLabel("rewrite", 1.5).to(state, { optimize: 1, duration: 2.1, ease: "none" }, "rewrite")
      .addLabel("reuse", 3.75).to(state, { reuse: 1, duration: .75 }, "reuse")
      .addLabel("llm", 4.65).to(state, { llm: 1, duration: .55 }, "llm")
      .addLabel("text", 5.35).to(state, { output: 1, duration: .65 }, "text")
      .to(state, { hold: 1, duration: .95 }, 6.0);

    function render() {
      var loopOpacity = mix(1, .78, state.reuse), pathOpacity = mix(1, .55, state.reuse);
      var steps = [0, 1, 2].map(function (index) { return smooth(state.optimize * 3 - index); });
      var scoreValue = baseScore - (.24 * steps[0] + .28 * steps[1] + .16 * steps[2]);
      var scoreEnd = meterX0 + meterW * scoreValue;
      var scoreColor = scoreValue > threshold
        ? mixRgb(coralRgb, amberRgb, (baseScore - scoreValue) / (baseScore - threshold))
        : mixRgb(amberRgb, tealRgb, (threshold - scoreValue) / (threshold - .18));

      exampleCard.opacity(state.example * loopOpacity);
      exampleLabel.opacity(state.example * loopOpacity);
      exampleStrokes.forEach(function (stroke) { stroke.opacity(state.example * loopOpacity); });
      [0, 1, 2].forEach(function (index) {
        var y = 35 + index * 10, start = exampleContentX + exampleContentW * editStarts[index];
        var end = start + exampleContentW * editLengths[index], t = steps[index];
        exampleCues[index].opacity(state.example * mix(1, .16, t) * loopOpacity);
        edits[index].points([start, y, mix(start, end, t), y]);
        edits[index].opacity((t > 0 ? Math.min(1, t * 3) : 0) * loopOpacity);
      });

      forward.opacity(state.detector * pathOpacity);
      detectorLabel.opacity(state.detector * loopOpacity);
      scoreLabel.opacity(state.detector * loopOpacity);
      meterBase.opacity(state.detector * loopOpacity);
      meterThreshold.opacity(state.detector * loopOpacity);
      meterGhost.opacity((state.optimize > 0 ? Math.min(1, state.optimize * 4) * .24 : 0) * loopOpacity);
      meterFill.points([meterX0, meterY, scoreEnd, meterY]);
      meterFill.stroke(scoreColor);
      meterFill.opacity(state.detector * loopOpacity);
      meterTip.position({ x: scoreEnd, y: meterY });
      meterTip.fill(scoreColor);
      meterTip.opacity(state.detector * loopOpacity);

      var optActive = state.optimize > 0 && state.optimize < 1;
      var pulse = optActive ? .55 + .45 * Math.sin(Math.PI * ((state.optimize * 3) % 1)) : 1;
      feedback.opacity((state.optimize > 0 ? Math.min(1, state.optimize * 5) : 0) * pulse * pathOpacity);
      rewrite.opacity((state.optimize > 0 ? Math.min(1, state.optimize * 5) : 0) * loopOpacity);

      var cardReveal = smooth(state.reuse * 2), moveT = smooth((state.reuse - .1) / .9), inputReveal = smooth((state.reuse - .45) / .55);
      transfer.points([transferX, 66, transferX, mix(66, 109, Math.min(1, state.reuse * 1.4))]);
      transfer.opacity(state.reuse > 0 ? Math.min(1, state.reuse * 3) : 0);
      promptLabel.opacity(cardReveal);
      promptCard.opacity(cardReveal);
      promptStrokes.forEach(function (stroke, index) {
        var x = mix(exampleContentX, promptContentX, moveT), y = mix(35 + index * 10, 120 + index * 7, moveT);
        var contentWidth = mix(exampleContentW, promptContentW, moveT);
        stroke.points([x, y, x + contentWidth * strokeFractions[index], y]);
        stroke.opacity(cardReveal);
        var editStart = x + contentWidth * editStarts[index], editLength = contentWidth * editLengths[index];
        promptEdits[index].points([editStart, y, editStart + editLength, y]);
        promptEdits[index].opacity(cardReveal * (steps[index] > 0 ? 1 : 0));
      });
      inputLabel.opacity(inputReveal);
      inputStroke.opacity(inputReveal);

      promptArrow.opacity(state.llm);
      llmCard.opacity(state.llm);
      llmCard.stroke(state.llm > 0 ? theme.accent : theme.rule);
      llmLabel.opacity(state.llm);

      var outT = smooth(state.output), outMeterReveal = smooth((state.output - .35) / .65);
      llmArrow.opacity(state.output);
      textLabel.opacity(outT);
      textCard.opacity(outT);
      textCard.stroke(state.output > .5 ? teal : theme.rule);
      textLines.forEach(function (line) { line.opacity(outT * .82); });
      textScoreBase.opacity(outMeterReveal);
      textScoreThreshold.opacity(outMeterReveal);
      textScoreFill.points([textMeterX0, textMeterY, textMeterX0 + textMeterW * .18 * outMeterReveal, textMeterY]);
      textScoreFill.opacity(outMeterReveal);

      caption.text(state.output >= .999 ? "Evades detection directly" :
        state.llm > 0 ? "Guide LLM on new input" :
        state.reuse > 0 ? "Reuse optimized example" :
        state.optimize > 0 ? "Rewrite surface, keep meaning" :
        state.detector > 0 ? "Flagged: high AI score" : "Unoptimized example");
    }
    render();
    return { timeline: timeline, render: render };
  }

  return { hive: { create: createHIVE }, prm: { create: createPRM }, paw: { create: createPaW },
    "safe-delta": { create: createSafeDelta }, sico: { create: createSICO } };
}));
