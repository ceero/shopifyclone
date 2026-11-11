// The photograph branch of the port 4186 renderer. Positions, seeds, brush units,
// and point sizes use the same coordinate system on both rendering backends.
import { EditionFluid } from '../vendor/edition-template/EditionFluid.js';

const fieldSettings = {
  simSize: 128, splatRadius: .25, splatForce: .125,
  curl: 1.5, velocityDissipation: .965, pressure: .6,
};
const desktopLimit = 262144;
const phoneLimit = 85000;
const fallbackLimit = 4200;

function pointSamples(count) {
  let seed = 21;
  const samples = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    samples[3*i] = (.5 + i * .7548776662466927) % 1;
    samples[3*i+1] = (.5 + i * .5698402909980532) % 1;
    samples[3*i+2] = seed / 4294967296;
  }
  return samples;
}

const samplePhoto = `
  precision highp float;
  uniform sampler2D uPhoto;
  uniform vec4 uCrop;
  vec3 photoAt(vec2 uv) {
    return texture2D(uPhoto, clamp(uCrop.zw + uv*uCrop.xy, .001, .999)).rgb;
  }
`;
const baseVertex = `
  attribute vec2 aCorner;
  varying vec2 uv;
  void main() {
    uv = aCorner;
    gl_Position = vec4(uv * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
  }`;
const baseFragment = samplePhoto + `
  varying vec2 uv;
  void main() { gl_FragColor = vec4(photoAt(uv), 1.); }`;
const pointVertex = samplePhoto + `
  attribute vec3 aSample;
  uniform sampler2D uFluid;
  uniform float uTime, uPointSize;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec2 uv = aSample.xy;
    float s = aSample.z;
    vec3 color = photoAt(uv);
    float snow = smoothstep(.34, .82, dot(color, vec3(.23, .61, .16)));
    vec4 bytes = texture2D(uFluid, uv)*255.;
    vec2 velocity = vec2(dot(bytes.rg, vec2(1., 1./256.)), dot(bytes.ba, vec2(1., 1./256.))) - 128.;
    vec2 flow = clamp(velocity/12., -1., 1.);
    vec2 trail = vec2(cos(uv.y*9. + uTime*.56 + s*2.), sin(uv.x*7.1 + uTime*.6 + s*3.));
    vec2 p = uv + trail*(.0015 + .004*snow) + flow*(.045 + .12*snow);
    vColor = clamp(color + (s-.5)*.34, 0., 1.);
    vOpacity = .16 + .34*snow;
    gl_PointSize = clamp(uPointSize*(.25 + .84*s*s), .75, 2.6);
    gl_Position = vec4(p * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
  }`;
const pointFragment = `
  precision mediump float;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float coverage = 1. - smoothstep(.455, .50, length(gl_PointCoord - .5));
    gl_FragColor = vec4(vColor, coverage*vOpacity);
  }`;

function createGpuRenderer(canvas, photo) {
  // The opening wipe can sample the last finished frame from its own animation callback.
  const gl = canvas.getContext('webgl', {
    alpha:false, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:true,
  });
  if (!gl) return null;
  const programs = [], buffers = [], textures = [];
  function dispose() {
    for (const texture of textures) gl.deleteTexture(texture);
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program);
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  function pass(vertex, fragment, data, attribute, names) {
    const program = gl.createProgram();
    programs.push(program);
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex], [gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const buffer = gl.createBuffer();
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const uniforms = Object.fromEntries(names.map(name => [name,gl.getUniformLocation(program,name)]));
    return { program, buffer, attribute: gl.getAttribLocation(program,attribute), uniforms };
  }
  function texture(unit) {
    const value = gl.createTexture();
    textures.push(value);
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, value);
    for (const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, param, gl.CLAMP_TO_EDGE);
    for (const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, param, gl.LINEAR);
  }
  try {
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 2) { dispose(); return null; }
    const base = pass(baseVertex, baseFragment, new Float32Array([0,0,1,0,0,1,1,1]), 'aCorner', ['uPhoto','uCrop']);
    const points = pass(pointVertex, pointFragment, pointSamples(desktopLimit), 'aSample', ['uPhoto','uCrop','uFluid','uTime','uPointSize']);
    texture(gl.TEXTURE0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
    texture(gl.TEXTURE1);
    let gridWidth = 0, gridHeight = 0;
    function bind(pass, size, crop) {
      gl.useProgram(pass.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, pass.buffer);
      gl.enableVertexAttribArray(pass.attribute);
      gl.vertexAttribPointer(pass.attribute, size, gl.FLOAT, false, 0, 0);
      gl.uniform1i(pass.uniforms.uPhoto, 0);
      gl.uniform4fv(pass.uniforms.uCrop, crop);
    }
    return {
      kind:'webgl', dispose,
      draw({width, height, ratio, crop, fluid, time}) {
        if (fluid.width !== gridWidth || fluid.height !== gridHeight) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fluid.width, fluid.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluid.velocityPixels);
          gridWidth = fluid.width;
          gridHeight = fluid.height;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gridWidth, gridHeight, gl.RGBA, gl.UNSIGNED_BYTE, fluid.velocityPixels);
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        bind(base, 2, crop);
        gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(base.attribute);

        const count = Math.min(width <= 600 ? phoneLimit : desktopLimit, Math.ceil(width*height/4.8));
        bind(points, 3, crop);
        gl.uniform1i(points.uniforms.uFluid, 1);
        gl.uniform1f(points.uniforms.uTime, time);
        gl.uniform1f(points.uniforms.uPointSize, ratio * Math.min(2, Math.sqrt(width*height/count)));
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
        gl.drawArrays(gl.POINTS, 0, count);
        gl.disableVertexAttribArray(points.attribute);
      },
    };
  } catch {
    dispose();
    return null;
  }
}

