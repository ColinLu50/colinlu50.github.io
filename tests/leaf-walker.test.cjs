const assert = require('node:assert/strict');
const Surface = require('../assets/js/grass-surface.js');
const Walker = require('../assets/js/leaf-walker.js');
const Rig = require('../assets/js/ant-kinematics.js');
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function random(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
let contacts = 0, departures = 0, windTravel = 0, maxReachError = 0;
const states = new Set();
for (const width of [375, 768, 1280]) for (let seed = 1; seed <= 4; seed++) {
  const surface = new Surface(width, 950), walker = new Walker(surface, random(seed));
  let last = null;
  for (let frame = 0; frame < 30 * 480; frame++) {
    walker.tick(1 / 30); states.add(walker.state);
    assert.ok(walker.feet.filter(f => f.planted).length >= 3);
    assert.ok(Number.isFinite(walker.x + walker.y + walker.angle), 'Finite body pose');
    if (walker.state !== 'away') for (let i = 0; i < 6; i++) {
      const foot = walker.feet[i], chain = Rig.solveLeg(walker, foot);
      assert.ok(chain.reachable, `Reachable 3D leg at ${width}/${seed}/${frame}`);
      maxReachError = Math.max(maxReachError,
        Math.abs(length(chain.coxa, chain.knee) - Rig.femur * surface.scale),
        Math.abs(length(chain.knee, chain.ankle) - Rig.tibia * surface.scale));
      assert.ok(Math.abs(foot.y) < surface.halfWidth(foot.x) - .25, `Foot ${i} stays on blade at ${width}/${seed}/${frame}: ${foot.y} / ${surface.halfWidth(foot.x)}`);
      assert.ok(length(chain.tip, surface.sample(foot.x, foot.y, foot.lift, walker.time)) < 1e-10);
      if (foot.swing && !foot.swing.grooming && foot.swing.progress > 0 && foot.swing.progress <= .18) {
        assert.ok(foot.lift > 0, 'A foot lifts before advancing');
        assert.equal(foot.x, foot.swing.from.x, 'Lift vertically without dragging along the blade');
        assert.equal(foot.y, foot.swing.from.y, 'Lift vertically without dragging across the blade');
      }
      if (last && last.state !== 'away' && foot.planted && last.feet[i].planted) {
        assert.equal(foot.x, last.feet[i].x, 'No slip along the leaf');
        assert.equal(foot.y, last.feet[i].y, 'No slip across the leaf');
        const carriedByWind = surface.sample(last.feet[i].x, last.feet[i].y, 0, walker.time);
        assert.ok(length(chain.tip, carriedByWind) < 1e-10, 'The supporting tip follows the same material point as the swaying leaf');
        windTravel += length(chain.tip, last.feet[i].tip); contacts++;
      }
    }
    if (last?.state !== 'away' && walker.state === 'away' && last) {
      assert.ok(walker.x < surface.length * .20, 'Leave along the blade base, not through mid-air');
      departures++;
    }
    if (frame === 180) walker.react();
    last = { state: walker.state, feet: walker.feet.map(f => ({ x: f.x, y: f.y, planted: f.planted, tip: Rig.solveLeg(walker, f).tip })) };
  }
}
assert.ok(contacts > 10000 && departures > 12 && windTravel > 1);
assert.ok(maxReachError < 1e-9);
for (const action of ['exploring', 'grooming', 'backing', 'resting', 'probing', 'departing', 'away', 'startled', 'fleeing']) assert.ok(states.has(action), action);
console.log(JSON.stringify({ contacts, departures, maxReachError, windTravel, states: [...states] }, null, 2));

let escapes = 0, longestEscape = 0;
for (const width of [375, 1280]) for (const dt of [1 / 60, 1 / 30, .05]) {
  for (const pose of ['resting', 'stride', 'turn', 'grooming', 'backing']) for (const angle of [0, Math.PI]) {
    const surface = new Surface(width, 950), walker = new Walker(surface, random(12));
    walker.showResting(); walker.x = surface.length * .59; walker.angle = angle; walker.plantAll();
    if (pose === 'stride' || pose === 'turn') {
      walker.state = 'exploring'; walker.cruise = 9;
      walker.target = { x: walker.x + (pose === 'turn' ? -1 : 1) * Math.cos(angle) * 45, y: 0 };
    } else if (pose === 'grooming') {
      walker.state = 'grooming'; walker.timer = 3; walker.groomed = false; walker.groomSide = -1;
    } else if (pose === 'backing') { walker.state = 'backing'; walker.backRemaining = 10; }
    for (let i = 0; i < 4; i++) walker.tick(dt);
    walker.react(); assert.equal(walker.state, 'startled');
    let elapsed = 0, moving = 0, last = walker.feet.map(f => ({ ...f }));
    while (walker.state !== 'away' && elapsed < 18) {
      const actionStart = walker.actionStart;
      walker.setAttention(false); walker.setAttention(true); walker.react();
      assert.equal(walker.actionStart, actionStart, 'Repeated touches do not restart the reaction');
      walker.tick(dt); elapsed += dt;
      assert.ok(walker.feet.filter(f => f.planted).length >= 3, 'Escape retains a support tripod');
      for (const [i, foot] of walker.feet.entries()) {
        const chain = Rig.solveLeg(walker, foot);
        assert.ok(chain.reachable, `${pose}: fast steps keep the actual leg lengths reachable`);
        assert.ok(Math.abs(foot.y) < surface.halfWidth(foot.x) - .25, `${pose}: escape stays on blade`);
        // A complete accelerated swing can fit between two slow frames. In
        // that case it must have landed; only continuous stance is compared.
        if (foot.planted && last[i].planted && walker.steps === last[i].steps) {
          assert.equal(foot.x, last[i].x, 'Escape stance does not slip');
          assert.equal(foot.y, last[i].y, 'Escape stance does not slip across the leaf');
        }
      }
      if (walker.speed > 20) moving++;
      last = walker.feet.map(f => ({ ...f, steps: walker.steps }));
    }
    assert.equal(walker.state, 'away', `${pose}/${width}/${dt}/${angle}: escapes despite persistent hover`);
    assert.ok(moving > 5, 'Escape visibly exceeds the normal walking speed');
    assert.ok(walker.x < surface.length * .20, 'Disappears only at the offscreen blade base');
    assert.ok(walker.timer >= 55 && walker.timer <= 110);
    assert.equal(walker.reacting, false); assert.equal(walker.gaitRate, 1);
    const awayTimer = walker.timer; walker.react(); assert.equal(walker.timer, awayTimer);
    walker.setAttention(false);
    while (walker.state === 'away') walker.tick(dt);
    assert.equal(walker.state, 'exploring'); assert.ok(walker.cruise <= 10);
    assert.equal(walker.gaitRate, 1); assert.equal(walker.reacting, false);
    escapes++; longestEscape = Math.max(longestEscape, elapsed);
  }
}
console.log(JSON.stringify({ escapes, longestEscape }, null, 2));
