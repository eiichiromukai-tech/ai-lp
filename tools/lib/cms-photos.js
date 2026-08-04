/* =====================================================
   microCMS の写真を images/properties/ に取り込む
   -----------------------------------------------------
   管理画面で物件に添付した写真を、サイトが配信するファイルとして
   保存します。ファイル名は今までと同じ約束にそろえるので、
   取り込んだあとの処理（縮小・並び順・キャプション）は変わりません。

     CMP-1025-01_外観.jpg   … CMP-1025 の1枚目、キャプション「外観」

   microCMS の画像URLはアップロードごとに変わるため、URLを控えておいて
   変化があったものだけダウンロードします。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR_REL = 'images/properties';
const DIR = path.join(__dirname, '..', '..', DIR_REL);
const STAMP_EXT = '.cms-src';
const MAX_PER_PROPERTY = 10;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

/* ファイル名に使えない文字と、意味を持つ文字（_ . ）を落とす */
function safeCaption(text) {
  return String(text || '')
    .replace(/[\\/:*?"<>|._\s]+/g, '')
    .slice(0, 20);
}

function extOf(url) {
  const m = IMAGE_EXT_RE.exec(String(url).split('?')[0]);
  return m ? m[0].toLowerCase() : '.jpg';
}

function fileNameFor(id, index, caption, url) {
  const no = String(index + 1).padStart(2, '0');
  const tail = safeCaption(caption);
  return id + '-' + no + (tail ? '_' + tail : '') + extOf(url);
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('写真を取得できませんでした（HTTP ' + res.status + '）: ' + url);
  return Buffer.from(await res.arrayBuffer());
}

/* wanted: [{ id, photos: [{url, caption}] }]
   戻り値: { added, updated, removed, kept } */
async function sync(wanted, warnings, log) {
  const say = log || function () {};
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

  const result = { added: 0, updated: 0, removed: 0, kept: 0 };
  const keep = {};

  for (const item of wanted) {
    let photos = item.photos || [];
    if (photos.length > MAX_PER_PROPERTY) {
      warnings.push('物件「' + item.id + '」の写真が' + photos.length + '枚あります。' +
        '先頭' + MAX_PER_PROPERTY + '枚だけ掲載します');
      photos = photos.slice(0, MAX_PER_PROPERTY);
    }

    for (let i = 0; i < photos.length; i++) {
      const name = fileNameFor(item.id, i, photos[i].caption, photos[i].url);
      const dest = path.join(DIR, name);
      const stampPath = dest + STAMP_EXT;
      keep[name] = true;
      keep[name + STAMP_EXT] = true;

      const exists = fs.existsSync(dest);
      const stamp = exists && fs.existsSync(stampPath)
        ? fs.readFileSync(stampPath, 'utf8').trim()
        : '';
      /* microCMS のURLはアップロードのたびに変わるので、URLが同じなら中身も同じ */
      if (exists && stamp === photos[i].url) { result.kept++; continue; }

      const buf = await download(photos[i].url);
      fs.writeFileSync(dest, buf);
      fs.writeFileSync(stampPath, photos[i].url);
      if (exists) { result.updated++; say('  更新: ' + name); }
      else { result.added++; say('  追加: ' + name); }
    }
  }

  /* 管理画面から外された写真は、サイトからも消す */
  fs.readdirSync(DIR).forEach(function (name) {
    if (name.startsWith('.') || keep[name]) return;
    if (!IMAGE_EXT_RE.test(name) && !name.endsWith(STAMP_EXT)) return;
    fs.unlinkSync(path.join(DIR, name));
    if (IMAGE_EXT_RE.test(name)) {
      result.removed++;
      say('  削除: ' + name + '（管理画面にないため）');
    }
  });

  return result;
}

module.exports = {
  DIR_REL: DIR_REL,
  MAX_PER_PROPERTY: MAX_PER_PROPERTY,
  fileNameFor: fileNameFor,
  safeCaption: safeCaption,
  sync: sync
};
