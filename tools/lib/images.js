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
/* テストは固定のサンプル写真で動かすため、読み込み先を差し替えられるようにしてある。
   URLに書き出す DIR_REL は変えないので、サイト側の見え方は同じ。 */
const DIR = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.join(__dirname, '..', '..', DIR_REL);

const MAX_PER_PROPERTY = 10;
/* 表示が重くならないよう、これを超える写真は自動で縮小する */
const MAX_EDGE = 1600;
const WARN_BYTES = 1.5 * 1024 * 1024;

/* sharp が入っていれば自動リサイズする。無くても動く（警告だけ出す） */
let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* 任意の依存 */ }

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
/* <物件番号>-<番号>[_キャプション].<拡張子> */
const FILE_RE = /^(.+)-(\d{1,2})(?:_([^.]+))?\.(jpe?g|png|webp|avif|gif)$/i;

function humanSize(bytes) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + 'MB'
    : Math.round(bytes / 1024) + 'KB';
}

/* 大きすぎる写真を長辺 MAX_EDGE まで縮小して上書きする。
   スマホで撮った写真をそのまま置いても重くならないようにするため。 */
function shrink(file, warnings) {
  const before = fs.statSync(file).size;
  if (!sharp) {
    if (before > WARN_BYTES) {
      warnings.push('画像「' + path.basename(file) + '」は' + humanSize(before) +
        'あります。`npm install` を実行すると自動で縮小できます');
    }
    return false;
  }
  let meta;
  try { meta = sharp(file).metadata(); } catch (e) { return false; }
  return Promise.resolve(meta).then(function (m) {
    if (!m || (Math.max(m.width || 0, m.height || 0) <= MAX_EDGE && before <= WARN_BYTES)) return false;
    return sharp(file)
      .rotate()                                   /* 撮影時の向きを反映してからExifを落とす */
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .toBuffer()
      .then(function (buf) {
        if (buf.length >= before) return false;   /* 小さくならないなら触らない */
        fs.writeFileSync(file, buf);
        console.log('  画像を縮小しました: ' + path.basename(file) +
          '（' + humanSize(before) + ' → ' + humanSize(buf.length) + '）');
        return true;
      });
  }).catch(function () { return false; });
}

/* 物件番号 → [{ src, caption }] を返す。
   knownIds を渡すと、対応する物件がないファイルを警告します。 */
function collect(knownIds, warnings) {
  const byId = {};
  if (!fs.existsSync(DIR)) return { byId: byId, pending: [] };

  /* 画像以外（README など）は黙って無視する */
  const files = fs.readdirSync(DIR).filter(function (name) {
    return !name.startsWith('.') && IMAGE_EXT_RE.test(name);
  }).sort();

  const found = [];
  const pending = [];
  files.forEach(function (name) {
    const m = FILE_RE.exec(name);
    if (!m) {
      warnings.push('画像「' + name + '」はファイル名の形式が違うため読み込みませんでした' +
        '（<物件番号>-01.jpg のように付けてください）');
      return;
    }
    pending.push(shrink(path.join(DIR, name), warnings));
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

  return { byId: byId, pending: pending };
}

/* 縮小の完了を待ってから結果を返す */
function collectAsync(knownIds, warnings) {
  const out = collect(knownIds, warnings);
  return Promise.all(out.pending).then(function () { return out.byId; });
}

module.exports = {
  DIR_REL: DIR_REL,
  MAX_PER_PROPERTY: MAX_PER_PROPERTY,
  MAX_EDGE: MAX_EDGE,
  hasResizer: function () { return !!sharp; },
  collect: collect,
  collectAsync: collectAsync
};
