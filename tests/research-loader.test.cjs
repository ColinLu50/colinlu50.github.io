const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/research-loader.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup({ observer = true, empty = false } = {}) {
  const classes = new Set(), listeners = new Set(), requests = [];
  let observerInstance;
  const viewport = { textContent: '', classList: {
    add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)
  } };
  const button = { addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  class Observer {
    constructor(fn, options) { this.fn = fn; this.options = options; observerInstance = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const document = {
    currentScript: { getAttribute: () => '/project/assets/js/' },
    querySelectorAll: selector => empty ? [] : selector === '.research-demo-viewport' ? [viewport] : [button],
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { appendChild: script => requests.push(script) }
  };
  vm.runInNewContext(source, { document, window: observer ? { IntersectionObserver: Observer } : {}, IntersectionObserver: Observer });
  return { requests, viewport, listeners, observer: observerInstance,
    near: () => observerInstance.fn([{ isIntersecting: true }]),
    far: () => observerInstance.fn([{ isIntersecting: false }]),
    click: () => [...listeners].forEach(fn => fn()) };
}

async function succeedPending(env) {
  env.requests.filter(r => !r.completed && !r.removed).forEach(r => { r.completed = true; r.onload(); });
  await flush();
}

test('no animation libraries are requested before a panel approaches the viewport', () => {
  const env = setup();
  assert.equal(env.requests.length, 0);
  env.far(); assert.equal(env.requests.length, 0);
  assert.equal(env.observer.options.rootMargin, '500px 0px');
});

test('concurrent intersection and Replay requests share libraries and respect script dependencies', async () => {
  const env = setup(); env.near(); env.near(); env.click();
  assert.equal(env.requests.length, 2);
  assert.ok(env.requests.every(r => r.src.startsWith('/project/assets/js/vendor/')));
  await succeedPending(env);
  assert.equal(env.requests.length, 4);
  assert.ok(env.requests[2].src.includes('research-panel.js'));
  assert.ok(env.requests[3].src.includes('research-scenes.js'));
  await succeedPending(env);
  assert.equal(env.requests.length, 5);
  assert.ok(env.requests[4].src.includes('research-demos.js'));
  await succeedPending(env);
  env.near(); env.click();
  assert.equal(env.requests.length, 5);
  assert.equal(env.observer.disconnected, true); assert.equal(env.listeners.size, 0);
});

test('Replay retries a failed asset without downloading successful dependencies again', async () => {
  const env = setup(); env.near();
  env.requests[0].onerror(); env.requests[1].completed = true; env.requests[1].onload();
  await flush(); assert.match(env.viewport.textContent, /Replay to retry/);
  env.click(); assert.equal(env.requests.length, 3);
  await succeedPending(env); await succeedPending(env); await succeedPending(env);
  assert.equal(env.viewport.textContent, '');
  assert.equal(env.requests.filter(r => r.src.includes('gsap.min.js')).length, 1);
  assert.equal(env.observer.disconnected, true);
});

test('browsers without IntersectionObserver load immediately; pages without panels load nothing', () => {
  assert.equal(setup({ observer: false }).requests.length, 2);
  assert.equal(setup({ empty: true }).requests.length, 0);
});
