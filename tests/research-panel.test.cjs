const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { gsap } = require('../assets/js/vendor/gsap/gsap.min.js');
const createResearchPanel = require('../assets/js/research-panel.js');
const scenes = require('../assets/js/research-scenes.js');

class Events {
  constructor() { this.handlers = new Map(); }
  addEventListener(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
  }
  removeEventListener(name, fn) { this.handlers.get(name)?.delete(fn); }
  emit(name, event = {}) { this.handlers.get(name)?.forEach(fn => fn(event)); }
}

// DOM and drawing boundary only; all timing, seeking and interpolation use real GSAP.
class Node {
  constructor(attrs = {}) { this.attrs = { ...attrs }; this.children = []; this.content = { setAttribute() {} }; }
  add(node) { this.children.push(node); }
  setAttrs(attrs) { Object.assign(this.attrs, attrs); }
  position(attrs) { this.setAttrs(attrs); }
  size(attrs) { this.setAttrs(attrs); }
  width() { return this.attrs.width ?? this.attrs.text?.length * this.attrs.fontSize * .52 ?? 0; }
  getCanvas() { return { setPixelRatio: ratio => { this.pixelRatio = ratio; } }; }
  destroyChildren() { this.children.forEach(n => n.destroy()); this.children = []; }
  destroy() { this.destroyed = true; this.destroyChildren(); }
}
for (const key of ['x', 'y', 'opacity', 'points', 'stroke', 'fill', 'offsetX', 'offsetY', 'clipWidth', 'text']) {
  Node.prototype[key] = function (value) {
    if (value === undefined) return this.attrs[key];
    this.attrs[key] = value;
    return this;
  };
}
const Konva = Object.fromEntries(['Stage', 'Layer', 'Group', 'Line', 'Arrow', 'Text', 'Circle', 'Rect'].map(k => [k, Node]));

let registry;
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/research-demos.js'), 'utf8'), {
  window: { ResearchScenes: scenes, ResearchPanel: { mountAll(renderers) { registry = renderers; } } }
});

function setup({ reduced = false, dpr = 2, types = ['hive', 'prm', 'paw'], width = 468 } = {}) {
  const document = new Events();
  const motion = Object.assign(new Events(), { matches: reduced });
  const canvases = [];
  document.createElement = () => {
    const transforms = [];
    const ctx = new Proxy({ transforms, setTransform: (...v) => transforms.push(v), globalAlpha: 1 }, {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => args.filter(v => typeof v === 'number').forEach(v => assert.ok(Number.isFinite(v), key));
      }
    });
    const canvas = { setAttribute() {}, getContext: () => ctx, remove() { this.removed = true; }, ctx };
    canvases.push(canvas);
    return canvas;
  };
  const views = types.map(type => {
    const replay = Object.assign(new Events(), { hidden: false });
    const classes = new Set();
    const wrapper = {
      querySelector: () => replay,
      classList: {
        add: (...names) => names.forEach(n => classes.add(n)),
        remove: (...names) => names.forEach(n => classes.delete(n)),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name)
      }
    };
    const rect = { left: 10, width, height: 204 };
    const viewport = Object.assign(new Events(), {
      closest: () => wrapper,
      getAttribute: name => name === 'data-research-viz' ? type : viewport[name],
      setAttribute: (name, value) => { viewport[name] = value; },
      appendChild() {}, getBoundingClientRect: () => rect
    });
    return { viewport, replay, classes, rect, type };
  });
  document.hidden = false;
  document.querySelectorAll = () => views.map(p => p.viewport);
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(isIntersecting) { this.callback([{ target: this.target, isIntersecting }]); }
  }
  const window = Object.assign(new Events(), {
    document, gsap, Konva, devicePixelRatio: dpr, matchMedia: () => motion,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    IntersectionObserver: Observer, ResizeObserver: Observer
  });
  const Panel = createResearchPanel(window);
  const instances = Panel.mountAll(registry);
  gsap.ticker.sleep();
  function advance(ms) {
    instances.forEach(p => {
      if (p.timeline && !p.timeline.paused()) p.timeline.totalTime(p.timeline.totalTime() + ms / 1000);
    });
    gsap.ticker.sleep();
  }
  function cleanup() { instances.forEach(p => p.destroy()); gsap.ticker.sleep(); }
  return { Panel, window, instances, views, canvases, motion, document, advance, cleanup };
}

