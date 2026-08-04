#!/usr/bin/env node
/* =====================================================
   microCMS の「APIスキーマを定義」画面に読み込ませるJSONを作ります。

     node tools/make-cms-schema.js

   出力:
     docs/microcms-schema.json       … 全32項目（交通・写真の繰り返しを含む）
     docs/microcms-schema-basic.json … 繰り返しを除いた30項目（読み込みの予備）

   書式は microCMS が実際に書き出したファイルに合わせています。
   （fieldId / name / kind / description / required と、種類ごとの設定。
   画面上のIDにあたる idValue は書き出しに含まれないため、付けません）

   選択肢（エリア・こだわり条件・物件種別）は data/properties.js の
   マスタから、フィールドIDは tools/lib/cms.js の対応表から作ります。
   マスタを増やしたら、このコマンドを再実行してから読み込ませてください。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const schema = require('./lib/schema');

const DOCS = path.join(__dirname, '..', 'docs');
const M = schema.MASTERS;

function base(fieldId, name, kind, required) {
  return {
    fieldId: fieldId,
    name: name,
    kind: kind,
    description: null,
    required: !!required
  };
}

/* テキストは書き出しの実物どおりに揃える */
function text(fieldId, name, required) {
  return Object.assign(base(fieldId, name, 'text', required), {
    textSizeLimitValidation: null,
    patternMatchValidation: null,
    isUnique: false,
    initialValue: null
  });
}
function textArea(fieldId, name) {
  return Object.assign(base(fieldId, name, 'textArea'), {
    textSizeLimitValidation: null,
    initialValue: null
  });
}
function number(fieldId, name, required) {
  return Object.assign(base(fieldId, name, 'number', required), {
    numberSizeLimitValidation: null,
    initialValue: null
  });
}
function date(fieldId, name) {
  return Object.assign(base(fieldId, name, 'date'), { initialValue: null });
}
function media(fieldId, name) {
  return base(fieldId, name, 'media');
}
function select(fieldId, name, items, opts) {
  opts = opts || {};
  return Object.assign(base(fieldId, name, 'select', opts.required), {
    selectItems: items.map(function (v) { return { id: idOf(fieldId + ':' + v), value: v }; }),
    multipleSelect: !!opts.multiple
  });
}
function repeater(fieldId, name, customFieldCreatedAt) {
  return Object.assign(base(fieldId, name, 'repeater'), {
    customFieldCreatedAtList: [customFieldCreatedAt]
  });
}

/* 選択肢のIDは内容から決める。作り直しても同じ値になり、差分を追いやすい */
function idOf(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, '0');
}

/* 繰り返しフィールドの中身。createdAt が参照用のIDになる */
const ACCESS_CF = '2026-08-04T00:00:00.000Z';
const PHOTO_CF = '2026-08-04T00:00:01.000Z';

const USAGE = ['飲食店', 'カフェ', 'バー', '物販', 'サービス', 'クリニック', 'スクール',
  'ショールーム', 'ギャラリー', '事務所', '店舗', '倉庫', '工場', '軽作業',
  '宿泊', '駐車場', '事業用建物', '複合'];

/* 繰り返し以外の30項目 */
const basicFields = [
  text('propertyId', '物件番号', true),
  text('title', '物件名', true),
  select('deal', '取引種別', M.deals.map(function (d) { return d.label; }), { required: true }),
  select('type', '物件種別', M.types.map(function (t) { return t.label; }), { required: true }),
  select('status', '募集状況', ['募集中', '商談中', '成約済']),
  select('ward', 'エリア（市区）', M.areas, { required: true }),
  text('address', '所在地'),

  number('rent', '月額賃料（円）'),
  number('managementFee', '共益費（円）'),
  number('deposit', '敷金（ヶ月）'),
  number('keyMoney', '礼金（ヶ月）'),
  text('contractTerm', '契約期間'),

  number('price', '販売価格（円）'),
  number('yieldRate', '表面利回り（％）'),
  text('tenure', '権利形態'),
  text('zoning', '用途地域'),
  number('buildingCoverage', '建ぺい率（％）'),
  number('floorAreaRatio', '容積率（％）'),
  text('privateRoad', '私道負担'),
  text('buildingPermit', '建築確認番号'),

  number('areaTsubo', '面積（坪）', true),
  text('floor', '階数'),
  number('floorsTotal', '建物階数'),
  text('built', '築年月'),
  text('structure', '構造'),
  select('features', 'こだわり条件', M.features, { multiple: true }),
  select('usage', '用途', USAGE, { multiple: true }),
  text('availableFrom', '入居可能時期・引渡し時期'),
  textArea('description', '物件説明'),
  date('infoUpdatedAt', '情報更新日（通常は空でOK）')
];

/* 交通は「所在地」の直後、写真は「物件説明」の直後が入力しやすい */
const apiFields = [];
basicFields.forEach(function (f) {
  apiFields.push(f);
  if (f.fieldId === 'address') apiFields.push(repeater('access', '交通', ACCESS_CF));
  if (f.fieldId === 'description') apiFields.push(repeater('photos', '写真', PHOTO_CF));
});

const customFields = [
  {
    createdAt: ACCESS_CF,
    fieldId: 'accessItem',
    name: '交通',
    fields: [
      text('line', '路線'),
      text('station', '駅'),
      number('walk', '徒歩（分）')
    ]
  },
  {
    createdAt: PHOTO_CF,
    fieldId: 'photoItem',
    name: '写真',
    fields: [
      media('image', '写真'),
      text('caption', 'キャプション')
    ]
  }
];

function write(name, data) {
  fs.writeFileSync(path.join(DOCS, name), JSON.stringify(data, null, 2) + '\n');
}

fs.mkdirSync(DOCS, { recursive: true });
write('microcms-schema.json', { apiFields: apiFields, customFields: customFields });
write('microcms-schema-basic.json', { apiFields: basicFields, customFields: [] });

console.log('docs/microcms-schema.json を作りました（' + apiFields.length + '項目）。');
console.log('docs/microcms-schema-basic.json も作りました（' + basicFields.length +
  '項目。交通・写真を除いた予備）。');
console.log('  選択式 ' + apiFields.filter(function (f) { return f.kind === 'select'; }).length +
  '個／エリア ' + M.areas.length + '件／こだわり条件 ' + M.features.length + '件');
