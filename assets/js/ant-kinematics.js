/* Shared by the Three.js rig and its contact tests. Coordinates are world units. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AntKinematics = factory();
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var femur = 11, tibia = 15;
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function mul(v, n) { return { x: v.x * n, y: v.y * n, z: v.z * n }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function length(v) { return Math.hypot(v.x, v.y, v.z); }
  function unit(v) { return mul(v, 1 / Math.max(.00001, length(v))); }
  function bodyHeight(walker) { return 7.8 + walker.stroke * .24; }
  function local(walker, x, y, z) {
    var p = walker.world(x, y);
    return walker.surface.sample(p.x, p.y, z, walker.time);
  }
  function solveLeg(walker, foot) {
    var height = bodyHeight(walker);
    var scale = walker.surface.scale;
    var upperLength = femur * scale, lowerLength = tibia * scale;
    var hip = local(walker, foot.hipX, foot.hipY, height);
    var coxa = local(walker, foot.hipX + .6, foot.hipY + foot.side * 2, height - .6);
    // The contact tip is taken directly from the world-space anchor, never
    // reconstructed from a moving parent or snapped to an approximate IK result.
    var tip = walker.surface.sample(foot.x, foot.y, foot.lift, walker.time);
    var normal = walker.surface.frame(foot.x, foot.y, walker.time).normal;
    var toHip = sub(coxa, tip);
    var inward = unit(sub(toHip, mul(normal, dot(toHip, normal))));
    var ankle = add(tip, add(mul(inward, 1.8 * scale), mul(normal, 1.2 * scale)));
    var span = sub(ankle, coxa), reach = length(span), direction = unit(span);
    var pole = sub(local(walker, foot.hipX + [4, 0, -4][foot.row], foot.side * 14, height + 8), coxa);
    var bend = unit(sub(pole, mul(direction, dot(pole, direction))));
    var along = (upperLength * upperLength - lowerLength * lowerLength + reach * reach) / (2 * Math.max(.001, reach));
    var altitude = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    var knee = add(coxa, add(mul(direction, along), mul(bend, altitude)));
    return { hip: hip, coxa: coxa, knee: knee, ankle: ankle, tip: tip,
      reachable: reach < upperLength + lowerLength && reach > Math.abs(upperLength - lowerLength) };
  }
  return { solveLeg: solveLeg, bodyHeight: bodyHeight, local: local, femur: femur, tibia: tibia };
}));
