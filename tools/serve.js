#!/usr/bin/env node
/* ローカル確認用の簡易サーバー。`npm run serve` で http://localhost:8080 が開けます。 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);
/* テスト用。ここに同名のファイルがあれば、そちらを先に返す。
   実データの件数に左右されずにテストできるようにするための仕組み。 */
const OVERLAY = process.env.SITE_OVERLAY ? path.resolve(process.env.SITE_OVERLAY) : '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webm': 'video/webm'
};

const server = http.createServer(function (req, res) {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname === '/') pathname = '/index.html';
  let file = path.join(ROOT, pathname);
  if (OVERLAY) {
    const overlaid = path.join(OVERLAY, pathname);
    if (overlaid.startsWith(OVERLAY) && fs.existsSync(overlaid) &&
        fs.statSync(overlaid).isFile()) file = overlaid;
  }

  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(PORT, function () {
  console.log('http://localhost:' + PORT + '/ を開いてください（Ctrl+C で終了）');
});

module.exports = server;
