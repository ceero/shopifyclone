import { L as CanvasTexture, In as LinearFilter, Qi as ShaderMaterial, Yi as SRGBColorSpace } from '../vendor/spring26/three.core-DVcoLpfz.js';

// Opening pass from the :4186 reference. The cover and incoming live scene are
// sampled in top-left viewport coordinates; Three's render textures use bottom-left UVs.
export function createOpeningMaterial(vertexShader) {
  const material = new ShaderMaterial({
    name: 'Mountain opening wipe',
    vertexShader, depthTest: false, depthWrite: false,
    uniforms: Object.fromEntries(['outgoing','incoming','progress','elapsed','time','speed','aspect','narrow','still']
      .map(name => [name,{value:null}])),
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D outgoing, incoming;
      uniform float progress, elapsed, time, speed, aspect, narrow, still;
      const float PI = 3.14159265;

      vec3 sampleFrame(sampler2D frame, vec2 uv) {
        return texture2D(frame, clamp(vec2(uv.x, 1.0-uv.y), 0.0, 1.0)).rgb;
      }
      void main() {
        vec2 uv = vec2(vUv.x, 1.0-vUv.y);
        float angle = mix(-.43633, -.105, narrow);
        vec2 dir = vec2(sin(angle), -cos(angle));
        float bend = clamp(speed, -.8, .8) * .07 * sin(PI*uv.x) * (1.-still);
        float position = .5 + dot(uv-.5 + vec2(0.,bend),dir)/(abs(dir.x)+abs(dir.y));
        float phase = (uv.x*cos(angle) - (1.-uv.y)*sin(angle)/aspect)*.7071;
        float scrollPhase = (1.+1.6*elapsed)/2.6;
        float hump = 1.-abs(2.*progress-1.);
        float swing = sin(2.*PI*(phase + time*.025 + scrollPhase*2.)) * mix(.102,.040,narrow) * hump * (1.-still);
        float feather = mix(.0625,.096,narrow);
        float edge = mix(-feather,1.+feather,progress) + swing;
        float mask = 1. - smoothstep(edge-feather,edge+feather,position);
        float lip = 1.-abs(2.*mask-1.);
        float shift = .076 * clamp((elapsed-.48125)/.1875,0.,1.);
        float sway = sin(2.*PI*(uv.x*1.3195+time*.05))*.095 * (.5-.5*cos(PI*mix(lip,hump,.1)));
        vec2 curl = (.5-uv)*(.05*lip*hump);
        vec2 from = uv+(vec2(0.,shift*(progress+3.*mask)-sway)+curl)*(1.-still);
        vec2 to = uv+(vec2(0.,shift*((progress-1.)+3.*(mask-1.))-sway)+curl)*(1.-still);
        vec3 color = mix(sampleFrame(outgoing,from),sampleFrame(incoming,to),mask);
        gl_FragColor = vec4(color*(1.+.22*lip*lip*(1.-still)),1.);
      }`
  });
  let texture, surface, textureWidth, textureHeight, version = -1;
  function release() {
    surface?.setGpuActive(false);
    surface = null;
    texture?.dispose();
    texture = null;
    version = -1;
    material.uniforms.outgoing.value = null;
    material.uniforms.incoming.value = null;
  }
  return {
    material,
    bind(next, incoming) {
      if (surface !== next) { release(); surface = next; }
      const plate = next.capture();
      if (!plate) return false;
      if (!texture || textureWidth !== plate.width || textureHeight !== plate.height) {
        texture?.dispose();
        texture = new CanvasTexture(plate);
        textureWidth = plate.width;
        textureHeight = plate.height;
        texture.colorSpace = SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = texture.magFilter = LinearFilter;
      }
      if (version !== next.version) { texture.needsUpdate = true; version = next.version; }
      const frame = next.frame;
      const u = material.uniforms;
      u.outgoing.value = texture;
      u.incoming.value = incoming;
      u.progress.value = frame.progress;
      u.elapsed.value = frame.elapsed;
      u.time.value = frame.time;
      u.speed.value = frame.speed;
      u.aspect.value = frame.width/frame.height;
      u.narrow.value = Number(frame.width <= 600);
      u.still.value = Number(frame.still);
      next.setGpuActive(true);
      return true;
    },
    release() { if (surface) release(); },
    dispose() { release(); material.dispose(); }
  };
}
