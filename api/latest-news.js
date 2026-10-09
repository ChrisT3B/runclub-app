// /api/latest-news.js
// Vercel serverless function: returns the newest post from the club's Wix blog RSS feed

const FEED_URL = 'https://www.runalcester.co.uk/blog-feed.xml';
const FETCH_TIMEOUT_MS = 5000;
const TEASER_MAX_LENGTH = 120;
const ALLOWED_LINK_HOST = 'www.runalcester.co.uk';
const ALLOWED_IMAGE_HOST = 'static.wixstatic.com';

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  pound: '£'
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const codePoint = entity[1] === 'x' || entity[1] === 'X'
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    const decoded = NAMED_ENTITIES[entity.toLowerCase()];
    return decoded !== undefined ? decoded : match;
  });
}

// Returns the inner text of the first <tag>...</tag>, unwrapping CDATA if present
function getTagContent(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return null;
  const inner = match[1].trim();
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : decodeEntities(inner);
}

function getAttribute(xml, tag, attribute) {
  const match = xml.match(new RegExp(`<${tag}\\s[^>]*\\b${attribute}="([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

// Strip tags, decode entities, collapse whitespace
function cleanText(text) {
  return decodeEntities(text.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function makeTeaser(text) {
  if (text.length <= TEASER_MAX_LENGTH) return text;
  const cut = text.slice(0, TEASER_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?…-]+$/, '');
  return `${trimmed}…`;
}

function safeUrl(value, allowedHost) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === allowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const fail = (status, error) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).json({ error });
  };

  try {
    const response = await fetch(FEED_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
    });

    if (!response.ok) {
      console.error(`❌ latest-news: feed returned ${response.status}`);
      fail(502, 'Feed unavailable');
      return;
    }

    const xml = await response.text();
    const itemMatch = xml.match(/<item\b[^>]*>([\s\S]*?)<\/item>/i);

    if (!itemMatch) {
      fail(404, 'No posts found');
      return;
    }

    const item = itemMatch[1];
    const title = cleanText(getTagContent(item, 'title') || '');
    const link = safeUrl(cleanText(getTagContent(item, 'link') || ''), ALLOWED_LINK_HOST);
    const rawPubDate = getTagContent(item, 'pubDate');
    const pubDateMs = rawPubDate ? Date.parse(rawPubDate) : NaN;
    const teaser = makeTeaser(cleanText(getTagContent(item, 'description') || ''));
    const imageUrl = safeUrl(getAttribute(item, 'enclosure', 'url'), ALLOWED_IMAGE_HOST);

    if (!title || !link) {
      console.error('❌ latest-news: newest item missing title or valid link');
      fail(502, 'Feed item invalid');
      return;
    }

    const post = { title, link, teaser };
    if (!Number.isNaN(pubDateMs)) post.pubDate = new Date(pubDateMs).toISOString();
    if (imageUrl) post.imageUrl = imageUrl;

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json(post);
  } catch (error) {
    console.error('❌ latest-news: failed to load feed:', error?.message || error);
    fail(502, 'Feed unavailable');
  }
}
