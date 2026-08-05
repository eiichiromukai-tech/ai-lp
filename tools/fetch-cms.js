#!/usr/bin/env node
/* =====================================================
   microCMS → サイトへ反映（1コマンド）

     node tools/fetch-cms.js           … 取り込んで反映まで行う
     node tools/fetch-cms.js --check   … 取り込んで検証するだけ（書き込まない）

   設定は tools/cms-config.json と、環境変数 MICROCMS_API_KEY です。
   設定手順は docs/microcms-setup.md をご覧ください。

   内容に問題があれば data/properties.csv も data/properties.js も
   書き換えずに終了します。サイトは前回のまま残ります。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const csv = require('./lib/csv');
const schema = require('./lib/schema');
const cms = require('./lib/cms');
const cmsPhotos = require('./lib/cms-photos');

const CSV_PATH = path.join(__dirname, '..', 'data', 'properties.csv');
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

if (!cms.isConfigured()) {
  console.error('エラー: microCMS の設定がされていません。');
  console.error('');
  console.error('  ・' + cms.CONFIG_FILE);
  console.error('    に serviceDomain（管理画面のURLに出てくる名前）を書いてください。');
  console.error('  ・環境変数 MICROCMS_API_KEY にAPIキーを設定してください。');
  console.error('    GitHubで動かす場合は Settings → Secrets and variables → Actions');
  console.error('    に MICROCMS_API_KEY という名前で登録します。');
  console.error('');
  console.error('  手順の全体は docs/microcms-setup.md に書いてあります。');
  process.exit(1);
}

(async function main() {
  /* ---------- 取得 ---------- */
  console.log('microCMS から物件を取得しています…');
  let records;
  try {
    records = await cms.fetchAll(function (m) { console.log(m); });
  } catch (e) {
    console.error('エラー: microCMS から取得できませんでした。');
    console.error('  ' + String(e.message || e));
    process.exit(1);
  }

  /* 公開中が0件のときも、そのまま反映する。
     全部を下書きに戻して掲載を止める、という運用ができなくなるため。
     （取得そのものが失敗した場合は、この手前で終了している） */
  if (!records.length) {
    console.warn('');
    console.warn('警告: microCMS に公開中の物件が1件もありません。');
    console.warn('      サイトの物件はすべて掲載されなくなります。');
    console.warn('      意図した操作でない場合は、管理画面で公開状態をご確認ください。');
    console.warn('');
  }

  /* ---------- 検証（書き込む前に確認する） ---------- */
  const errors = [];
  const warnings = [];
  const properties = records.map(function (record, i) {
    const get = cms.getterFor(record);
    const id = get('id');
    const label = '[' + (i + 1) + '件目' + (id ? ' ' + id : ' ' + (record.id || '')) + '] ';
    return schema.build(get, label, errors, warnings);
  });

  const seen = new Map();
  properties.forEach(function (p, i) {
    if (!p.id) return;
    if (seen.has(p.id)) {
      errors.push('物件番号「' + p.id + '」が重複しています（' +
        (seen.get(p.id) + 1) + '件目 と ' + (i + 1) + '件目）。' +
        '管理画面で片方の物件番号を変えてください。');
    } else {
      seen.set(p.id, i);
    }
  });

  if (errors.length) {
    console.error('');
    errors.forEach(function (e) { console.error('エラー: ' + e); });
    console.error('');
    fail(errors.length + '件の問題があります。管理画面で直してから実行してください。' +
      'サイトのデータは変更していません。');
  }

  warnings.forEach(function (w) { console.warn('警告: ' + w); });

  /* ---------- CSVに書き出す ----------
     CSVは人が読める控えとして残します。以降の処理（サイトのデータ生成・
     sitemap・写真の縮小）はスプレッドシート時代とまったく同じものが動きます。 */
  const rows = [schema.HEADERS].concat(properties.map(function (p) { return schema.toRow(p); }));
  const next = csv.stringify(rows);
  const before = fs.existsSync(CSV_PATH) ? fs.readFileSync(CSV_PATH, 'utf8') : '';

  if (CHECK_ONLY) {
    console.log('検証OK: ' + properties.length + '件' +
      (warnings.length ? '（警告 ' + warnings.length + '件）' : '') +
      (before === next ? '。前回から変更はありません。' : '。変更があります。') +
      ' 書き込みはしていません。');
    return;
  }

  if (before === next) {
    console.log('物件情報に変更はありませんでした（' + properties.length + '件）。');
  } else {
    fs.writeFileSync(CSV_PATH, next);
    console.log('data/properties.csv を更新しました（' + properties.length + '件）。');
  }

  /* ---------- 写真の取り込み ---------- */
  const wanted = records.map(function (record) {
    return { id: cms.getterFor(record)('id'), photos: cms.photosOf(record) };
  }).filter(function (item) { return item.id; });

  const photoWarnings = [];
  console.log('');
  console.log('写真を取り込んでいます…');
  try {
    const r = await cmsPhotos.sync(wanted, photoWarnings, function (m) { console.log(m); });
    console.log('写真: 追加' + r.added + '／更新' + r.updated +
      '／削除' + r.removed + '／変更なし' + r.kept);
  } catch (e) {
    /* 写真が取れなくても物件情報は反映する。落とすと全体が止まるため */
    console.warn('警告: 写真の取り込みに失敗しました（' + String(e.message || e) + '）。');
    console.warn('  物件情報だけ反映します。写真は次回の実行で取り込まれます。');
  }
  photoWarnings.forEach(function (w) { console.warn('警告: ' + w); });

  /* ---------- サイトのデータを作り直す ----------
     写真だけが変わった場合も反映されるよう、毎回実行します。 */
  console.log('');
  execFileSync(process.execPath, [path.join(__dirname, 'csv-to-properties.js')],
    { stdio: 'inherit' });
})().catch(function (e) {
  console.error('エラー: ' + String((e && e.message) || e));
  process.exit(1);
});
