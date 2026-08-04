/* =====================================================
   スプレッドシート（CSV）と物件データの対応づけ・入力チェック
   -----------------------------------------------------
   スプレッドシート上は日本語で扱い、サイト側の値へ変換します。
   （物件種別「店舗」→ shop、募集状況「募集中」→ available など）
   ===================================================== */
'use strict';

const path = require('path');

/* data/properties.js からマスタ（種別・こだわり条件・エリア）を読み込む */
function loadMasters() {
  const file = path.join(__dirname, '..', '..', 'data', 'properties.js');
  const src = require('fs').readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  /* IIFE を実行して window.PORTAL_DATA を取り出す */
  new Function('window', src)(sandbox.window);
  const data = sandbox.window.PORTAL_DATA;
  if (!data) throw new Error('data/properties.js から PORTAL_DATA を取得できませんでした');
  return data;
}

const MASTERS = loadMasters();

const TYPE_LABEL_TO_VALUE = {};
const TYPE_VALUE_TO_LABEL = {};
MASTERS.types.forEach(function (t) {
  TYPE_LABEL_TO_VALUE[t.label] = t.value;
  TYPE_VALUE_TO_LABEL[t.value] = t.label;
});

const DEAL_LABEL_TO_VALUE = {};
const DEAL_VALUE_TO_LABEL = {};
MASTERS.deals.forEach(function (d) {
  DEAL_LABEL_TO_VALUE[d.label] = d.value;
  DEAL_VALUE_TO_LABEL[d.value] = d.label;
});

/* 都県は市区名から自動で決まる（AREA_MASTER が唯一の対応表）。
   CSVの「都県」列は確認用で、書き出しでは埋め、読み込みでは市区と食い違えばエラーにする。 */
const PREF_LABEL_TO_VALUE = {};
const PREF_VALUE_TO_LABEL = {};
(MASTERS.prefectures || []).forEach(function (p) {
  PREF_LABEL_TO_VALUE[p.label] = p.value;
  PREF_VALUE_TO_LABEL[p.value] = p.label;
});
const AREA_PREF = MASTERS.areaPref || {};

const STATUS_LABEL_TO_VALUE = { '募集中': 'available', '商談中': 'negotiating', '成約済': 'closed' };
const STATUS_VALUE_TO_LABEL = { available: '募集中', negotiating: '商談中', closed: '成約済' };

/* CSVの列。順番がそのままスプレッドシートの列順になります。
   賃貸／売買で使う列が違います（賃貸=月額賃料〜礼金、売買=販売価格〜権利形態）。
   使わない側は空欄のままにしてください。 */
const COLUMNS = [
  { key: 'id', header: '物件番号' },
  { key: 'title', header: '物件名' },
  { key: 'deal', header: '取引種別' },
  { key: 'type', header: '物件種別' },
  { key: 'status', header: '募集状況' },
  { key: 'pref', header: '都県' },
  { key: 'ward', header: 'エリア（市区）' },
  { key: 'address', header: '所在地' },
  { key: 'access', header: '交通' },
  { key: 'rent', header: '月額賃料(円)' },
  { key: 'managementFee', header: '共益費(円)' },
  { key: 'deposit', header: '敷金(ヶ月)' },
  { key: 'keyMoney', header: '礼金(ヶ月)' },
  { key: 'price', header: '販売価格(円)' },
  { key: 'yieldRate', header: '表面利回り(%)' },
  { key: 'tenure', header: '権利形態' },
  { key: 'contractTerm', header: '契約期間' },
  { key: 'areaTsubo', header: '面積(坪)' },
  { key: 'floor', header: '階数' },
  { key: 'floorsTotal', header: '建物階数' },
  { key: 'builtYear', header: '築年' },
  { key: 'structure', header: '構造' },
  { key: 'zoning', header: '用途地域' },
  { key: 'buildingCoverage', header: '建ぺい率(%)' },
  { key: 'floorAreaRatio', header: '容積率(%)' },
  { key: 'privateRoad', header: '私道負担' },
  { key: 'buildingPermit', header: '建築確認番号' },
  { key: 'features', header: 'こだわり条件' },
  { key: 'usage', header: '用途' },
  { key: 'availableFrom', header: '入居可能時期・引渡し時期' },
  { key: 'updatedAt', header: '情報更新日' },
  { key: 'description', header: '物件説明' }
];

