import * as THREE from "./vendor/three/three.module.min.js";

// A realtime sky with two moving cloud decks and clearings around the copy.
// Colors below are display RGB; this full-screen shader writes them directly.
const looks = {
  dawn: { top: 0xa6becd, horizon: 0xf0d4b8, shadow: 0x909eaf, cloud: 0xffeed8, sun: 0xffe5b6 },
  noon: { top: 0x92b5cf, horizon: 0xd5e1e7, shadow: 0x8399ad, cloud: 0xfafaf5, sun: 0xfff7df },
  sunset: { top: 0xaab6ca, horizon: 0xeec4a4, shadow: 0x8d96a9, cloud: 0xffe3bd, sun: 0xffdda0 },
  night: { top: 0x172940, horizon: 0x34465c, shadow: 0x2b3b50, cloud: 0x778898, sun: 0xe6e8df }
};
const rgb = n => new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
const colors = Object.fromEntries(Object.entries(looks).map(([look, palette]) =>
  [look, Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, rgb(color)]))]));
const colorUniforms = [['skyTop','top'],['skyHorizon','horizon'],['cloudShade','shadow'],['cloudLight','cloud'],['sunTint','sun']];

export class SkyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.time = 0;
    this.look = "noon";
    this.weights = { dawn: 0, noon: 1, sunset: 0, night: 0 };
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "low-power" });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      resolution: { value: new THREE.Vector2(1, 1) },
      frameSize: { value: new THREE.Vector2(1, 1) },
      drift: { value: 0 }, pointer: { value: new THREE.Vector2() },
      skyTop: { value: rgb(looks.noon.top) }, skyHorizon: { value: rgb(looks.noon.horizon) },
      cloudShade: { value: rgb(looks.noon.shadow) }, cloudLight: { value: rgb(looks.noon.cloud) },
      sunTint: { value: rgb(looks.noon.sun) }, sunPoint: { value: new THREE.Vector2(.8, .15) },
      sunRadius: { value: 12 }, night: { value: 0 }, dusk: { value: 0 },
      clearings: { value: Array.from({ length: 12 }, () => new THREE.Vector4(-1, -1, -1, -1)) },
      clearingCount: { value: 0 }
    };
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: this.uniforms,
      vertexShader: `varying vec2 uvScreen;
        void main() { uvScreen=uv; gl_Position=vec4(position.xy,0.,1.); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 uvScreen;
        uniform vec2 resolution, frameSize, pointer, sunPoint;
        uniform vec3 skyTop, skyHorizon, cloudShade, cloudLight, sunTint;
        uniform float drift, sunRadius, night, dusk;
        uniform vec4 clearings[12];
        uniform int clearingCount;

        float randomAt(vec2 p) {
          vec3 a=fract(vec3(p.x,p.y,p.x)*.1031);
          a+=dot(a,a.yzx+33.33);
          return fract((a.x+a.y)*a.z);
        }
        float noiseAt(vec2 p) {
          vec2 cell=floor(p), f=fract(p);
          f=f*f*f*(f*(f*6.-15.)+10.);
          return mix(mix(randomAt(cell),randomAt(cell+vec2(1,0)),f.x),
                     mix(randomAt(cell+vec2(0,1)),randomAt(cell+vec2(1,1)),f.x),f.y);
        }
        float cloudNoise(vec2 p) {
          float v=0., a=.52;
          mat2 turn=mat2(.8,-.6,.6,.8);
          for(int i=0;i<5;i++) { v+=a*noiseAt(p); p=turn*p*2.07+vec2(13.7,7.3); a*=.48; }
          return v;
        }
        float distanceToBox(vec2 p,vec4 box) {
          vec2 halfSize=(box.zw-box.xy)*.5;
          float radius=min(18.,min(halfSize.x,halfSize.y));
          vec2 d=abs(p-(box.xy+box.zw)*.5)-halfSize+radius;
          return length(max(d,0.))+min(max(d.x,d.y),0.)-radius;
        }
        float textClearing(vec2 pixel) {
          // Reading regions stay anchored to the page as cloud layers move.
          pixel+=(vec2(noiseAt(pixel/110.+7.),noiseAt(pixel/110.+29.))-.5)*16.;
          float d=100000.;
          for(int i=0;i<12;i++) {
            if(i>=clearingCount) break;
            d=min(d,distanceToBox(pixel,clearings[i]));
          }
          return 1.-smoothstep(0.,min(85.,frameSize.x*.13),d);
        }
        vec4 cloudDeck(vec2 p,float scale,vec2 offset,float shelter,vec2 lightDirection) {
          p=p*scale+offset;
          vec2 warp=vec2(noiseAt(p*.47+5.),noiseAt(p*.47+37.))-.5;
          float field=cloudNoise(p+warp*.65);
          // The clearing changes where clouds form, preserving their color
          // and their relief elsewhere. No opaque wash is composited over them.
          float threshold=mix(.535,.83,shelter);
          float body=smoothstep(threshold,threshold+.18,field);
          float edge=smoothstep(threshold-.04,threshold+.07,field);
          float towardLight=cloudNoise(p+warp*.65+lightDirection*.11);
          float relief=clamp(.76+(field-towardLight)*3.6-body*.12,.22,1.);
          vec3 color=mix(cloudShade,cloudLight,relief);
          color=mix(color,cloudLight,(edge-body)*.27);
          return vec4(color,clamp(body*.87+edge*.22,0.,.98));
        }
        float gaussian(float distance,float width) {
          float x=distance/width;
          return exp(-x*x);
        }
        vec3 scatterLight(vec3 sky,vec3 tint,float strength) {
          // Light approaches white gently instead of clipping RGB channels.
          return sky+(1.-sky)*tint*strength;
        }
        vec4 moonSurface(vec2 point,float softEdge) {
          vec2 q=point/sunRadius;
          float radius=length(q);
          float z=sqrt(max(0.,1.-dot(q,q)));
          vec3 normal=vec3(q,z);
          float illumination=dot(normal,normalize(vec3(-.76,-.43,.48)));
          float phase=smoothstep(-.16,.64,illumination);
          // The dark hemisphere disappears into this exact patch of sky.
          // No painted shadow disc, outline, or sharp cutout crescent.
          phase*=smoothstep(-.62,.36,dot(q,normalize(vec2(-.85,-.53))));
          float limb=1.-smoothstep(1.-softEdge/sunRadius,1.+softEdge/sunRadius,radius);
          vec2 terrain=q*2.5+vec2(z*.65,-z*.45);
          float plains=smoothstep(.34,.66,cloudNoise(terrain+11.));
          float highlands=cloudNoise(terrain*2.2+37.);
          float regolith=noiseAt(terrain*10.+71.)-.5;
          float texture=.96-plains*.24+highlands*.10+regolith*.018;
          vec3 stone=mix(vec3(.70,.71,.69),vec3(.87,.855,.79),smoothstep(.0,.85,illumination));
          return vec4(stone*texture,phase*limb*.94);
        }
        void main() {
          vec2 uv=vec2(uvScreen.x,1.-uvScreen.y);
          vec2 pixel=uv*frameSize;
          vec2 skyUV=uv+pointer*.22/frameSize;
          float horizon=pow(clamp(skyUV.y,0.,1.),.8);
          vec3 color=mix(skyTop,skyHorizon,horizon);
          vec2 toSun=(skyUV-sunPoint)*frameSize;
          float sunDistance=length(toSun);
          // Three optical scales: a soft core, aureole, and broad atmosphere.
          // The halo is restrained at night and warmer near sunset.
          float aureole=gaussian(sunDistance,sunRadius*3.1);
          float atmosphere=gaussian(sunDistance,sunRadius*8.5);
          float broadLight=aureole*mix(.23,.045,night)+atmosphere*mix(.11+dusk*.08,.018,night);
          color=scatterLight(color,sunTint,broadLight);

          if(night>.001) {
            vec2 starGrid=skyUV*frameSize/45.;
            vec2 starCell=floor(starGrid);
            vec2 starPosition=vec2(randomAt(starCell+4.),randomAt(starCell+81.))*.76+.12;
            float star=1.-smoothstep(.008,.032,length(fract(starGrid)-starPosition));
            color+=vec3(.48,.53,.6)*star*step(.85,randomAt(starCell+19.))*(1.-uv.y*.55)*night;
          }

          // Resolve edges in CSS pixels, even on the downsampled tall canvas.
          float pixelFootprint=max(frameSize.x/resolution.x,frameSize.y/resolution.y);
          float softEdge=max(pixelFootprint*.8,mix(2.6,1.35,night));
          if(night<.999) {
            float disc=1.-smoothstep(sunRadius-softEdge,sunRadius+softEdge,sunDistance);
            float center=gaussian(sunDistance,sunRadius*.86);
            vec3 surface=mix(sunTint,vec3(1.,.995,.97),center*.75);
            color=mix(color,surface,disc*.93*(1.-night));
            color=scatterLight(color,sunTint,gaussian(sunDistance,sunRadius*1.7)*.14*(1.-night));
          }
          if(night>.001 && sunDistance<sunRadius+softEdge) {
            vec4 moon=moonSurface(toSun,softEdge);
            color=mix(color,moon.rgb,moon.a*night);
          }

          float shelter=textClearing(pixel);
          // A stable virtual frame lets the viewport reveal another portion
          // of the sky, instead of stretching cloud shapes on tall screens.
          float sceneHeight=min(frameSize.y,max(640.,frameSize.x*.66));
          vec2 fieldPoint=vec2((uv.x-.5)*frameSize.x/sceneHeight,uv.y*frameSize.y/sceneHeight);
          fieldPoint*=4.1;
          vec2 parallax=pointer/sceneHeight*4.1;
          vec2 sunDirection=normalize(vec2(sunPoint.x-.5,.6));
          vec4 farCloud=cloudDeck(fieldPoint+parallax*.45,1.45,vec2(18.2,5.7)+vec2(drift*.0016,drift*.0005),shelter,sunDirection);
          vec4 nearCloud=cloudDeck(fieldPoint+parallax*1.15,.91,vec2(3.4,10.6)+vec2(drift*.0025,drift*.0008),shelter,sunDirection);
          // Thin cloud crosses the light rather than leaving a circular hole.
          // Forward scattering brightens only the cloud near the light source.
          float solarOpening=1.-gaussian(sunDistance,sunRadius*4.5)*.55;
          float throughCloud=gaussian(sunDistance,sunRadius*3.8)*mix(.26,.10,night);
          farCloud.rgb=scatterLight(farCloud.rgb,sunTint,throughCloud*(1.-farCloud.a*.65));
          nearCloud.rgb=scatterLight(nearCloud.rgb,sunTint,throughCloud*(1.-nearCloud.a*.65));
          color=mix(color,mix(farCloud.rgb,skyHorizon,.20),farCloud.a*.66*solarOpening);
          color=mix(color,nearCloud.rgb,nearCloud.a*.88*solarOpening);
          float grain=(randomAt(gl_FragCoord.xy)-.5)/255.;
          gl_FragColor=vec4(color+grain,1.);
        }`
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }
  setLook(look) {
    this.look = look;
    this.setBlend(Object.fromEntries(Object.keys(looks).map(key => [key, +(key === look)])));
  }
  setBlend(weights) {
    this.weights = weights;
    for (const [uniform, key] of colorUniforms) {
      const color = this.uniforms[uniform].value.set(0, 0, 0);
      for (const look of Object.keys(looks)) color.addScaledVector(colors[look][key], weights[look]);
    }
    this.uniforms.night.value = weights.night;
    this.uniforms.dusk.value = weights.sunset + weights.dawn * .5;
    this.positionSun();
  }
  positionSun() {
    if (!this.width) return;
    const portrait = this.width < 768;
    const points = portrait ? { dawn: [.18, 87], noon: [.71, 48], sunset: [.82, 96], night: [.79, 67] } :
      { dawn: [.19, 64], noon: [.78, Math.min(96,this.sunFloor)], sunset: [.90, this.sunFloor], night: [.86, Math.min(126,this.sunFloor)] };
    let x = 0, y = 0, radius = 0;
    for (const look of Object.keys(looks)) {
      const weight = this.weights[look];
      x += points[look][0] * weight;
      y += points[look][1] * weight;
      radius += (look === 'noon' ? 15 : look === 'night' ? 25 : 21) * weight;
    }
    this.uniforms.sunPoint.value.set(x,y/this.height);
    this.uniforms.sunRadius.value = radius * (portrait ? .88 : 1);
  }
  resize(width, height, boxes, portraitTop = 260, viewportHeight = height) {
    this.width = width; this.height = height;
    // Keep the sun in the visible opening above the portrait, even when a
    // long biography makes the hero taller than the browser viewport.
    this.sunFloor = Math.max(64,Math.min(portraitTop-55,viewportHeight-170,210));
    const scale = Math.min(1, 1200/width, 1000/height);
    const w = Math.max(1,Math.round(width*scale)), h = Math.max(1,Math.round(height*scale));
    this.renderer.setSize(w,h,false);
    this.uniforms.resolution.value.set(w,h);
    this.uniforms.frameSize.value.set(width,height);
    this.uniforms.clearingCount.value = Math.min(boxes.length,12);
    boxes.slice(0,12).forEach((r,i) => this.uniforms.clearings.value[i].set(r.left-8,r.top-5,r.right+8,r.bottom+5));
    this.positionSun();
  }
  render(dt = 0, pointer = { x: 0, y: 0 }) {
    this.time += dt;
    this.uniforms.drift.value = this.time;
    this.uniforms.pointer.value.set(pointer.x,pointer.y);
    this.renderer.render(this.scene,this.camera);
    this.canvas.hidden = false;
  }
  dispose() {
    this.scene.children[0].geometry.dispose(); this.material.dispose(); this.renderer.dispose();
  }
}
