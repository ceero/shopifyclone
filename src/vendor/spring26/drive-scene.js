import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {getProject, types} from '@theatre/core';

const POPUP_CHANNEL = 'spring-popup-sync';
const SIGNALING_CHANNEL = 'spring-webrtc-signaling';
const DEFAULT_CAR_MODEL_URL =
  '/media/car_1_.glb';
const SHOPPY_MODEL_URL =
  '/media/DancingRenaissanceShoppyv5_compressed.glb';
const DRACO_URL = '/draco-drive/';
const PROJECT_ID = 'SpringPopupCar';
const POPUP_THEATRE_SHEETS = ['Main', 'Controls'];
const EMPTY_THEATRE_STATE = {
  definitionVersion: '0.4.0',
  revisionHistory: [],
  sheetsById: {},
};
const POPUP_CONTENT_Y_OFFSET = 30;
const POPUP_MANUAL_DRAG_THRESHOLD_PX = 0.5;
const POPUP_MANUAL_DRAG_HOLD_MS = 1000;
const POPUP_DRAG_POSITION_LERP = 18;
const SHADOW_BOTTOM_FADE_START = 0.52;
const SHADOW_BOTTOM_FADE_END = 0.82;

const MSG = {
  CANVAS_RECT: 'canvas-rect',
  MAIN_WINDOW: 'main-window',
  ACTIVE_SECTION: 'active-section',
  POPUP_POSITION: 'popup-position',
  POPUP_CENTER: 'popup-center',
  POPUP_CLOSED: 'popup-closed',
  WHEEL_EVENT: 'wheel-event',
  NAVIGATE_TO_SECTION: 'navigate-to-section',
  WEBRTC_READY: 'webrtc-ready',
  DRIVE_STATE: 'drive-state',
  DRIVE_SCENE_REVEAL: 'drive-scene-reveal',
  KEY_ANIMATED_OUT: 'key-animated-out',
};

const HIGH_FREQUENCY_POPUP_MESSAGES = new Set([
  MSG.MAIN_WINDOW,
  MSG.CANVAS_RECT,
  MSG.ACTIVE_SECTION,
  MSG.POPUP_POSITION,
  MSG.POPUP_CENTER,
  MSG.WHEEL_EVENT,
]);

class PopupChannel {
  constructor() {
    this.channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(POPUP_CHANNEL);
    this.listeners = new Map();
    this.last = new Map();
    this.channel?.addEventListener('message', (event) => {
      const {type, data} = event.data || {};
      this.handleMessage(type, data);
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== 'spring-popup-channel-msg' || !event.newValue) return;
      try {
        const {type, data} = JSON.parse(event.newValue);
        this.handleMessage(type, data);
      } catch {}
    });
  }

  handleMessage(type, data) {
    this.last.set(type, data);
    this.listeners.get(type)?.forEach((callback) => callback(data));
  }

  send(type, data) {
    this.channel?.postMessage({type, data});
    // BroadcastChannel already delivers cross-window here; the localStorage
    // fallback would double-deliver and thrash storage at the drive-state rate.
    if (this.channel || HIGH_FREQUENCY_POPUP_MESSAGES.has(type)) return;
    try {
      localStorage.setItem(
        'spring-popup-channel-msg',
        JSON.stringify({type, data, t: Date.now()}),
      );
    } catch {}
  }

  on(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    const cached = this.last.get(type);
    if (cached) callback(cached);
    return () => this.listeners.get(type)?.delete(callback);
  }

  get(type) {
    return this.last.get(type) || null;
  }
}

class SignalingChannel {
  constructor() {
    this.channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(SIGNALING_CHANNEL);
    this.listeners = new Map();
    this.pending = new Map();
    this.channel?.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== 'spring-webrtc-signaling-msg' || !event.newValue) {
        return;
      }
      try {
        this.handleMessage(JSON.parse(event.newValue));
      } catch {}
    });
  }

  handleMessage(msg) {
    if (!msg?.roomId || !msg?.type) return;
    const key = `${msg.roomId}-${msg.type}`;
    const callbacks = this.listeners.get(key);
    if (callbacks?.size) {
      callbacks.forEach((callback) => callback(msg.data));
      return;
    }
    // Buffer only until a listener subscribes; otherwise trickled ICE
    // candidates would accumulate here for the life of the connection.
    if (!this.pending.has(key)) this.pending.set(key, []);
    this.pending.get(key).push(msg.data);
  }

  send(roomId, type, data) {
    const message = {roomId, type, data};
    this.channel?.postMessage(message);
    if (this.channel) return;
    try {
      localStorage.setItem(
        'spring-webrtc-signaling-msg',
        JSON.stringify({...message, t: Date.now()}),
      );
    } catch {}
  }

  on(roomId, type, callback) {
    const key = `${roomId}-${type}`;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  getPending(roomId, type) {
    return this.pending.get(`${roomId}-${type}`) || [];
  }
}

const popupChannel = new PopupChannel();
const signaling = new SignalingChannel();

function waitOffer(roomId) {
  return new Promise((resolve) => {
    const pending = signaling.getPending(roomId, 'offer');
    if (pending.length > 0) {
      resolve(pending[0]);
      return;
    }
    const unsubscribe = signaling.on(roomId, 'offer', (data) => {
      unsubscribe();
      resolve(data);
    });
  });
}

async function createReceiver(video, roomId = 'default') {
  const isLocalhost =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const pc = new RTCPeerConnection({
    iceServers: isLocalhost ? [] : [{urls: 'stun:stun.l.google.com:19302'}],
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });

  pc.ontrack = (event) => {
    video.srcObject = event.streams[0];
    void video.play?.();
  };

  pc.onicecandidate = (event) => {
    if (event.candidate)
      signaling.send(roomId, 'ice-rx', event.candidate.toJSON());
  };

  const offer = await waitOffer(roomId);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  signaling.send(roomId, 'answer', answer);

  signaling.on(roomId, 'ice-tx', (data) => {
    void pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
  });

  for (const candidate of signaling.getPending(roomId, 'ice-tx')) {
    void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }

  return pc;
}

const keys = {forward: false, backward: false, left: false, right: false};
const popupMoveKeys = {up: false, down: false, left: false, right: false};
const POPUP_KEYBOARD_MOVE_SPEED = 260;
const POPUP_KEYBOARD_MOVE_LERP = 7;
const POPUP_KEYBOARD_STOP_LERP = 12;

function isEditableElement(element) {
  return Boolean(
    element?.tagName &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
      element.isContentEditable),
  );
}

function shouldCaptureKeys(event) {
  const path = event?.composedPath?.() || [];
  if (path.some(isEditableElement)) return false;

  const element = document.activeElement;
  if (!element) return true;
  return !isEditableElement(element);
}

function resetPopupMoveKeys() {
  popupMoveKeys.up = false;
  popupMoveKeys.down = false;
  popupMoveKeys.left = false;
  popupMoveKeys.right = false;
}

function resetDriveKeys() {
  keys.forward = false;
  keys.backward = false;
  keys.left = false;
  keys.right = false;
}

function isDrivePortalOverlayHandle(handle) {
  return (
    typeof handle === 'string' && handle.startsWith('developer-drive-portal')
  );
}

function initKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (!shouldCaptureKeys(event)) return;
    switch (event.code) {
      case 'ArrowUp':
        popupMoveKeys.up = true;
        break;
      case 'ArrowDown':
        popupMoveKeys.down = true;
        break;
      case 'ArrowLeft':
        popupMoveKeys.left = true;
        break;
      case 'ArrowRight':
        popupMoveKeys.right = true;
        break;
      case 'KeyW':
        keys.forward = true;
        break;
      case 'KeyS':
        keys.backward = true;
        break;
      case 'KeyA':
        keys.left = true;
        break;
      case 'KeyD':
        keys.right = true;
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'ArrowUp':
        popupMoveKeys.up = false;
        break;
      case 'ArrowDown':
        popupMoveKeys.down = false;
        break;
      case 'ArrowLeft':
        popupMoveKeys.left = false;
        break;
      case 'ArrowRight':
        popupMoveKeys.right = false;
        break;
      case 'KeyW':
        keys.forward = false;
        break;
      case 'KeyS':
        keys.backward = false;
        break;
      case 'KeyA':
        keys.left = false;
        break;
      case 'KeyD':
        keys.right = false;
        break;
    }
  });

  const resetHeldInput = () => {
    resetPopupMoveKeys();
    resetDriveKeys();
  };

  window.addEventListener('blur', resetHeldInput);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') resetHeldInput();
  });
}

function initScrollForwarding(sessionId) {
  window.addEventListener(
    'wheel',
    (event) => {
      popupChannel.send(MSG.WHEEL_EVENT, {
        sessionId,
        deltaY: event.deltaY,
        time: Date.now(),
      });
    },
    {passive: true},
  );
}

function initJoystick() {
  const base = document.querySelector('.carousel-3d__joystick-base');
  const knob = document.querySelector('.carousel-3d__joystick-knob');
  if (!base || !knob) return;

  const radius = 60;
  const dead = 0.25;
  let pointerId = null;
  let visualX = 0;
  let visualY = 0;
  let lastVisualTime = performance.now();

  const setVisual = (x, y, active) => {
    visualX = x;
    visualY = y;
    knob.style.transform = `translate(calc(-50% + ${x * radius * 0.6}px), calc(-50% + ${y * radius * 0.6}px))`;
    knob.classList.toggle('active', active);
    base.classList.toggle('active', active);
  };

  const setKeysFromVector = (x, y) => {
    keys.forward = y < -dead;
    keys.backward = y > dead;
    keys.left = x < -dead;
    keys.right = x > dead;
  };

  const updateFromPosition = (clientX, clientY) => {
    const rect = base.getBoundingClientRect();
    const dx = (clientX - rect.left - radius) / radius;
    const dy = (clientY - rect.top - radius) / radius;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 1);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    setVisual(x, y, true);
    setKeysFromVector(x, y);
  };

  const resetPointer = () => {
    pointerId = null;
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
    setVisual(0, 0, false);
  };

  base.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    base.setPointerCapture?.(event.pointerId);
    updateFromPosition(event.clientX, event.clientY);
    event.preventDefault();
  });

  base.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    updateFromPosition(event.clientX, event.clientY);
    event.preventDefault();
  });

  const handlePointerEnd = (event) => {
    if (event.pointerId !== pointerId) return;
    base.releasePointerCapture?.(event.pointerId);
    resetPointer();
    event.preventDefault();
  };

  base.addEventListener('pointerup', handlePointerEnd);
  base.addEventListener('pointercancel', handlePointerEnd);
  base.addEventListener('lostpointercapture', () => {
    if (pointerId !== null) resetPointer();
  });

  const syncKeyboardVisual = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastVisualTime) / 1000);
    lastVisualTime = now;

    if (pointerId === null) {
      const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const y = (keys.backward ? 1 : 0) - (keys.forward ? 1 : 0);
      const length = Math.hypot(x, y);
      const active = length > 0;
      const targetX = active ? x / Math.max(1, length) : 0;
      const targetY = active ? y / Math.max(1, length) : 0;
      const lerp = 1 - Math.exp(-dt * 12);
      const nextX = visualX + (targetX - visualX) * lerp;
      const nextY = visualY + (targetY - visualY) * lerp;
      const visiblyActive = active || Math.hypot(nextX, nextY) > 0.02;
      setVisual(
        visiblyActive ? nextX : 0,
        visiblyActive ? nextY : 0,
        visiblyActive,
      );
    }
    requestAnimationFrame(syncKeyboardVisual);
  };
  requestAnimationFrame(syncKeyboardVisual);
}

function normalizePopupTheatreState(state) {
  if (!state || typeof state !== 'object') return null;
  const sheetsById = state.sheetsById;
  if (!sheetsById || typeof sheetsById !== 'object') return null;

  const sheetIds = Object.keys(sheetsById);
  const normalizedSheets = {};
  for (const sheetId of POPUP_THEATRE_SHEETS) {
    if (sheetsById[sheetId]) normalizedSheets[sheetId] = sheetsById[sheetId];
  }

  if (Object.keys(normalizedSheets).length === 0 && sheetIds.length === 1) {
    normalizedSheets.Main = sheetsById[sheetIds[0]];
  }

  return {
    ...state,
    sheetsById: normalizedSheets,
  };
}

