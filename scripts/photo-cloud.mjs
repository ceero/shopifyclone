import { deflateSync } from 'node:zlib';

// Asset preparation only: sample the supplied RGBA photo into the native MDPC
// format. The existing decoder worker and GPU particle materials consume it.
// No image decoding, sampling, or simulation is added to the animation loop.
export function encodePhotoCloud({ width, height, data }, resolution) {
  const count = resolution * resolution, bits = 12, maximum = (1 << bits) - 1;
  const aspect = width / height;
  const points = [];
  const morton = (x, y) => {
    let value = 0n;
    for (let bit = 0; bit < bits; bit++) {
      value |= BigInt((x >> bit) & 1) << BigInt(3 * bit);
      value |= BigInt((y >> bit) & 1) << BigInt(3 * bit + 1);
    }
    return value;
  };
  for (let i = 0; i < count; i++) {
    const u = (.5 + i * .7548776662466927) % 1;
    const v = (.5 + i * .5698402909980532) % 1;
    const x = Math.min(width - 1, Math.floor(u * width));
    const y = Math.min(height - 1, Math.floor(v * height));
    const at = 4 * (y * width + x);
    points.push({ code: morton(Math.round(u * maximum), Math.round((1 - v) * maximum)),
      r: data[at], g: data[at + 1], b: data[at + 2] });
  }
  points.sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  const deltas = [], y = Buffer.alloc(count), cb = Buffer.alloc(count), cr = Buffer.alloc(count);
  const byte = n => Math.max(0, Math.min(255, Math.round(n)));
  let previous = 0n;
  points.forEach((point, i) => {
    let delta = point.code - previous;
    previous = point.code;
    while (delta >= 128n) { deltas.push(Number(delta & 127n) | 128); delta >>= 7n; }
    deltas.push(Number(delta));
    const { r, g, b } = point;
    y[i] = byte(.299 * r + .587 * g + .114 * b);
    cb[i] = byte(128 - .168736 * r - .331264 * g + .5 * b);
    cr[i] = byte(128 + .5 * r - .418688 * g - .081312 * b);
  });
  const parts = [Buffer.from(deltas), y, cb, cr].map(bytes => deflateSync(bytes, { level: 9 }));
  const metadata = Buffer.from(JSON.stringify({ format: 'mdpc-2', codec: 'deflate', N: count,
    qpPos: bits, chromaSub: 1, bbox: [-aspect / 2, -.5, 0, aspect / 2, .5, 0],
    posLen: parts[0].length, yLen: parts[1].length, cbLen: parts[2].length, crLen: parts[3].length }));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(metadata.length);
  return Buffer.concat([header, metadata, ...parts]);
}
