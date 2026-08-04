/* =====================================================
   sitemap.xml / robots.txt の生成
   -----------------------------------------------------
   公開URLは data/properties.js の SITE_CONFIG.siteUrl を使います。
   物件ページは成約済も含めて出します（URLは残り続けるため）。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/* 固定ページと優先度。物件ページはこのあとに足していきます */
const STATIC_PAGES = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'properties.html', priority: '0.9', changefreq: 'daily' },
  { path: 'properties.html?deal=sale', priority: '0.9', changefreq: 'daily' },
  { path: 'contact.html', priority: '0.7', changefreq: 'monthly' },
  { path: 'owner.html', priority: '0.6', changefreq: 'monthly' },
  { path: 'privacy.html', priority: '0.3', changefreq: 'yearly' }
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function build(siteUrl, properties, prefectures) {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  const abs = function (p) { return base + '/' + String(p).replace(/^\/+/, ''); };
  const today = properties.reduce(function (latest, p) {
    return p.updatedAt > latest ? p.updatedAt : latest;
  }, '2026-01-01');

  const urls = [];

  STATIC_PAGES.forEach(function (page) {
    urls.push({ loc: abs(page.path), lastmod: today, changefreq: page.changefreq, priority: page.priority });
  });

  /* 都県別の検索結果ページ（入口として拾われやすい） */
  (prefectures || []).forEach(function (pref) {
    urls.push({
      loc: abs('properties.html?pref=' + pref.value),
      lastmod: today, changefreq: 'weekly', priority: '0.7'
    });
  });

  properties.forEach(function (p) {
    urls.push({
      loc: abs('property.html?id=' + encodeURIComponent(p.id)),
      lastmod: p.updatedAt,
      changefreq: 'weekly',
      priority: p.status === 'closed' ? '0.3' : '0.8'
    });
  });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function (u) {
      return '  <url>\n' +
        '    <loc>' + esc(u.loc) + '</loc>\n' +
        '    <lastmod>' + u.lastmod + '</lastmod>\n' +
        '    <changefreq>' + u.changefreq + '</changefreq>\n' +
        '    <priority>' + u.priority + '</priority>\n' +
        '  </url>';
    }).join('\n') + '\n</urlset>\n';

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    '# お気に入りは端末ごとの内容なので登録しません',
    'Disallow: /favorites.html',
    '',
    'Sitemap: ' + abs('sitemap.xml'),
    ''
  ].join('\n');

  return { xml: xml, robots: robots, count: urls.length };
}

function write(siteUrl, properties, prefectures) {
  const out = build(siteUrl, properties, prefectures);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out.xml);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), out.robots);
  return out.count;
}

module.exports = { build: build, write: write };