async function fetchTheatreState(src) {
  if (!src) return null;

  try {
    const url = new URL(src, window.location.href);
    const response = await fetch(url.toString(), {credentials: 'omit'});
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const state = normalizePopupTheatreState(await response.json());
    if (!state) throw new Error('Invalid Theatre state JSON');
    return state;
  } catch (error) {
    console.warn('[Drive popup] Failed to load Theatre state src', src, error);
    return null;
  }
}

function silenceTheatreStudioStreamProbe() {
  const originalError = console.error;
  const patchedError = (...args) => {
    if (args.length === 1 && args[0] === 'module "stream" not found') return;
    originalError.apply(console, args);
  };
  console.error = patchedError;
  return () => {
    if (console.error === patchedError) console.error = originalError;
  };
}

async function setupTheatre() {
  const params = new URLSearchParams(window.location.search);
  const shouldLoadStudio = params.has('popup-studio');
  const linkedState = await fetchTheatreState(params.get('theatre-src') || '');

  if (shouldLoadStudio) {
    const restoreConsoleError = silenceTheatreStudioStreamProbe();
    try {
      const {default: studio} = await import('@theatre/studio');
      studio.initialize({persistenceKey: PROJECT_ID});
      studio.ui.restore?.();
    } catch (error) {
      console.warn('[Drive popup] Theatre Studio failed to initialize', error);
    } finally {
      restoreConsoleError();
    }
  }

  const project = getProject(PROJECT_ID, {
    state: linkedState || EMPTY_THEATRE_STATE,
  });
  return {
    project,
    mainSheet: project.sheet('Main'),
    controlsSheet: project.sheet('Controls'),
  };
}

function onTheatreValues(object, callback) {
  callback(object.value);
  return object.onValuesChange(callback);
}

const WHEEL_PARTS = /^(wheel_rim_|wheel_nut_|wheel_brake_disk_|brake_cal_)/i;
const TYRE_PARTS = /^wheel_tire_/i;
const GLASS_PARTS = /^glass_/i;
const CARBON_PARTS = /^(diffuser|splitter|rear_wing|front_wings)/i;
const SPINNING_PARTS =
  /^(wheel_rim_|wheel_tire_|wheel_brake_disk_|wheel_nut_)/i;

function materialList(material) {
  return Array.isArray(material) ? material : [material].filter(Boolean);
}

function cloneMaterial(material) {
  return Array.isArray(material)
    ? material.map((item) => item?.clone?.() ?? item)
    : (material?.clone?.() ?? material);
}

function hasMaterialTexture(material) {
  return Boolean(
    material?.map ||
    material?.normalMap ||
    material?.aoMap ||
    material?.metalnessMap ||
    material?.roughnessMap ||
    material?.emissiveMap,
  );
}

function setMaterialBaseColor(material) {
  if (!material?.color || material.userData.baseColor) return;
  material.userData.baseColor = material.color.clone();
}

function applyBodyTint(bodyMaterials, color) {
  for (const material of bodyMaterials) {
    if (!material.color) continue;
    const baseColor = material.userData.baseColor;
    material.color.copy(baseColor || new THREE.Color(0xffffff)).multiply(color);
    material.needsUpdate = true;
  }
}

function createContactShadowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uColor: {value: new THREE.Color(0x000000)},
      uOpacity: {value: 0.16},
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float core = 1.0 - smoothstep(0.0, 1.0, dot(p, p));
        float feather = 1.0 - smoothstep(0.35, 1.0, length(p));
        float alpha = core * feather * uOpacity;
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

function applyCarMaterials(car) {
  const wheels = [];
  const bodyMaterials = [];
  const tyreMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
  });
  const carbonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    metalness: 0.3,
    roughness: 0.4,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });

  car.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const name = node.name || '';
    node.castShadow = true;
    node.receiveShadow = true;

    // Keep the GLB-authored materials. The car asset has embedded WebP livery,
    // wheel, and glass textures; replacing materials by mesh name can flatten
    // textured parts (for example `wheel_tire_*` uses the textured wheels
    // material in the GLB). Clone before tuning so shared source materials stay
    // untouched and each mesh can be disposed safely.
    node.material = cloneMaterial(node.material);
    const materials = materialList(node.material);
    const hasTexture = materials.some(hasMaterialTexture);
    const isGlass = GLASS_PARTS.test(name);
    const isWheel = TYRE_PARTS.test(name) || WHEEL_PARTS.test(name);
    const isCarbon = CARBON_PARTS.test(name);

    if (isWheel && !hasTexture) {
      node.material = tyreMaterial.clone();
    } else if (isCarbon && !hasTexture) {
      node.material = carbonMaterial.clone();
    }

    const tunedMaterials = materialList(node.material);
    for (const material of tunedMaterials) {
      if (!material) continue;
      material.userData.hasAuthoredTexture = hasMaterialTexture(material);
      setMaterialBaseColor(material);

      if (isGlass) {
        material.transparent = true;
        material.opacity = Math.min(material.opacity ?? 1, 0.55);
        material.metalness = 0.9;
        material.roughness = 0.05;
        material.envMapIntensity = 2;
        if ('clearcoat' in material) material.clearcoat = 1;
        if ('clearcoatRoughness' in material)
          material.clearcoatRoughness = 0.05;
      } else if (!isWheel) {
        bodyMaterials.push(material);
      }

      material.needsUpdate = true;
    }

    if (SPINNING_PARTS.test(name)) {
      wheels.push({
        mesh: node,
        initialQuat: node.quaternion.clone(),
        isFront: false,
      });
    }
  });

  if (wheels.length > 0) {
    const worldPosition = new THREE.Vector3();
    const zPositions = wheels.map((wheel) => {
      wheel.mesh.getWorldPosition(worldPosition);
      return worldPosition.z;
    });
    const averageZ =
      zPositions.reduce((sum, z) => sum + z, 0) / zPositions.length;
    wheels.forEach((wheel, index) => {
      wheel.isFront = zPositions[index] > averageZ;
    });
  }

  return {wheels, bodyMaterials};
}

function spinWheels(wheels, spinAngle, steerAngle) {
  const spinQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    spinAngle,
  );
  const steerQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    steerAngle,
  );
  for (const wheel of wheels) {
    if (wheel.isFront) {
      wheel.mesh.quaternion
        .copy(wheel.initialQuat)
        .multiply(steerQuat)
        .multiply(spinQuat);
    } else {
      wheel.mesh.quaternion.copy(wheel.initialQuat).multiply(spinQuat);
    }
  }
}

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    if (!item) continue;
    for (const value of Object.values(item)) {
      if (value?.isTexture) value.dispose();
    }
    item.dispose?.();
  }
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) disposeMaterial(child.material);
  });
}

function createGltfLoader() {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_URL);
  dracoLoader.setDecoderConfig({type: 'wasm'});

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  return loader;
}

function loadCar(src = DEFAULT_CAR_MODEL_URL) {
  const loader = createGltfLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      src,
      (gltf) => {
        const car = gltf.scene;
        resolve({car, ...applyCarMaterials(car)});
      },
      undefined,
      reject,
    );
  });
}

class DancingShoppy {
  constructor(camera) {
    this.camera = camera;
    this.model = null;
    this.mixer = null;
    this.actions = [];
    this.currentAction = null;
    this.currentSrc = '';
    this.loadToken = 0;
    this.planeX = 0;
    this.planeY = 0;
    this.planeH = 1;
    this.values = {
      src: SHOPPY_MODEL_URL,
      position: {x: 0, y: 0, z: -6},
      rotation: {x: 0, y: 0, z: 0},
      scale: {x: 2.5, y: 2.5, z: 2.5},
      anchorY: 0.42,
      animationIndex: 0,
      visible: true,
    };
  }

  setValues(values) {
    this.values = {
      ...this.values,
      ...values,
      position: {...this.values.position, ...values.position},
      rotation: {...this.values.rotation, ...values.rotation},
      scale: {...this.values.scale, ...values.scale},
    };

    const nextSrc = this.values.src || SHOPPY_MODEL_URL;
    if (!this.model || nextSrc !== this.currentSrc) {
      void this.load(nextSrc).catch(() => {});
      return;
    }

    this.playAnimation(this.values.animationIndex);
    this.applyTransform();
  }

  async load(src = this.values.src || SHOPPY_MODEL_URL) {
    const loadToken = ++this.loadToken;
    const loader = createGltfLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        src,
        (gltf) => {
          if (loadToken !== this.loadToken) return;

          if (this.model) {
            this.camera.remove(this.model);
            disposeObject(this.model);
          }

          this.model = gltf.scene;
          this.currentSrc = src;
          this.actions = [];
          this.currentAction = null;
          this.model.frustumCulled = false;
          this.model.traverse((child) => {
            child.frustumCulled = false;
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.camera.add(this.model);

          this.mixer = null;
          if (gltf.animations?.length) {
            this.mixer = new THREE.AnimationMixer(this.model);
            this.actions = gltf.animations.map((clip) =>
              this.mixer.clipAction(clip),
            );
            this.playAnimation(this.values.animationIndex);
          }

          this.applyTransform();
          resolve(this);
        },
        undefined,
        reject,
      );
    });
  }

  playAnimation(index = 0) {
    if (!this.actions.length) return;
    const safeIndex = Math.max(
      0,
      Math.min(this.actions.length - 1, Math.round(index)),
    );
    const next = this.actions[safeIndex];
    if (next === this.currentAction) return;
    this.currentAction?.fadeOut(0.2);
    this.currentAction = next;
    this.currentAction.reset().fadeIn(0.2).play();
  }

  updatePosition(x, y, planeH) {
    this.planeX = x;
    this.planeY = y;
    this.planeH = planeH;
    this.applyTransform();
  }

  applyTransform() {
    if (!this.model) return;
    const {position, rotation, scale, anchorY, visible} = this.values;
    this.model.visible = visible;
    this.model.position.set(
      this.planeX + position.x,
      this.planeY + this.planeH * anchorY + position.y,
      position.z,
    );
    this.model.rotation.set(rotation.x, rotation.y, rotation.z);
    this.model.scale.set(scale.x, scale.y, scale.z);
  }

  update(delta) {
    this.mixer?.update(delta);
  }
}

