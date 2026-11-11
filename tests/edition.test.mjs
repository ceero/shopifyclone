import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
const config = json('src/data/edition.json');
const chapters = config.sideNav.map(item => json(`src/data/chapters/${item.handle}.json`));
const assets = json('public/media/sources.json');
const animations = readdirSync(path.join(root, 'public/animation-data'));
const allProducts = group => [...group.products, ...(group.nestedCollections || []).flatMap(allProducts)];
const releases = chapters.flatMap(allProducts);

test('the edition directory, local search, and six deep-linked videos resolve to releases', () => {
  const ids = new Set(releases.map(({ handle }) => handle));
  assert.equal(chapters.length, 10);
  assert.equal(ids.size, 219);
  assert.equal(releases.length, ids.size);
  const localResults = json('src/data/search-index.json').filter(result => result.isCurrent);
  assert.deepEqual(new Set(localResults.map(result => result.handle)), ids);
  for (const result of localResults) assert.equal(result.href, '#' + result.handle);
  assert.equal(Object.keys(config.youtubeVideos).length, 6);
  for (const id of Object.keys(config.youtubeVideos)) assert.ok(ids.has(id), id);
});

test('every listed original asset is present and nonempty', () => {
  for (const filename of Object.keys(assets)) {
    assert.ok(statSync(path.join(root, 'public', filename)).size > 0, filename);
  }
});

test('all lazy Rive cards resolve to local animation files and texture/font dependencies', () => {
  const expected = releases.flatMap(product => ['productMedia', 'mobileMedia']
    .filter(key => product[key]?.rive)
    .map(key => `${product.handle}-${key}.json`));
  assert.deepEqual(animations.sort(), expected.sort());
  assert.equal(expected.length, 20);
  for (const filename of animations) {
    const manifest = json(`public/animation-data/${filename}`);
    for (const src of [manifest.src, ...Object.values(manifest.assetsMap || {}).map(item => item.url)].filter(Boolean)) {
      assert.ok(src.startsWith('/media/') && assets[src], src);
    }
  }
});