function createCanvasRenderer(canvas, photo) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const samples = pointSamples(fallbackLimit);
  return {
    kind:'canvas2d', dispose() {},
    draw({width, height, ratio, crop, fluid, time, gaze}) {
      const [sw, sh, ox, oy] = crop;
      const iw = photo.naturalWidth, ih = photo.naturalHeight;
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.globalAlpha = 1;
      ctx.drawImage(photo, ox*iw, oy*ih, sw*iw, sh*ih, 0,0,width,height);
      ctx.globalAlpha = .29;
      const count = Math.min(fallbackLimit, Math.max(600, Math.round(width*height/210)));
      for (let i = 0; i < count; i++) {
        const x = samples[3*i], y = samples[3*i+1], seed = samples[3*i+2];
        const cell = Math.floor(y*fluid.height)*fluid.width + Math.floor(x*fluid.width);
        const px = x + .004*Math.sin(9*y + time*.55 + seed*5) + fluid.x[cell]*(.055 + seed*.11) - gaze.x*(seed-.4)*.023;
        const py = y + .004*Math.cos(8*x + time*.57 + seed*5) + fluid.y[cell]*(.055 + seed*.11) - gaze.y*(seed-.4)*.016;
        const size = .8 + seed*seed*1.95;
        ctx.drawImage(photo, (ox+x*sw)*iw, (oy+y*sh)*ih, 1,1,px*width,py*height,size,size);
      }
      ctx.globalAlpha = 1;
    },
  };
}

export function createCoverParticles(host, photo, refresh) {
  const fluid = new EditionFluid(2,2);
  let renderer, canvas, previousPointer, lastPaint = -Infinity;
  let attempted = false;

  function useFallback() {
    canvas?.removeEventListener('webglcontextlost', lost);
    renderer?.dispose();
    canvas = document.createElement('canvas');
    renderer = createCanvasRenderer(canvas, photo);
    host.replaceChildren(canvas);
    host.dataset.renderer = renderer?.kind || 'still';
    lastPaint = -Infinity;
  }
  function lost(event) {
    event.preventDefault();
    useFallback();
    refresh();
  }
  function reset() {
    previousPointer = null;
    lastPaint = -Infinity;
    fluid.reset();
  }
  return {
    reset, clearPointer() { previousPointer = null; },
    render({width, height, frame, gaze, time, now, dt, speed, scrollDelta, pointer, moving}) {
      if (!attempted) {
        attempted = true;
        canvas = document.createElement('canvas');
        renderer = createGpuRenderer(canvas, photo);
        if (renderer) {
          canvas.addEventListener('webglcontextlost', lost);
          host.replaceChildren(canvas);
          host.dataset.renderer = renderer.kind;
        } else useFallback();
      }
      if (!renderer) return null;
      const ratio = Math.min(devicePixelRatio || 1, 1.45, Math.sqrt(2100000/(width*height)));
      const w = Math.round(width*ratio), h = Math.round(height*ratio);
      const resized = w !== canvas.width || h !== canvas.height;
      if (resized) { canvas.width = w; canvas.height = h; previousPointer = null; }
      const sinceLastPaint = (now - lastPaint) / 1000;
      if (renderer.kind === 'canvas2d' && moving && !resized && !scrollDelta && sinceLastPaint < 1/30 - .001) return canvas;

      const step = Math.min(Number.isFinite(sinceLastPaint) ? sinceLastPaint : dt, 1/30);
      fluid.configure(fieldSettings, width, height);
      if (moving) {
        if (pointer && previousPointer && now-previousPointer.now < 80) {
          fluid.stroke(previousPointer, pointer, width, height, step);
        }
        if (Math.abs(scrollDelta) > .001 && Math.abs(scrollDelta) < .55) {
          fluid.impulse(.5, .57, scrollDelta*.4, -scrollDelta*2.5, .76);
        }
        fluid.step(step, speed);
      }
      previousPointer = moving && pointer ? {...pointer, now} : null;
      const imageWidth = photo.naturalWidth*frame.scale;
      const imageHeight = photo.naturalHeight*frame.scale;
      const crop = [width/imageWidth,height/imageHeight,-frame.left/imageWidth,-frame.top/imageHeight];
      renderer.draw({width,height,ratio,crop,fluid,time,gaze});
      lastPaint = now;
      return canvas;
    },
    dispose() {
      canvas?.removeEventListener('webglcontextlost', lost);
      renderer?.dispose();
      host.replaceChildren();
    },
  };
}
