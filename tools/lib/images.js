/* =====================================================
   物件写真の取り込み
   -----------------------------------------------------
   images/properties/ に置かれたファイルを物件番号ごとに集めます。
   スプレッドシートに列を増やさずに済むよう、ファイル名だけで
   物件・並び順・キャプションが決まる約束にしています。

     CMP-1025-01.jpg          … CMP-1025 の1枚目（メイン画像）
     CMP-1025-02_内装.jpg      … 2枚目、キャプション「内装」
     CMP-1025-03_1階部分.png   … 3枚目、キャプション「1階部分」

   1物件あたり10枚まで。11枚目以降は警告を出して切り捨てます。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR_REL = 'images/properties';
const DIR = path.join(__dirname, '..', '..', DIR_REL);

const MAX_PER_PROPERTY = 10;
/* この容量を超えると表示が重くなるため警告する（長辺1600px・JPEG品質80程度が目安） */
const WARN_BYTES = 1.5 * 1024 * 1024;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
/* <物件番号>-<番号>[_キャプション].<拡張子> */
const FILE_RE = /^(.+)-(\d{1,2})(?:_([^.]+))?\.(jpe?g|png|webp|avif|gif)$/i;

function humanSize(bytes) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + 'MB'
    : Math.round(bytes / 1024) + 'KB';
}

/* 物件番号 → [{ src, caption }] を返す。
   knownIds を渡すと、対応する物件がないファイルを警告します。 */
function collect(knownIds, warnings) {
  const byId = {};
  if (!fs.existsSync(DIR)) return byId;

  /* 画像以外（README など）は黙って無視する */
  const files = fs.readdirSync(DIR).filter(function (name) {
    return !name.startsWith('.') && IMAGE_EXT_RE.test(name);
  }).sort();

  const found = [];
  files.forEach(function (name) {
    const m = FILE_RE.exec(name);
    if (!m) {
      warnings.push('画像「' + name + '」はファイル名の形式が違うため読み込みませんでした' +
        '（<物件番号>-01.jpg のように付けてください）');
      return;
    }
    const size = fs.statSync(path.join(DIR, name)).size;
    if (size > WARN_BYTES) {
      warnings.push('画像「' + name + '」は' + humanSize(size) +
        'あります。表示が重くなるため、長辺1600px程度に縮小することをおすすめします');
    }
    found.push({
      id: m[1],
      order: Number(m[2]),
      caption: (m[3] || '').trim(),
      src: DIR_REL + '/' + name,
      name: name
    });
  });

  found.sort(function (a, b) {
    return a.id === b.id ? a.order - b.order : (a.id < b.id ? -1 : 1);
  });

  found.forEach(function (item) {
    if (knownIds && knownIds.indexOf(item.id) === -1) {
      warnings.push('画像「' + item.name + '」に対応する物件番号「' + item.id +
        '」がスプレッドシートにありません');
      return;
    }
    (byId[item.id] = byId[item.id] || []).push({ src: item.src, caption: item.caption });
  });

  Object.keys(byId).forEach(function (id) {
    if (byId[id].length > MAX_PER_PROPERTY) {
      warnings.push('物件「' + id + '」の画像が' + byId[id].length + '枚あります。' +
        '先頭' + MAX_PER_PROPERTY + '枚だけ掲載します');
      byId[id] = byId[id].slice(0, MAX_PER_PROPERTY);
    }
  });

  return byId;
}

module.exports = {
  DIR_REL: DIR_REL,
  MAX_PER_PROPERTY: MAX_PER_PROPERTY,
  collect: collect
};
