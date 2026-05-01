// Per master-scope §16 — SEO/AEO head injection.
import { SITE } from './site-config.mjs';

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const apexUrl = (path = '/') => `https://${SITE.apex}${path}`;

export function homeHead() {
  const url = apexUrl('/');
  const title = `${SITE.name} - ${SITE.tagline}`;
  const desc = SITE.description;
  const orgLD = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url,
    description: desc,
    knowsAbout: [
      'Adoptee experience',
      'Primal wound',
      'Identity and search',
      'Reunion',
      'Late-discovery adoptees',
      'Transracial adoption',
    ],
  };
  const websiteLD = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}">`,
    `<script type="application/ld+json">${JSON.stringify(orgLD)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(websiteLD)}</script>`,
  ].join('\n');
}

/** Per §16E — Article JSON-LD with TL;DR mirrored as `description`. */
export function articleHead(article) {
  const url = apexUrl(`/articles/${article.slug}`);
  const title = `${article.title} | ${SITE.name}`;
  const desc =
    article.meta_description ||
    extractTldr(article.body) ||
    article.title;
  const heroUrl = article.hero_url || '';
  const articleLD = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: desc,
    datePublished: article.published_at,
    dateModified: article.last_modified_at || article.published_at,
    author: {
      '@type': 'Person',
      name: article.author || SITE.author,
      url: SITE.author_link_target,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: apexUrl('/'),
    },
    image: heroUrl ? [heroUrl] : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: apexUrl('/') },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.category || 'Articles',
        item: apexUrl(`/category/${slugifyCategory(article.category || '')}`),
      },
      { '@type': 'ListItem', position: 3, name: article.title, item: url },
    ],
  };
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:title" content="${escapeHtml(article.title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${url}">`,
    heroUrl ? `<meta property="og:image" content="${escapeHtml(heroUrl)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(article.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}">`,
    heroUrl ? `<meta name="twitter:image" content="${escapeHtml(heroUrl)}">` : '',
    `<script type="application/ld+json">${JSON.stringify(articleLD)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbLD)}</script>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function extractTldr(html = '') {
  const m = html.match(/<section[^>]*data-tldr[^>]*>([\s\S]*?)<\/section>/i);
  if (!m) return '';
  return m[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

export function slugifyCategory(c) {
  return String(c)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
