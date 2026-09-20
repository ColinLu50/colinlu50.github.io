/* Locomotion on the leaf: planted feet retain fixed surface coordinates. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LeafWalker = factory();
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function angleDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }

  function LeafWalker(surface, random) {
    this.random = random || Math.random;
    this.surface = surface; this.surfaceLength = surface.length;
    this.x = surface.length * .24; this.y = 0; this.angle = 0;
    this.state = "away"; this.timer = 2.2; this.time = 0; this.age = 0;
    this.speed = 0; this.vx = 0; this.vy = 0; this.angularSpeed = 0;
    this.attentive = false; this.ignoreAttention = false; this.reacting = false;
    this.stride = null; this.stepHold = 0; this.stroke = 0;
    this.target = null; this.visits = 0; this.steps = 0; this.lastGroup = 1;
    this.feet = [];
    for (var side = -1; side <= 1; side += 2) {
      for (var row = 0; row < 3; row++) {
        this.feet.push({ side: side, row: row, group: (row + (side > 0 ? 1 : 0)) % 2,
          hipX: [7, 0, -7][row], hipY: side * 3,
          homeX: [18, 0, -19][row], homeY: side * [14, 17, 13][row],
          x: 0, y: 0, planted: true, lift: 0, swing: null });
      }
    }
    this.plantAll();
  }
  LeafWalker.prototype.world = function (x, y, angle, px, py) {
    angle = angle === undefined ? this.angle : angle;
    px = px === undefined ? this.x : px; py = py === undefined ? this.y : py;
    return { x: px + Math.cos(angle) * x - Math.sin(angle) * y,
      y: py + Math.sin(angle) * x + Math.cos(angle) * y };
  };
  LeafWalker.prototype.plantAll = function () {
    var self = this;
    this.feet.forEach(function (foot) {
      var p = self.world(foot.homeX, foot.homeY);
      foot.x = p.x; foot.y = p.y; foot.planted = true; foot.lift = 0; foot.swing = null;
    });
  };
  LeafWalker.prototype.bounds = function () {
    return { left: this.surface.length * .38, right: this.surface.length * .60, top: -1.2, bottom: 1.2 };
  };
  LeafWalker.prototype.pickTarget = function (reconsider) {
    var b = this.bounds(), direction = Math.cos(this.angle) >= 0 ? 1 : -1;
    if (reconsider || this.random() < .17) direction *= -1;
    if (this.x < b.left + 25) direction = 1;
    if (this.x > b.right - 25) direction = -1;
    var x = Math.max(b.left, Math.min(b.right, this.x + direction * (50 + this.random() * 85)));
    if (Math.abs(x - this.x) < 18) x = direction > 0 ? b.right : b.left;
    this.target = { x: x, y: (this.random() - .5) * 2.4 };
    this.stride = null; this.state = "exploring";
    this.cruise = 8.5 + this.random() * 1.5;
  };
  LeafWalker.prototype.enter = function () {
    this.x = this.surface.length * .24; this.y = 0; this.angle = 0;
    this.age = 0; this.visits = 4 + Math.floor(this.random() * 3);
    this.visitLimit = 55 + this.random() * 30;
    this.ignoreAttention = false; this.reacting = false; this.speed = 0;
    this.stride = null; this.stepHold = 0; this.gaitRate = 1;
    this.plantAll(); this.pickTarget(false);
  };
  LeafWalker.prototype.depart = function () {
    this.state = "departing"; this.stride = null;
    this.target = { x: this.surface.length * .18, y: 0 }; this.cruise = 9;
  };
  LeafWalker.prototype.arrive = function () {
    this.stride = null; this.stroke = 0;
    if (--this.visits <= 0 || this.age > this.visitLimit) { this.depart(); return; }
    var choice = this.random();
    this.state = choice < .22 ? "resting" : choice < .49 ? "probing" : choice < .76 ? "grooming" : "backing";
    this.timer = this.state === "resting" ? 3 + this.random() * 5 : 1.3 + this.random() * 1.6;
    this.actionStart = this.time;
    this.backRemaining = 4 + this.random() * 6;
    this.groomSide = this.random() < .5 ? -1 : 1;
    this.groomed = false;
  };
  LeafWalker.prototype.setAttention = function (value) {
    this.attentive = value;
    if (!value) this.ignoreAttention = false;
    if (this.reacting) this.ignoreAttention = true;
  };
  LeafWalker.prototype.react = function () {
    if (this.state === "away" || this.reacting) return;
    this.state = "startled"; this.timer = .16; this.actionStart = this.time;
    this.reacting = true; this.ignoreAttention = true; this.stepHold = 0;
    // Finish the step already in progress before turning. Never relocate a
    // supporting toe, or leave a lifted foot hanging when the touch arrives.
    if (this.stride) {
      var factor = Math.max(1, this.stride.duration * (1 - this.stride.progress) / .12);
      this.stride.duration /= factor;
      this.feet.forEach(function (foot) { if (foot.swing) foot.swing.duration /= factor; });
    } else {
      this.feet.forEach(function (foot) {
        if (foot.swing) foot.swing.duration = Math.min(foot.swing.duration, .12 / (1 - foot.swing.progress));
      });
    }
  };
  LeafWalker.prototype.startSwing = function (foot, target, duration, grooming) {
    foot.planted = false;
    foot.swing = { from: { x: foot.x, y: foot.y }, to: target, progress: 0,
      duration: duration, grooming: !!grooming };
  };
  LeafWalker.prototype.updateFeet = function (dt) {
    var self = this;
    this.feet.forEach(function (foot) {
      if (!foot.swing) return; // Stance anchors are never advanced with the body.
      var swing = foot.swing;
      swing.progress = Math.min(1, swing.progress + dt / swing.duration);
      var p = swing.progress;
      // Lift vertically first; only move forward after breaking ground contact.
      // The final 18% lowers the foot vertically onto its next fixed anchor.
      var travel = clamp((p - .18) / .64, 0, 1);
      var t = ease(swing.grooming ? (p < .5 ? p * 2 : (1 - p) * 2) : travel);
      foot.x = mix(swing.from.x, swing.to.x, t); foot.y = mix(swing.from.y, swing.to.y, t);
      foot.lift = swing.grooming ? Math.sin(Math.PI * p) * 8.5 :
        4.2 * (p < .22 ? ease(p / .22) : p > .78 ? ease((1 - p) / .22) : 1);
      if (p === 1) {
        var landing = swing.grooming ? swing.from : swing.to;
        foot.x = landing.x; foot.y = landing.y; foot.lift = 0;
        foot.planted = true; foot.swing = null; self.steps++;
      }
    });
    if (this.feet.some(function (foot) { return !foot.planted; })) return;
    if (this.state === "grooming" && !this.groomed && this.speed < .2) {
      var foreleg = this.feet.find(function (foot) { return foot.row === 0 && foot.side === self.groomSide; });
      this.startSwing(foreleg, this.world(18, foreleg.side * 4), .85, true);
      this.groomed = true;
      return;
    }
  };
  LeafWalker.prototype.move = function (dt, reversing) {
    var previousX = this.x, previousY = this.y, previousAngle = this.angle;
    this.speed = 0;
    if (this.attentive && !this.ignoreAttention) {
      this.stride = null; this.stroke = 0; this.stepHold = .12;
      return 0;
    }
    if (!this.stride) {
      this.stroke = 0;
      this.stepHold = Math.max(0, this.stepHold - dt);
      if (this.stepHold > 0 || this.feet.some(function (foot) { return !foot.planted; })) return 0;
      var destination = this.target;
      var delta = reversing ? 0 : angleDiff(Math.atan2(destination.y - this.y, destination.x - this.x), this.angle);
      var pivoting = !reversing && Math.abs(delta) > .10;
      var turn = clamp(delta, pivoting ? -.22 : -.12, pivoting ? .22 : .12);
      var length = reversing ? -2.2 : pivoting ? 0 : Math.min(4.8, distance(this, destination));
      var heading = this.angle + turn;
      var x = this.x + Math.cos(this.angle + turn * .5) * length;
      var y = this.y + Math.sin(this.angle + turn * .5) * length;
      var group = 1 - this.lastGroup;
      // The support tripod constrains the whole next stroke, before it begins.
      for (var attempt = 0; attempt < 5; attempt++) {
        var reachable = this.feet.every(function (foot) {
          return foot.group === group || distance(foot, this.world(foot.hipX, foot.hipY, heading, x, y)) < 23.2;
        }, this);
        if (reachable) break;
        x = mix(this.x, x, .5); y = mix(this.y, y, .5); heading = mix(this.angle, heading, .5);
      }
      if (!reachable) return 0;
      var duration = (pivoting ? .28 : reversing ? .36 : 4.8 / this.cruise) / (this.gaitRate || 1);
      this.stride = { x: this.x, y: this.y, angle: this.angle,
        endX: x, endY: y, endAngle: heading, duration: duration, progress: 0 };
      this.lastGroup = group;
      var self = this;
      this.feet.forEach(function (foot) {
        if (foot.group !== group) return;
        var landing = self.world(foot.homeX, foot.homeY,
          heading + (heading - self.angle) * .35,
          x + (x - self.x) * .45, y + (y - self.y) * .45);
        self.startSwing(foot, landing, duration * .82, false);
      });
    }
    // A planted tripod pushes the body through ONE short stroke. Feet land
    // before it ends, and the next stroke waits for a quiet support interval.
    var stride = this.stride;
    stride.progress = Math.min(1, stride.progress + dt / stride.duration);
    var progress = ease(stride.progress);
    this.x = mix(stride.x, stride.endX, progress);
    this.y = mix(stride.y, stride.endY, progress);
    this.angle = mix(stride.angle, stride.endAngle, progress);
    this.stroke = Math.sin(Math.PI * stride.progress);
    this.vx = (this.x - previousX) / dt; this.vy = (this.y - previousY) / dt;
    this.angularSpeed = angleDiff(this.angle, previousAngle) / dt;
    this.speed = Math.hypot(this.vx, this.vy);
    if (stride.progress === 1) {
      this.stride = null; this.stroke = 0;
      this.stepHold = (.12 + this.random() * .06) / (this.gaitRate || 1);
    }
    return distance(this, { x: previousX, y: previousY });
  };
  LeafWalker.prototype.tickBehavior = function (dt) {
    dt = Math.min(dt, .05); this.time += dt;
    if (this.state === "away") { this.timer -= dt; if (this.timer <= 0) this.enter(); return; }
    this.age += dt;
    this.vx = this.vy = this.angularSpeed = 0;
    if (this.state === "exploring" || this.state === "departing") {
      this.move(dt, false);
      if (distance(this, this.target) < 8) {
        if (this.state === "departing") {
          this.state = "away"; this.timer = 45 + this.random() * 65; this.speed = 0; return;
        }
        this.arrive();
      } else if (this.state === "exploring" && this.age > this.visitLimit + 15) this.depart();
    } else if (this.state === "backing") {
      this.backRemaining -= this.move(dt, true);
      if (this.backRemaining <= 0) { this.reacting = false; this.pickTarget(true); }
    } else {
      this.speed = 0; this.stride = null; this.stroke = 0;
      if (!(this.attentive && !this.ignoreAttention)) this.timer -= dt;
      if (this.timer <= 0) {
        this.pickTarget(this.state === "probing");
      }
    }
    this.updateFeet(dt);
  };
  LeafWalker.prototype.tick = function (dt) {
    if (!this.reacting) { this.tickBehavior(dt); return; }
    dt = Math.min(dt, .05); this.time += dt; this.age += dt;
    this.vx = this.vy = this.angularSpeed = this.speed = 0;
    this.ignoreAttention = true;
    if (this.state === "startled") {
      if (this.stride) this.move(dt, false);
      this.timer -= dt;
      this.updateFeet(dt);
      if (this.timer <= 0 && !this.stride && this.feet.every(function (foot) { return foot.planted; })) {
        this.state = "fleeing"; this.actionStart = this.time;
        this.target = { x: this.surface.length * .18, y: 0 };
        this.stepHold = 0; this.cruise = 9;
      }
      return;
    }
    // Faster tripod strokes, with the same stride length and support limits.
    this.gaitRate = 4.5 + Math.min(1, (this.time - this.actionStart) / .45);
    this.move(dt, false); this.updateFeet(dt);
    if (Math.hypot(this.x - this.target.x, this.y - this.target.y) < 8) {
      this.state = "away"; this.timer = 55 + this.random() * 55;
      this.reacting = false; this.ignoreAttention = false; this.gaitRate = 1;
      this.stride = null; this.stroke = 0; this.speed = 0;
    }
  };
  LeafWalker.prototype.headAngle = function () {
    if (this.state === "startled") return -.16 * Math.sin(Math.min(1, (this.time - this.actionStart) / .16) * Math.PI);
    if (this.state === "fleeing") return Math.sin(this.time * 12) * .025;
    return /probing|grooming/.test(this.state) || this.attentive ?
      Math.sin((this.time - (this.actionStart || 0)) * 3.4) * .17 : Math.sin(this.time * 2) * .025;
  };
  LeafWalker.prototype.showResting = function () {
    this.x = this.surface.length * .48; this.y = 0; this.angle = 0;
    this.state = "resting"; this.timer = 3; this.visits = 4; this.age = 0; this.visitLimit = 70;
    this.reacting = false; this.ignoreAttention = false; this.gaitRate = 1;
    this.stride = null; this.stepHold = 0; this.stroke = 0;
    this.plantAll();
  };
  LeafWalker.prototype.resizeSurface = function () {
    if (this.surface.length === this.surfaceLength) return;
    var ratio = this.surface.length / this.surfaceLength;
    this.x *= ratio;
    if (this.target) this.target.x *= ratio;
    this.surfaceLength = this.surface.length;
    this.stride = null; this.stroke = 0; this.plantAll();
  };
  return LeafWalker;
}));