class CarPopupApp {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.targetSceneHandle = params.get('drive-scene') || 'hero';
    this.activeHandle = params.get('drive-section') || 'hero';
    // Must match the main window's fallback (popupHandlerSingleton) so the
    // session guards and WebRTC room id agree when the param is missing.
    this.sessionId = params.get('drive-session') || 'default';
    this.lastDriveSceneReveal = {key: '', time: 0};
    this.project = null;
    this.mainSheet = null;
    this.controlsSheet = null;
    this.clock = new THREE.Clock();
    this.speed = 0;
    this.steerAngle = 0;
    this.smoothSteer = 0;
    this.gazeX = 0;
    this.popupRelativeX = 0;
    this.introSpinStartedAt = performance.now();
    this.introSpinOffset = 0;
    this.introSpinComplete = false;
    this.wheelSpin = 0;
    this.gridTravel = 0;
    this.sectionHandles = ['hero'];
    this.car = null;
    this.carValues = null;
    this.carRigPosition = {x: 0, y: 0, z: 0};
    this.popupVerticalProgress = 0.5;
    this.carLookAt = {x: 0, y: 0, z: 0};
    this.shoppy = null;
    this.windowValues = {
      z: -5,
      yOffset: -0.5,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      brightness: 1,
      contrast: 1,
      saturation: 1.03,
      gamma: 1,
      noiseAmount: 0,
      noiseScale: 18,
      noiseSpeed: 0.35,
      noiseContrast: 1,
    };
    this.wheels = [];
    this.bodyMaterials = [];
    this.floorControls = {
      rotationOffset: 0,
      travelSpeed: 4,
    };
    this.shadowControls = {
      position: {x: 0, y: -0.5, z: 0},
      opacity: 0.28,
      color: {r: 0, g: 0, b: 0, a: 1},
      size: 80,
      width: 1,
      depth: 1,
      rotation: 0,
      bottomFadeStart: SHADOW_BOTTOM_FADE_START,
      bottomFadeEnd: SHADOW_BOTTOM_FADE_END,
      visible: true,
    };
    this.streamLightControls = {
      enabled: true,
      useTexture: true,
      flipFrontBack: true,
      intensity: 2.5,
      distance: 18,
      angle: 0.62,
      penumbra: 0.55,
      decay: 1.4,
      color: {r: 1, g: 1, b: 1, a: 1},
      positionOffset: {x: 0, y: 0, z: 0},
      targetOffset: {x: 0, y: 0.4, z: 0},
    };
    this.driveCameraOffset = {
      positionOffset: {x: 0, y: 0, z: 0},
      rotationOffset: {x: 0, y: 0, z: 0},
    };
    this.speedOverlayControls = {
      enabled: true,
      strength: 1,
      speed: 1,
      dpr: 1,
      lineWidth: 1,
      lineColorShift: 1,
      rgbShift: 1,
      rgb: {r: 1, g: 1, b: 1},
      color: {r: 0.59, g: 1, b: 0.39, a: 1},
      colorMix: 0,
      velocityMultiplier: 1.4,
      smoothing: 7,
      timeoutMs: 700,
      bendStrength: 1,
      centerFollow: 1,
    };
    this.instructionsControls = {
      visible: true,
      text: 'WASD / Arrows to Drive',
      bottom: 20,
      fontSize: 12,
      opacity: 0.82,
      fadeInDelay: 2,
      fadeInSpeed: 2.5,
      fadeOutSpeed: 2.5,
      letterSpacing: 0.08,
      color: {r: 1, g: 1, b: 1, a: 1},
    };
    this.instructionsOpacity = 0;
    this.instructionsDismissed = false;
    this.instructionsStartedAt = performance.now();
    this.instructionsElement = null;
    this.streamEnvMap = null;
    this.streamLightTexture = null;
    this.carPbrValues = {
      streamEnvironment: true,
      envMapIntensity: 1.5,
      metalness: 0.68,
      roughness: 0.33,
      clearcoat: 0.07,
      clearcoatRoughness: 0.33,
    };
    this.assetSources = {carSrc: DEFAULT_CAR_MODEL_URL};
    this.currentCarSrc = '';
    this.carLoadToken = 0;
    this.popupBroadcast = {
      lastRect: '',
      lastCenter: '',
      lastX: null,
      lastY: null,
      lastTime: null,
      velocityX: 0,
      velocityY: 0,
    };
    this.windowMotion = {
      targetCenterX: 0,
      targetCenterY: 0,
      currentCenterX: 0,
      currentCenterY: 0,
      lastRawCenterX: null,
      lastRawCenterY: null,
      initialized: false,
      lerpSpeed: 0,
    };
    this.popupWindowMove = {
      x: 0,
      y: 0,
    };
    this.popupWindowMoveRemainder = {
      x: 0,
      y: 0,
    };
    this.popupWindowPrediction = {
      x: null,
      y: null,
      until: 0,
    };
    this.manualWindowDrag = {
      activeUntil: 0,
    };
    this.videoAlign = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      initialized: false,
      lerp: 1,
    };
    this.tmpCarPosition = new THREE.Vector3();
    this.tmpStreamCenter = new THREE.Vector3();
    this.tmpLookAtPosition = new THREE.Vector3();
    this.tmpCameraPosition = new THREE.Vector3();
    this.tmpRayDirection = new THREE.Vector3();
    this.tmpDriveForward = new THREE.Vector3();
    this.tmpGroundTarget = new THREE.Vector3();
    this.controls = {
      maxSpeed: 5,
      acceleration: 4,
      braking: 8,
      friction: 1.5,
      wheelSpinSpeed: 4,
      maxSteerAngle: 0.3,
      orbitSpeed: 0.12,
      carYawAmount: 0.18,
      carRollAmount: 0.05,
      visualForwardBoost: 3,
      visualReverseBoost: 3,
      gazeStrength: 1,
      gazeLerp: 3,
      windowGazeLerp: 18,
      introSpinEnabled: true,
      introSpinStartYaw: Math.PI,
      introSpinDuration: 1.25,
      introSpinBlockDriving: true,
      popupMoveSpeed: POPUP_KEYBOARD_MOVE_SPEED,
      popupTurnMoveAmount: 1,
      popupMoveLerp: POPUP_KEYBOARD_MOVE_LERP,
      popupStopLerp: POPUP_KEYBOARD_STOP_LERP,
      popupPredictWindowMove: true,
      dragAccelerate: true,
      dragThrottle: 1,
      dragHoldMs: POPUP_MANUAL_DRAG_HOLD_MS,
      dragPositionLerp: POPUP_DRAG_POSITION_LERP,
      cameraShakeEnabled: true,
      cameraShakeAmount: 0.05,
      cameraShakeFrequency: 18,
      cameraShakeStartSpeed: 0.75,
      revealSpeedThreshold: 0.35,
    };
    this.lastDriveState = {
      key: '',
      time: 0,
    };
  }

  async init() {
    const theatre = await setupTheatre();
    this.project = theatre.project;
    this.mainSheet = theatre.mainSheet;
    this.controlsSheet = theatre.controlsSheet;
    await this.project.ready;
    this.initScene();
    this.shoppy = new DancingShoppy(this.camera);
    this.initTheatreObjects();
    initKeyboard();
    initScrollForwarding(this.sessionId);
    initJoystick();
    this.connectWebRTC();
    await this.loadCarModel();
    this.listenForSections();
    this.start();
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.autoClear = false;
    document.body.appendChild(this.renderer.domElement);

    this.instructionsElement = document.createElement('div');
    this.instructionsElement.className = 'popup-drive-instructions';
    document.body.appendChild(this.instructionsElement);
    this.applyInstructionsStyles();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 2.4, 6.2);
    this.scene.add(this.camera);
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.bgScene.add(this.bgCamera);
    this.lookAt = new THREE.Vector3(0, 0.25, 0);

    this.videoMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: {value: null},
        uOpacity: {value: 1},
        uBrightness: {value: 1},
        uContrast: {value: 1},
        uSaturation: {value: 1.03},
        uGamma: {value: 1},
        uColorBalance: {value: new THREE.Vector3(0.98, 0.96, 1.02)},
        uNoiseAmount: {value: 0},
        uNoiseScale: {value: 18},
        uNoiseSpeed: {value: 0.35},
        uNoiseContrast: {value: 1},
        uTime: {value: 0},
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        uniform float uBrightness;
        uniform float uContrast;
        uniform float uSaturation;
        uniform float uGamma;
        uniform vec3 uColorBalance;
        uniform float uNoiseAmount;
        uniform float uNoiseScale;
        uniform float uNoiseSpeed;
        uniform float uNoiseContrast;
        uniform float uTime;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec4 texel = texture2D(uMap, vUv);
          vec3 color = texel.rgb * uColorBalance;
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(luma), color, uSaturation);
          color = (color - 0.5) * uContrast + 0.5;
          color *= uBrightness;
          float noise = valueNoise(
            vUv * max(uNoiseScale, 0.001) +
            vec2(uTime * uNoiseSpeed, -uTime * uNoiseSpeed * 0.37)
          );
          float grain = (noise - 0.5) * uNoiseContrast;
          color += grain * clamp(uNoiseAmount, 0.0, 1.0);
          color = pow(max(color, vec3(0.0)), vec3(1.0 / max(uGamma, 0.001)));
          gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(1.0)), texel.a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    this.bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.videoMaterial,
    );
    this.bgPlane.renderOrder = -100;
    this.bgPlane.frustumCulled = false;
    this.bgCamera.add(this.bgPlane);

    this.driveRig = new THREE.Group();
    this.scene.add(this.driveRig);

    this.carMotionRig = new THREE.Group();
    this.driveRig.add(this.carMotionRig);

    this.carRig = new THREE.Group();
    this.carMotionRig.add(this.carRig);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.keyLight.position.set(-5, 8, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 0.1;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.camera.left = -10;
    this.keyLight.shadow.camera.right = 10;
    this.keyLight.shadow.camera.top = 10;
    this.keyLight.shadow.camera.bottom = -10;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.streamLight = new THREE.SpotLight(0xffffff, 2.5, 18, 0.62, 0.55, 1.4);
    this.streamLight.name = 'streamTextureLight';
    this.streamLight.visible = true;
    this.streamLightTarget = new THREE.Object3D();
    this.streamLightTarget.name = 'streamTextureLightTarget';
    this.streamLight.target = this.streamLightTarget;
    this.camera.add(this.streamLight);
    this.scene.add(this.streamLightTarget);

    this.floor = new THREE.Group();
    this.floor.position.y = -0.48;
    this.gridMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uOpacity: {value: 0.42},
        uFadeNear: {value: 7},
        uFadeFar: {value: 18},
        uCellSize: {value: 0.5},
        uMajorEvery: {value: 8},
        uGridYaw: {value: 0},
        uGridOffset: {value: new THREE.Vector2(0, 0)},
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vGridPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          vGridPosition = position.xy;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uFadeNear;
        uniform float uFadeFar;
        uniform float uCellSize;
        uniform float uMajorEvery;
        uniform float uGridYaw;
        uniform vec2 uGridOffset;
        varying vec3 vWorldPosition;
        varying vec2 vGridPosition;

        float gridLine(vec2 position, float cellSize) {
          vec2 coord = position / cellSize;
          vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
          return 1.0 - min(min(grid.x, grid.y), 1.0);
        }

        void main() {
          float c = cos(uGridYaw);
          float s = sin(uGridYaw);
          mat2 rotation = mat2(c, -s, s, c);
          vec2 gridPosition = rotation * vGridPosition + uGridOffset;
          float minor = gridLine(gridPosition, uCellSize) * 0.45;
          float major = gridLine(gridPosition, uCellSize * uMajorEvery) * 0.9;
          float dist = distance(cameraPosition, vWorldPosition);
          float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, dist);
          float alpha = max(minor, major) * uOpacity * fade;
          if (alpha < 0.01) discard;
          vec3 color = mix(vec3(0.14, 0.29, 0.2), vec3(0.59, 1.0, 0.39), major);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    this.gridPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      this.gridMaterial,
    );
    this.gridPlane.rotation.x = -Math.PI / 2;
    this.gridPlane.renderOrder = 2;
    this.floor.add(this.gridPlane);
    this.driveRig.add(this.floor);

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: 0.28,
        transparent: true,
      }),
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -0.5;
    this.shadowPlane.receiveShadow = true;
    this.carMotionRig.add(this.shadowPlane);

    this.contactShadowMaterial = createContactShadowMaterial();
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.contactShadowMaterial,
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = -0.49;
    this.contactShadow.renderOrder = 1;
    this.carMotionRig.add(this.contactShadow);

    window.addEventListener('resize', () => this.resize());
    const sendClosed = (event) => {
      // A pagehide with persisted=true means the popup is only being frozen
      // into the bfcache (e.g. it lost focus when the user clicked back to the
      // main window) and may be restored. Treating that as a close would tear
      // down the live session and stale the stream alignment while the popup
      // is merely backgrounded. Only report a real, terminal unload.
      if (event?.type === 'pagehide' && event.persisted) return;
      popupChannel.send(MSG.POPUP_CLOSED, {
        time: Date.now(),
        sessionId: this.sessionId,
      });
    };
    // pagehide catches real unloads beforeunload can miss (mobile); the main
    // window also runs a win.closed watchdog in case neither fires.
    window.addEventListener('pagehide', sendClosed);
    window.addEventListener('beforeunload', sendClosed);
  }

  initTheatreObjects() {
    onTheatreValues(
      this.mainSheet.object('car', {
        src: types.string(DEFAULT_CAR_MODEL_URL),
        scale: types.number(0.015, {
          range: [0.001, 0.08],
          nudgeMultiplier: 0.001,
        }),
        y: types.number(0, {range: [-3, 3], nudgeMultiplier: 0.01}),
        position: types.compound({
          x: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
          y: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
          z: types.number(0, {range: [-12, 8], nudgeMultiplier: 0.05}),
        }),
        lookAt: types.compound({
          x: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
          y: types.number(0, {range: [-4, 4], nudgeMultiplier: 0.05}),
          z: types.number(0, {range: [-20, 8], nudgeMultiplier: 0.05}),
        }),
        rotation: types.compound({
          y: types.number(-1.567, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
        }),
        bodyColor: types.rgba({r: 1, g: 1, b: 1, a: 1}),
        pbr: types.compound({
          streamEnvironment: types.boolean(true),
          envMapIntensity: types.number(1.5, {
            range: [0, 8],
            nudgeMultiplier: 0.05,
          }),
          metalness: types.number(0.68, {
            range: [0, 1],
            nudgeMultiplier: 0.01,
          }),
          roughness: types.number(0.33, {
            range: [0, 1],
            nudgeMultiplier: 0.01,
          }),
          clearcoat: types.number(0.07, {
            range: [0, 1],
            nudgeMultiplier: 0.01,
          }),
          clearcoatRoughness: types.number(0.33, {
            range: [0, 1],
            nudgeMultiplier: 0.01,
          }),
        }),
      }),
      (values) => {
        this.carValues = values;
        const nextSrc = values.src || DEFAULT_CAR_MODEL_URL;
        this.assetSources.carSrc = nextSrc;
        if (this.car && nextSrc !== this.currentCarSrc) {
          void this.loadCarModel(nextSrc);
        }
        this.carRigPosition = {...this.carRigPosition, ...values.position};
        this.carLookAt = {...this.carLookAt, ...values.lookAt};
        this.carPbrValues = {...this.carPbrValues, ...values.pbr};
        this.applyCarRigPosition();

        if (!this.car) return;
        this.car.scale.setScalar(values.scale);
        this.car.userData.baseY = values.y;
        this.car.userData.baseRotationY = values.rotation.y;
        const color = new THREE.Color(
          values.bodyColor.r,
          values.bodyColor.g,
          values.bodyColor.b,
        );
        applyBodyTint(this.bodyMaterials, color);
        this.applyCarPbrSettings();
      },
    );

    onTheatreValues(
      this.mainSheet.object('camera', {
        height: types.compound({
          top: types.number(2.4, {range: [-12, 8], nudgeMultiplier: 0.05}),
          bottom: types.number(2.4, {
            range: [-12, 8],
            nudgeMultiplier: 0.05,
          }),
        }),
        width: types.compound({
          left: types.number(-0.5, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
          right: types.number(0.5, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
        }),
        distance: types.number(6.2, {range: [2, 14], nudgeMultiplier: 0.1}),
        lookAtY: types.number(0.25, {range: [-3, 3], nudgeMultiplier: 0.05}),
        fov: types.number(45, {range: [15, 90], nudgeMultiplier: 1}),
        followLerp: types.number(32, {
          range: [1, 80],
          nudgeMultiplier: 1,
          label: 'Follow lerp',
        }),
      }),
      (values) => {
        this.cameraBase = values;
        this.camera.fov = values.fov;
        this.camera.updateProjectionMatrix();
      },
    );

    onTheatreValues(
      this.mainSheet.object('streamWindow', {
        z: types.number(-5, {range: [-20, -1], nudgeMultiplier: 0.1}),
        yOffset: types.number(-0.5, {range: [-5, 5], nudgeMultiplier: 0.05}),
        scaleX: types.number(1, {range: [0.1, 3], nudgeMultiplier: 0.01}),
        scaleY: types.number(1, {range: [0.1, 3], nudgeMultiplier: 0.01}),
        opacity: types.number(1, {range: [0, 1], nudgeMultiplier: 0.01}),
        brightness: types.number(1, {
          range: [0, 2],
          nudgeMultiplier: 0.01,
        }),
        contrast: types.number(1, {
          range: [0, 2],
          nudgeMultiplier: 0.01,
        }),
        saturation: types.number(1.03, {
          range: [0, 2],
          nudgeMultiplier: 0.01,
        }),
        gamma: types.number(1, {
          range: [0.2, 2.2],
          nudgeMultiplier: 0.01,
        }),
        noiseAmount: types.number(0, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
          label: 'Noise amount',
        }),
        noiseScale: types.number(18, {
          range: [0.1, 100],
          nudgeMultiplier: 0.5,
          label: 'Noise scale',
        }),
        noiseSpeed: types.number(0.35, {
          range: [-8, 8],
          nudgeMultiplier: 0.01,
          label: 'Noise speed',
        }),
        noiseContrast: types.number(1, {
          range: [0, 6],
          nudgeMultiplier: 0.05,
          label: 'Noise contrast',
        }),
      }),
      (values) => {
        this.windowValues = values;
        this.videoMaterial.uniforms.uOpacity.value = values.opacity;
        this.videoMaterial.uniforms.uBrightness.value = values.brightness;
        this.videoMaterial.uniforms.uContrast.value = values.contrast;
        this.videoMaterial.uniforms.uSaturation.value = values.saturation;
        this.videoMaterial.uniforms.uGamma.value = values.gamma;
        this.videoMaterial.uniforms.uNoiseAmount.value = values.noiseAmount;
        this.videoMaterial.uniforms.uNoiseScale.value = values.noiseScale;
        this.videoMaterial.uniforms.uNoiseSpeed.value = values.noiseSpeed;
        this.videoMaterial.uniforms.uNoiseContrast.value = values.noiseContrast;
      },
    );

    onTheatreValues(
      this.mainSheet.object('shoppy', {
        src: types.string(SHOPPY_MODEL_URL),
        position: types.compound({
          x: types.number(0, {range: [-10, 10], nudgeMultiplier: 0.05}),
          y: types.number(0, {range: [-10, 10], nudgeMultiplier: 0.05}),
          z: types.number(-6, {range: [-20, 5], nudgeMultiplier: 0.1}),
        }),
        rotation: types.compound({
          x: types.number(0, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
          y: types.number(0, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
          z: types.number(0, {
            range: [-Math.PI, Math.PI],
            nudgeMultiplier: 0.01,
          }),
        }),
        scale: types.compound({
          x: types.number(2.5, {range: [0.01, 10], nudgeMultiplier: 0.05}),
          y: types.number(2.5, {range: [0.01, 10], nudgeMultiplier: 0.05}),
          z: types.number(2.5, {range: [0.01, 10], nudgeMultiplier: 0.05}),
        }),
        anchorY: types.number(0.42, {range: [-2, 2], nudgeMultiplier: 0.01}),
        animationIndex: types.number(0, {range: [0, 10], nudgeMultiplier: 1}),
        visible: types.boolean(true),
      }),
      (values) => this.shoppy?.setValues(values),
    );

    onTheatreValues(
      this.controlsSheet.object('floor', {
        visible: types.boolean(true),
        y: types.number(-0.48, {range: [-3, 1], nudgeMultiplier: 0.01}),
        opacity: types.number(0.42, {range: [0, 1], nudgeMultiplier: 0.01}),
        fadeNear: types.number(7, {range: [0, 40], nudgeMultiplier: 0.5}),
        fadeFar: types.number(18, {range: [1, 80], nudgeMultiplier: 0.5}),
        cellSize: types.number(0.5, {range: [0.1, 4], nudgeMultiplier: 0.05}),
        majorEvery: types.number(8, {range: [2, 24], nudgeMultiplier: 1}),
        rotationOffset: types.number(0, {
          range: [-Math.PI, Math.PI],
          nudgeMultiplier: 0.01,
        }),
        travelSpeed: types.number(4, {
          range: [-12, 12],
          nudgeMultiplier: 0.1,
        }),
      }),
      (values) => {
        this.floor.visible = values.visible;
        this.floor.position.y = values.y;
        this.gridMaterial.uniforms.uOpacity.value = values.opacity;
        this.gridMaterial.uniforms.uFadeNear.value = values.fadeNear;
        this.gridMaterial.uniforms.uFadeFar.value = values.fadeFar;
        this.gridMaterial.uniforms.uCellSize.value = values.cellSize;
        this.gridMaterial.uniforms.uMajorEvery.value = values.majorEvery;
        this.floorControls.rotationOffset = values.rotationOffset;
        this.floorControls.travelSpeed = values.travelSpeed;
        this.gridMaterial.uniforms.uGridYaw.value = values.rotationOffset;
      },
    );

    onTheatreValues(
      this.controlsSheet.object('shadow', {
        visible: types.boolean(true),
        position: types.compound({
          x: types.number(0, {range: [-12, 12], nudgeMultiplier: 0.05}),
          y: types.number(-0.5, {range: [-3, 1], nudgeMultiplier: 0.01}),
          z: types.number(0, {range: [-12, 12], nudgeMultiplier: 0.05}),
        }),
        opacity: types.number(0.28, {range: [0, 1], nudgeMultiplier: 0.01}),
        color: types.rgba({r: 0, g: 0, b: 0, a: 1}),
        size: types.number(80, {range: [1, 200], nudgeMultiplier: 1}),
        width: types.number(1, {
          range: [0.05, 4],
          nudgeMultiplier: 0.05,
          label: 'Width scale',
        }),
        depth: types.number(1, {
          range: [0.05, 4],
          nudgeMultiplier: 0.05,
          label: 'Depth scale',
        }),
        rotation: types.number(0, {
          range: [-Math.PI, Math.PI],
          nudgeMultiplier: 0.01,
        }),
        bottomFadeStart: types.number(SHADOW_BOTTOM_FADE_START, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
          label: 'Fade in from height',
        }),
        bottomFadeEnd: types.number(SHADOW_BOTTOM_FADE_END, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
          label: 'Full at height',
        }),
        receiveShadow: types.boolean(true, {label: 'Receive shadows'}),
      }),
      (values) => {
        this.shadowControls = values;
        this.shadowPlane.visible = values.visible;
        this.shadowPlane.position.set(
          values.position.x,
          values.position.y,
          values.position.z,
        );
        this.shadowPlane.rotation.set(-Math.PI / 2, 0, values.rotation);
        this.shadowPlane.material.color.setRGB(
          values.color.r,
          values.color.g,
          values.color.b,
        );
        this.shadowPlane.receiveShadow = values.receiveShadow;
        this.shadowPlane.scale.set(
          (values.size * values.width) / 80,
          (values.size * values.depth) / 80,
          1,
        );
        this.updateContactShadowTransform();
      },
    );

    onTheatreValues(
      this.controlsSheet.object('lights', {
        ambientIntensity: types.number(1.4, {
          range: [0, 6],
          nudgeMultiplier: 0.1,
        }),
        keyIntensity: types.number(2.2, {range: [0, 8], nudgeMultiplier: 0.1}),
        keyPosition: types.compound({
          x: types.number(-5, {range: [-20, 20], nudgeMultiplier: 0.5}),
          y: types.number(8, {range: [-20, 20], nudgeMultiplier: 0.5}),
          z: types.number(5, {range: [-20, 20], nudgeMultiplier: 0.5}),
        }),
        streamTextureLight: types.compound(
          {
            enabled: types.boolean(true),
            useTexture: types.boolean(true, {label: 'Use stream map'}),
            flipFrontBack: types.boolean(true, {label: 'Flip front/back'}),
            intensity: types.number(2.5, {
              range: [0, 40],
              nudgeMultiplier: 0.1,
            }),
            distance: types.number(18, {
              range: [0, 60],
              nudgeMultiplier: 0.5,
            }),
            angle: types.number(0.62, {
              range: [0.05, Math.PI / 2],
              nudgeMultiplier: 0.01,
            }),
            penumbra: types.number(0.55, {
              range: [0, 1],
              nudgeMultiplier: 0.01,
            }),
            decay: types.number(1.4, {
              range: [0, 4],
              nudgeMultiplier: 0.05,
            }),
            color: types.rgba({r: 1, g: 1, b: 1, a: 1}),
            positionOffset: types.compound({
              x: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
              y: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
              z: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
            }),
            targetOffset: types.compound({
              x: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
              y: types.number(0.4, {range: [-8, 8], nudgeMultiplier: 0.05}),
              z: types.number(0, {range: [-8, 8], nudgeMultiplier: 0.05}),
            }),
          },
          {label: 'Stream light'},
        ),
      }),
      (values) => {
        this.ambientLight.intensity = values.ambientIntensity;
        this.keyLight.intensity = values.keyIntensity;
        this.keyLight.position.set(
          values.keyPosition.x,
          values.keyPosition.y,
          values.keyPosition.z,
        );
        this.streamLightControls = {
          ...this.streamLightControls,
          ...values.streamTextureLight,
        };
        this.applyStreamTextureLightSettings();
      },
    );

    onTheatreValues(
      this.controlsSheet.object('speedOverlay', {
        enabled: types.boolean(true),
        strength: types.number(1, {
          range: [0, 3],
          nudgeMultiplier: 0.01,
        }),
        color: types.rgba({r: 0.59, g: 1, b: 0.39, a: 1}),
        colorMix: types.number(0, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
        }),
        speed: types.number(1, {
          range: [0, 4],
          nudgeMultiplier: 0.01,
        }),
        dpr: types.number(1, {
          range: [0.25, 2],
          nudgeMultiplier: 0.05,
          label: 'DPR / detail',
        }),
        lineWidth: types.number(1, {
          range: [0.02, 1],
          nudgeMultiplier: 0.01,
          label: 'Line width',
        }),
        lineColorShift: types.number(1, {
          range: [0, 2],
          nudgeMultiplier: 0.05,
          label: 'Line color shift',
        }),
        rgbShift: types.number(1, {
          range: [0, 4],
          nudgeMultiplier: 0.05,
          label: 'RGB shift',
        }),
        rgb: types.compound(
          {
            r: types.number(1, {range: [0, 3], nudgeMultiplier: 0.05}),
            g: types.number(1, {range: [0, 3], nudgeMultiplier: 0.05}),
            b: types.number(1, {range: [0, 3], nudgeMultiplier: 0.05}),
          },
          {label: 'RGB levels'},
        ),
        velocityMultiplier: types.number(1.4, {
          range: [0, 4],
          nudgeMultiplier: 0.05,
          label: 'Velocity',
        }),
        smoothing: types.number(7, {
          range: [0.1, 20],
          nudgeMultiplier: 0.1,
        }),
        timeoutMs: types.number(700, {
          range: [0, 2000],
          nudgeMultiplier: 50,
          label: 'Timeout ms',
        }),
        bendStrength: types.number(1, {
          range: [0, 3],
          nudgeMultiplier: 0.01,
          label: 'Bend',
        }),
        centerFollow: types.number(1, {
          range: [-2, 2],
          nudgeMultiplier: 0.01,
          label: 'Center follow',
        }),
      }),
      (values) => {
        this.speedOverlayControls = {
          enabled: values.enabled,
          strength: values.strength,
          speed: values.speed,
          dpr: values.dpr,
          lineWidth: values.lineWidth,
          lineColorShift: values.lineColorShift,
          rgbShift: values.rgbShift,
          rgb: {
            r: values.rgb.r,
            g: values.rgb.g,
            b: values.rgb.b,
          },
          color: {
            r: values.color.r,
            g: values.color.g,
            b: values.color.b,
            a: values.color.a ?? 1,
          },
          colorMix: values.colorMix,
          velocityMultiplier: values.velocityMultiplier,
          smoothing: values.smoothing,
          timeoutMs: values.timeoutMs,
          bendStrength: values.bendStrength,
          centerFollow: values.centerFollow,
        };
      },
    );

    onTheatreValues(
      this.controlsSheet.object('instructions', {
        visible: types.boolean(true),
        text: types.string('WASD to Drive / Arrows to Move'),
        bottom: types.number(20, {
          range: [0, 160],
          nudgeMultiplier: 1,
        }),
        fontSize: types.number(12, {
          range: [8, 32],
          nudgeMultiplier: 1,
          label: 'Font size',
        }),
        opacity: types.number(0.82, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
        }),
        fadeInDelay: types.number(2, {
          range: [0, 8],
          nudgeMultiplier: 0.1,
          label: 'Fade in delay',
        }),
        fadeInSpeed: types.number(2.5, {
          range: [0.1, 12],
          nudgeMultiplier: 0.1,
          label: 'Fade in speed',
        }),
        fadeOutSpeed: types.number(2.5, {
          range: [0.1, 12],
          nudgeMultiplier: 0.1,
          label: 'Fade out speed',
        }),
        letterSpacing: types.number(0.08, {
          range: [0, 2],
          nudgeMultiplier: 0.01,
          label: 'Letter spacing',
        }),
        color: types.rgba({r: 1, g: 1, b: 1, a: 1}),
      }),
      (values) => {
        this.instructionsControls = {
          visible: values.visible,
          text: values.text,
          bottom: values.bottom,
          fontSize: values.fontSize,
          opacity: values.opacity,
          fadeInDelay: values.fadeInDelay,
          fadeInSpeed: values.fadeInSpeed,
          fadeOutSpeed: values.fadeOutSpeed,
          letterSpacing: values.letterSpacing,
          color: {
            r: values.color.r,
            g: values.color.g,
            b: values.color.b,
            a: values.color.a ?? 1,
          },
        };
        if (!values.visible) this.instructionsOpacity = 0;
        this.instructionsOpacity = Math.min(
          this.instructionsOpacity,
          values.opacity,
        );
        this.applyInstructionsStyles();
      },
    );

    onTheatreValues(
      this.controlsSheet.object('driveCamera', {
        positionOffset: types.compound(
          {
            x: types.number(0, {nudgeMultiplier: 0.01}),
            y: types.number(0, {nudgeMultiplier: 0.01}),
            z: types.number(0, {nudgeMultiplier: 0.01}),
          },
          {label: 'position offset'},
        ),
        rotationOffset: types.compound(
          {
            x: types.number(0, {
              range: [-Math.PI, Math.PI],
              nudgeMultiplier: 0.01,
            }),
            y: types.number(0, {
              range: [-Math.PI, Math.PI],
              nudgeMultiplier: 0.01,
            }),
            z: types.number(0, {
              range: [-Math.PI, Math.PI],
              nudgeMultiplier: 0.01,
            }),
          },
          {label: 'rotation offset'},
        ),
      }),
      (values) => {
        this.driveCameraOffset = values;
      },
    );

    onTheatreValues(
      this.controlsSheet.object('driveMode', {
        maxSpeed: types.number(5, {range: [0.5, 200], nudgeMultiplier: 0.1}),
        acceleration: types.number(4, {range: [0.5, 12], nudgeMultiplier: 0.1}),
        braking: types.number(8, {range: [1, 18], nudgeMultiplier: 0.1}),
        friction: types.number(1.5, {range: [0.1, 6], nudgeMultiplier: 0.1}),
        wheelSpinSpeed: types.number(4, {range: [0, 15], nudgeMultiplier: 0.1}),
        maxSteerAngle: types.number(0.3, {
          range: [0.05, 1],
          nudgeMultiplier: 0.01,
        }),
        orbitSpeed: types.number(0.12, {
          range: [-1, 1],
          nudgeMultiplier: 0.01,
          label: 'Camera turn',
        }),
        carYawAmount: types.number(0.18, {
          range: [-1, 1],
          nudgeMultiplier: 0.01,
          label: 'Car yaw',
        }),
        carRollAmount: types.number(0.05, {
          range: [-0.5, 0.5],
          nudgeMultiplier: 0.01,
          label: 'Car roll',
        }),
        visualForwardBoost: types.number(3, {
          range: [0, 10],
          nudgeMultiplier: 0.1,
        }),
        visualReverseBoost: types.number(3, {
          range: [0, 10],
          nudgeMultiplier: 0.1,
        }),
        gazeStrength: types.number(1, {
          range: [0, 2],
          nudgeMultiplier: 0.05,
        }),
        gazeLerp: types.number(3, {
          range: [0.1, 12],
          nudgeMultiplier: 0.1,
          label: 'Gaze lerp',
        }),
        windowGazeLerp: types.number(18, {
          range: [0.1, 60],
          nudgeMultiplier: 0.5,
          label: 'Window gaze lerp',
        }),
        introSpinEnabled: types.boolean(true, {label: 'Intro spin enabled'}),
        introSpinStartYaw: types.number(Math.PI, {
          range: [-Math.PI * 2, Math.PI * 2],
          nudgeMultiplier: 0.05,
          label: 'Intro spin start yaw',
        }),
        introSpinDuration: types.number(1.25, {
          range: [0, 4],
          nudgeMultiplier: 0.05,
          label: 'Intro spin duration',
        }),
        introSpinBlockDriving: types.boolean(true, {
          label: 'Intro spin blocks driving',
        }),
        popupMoveSpeed: types.number(POPUP_KEYBOARD_MOVE_SPEED, {
          range: [0, 800],
          nudgeMultiplier: 5,
          label: 'Popup move speed',
        }),
        popupTurnMoveAmount: types.number(1, {
          range: [0, 3],
          nudgeMultiplier: 0.05,
          label: 'Popup turn move',
        }),
        popupMoveLerp: types.number(POPUP_KEYBOARD_MOVE_LERP, {
          range: [0.1, 30],
          nudgeMultiplier: 0.1,
          label: 'Popup move lerp',
        }),
        popupStopLerp: types.number(POPUP_KEYBOARD_STOP_LERP, {
          range: [0.1, 30],
          nudgeMultiplier: 0.1,
          label: 'Popup stop lerp',
        }),
        popupPredictWindowMove: types.boolean(true, {
          label: 'Predict window move',
        }),
        dragAccelerate: types.boolean(true, {
          label: 'Drag accelerates',
        }),
        dragThrottle: types.number(1, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
          label: 'Drag throttle',
        }),
        dragHoldMs: types.number(POPUP_MANUAL_DRAG_HOLD_MS, {
          range: [50, 5000],
          nudgeMultiplier: 100,
          label: 'Drag hold ms',
        }),
        dragPositionLerp: types.number(POPUP_DRAG_POSITION_LERP, {
          range: [0.1, 60],
          nudgeMultiplier: 0.5,
          label: 'Drag position lerp',
        }),
        cameraShakeEnabled: types.boolean(true, {label: 'Shake enabled'}),
        cameraShakeAmount: types.number(0.05, {
          range: [0, 0.5],
          nudgeMultiplier: 0.005,
          label: 'Shake amount',
        }),
        cameraShakeFrequency: types.number(18, {
          range: [0, 60],
          nudgeMultiplier: 0.5,
          label: 'Shake frequency',
        }),
        cameraShakeStartSpeed: types.number(0.75, {
          range: [0, 1],
          nudgeMultiplier: 0.01,
          label: 'Shake start speed',
        }),
        revealSpeedThreshold: types.number(0.35, {
          range: [0.05, 1],
          nudgeMultiplier: 0.01,
        }),
      }),
      (values) => {
        this.controls = values;
      },
    );
  }

  applyCarPbrSettings() {
    const values = this.carPbrValues;
    const envMap = values.streamEnvironment ? this.streamEnvMap : null;

    for (const material of this.bodyMaterials) {
      // The GLB's body material carries the Shopify Racing livery as an
      // embedded base-color texture. Do not force the drive-scene PBR override
      // onto authored textured materials: high metalness + video env map +
      // bright lights clips the mostly-white livery into a flat white shell.
      // Keep the override for fallback/untextured materials only.
      if (material.userData.hasAuthoredTexture) {
        material.envMap = null;
        material.needsUpdate = true;
        continue;
      }

      material.envMap = envMap;
      material.envMapIntensity = values.envMapIntensity;
      material.metalness = values.metalness;
      material.roughness = values.roughness;
      if ('clearcoat' in material) material.clearcoat = values.clearcoat;
      if ('clearcoatRoughness' in material) {
        material.clearcoatRoughness = values.clearcoatRoughness;
      }
      material.needsUpdate = true;
    }
  }

  async loadCarModel(src = this.assetSources.carSrc) {
    const loadToken = ++this.carLoadToken;
    const {car, wheels, bodyMaterials} = await loadCar(src);
    if (loadToken !== this.carLoadToken) return;

    if (this.car) {
      this.carRig.remove(this.car);
      disposeObject(this.car);
    }

    this.car = car;
    this.currentCarSrc = src;
    this.wheels = wheels;
    this.bodyMaterials = bodyMaterials;
    const values = this.carValues;
    if (values?.position) {
      this.carRigPosition = {...this.carRigPosition, ...values.position};
    }
    if (values?.lookAt) {
      this.carLookAt = {...this.carLookAt, ...values.lookAt};
    }
    this.applyCarRigPosition();
    this.car.userData.baseY = values?.y ?? 0;
    this.car.userData.baseRotationY = values?.rotation?.y ?? -1.567;
    this.car.scale.setScalar(values?.scale ?? 0.015);
    this.car.position.y = this.car.userData.baseY;
    this.car.rotation.y = values?.rotation?.y ?? -1.567;
    if (values?.bodyColor) {
      const color = new THREE.Color(
        values.bodyColor.r,
        values.bodyColor.g,
        values.bodyColor.b,
      );
      applyBodyTint(this.bodyMaterials, color);
    }
    if (values?.pbr) this.carPbrValues = {...this.carPbrValues, ...values.pbr};
    this.applyCarPbrSettings();
    this.carRig.add(car);
    this.introSpinStartedAt = performance.now();
    this.introSpinComplete = false;
    this.introSpinOffset = this.controls.introSpinStartYaw ?? Math.PI;
    this.carRig.rotation.y = this.introSpinOffset;
  }

  connectWebRTC() {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    const fallbackTimer = window.setTimeout(() => {
      this.renderer.domElement.classList.add('connected');
      document.getElementById('loader')?.classList.add('hidden');
    }, 2500);

    createReceiver(video, this.sessionId)
      .then(() => {
        window.clearTimeout(fallbackTimer);
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;

        const envTexture = new THREE.VideoTexture(video);
        envTexture.minFilter = THREE.LinearFilter;
        envTexture.magFilter = THREE.LinearFilter;
        envTexture.generateMipmaps = false;
        envTexture.colorSpace = THREE.SRGBColorSpace;
        envTexture.mapping = THREE.EquirectangularReflectionMapping;

        const lightTexture = new THREE.VideoTexture(video);
        lightTexture.minFilter = THREE.LinearFilter;
        lightTexture.magFilter = THREE.LinearFilter;
        lightTexture.generateMipmaps = false;
        lightTexture.colorSpace = THREE.SRGBColorSpace;

        this.videoMaterial.uniforms.uMap.value = texture;
        this.videoMaterial.needsUpdate = true;
        this.videoTexture = texture;
        this.streamEnvMap = envTexture;
        this.streamLightTexture = lightTexture;
        this.applyCarPbrSettings();
        this.applyStreamTextureLightSettings();
        this.renderer.domElement.classList.add('connected');
        document.getElementById('loader')?.classList.add('hidden');
        popupChannel.send(MSG.WEBRTC_READY, {
          time: Date.now(),
          sessionId: this.sessionId,
        });
      })
      .catch(() => {
        window.clearTimeout(fallbackTimer);
        this.renderer.domElement.classList.add('connected');
        document.getElementById('loader')?.classList.add('hidden');
      });
  }

  listenForSections() {
    popupChannel.on(MSG.ACTIVE_SECTION, (data) => {
      if (!data) return;
      const nextActiveHandle = data.handle || this.activeHandle;
      const isPortalOverlayActive =
        isDrivePortalOverlayHandle(nextActiveHandle);
      if (!isPortalOverlayActive) {
        this.activeHandle = nextActiveHandle;
        if (
          data.drivePortalTarget &&
          data.drivePortalTarget !== this.targetSceneHandle
        ) {
          this.targetSceneHandle = data.drivePortalTarget;
          this.lastDriveSceneReveal = {key: '', time: 0};
        }
      }
      if (
        Array.isArray(data.sectionHandles) &&
        data.sectionHandles.length > 0
      ) {
        this.sectionHandles = data.sectionHandles.filter(
          (handle) =>
            handle && handle !== 'outro' && !isDrivePortalOverlayHandle(handle),
        );
      }
    });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.bgCamera.aspect = width / height;
    this.bgCamera.updateProjectionMatrix();
  }

  applyStreamTextureLightSettings() {
    if (!this.streamLight) return;
    const values = this.streamLightControls;
    this.streamLight.visible = values.enabled;
    this.streamLight.intensity = values.intensity;
    this.streamLight.distance = values.distance;
    this.streamLight.angle = values.angle;
    this.streamLight.penumbra = values.penumbra;
    this.streamLight.decay = values.decay;
    this.streamLight.color.setRGB(
      values.color.r,
      values.color.g,
      values.color.b,
    );

    const texture = this.streamLightTexture || this.videoTexture;
    if (texture) {
      texture.repeat.set(1, values.flipFrontBack ? -1 : 1);
      texture.offset.set(0, values.flipFrontBack ? 1 : 0);
      texture.needsUpdate = true;
    }
    this.streamLight.map = values.useTexture ? texture || null : null;
  }

  updateStreamTextureLight() {
    if (!this.streamLight || !this.streamLightTarget) return;
    const values = this.streamLightControls;
    const positionOffset = values.positionOffset;
    const targetOffset = values.targetOffset;
    this.streamLight.position.set(
      this.bgPlane.position.x + positionOffset.x,
      this.bgPlane.position.y + positionOffset.y,
      this.bgPlane.position.z + positionOffset.z,
    );
    this.streamLightTarget.position.set(
      this.driveRig.position.x + targetOffset.x,
      this.driveRig.position.y + targetOffset.y,
      this.driveRig.position.z + targetOffset.z,
    );
    this.streamLightTarget.updateMatrixWorld();
  }

  applyInstructionsStyles() {
    const element = this.instructionsElement;
    if (!element) return;

    const values = this.instructionsControls;
    const color = values.color ?? {r: 1, g: 1, b: 1, a: 1};
    const r = Math.round(THREE.MathUtils.clamp(color.r ?? 1, 0, 1) * 255);
    const g = Math.round(THREE.MathUtils.clamp(color.g ?? 1, 0, 1) * 255);
    const b = Math.round(THREE.MathUtils.clamp(color.b ?? 1, 0, 1) * 255);
    const a = THREE.MathUtils.clamp(color.a ?? 1, 0, 1);

    element.textContent = values.text || '';
    element.style.bottom = `${values.bottom ?? 20}px`;
    element.style.fontSize = `${values.fontSize ?? 12}px`;
    element.style.letterSpacing = `${values.letterSpacing ?? 0.08}em`;
    element.style.color = `rgb(${r} ${g} ${b} / ${a})`;
    element.style.opacity = `${THREE.MathUtils.clamp(
      this.instructionsOpacity,
      0,
      1,
    )}`;
  }

  updateInstructions(delta) {
    const values = this.instructionsControls;
    const hasDriveInput =
      keys.forward ||
      keys.backward ||
      keys.left ||
      keys.right ||
      Math.abs(this.speed) > 0.05;
    if (hasDriveInput) this.instructionsDismissed = true;

    const elapsedSeconds =
      (performance.now() - this.instructionsStartedAt) / 1000;
    const canShow =
      values.visible &&
      !this.instructionsDismissed &&
      elapsedSeconds >= Math.max(0, values.fadeInDelay ?? 2);
    const targetOpacity = canShow ? values.opacity : 0;
    const fadeSpeed = Math.max(
      0.1,
      targetOpacity > this.instructionsOpacity
        ? (values.fadeInSpeed ?? 2.5)
        : (values.fadeOutSpeed ?? 2.5),
    );
    const lerp = 1 - Math.exp(-delta * fadeSpeed);
    this.instructionsOpacity +=
      (targetOpacity - this.instructionsOpacity) * lerp;
    if (this.instructionsOpacity < 0.001) this.instructionsOpacity = 0;
    this.applyInstructionsStyles();
  }

  getPopupWindowMoveTarget() {
    const popupX = (popupMoveKeys.right ? 1 : 0) - (popupMoveKeys.left ? 1 : 0);
    const driveX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const turnMoveAmount = THREE.MathUtils.clamp(
      this.controls.popupTurnMoveAmount ?? 1,
      0,
      3,
    );
    const x = popupX + driveX * turnMoveAmount;
    const y = (popupMoveKeys.down ? 1 : 0) - (popupMoveKeys.up ? 1 : 0);
    return {x, y, active: Math.hypot(x, y) > 0};
  }

  updatePopupWindowMovement(delta) {
    const target = this.getPopupWindowMoveTarget();
    const move = this.popupWindowMove;
    const activeLerp = Math.max(
      0.1,
      this.controls.popupMoveLerp ?? POPUP_KEYBOARD_MOVE_LERP,
    );
    const stopLerp = Math.max(
      0.1,
      this.controls.popupStopLerp ?? POPUP_KEYBOARD_STOP_LERP,
    );
    const lerp = 1 - Math.exp(-delta * (target.active ? activeLerp : stopLerp));

    move.x += (target.x - move.x) * lerp;
    move.y += (target.y - move.y) * lerp;
    if (Math.hypot(move.x, move.y) < 0.01) {
      move.x = 0;
      move.y = 0;
      this.popupWindowMoveRemainder.x = 0;
      this.popupWindowMoveRemainder.y = 0;
      return;
    }

    const normalizedSpeed = THREE.MathUtils.clamp(
      Math.abs(this.speed) / Math.max(0.001, this.controls.maxSpeed ?? 1),
      0,
      1,
    );
    const speedScale =
      0.1 + THREE.MathUtils.smoothstep(normalizedSpeed, 0.0, 0.2);
    const distance =
      Math.max(0, this.controls.popupMoveSpeed ?? POPUP_KEYBOARD_MOVE_SPEED) *
      speedScale *
      delta;
    const rawMoveX = move.x * distance + this.popupWindowMoveRemainder.x;
    const rawMoveY = move.y * distance + this.popupWindowMoveRemainder.y;
    const moveX = Math.trunc(rawMoveX);
    const moveY = Math.trunc(rawMoveY);
    this.popupWindowMoveRemainder.x = rawMoveX - moveX;
    this.popupWindowMoveRemainder.y = rawMoveY - moveY;
    if (moveX === 0 && moveY === 0) return;

    const actualX = window.screenX ?? window.screenLeft ?? 0;
    const actualY = window.screenY ?? window.screenTop ?? 0;
    const now = performance.now();
    const prediction = this.popupWindowPrediction;
    const useExistingPrediction =
      prediction.x !== null && prediction.y !== null && now < prediction.until;
    const baseX = useExistingPrediction ? prediction.x : actualX;
    const baseY = useExistingPrediction ? prediction.y : actualY;
    prediction.x = baseX + moveX;
    prediction.y = baseY + moveY;
    prediction.until = now + 160;

    window.moveBy(moveX, moveY);
  }

  isIntroSpinActive() {
    return (
      this.controls.introSpinEnabled !== false &&
      this.controls.introSpinBlockDriving !== false &&
      !this.introSpinComplete
    );
  }

  updateIntroSpin() {
    if (!this.carRig) return;
    if (this.controls.introSpinEnabled === false) {
      this.introSpinComplete = true;
      this.introSpinOffset = 0;
      this.carRig.rotation.y = 0;
      return;
    }

    const duration = Math.max(0, this.controls.introSpinDuration ?? 1.25);
    if (duration <= 0) {
      this.introSpinComplete = true;
      this.introSpinOffset = 0;
      this.carRig.rotation.y = 0;
      return;
    }

    const elapsed = (performance.now() - this.introSpinStartedAt) / 1000;
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const startYaw = this.controls.introSpinStartYaw ?? Math.PI;
    this.introSpinOffset = startYaw * (1 - eased);
    this.carRig.rotation.y = this.introSpinOffset;
    if (progress >= 1) {
      this.introSpinComplete = true;
      this.introSpinOffset = 0;
      this.carRig.rotation.y = 0;
    }
  }

  getPopupRelativeGazeX() {
    const mainWindow = popupChannel.get(MSG.MAIN_WINDOW);
    const canvasRect = popupChannel.get(MSG.CANVAS_RECT);
    if (!mainWindow || !canvasRect || canvasRect.w <= 0) return null;

    const actualPopupX = window.screenX ?? window.screenLeft ?? 0;
    const now = performance.now();
    const prediction = this.popupWindowPrediction;
    const predictionActive =
      this.controls.popupPredictWindowMove !== false &&
      prediction.x !== null &&
      now < prediction.until &&
      Math.abs(prediction.x - actualPopupX) < 80;
    const popupX = predictionActive ? prediction.x : actualPopupX;
    const popupCenterX = popupX + window.innerWidth / 2;
    const canvasAbsX = mainWindow.x + canvasRect.x;
    const relativeX = (popupCenterX - canvasAbsX) / canvasRect.w;

    return THREE.MathUtils.clamp(relativeX * 2 - 1, -1, 1);
  }

  updateDrive(delta) {
    const blockDriving = this.isIntroSpinActive();
    const dragThrottle =
      this.controls.dragAccelerate !== false &&
      performance.now() < this.manualWindowDrag.activeUntil
        ? THREE.MathUtils.clamp(this.controls.dragThrottle ?? 1, 0, 1)
        : 0;
    const throttle = blockDriving
      ? 0
      : keys.forward
        ? 1
        : keys.backward
          ? -1
          : dragThrottle;
    const steerInput = blockDriving ? 0 : keys.left ? 1 : keys.right ? -1 : 0;

    if (throttle > 0) {
      this.speed = Math.min(
        this.speed + this.controls.acceleration * delta,
        this.controls.maxSpeed,
      );
    } else if (throttle < 0) {
      this.speed = Math.max(
        this.speed - this.controls.braking * delta,
        -this.controls.maxSpeed * 0.4,
      );
    } else {
      this.speed *= Math.max(0, 1 - this.controls.friction * delta);
      if (Math.abs(this.speed) < 0.01) this.speed = 0;
    }

    const targetSteer = steerInput * this.controls.maxSteerAngle;
    this.steerAngle +=
      (targetSteer - this.steerAngle) * Math.min(1, delta * 10);
    this.smoothSteer +=
      (steerInput - this.smoothSteer) * Math.min(1, delta * 6);
    if (Math.abs(this.smoothSteer) < 0.001) this.smoothSteer = 0;
    const popupGazeX = this.getPopupRelativeGazeX();
    const hasWindowGaze = popupGazeX !== null;
    const targetPopupRelativeX = popupGazeX ?? -this.smoothSteer;
    const snapWindowGaze =
      hasWindowGaze && !blockDriving && this.getPopupWindowMoveTarget().active;
    const gazeLerpSpeed = hasWindowGaze
      ? (this.controls.windowGazeLerp ?? 18)
      : this.controls.gazeLerp;
    const gazeLerp = snapWindowGaze
      ? 1
      : 1 - Math.exp(-delta * Math.max(0.01, gazeLerpSpeed));
    this.popupRelativeX +=
      (targetPopupRelativeX - this.popupRelativeX) * gazeLerp;
    if (Math.abs(this.popupRelativeX) < 0.001) this.popupRelativeX = 0;
    const targetGazeX = THREE.MathUtils.clamp(
      this.popupRelativeX * this.controls.gazeStrength,
      -1,
      1,
    );
    this.gazeX += (targetGazeX - this.gazeX) * gazeLerp;
    if (Math.abs(this.gazeX) < 0.001) this.gazeX = 0;

    this.wheelSpin += this.speed * delta * this.controls.wheelSpinSpeed;
    this.gridTravel += this.speed * delta * this.floorControls.travelSpeed;
    this.gridMaterial.uniforms.uGridOffset.value.y = this.gridTravel;
    spinWheels(this.wheels, this.wheelSpin, this.steerAngle);

    if (this.car) {
      const baseY = this.car.userData.baseY ?? 0;
      const bounceY =
        (Math.abs(this.speed) / Math.max(0.001, this.controls.maxSpeed)) * 0.08;
      this.car.rotation.z = 0;
      this.car.position.y +=
        (baseY + bounceY - this.car.position.y) * Math.min(1, delta * 4);
    }
  }

  broadcastPopupPosition() {
    const rect = {
      x: window.screenX ?? window.screenLeft ?? 0,
      y: window.screenY ?? window.screenTop ?? 0,
      w: window.innerWidth,
      h: window.innerHeight,
    };

    const rectKey = `${rect.x},${rect.y},${rect.w},${rect.h}`;
    if (rectKey !== this.popupBroadcast.lastRect) {
      popupChannel.send(MSG.POPUP_POSITION, rect);
      this.popupBroadcast.lastRect = rectKey;
    }

    const mainWindow = popupChannel.get(MSG.MAIN_WINDOW);
    const canvasRect = popupChannel.get(MSG.CANVAS_RECT);
    if (!mainWindow || !canvasRect) return;

    const popupCenterX = rect.x + rect.w / 2;
    const popupCenterY = rect.y + POPUP_CONTENT_Y_OFFSET + rect.h / 2;
    const canvasAbsX = mainWindow.x + canvasRect.x;
    const canvasAbsY = mainWindow.y + canvasRect.y;
    const relX = (popupCenterX - canvasAbsX) / canvasRect.w;
    const relY = 1 - (popupCenterY - canvasAbsY) / canvasRect.h;
    const scaleX = rect.w / canvasRect.w;
    const scaleY = rect.h / canvasRect.h;

    const now = performance.now();
    if (
      this.popupBroadcast.lastX !== null &&
      this.popupBroadcast.lastTime !== null
    ) {
      const dt = (now - this.popupBroadcast.lastTime) / 1000;
      if (dt > 0 && dt < 0.1) {
        const vx = (relX - this.popupBroadcast.lastX) / dt;
        const vy = (relY - this.popupBroadcast.lastY) / dt;
        this.popupBroadcast.velocityX =
          this.popupBroadcast.velocityX * 0.7 + vx * 0.3;
        this.popupBroadcast.velocityY =
          this.popupBroadcast.velocityY * 0.7 + vy * 0.3;
      }
    }
    this.popupBroadcast.lastX = relX;
    this.popupBroadcast.lastY = relY;
    this.popupBroadcast.lastTime = now;

    const centerKey = `${relX.toFixed(4)},${relY.toFixed(4)},${scaleX.toFixed(4)},${scaleY.toFixed(4)}`;
    if (
      centerKey !== this.popupBroadcast.lastCenter ||
      Math.abs(this.popupBroadcast.velocityX) > 0.01 ||
      Math.abs(this.popupBroadcast.velocityY) > 0.01
    ) {
      popupChannel.send(MSG.POPUP_CENTER, {
        x: relX,
        y: relY,
        vx: this.popupBroadcast.velocityX,
        vy: this.popupBroadcast.velocityY,
        active: true,
        color: {r: 0.59, g: 1, b: 0.39},
        scale: {x: scaleX, y: scaleY},
        scanActive: true,
      });
      this.popupBroadcast.lastCenter = centerKey;
    }
  }

  updateVideoAlignment(delta) {
    const canvasRect = popupChannel.get(MSG.CANVAS_RECT);
    const mainWindow = popupChannel.get(MSG.MAIN_WINDOW);
    const planeZ = this.windowValues.z;
    const popupW = window.innerWidth;
    const popupH = window.innerHeight;
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = Math.abs(planeZ);
    const visibleH = 2 * Math.tan(fov / 2) * dist;
    const visibleW = visibleH * (popupW / popupH);

    if (!canvasRect || !mainWindow) {
      this.popupVerticalProgress +=
        (0.5 - this.popupVerticalProgress) * Math.min(1, delta * 8);
      this.windowMotion.initialized = false;
      this.videoAlign.initialized = false;
      this.bgPlane.position.set(0, 0, planeZ);
      this.bgPlane.scale.set(
        visibleW * this.windowValues.scaleX,
        visibleH * this.windowValues.scaleY,
        1,
      );
      this.shoppy?.updatePosition(0, 0, visibleH * this.windowValues.scaleY);
      return;
    }

    const actualPopupX = window.screenX ?? window.screenLeft ?? 0;
    const actualPopupY = window.screenY ?? window.screenTop ?? 0;
    const motion = this.windowMotion;
    const moveTarget = this.getPopupWindowMoveTarget();
    const now = performance.now();
    const prediction = this.popupWindowPrediction;
    const predictionActive =
      this.controls.popupPredictWindowMove !== false &&
      prediction.x !== null &&
      prediction.y !== null &&
      now < prediction.until &&
      Math.hypot(prediction.x - actualPopupX, prediction.y - actualPopupY) < 80;
    const popupX = predictionActive ? prediction.x : actualPopupX;
    const popupY = predictionActive ? prediction.y : actualPopupY;
    if (!predictionActive && now >= prediction.until) {
      prediction.x = null;
      prediction.y = null;
    }
    const canvasCenterX = mainWindow.x + canvasRect.x + canvasRect.w / 2;
    const canvasCenterY = mainWindow.y + canvasRect.y + canvasRect.h / 2;
    const rawPopupCenterX = popupX + popupW / 2;
    const rawPopupCenterY = popupY + POPUP_CONTENT_Y_OFFSET + popupH / 2;
    const manualDragDelta =
      motion.lastRawCenterX !== null && motion.lastRawCenterY !== null
        ? Math.hypot(
            rawPopupCenterX - motion.lastRawCenterX,
            rawPopupCenterY - motion.lastRawCenterY,
          )
        : 0;
    if (
      !moveTarget.active &&
      !predictionActive &&
      manualDragDelta > POPUP_MANUAL_DRAG_THRESHOLD_PX
    ) {
      this.manualWindowDrag.activeUntil =
        now + Math.max(0, this.controls.dragHoldMs ?? POPUP_MANUAL_DRAG_HOLD_MS);
      this.popupWindowMove.x = 0;
      this.popupWindowMove.y = 0;
      this.popupWindowMoveRemainder.x = 0;
      this.popupWindowMoveRemainder.y = 0;
    }
    const manualWindowDragActive = now < this.manualWindowDrag.activeUntil;
    const dragPositionLerpSpeed = Math.max(
      0.1,
      this.controls.dragPositionLerp ?? POPUP_DRAG_POSITION_LERP,
    );
    const dragPositionLerp = 1 - Math.exp(-delta * dragPositionLerpSpeed);
    motion.lastRawCenterX = rawPopupCenterX;
    motion.lastRawCenterY = rawPopupCenterY;
    motion.targetCenterX = rawPopupCenterX;
    motion.targetCenterY = rawPopupCenterY;
    if (!motion.initialized) {
      motion.currentCenterX = rawPopupCenterX;
      motion.currentCenterY = rawPopupCenterY;
      motion.initialized = true;
    } else if (manualWindowDragActive) {
      motion.currentCenterX +=
        (motion.targetCenterX - motion.currentCenterX) * dragPositionLerp;
      motion.currentCenterY +=
        (motion.targetCenterY - motion.currentCenterY) * dragPositionLerp;
    } else {
      motion.currentCenterX = motion.targetCenterX;
      motion.currentCenterY = motion.targetCenterY;
    }

    const offsetX = canvasCenterX - motion.currentCenterX;
    const offsetY = canvasCenterY - motion.currentCenterY;
    const targetVerticalProgress = THREE.MathUtils.clamp(
      (motion.currentCenterY - (mainWindow.y + canvasRect.y)) / canvasRect.h,
      0,
      1,
    );
    if (manualWindowDragActive) {
      this.popupVerticalProgress +=
        (targetVerticalProgress - this.popupVerticalProgress) * dragPositionLerp;
    } else {
      this.popupVerticalProgress = targetVerticalProgress;
    }

    this.videoAlign.targetX = (offsetX / popupW) * visibleW;
    this.videoAlign.targetY =
      (-offsetY / popupH) * visibleH + this.windowValues.yOffset;
    if (!this.videoAlign.initialized) {
      this.videoAlign.currentX = this.videoAlign.targetX;
      this.videoAlign.currentY = this.videoAlign.targetY;
      this.videoAlign.initialized = true;
    } else if (manualWindowDragActive) {
      this.videoAlign.currentX +=
        (this.videoAlign.targetX - this.videoAlign.currentX) * dragPositionLerp;
      this.videoAlign.currentY +=
        (this.videoAlign.targetY - this.videoAlign.currentY) * dragPositionLerp;
    } else {
      this.videoAlign.currentX = this.videoAlign.targetX;
      this.videoAlign.currentY = this.videoAlign.targetY;
    }

    this.bgPlane.position.set(
      this.videoAlign.currentX,
      this.videoAlign.currentY,
      planeZ,
    );
    const planeH =
      visibleH * (canvasRect.h / popupH) * this.windowValues.scaleY;
    this.bgPlane.scale.set(
      visibleW * (canvasRect.w / popupW) * this.windowValues.scaleX,
      planeH,
      1,
    );
    this.shoppy?.updatePosition(
      this.videoAlign.currentX,
      this.videoAlign.currentY,
      planeH,
    );
  }

  updateContactShadowTransform() {
    if (!this.contactShadow || !this.contactShadowMaterial || !this.shadowPlane)
      return;
    const values = this.shadowControls;
    const size = (values.size ?? 80) / 80;
    const width = (values.width ?? 1) * size;
    const depth = (values.depth ?? 1) * size;
    const fadeStart = values.bottomFadeStart ?? SHADOW_BOTTOM_FADE_START;
    const fadeEnd = values.bottomFadeEnd ?? SHADOW_BOTTOM_FADE_END;
    const bottomFade = THREE.MathUtils.smoothstep(
      this.popupVerticalProgress,
      Math.min(fadeStart, fadeEnd),
      Math.max(fadeStart, fadeEnd),
    );
    const opacity = (values.opacity ?? 0) * (values.color?.a ?? 1) * bottomFade;

    this.shadowPlane.visible = values.visible && opacity > 0.001;
    this.shadowPlane.material.opacity = opacity;
    this.contactShadow.visible = values.visible && opacity > 0.001;
    this.contactShadow.position.set(
      values.position?.x ?? 0,
      (values.position?.y ?? -0.5) + 0.01,
      values.position?.z ?? 0,
    );
    this.contactShadow.rotation.set(-Math.PI / 2, 0, values.rotation ?? 0);
    this.contactShadow.scale.set(3.4 * width, 1.25 * depth, 1);
    this.contactShadowMaterial.uniforms.uOpacity.value = opacity * 0.45;
    this.contactShadowMaterial.uniforms.uColor.value.setRGB(
      values.color?.r ?? 0,
      values.color?.g ?? 0,
      values.color?.b ?? 0,
    );
  }

  applyCarRigPosition() {
    const {x, y, z} = this.carRigPosition;
    this.driveRig.position.x = x;
    this.driveRig.position.y = y;
    this.driveRig.position.z = z;
    this.keyLight.target.position.x = x;
    this.keyLight.target.position.y = y;
    this.keyLight.target.position.z = z;
    this.updateContactShadowTransform();
  }

  updateCarGridAttachment() {
    this.applyCarRigPosition();
  }

  broadcastDriveState() {
    const maxSpeed = Math.max(0.001, this.controls.maxSpeed);
    const speedRatio = THREE.MathUtils.clamp(this.speed / maxSpeed, -1, 1);
    const maxSpeedBoost = maxSpeed / 5;
    const timeScale =
      speedRatio >= 0
        ? 1 + speedRatio * this.controls.visualForwardBoost * maxSpeedBoost
        : speedRatio * this.controls.visualReverseBoost * maxSpeedBoost;
    const gazeX = this.gazeX;
    const now = performance.now();
    const cameraOffset = this.driveCameraOffset;
    const speedOverlay = this.speedOverlayControls;
    const cameraShake = {
      enabled: this.controls.cameraShakeEnabled ?? false,
      amount: this.controls.cameraShakeAmount ?? 0,
      frequency: this.controls.cameraShakeFrequency ?? 18,
      startSpeed: this.controls.cameraShakeStartSpeed ?? 0.75,
      speedRatio: Math.abs(speedRatio),
    };
    const cameraKey = `${cameraOffset.positionOffset.x.toFixed(2)},${cameraOffset.positionOffset.y.toFixed(2)},${cameraOffset.positionOffset.z.toFixed(2)},${cameraOffset.rotationOffset.x.toFixed(2)},${cameraOffset.rotationOffset.y.toFixed(2)},${cameraOffset.rotationOffset.z.toFixed(2)}`;
    const cameraShakeKey = `${cameraShake.enabled},${cameraShake.amount.toFixed(3)},${cameraShake.frequency.toFixed(1)},${cameraShake.startSpeed.toFixed(2)}`;
    const speedOverlayKey = `${speedOverlay.enabled},${speedOverlay.strength.toFixed(2)},${speedOverlay.speed.toFixed(2)},${speedOverlay.dpr.toFixed(2)},${speedOverlay.lineWidth.toFixed(2)},${speedOverlay.lineColorShift.toFixed(2)},${speedOverlay.rgbShift.toFixed(2)},${speedOverlay.rgb.r.toFixed(2)},${speedOverlay.rgb.g.toFixed(2)},${speedOverlay.rgb.b.toFixed(2)},${speedOverlay.color.r.toFixed(2)},${speedOverlay.color.g.toFixed(2)},${speedOverlay.color.b.toFixed(2)},${speedOverlay.color.a.toFixed(2)},${speedOverlay.colorMix.toFixed(2)},${speedOverlay.velocityMultiplier.toFixed(2)},${speedOverlay.smoothing.toFixed(2)},${speedOverlay.timeoutMs.toFixed(0)},${speedOverlay.bendStrength.toFixed(2)},${speedOverlay.centerFollow.toFixed(2)}`;
    const key = `${this.speed.toFixed(2)},${timeScale.toFixed(2)},${gazeX.toFixed(2)},${cameraKey},${cameraShakeKey},${speedOverlayKey}`;
    const elapsed = now - this.lastDriveState.time;
    if (elapsed < 50) return;
    if (key === this.lastDriveState.key && elapsed < 250) return;

    const normalizedSpeed = Math.min(Math.abs(this.speed) / maxSpeed, 1);
    const revealThreshold = Math.max(
      0.05,
      this.controls.revealSpeedThreshold || 0.35,
    );
    const revealProgress = THREE.MathUtils.smoothstep(
      normalizedSpeed,
      0.0,
      revealThreshold,
    );

    popupChannel.send(MSG.DRIVE_STATE, {
      sessionId: this.sessionId,
      speed: this.speed,
      maxSpeed: this.controls.maxSpeed,
      timeScale,
      steer: this.smoothSteer,
      gazeX,
      revealProgress,
      cameraOffset,
      cameraShake,
      speedOverlay,
    });
    this.lastDriveState.key = key;
    this.lastDriveState.time = now;

    if (this.targetSceneHandle) {
      const revealKey = `${this.activeHandle},${this.targetSceneHandle},${revealProgress.toFixed(3)}`;
      if (
        revealKey !== this.lastDriveSceneReveal.key ||
        now - this.lastDriveSceneReveal.time > 250
      ) {
        popupChannel.send(MSG.DRIVE_SCENE_REVEAL, {
          sessionId: this.sessionId,
          handle: this.targetSceneHandle,
          sectionHandle: this.activeHandle,
          progress: revealProgress,
        });
        this.lastDriveSceneReveal.key = revealKey;
        this.lastDriveSceneReveal.time = now;
      }
    }
  }

  updateCarFacingStream() {
    if (!this.bgPlane) return;

    const driveYaw = -this.popupRelativeX * this.controls.carYawAmount;
    const driveRoll = this.popupRelativeX * this.controls.carRollAmount;
    this.carMotionRig.rotation.y = driveYaw;
    this.carMotionRig.rotation.z = driveRoll;
    this.gridMaterial.uniforms.uGridYaw.value =
      this.floorControls.rotationOffset;

    if (!this.car) return;
    const modelForwardOffset = this.car.userData.baseRotationY ?? -1.567;
    this.car.rotation.y = modelForwardOffset;
  }

  updateCamera(delta) {
    const base = this.cameraBase || {
      height: {top: 2.4, bottom: 2.4},
      width: {left: -0.5, right: 0.5},
      distance: 6.2,
      lookAtY: 0.25,
      fov: 45,
      followLerp: 32,
    };
    const speedRatio = Math.min(
      Math.abs(this.speed) / Math.max(0.001, this.controls.maxSpeed),
      1,
    );
    const heightTop =
      typeof base.height === 'number' ? base.height : (base.height?.top ?? 2.4);
    const heightBottom =
      typeof base.height === 'number'
        ? base.height
        : (base.height?.bottom ?? heightTop);
    const mappedHeight = THREE.MathUtils.lerp(
      heightTop,
      heightBottom,
      this.popupVerticalProgress,
    );
    const widthLeft =
      typeof base.width === 'number' ? -base.width : (base.width?.left ?? -0.5);
    const widthRight =
      typeof base.width === 'number' ? base.width : (base.width?.right ?? 0.5);
    const popupHorizontalProgress = THREE.MathUtils.clamp(
      this.popupRelativeX * 0.5 + 0.5,
      0,
      1,
    );
    const windowOrbit = THREE.MathUtils.lerp(
      widthLeft,
      widthRight,
      popupHorizontalProgress,
    );
    const orbit = windowOrbit + this.smoothSteer * this.controls.orbitSpeed;
    const targetX = Math.sin(orbit) * base.distance;
    const targetZ = Math.cos(orbit) * base.distance;
    const targetY = mappedHeight + speedRatio * 0.2;
    const targetLookAtX = 0;
    const targetLookAtY = base.lookAtY;
    const targetLookAtZ = 0;

    const snapCameraFollow =
      !this.isIntroSpinActive() && this.getPopupWindowMoveTarget().active;
    const cameraFollowLerp = snapCameraFollow
      ? 1
      : 1 - Math.exp(-delta * Math.max(1, base.followLerp ?? 32));
    this.camera.position.x +=
      (targetX - this.camera.position.x) * cameraFollowLerp;
    this.camera.position.y +=
      (targetY - this.camera.position.y) * cameraFollowLerp;
    this.camera.position.z +=
      (targetZ - this.camera.position.z) * cameraFollowLerp;
    this.lookAt.x += (targetLookAtX - this.lookAt.x) * Math.min(1, delta * 14);
    this.lookAt.y += (targetLookAtY - this.lookAt.y) * Math.min(1, delta * 12);
    this.lookAt.z += (targetLookAtZ - this.lookAt.z) * Math.min(1, delta * 14);
    this.camera.fov = base.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.lookAt);

    if (this.controls.cameraShakeEnabled) {
      const shakeStart = THREE.MathUtils.clamp(
        this.controls.cameraShakeStartSpeed ?? 0.75,
        0,
        1,
      );
      const shakeRamp =
        shakeStart >= 1
          ? speedRatio >= 1
            ? 1
            : 0
          : THREE.MathUtils.smoothstep(speedRatio, shakeStart, 1);
      const shakeAmount = (this.controls.cameraShakeAmount ?? 0) * shakeRamp;
      const shakeFrequency = this.controls.cameraShakeFrequency ?? 18;

      if (shakeAmount > 0.0001 && shakeFrequency > 0) {
        const time = this.clock.elapsedTime * shakeFrequency;
        const shakeX =
          (Math.sin(time * 1.31) + Math.sin(time * 2.17)) * 0.5 * shakeAmount;
        const shakeY =
          (Math.cos(time * 1.73) + Math.sin(time * 2.63)) * 0.5 * shakeAmount;
        const shakeRoll = Math.sin(time * 2.21) * shakeAmount * 0.2;
        this.camera.translateX(shakeX);
        this.camera.translateY(shakeY);
        this.camera.rotateZ(shakeRoll);
      }
    }
  }

  syncBackgroundCamera() {
    this.bgCamera.position.copy(this.camera.position);
    this.bgCamera.quaternion.copy(this.camera.quaternion);
    this.bgCamera.fov = this.camera.fov;
    this.bgCamera.aspect = this.camera.aspect;
    this.bgCamera.near = this.camera.near;
    this.bgCamera.far = this.camera.far;
    this.bgCamera.updateProjectionMatrix();
    this.bgCamera.updateMatrixWorld(true);
  }

  start() {
    const tick = () => {
      requestAnimationFrame(tick);
      const delta = Math.min(0.05, this.clock.getDelta());
      this.updatePopupWindowMovement(delta);
      this.updateIntroSpin();
      this.updateVideoAlignment(delta);
      this.updateDrive(delta);
      this.updateInstructions(delta);
      this.broadcastPopupPosition();
      this.updateCarGridAttachment();
      this.updateStreamTextureLight();
      this.broadcastDriveState();
      this.updateCamera(delta);
      this.videoMaterial.uniforms.uTime.value = this.clock.elapsedTime;
      this.syncBackgroundCamera();
      this.updateCarFacingStream();
      if (this.videoTexture?.image?.readyState >= 2) {
        this.videoTexture.needsUpdate = true;
        if (this.streamEnvMap) this.streamEnvMap.needsUpdate = true;
        if (this.streamLightTexture) this.streamLightTexture.needsUpdate = true;
      }
      this.shoppy?.update(delta);
      this.renderer.clear();
      this.renderer.render(this.bgScene, this.bgCamera);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }
}

new CarPopupApp().init().catch(() => {
  document.getElementById('loader')?.classList.add('hidden');
});