function allNodes(root) { return [root, ...root.children.flatMap(allNodes)]; }
function mark(panel, name) { return allNodes(panel.group).find(n => n.attrs.name === name); }
function textMark(panel, words) { return allNodes(panel.group).find(n => n.attrs.text === words); }
function assertNear(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`); }

// Keep each test's timelines detached so subsequent tests cannot advance them.
test('five Konva scenes share the panel controller', t => {
  const env = setup({ types: ['hive', 'prm', 'paw', 'safe-delta', 'sico'] }); t.after(env.cleanup);
  assert.equal(env.instances.length, 5);
  assert.deepEqual(env.views.map(p => p.viewport['data-renderer']), ['konva', 'konva', 'konva', 'konva', 'konva']);
  for (const p of env.instances) {
    assert.equal(p.stage.children.length, 1);
    assert.equal(p.layer.attrs.listening, false);
    assert.equal(p.layer.pixelRatio, 2);
    assert.equal(p.timeline.paused(), true);
  }
  env.instances.forEach(p => p.intersectionObserver.trigger(true));
  env.advance(10000);
  assert.ok(env.instances.every(p => p.finished && p.timeline.paused()));
});

test('Replay resets only its own timeline and does not accumulate nodes', t => {
  const env = setup(); t.after(env.cleanup);
  env.instances.forEach(p => p.intersectionObserver.trigger(true)); env.advance(10000);
  const count = allNodes(env.instances[0].group).length;
  for (let i = 0; i < 3; i++) {
    env.views[0].replay.emit('click');
    assert.deepEqual(env.instances.map(p => p.progress()), [0, 1, 1]);
    assert.equal(allNodes(env.instances[0].group).length, count);
    env.advance(3400); assertNear(env.instances[0].progress(), .5);
    env.advance(3400); assert.equal(env.instances[0].finished, true);
  }
});

test('offscreen and background time do not skip the story', t => {
  const env = setup(); t.after(env.cleanup); const p = env.instances[0];
  p.intersectionObserver.trigger(true); env.advance(1000);
  const progress = p.progress();
  p.intersectionObserver.trigger(false); env.advance(20000);
  assert.equal(p.progress(), progress); assert.equal(p.timeline.paused(), true);
  p.intersectionObserver.trigger(true); env.advance(1000);
  assertNear(p.progress(), 2 / 6.8);
  env.document.hidden = true; env.document.emit('visibilitychange'); env.advance(20000);
  assertNear(p.progress(), 2 / 6.8);
  env.document.hidden = false; env.document.emit('visibilitychange'); env.advance(1000);
  assertNear(p.progress(), 3 / 6.8);
});

test('finished panels stay paused when re-entering the viewport', t => {
  const env = setup(); t.after(env.cleanup); const p = env.instances[0];
  p.intersectionObserver.trigger(true); env.advance(10000);
  p.intersectionObserver.trigger(false); p.intersectionObserver.trigger(true);
  assert.equal(p.progress(), 1); assert.equal(p.timeline.paused(), true);
});

test('reduced motion renders the final scene and responds to live preference changes', t => {
  const env = setup({ reduced: true }); t.after(env.cleanup);
  assert.ok(env.instances.every(p => p.progress() === 1 && p.timeline.paused()));
  assert.equal(textMark(env.instances[1], 'Judge').opacity(), 1);
  assert.ok(env.views.every(v => v.replay.hidden));
  env.motion.matches = false; env.motion.emit('change');
  env.instances.forEach(p => p.intersectionObserver.trigger(true));
  assert.ok(env.instances.every(p => p.timeline.paused()));
  env.views[0].replay.emit('click'); env.advance(1000);
  env.motion.matches = true; env.motion.emit('change');
  assert.ok(env.instances.every(p => p.progress() === 1 && p.timeline.paused()));
});

test('backward scrub is deterministic and pointer cancellation restores the conclusion', t => {
  const env = setup(); t.after(env.cleanup);
  const p = env.instances[0], view = env.views[0];
  p.intersectionObserver.trigger(true); env.advance(1000);
  view.viewport.emit('pointermove', { clientX: 127 }); assert.equal(p.scrubProgress, null);
  env.advance(10000);
  const scrub = progress => view.viewport.emit('pointermove', { clientX: 10 + 468 * progress });
  scrub(.6); const expected = JSON.stringify(allNodes(p.group).map(n => n.attrs));
  scrub(1); scrub(.1); scrub(.6);
  assert.equal(JSON.stringify(allNodes(p.group).map(n => n.attrs)), expected);
  assert.equal(p.timeline.paused(), true);
  view.viewport.emit('pointercancel'); assert.equal(p.progress(), 1);
  scrub(.5); view.replay.emit('click');
  assert.equal(p.progress(), 0); assert.equal(view.classes.has('is-scrubbing'), false);
});

test('resize restores animation progress, caps DPR and releases the old scene', t => {
  const env = setup({ dpr: 3 }); t.after(env.cleanup);
  const p = env.instances[0], view = env.views[0];
  p.intersectionObserver.trigger(true); env.advance(3400);
  const oldTimeline = p.timeline, oldMarks = [...p.group.children];
  view.rect.width = 276; view.rect.height = 188; p.resizeObserver.trigger();
  assertNear(p.progress(), .5); assert.equal(p.timeline.paused(), false);
  assert.equal(oldTimeline.parent, null); assert.ok(oldMarks.every(n => n.destroyed));
  assert.equal(p.layer.pixelRatio, 2); assert.equal(p.stage.attrs.width, 276);
  const nativePanel = env.instances[2];
  env.views[2].rect.width = 276; env.views[2].rect.height = 188;
  nativePanel.resizeObserver.trigger();
  assert.equal(nativePanel.layer.pixelRatio, 2); assert.equal(nativePanel.stage.attrs.width, 276);
});

test('a panel initially hidden by a host layout starts correctly after becoming measurable', t => {
  const env = setup({ width: 0 }); t.after(env.cleanup);
  const p = env.instances[0];
  assert.equal(p.timeline, undefined);
  p.intersectionObserver.trigger(true);
  env.views[0].rect.width = 276; p.resizeObserver.trigger();
  assert.equal(p.timeline.paused(), false); env.advance(1000); assert.ok(p.progress() > 0);
});

test('teardown removes timelines, Konva nodes, observers and event handlers; mount is idempotent', t => {
  const env = setup(); t.after(env.cleanup); const p = env.instances[0], view = env.views[0];
  assert.equal(env.Panel.mountAll(registry)[0], p);
  p.intersectionObserver.trigger(true); p.destroy();
  assert.equal(p.timeline.parent, null); assert.equal(p.stage.destroyed, true);
  assert.ok(p.resizeObserver.disconnected && p.intersectionObserver.disconnected);
  assert.equal(view.viewport.__researchVisual, undefined);
  view.replay.emit('click'); assert.equal(p.playing, false);
  const remounted = env.Panel.mountAll(registry)[0];
  assert.notEqual(remounted, p); remounted.destroy();
});

test('missing renderers do not stop other panels mounting', t => {
  const env = setup(); t.after(env.cleanup); env.instances.forEach(p => p.destroy());
  const replacement = env.Panel.mountAll({ prm: scenes.prm });
  assert.deepEqual(replacement.map(p => p.type), ['prm']);
  replacement.forEach(p => p.destroy());
});

test('HIVE shows stale historical choices before prompt entropy corrects the selection', t => {
  const env = setup(); t.after(env.cleanup); const p = env.instances[0];
  p.timeline.time(2.9, true); p.draw();
  const selected = () => Array.from({ length: 12 }, (_, i) => i).filter(i => mark(p, 'selected-' + i).opacity() === 1);
  assert.deepEqual(selected(), [4, 5, 6, 7]);
  const band = mark(p, 'medium-band').attrs.points;
  for (const i of [4, 5]) {
    assert.ok(mark(p, 'history-' + i).x() > band[0]);
    assert.ok(mark(p, 'prompt-' + i).x() < band[0], 'Former medium prompts are now easy');
  }
  assert.ok(textMark(p, 'History is stale'));
  p.timeline.time(4.6, true); p.draw();
  assert.deepEqual(selected(), [6, 7, 8, 9]);
  for (const i of selected()) {
    assert.ok(i >= 3 && i <= 10, 'Only history-shortlisted candidates survive');
    assert.ok(mark(p, 'selected-' + i).x() >= band[0] && mark(p, 'selected-' + i).x() <= band[2]);
  }
  assert.ok(textMark(p, 'Select current medium'));
  assert.equal(textMark(p, 'Rollout').opacity(), .35, 'Verification finishes before rollout');
});

test('PRM uses one training coordinate and preserves distinct curve styles and final labels', t => {
  const env = setup(); t.after(env.cleanup); const p = env.instances[1];
  function assertFollowing(time) {
    p.timeline.time(time, true); p.draw();
    const solve = textMark(p, 'Solve'), judge = textMark(p, 'Judge');
    assert.ok(solve.opacity() > 0 && judge.opacity() > 0);
    assert.equal(solve.x(), mark(p, 'solve-tip').x() + 12);
    assert.equal(judge.x(), mark(p, 'judge-tip').x() + 12);
    assert.ok(judge.y() - solve.y() >= 15.999, `${time}: ${judge.y()} - ${solve.y()}`);
  }
  assertFollowing(1.3); assertFollowing(2.5); assertFollowing(4.6);
  p.timeline.progress(1, true); p.draw(); assertFollowing(2.5);
  assert.equal(mark(p, 'solve-tip').x(), mark(p, 'judge-tip').x());
  assert.notEqual(mark(p, 'solve-tip').y(), mark(p, 'judge-tip').y());
  assert.equal(mark(p, 'solve-trace').attrs.dash, undefined);
  assert.deepEqual(mark(p, 'judge-trace').attrs.dash, [4, 3]);
  p.timeline.progress(1, true); p.draw();
  for (const label of ['Solve', 'Judge']) assert.equal(textMark(p, label).opacity(), 1);
  assert.ok(textMark(p, 'Capability'));
  assert.ok(!textMark(p, 'No process labels'));
});

test('PaW reveals one trajectory before action policy loss and resulting-observation world loss', t => {
  const env = setup({ types: ['paw'] }); t.after(env.cleanup); const p = env.instances[0];
  p.timeline.time(3.1, true); p.draw();
  assert.equal(Array.from({ length: 6 }, (_, i) => mark(p, 'trajectory-' + i)).filter(Boolean).length, 5);
  assert.equal(mark(p, 'trajectory-label-4').opacity(), 1, 'The ellipsis shares the same trajectory');
  assert.equal(mark(p, 'policy-train-1').opacity(), 1);
  assert.equal(mark(p, 'policy-train-3').opacity(), 1);
  assert.equal(mark(p, 'policy-mask-0').opacity(), 1);
  assert.equal(mark(p, 'policy-mask-2').opacity(), 1);
  assert.equal(mark(p, 'world-prefix-mask').opacity(), 0);
  assert.equal(mark(p, 'world-train-2').opacity(), 0);
  p.timeline.progress(1, true); p.draw();
  assert.equal(mark(p, 'world-prefix-mask').opacity(), 1);
  assert.equal(mark(p, 'world-train-2').opacity(), 1);
  assert.equal(mark(p, 'world-train-5').opacity(), 1);
  assert.equal(mark(p, 'world-mask-3').opacity(), 1);
  assert.ok(textMark(p, 'Shared'));
  p.timeline.time(3.1, true); p.draw();
  assert.equal(mark(p, 'world-train-2').opacity(), 0, 'Backward seek restores the policy-only stage');
});

test('Safe Delta keeps paired ΔW bars, then preserves utility while lowering safety loss', t => {
  const env = setup({ types: ['safe-delta'] }); t.after(env.cleanup); const p = env.instances[0];
  p.timeline.time(2.1, true); p.draw();
  assert.ok(mark(p, 'utility-bar').attrs.height > 18, 'SFT raises utility');
  assert.ok(mark(p, 'safety-loss-bar').attrs.height > 8, 'SFT raises safety loss');
  p.timeline.time(3.05, true); p.draw();
  const halfUtility = mark(p, 'utility-bar').attrs.height, halfSafety = mark(p, 'safety-loss-bar').attrs.height;
  assertNear(halfUtility, 84);
  assert.ok(halfSafety > 16 && halfSafety < 67, 'Safety loss falls through selection');
  p.timeline.progress(1, true); p.draw();
  assertNear(mark(p, 'utility-bar').attrs.height, 84);
  assertNear(mark(p, 'safety-loss-bar').attrs.height, 16);
  assert.equal(Array.from({ length: 16 }, (_, i) => mark(p, 'delta-utility-' + i)).filter(Boolean).length, 16);
  assert.equal(Array.from({ length: 16 }, (_, i) => mark(p, 'delta-safety-' + i)).filter(Boolean).length, 16);
  assert.equal(Array.from({ length: 16 }, (_, i) => mark(p, 'delta-outline-' + i)).filter(node => node.opacity() === 1).length, 5);
});

test('SICO rewrites one example with detector feedback before reusing it for new text', t => {
  const env = setup({ types: ['sico'] }); t.after(env.cleanup); const p = env.instances[0];
  p.timeline.time(1.45, true); p.draw();
  const initialScore = mark(p, 'ai-score-fill').points()[2];
  p.timeline.time(2.4, true); p.draw();
  assert.ok(mark(p, 'detector-feedback').opacity() > 0);
  assert.ok(mark(p, 'ai-score-fill').points()[2] < initialScore, 'Accepted edits lower the AI score');
  assert.ok(Array.from({ length: 3 }, (_, i) => mark(p, 'example-edit-' + i)).some(node => node.opacity() > 0));
  assert.equal(mark(p, 'prompt-card').opacity(), 0);
  assert.equal(mark(p, 'llm-node').opacity(), 0);
  assert.equal(mark(p, 'text-card').opacity(), 0);
  p.timeline.time(4.1, true); p.draw();
  assert.ok(mark(p, 'example-transfer').opacity() > 0);
  assert.ok(mark(p, 'prompt-card').opacity() > 0);
  assert.equal(mark(p, 'llm-node').opacity(), 0);
  p.timeline.time(5.0, true); p.draw();
  assert.ok(mark(p, 'llm-node').opacity() > 0);
  assert.equal(mark(p, 'text-card').opacity(), 0);
  p.timeline.progress(1, true); p.draw();
  assert.equal(mark(p, 'text-card').opacity(), 1);
  assert.equal(mark(p, 'llm-to-text').opacity(), 1);
  for (let i = 0; i < 3; i++) {
    const source = mark(p, 'example-stroke-' + i).points(), copy = mark(p, 'prompt-example-' + i).points();
    const originalEdit = mark(p, 'example-edit-' + i).points(), copiedEdit = mark(p, 'prompt-edit-' + i).points();
    for (const edge of [0, 2]) {
      assertNear((originalEdit[edge] - source[0]) / (source[2] - source[0]),
        (copiedEdit[edge] - copy[0]) / (copy[2] - copy[0]));
    }
  }
  p.timeline.time(2.4, true); p.draw();
  assert.equal(mark(p, 'prompt-card').opacity(), 0, 'Backward seek resets reuse state');
});

test('all scenes remain finite and legible in narrow and wide content frames', t => {
  for (const width of [245, 259, 276, 468, 720]) {
    const env = setup({ width, types: ['hive', 'prm', 'paw', 'safe-delta', 'sico'] }); t.after(env.cleanup);
    for (const p of env.instances) {
      for (const progress of [0, .25, .5, .75, 1, .1]) {
        p.timeline.progress(progress, true); p.draw();
        if (p.group) for (const node of allNodes(p.group)) {
          for (const value of Object.values(node.attrs).flat()) {
            if (typeof value === 'number') assert.ok(Number.isFinite(value));
          }
          if (node.attrs.text) assert.ok(node.attrs.fontSize >= 9);
        }
      }
    }
  }
});

test('paper themes cannot fork the shared layout or Replay styling', () => {
  for (const file of ['research-demos.css', 'home.css', 'studio.css']) {
    const css = fs.readFileSync(require.resolve('../assets/css/' + file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!selector.includes('.research-demo--')) continue;
      assert.match(selector.trim(), /^\.research-demo--[a-z-]+$/);
      for (const declaration of body.split(';').map(v => v.trim()).filter(Boolean)) assert.match(declaration, /^--research-demo-[a-z-]+\s*:/);
    }
  }
});
