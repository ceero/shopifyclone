import assert from 'node:assert/strict';
import test from 'node:test';
import { watchCoverPhoto } from '../src/edition/cover-photo.js';

const source = '/media/mountain-cover-c6167cce.jpg';
class Photo extends EventTarget {
  complete = false;
  naturalWidth = 0;
  ownerDocument = { baseURI: 'https://edition.test/editions/spring2026' };
  requests = [];
  set src(value) { this.requests.push(value); this.complete = false; this.naturalWidth = 0; }
  decode = () => Promise.resolve();
  load() { this.complete = true; this.naturalWidth = 1684; this.dispatchEvent(new Event('load')); }
  fail() { this.complete = true; this.naturalWidth = 0; this.dispatchEvent(new Event('error')); }
}
function observe(photo) {
  const events = [];
  const observer = watchCoverPhoto(photo, source, {
    onReady: () => events.push('ready'), onSettled: () => events.push('settled'),
  });
  return { observer, events };
}

test('partial JPEG dimensions cannot hand off the photo before loading and decoding finish', async () => {
  const photo = new Photo();
  photo.naturalWidth = 1684;
  let finishDecode;
  photo.decode = () => new Promise(resolve => { finishDecode = resolve; });
  const { observer, events } = observe(photo);
  assert.equal(observer.ready, false);
  photo.load();
  assert.equal(observer.ready, false);
  assert.deepEqual(events, []);
  finishDecode();
  await Promise.resolve();
  assert.equal(observer.ready, true);
  assert.deepEqual(events, ['settled', 'ready']);
  observer.dispose();
});

test('cached successful images become ready without another load event', async () => {
  const photo = new Photo();
  photo.load();
  const { observer, events } = observe(photo);
  await Promise.resolve();
  assert.equal(observer.ready, true);
  photo.load();
  assert.deepEqual(events, ['settled', 'ready']);
  assert.equal(photo.requests.length, 0);
  observer.dispose();
});

test('a failed image request retries and the recovered image becomes ready', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const photo = new Photo();
  const { observer, events } = observe(photo);
  photo.fail();
  t.mock.timers.tick(250);
  assert.deepEqual(photo.requests, ['https://edition.test' + source + '?cover-retry=1']);
  assert.deepEqual(events, []);
  photo.load();
  await Promise.resolve();
  assert.equal(observer.ready, true);
  assert.deepEqual(events, ['settled', 'ready']);
  observer.dispose();
});

test('cached errors retry only twice, then release loading without claiming a ready photo', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const photo = new Photo();
  photo.fail();
  const { observer, events } = observe(photo);
  t.mock.timers.tick(250);
  photo.fail();
  t.mock.timers.tick(1000);
  photo.fail();
  t.mock.timers.tick(10000);
  assert.equal(photo.requests.length, 2);
  assert.equal(observer.ready, false);
  assert.deepEqual(events, ['settled']);
  observer.dispose();
});

test('decode failure retries instead of sending an unusable image to WebGL', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const photo = new Photo();
  photo.decode = () => Promise.reject(new Error('Unable to decode image'));
  const { observer, events } = observe(photo);
  photo.load();
  await Promise.resolve();
  assert.equal(observer.ready, false);
  assert.deepEqual(events, []);
  t.mock.timers.tick(250);
  photo.decode = () => Promise.resolve();
  photo.load();
  await Promise.resolve();
  assert.equal(observer.ready, true);
  observer.dispose();
});

test('unmount cancels both scheduled retries and pending decode callbacks', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const failedPhoto = new Photo();
  const failed = observe(failedPhoto);
  failedPhoto.fail();
  failed.observer.dispose();
  t.mock.timers.tick(10000);
  assert.deepEqual(failedPhoto.requests, []);
  assert.deepEqual(failed.events, []);

  const pendingPhoto = new Photo();
  let finishDecode;
  pendingPhoto.decode = () => new Promise(resolve => { finishDecode = resolve; });
  const pending = observe(pendingPhoto);
  pendingPhoto.load();
  pending.observer.dispose();
  finishDecode();
  await Promise.resolve();
  assert.deepEqual(pending.events, []);
  assert.equal(pending.observer.ready, false);
});
