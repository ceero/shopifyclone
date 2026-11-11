import { $a as Vector3, U as Color } from '../vendor/spring26/three.core-DVcoLpfz.js';

const frames = new WeakMap();

// Fit a photographic point cloud in the existing chapter scene. Its particles
// still use the native flow/fluid/caustic shaders and the shared renderer.
export function fitPhotoCloud(cloud, photo, scene, defaultCamera, size) {
  if (!photo) return;
  let frame = frames.get(cloud);
  if (!frame) {
    frame = { position: new Vector3(), offset: new Vector3(), rotation: defaultCamera.quaternion.clone() };
    frames.set(cloud, frame);
    scene.background = new Color(photo.background);
  }
  frame.camera ||= scene.getObjectByProperty('type', 'PerspectiveCamera');
  const camera = frame.camera || defaultCamera;
  camera.updateWorldMatrix(true, false);
  camera.getWorldPosition(frame.position);
  camera.getWorldQuaternion(frame.rotation);
  const distance = photo.distance;
  const height = 2 * distance * Math.tan(camera.fov * Math.PI / 360) / camera.zoom;
  const width = height * size.width / size.height;
  // Native MDPC geometry is normalized to five units on its longest axis.
  const imageHeight = 5, imageWidth = imageHeight * photo.aspect;
  // Fill the frame without exposing a rectangular edge as the particles drift.
  const scale = Math.max(width / imageWidth, height / imageHeight) * 1.012;
  const [fx, fy] = photo.focal;
  frame.offset.set((width - imageWidth * scale) * (fx - .5),
    (height - imageHeight * scale) * (.5 - fy), -distance);
  cloud.position.copy(frame.offset).applyQuaternion(frame.rotation).add(frame.position);
  cloud.quaternion.copy(frame.rotation);
  cloud.scale.setScalar(scale);
}

// Reuse the native light-volume shader for a photograph plus depth texture.
// Only framing runs here, inside the renderer's existing frame callback; fluid
// simulation, distortion and raymarching stay in the native GPU pipeline.
export function fitPhotoVolume(volume, photo, scene, defaultCamera, size) {
  if (!photo) return;
  let frame = frames.get(volume);
  if (!frame) {
    frame = { position: new Vector3(), offset: new Vector3(), rotation: defaultCamera.quaternion.clone() };
    frames.set(volume, frame);
  }
  frame.camera ||= scene.getObjectByProperty('type', 'PerspectiveCamera');
  const camera = frame.camera || defaultCamera;
  camera.updateWorldMatrix(true, false);
  camera.getWorldPosition(frame.position);
  camera.getWorldQuaternion(frame.rotation);
  const height = 2 * photo.distance * Math.tan(camera.fov * Math.PI / 360) / camera.zoom;
  const width = height * size.width / size.height;
  const imageHeight = Math.max(height, width / photo.aspect) * 1.025;
  const imageWidth = imageHeight * photo.aspect;
  const [fx, fy] = photo.focal;
  frame.offset.set((width - imageWidth) * (fx - .5),
    (height - imageHeight) * (.5 - fy), -photo.distance);
  volume.position.copy(frame.offset).applyQuaternion(frame.rotation).add(frame.position);
  volume.quaternion.copy(frame.rotation);
  volume.scale.set(imageWidth, imageHeight, photo.depth);
}