/* 交通は「路線|駅|徒歩分」を「;」区切りで並べる */
function encodeAccess(access) {
  return (access || []).map(function (a) {
    return [a.line, a.station, a.walk].join('|');
  }).join(';');
}

function decodeAccess(text, errors, row) {
  if (!String(text || '').trim()) return [];
  return String(text).split(';').map(function (chunk, i) {
    const parts = chunk.split('|').map(function (s) { return s.trim(); });
    if (parts.length !== 3) {
      errors.push(row + '交通' + (i + 1) + '件目「' + chunk.trim() + '」の形式が不正です（路線|駅|徒歩分）');
      return null;
    }
    const walk = Number(parts[2]);
    if (!parts[0] || !parts[1] || !Number.isFinite(walk) || walk < 0) {
      errors.push(row + '交通' + (i + 1) + '件目「' + chunk.trim() + '」を読み取れません（徒歩分は数値）');
      return null;
    }
    return { line: parts[0], station: parts[1], walk: walk };
  }).filter(Boolean);
}

function encodeList(list) { return (list || []).join(';'); }

function decodeList(text) {
  return String(text || '').split(';')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

/* 物件オブジェクト → CSVの1行 */
function toRow(p) {
  return COLUMNS.map(function (col) {
    const sale = p.deal === 'sale';
    switch (col.key) {
      case 'deal': return DEAL_VALUE_TO_LABEL[p.deal] || DEAL_VALUE_TO_LABEL.rent;
      case 'pref': return PREF_VALUE_TO_LABEL[p.pref || AREA_PREF[p.ward]] || '';
      case 'type': return TYPE_VALUE_TO_LABEL[p.type] || p.type;
      case 'status': return STATUS_VALUE_TO_LABEL[p.status] || p.status;
      case 'access': return encodeAccess(p.access);
      case 'features': return encodeList(p.features);
      case 'usage': return encodeList(p.usage);
      case 'builtYear': return p.builtYear == null ? '' : p.builtYear;
      case 'buildingCoverage': case 'floorAreaRatio':
        return p[col.key] == null ? '' : p[col.key];
      case 'contractTerm': return sale ? '' : (p.contractTerm || '');
      /* 取引種別で使わない側の金額列は空欄で書き出す */
      case 'rent': case 'managementFee': case 'deposit': case 'keyMoney':
        return sale ? '' : (p[col.key] == null ? '' : p[col.key]);
      case 'price': case 'yieldRate': case 'tenure':
        return sale ? (p[col.key] == null ? '' : p[col.key]) : '';
      default: return p[col.key] == null ? '' : p[col.key];
    }
  });
}

function num(value, label, rowLabel, errors, opts) {
  opts = opts || {};
  const raw = String(value == null ? '' : value).trim().replace(/[,，\s]/g, '');
  if (raw === '') {
    if (opts.required) errors.push(rowLabel + label + 'は必須です');
    return opts.required ? NaN : (opts.blank === undefined ? 0 : opts.blank);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) { errors.push(rowLabel + label + '「' + value + '」は数値ではありません'); return NaN; }
  if (n < 0) { errors.push(rowLabel + label + 'は0以上で入力してください'); return NaN; }
  return n;
}

function headerOf(key) {
  const col = COLUMNS.find(function (c) { return c.key === key; });
  return col ? col.header : key;
}

/* CSVの1行 → 物件オブジェクト。errors / warnings に問題を積む */
function fromRow(cells, index, errors, warnings) {
  const get = function (key) {
    const i = COLUMNS.findIndex(function (c) { return c.key === key; });
    return String(cells[i] == null ? '' : cells[i]).trim();
  };

  const id = get('id');
  const rowLabel = '[' + (index + 2) + '行目' + (id ? ' ' + id : '') + '] ';

  const p = {};
  p.id = id;
  if (!p.id) errors.push(rowLabel + '物件番号は必須です');

  p.title = get('title');
  if (!p.title) errors.push(rowLabel + '物件名は必須です');

  const dealLabel = get('deal') || '賃貸';
  p.deal = DEAL_LABEL_TO_VALUE[dealLabel];
  if (!p.deal) {
    errors.push(rowLabel + '取引種別「' + dealLabel + '」は使用できません（' +
      Object.keys(DEAL_LABEL_TO_VALUE).join('／') + '）');
  }
  const isSale = p.deal === 'sale';

  const typeLabel = get('type');
  p.type = TYPE_LABEL_TO_VALUE[typeLabel];
  if (!p.type) {
    errors.push(rowLabel + '物件種別「' + typeLabel + '」は使用できません（' +
      Object.keys(TYPE_LABEL_TO_VALUE).join('／') + '）');
  }

  const statusLabel = get('status') || '募集中';
  p.status = STATUS_LABEL_TO_VALUE[statusLabel];
  if (!p.status) {
    errors.push(rowLabel + '募集状況「' + statusLabel + '」は使用できません（募集中／商談中／成約済）');
  }

  p.ward = get('ward');
  if (!p.ward) errors.push(rowLabel + 'エリア（市区）は必須です');
  else if (MASTERS.areas.indexOf(p.ward) === -1) {
    errors.push(rowLabel + 'エリア（市区）「' + p.ward + '」はマスタにありません（' +
      'data/properties.js の AREA_MASTER に追加してください）');
  }

  /* 都県は市区名から決まる。列に入力がある場合だけ整合性を確かめる */
  p.pref = AREA_PREF[p.ward] || '';
  const prefLabel = get('pref');
  if (prefLabel) {
    const prefValue = PREF_LABEL_TO_VALUE[prefLabel];
    if (!prefValue) {
      errors.push(rowLabel + '都県「' + prefLabel + '」は使用できません（' +
        Object.keys(PREF_LABEL_TO_VALUE).join('／') + '）');
    } else if (p.pref && prefValue !== p.pref) {
      errors.push(rowLabel + '都県「' + prefLabel + '」とエリア「' + p.ward +
        '」が一致しません（' + p.ward + 'は' + PREF_VALUE_TO_LABEL[p.pref] + 'です）');
    }
  }

  p.address = get('address');
  p.access = decodeAccess(get('access'), errors, rowLabel);

  /* 金額は取引種別ごとに必須列が変わる。使わない側は0で埋める */
  p.rent = isSale ? 0 : num(get('rent'), '月額賃料', rowLabel, errors, { required: true });
  p.managementFee = isSale ? 0 : num(get('managementFee'), '共益費', rowLabel, errors);
  p.deposit = isSale ? 0 : num(get('deposit'), '敷金', rowLabel, errors);
  p.keyMoney = isSale ? 0 : num(get('keyMoney'), '礼金', rowLabel, errors);

  p.price = isSale ? num(get('price'), '販売価格', rowLabel, errors, { required: true }) : 0;
  p.yieldRate = isSale ? num(get('yieldRate'), '表面利回り', rowLabel, errors) : 0;
  p.tenure = isSale ? (get('tenure') || '所有権') : '';

  if (isSale) {
    ['rent', 'managementFee', 'deposit', 'keyMoney'].forEach(function (key) {
      if (get(key) !== '') {
        warnings.push(rowLabel + '売買の物件に' + headerOf(key) + 'が入力されています（無視します）');
      }
    });
  } else {
    ['price', 'yieldRate', 'tenure'].forEach(function (key) {
      if (get(key) !== '') {
        warnings.push(rowLabel + '賃貸の物件に' + headerOf(key) + 'が入力されています（無視します）');
      }
    });
  }

  p.areaTsubo = num(get('areaTsubo'), '面積', rowLabel, errors, { required: true });
  p.floor = get('floor') || '—';
  p.floorsTotal = num(get('floorsTotal'), '建物階数', rowLabel, errors);

  const builtYear = get('builtYear');
  p.builtYear = builtYear === '' ? null : num(builtYear, '築年', rowLabel, errors);

  p.structure = get('structure');

  /* 契約期間は不動産の表示に関する公正競争規約で賃貸の必須表示事項 */
  p.contractTerm = isSale ? '' : get('contractTerm');
  if (!isSale && !p.contractTerm) {
    warnings.push(rowLabel + '契約期間が空です（賃貸では表示が必要な項目です）');
  }

  /* 売買・事業用地で必要になる法令上の制限。分かる範囲で入力してください */
  p.zoning = get('zoning');
  p.buildingCoverage = get('buildingCoverage') === '' ? null
    : num(get('buildingCoverage'), '建ぺい率', rowLabel, errors);
  p.floorAreaRatio = get('floorAreaRatio') === '' ? null
    : num(get('floorAreaRatio'), '容積率', rowLabel, errors);
  p.privateRoad = get('privateRoad');
  p.buildingPermit = get('buildingPermit');

  if (isSale && !p.zoning) {
    warnings.push(rowLabel + '用途地域が空です（売買では表示が求められる項目です）');
  }
  if (isSale && p.type === 'land' && !p.privateRoad) {
    warnings.push(rowLabel + '私道負担が空です（土地の売買では表示が必要な項目です）');
  }

  p.features = decodeList(get('features'));
  p.features.forEach(function (f) {
    if (MASTERS.features.indexOf(f) === -1) {
      errors.push(rowLabel + 'こだわり条件「' + f + '」はマスタにありません（' +
        'data/properties.js の FEATURES に追加してください）');
    }
  });

  p.usage = decodeList(get('usage'));
  p.availableFrom = get('availableFrom') || '相談';

  p.updatedAt = get('updatedAt');
  if (!p.updatedAt) {
    errors.push(rowLabel + '情報更新日は必須です（YYYY-MM-DD）');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(p.updatedAt) || isNaN(new Date(p.updatedAt + 'T00:00:00'))) {
    errors.push(rowLabel + '情報更新日「' + p.updatedAt + '」の形式が不正です（YYYY-MM-DD）');
  }

  p.description = get('description');
  if (!p.description) warnings.push(rowLabel + '物件説明が空です');

  /* 桁間違いの検知（エラーではなく警告） */
  if (!isSale && Number.isFinite(p.rent) && p.rent > 0 && p.rent < 10000) {
    warnings.push(rowLabel + '月額賃料が' + p.rent + '円です。万円単位で入力していませんか');
  }
  if (!isSale && Number.isFinite(p.rent) && p.rent > 50000000) {
    warnings.push(rowLabel + '月額賃料が' + p.rent.toLocaleString('ja-JP') + '円です。桁が多すぎませんか');
  }
  if (isSale && Number.isFinite(p.price) && p.price > 0 && p.price < 1000000) {
    warnings.push(rowLabel + '販売価格が' + p.price.toLocaleString('ja-JP') +
      '円です。万円単位で入力していませんか');
  }
  if (isSale && Number.isFinite(p.yieldRate) && p.yieldRate > 30) {
    warnings.push(rowLabel + '表面利回りが' + p.yieldRate + '%です。値を確認してください');
  }
  if (Number.isFinite(p.areaTsubo) && p.areaTsubo > 1000) {
    warnings.push(rowLabel + '面積が' + p.areaTsubo + '坪です。m²で入力していませんか');
  }
  if (p.builtYear != null && Number.isFinite(p.builtYear) && (p.builtYear < 1900 || p.builtYear > 2100)) {
    warnings.push(rowLabel + '築年「' + p.builtYear + '」を確認してください');
  }
  if (!p.access.length) warnings.push(rowLabel + '交通が空です');

  return p;
}

module.exports = {
  MASTERS: MASTERS,
  COLUMNS: COLUMNS,
  HEADERS: COLUMNS.map(function (c) { return c.header; }),
  toRow: toRow,
  fromRow: fromRow
};
