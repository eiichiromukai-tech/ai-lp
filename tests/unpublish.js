/* =====================================================
   まとめて下書きに戻すツールの検証

   microCMSの管理APIのふりをするサーバーを立てて、
   tools/unpublish-cms.js が正しい宛先・正しい中身を送るかを見ます。
   本物のmicroCMSには接続しません。
   ===================================================== */
'use strict';
const http = require('http');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'tools/unpublish-cms.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

/* microCMSの管理APIのふりをするサーバー */
const seen = [];
let failFor = null;
const server = http.createServer(function (req, res) {
  let body = '';
  req.on('data', function (c) { body += c; });
  req.on('end', function () {
    seen.push({ method: req.method, url: req.url, key: req.headers['x-microcms-api-key'], body: body });
    if (failFor && req.url.indexOf(failFor) !== -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end('{"message":"content not found"}');
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
});

/* 同期実行にすると、この中のサーバーが応答できなくなる（自分で自分を待つ）ため非同期で */
function run(extraArgs, env) {
  return new Promise(function (resolve) {
    execFile(process.execPath, [TOOL].concat(extraArgs), {
      cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env,
        { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' }, env || {})
    }, function (err, stdout, stderr) {
      resolve({ out: String(stdout || '') + String(stderr || ''), code: err ? err.code : 0 });
    });
  });
}

server.listen(8199, async function () {
  const BASE = 'http://localhost:8199/api/v1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unpub-'));
  const csvFile = path.join(dir, 'x.csv');
  fs.writeFileSync(csvFile,
    'propertyId,title\nOSAKI-CORE-11-ABC,大崎\nWAVE-SHIBUYA-2,渋谷\nOSAKI-CORE-11-ABC,重複\n');

  console.log('\n確認だけのとき');
  let r = await run([csvFile]);
  ok('何も送らない', seen.length === 0, JSON.stringify(seen));
  ok('対象が出る', r.out.indexOf('osaki-core-11-abc') !== -1, r.out);
  ok('重複を1件にまとめる', r.out.indexOf('2件を下書きに戻します') !== -1, r.out.split('\n')[0]);
  ok('小文字のコンテンツIDに直す', r.out.indexOf('wave-shibuya-2') !== -1);
  ok('正常終了する', r.code === 0);

  console.log('\n管理APIキーが無いとき');
  r = await run([csvFile, '--run'], { MICROCMS_MANAGEMENT_API_KEY: '' });
  ok('送らずに止まる', seen.length === 0);
  ok('作り方を伝える', r.out.indexOf('管理APIキー') !== -1, r.out.slice(0, 120));
  ok('異常終了する', r.code === 1);

  console.log('\n実行するとき');
  seen.length = 0;
  r = await run([csvFile, '--run'], {
    MICROCMS_MANAGEMENT_API_KEY: 'test-key',
    MICROCMS_MANAGEMENT_BASE: BASE
  });
  ok('2件ぶん送る', seen.length === 2, String(seen.length));
  ok('PATCHで送る', seen.every(function (s) { return s.method === 'PATCH'; }));
  ok('statusのURLに送る',
    seen[0].url === '/api/v1/contents/properties/osaki-core-11-abc/status', seen[0].url);
  ok('DRAFTを指定する', seen[0].body === '{"status":["DRAFT"]}', seen[0].body);
  ok('APIキーを付ける', seen[0].key === 'test-key');
  ok('結果を数える', r.out.indexOf('下書きに戻した: 2件／失敗: 0件') !== -1, r.out);
  ok('正常終了する', r.code === 0);

  console.log('\n失敗が混ざるとき');
  seen.length = 0;
  failFor = 'wave-shibuya-2';
  r = await run([csvFile, '--run'], {
    MICROCMS_MANAGEMENT_API_KEY: 'test-key',
    MICROCMS_MANAGEMENT_BASE: BASE
  });
  ok('失敗した番号を出す', r.out.indexOf('✗ wave-shibuya-2') !== -1, r.out);
  ok('返答の中身を見せる', r.out.indexOf('content not found') !== -1, r.out);
  ok('成功分は数える', r.out.indexOf('下書きに戻した: 1件／失敗: 1件') !== -1, r.out);
  ok('手作業の案内を出す', r.out.indexOf('公開終了') !== -1);
  ok('異常終了する', r.code === 1);
  failFor = null;

  console.log('\nサイトの控えのCSVを使うとき');
  const siteCsv = path.join(dir, 'site.csv');
  fs.writeFileSync(siteCsv, '物件番号,物件名\nIO-SHIMBASHI-6F,新橋\n');
  r = await run([siteCsv]);
  ok('物件番号の列でも読める', r.out.indexOf('io-shimbashi-6f') !== -1, r.out);

  const badCsv = path.join(dir, 'bad.csv');
  fs.writeFileSync(badCsv, '名前,住所\nあ,い\n');
  r = await run([badCsv]);
  ok('番号の列が無ければ止まる', r.code === 1 && r.out.indexOf('物件番号の列') !== -1, r.out);

  console.log('\n番号を直接指定するとき');
  seen.length = 0;
  r = await run(['--id', 'WAVE-SHIBUYA-3,Fuji-Bldg-40-9F', '--run'], {
    MICROCMS_MANAGEMENT_API_KEY: 'test-key',
    MICROCMS_MANAGEMENT_BASE: BASE
  });
  ok('指定した2件だけ送る', seen.length === 2, String(seen.length));
  ok('大文字小文字を揃える',
    seen[1].url.indexOf('/fuji-bldg-40-9f/') !== -1, seen[1].url);
  ok('CSVが無くても動く', r.code === 0, r.out);

  fs.rmSync(dir, { recursive: true, force: true });
  server.close();
  if (fail) {
    console.error('\n下書きに戻すツールの検証で ' + fail + '件失敗しました');
    process.exit(1);
  }
});
