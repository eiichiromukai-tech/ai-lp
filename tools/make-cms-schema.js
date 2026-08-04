#!/usr/bin/env node
/* =====================================================
   microCMS の「APIスキーマを定義」画面に読み込ませるJSONを作ります。

     node tools/make-cms-schema.js

   出力: docs/microcms-schema.json

   選択肢（エリア・こだわり条件・物件種別）は data/properties.js の
   マスタから、フィールドIDは tools/lib/cms.js の対応表から作ります。
   マスタを増やしたら、このコマンドを再実行してから読み込ませてください。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const schema = require('./lib/schema');

const OUT = path.join(__dirname, '..', 'docs', 'microcms-schema.json');
const M = schema.MASTERS;

/* microCMS はフィールドごとに一意のIDを持つ。内容から決まる値にしておくと、
   作り直しても同じIDになり、差分を追いやすい。 */
function idOf(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 'f' + h.toString(36).padStart(7, '0');
}

function text(fieldId, name, required) {
  return clean({ idValue: idOf(fieldId), fieldId, name, kind: 'text', required: !!required });
}
function textArea(fieldId, name) {
  return { idValue: idOf(fieldId), fieldId, name, kind: 'textArea' };
}
function number(fieldId, name, required) {
  return clean({ idValue: idOf(fieldId), fieldId, name, kind: 'number', required: !!required });
}
function date(fieldId, name) {
  return { idValue: idOf(fieldId), fieldId, name, kind: 'date' };
}
function select(fieldId, name, items, opts) {
  opts = opts || {};
  return clean({
    idValue: idOf(fieldId),
    fieldId,
    name,
    kind: 'select',
    required: !!opts.required,
    multipleSelect: !!opts.multiple,
    selectItems: items.map(function (v) { return { id: idOf(fieldId + ':' + v), value: v }; })
  });
}
function repeater(fieldId, name, customFieldId) {
  return {
    idValue: idOf(fieldId),
    fieldId,
    name,
    kind: 'repeater',
    customFieldCreatedAtList: [customFieldId]
  };
}
function clean(o) {
  if (o.required === false) delete o.required;
  if (o.multipleSelect === false) delete o.multipleSelect;
  return o;
}

/* 繰り返しフィールドの中身。createdAt が参照用のIDになる */
const ACCESS_CF = '2026-08-04T00:00:00.000Z';
const PHOTO_CF = '2026-08-04T00:00:01.000Z';

const USAGE = ['飲食店', 'カフェ', 'バー', '物販', 'サービス', 'クリニック', 'スクール',
  'ショールーム', 'ギャラリー', '事務所', '店舗', '倉庫', '工場', '軽作業',
  '宿泊', '駐車場', '事業用建物', '複合'];

const apiFields = [
  text('propertyId', '物件番号', true),
  text('title', '物件名', true),
  select('deal', '取引種別', M.deals.map(function (d) { return d.label; }), { required: true }),
  select('type', '物件種別', M.types.map(function (t) { return t.label; }), { required: true }),
  select('status', '募集状況', ['募集中', '商談中', '成約済']),
  select('ward', 'エリア（市区）', M.areas, { required: true }),
  text('address', '所在地'),
  repeater('access', '交通', ACCESS_CF),

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

  repeater('photos', '写真', PHOTO_CF),
  date('infoUpdatedAt', '情報更新日（通常は空でOK）')
];

const customFields = [
  {
    createdAt: ACCESS_CF,
    fieldId: 'accessItem',
    name: '交通',
    fields: [
      { idValue: idOf('cf:line'), fieldId: 'line', name: '路線', kind: 'text' },
      { idValue: idOf('cf:station'), fieldId: 'station', name: '駅', kind: 'text' },
      { idValue: idOf('cf:walk'), fieldId: 'walk', name: '徒歩（分）', kind: 'number' }
    ],
    position: [[idOf('cf:line'), idOf('cf:station'), idOf('cf:walk')]]
  },
  {
    createdAt: PHOTO_CF,
    fieldId: 'photoItem',
    name: '写真',
    fields: [
      { idValue: idOf('cf:image'), fieldId: 'image', name: '写真', kind: 'media' },
      { idValue: idOf('cf:caption'), fieldId: 'caption', name: 'キャプション', kind: 'text' }
    ],
    position: [[idOf('cf:image'), idOf('cf:caption')]]
  }
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ apiFields, customFields }, null, 2) + '\n');

console.log('docs/microcms-schema.json を作りました。');
console.log('  フィールド ' + apiFields.length + '個（うち選択式 ' +
  apiFields.filter(function (f) { return f.kind === 'select'; }).length + '個）');
console.log('  エリアの選択肢 ' + M.areas.length + '件／こだわり条件 ' + M.features.length + '件');
