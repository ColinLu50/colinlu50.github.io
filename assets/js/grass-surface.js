/* One shared leaf surface for mesh vertices, body pose and planted foot anchors. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GrassSurface = factory();
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function mul(p, n) { return { x: p.x * n, y: p.y * n, z: p.z * n }; }
  function unit(p) { return mul(p, 1 / (Math.hypot(p.x, p.y, p.z) || 1)); }
  function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
  function Leaf(width, height, options) {
    this.options = options || {}; this.scale = .58;
    this.resize(width, height);
  }
  Leaf.prototype.resize = function (width, height) {
    var o = this.options;
    this.span = o.span || Math.min(width * .48, 370);
    var rootX = width + (o.rootX === undefined ? 38 : o.rootX);
    var rootY = -height - (o.rootY === undefined ? 52 : o.rootY);
    var openness = Math.max(0, Math.min(1, (width - 400) / 550));
    openness = openness * openness * (3 - 2 * openness);
    var rise = (.82 + .18 * openness) * (o.rise || 1);
    this.points = [
      { x: rootX, y: rootY, z: o.depth || 0 },
      { x: rootX - this.span * .1, y: rootY + 82 * rise, z: (o.depth || 0) + 100 * rise },
      { x: rootX - this.span * .76, y: rootY + 152 * rise, z: (o.depth || 0) + 128 * rise },
      { x: rootX - this.span, y: rootY + 148 * rise, z: (o.depth || 0) + (o.tipHeight || 114) * rise }
    ];
    this.arc = [0];
    var previous = this.curve(0, 0), total = 0;
    for (var i = 1; i <= 80; i++) {
      var p = this.curve(i / 80, 0);
      total += Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z);
      this.arc.push(total); previous = p;
    }
    this.length = total / this.scale;
  };
  Leaf.prototype.curve = function (t, time) {
    var p = this.points, q = 1 - t, phase = this.options.phase || 0;
    var wind = this.options.wind === undefined ? 3.2 : this.options.wind;
    return {
      x: q*q*q*p[0].x + 3*q*q*t*p[1].x + 3*q*t*t*p[2].x + t*t*t*p[3].x + Math.sin(time * .34 + phase) * wind * t*t,
      y: q*q*q*p[0].y + 3*q*q*t*p[1].y + 3*q*t*t*p[2].y + t*t*t*p[3].y + Math.sin(time * .27 + phase) * wind * .6 * t*t,
      z: q*q*q*p[0].z + 3*q*q*t*p[1].z + 3*q*t*t*p[2].z + t*t*t*p[3].z + Math.sin(time * .41 + phase) * wind * .35 * t*t
    };
  };
  Leaf.prototype.parameter = function (u) {
    var distance = u * this.scale, last = this.arc.length - 1;
    if (distance < 0) return distance / this.arc[1] / last;
    if (distance > this.arc[last]) return 1 + (distance - this.arc[last]) / (this.arc[last] - this.arc[last - 1]) / last;
    var lo = 0, hi = last;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (this.arc[mid] < distance) lo = mid; else hi = mid; }
    return (lo + (distance - this.arc[lo]) / (this.arc[hi] - this.arc[lo])) / last;
  };
  Leaf.prototype.halfWidth = function (u) {
    return (this.options.halfWidth || 40) * Math.pow(Math.max(0, 1 - Math.max(0, u) / this.length), .4);
  };
  Leaf.prototype.section = function (u, time) {
    var t = this.parameter(u), center = this.curve(t, time);
    var tangent = unit(sub(this.curve(t + .0001, time), this.curve(t - .0001, time)));
    var across = unit({ x: -tangent.y, y: tangent.x, z: 0 });
    var normal = unit(cross(tangent, across));
    return { center: center, tangent: tangent, across: across, normal: normal };
  };
  Leaf.prototype.sample = function (u, v, height, time) {
    var f = this.section(u, time || 0);
    var fold = -2.2 * this.scale * Math.pow(v / Math.max(1, this.halfWidth(u)), 2);
    return add(f.center, add(mul(f.across, -v * this.scale), mul(f.normal, fold + (height || 0) * this.scale)));
  };
  Leaf.prototype.frame = function (u, v, time) {
    var tangent = unit(sub(this.sample(u + .1, v, 0, time), this.sample(u - .1, v, 0, time)));
    var across = unit(sub(this.sample(u, v - .1, 0, time), this.sample(u, v + .1, 0, time)));
    var normal = unit(cross(tangent, across));
    return { tangent: tangent, across: unit(cross(normal, tangent)), normal: normal };
  };
  return Leaf;
}));
