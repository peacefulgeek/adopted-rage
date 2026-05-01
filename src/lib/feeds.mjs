// Per master-scope §17 — robots, sitemap, RSS, llms.txt.
import { SITE } from './site-config.mjs';
import { listAllPublishedForFeed } from './db.mjs';
import { slugifyCategory } from './seo.mjs';

const apexUrl = (p = '/') => `https://${SITE.apex}${p}`;

export function robotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${apexUrl('/sitemap.xml')}`,
    '',
    '# AI training and answer engines: explicitly allowed.',
    'User-agent: GPTBot',
    'Allow: /',
    'User-agent: ChatGPT-User',
    'Allow: /',
    'User-agent: ClaudeBot',
    'Allow: /',
    'User-agent: PerplexityBot',
    'Allow: /',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
  ].join('\n');
}

export async function sitemapXml() {
  const articles = await listAllPublishedForFeed();
  const urls = [
    { loc: apexUrl('/'), priority: '1.0', changefreq: 'daily' },
    { loc: apexUrl('/about'), priority: '0.6', changefreq: 'monthly' },
    { loc: apexUrl('/contact'), priority: '0.4', changefreq: 'yearly' },
    { loc: apexUrl('/privacy'), priority: '0.3', changefreq: 'yearly' },
    { loc: apexUrl('/disclosures'), priority: '0.4', changefreq: 'yearly' },
    {
      loc: apexUrl('/author/the-oracle-lover'),
      priority: '0.5',
      changefreq: 'monthly',
    },
  ];
  const cats = new Set(articles.map((a) => a.category).filter(Boolean));
  for (const c of cats) {
    urls.push({
      loc: apexUrl(`/category/${slugifyCategory(c)}`),
      priority: '0.7',
      changefreq: 'weekly',
    });
  }
  for (const a of articles) {
    urls.push({
      loc: apexUrl(`/articles/${a.slug}`),
      lastmod: (a.last_modified_at || a.published_at || '').split('T')[0],
      priority: '0.8',
      changefreq: 'monthly',
    });
  }
  const items = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export async function rssXml() {
  const articles = (await listAllPublishedForFeed()).slice(0, 30);
  const items = articles
    .map((a) => {
      const link = apexUrl(`/articles/${a.slug}`);
      const pub = new Date(a.published_at || Date.now()).toUTCString();
      const desc = (a.meta_description || a.title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;');
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${apexUrl('/')}</link>
    <description>${esc(SITE.description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
}

export async function llmsTxt() {
  const articles = (await listAllPublishedForFeed()).slice(0, 100);
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `Author: ${SITE.author} (${SITE.author_link_target}).`,
    '',
    '## Articles',
    '',
    ...articles.map((a) => `- [${a.title}](${apexUrl(`/articles/${a.slug}`)})`),
    '',
  ];
  return lines.join('\n');
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
