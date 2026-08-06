/* =====================================================
   microCMS から物件データを取り込む
   -----------------------------------------------------
   管理画面で入力した内容を取得し、CSVの1行と同じ形に直します。
   検証と変換のルールは tools/lib/schema.js の build() が唯一の場所で、
   スプレッドシート経由でもCMS経由でも同じものが使われます。

   設定:
     tools/cms-config.json   … サービスドメインとAPI名（公開して問題ない値）
     環境変数 MICROCMS_API_KEY … APIキー（GitHubのSecretsに入れます）

   どちらかが無い場合は取り込みを行いません。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'cms-config.json');
const PAGE_SIZE = 100;

/* ---------- 設定 ---------- */

function readConfig() {
  const conf = { serviceDomain: '', endpoint: 'properties' };
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      Object.assign(conf, JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
    } catch (e) {
      throw new Error('tools/cms-config.json を読み取れません: ' + e.message);
    }
  }
  if (process.env.MICROCMS_SERVICE_DOMAIN) conf.serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  if (process.env.MICROCMS_ENDPOINT) conf.endpoint = process.env.MICROCMS_ENDPOINT;
  /* 管理画面のURLをそのまま貼られても動くようにする */
  conf.serviceDomain = String(conf.serviceDomain || '').trim()
    .replace(/^https?:\/\//, '')
    .replace(/\.microcms\.io.*$/, '')
    .replace(/\/.*$/, '');
  return conf;
}

function apiKey() {
  return String(process.env.MICROCMS_API_KEY || '').trim();
}

function isConfigured() {
  return !!(readConfig().serviceDomain && apiKey());
}

/* ---------- 取得 ---------- */

async function fetchAll(log) {
  const conf = readConfig();
  const say = log || function () {};
  const key = apiKey();
  if (!conf.serviceDomain) throw new Error('tools/cms-config.json に serviceDomain がありません');
  if (!key) throw new Error('環境変数 MICROCMS_API_KEY が設定されていません');

  /* MICROCMS_API_BASE はテスト用の差し替え口で、通常は使いません
     （tools/import-cms.js と同じ仕組みです） */
  const base = (process.env.MICROCMS_API_BASE ||
    'https://' + conf.serviceDomain + '.microcms.io/api/v1') + '/' + conf.endpoint;
  const items = [];
  let offset = 0;
  let total = null;

  do {
    const url = base + '?limit=' + PAGE_SIZE + '&offset=' + offset;
    let res;
    try {
      res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': key } });
    } catch (e) {
      const err = new Error('microCMS に接続できませんでした（' + e.message + '）。' +
        'ネットワーク側で遮断されていないかご確認ください。');
      err.blockedByNetwork = true;
      throw err;
    }
    if (!res.ok) throw new Error(describeHttpError(res.status, conf));
    const body = await res.json();
    items.push.apply(items, body.contents || []);
    total = body.totalCount == null ? items.length : body.totalCount;
    offset += PAGE_SIZE;
  } while (items.length < total);

  say('microCMS から ' + items.length + '件を取得しました');
  return items;
}

function describeHttpError(status, conf) {
  if (status === 401) {
    return 'microCMS の認証に失敗しました（HTTP 401）。' +
      'GitHubのSecrets「MICROCMS_API_KEY」の値が正しいか、' +
      'そのキーにGET権限があるかをご確認ください。';
  }
  if (status === 404) {
    return 'microCMS のAPIが見つかりません（HTTP 404）。' +
      'サービスドメイン「' + conf.serviceDomain + '」とAPI名「' + conf.endpoint + '」が' +
      '管理画面の表示と一致しているかご確認ください。';
  }
  return 'microCMS からの取得に失敗しました（HTTP ' + status + '）';
}

/* ---------- CMSの1件 → schema.build() が使える get(key) ---------- */

/* 選択フィールドは複数選択にすると配列で届く。単一でも配列でも同じ扱いにする */
function first(value) {
  if (Array.isArray(value)) return value.length ? String(value[0]) : '';
  return value == null ? '' : String(value);
}

function joinList(value) {
  if (Array.isArray(value)) return value.map(String).join(';');
  return value == null ? '' : String(value);
}

/* 交通は繰り返しフィールド [{line, station, walk}] で届く。
   CSVと同じ「路線|駅|徒歩分」を「;」で並べた形に直す。 */
function encodeAccess(list) {
  if (!Array.isArray(list)) return '';
  return list.map(function (a) {
    a = a || {};
    return [a.line || '', a.station || '', a.walk == null ? '' : a.walk].join('|');
  }).join(';');
}

/* 日時（2026-08-04T09:00:00.000Z）を日付（2026-08-04）にする */
function toDate(value) {
  const raw = String(value || '').trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return m ? m[1] : '';
}

const FIELD_OF = {
  id: 'propertyId',
  title: 'title',
  deal: 'deal',
  type: 'type',
  status: 'status',
  ward: 'ward',
  address: 'address',
  rent: 'rent',
  managementFee: 'managementFee',
  deposit: 'deposit',
  keyMoney: 'keyMoney',
  price: 'price',
  yieldRate: 'yieldRate',
  tenure: 'tenure',
  contractTerm: 'contractTerm',
  areaTsubo: 'areaTsubo',
  floor: 'floor',
  floorsTotal: 'floorsTotal',
  basementFloors: 'basementFloors',
  built: 'built',
  structure: 'structure',
  zoning: 'zoning',
  buildingCoverage: 'buildingCoverage',
  floorAreaRatio: 'floorAreaRatio',
  privateRoad: 'privateRoad',
  buildingPermit: 'buildingPermit',
  availableFrom: 'availableFrom',
  description: 'description'
};

/* 選択肢を複数持ちうる項目 */
const LIST_KEYS = { features: 'features', usage: 'usage' };

function getterFor(record) {
  const r = record || {};
  return function (key) {
    /* 都県はエリアから自動で決まるので、CMSでは入力させない */
    if (key === 'pref') return '';
    if (key === 'access') return encodeAccess(r.access);
    if (LIST_KEYS[key]) return joinList(r[LIST_KEYS[key]]);
    if (key === 'updatedAt') {
      /* 通常は空。CMS側の更新日時を使う。
         過去の日付にそろえたいときだけ infoUpdatedAt を入力する。 */
      return toDate(r.infoUpdatedAt) || toDate(r.updatedAt) || toDate(r.publishedAt);
    }
    const field = FIELD_OF[key];
    if (!field) return '';
    return first(r[field]).trim();
  };
}

/* 写真は [{ image: {url,...}, caption }] の繰り返しフィールド。
   戻り値: [{ url, caption }]（最大枚数の判定は取り込み側で行う） */
function photosOf(record) {
  const list = (record || {}).photos;
  if (!Array.isArray(list)) return [];
  return list.map(function (item) {
    item = item || {};
    const image = item.image || item;
    const url = image && image.url ? String(image.url) : '';
    return url ? { url: url, caption: String(item.caption || '').trim() } : null;
  }).filter(Boolean);
}

module.exports = {
  CONFIG_FILE: CONFIG_FILE,
  readConfig: readConfig,
  isConfigured: isConfigured,
  fetchAll: fetchAll,
  getterFor: getterFor,
  photosOf: photosOf
};
