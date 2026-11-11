import settings from '../data/edition.json';
import scenePresets from '../data/scenes.json';

const chapterFiles = import.meta.glob('../data/chapters/*.json', {
  eager: true,
  import: 'default',
});

export const editionPath = '/editions/spring2026';
export const collections = settings.sideNav.map(({ handle }) => chapterFiles[`../data/chapters/${handle}.json`]);
export const edition = { ...settings, collections, scenePresets };

export function productsIn(collection) {
  return [
    ...(collection.products ?? []),
    ...(collection.nestedCollections ?? []).flatMap(productsIn),
  ];
}
