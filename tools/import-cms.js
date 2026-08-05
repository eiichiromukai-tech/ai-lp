#!/usr/bin/env node
/* =====================================================
   CSV から microCMS へ物件をまとめて登録する

     node tools/import-cms.js <CSVファイル>            … 公開状態で登録
     node tools/import-cms.js <CSVファイル> --draft     … 下書きで登録
     node tools/import-cms.js <CSVファイル> --dry-run   … 送信せず内容だけ確認

   管理画面のCSV取り込みでは「繰り返しフィールド」（交通・写真）を
   登録できないため、APIから登録します。交通は
     JR山手線・埼京線「大崎」駅徒歩4分／都営浅草線「五反田」駅徒歩6分
   のような文章を、路線・駅・徒歩分に分解して入れます。

   必要なもの:
     環境変数 MICROCMS_WRITE_API_KEY … 書き込み（PUT）権限のあるAPIキー
     ※ 読み取り用の MICROCMS_API_KEY とは別に作ってください。
       登録が済んだら、書き込み用のキーは削除することをおすすめします。

   物件番号をコンテンツIDとして登録するので、同じCSVを再実行しても
   重複せず、上書きになります。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('./lib/csv');
const schema = require('./lib/schema');
const cms = require('./lib/cms');

const args = process.argv.slice(2);
const CSV_PATH = args.find(function (a) { return !a.startsWith('--'); });
const DRAFT = args.includes('--draft');
const DRY_RUN = args.includes('--dry-run');
const WAIT_MS = 250;   /* APIの回数制限に触れないよう間隔をあける */

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

if (!CSV_PATH) fail('CSVファイルを指定してください（例: node tools/import-cms.js data.csv）');
if (!fs.existsSync(CSV_PATH)) fail(CSV_PATH + ' が見つかりません');

const conf = cms.readConfig();
if (!conf.serviceDomain) fail('tools/cms-config.json に serviceDomain がありません');

const KEY = String(process.env.MICROCMS_WRITE_API_KEY || '').trim();
if (!KEY && !DRY_RUN) {
  console.error('エラー: 環境変数 MICROCMS_WRITE_API_KEY が設定されていません。');
  console.error('');
  console.error('  microCMS の サービス設定 → APIキー で、PUT権限のあるキーを作り、');
  console.error('  次のように指定して実行してください。');
  console.error('');
  console.error('    MICROCMS_WRITE_API_KEY=＜キー＞ node tools/import-cms.js ' + CSV_PATH);
  console.error('');
  console.error('  送信せず内容だけ確認する場合は --dry-run を付けてください。');
  process.exit(1);
}

/* 交通の文章を分解する処理は js/schema-core.js にまとめてあります。
   図面の下書き画面（import.html）と同じ結果になるようにするためです。 */
const parseAccess = schema.parseAccessText;

/* コンテンツIDへの変換は js/schema-core.js にまとめてあります。
   下書きに戻す処理（tools/unpublish-cms.js）と同じIDを指す必要があるためです。 */
const toContentId = schema.toContentId;

function splitList(value) {
  return String(value || '').split(/[;；]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

/* ---------- 読み込みと検証 ---------- */
const rows = csv.parse(fs.readFileSync(CSV_PATH, 'utf8'));
if (rows.length < 2) fail('CSVに物件データの行がありません');

const header = rows[0].map(function (h) { return String(h).split('\n')[0].trim(); });
const need = ['propertyId', 'title', 'deal', 'type', 'ward', 'areaTsubo'];
const missing = need.filter(function (k) { return header.indexOf(k) === -1; });
if (missing.length) {
  fail('CSVの見出しに次の列がありません: ' + missing.join(', ') + '\n' +
    '  管理画面からエクスポートしたCSVの見出しをそのままお使いください。');
}

const at = {};
header.forEach(function (h, i) { at[h] = i; });

const errors = [];
const warnings = [];

const items = rows.slice(1)
  .filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); })
  .map(function (r) {
    const rec = {};
    header.forEach(function (h, i) { rec[h] = r[i]; });
    rec.access = parseAccess(r[at.access]);
    rec.photos = [];
    rec.features = splitList(r[at.features]);
    rec.usage = splitList(r[at.usage]);

    const label = '[' + (rec.propertyId || '番号なし') + '] ';
    schema.build(cms.getterFor(rec), label, errors, warnings);
    return rec;
  });

