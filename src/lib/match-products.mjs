// Per master-scope §10D — named-parameters only. The arg-flip bug brought down sites.
export function matchProducts({
  articleTitle,
  articleTags,
  articleCategory,
  catalog,
  minLinks = 3,
  maxLinks = 4,
}) {
  if (typeof articleTitle !== 'string') {
    throw new TypeError(`matchProducts: articleTitle must be string, got ${typeof articleTitle}`);
  }
  if (!Array.isArray(articleTags)) {
    throw new TypeError(`matchProducts: articleTags must be array, got ${typeof articleTags}`);
  }
  if (typeof articleCategory !== 'string') {
    throw new TypeError(
      `matchProducts: articleCategory must be string, got ${typeof articleCategory}`
    );
  }
  if (!Array.isArray(catalog)) {
    throw new TypeError(`matchProducts: catalog must be array, got ${typeof catalog}`);
  }
  const scored = catalog
    .map((p) => ({ product: p, score: scoreProduct(p, articleTitle, articleTags, articleCategory) }))
    .sort((a, b) => b.score - a.score);
  const take = Math.min(maxLinks, Math.max(minLinks, Math.min(scored.length, maxLinks)));
  return scored.slice(0, take).map((s) => s.product);
}

function scoreProduct(product, title, tags, category) {
  let score = 0;
  const productTags = Array.isArray(product.tags) ? product.tags : [];
  const productCategory = product.category || '';
  if (productCategory === category) score += 10;
  for (const tag of tags) if (productTags.includes(tag)) score += 3;
  const titleWords = title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const name = (product.name || '').toLowerCase();
  for (const w of titleWords) if (name.includes(w)) score += 2;
  return score;
}
