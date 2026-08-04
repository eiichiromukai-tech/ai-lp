/* =====================================================
   掲載を全部止めたときの検証

   microCMS で全物件を下書きに戻した（公開中が0件になった）状態でも、
   サイトに反映できることを確かめます。ここで止まってしまうと、
   「掲載をやめたのにサイトに出たまま」になるためです。

   本物のmicroCMSには接続しません。
   ===================================================== */
'use strict';

const http = require('http');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

/* microCMS のふりをするサーバー。公開中0件を返す */
let contents = [];
const server = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    contents: contents, totalCount: contents.length, offset: 0, limit: 100
  }));
});

function run(cmd, extraArgs, env) {
  return new Promise(function (resolve) {
    execFile(process.execPath, [path.join(ROOT, cmd)].concat(extraArgs), {
      cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env,
        { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' }, env || {})
    }, function (err, stdout, stderr) {
      resolve({ out: String(stdout || '') + String(stderr || ''), code: err ? err.code : 0 });
    });
  });
}

server.listen(8198, async function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));

  console.log('\n公開中が0件のとき（microCMSからの取り込み）');
  let r = await run('tools/fetch-cms.js', ['--check'], {
    MICROCMS_API_BASE: 'http://localhost:8198/api/v1',
    MICROCMS_SERVICE_DOMAIN: 'test-portal',
    MICROCMS_API_KEY: 'test-key'
  });
  ok('取り込みが止まらない', r.code === 0, r.out);
  ok('0件だと分かる警告を出す', r.out.indexOf('1件もありません') !== -1, r.out);
  ok('掲載されなくなると伝える', r.out.indexOf('掲載されなくなります') !== -1, r.out);

  console.log('\n物件0件のサイトを作る');
  /* 見出しだけのCSV = 掲載する物件が1件もない状態 */
  const headerOnly = fs.readFileSync(path.join(ROOT, 'data', 'properties.csv'), 'utf8')
    .split('\n')[0] + '\n';
  const emptyCsv = path.join(dir, 'empty.csv');
  fs.writeFileSync(emptyCsv, headerOnly);

  r = await run('tools/csv-to-properties.js',
    ['--csv', emptyCsv, '--out-dir', path.join(dir, 'site')],
    { IMAGES_DIR: path.join(dir, 'site', 'images', 'properties') });
  ok('サイトのデータを作れる', r.code === 0, r.out);
  ok('0件として書き出す', r.out.indexOf('0件') !== -1, r.out);

  const generated = path.join(dir, 'site', 'data', 'properties.js');
  ok('properties.js ができる', fs.existsSync(generated));
  if (fs.existsSync(generated)) {
    const w = {};
    new Function('window', fs.readFileSync(generated, 'utf8'))(w);
    ok('物件が0件になる', w.PORTAL_DATA.properties.length === 0,
      String(w.PORTAL_DATA.properties.length));
    ok('選択肢のマスタは残る',
      w.PORTAL_DATA.areas.length > 0 && w.PORTAL_DATA.types.length > 0);
  }
  ok('sitemapができる', fs.existsSync(path.join(dir, 'site', 'sitemap.xml')));

  console.log('\n中身が空のCSVのとき');
  const brokenCsv = path.join(dir, 'broken.csv');
  fs.writeFileSync(brokenCsv, '');
  r = await run('tools/csv-to-properties.js',
    ['--csv', brokenCsv, '--out-dir', path.join(dir, 'site2')]);
  ok('見出しごと無ければ止まる', r.code === 1 && r.out.indexOf('CSVが空です') !== -1, r.out);

  fs.rmSync(dir, { recursive: true, force: true });
  server.close();
  if (fail) {
    console.error('\n掲載を全部止めたときの検証で ' + fail + '件失敗しました');
    process.exit(1);
  }
});
