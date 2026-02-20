/**
 * Cloudflare Worker — bridgeworld.lol content pages
 *
 * Serves the static HTML content pages (lore, gameplay, ecosystem, bridge, covenant, connect)
 * from KV storage. Also serves JS, images, and manifest assets.
 *
 * Deploy: wrangler deploy -c wrangler-site.toml
 */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const CACHE_STATIC = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

const CACHE_HTML = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
};

const CONTENT_ROUTES = {
  '/': 'page:index.html',
  '/lore': 'page:lore.html',
  '/gameplay': 'page:gameplay.html',
  '/ecosystem': 'page:ecosystem.html',
  '/bridge': 'page:bridge.html',
  '/covenant': 'page:covenant.html',
  '/connect': 'page:connect.html',
};

function getMime(path) {
  const ext = path.substring(path.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    const kv = env.SITE_KV;

    if (!kv) {
      return new Response('SITE_KV not bound', { status: 500 });
    }

    // Content pages at clean URLs
    const kvKey = CONTENT_ROUTES[path];
    if (kvKey) {
      const html = await kv.get(kvKey, 'text');
      if (html) {
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS, ...CACHE_HTML },
        });
      }
      return new Response('Page not found in KV', { status: 404 });
    }

    // Static assets: /js/*, /img/*, /manifest/*, /robots.txt, /sitemap.xml
    if (path.startsWith('/js/') || path.startsWith('/img/') || path.startsWith('/manifest/')) {
      const assetKey = 'asset:' + path.slice(1);
      const mime = getMime(path);
      const isText = mime.startsWith('text/') || mime.startsWith('application/j') || mime.endsWith('xml') || mime.endsWith('svg+xml');

      const data = isText ? await kv.get(assetKey, 'text') : await kv.get(assetKey, 'arrayBuffer');
      if (data) {
        return new Response(data, {
          headers: { 'Content-Type': mime, ...SECURITY_HEADERS, ...CACHE_STATIC },
        });
      }
      return new Response('Asset not found', { status: 404 });
    }

    if (path === '/robots.txt' || path === '/sitemap.xml') {
      const data = await kv.get('asset:' + path.slice(1), 'text');
      if (data) {
        const mime = path.endsWith('.xml') ? 'application/xml' : 'text/plain';
        return new Response(data, { headers: { 'Content-Type': mime, ...SECURITY_HEADERS, ...CACHE_STATIC } });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
