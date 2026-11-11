import { createCoverParticles } from './cover-particles.js';
import { createOpeningSurface, coverExitStyle } from './opening-wipe.js';

// The preview at :4186 wraps two copies of the title around a tilted cylinder.
// Its axis and ridge are measured in pixels of the original, uncropped photo.
const slices = 192;
const tilt = -.22, roll = -.075;
const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
const clamp = v => Math.min(1, Math.max(0, v));

export function makeOrbit(title, orbit) {
  const texture = document.createElement('canvas');
  const ctx = texture.getContext('2d');
  if (!ctx) return null;
  const font = '400 110px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.font = font;
  const width = ctx.measureText(title).width;
  const period = Math.max(width + 35, 1450 / orbit.repeats, width * 360 / (orbit.repeats * orbit.textArc));
  // Two tiles let a slice straddle the seam during rotation.
  const tile = Math.ceil(period);
  texture.width = 2 * tile;
  texture.height = 142;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.scale(tile / period, 1);
  for (const x of [.5, 1.5]) ctx.fillText(title, period * x, 75);

  const bandHeight = 2 * Math.PI * texture.height / (orbit.repeats * period);
  const columns = Array.from({ length: slices + 1 }, (_, i) => {
    const angle = (i / slices - .5) * 2 * Math.PI;
    const x = Math.sin(angle), z = Math.cos(angle);
    return [-.5, .5].map(edge => {
      const y = edge * bandHeight;
      const scale = 1 / (1 - (z * ct + y * st) / 7.8);
      const vertical = y * ct - z * st;
      return [(x * cr - vertical * sr) * scale, (x * sr + vertical * cr) * scale];
    });
  });
  return { texture, tile, columns };
}

export function coverFrame(photo, cover, w, h, drive, gaze) {
  // One crop for the photo, both text passes and the occlusion mask.
  const iw = photo.naturalWidth, ih = photo.naturalHeight;
  const fit = Math.max(w / iw, h / ih);
  const [fx, fy] = cover.focal;
  const zoom = 1.012 + .065 * drive;
  const scale = fit * zoom;
  const left = (w - iw * fit) * fx * zoom + w * (1 - zoom) / 2 - w * gaze.x * .003;
  const top = (h - ih * fit) * fy * zoom + h * (1 - zoom) / 2 - h * (gaze.y * .002 - drive * .018);
  const radius = Math.min(w * .445, cover.orbit.radius * scale);
  const center = [left + cover.orbit.anchor[0] * scale, top + cover.orbit.anchor[1] * scale];
  return { left, top, scale, radius, center };
}

export function drawOrbit(ctx, art, cover, frame, iw, w, h, dpr, turns) {
  const { radius, center: [cx, cy], left, top, scale } = frame;
  const { texture, tile, columns } = art;
  const ridge = cover.orbit.ridge;
  const snow = new Path2D();
  ridge.forEach((y, i) => {
    const x = left + i * iw * scale / (ridge.length - 1);
    snow[i === 0 ? 'moveTo' : 'lineTo'](x, top + y * scale);
  });
  snow.lineTo(left + iw * scale, h + 1);
  snow.lineTo(left, h + 1);
  snow.closePath();
  const sky = new Path2D(snow);
  sky.rect(0, 0, w, h);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  function paint(start, end) {
    const step = cover.orbit.repeats / slices;
    for (let i = start; i < end; i++) {
      const u = .5 + (i / slices - .5 - turns) * cover.orbit.repeats;
      const sx = (u - Math.floor(u)) * tile, sw = step * tile;
      const [[x, y], [bx, by]] = columns[i], [nx, ny] = columns[i + 1][0];
      const unit = radius * dpr;
      ctx.setTransform((nx - x) * unit / sw, (ny - y) * unit / sw,
        (bx - x) * unit / texture.height, (by - y) * unit / texture.height,
        (cx + x * radius) * dpr, (cy + y * radius) * dpr);
      // Cover antialiasing gaps between adjacent trapezoids.
      const overlap = sw * Math.min(.18, .4 / Math.max(.25, radius * Math.hypot(nx-x, ny-y)));
      ctx.drawImage(texture, sx, 0, sw, texture.height, -overlap / 2, 0, sw + overlap, texture.height);
    }
  }
  ctx.save();
  ctx.clip(sky, 'evenodd');
  paint(0, slices / 4);
  paint(3 * slices / 4, slices);
  ctx.restore();
  // Tint the completed back face once; overlapping slice edges must not appear brighter.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'rgba(255,255,255,.66)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  paint(slices / 4, 3 * slices / 4);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#123346';
  ctx.fill(snow);
  ctx.globalCompositeOperation = 'source-over';
}

