import * as THREE from "./vendor/three/three.module.min.js";
import "./grass-surface.js";
const leafTints = {
  dawn: new THREE.Color(0x9eaf68), noon: new THREE.Color(0x9eaf68),
  sunset: new THREE.Color(0xb1a15b), night: new THREE.Color(0x7791a0)
};
const leafMix = new THREE.Color();

// Curved, tapered ribbons with a shallow central fold, all in the insect's scene.
export class GrassField {
  constructor(scene) {
    this.surface = new window.GrassSurface(800, 800);
    this.blades = [];
    this.leafLighting = {
      leafSun: { value: new THREE.Vector3(0, .2, 1).normalize() },
      leafTint: { value: new THREE.Color(0x9eaf68) },
      leafStrength: { value: .16 }
    };
    this.group = new THREE.Group();
    scene.add(this.group);
    this.addBlade(this.surface, 0x526c49, 64, 8);
    [
      { rootX: -20, rootY: 70, span: 96, rise: 1.13, halfWidth: 9, depth: -45, phase: 1.2 },
      { rootX: 65, rootY: 90, span: 230, rise: .82, halfWidth: 13, depth: -30, phase: 2.7, tipHeight: 40 },
      { rootX: -78, rootY: 95, span: 58, rise: 1.06, halfWidth: 7, depth: -15, phase: 3.4 },
      { rootX: 110, rootY: 120, span: 195, rise: 1.02, halfWidth: 15, depth: 15, phase: 4.1, tipHeight: 65 },
      { rootX: 22, rootY: 118, span: 190, rise: .6, halfWidth: 17, depth: 20, phase: .8, tipHeight: 35 },
      { rootX: -135, rootY: 135, span: 52, rise: .65, halfWidth: 8, depth: 15, phase: 5.2 }
    ].forEach((options, i) => this.addBlade(new window.GrassSurface(800, 800, options), [0x5c7150, 0x677148, 0x3c5840][i % 3], 36, 4));
  }
  addBlade(surface, color, along, across) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((along + 1) * (across + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const colors = [], uvs = [], indices = [], tint = new THREE.Color(color);
    const dryTip = new THREE.Color(0x91916a), shade = new THREE.Color();
    for (let i = 0; i <= along; i++) for (let j = 0; j <= across; j++) {
      const edge = Math.abs(j / across * 2 - 1);
      const t = i / along;
      // Broad, irregular chlorophyll variation stays quiet after defocus.
      const light = .86 + .13 * edge + .07 * Math.sin(t * 9.3 + j * .63) + .035 * Math.sin(t * 23.7);
      shade.copy(tint).lerp(dryTip, t * t * .30 + edge * .05).multiplyScalar(light);
      colors.push(shade.r, shade.g, shade.b);
      uvs.push(t, j / across);
      if (i < along && j < across) {
        const n = i * (across + 1) + j;
        indices.push(n, n + across + 1, n + 1, n + 1, n + across + 1, n + across + 2);
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: .91, metalness: 0
    });
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.leafLighting);
      shader.vertexShader = `varying vec3 vLeafNormal; varying float vLeafEdge;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vLeafNormal = normalize(mat3(modelMatrix) * objectNormal);
        vLeafEdge = pow(abs(uv.y * 2. - 1.), .7);`);
      shader.fragmentShader = `varying vec3 vLeafNormal; varying float vLeafEdge;
        uniform vec3 leafSun, leafTint; uniform float leafStrength;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        // Thin-leaf light transmission, stronger toward the thinner margins.
        float leafBacklight = pow(clamp(.5 - .5 * dot(normalize(vLeafNormal), leafSun), 0., 1.), 1.2);
        outgoingLight += leafTint * leafBacklight * leafStrength * (.25 + .75 * vLeafEdge);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'thin-grass-v1';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.blades.push({ surface, mesh, along, across });
  }
  resize(width, height) {
    this.blades.forEach(blade => blade.surface.resize(width, height));
    this.update(0);
  }
  setBlend(weights, lightPosition) {
    this.leafLighting.leafSun.value.copy(lightPosition).normalize();
    const tint = this.leafLighting.leafTint.value.setRGB(0, 0, 0);
    for (const look of Object.keys(leafTints)) tint.add(leafMix.copy(leafTints[look]).multiplyScalar(weights[look]));
    this.leafLighting.leafStrength.value = .16 * (weights.dawn + weights.noon) + .27 * weights.sunset + .018 * weights.night;
  }
  update(time) {
    this.blades.forEach(({ surface, mesh, along, across }) => {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i <= along; i++) {
        const u = surface.length * i / along;
        for (let j = 0; j <= across; j++) {
          const v = (j / across * 2 - 1) * surface.halfWidth(u);
          const p = surface.sample(u, v, 0, time);
          positions.setXYZ(i * (across + 1) + j, p.x, p.y, p.z);
        }
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    });
  }
}
