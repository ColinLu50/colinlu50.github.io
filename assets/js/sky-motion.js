// Shared lighting and pointer state, advanced by the existing scene loop.
export const skyLooks = ['dawn', 'noon', 'sunset', 'night'];

export class SkyMotion {
  constructor(look = 'noon') {
    this.weights = { dawn: 0, noon: 0, sunset: 0, night: 0 };
    this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.select(look, true);
  }
  select(look, immediate = false) {
    if (!skyLooks.includes(look)) return;
    this.look = look;
    this.transitioning = this.weights[look] !== 1;
    if (immediate) this.finish();
  }
  finish() {
    for (const look of skyLooks) this.weights[look] = +(look === this.look);
    this.transitioning = false;
  }
  move(x, y) {
    this.pointer.targetX = Math.max(-1, Math.min(1, x)) * -14;
    this.pointer.targetY = Math.max(-1, Math.min(1, y)) * -9;
  }
  release(immediate = false) {
    this.pointer.targetX = this.pointer.targetY = 0;
    if (immediate) this.pointer.x = this.pointer.y = 0;
  }
  step(dt) {
    const lightingChanged = this.transitioning && dt > 0;
    if (lightingChanged) {
      const blend = 1 - Math.exp(-3 * dt);
      for (const look of skyLooks) {
        this.weights[look] += (+(look === this.look) - this.weights[look]) * blend;
      }
      if (1 - this.weights[this.look] < .002) this.finish();
    }
    const follow = 1 - Math.exp(-3.8 * dt);
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * follow;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * follow;
    return lightingChanged;
  }
}
