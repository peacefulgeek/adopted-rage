// Per master-scope §10A. Verbatim transcription of the canonical helpers.
const AMAZON_TAG = process.env.AMAZON_TAG || 'spankyspinola-20';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const SOFT_404_PATTERNS = [
  /<title>[^<]*Page Not Found[^<]*<\/title>/i,
  /<title>[^<]*Sorry[^<]*<\/title>/i,
  /Looking for something\?[\s\S]{0,600}We're sorry/i,
  /The Web address you entered is not a functioning page/i,
  /id="g"[^>]*>[\s\S]{0,300}Dogs of Amazon/i,
  /We couldn't find that page/i,
];

const PRODUCT_SIGNATURES = [
  /id="productTitle"/,
  /id="titleSection"/,
  /name="ASIN"[^>]*value="[A-Z0-9]{10}"/,
  /data-asin="[A-Z0-9]{10}"/,
];

export async function verifyAsin(asin) {
  if (!/^[A-Z0-9]{10}$/.test(asin)) {
    return { asin, valid: false, reason: 'malformed-asin', url: null };
  }
  const url = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (res.status === 404) return { asin, valid: false, reason: 'http-404', url };
    if (res.status !== 200) return { asin, valid: false, reason: `http-${res.status}`, url };

    const finalUrl = res.url;
    if (
      finalUrl.includes('/ref=cs_404') ||
      finalUrl.includes('/s?k=') ||
      finalUrl.match(/amazon\.com\/?(\?|$)/)
    ) {
      return { asin, valid: false, reason: 'redirected-to-search', url, finalUrl };
    }

    const html = await res.text();
    for (const p of SOFT_404_PATTERNS) {
      if (p.test(html)) return { asin, valid: false, reason: 'soft-404', url };
    }
    const hasSignature = PRODUCT_SIGNATURES.some((p) => p.test(html));
    if (!hasSignature) return { asin, valid: false, reason: 'no-product-signature', url };

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s*:\s*Amazon\.com.*$/i, '').replace(/\s+/g, ' ').trim()
      : null;
    if (!title || title.length < 10) {
      return { asin, valid: false, reason: 'short-or-missing-title', url };
    }
    return { asin, valid: true, title, url };
  } catch (err) {
    return { asin, valid: false, reason: `fetch-error: ${err.message}`, url };
  }
}

export async function verifyAsinBatch(asins, { delayMs = 2500, onProgress } = {}) {
  const results = [];
  for (let i = 0; i < asins.length; i++) {
    const r = await verifyAsin(asins[i]);
    results.push(r);
    if (onProgress) onProgress(i + 1, asins.length, r);
    if (i < asins.length - 1) await new Promise((res) => setTimeout(res, delayMs));
  }
  return results;
}

export function buildAmazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}

const AMAZON_LINK_REGEX =
  /https:\/\/www\.amazon\.com\/dp\/([A-Z0-9]{10})(?:\/[^"\s?]*)?(?:\?[^"\s]*)?/g;

export function extractAsinsFromText(text) {
  const asins = new Set();
  let m;
  while ((m = AMAZON_LINK_REGEX.exec(text)) !== null) asins.add(m[1]);
  AMAZON_LINK_REGEX.lastIndex = 0;
  return Array.from(asins);
}

export function countAmazonLinks(text) {
  const matches = text.match(AMAZON_LINK_REGEX) || [];
  return matches.length;
}
