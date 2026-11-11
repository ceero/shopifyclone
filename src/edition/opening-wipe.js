// The DOM cover and the chapter renderer share the same scroll position and outgoing frame.
export const openingSurfaces = new WeakMap();
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);

export function createOpeningSurface(stage, photo, title, canvas, arrival, requestPaint) {
  const section = stage.closest('section');
  const plate = document.createElement('canvas');
  const context = plate.getContext('2d');
  const mask = document.createElement('canvas');
  mask.width = 96;
  mask.height = 128;
  const maskContext = mask.getContext('2d');
  const fallback = canvas.getContext('2d');
  let frame, currentVersion = 0, paintedVersion = -1, shade, lastWidth, lastHeight;
  let gpuActive = false, disposed = false;

  function update(next) {
    frame = next;
    currentVersion++;
    const active = next.progress > 0 && next.progress < 1;
    section.toggleAttribute('data-opening-wipe', active);
    section.style.setProperty('--opening-controls', next.tint);
    stage.style.setProperty('--opening-tint', next.tint);
    title.style.opacity = next.titleOpacity;
    if (!active || gpuActive || !fallback || !arrival.naturalWidth) {
      canvas.hidden = true;
      return;
    }
    // Canvas fallback uses the reference's column mask on devices without a live 3D scene.
    const outgoing = capture();
    if (!outgoing) return;
    const {width, height, progress, elapsed, time, still} = frame;
    const w = outgoing.width, h = outgoing.height;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const narrow = width <= 600;
    const angle = narrow ? -.105 : -.43633;
    const dx = Math.sin(angle), dy = -Math.cos(angle), norm = Math.abs(dx) + Math.abs(dy);
    const feather = narrow ? .096 : .0625;
    const shift = still ? 0 : .076 * h * clamp((elapsed - .475) / .225);
    const scale = Math.max(w / arrival.naturalWidth, h / arrival.naturalHeight);
    const imageWidth = arrival.naturalWidth * scale, imageHeight = arrival.naturalHeight * scale;
    maskContext.clearRect(0, 0, mask.width, mask.height);
    for (let col = 0; col < mask.width; col++) {
      const x = (col + .5) / mask.width;
      const phase = x * .707 + time * .025 + 2 * (1 + elapsed * 1.6) / 2.6;
      const wave = still ? 0 : Math.sin(2 * Math.PI * phase) * (narrow ? .04 : .102) * (1 - Math.abs(2 * progress - 1));
      const edge = (1 + 2 * feather) * progress - feather + wave;
      const y = .5 + ((edge - .5) * norm - (x - .5) * dx) / dy;
      const half = feather * norm / Math.abs(dy);
      const gradient = maskContext.createLinearGradient(0, (y - half) * mask.height, 0, (y + half) * mask.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'black');
      maskContext.fillStyle = gradient;
      maskContext.fillRect(col, 0, 1, mask.height);
    }
    fallback.globalCompositeOperation = 'copy';
    fallback.drawImage(arrival, (w-imageWidth)/2, (h-imageHeight)/2, imageWidth, imageHeight + shift*(1-progress));
    fallback.globalCompositeOperation = 'destination-in';
    fallback.drawImage(mask, 0, 0, w, h);
    fallback.globalCompositeOperation = 'destination-over';
    fallback.drawImage(outgoing, 0, -shift*progress, w, h + shift*progress);
    fallback.globalCompositeOperation = 'source-over';
    canvas.hidden = false;
  }

  function capture() {
    if (!frame || !context) return null;
    if (paintedVersion === currentVersion) return plate;
    const {width, height, photoFrame, particleCanvas, titleOpacity, tint} = frame;
    const ratio = Math.min(1, 1500 / width, 1500 / height);
    if (lastWidth !== width || lastHeight !== height) {
      lastWidth = width;
      lastHeight = height;
      plate.width = Math.max(1, Math.round(width*ratio));
      plate.height = Math.max(1, Math.round(height*ratio));
      context.setTransform(plate.width/width, 0, 0, plate.height/height, 0, 0);
      shade = context.createLinearGradient(0, 0, 0, height);
      const stops = width <= 600
        ? [[0,'#11181366'],[.17,'transparent'],[.42,'transparent'],[.55,'#09130f38'],[1,'#080f0cdc']]
        : [[0,'rgba(10,12,13,.48)'],[.16,'transparent'],[.62,'transparent'],[.8,'rgba(8,15,13,.42)'],[1,'rgba(6,13,10,.89)']];
      for (const [at,color] of stops) shade.addColorStop(at,color);
    }
    if (particleCanvas) context.drawImage(particleCanvas, 0, 0, width, height);
    else context.drawImage(photo, photoFrame.left, photoFrame.top, photo.naturalWidth*photoFrame.scale, photo.naturalHeight*photoFrame.scale);
    context.globalAlpha = titleOpacity;
    context.drawImage(title, 0, 0, width, height);
    context.globalAlpha = tint;
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
    paintedVersion = currentVersion;
    return plate;
  }

  const surface = {
    update, capture,
    get frame() { return frame; },
    get version() { return currentVersion; },
    setGpuActive(active) {
      if (gpuActive === active) return;
      gpuActive = active;
      stage.toggleAttribute('data-gpu-wipe', active);
      if (active) canvas.hidden = true;
      else if (!disposed) requestPaint();
    },
    dispose() {
      disposed = true;
      openingSurfaces.delete(section);
      section.removeAttribute('data-opening-wipe');
    }
  };
  openingSurfaces.set(section, surface);
  return surface;
}

export function coverExitStyle(progress, elapsed, narrow) {
  const tintProgress = clamp((progress - .025) / (narrow ? .30 : .26));
  return {tint:1 - smooth(tintProgress), titleOpacity:clamp((.85 - elapsed) / .185)};
}