export function mountCover(stage, photo, canvas, cover, isLoaded) {
  const ctx = canvas.getContext('2d');
  const art = ctx && makeOrbit(cover.title, cover.orbit);
  const section = stage.closest('section');
  const particles = createCoverParticles(stage.querySelector('.mountain-particles'), photo, request);
  const arrival = stage.querySelector('.opening-arrival img');
  const opening = createOpeningSurface(stage, photo, canvas, stage.querySelector('.opening-wipe-fallback'), arrival, request);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let pointerSample = null;
  let w = 0, h = 0, track = 0, dpr = 1;
  let id = 0, last = 0, time = 0, visible = true, targetX = 0, targetY = 0;
  const gaze = {x: 0, y: 0};
  let previousScroll = scrollY, speed = 0, targetSpeed = 0;
  let photoCovered = false, photoTransform = '', departed = false;
  function request() {
    if (!id && visible && !document.hidden) id = requestAnimationFrame(tick);
  }
  function tick(now) {
    id = 0;
    if (!visible || document.hidden || !w || !h) return;
    const drive = clamp(scrollY / Math.max(1, track));
    const exit = clamp((scrollY - (track - h)) / h);
    if ((exit >= 1) !== departed) { departed = exit >= 1; stage.toggleAttribute('data-departed', departed); }
    if (!photo.naturalWidth || !art) return;
    const moving = !motion.matches && !stage.hasAttribute('data-paused');
    const dt = last ? Math.min((now-last)/1000,.06) : 1/60;
    const scrollDelta = (scrollY - previousScroll) / h;
    if (Math.abs(scrollDelta) < .55) targetSpeed = Math.max(-1, Math.min(1, targetSpeed + scrollDelta*8));
    speed += (targetSpeed-speed)*(1-Math.exp(-dt*6));
    targetSpeed *= Math.exp(-dt*6);
    previousScroll = scrollY;
    if (last && moving && isLoaded()) time += dt;
    last = moving ? now : 0;
    if (moving) {
      const follow = 1 - Math.exp(-dt * (pointerSample ? 6 : 14));
      gaze.x += (targetX - gaze.x) * follow;
      gaze.y += (targetY - gaze.y) * follow;
    }
    const frame = coverFrame(photo, cover, w, h, motion.matches ? 0 : drive, gaze);
    const particleCanvas = motion.matches ? null : particles.render({
      width:w, height:h, frame, gaze, time, now, dt, speed, scrollDelta, pointer:pointerSample, moving,
    });
    // The particle canvas repaints the photograph opaquely; skip compositing a
    // second full-size, per-frame transformed copy underneath it.
    const covered = !!particleCanvas;
    if (covered !== photoCovered) { photoCovered = covered; stage.toggleAttribute('data-photo-covered', covered); }
    if (!covered) {
      const transform = 'matrix(' + [frame.scale,0,0,frame.scale,frame.left,frame.top].join(',') + ')';
      if (transform !== photoTransform) {
        photoTransform = transform;
        photo.style.width = photo.naturalWidth + 'px';
        photo.style.height = photo.naturalHeight + 'px';
        photo.style.transform = transform;
      }
    }
    const turns = motion.matches ? 0 : time / cover.orbit.period + drive * .15 + gaze.x * .018;
    drawOrbit(ctx, art, cover, frame, photo.naturalWidth, w, h, dpr, turns);
    opening.update({width:w, height:h, elapsed:drive, progress:exit, time, speed, still:!moving,
      photoFrame:frame, particleCanvas, ...coverExitStyle(exit,drive,w<=600)});
    stage.dataset.painted = '';
    if (moving) request();
  }
  function resize() {
    w = stage.clientWidth;
    h = stage.clientHeight;
    track = section.offsetHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    request();
  }
  function visibility() {
    if (visible && !document.hidden) request();
    else { cancelAnimationFrame(id); id = 0; last = 0; clearPointer(); particles.reset(); }
  }
  function onMotion() {
    last = 0;
    if (motion.matches) { time = 0; gaze.x = gaze.y = 0; clearPointer(); particles.reset(); }
    request();
  }
  function clearPointer() {
    pointerSample = null;
    targetX = targetY = 0;
    particles.clearPointer();
  }
  function pointer(event) {
    if (!hover.matches || event.pointerType === 'touch') return clearPointer();
    if (!visible || event.isPrimary === false || !w || !h) return;
    const x = event.clientX / w, y = event.clientY / h;
    if (x < 0 || y < 0 || x > 1 || y > 1) return clearPointer();
    pointerSample = {x,y};
    targetX = x * 2 - 1;
    targetY = y * 2 - 1;
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    stage.style.visibility = visible ? '' : 'hidden';
    if (!visible) section.removeAttribute('data-opening-wipe');
    visibility();
  });
  observer.observe(section);
  const sizes = new ResizeObserver(resize);
  sizes.observe(stage);
  sizes.observe(section);
  resize();
  photo.addEventListener('load', request);
  arrival.addEventListener('load', request);
  motion.addEventListener('change', onMotion);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('scroll', request, {passive:true});
  window.addEventListener('pointermove', pointer, {passive:true});
  window.addEventListener('pointerdown', pointer, {passive:true});
  window.addEventListener('pointercancel', clearPointer);
  window.addEventListener('blur', clearPointer);
  document.documentElement.addEventListener('pointerleave', clearPointer);
  hover.addEventListener('change', clearPointer);
  function dispose() {
    cancelAnimationFrame(id);
    observer.disconnect();
    sizes.disconnect();
    photo.removeEventListener('load', request);
    arrival.removeEventListener('load', request);
    opening.dispose();
    motion.removeEventListener('change', onMotion);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('scroll', request);
    window.removeEventListener('pointermove', pointer);
    window.removeEventListener('pointerdown', pointer);
    window.removeEventListener('pointercancel', clearPointer);
    window.removeEventListener('blur', clearPointer);
    document.documentElement.removeEventListener('pointerleave', clearPointer);
    hover.removeEventListener('change', clearPointer);
    particles.dispose();
  }
  return {refresh:request, dispose};
}
