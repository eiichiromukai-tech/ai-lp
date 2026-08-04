#!/usr/bin/env node
/* =====================================================
   data/properties.csv → data/properties.js

   スプレッドシートを更新したら、CSVで書き出して
   data/properties.csv を置き換えたうえで実行します。

     node tools/csv-to-properties.js          … 検証して書き込み
     node tools/csv-to-properties.js --check  … 検証のみ（書き込まない）

   入力に問題があれば書き込まずに終了します。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('./lib/csv');
const schema = require('./lib/schema');
const images = require('./lib/images');
const seo = require('./lib/seo');

const CSV_PATH = path.join(__dirname, '..', 'data', 'properties.csv');
const JS_PATH = path.join(__dirname, '..', 'data', 'properties.js');
const CHECK_ONLY = process.argv.includes('--check');

const BEGIN = '/* === PROPERTIES:BEGIN';
const END = '  /* === PROPERTIES:END === */';

function fail(message) {
  console.error('エラー: ' + message);
  process.exit(1);
}

/* ---------- 読み込み ---------- */
if (!fs.existsSync(CSV_PATH)) fail(CSV_PATH + ' が見つかりません');

const rows = csv.parse(fs.readFileSync(CSV_PATH, 'utf8'));
if (rows.length < 2) fail('CSVに物件データの行がありません');

const header = rows[0].map(function (h) { return h.trim(); });
const expected = schema.HEADERS;
if (header.length !== expected.length || header.some(function (h, i) { return h !== expected[i]; })) {
  console.error('エラー: 見出し行が想定と異なります。');
  console.error('  期待: ' + expected.join(', '));
  console.error('  実際: ' + header.join(', '));
  console.error('列の追加・並べ替え・名称変更をした場合は tools/lib/schema.js の COLUMNS も合わせてください。');
  process.exit(1);
}

/* ---------- 検証 ---------- */
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

/* ---------- 物件写真の取り込み（必要なら自動で縮小する） ---------- */
images.collectAsync(properties.map(function (p) { return p.id; }), warnings)
  .then(function (photos) {
    properties.forEach(function (p) { p.images = photos[p.id] || []; });
    finish();
  })
  .catch(function (e) { fail('画像の取り込みに失敗しました: ' + e.message); });

