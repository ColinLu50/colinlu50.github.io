import * as THREE from "./vendor/three/three.module.min.js";
import "./ant-kinematics.js";
import { GrassField } from "./grass-field.js?v=20260920-light-motion";

const rig = window.AntKinematics;
const up = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();
const point = new THREE.Vector3();
const basis = new THREE.Matrix4();
const axisX = new THREE.Vector3(), axisY = new THREE.Vector3(), axisZ = new THREE.Vector3();
const spin = new THREE.Quaternion();
const normalAxis = new THREE.Vector3(0, 0, 1);
const lightMix = new THREE.Color();
const lightLooks = {
  dawn: { color: 0xffd6ad, intensity: 2.1, position: [-150, 80, 85], sky: 0xd0dfe8, ambient: 2.1 },
  noon: { color: 0xfff5e8, intensity: 2.3, position: [0, 20, 190], sky: 0xd0dfe8, ambient: 2.1 },
  sunset: { color: 0xffc795, intensity: 2.35, position: [150, 80, 65], sky: 0xd5ced0, ambient: 2.1 },
  night: { color: 0xb5c9f3, intensity: .75, position: [70, 60, 180], sky: 0x9caccc, ambient: 1.2 }
};
for (const light of Object.values(lightLooks)) {
  light.color = new THREE.Color(light.color);
  light.sky = new THREE.Color(light.sky);
  light.position = new THREE.Vector3(...light.position);
}

