const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const code = name => fs.readFileSync(path.join(root, 'assets/js', name), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function enhancements({ text = [], grid = false, github = false, painted = true } = {}) {
  const requests = [], rendered = [], warnings = [];
  const frames = new Map(), timers = new Map();
  let nextId = 0;
  const nodes = text.map(value => ({
    textContent: typeof value === 'string' ? value : value.text,
    parentElement: { closest: () => value.code || false }
  }));
  const document = {
    currentScript: { getAttribute: () => '/subsite/assets/vendor/' },
    body: {},
    head: { appendChild: node => requests.push(node) },
    querySelector: selector => selector === '.grid' ? grid : github,
    createElement: tag => ({ tag }),
    createTreeWalker: (body, mask, filter) => {
      const accepted = nodes.filter(node => filter.acceptNode(node) === 1);
      return { nextNode: () => accepted.shift() };
    }
  };
  vm.runInNewContext(code('enhancements.js'), {
    document, NodeFilter: { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 },
    window: {
      renderMathInElement: (...args) => rendered.push(args),
      setTimeout: fn => { timers.set(++nextId, fn); return nextId; },
      clearTimeout: id => timers.delete(id),
      requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; },
      cancelAnimationFrame: id => frames.delete(id)
    },
    console: { warn: (...args) => warnings.push(args) }
  });
  const state = { requests, rendered, warnings,
    paint: () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    timeout: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }
  };
  if (painted) { state.paint(); state.paint(); }
  return state;
}

test('enhancements start after a paint and do not wait for scrolling or page load', () => {
  const state = enhancements({ text: ['$x^2$'], painted: false });
  assert.equal(state.requests.length, 0);
  state.paint(); assert.equal(state.requests.length, 0);
  state.paint(); assert.equal(state.requests.length, 2);
  state.timeout(); assert.equal(state.requests.length, 2);
});

test('the background-tab fallback starts enhancements once when rAF is paused', () => {
  const state = enhancements({ text: ['$x^2$'], painted: false });
  state.timeout(); assert.equal(state.requests.length, 2);
  state.paint(); state.paint(); assert.equal(state.requests.length, 2);
});

test('plain content and code examples load no optional libraries', () => {
  assert.equal(enhancements({ text: ['Research', { text: '$x^2$', code: true }] }).requests.length, 0);
});

test('math waits for its local CSS and ordered scripts before rendering', async () => {
  const state = enhancements({ text: ['An equation: $x^2$'] });
  assert.equal(state.requests.length, 2);
  assert.ok(state.requests.every(node => (node.src || node.href).startsWith('/subsite/assets/vendor/')));
  state.requests.find(node => node.tag === 'script').onload();
  await flush();
  assert.equal(state.requests.length, 2, 'do not expose unstyled math');
  state.requests.find(node => node.tag === 'link').onload();
  await flush();
  assert.match(state.requests[2].src, /auto-render\.min\.js$/);
  assert.equal(state.rendered.length, 0);
  state.requests[2].onload();
  await flush();
  assert.equal(state.rendered.length, 1);
});

test('optional library failure leaves the page running', async () => {
  const state = enhancements({ github: true });
  state.requests[0].onerror();
  await flush();
  assert.equal(state.warnings.length, 1);
  assert.equal(state.rendered.length, 0);
});

test('masonry dependencies are requested only for actual grid content', () => {
  const state = enhancements({ grid: true });
  assert.equal(state.requests.length, 2);
  assert.match(state.requests[0].src, /masonry/);
  assert.match(state.requests[1].src, /imagesloaded/);
});

test('the counter starts after load and updates its value asynchronously', () => {
  const events = {}, idle = [], requests = [];
  let providerValue = null, mutation, disconnected = false;
  const control = { classList: { add() {} }, setAttribute() {} };
  const value = { textContent: '···' };
  const source = {
    querySelector: () => providerValue,
    getAttribute: () => 'https://mapmyvisitors.com/map.js?test',
    appendChild: node => requests.push(node)
  };
  vm.runInNewContext(code('pageviews.js'), {
    document: {
      readyState: 'interactive',
      querySelector: selector => ({ '[data-pageviews]': control, '[data-pageviews-value]': value, '.visitor-map-source': source })[selector],
      getElementById: () => null,
      createElement: () => ({})
    },
    window: {
      addEventListener: (name, callback) => { events[name] = callback; },
      requestIdleCallback: callback => idle.push(callback)
    },
    MutationObserver: class {
      constructor(callback) { mutation = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    }
  });
  assert.equal(requests.length, 0);
  assert.equal(idle.length, 0);
  events.load();
  assert.equal(requests.length, 0);
  idle[0]();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].async, true);
  assert.equal(requests[0].id, 'mapmyvisitors');
  providerValue = { textContent: '12,345 visits' };
  mutation();
  assert.equal(value.textContent, '12,345');
  assert.equal(disconnected, true);
});

test('all vendored stylesheet font references resolve locally', () => {
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item =>
      item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
  }
  for (const file of walk(path.join(root, 'assets/vendor')).filter(file => file.endsWith('.css'))) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(["']?([^)'"\s]+)/g)) {
      const url = match[1];
      if (url.startsWith('data:')) continue;
      assert.ok(!/^(https?:)?\/\//.test(url), `external font in ${file}`);
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), url.split(/[?#]/)[0])), `${file}: ${url}`);
    }
  }
});

test('templates never block rendering on an external stylesheet or script', () => {
  for (const name of ['_layouts/default.html', '_layouts/prompt.html', '_includes/footer.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    assert.doesNotMatch(html, /<(?:script|link)\b[^>]*\b(?:src|href)=["'](?:https?:)?\/\//i, name);
  }
});
