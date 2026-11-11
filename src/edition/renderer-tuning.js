import { so as WebGLRenderTarget } from '../vendor/spring26/three.core-DVcoLpfz.js';

// Every chapter scene draws into the pipeline's offscreen targets, where Three
// selects linear, un-tone-mapped shader variants. Warm-up code calls
// compileAsync() while the canvas itself is bound, which prepares the
// tone-mapped screen variant instead. The first real draw then linked a second
// program synchronously, freezing the main thread for hundreds of milliseconds
// as each chapter scrolled into view. Compiling against an offscreen target lets
// the browser finish those programs in parallel before they are used.
const tuned = new WeakMap();

export function tuneOffscreenRenderer(gl) {
  if (tuned.has(gl)) return tuned.get(gl);
  const checkShaderErrors = gl.debug.checkShaderErrors;
  // The checks call getProgramInfoLog, which blocks until the program links.
  if (import.meta.env.PROD) gl.debug.checkShaderErrors = false;
  const probe = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  const compile = gl.compile;
  gl.compile = function compileForOffscreen(scene, camera, target) {
    if (this.getRenderTarget() !== null) return compile.call(this, scene, camera, target);
    this.setRenderTarget(probe);
    try {
      return compile.call(this, scene, camera, target);
    } finally {
      this.setRenderTarget(null);
    }
  };
  const restore = () => {
    if (tuned.get(gl) !== restore) return;
    tuned.delete(gl);
    gl.compile = compile;
    gl.debug.checkShaderErrors = checkShaderErrors;
    probe.dispose();
  };
  tuned.set(gl, restore);
  return restore;
}
