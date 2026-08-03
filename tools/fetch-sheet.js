#!/usr/bin/env node
/* =====================================================
   Googleスプレッドシート → サイトへ反映（1コマンド）

     node tools/fetch-sheet.js           … 取り込んで反映まで行う
     node tools/fetch-sheet.js --check   … 取り込んで検証するだけ（書き込まない）

   スプレッドシートのURLは tools/sheet-url.txt に書いておきます。
   （環境変数 SHEET_URL があればそちらを優先します）

   内容に問題があれば data/properties.csv も data/properties.js も
   書き換えずに終了します。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const csv = require('./lib/csv');
const schema = require('./lib/schema');
const sheet = require('./lib/sheet');

const CSV_PATH = path.join(__dirname, '..', 'data', 'properties.csv');
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

/* ---------- URLの確認 ---------- */
const configured = sheet.readConfiguredUrl();
if (!configured) {
  console.error('エラー: スプレッドシートのURLが設定されていません。');
  console.error('');
  console.error('  ' + sheet.URL_FILE + ' を開き、');
  console.error('  スプレッドシートのURLを1行貼り付けて保存してください。');
  console.error('  （ブラウザのアドレスバーのURLをそのままで大丈夫です）');
  process.exit(1);
}

const csvUrl = sheet.toCsvUrl(configured);
if (!csvUrl) {
  fail('「' + configured + '」はGoogleスプレッドシートのURLとして読み取れませんでした。\n' +
    '  https://docs.google.com/spreadsheets/d/... の形式のURLを設定してください。');
}

/* ---------- 取得 ---------- */
console.log('スプレッドシートを取得しています…');
let text;
try {
  text = sheet.download(csvUrl);
} catch (e) {
  console.error('エラー: スプレッドシートを取得できませんでした。');
  console.error('  ' + String(e.message || e).split('\n')[0]);
  console.error('');
  console.error('確認してください:');
  console.error('  ・スプレッドシートの共有設定が「リンクを知っている全員」→「閲覧者」になっているか');
  console.error('  ・URLが正しいか（' + csvUrl + '）');
  console.error('  ・ネットワークに接続できているか');
  process.exit(1);
}

/* ログイン画面のHTMLが返ってくることがあるので中身を確かめる */
if (/^\s*</.test(text)) {
  fail('CSVではなくHTMLが返ってきました。スプレッドシートの共有設定が' +
    '「リンクを知っている全員が閲覧可」になっているか確認してください。');
}

const rows = csv.parse(text);
if (rows.length < 2) fail('スプレッドシートに物件データの行がありません');

/* ---------- 見出し行の確認 ---------- */
const header = rows[0].map(function (h) { return h.trim(); });
const expected = schema.HEADERS;
if (header.length !== expected.length || header.some(function (h, i) { return h !== expected[i]; })) {
  console.error('エラー: 見出し行（1行目）が想定と異なります。');
  console.error('  期待: ' + expected.join(', '));
  console.error('  実際: ' + header.join(', '));
  console.error('');
  console.error('列を追加・削除・並べ替え・改名した場合は、シートを元に戻すか');
  console.error('tools/lib/schema.js の COLUMNS も合わせて変更してください。');
  process.exit(1);
}

/* ---------- 中身の検証（書き込む前に確認する） ---------- */
const errors = [];
const warnings = [];
const properties = rows.slice(1)
  .filter(function (cells) { return cells.some(function (v) { return String(v).trim() !== ''; }); })
  .map(function (cells, i) { return schema.fromRow(cells, i, errors, warnings); });

const seen = new Map();
properties.forEach(function (p, i) {
  if (!p.id) return;
  if (seen.has(p.id)) {
    errors.push('物件番号「' + p.id + '」が重複しています（' +
      (seen.get(p.id) + 2) + '行目 と ' + (i + 2) + '行目）');
  } else {
    seen.set(p.id, i);
  }
});

if (errors.length) {
  console.error('');
  errors.forEach(function (e) { console.error('エラー: ' + e); });
  console.error('');
  fail(errors.length + '件の問題があります。シートを直してから実行してください。' +
    'サイトのデータは変更していません。');
}

warnings.forEach(function (w) { console.warn('警告: ' + w); });

/* ---------- 差分の確認 ---------- */
const before = fs.existsSync(CSV_PATH) ? fs.readFileSync(CSV_PATH, 'utf8') : '';
const next = csv.stringify(rows);

if (CHECK_ONLY) {
  console.log('検証OK: ' + properties.length + '件' +
    (warnings.length ? '（警告 ' + warnings.length + '件）' : '') +
    (before === next ? '。前回から変更はありません。' : '。変更があります。') +
    ' 書き込みはしていません。');
  process.exit(0);
}

if (before === next) {
  console.log('スプレッドシートに変更はありませんでした（' + properties.length + '件）。');
  process.exit(0);
}

fs.writeFileSync(CSV_PATH, next);
console.log('data/properties.csv を更新しました（' + properties.length + '件）。');

/* ---------- サイトへ反映 ---------- */
execFileSync(process.execPath, [path.join(__dirname, 'csv-to-properties.js')], { stdio: 'inherit' });

console.log('');
console.log('反映が終わりました。変更をサイトに公開するには次を実行してください:');
console.log('  git add -A && git commit -m "物件情報を更新" && git push');
