const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
let SkyMotion, skyLooks;
before(async () => {
  const code = fs.readFileSync(require.resolve('../assets/js/sky-motion.js'), 'utf8');
  ({ SkyMotion, skyLooks } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64')));
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('all scene pairs converge without overshoot or a brightness-weight spike', () => {
  for (const from of skyLooks) for (const to of skyLooks) {
    const motion = new SkyMotion(from);
    motion.select(to);
    let previous = motion.weights[to];
    for (let i = 0; i < 90; i++) {
      motion.step(1 / 30);
      const weights = Object.values(motion.weights);
      close(weights.reduce((a, b) => a + b), 1);
      assert.ok(weights.every(w => w >= 0 && w <= 1));
      assert.ok(motion.weights[to] >= previous);
      previous = motion.weights[to];
    }
    assert.equal(motion.weights[to], 1);
    assert.equal(motion.transitioning, false);
  }
});
test('rapid selection continues from the visible blend, including a reversed transition', () => {
  const motion = new SkyMotion('noon');
  motion.select('night'); motion.step(.22);
  for (const look of ['dawn', 'sunset', 'noon']) {
    const visible = { ...motion.weights };
    motion.select(look);
    assert.deepEqual(motion.weights, visible);
    motion.step(.1);
  }
  motion.step(3);
  assert.equal(motion.weights.noon, 1);
});
test('lighting and pointer damping depend on elapsed time, not frame count', () => {
  const slow = new SkyMotion(), fast = new SkyMotion();
  for (const m of [slow, fast]) { m.select('night'); m.move(1, -.6); }
  for (let i = 0; i < 30; i++) slow.step(1 / 30);
  for (let i = 0; i < 60; i++) fast.step(1 / 60);
  for (const look of skyLooks) close(slow.weights[look], fast.weights[look]);
  close(slow.pointer.x, fast.pointer.x); close(slow.pointer.y, fast.pointer.y);
});
test('pointer movement is bounded and returns to rest without overshoot', () => {
  const motion = new SkyMotion();
  motion.move(20, -20); motion.step(.3);
  assert.ok(motion.pointer.x < 0 && motion.pointer.x > -14);
  assert.ok(motion.pointer.y > 0 && motion.pointer.y < 9);
  motion.release(); motion.step(4);
  assert.ok(Math.hypot(motion.pointer.x, motion.pointer.y) < .001);
});
test('reduced motion or a hidden scene can settle immediately and remain still', () => {
  const motion = new SkyMotion();
  motion.select('night'); motion.move(-1, 1); motion.step(.15);
  motion.finish(); motion.release(true);
  const resting = JSON.stringify(motion);
  assert.equal(motion.weights.night, 1);
  for (let i = 0; i < 30; i++) motion.step(1 / 30);
  assert.equal(JSON.stringify(motion), resting);
  motion.select('dawn', true);
  assert.equal(motion.weights.dawn, 1);
  assert.equal(motion.transitioning, false);
});
