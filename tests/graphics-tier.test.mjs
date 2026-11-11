import assert from 'node:assert/strict';
import test from 'node:test';

let scenario = 0;
async function withDevice({ phone = false, webgl = true, search = '', timedOut = false }, check) {
  const originalWindow = globalThis.window, originalDocument = globalThis.document;
  globalThis.window = {
    location: { search },
    matchMedia: () => ({ matches: phone }),
    __S26_FORCE_TIER_0__: timedOut,
  };
  globalThis.document = { createElement: () => ({
    getContext: () => webgl ? { getExtension: () => ({ loseContext() {} }) } : null,
  }) };
  try {
    const { n: store } = await import(`../src/vendor/spring26/useTierStore-edsQsT8s.js?device=${++scenario}`);
    check(store);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test('a touch phone with WebGL2 gets animated low quality without a URL override', () =>
  withDevice({ phone: true }, store => {
    assert.equal(store.getState().tier, 1);
    assert.equal(store.getState().source, 'mobile');
    assert.equal(store.getState().overrideTier, null);
  }));

test('phones without WebGL2 retain the still-image fallback', () =>
  withDevice({ phone: true, webgl: false }, store => {
    assert.equal(store.getState().tier, 0);
    assert.equal(store.getState().source, 'no-webgl');
  }));

test('desktop starts with the existing automatic GPU-detection policy', () =>
  withDevice({}, store => {
    assert.equal(store.getState().tier, 3);
    assert.equal(store.getState().source, 'default');
  }));

test('an explicit still-mode override remains effective on a supported phone', () =>
  withDevice({ phone: true, search: '?tier=0' }, store => {
    assert.equal(store.getState().tier, 0);
    assert.equal(store.getState().deviceTier, 1);
    assert.equal(store.getState().source, 'override');
  }));

test('a load timeout still selects the safe fallback', () =>
  withDevice({ phone: true, timedOut: true }, store => {
    assert.equal(store.getState().tier, 0);
    assert.equal(store.getState().source, 'load-timeout');
  }));

test('a phone can still fall back if sustained rendering performance is too low', () =>
  withDevice({ phone: true }, store => {
    store.getState().downgradeTier('fps');
    assert.equal(store.getState().tier, 0);
    assert.equal(store.getState().source, 'fps');
  }));
