import { collections, productsIn } from './content.js';

const normalize = value => value.toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let indexPromise;

function loadIndex() {
  if (!indexPromise) {
    indexPromise = import('../data/search-index.json').then(({ default: entries }) => {
      const descriptions = new Map(collections.flatMap(chapter => productsIn(chapter).map(product => [
        product.handle, [product.title, product.headlineTitle, chapter.title, product.descriptionHtml].join(' '),
      ])));
      return entries.map(result => ({
        result,
        title: normalize(result.title),
        text: normalize([result.title, result.isCurrent ? descriptions.get(result.handle) : ''].join(' ')),
      }));
    });
  }
  return indexPromise;
}

export async function searchCatalog(path, request) {
  const query = normalize(new URLSearchParams(request.body).get('q') || '');
  const words = query.split(' ').filter(Boolean);
  const indexed = await loadIndex();
  const matches = words.length ? indexed.filter(entry => words.every(word => entry.text.includes(word))) : [];
  const score = title => Number(title === query) * 100 + Number(title.startsWith(query)) * 20 +
    words.filter(word => title.includes(word)).length;
  matches.sort((a, b) => score(b.title) - score(a.title));

  if (path.includes('predictive-search')) {
    const products = matches.filter(entry => entry.result.isCurrent).slice(0, 7).map(entry => entry.result);
    return Response.json({ predictiveSearch: { products, queries: products.length ? [{ title: query }] : [] } });
  }

  const search = {};
  for (const { result } of matches) (search[result.vendor] ??= []).push(result);
  return Response.json({ search });
}
