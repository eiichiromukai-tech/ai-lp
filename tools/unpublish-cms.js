#!/usr/bin/env node
/* =====================================================
   microCMS の物件を、まとめて「下書き」に戻す

     node tools/unpublish-cms.js <CSVファイル>            … 確認だけ
     node tools/unpublish-cms.js <CSVファイル> --run      … 実際に戻す
     node tools/unpublish-cms.js --id a,b,c --run         … 番号を直接指定

   公開するつもりがなかった物件をまとめて非公開にするためのものです。
   下書きに戻すと、サイトからは自動同期のタイミングで消えます
   （サイトの取り込みは公開済みのものだけを読むため）。

   ⚠️ 消えるのは「サイトへの掲載」だけです。microCMS の中身は残ります。
      削除ではないので、あとから公開し直せます。

   必要なもの:
     環境変数 MICROCMS_MANAGEMENT_API_KEY
       … microCMS の「管理APIキー」。コンテンツ用のAPIキーとは別物です。
         サービス設定 → APIキー ではなく、管理画面の
         「サービス設定 → 管理APIキー」から作ります。

   安全のため、--run を付けないかぎり何も変更しません。
   ===================================================== */
'use strict';

const fs = require('fs');
const csv = require('./lib/csv');
const cms = require('./lib/cms');
const schema = require('./lib/schema');

const args = process.argv.slice(2);
const RUN = args.includes('--run');
const WAIT_MS = 250;      /* APIの回数制限に触れないよう間隔をあける */

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

/* ---------- 対象の物件番号を集める ---------- */
function idsFromArgs() {
  const i = args.indexOf('--id');
  if (i === -1 || !args[i + 1]) return [];
  return args[i + 1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

/* 一括登録用のCSV（propertyId）でも、サイトの控えのCSV（物件番号）でも読めるようにする。
   取り込みに使ったCSVが手元に無いときは data/properties.csv が使えるため。 */
const ID_HEADERS = ['propertyId', '物件番号'];

function idsFromCsv(file) {
  const rows = csv.parse(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) fail('CSVに物件データの行がありません');
  const header = rows[0].map(function (h) { return String(h).split('\n')[0].trim(); });
  let at = -1;
  ID_HEADERS.forEach(function (name) { if (at === -1) at = header.indexOf(name); });
  if (at === -1) {
    fail('CSVの見出しに物件番号の列（' + ID_HEADERS.join(' または ') + '）がありません');
  }
  return rows.slice(1)
    .map(function (r) { return String(r[at] || '').trim(); })
    .filter(Boolean);
}

/* 登録時（tools/import-cms.js）と同じ変換を使う。
   別々に持つと、片方だけ直したときに違うIDを指してしまうため。 */
const toContentId = schema.toContentId;

/* --id の「次の値」はファイル名ではないので、取り違えないようにする */
const positional = args.filter(function (a, i) {
  return !a.startsWith('--') && args[i - 1] !== '--id';
});
const CSV_PATH = positional[0];

let ids = idsFromArgs();
if (!ids.length) {
  if (!CSV_PATH) fail('CSVファイルか --id を指定してください');
  if (!fs.existsSync(CSV_PATH)) fail(CSV_PATH + ' が見つかりません');
  ids = idsFromCsv(CSV_PATH);
}
ids = ids.map(toContentId).filter(Boolean);
if (!ids.length) fail('対象の物件番号がありません');

/* 同じ番号が複数行にあっても1回で済ませる */
ids = ids.filter(function (v, i, a) { return a.indexOf(v) === i; });

const conf = cms.readConfig();
if (!conf.serviceDomain) fail('tools/cms-config.json に serviceDomain がありません');

const KEY = String(process.env.MICROCMS_MANAGEMENT_API_KEY || '').trim();
if (!KEY && RUN) {
  console.error('エラー: 環境変数 MICROCMS_MANAGEMENT_API_KEY が設定されていません。');
  console.error('');
  console.error('  microCMS の サービス設定 → 管理APIキー で作成してください。');
  console.error('  （物件の登録に使う「APIキー」とは別のものです）');
  console.error('');
  console.error('    MICROCMS_MANAGEMENT_API_KEY=＜キー＞ node tools/unpublish-cms.js ' +
    (CSV_PATH || '--id ...') + ' --run');
  process.exit(1);
}

/* 送信先。MICROCMS_MANAGEMENT_BASE はテスト用の差し替え口で、通常は使いません */
const base = process.env.MICROCMS_MANAGEMENT_BASE ||
  'https://' + conf.serviceDomain + '.microcms-management.io/api/v1';

console.log(ids.length + '件を下書きに戻します' + (RUN ? '。' : '（確認だけ。--run を付けると実行します）'));
console.log('API名: ' + conf.endpoint);
console.log('');

if (!RUN) {
  ids.forEach(function (id) { console.log('  - ' + id); });
  console.log('');
  console.log('--run を付けていないため、microCMS には何も送っていません。');
  process.exit(0);
}

(async function () {
  let ok = 0;
  const failed = [];
  for (const id of ids) {
    const url = base + '/contents/' + conf.endpoint + '/' + id + '/status';
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'X-MICROCMS-API-KEY': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: ['DRAFT'] })
      });
      if (!res.ok) {
        const text = await res.text().catch(function () { return ''; });
        failed.push({ id: id, detail: 'HTTP ' + res.status + ' ' + text.slice(0, 200) });
        console.log('  ✗ ' + id);
      } else {
        ok++;
        console.log('  ✓ ' + id);
      }
    } catch (e) {
      failed.push({ id: id, detail: String(e.message || e) });
      console.log('  ✗ ' + id);
    }
    await new Promise(function (r) { setTimeout(r, WAIT_MS); });
  }

  console.log('');
  console.log('下書きに戻した: ' + ok + '件／失敗: ' + failed.length + '件');
  if (failed.length) {
    console.log('');
    failed.forEach(function (f) { console.log('  ' + f.id + ': ' + f.detail); });
    console.log('');
    console.log('うまくいかない場合は、管理画面から手で「公開終了」してください。');
    process.exit(1);
  }
  console.log('');
  console.log('サイトからは、15分おきの自動同期または');
  console.log('「物件情報を反映（microCMS）」の Run workflow で消えます。');
})().catch(function (e) {
  fail(String((e && e.message) || e));
});