if (errors.length) {
  console.error('');
  errors.forEach(function (e) { console.error('エラー: ' + e); });
  console.error('');
  fail(errors.length + '件の問題があります。CSVを直してから実行してください。' +
    'microCMS には何も送っていません。');
}
warnings.forEach(function (w) { console.warn('警告: ' + w); });

/* ---------- microCMS へ送る形に整える ---------- */
function toBody(rec) {
  const body = {};
  header.forEach(function (h) {
    if (h === 'コンテンツID' || h.indexOf('コンテンツID') === 0) return;
    const v = rec[h];
    if (v === undefined || v === null || String(v).trim() === '') return;
    body[h] = v;
  });
  /* 数値の列は数値として送る（文字列だとmicroCMSが受け付けない） */
  ['rent', 'managementFee', 'deposit', 'keyMoney', 'price', 'yieldRate',
    'buildingCoverage', 'floorAreaRatio', 'areaTsubo', 'floorsTotal'].forEach(function (k) {
    if (body[k] !== undefined) {
      const n = Number(String(body[k]).replace(/[,，\s]/g, ''));
      if (Number.isFinite(n)) body[k] = n; else delete body[k];
    }
  });
  /* セレクトフィールドは、1つしか選べない項目でも配列で送る。
     文字列のまま送ると「has unexpected data type」で弾かれる。 */
  ['deal', 'type', 'status', 'ward'].forEach(function (k) {
    if (body[k] !== undefined) body[k] = [String(body[k])];
  });
  /* 複数選べる項目と繰り返しフィールド */
  body.features = rec.features;
  body.usage = rec.usage;
  body.access = rec.access;
  if (!body.features.length) delete body.features;
  if (!body.usage.length) delete body.usage;
  if (!body.access.length) delete body.access;
  delete body.photos;
  return body;
}

console.log(DRY_RUN
  ? items.length + '件を確認しました（送信はしません）。'
  : items.length + '件を' + (DRAFT ? '下書き' : '公開状態') + 'で登録します。');
console.log('交通の分解: ' + items.reduce(function (a, x) { return a + x.access.length; }, 0) + '件');
console.log('');

if (DRY_RUN) {
  const sample = items[0];
  console.log('--- 送信内容の例（1件目）---');
  console.log(JSON.stringify(toBody(sample), null, 1).slice(0, 900));
  console.log('');
  console.log('--dry-run のため、microCMS には送っていません。');
  process.exit(0);
}

/* ---------- 送信 ---------- */
/* 送信先。MICROCMS_API_BASE はテスト用の差し替え口で、通常は使いません */
const base = (process.env.MICROCMS_API_BASE ||
  'https://' + conf.serviceDomain + '.microcms.io/api/v1') + '/' + conf.endpoint;

(async function () {
  let ok = 0;
  const failed = [];
  for (const rec of items) {
    const id = toContentId(rec.propertyId);
    const url = base + '/' + id + (DRAFT ? '?status=draft' : '');
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'X-MICROCMS-API-KEY': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(rec))
      });
      if (!res.ok) {
        const text = await res.text().catch(function () { return ''; });
        failed.push({ id: id, detail: 'HTTP ' + res.status + ' ' + text.slice(0, 160) });
        console.log('  ✗ ' + id);
      } else {
        ok++;
        console.log('  ✓ ' + id + '  ' + rec.title);
      }
    } catch (e) {
      failed.push({ id: id, detail: String(e.message || e) });
      console.log('  ✗ ' + id);
    }
    await new Promise(function (r) { setTimeout(r, WAIT_MS); });
  }

  console.log('');
  console.log('登録できた: ' + ok + '件／失敗: ' + failed.length + '件');
  if (failed.length) {
    console.log('');
    failed.forEach(function (f) { console.log('  ' + f.id + ': ' + f.detail); });
    console.log('');
    console.log('失敗した分だけCSVを直して、同じコマンドを再実行してください。');
    console.log('物件番号をコンテンツIDにしているので、成功した分が重複することはありません。');
    process.exit(1);
  }
  console.log('');
  console.log('管理画面でご確認ください。サイトへの反映は15分おきの自動同期、');
  console.log('または Actions の Run workflow で行われます。');
})().catch(function (e) {
  fail(String((e && e.message) || e));
});