// Original procedural mesh: no image atlas, billboards, or reference-site assets.
export class AntRenderer {
  constructor(canvas, { debug = false } = {}) {
    this.debug = debug;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.grass = new GrassField(this.scene);
    this.camera = new THREE.PerspectiveCamera(12, 1, 10, 3000);
    this.camera.up.set(0, 0, 1);
    this.body = new THREE.Group();
    this.insect = new THREE.Group();
    this.insect.add(this.body);
    this.scene.add(this.insect);
    this.shell = new THREE.MeshStandardMaterial({ color: 0x252922, roughness: .67, metalness: 0 });
    this.limb = new THREE.MeshStandardMaterial({ color: 0x34382b, roughness: .78 });
    this.eye = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: .28 });
    this.sphere = new THREE.SphereGeometry(1, 20, 14);
    this.bone = new THREE.CylinderGeometry(.7, 1, 1, 7);
    this.hemisphere = new THREE.HemisphereLight(0xd0dfe8, 0x394332, 2.1);
    this.key = new THREE.DirectionalLight(0xffe4bb, 3);
    this.key.position.set(-100, 100, 180);
    this.scene.add(this.hemisphere, this.key);
    this.ellipsoid(this.body, [-17, 0, .5], [9.5, 5.7, 5.2], this.shell).rotation.y = -.1;
    this.ellipsoid(this.body, [-6, 0, 0], [2, 1.5, 2.1], this.shell);
    this.ellipsoid(this.body, [-3, 0, .5], [2.5, 1.7, 2.4], this.shell);
    this.ellipsoid(this.body, [2, 0, .4], [7, 3.1, 3.4], this.shell).rotation.y = -.08;
    this.head = new THREE.Group();
    this.head.position.set(11, 0, .6);
    this.body.add(this.head);
    this.ellipsoid(this.head, [2.3, 0, 0], [5.3, 4.3, 3.9], this.shell);
    for (const side of [-1, 1]) {
      this.ellipsoid(this.head, [3, side * 3.7, 1.2], [1, .6, 1], this.eye);
      const jaw = this.ellipsoid(this.head, [7.1, side * 1.6, -.7], [2.2, .75, .8], this.limb);
      jaw.rotation.z = -side * .32;
    }
    this.legs = Array.from({ length: 6 }, () => ({
      bones: [.7, .65, .43, .23].map(radius => this.segment(this.insect, radius)),
      joints: [.65, .48].map(radius => this.ellipsoid(this.insect, [0, 0, 0], [radius, radius, radius], this.limb))
    }));
    this.antennae = [-1, 1].map(side => ({ side, bones: [.24, .17].map(radius => this.segment(this.head, radius)) }));
    this.makeShadows();
    this.target = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1), samples: 2 });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.focusOffset = 220;
    this.blurTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.postMaterial = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        colorMap: { value: this.target.texture }, depthMap: { value: this.target.depthTexture },
        resolution: { value: new THREE.Vector2(1, 1) }, focus: { value: 1000 },
        near: { value: this.camera.near }, far: { value: this.camera.far },
        pixelRatio: { value: this.renderer.getPixelRatio() }, minBlur: { value: 7 },
        maxBlur: { value: 18 }
      },
      vertexShader: `varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D colorMap, depthMap;
        uniform vec2 resolution;
        uniform float focus, near, far, pixelRatio, minBlur, maxBlur;
        float viewDepth(float z) { return near * far / (far - z * (far - near)); }
        void main() {
          vec2 stepSize = pixelRatio / resolution;
          vec4 sum = vec4(0.);
          // Gather each source pixel's aperture footprint. Empty pixels do not
          // invent their own blur radius, and there is no sharp center copy.
          for (int i = 0; i < 72; i++) {
            float fi = float(i) + .5;
            float distance = sqrt(fi / 72.) * maxBlur;
            float theta = fi * 2.39996323;
            vec2 uv = vUv + vec2(cos(theta), sin(theta)) * distance * stepSize;
            vec4 source = texture2D(colorMap, uv);
            float raw = texture2D(depthMap, uv).x;
            float radius = clamp(abs(viewDepth(raw) - focus) * .043, minBlur, maxBlur);
            float coverage = 1. - smoothstep(radius - 1., radius + 1., distance);
            float areaWeight = maxBlur * maxBlur / (radius * radius);
            sum += source * coverage * areaWeight;
          }
          gl_FragColor = sum / 72.;
          if (gl_FragColor.a > 1.) gl_FragColor /= gl_FragColor.a;
        }`
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial));
    this.resolveScene = new THREE.Scene();
    this.resolveMaterial = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { blurred: { value: this.blurTarget.texture }, texel: { value: new THREE.Vector2(1, 1) } },
      vertexShader: this.postMaterial.vertexShader,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D blurred;
        uniform vec2 texel;
        void main() {
          // Resolve the half-resolution aperture samples in linear, premultiplied
          // color, then encode for the page only once. No dark alpha fringes.
          vec4 color = vec4(0.);
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            float weight = (x == 0 ? 2. : 1.) * (y == 0 ? 2. : 1.);
            color += texture2D(blurred, vUv + vec2(float(x), float(y)) * texel) * weight;
          }
          gl_FragColor = color / 16.;
          gl_FragColor.rgb /= max(gl_FragColor.a, .00001);
          #include <colorspace_fragment>
          gl_FragColor.rgb *= gl_FragColor.a;
        }`
    });
    this.resolveScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.resolveMaterial));
    if (debug) this.makeContactMarkers();
  }

  ellipsoid(parent, position, scale, material) {
    const mesh = new THREE.Mesh(this.sphere, material);
    mesh.position.fromArray(position); mesh.scale.fromArray(scale);
    parent.add(mesh);
    return mesh;
  }
  segment(parent, radius) {
    const mesh = new THREE.Mesh(this.bone, this.limb);
    mesh.userData.radius = radius;
    parent.add(mesh);
    return mesh;
  }
  connect(mesh, start, end, scale = 1) {
    mesh.position.set((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
    direction.set(end.x - start.x, end.y - start.y, end.z - start.z);
    mesh.scale.set(mesh.userData.radius * scale, direction.length(), mesh.userData.radius * scale);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  makeShadows() {
    // Height-dependent contact shadows are separate ground meshes. Their centers
    // never follow a body parent, and lifting a foot softens its own shadow.
    const pixels = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
      const i = (y * 32 + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 20;
      pixels[i + 3] = Math.round(Math.pow(Math.max(0, 1 - r), 2) * 255);
    }
    const texture = new THREE.DataTexture(pixels, 32, 32);
    texture.needsUpdate = true;
    this.shadows = Array.from({ length: 7 }, () => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
        map: texture, transparent: true, opacity: .22, depthWrite: false
      }));
      mesh.renderOrder = -1;
      this.scene.add(mesh);
      return mesh;
    });
  }
  makeContactMarkers() {
    this.markers = Array.from({ length: 6 }, () => {
      const marker = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.1, 24), new THREE.MeshBasicMaterial({ color: 0x008a68, side: THREE.DoubleSide }));
      marker.position.z = .04;
      this.scene.add(marker);
      return marker;
    });
  }
  resize(width, heroHeight, bandHeight = 220) {
    this.width = width; this.heroHeight = heroHeight; this.bandHeight = bandHeight;
    this.renderer.setSize(width, bandHeight, false);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target.setSize(size.x, size.y);
    this.blurTarget.setSize(Math.ceil(size.x / 2), Math.ceil(size.y / 2));
    this.resolveMaterial.uniforms.texel.value.set(1 / this.blurTarget.width, 1 / this.blurTarget.height);
    this.postMaterial.uniforms.resolution.value.copy(size);
    const distance = bandHeight / (2 * Math.tan(THREE.MathUtils.degToRad(6)));
    this.camera.aspect = width / bandHeight;
    this.camera.position.set(width / 2, -(heroHeight - bandHeight / 2) - distance * .6, distance * .8);
    this.camera.lookAt(width / 2, -(heroHeight - bandHeight / 2), 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.grass.resize(width, heroHeight);
  }
  project(position) {
    point.set(position.x, position.y, position.z).project(this.camera);
    return { x: (point.x + 1) * this.width / 2,
      y: this.heroHeight - this.bandHeight + (1 - point.y) * this.bandHeight / 2 };
  }
  setLook(look) {
    this.setBlend(Object.fromEntries(Object.keys(lightLooks).map(key => [key, +(key === look)])));
  }
  setBlend(weights) {
    this.key.color.setRGB(0, 0, 0); this.key.intensity = 0;
    this.key.position.set(0, 0, 0);
    this.hemisphere.color.setRGB(0, 0, 0); this.hemisphere.intensity = 0;
    for (const [look, light] of Object.entries(lightLooks)) {
      const weight = weights[look];
      this.key.color.add(lightMix.copy(light.color).multiplyScalar(weight));
      this.key.intensity += light.intensity * weight;
      this.key.position.addScaledVector(light.position, weight);
      this.hemisphere.color.add(lightMix.copy(light.sky).multiplyScalar(weight));
      this.hemisphere.intensity += light.ambient * weight;
    }
    this.grass.setBlend(weights, this.key.position);
  }
  orientToLeaf(object, walker, u, v, angle = 0) {
    const frame = walker.surface.frame(u, v, walker.time);
    basis.makeBasis(axisX.copy(frame.tangent), axisY.copy(frame.across), axisZ.copy(frame.normal));
    object.quaternion.setFromRotationMatrix(basis);
    object.quaternion.multiply(spin.setFromAxisAngle(normalAxis, -angle));
  }
  shadowPose(mesh, walker, u, v, angle = 0) {
    mesh.position.copy(walker.surface.sample(u, v, .12, walker.time));
    this.orientToLeaf(mesh, walker, u, v, angle);
  }
  render(walker, focused, dt = 1 / 30) {
    this.grass.update(walker.time);
    this.insect.visible = walker.state !== "away";
    this.shadows.forEach(mesh => { mesh.visible = this.insect.visible; });
    if (this.markers) this.markers.forEach(mesh => { mesh.visible = this.insect.visible; });
    const height = rig.bodyHeight(walker);
    const scale = walker.surface.scale;
    this.body.position.copy(rig.local(walker, 0, 0, height));
    this.body.scale.setScalar(scale);
    this.orientToLeaf(this.body, walker, walker.x, walker.y, walker.angle);
    this.head.rotation.z = -walker.headAngle();
    const flinch = walker.state === "startled" ? Math.sin(Math.min(1, (walker.time - walker.actionStart) / .16) * Math.PI) : 0;
    this.head.rotation.y = Math.sin(walker.time * 2.3) * .025 - flinch * .18;
    this.legs.forEach((leg, i) => {
      const foot = walker.feet[i], pose = rig.solveLeg(walker, foot);
      const chain = [pose.hip, pose.coxa, pose.knee, pose.ankle, pose.tip];
      leg.bones.forEach((bone, j) => this.connect(bone, chain[j], chain[j + 1], scale));
      leg.joints[0].position.copy(pose.coxa);
      leg.joints[1].position.copy(pose.knee);
      leg.joints[0].scale.setScalar(.65 * scale);
      leg.joints[1].scale.setScalar(.48 * scale);
      const shadow = this.shadows[i];
      this.shadowPose(shadow, walker, foot.x, foot.y);
      shadow.scale.setScalar((1.5 + foot.lift * .32) * scale);
      shadow.material.opacity = .26 / (1 + foot.lift * .65);
      if (this.markers) {
        this.shadowPose(this.markers[i], walker, foot.x, foot.y);
        this.markers[i].scale.setScalar(scale);
        this.markers[i].visible = this.debug && this.insect.visible && foot.planted;
      }
    });
    const bodyShadow = this.shadows[6];
    this.shadowPose(bodyShadow, walker, walker.x - 5 * Math.cos(walker.angle), walker.y - 5 * Math.sin(walker.angle), walker.angle);
    bodyShadow.scale.set(26 * scale, 12 * scale, 1);
    this.antennae.forEach(({ side, bones }) => {
      const alert = !walker.reacting && (/probing|grooming/.test(walker.state) || walker.attentive);
      const sweep = Math.sin(walker.time * (alert ? 4.2 : 2.1) + side * 1.7) * (alert ? .45 : .18);
      const start = { x: 5.3, y: side * 2.5, z: 1.8 };
      const elbow = { x: 11, y: side * (6 + sweep * 3), z: 3.4 + Math.sin(walker.time * 2 + side) };
      const tip = { x: 19 + Math.cos(sweep) * 2, y: side * (7 + sweep * 8), z: .5 + Math.sin(walker.time * 2.8 + side) * 1.6 };
      elbow.x -= flinch * 2; tip.x -= flinch * 5; tip.z += flinch * 2;
      this.connect(bones[0], start, elbow); this.connect(bones[1], elbow, tip);
    });
    this.focusOffset += ((focused ? 180 : 220) - this.focusOffset) * (1 - Math.exp(-dt * 2.8));
    // Keep focus stable even when the insect disappears. Grass is always drawn.
    point.copy(this.grass.surface.sample(this.grass.surface.length * .38, 0, height, walker.time));
    point.applyMatrix4(this.camera.matrixWorldInverse);
    this.postMaterial.uniforms.focus.value = -point.z + this.focusOffset;
    const projected = this.project(this.body.position);
    const scissor = this.camera.zoom === 1 ?
      [Math.max(0, this.width - this.grass.surface.span - 150), 0, this.grass.surface.span + 150, this.bandHeight] :
      [0, 0, this.width, this.bandHeight];
    // The camera and surface stay fixed; only raster work is limited to the grass.
    this.renderer.setScissorTest(false);
    this.renderer.setRenderTarget(this.debug ? null : this.target);
    this.renderer.clear();
    if (!this.debug) {
      this.renderer.setScissor(...scissor);
      this.renderer.setScissorTest(true);
    }
    this.renderer.render(this.scene, this.camera);
    if (!this.debug) {
      this.renderer.setRenderTarget(this.blurTarget);
      this.renderer.setScissorTest(false);
      this.renderer.clear();
      this.renderer.setScissor(...scissor.map(value => value / 2));
      this.renderer.setScissorTest(true);
      this.renderer.render(this.postScene, this.postCamera);
      this.renderer.setRenderTarget(null);
      this.renderer.setScissorTest(false);
      this.renderer.clear();
      this.renderer.setScissor(...scissor);
      this.renderer.setScissorTest(true);
      this.renderer.render(this.resolveScene, this.postCamera);
    }
    this.renderer.setScissorTest(false);
    return projected;
  }
}