function finish() {

warnings.forEach(function (w) { console.warn('警告: ' + w); });

if (errors.length) {
  console.error('');
  errors.forEach(function (e) { console.error('エラー: ' + e); });
  console.error('');
  fail(errors.length + '件の問題があります。data/properties.js は更新していません。');
}

/* ---------- 出力 ---------- */
function q(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function renderProperty(p) {
  const lines = [];
  lines.push('    {');
  lines.push('      id: ' + q(p.id) + ',');
  lines.push('      title: ' + q(p.title) + ',');
  lines.push('      deal: ' + q(p.deal) + ',');
  lines.push('      type: ' + q(p.type) + ',');
  lines.push('      status: ' + q(p.status) + ',');
  lines.push('      ward: ' + q(p.ward) + ',');
  lines.push('      address: ' + q(p.address) + ',');
  if (p.access.length) {
    lines.push('      access: [');
    lines.push(p.access.map(function (a) {
      return '        { line: ' + q(a.line) + ', station: ' + q(a.station) + ', walk: ' + a.walk + ' }';
    }).join(',\n'));
    lines.push('      ],');
  } else {
    lines.push('      access: [],');
  }
  lines.push('      rent: ' + p.rent + ', managementFee: ' + p.managementFee +
    ', deposit: ' + p.deposit + ', keyMoney: ' + p.keyMoney + ',');
  if (p.deal === 'sale') {
    lines.push('      price: ' + p.price + ',');
    lines.push('      yieldRate: ' + p.yieldRate + ',');
    lines.push('      tenure: ' + q(p.tenure) + ',');
  }
  if (p.contractTerm) lines.push('      contractTerm: ' + q(p.contractTerm) + ',');
  lines.push('      areaTsubo: ' + p.areaTsubo + ',');
  lines.push('      floor: ' + q(p.floor) + ',');
  lines.push('      floorsTotal: ' + p.floorsTotal + ',');
  lines.push('      builtYear: ' + (p.builtYear == null ? 'null' : p.builtYear) + ',');
  lines.push('      structure: ' + q(p.structure) + ',');
  if (p.zoning) lines.push('      zoning: ' + q(p.zoning) + ',');
  if (p.buildingCoverage != null) lines.push('      buildingCoverage: ' + p.buildingCoverage + ',');
  if (p.floorAreaRatio != null) lines.push('      floorAreaRatio: ' + p.floorAreaRatio + ',');
  if (p.privateRoad) lines.push('      privateRoad: ' + q(p.privateRoad) + ',');
  if (p.buildingPermit) lines.push('      buildingPermit: ' + q(p.buildingPermit) + ',');
  lines.push('      features: [' + p.features.map(q).join(', ') + '],');
  lines.push('      usage: [' + p.usage.map(q).join(', ') + '],');
  lines.push('      availableFrom: ' + q(p.availableFrom) + ',');
  lines.push('      updatedAt: ' + q(p.updatedAt) + ',');
  if (p.images.length) {
    lines.push('      images: [');
    lines.push(p.images.map(function (img) {
      return '        { src: ' + q(img.src) + ', caption: ' + q(img.caption) + ' }';
    }).join(',\n'));
    lines.push('      ],');
  }
  lines.push('      description: ' + q(p.description));
  lines.push('    }');
  return lines.join('\n');
}

const block = [
  '  /* === PROPERTIES:BEGIN =========================================',
  '     この配列は tools/csv-to-properties.js が data/properties.csv から',
  '     生成します。スプレッドシート運用中は直接編集しないでください。',
  '     ============================================================= */',
  '  var PROPERTIES = [',
  properties.map(renderProperty).join(',\n'),
  '  ];',
  END
].join('\n');

const source = fs.readFileSync(JS_PATH, 'utf8');
const startAt = source.indexOf('  ' + BEGIN);
const endAt = source.indexOf(END);
if (startAt === -1 || endAt === -1) {
  fail('data/properties.js に PROPERTIES:BEGIN / END のマーカーが見つかりません');
}

const updated = source.slice(0, startAt) + block + source.slice(endAt + END.length);

if (CHECK_ONLY) {
  console.log('検証OK: ' + properties.length + '件' +
    (warnings.length ? '（警告 ' + warnings.length + '件）' : '') + '。書き込みはしていません。');
  process.exit(0);
}

fs.writeFileSync(JS_PATH, updated);

/* 生成物が実際に読み込めるか確認する */
try {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(JS_PATH, 'utf8'))(sandbox.window);
  const count = ((sandbox.window.PORTAL_DATA || {}).properties || []).length;
  if (count !== properties.length) throw new Error('件数が一致しません（' + count + ' / ' + properties.length + '）');
} catch (e) {
  fail('生成した data/properties.js を読み込めませんでした: ' + e.message);
}

const statusCount = properties.reduce(function (acc, p) {
  acc[p.status] = (acc[p.status] || 0) + 1;
  return acc;
}, {});

const dealCount = properties.reduce(function (acc, p) {
  acc[p.deal] = (acc[p.deal] || 0) + 1;
  return acc;
}, {});

const withPhotos = properties.filter(function (p) { return p.images.length; });
const photoCount = withPhotos.reduce(function (n, p) { return n + p.images.length; }, 0);

console.log('data/properties.js を更新しました: ' + properties.length + '件' +
  '（賃貸 ' + (dealCount.rent || 0) + '／売買 ' + (dealCount.sale || 0) + '）' +
  '（募集中 ' + (statusCount.available || 0) +
  '／商談中 ' + (statusCount.negotiating || 0) +
  '／成約済 ' + (statusCount.closed || 0) + '）');
console.log('物件写真: ' + photoCount + '枚（' + withPhotos.length + '件の物件に掲載）。' +
  '写真のない物件は種別ごとのイメージ画像を表示します。');

/* ---------- sitemap.xml / robots.txt ---------- */
const sandbox2 = { window: {} };
new Function('window', fs.readFileSync(JS_PATH, 'utf8'))(sandbox2.window);
const data = sandbox2.window.PORTAL_DATA;
const urlCount = seo.write(data.site.siteUrl, data.properties, data.prefectures);
console.log('sitemap.xml / robots.txt を更新しました（' + urlCount + 'URL）。');

if (warnings.length) console.log('警告 ' + warnings.length + '件は内容をご確認ください。');
}
