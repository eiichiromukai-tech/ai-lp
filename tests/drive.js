/* =====================================================
   Googleドライブ同期の検証

     node tests/drive.js

   Drive API をモックして tools/lib/drive.js を動かします。
   実際のドライブには接続しないため、認証情報は不要です。
   npm test からも実行されます。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

/* 実際に掲載している写真には触れず、一時フォルダで確認する。
   掲載枚数が変わってもテストが影響を受けないようにするため。 */
const DIR = fs.mkdtempSync(path.join(require('os').tmpdir(), 'drive-test-'));
process.env.IMAGES_DIR = DIR;

/* --- サービスアカウント鍵をその場で生成（実際の鍵は使わない） --- */
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'test@example.iam.gserviceaccount.com',
  private_key: privateKey
});
process.env.DRIVE_FOLDER_ID = 'https://drive.google.com/drive/folders/TESTFOLDER123';

/* --- ドライブ上にあるファイル（テストで差し替える） --- */
let remoteFiles = [];
const bodyOf = {};

function png(seed) {
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n'), Buffer.from(seed.repeat(40))]);
}

function register(name, content) {
  const buf = png(content);
  const id = 'id-' + name;
  bodyOf[id] = buf;
  return {
    id, name, mimeType: 'image/png',
    md5Checksum: crypto.createHash('md5').update(buf).digest('hex'),
    size: String(buf.length)
  };
}

/* --- fetch を差し替える --- */
const realFetch = global.fetch;
global.fetch = async function (url, opts) {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/token')) {
    return { ok: true, status: 200, json: async () => ({ access_token: 'test-token' }) };
  }
  if (u.startsWith('https://www.googleapis.com/drive/v3/files?')) {
    const q = new URL(u).searchParams.get('q');
    if (!/TESTFOLDER123/.test(q)) throw new Error('想定外のフォルダID: ' + q);
    return { ok: true, status: 200, json: async () => ({ files: remoteFiles }) };
  }
  const m = /drive\/v3\/files\/([^?]+)\?alt=media/.exec(u);
  if (m) {
    const buf = bodyOf[m[1]];
    if (!buf) return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async () => buf };
  }
  return realFetch(url, opts);
};

const drive = require(path.join(ROOT, 'tools/lib/drive.js'));

const listImages = () => fs.readdirSync(DIR).filter(n => /\.(png|jpe?g)$/i.test(n)).sort();

/* 掲載を終えた写真が消えることを確かめるため、あらかじめ2枚置いておく */
fs.writeFileSync(path.join(DIR, 'CMP-0001-01_古い写真.png'), png('X'));
fs.writeFileSync(path.join(DIR, 'CMP-0001-02_古い写真.png'), png('Y'));

let failures = 0;
function check(name, cond, detail) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : '  → ' + detail));
  if (!cond) failures++;
}

(async () => {
  try {
    console.log('設定の読み取り');
    check('フォルダURLからIDを取り出せる', drive.readFolderId() === 'TESTFOLDER123', drive.readFolderId());
    check('設定済みと判定される', drive.isConfigured() === true);

    console.log('\n初回の同期（ドライブに3枚）');
    remoteFiles = [
      register('CMP-1001-01_外観.png', 'A'),
      register('CMP-1001-02_店内.png', 'B'),
      register('CMP-2001-01_外観.png', 'C')
    ];
    let r = await drive.sync();
    check('3枚が追加される', r.added === 3, JSON.stringify(r));
    check('ローカルに3枚だけ残る', listImages().length === 3, listImages().join(','));
    check('ドライブにない既存の写真は削除される', r.removed === 2, String(r.removed));

    console.log('\n2回目の同期（変更なし）');
    r = await drive.sync();
    check('再ダウンロードしない', r.added === 0 && r.updated === 0, JSON.stringify(r));
    check('変更なしとして数える', r.kept === 3, String(r.kept));

    console.log('\n1枚を差し替え');
    remoteFiles[1] = register('CMP-1001-02_店内.png', 'Z');
    r = await drive.sync();
    check('差し替えを検知して更新する', r.updated === 1 && r.kept === 2, JSON.stringify(r));

    console.log('\nドライブから1枚削除');
    remoteFiles = remoteFiles.slice(0, 2);
    r = await drive.sync();
    check('ローカルからも消える', r.removed === 1, JSON.stringify(r));
    check('残りは2枚', listImages().length === 2, listImages().join(','));

    console.log('\n画像以外は無視する');
    remoteFiles.push({ id: 'id-doc', name: '説明書.pdf', mimeType: 'application/pdf', md5Checksum: 'x' });
    r = await drive.sync();
    check('PDFは取り込まない', listImages().length === 2, listImages().join(','));

    console.log('\nエラーの扱い');
    const origFetch = global.fetch;
    global.fetch = async (u) => String(u).includes('oauth2')
      ? { ok: false, status: 401 }
      : origFetch(u);
    let msg = '';
    try { await drive.sync(); } catch (e) { msg = e.message; }
    check('認証失敗を分かる形で伝える', /認証に失敗/.test(msg), msg);
    global.fetch = origFetch;

  } finally {
    /* 元の写真に戻す */
    fs.readdirSync(DIR).forEach(n => {
      if (/\.(png|jpe?g|drive-md5)$/i.test(n)) fs.unlinkSync(path.join(DIR, n));
    });
    fs.rmSync(DIR, { recursive: true, force: true });
  }

  console.log('\n' + '='.repeat(40));
  console.log(failures ? '失敗 ' + failures + '件' : 'すべて成功しました');
  process.exit(failures ? 1 : 0);
})();
