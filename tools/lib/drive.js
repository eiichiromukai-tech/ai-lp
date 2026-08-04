/* =====================================================
   Googleドライブから物件写真を取り込む
   -----------------------------------------------------
   共有ドライブの「photos」フォルダに写真を置くだけで掲載できるように、
   サービスアカウントでフォルダの中身を取得し、images/properties/ に
   同期します。ファイル名の約束はこれまでと同じです。

     CMP-1025-01_外観.jpg   … CMP-1025 の1枚目、キャプション「外観」

   認証は環境変数 GOOGLE_SERVICE_ACCOUNT_JSON（サービスアカウントの
   JSON鍵そのもの）で行います。設定がない場合は同期を行わず、
   images/properties/ に置かれたファイルをそのまま使います。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR_REL = 'images/properties';
/* テストは一時フォルダで動かすため、書き込み先を差し替えられるようにしてある。
   URLに書き出す DIR_REL は変えないので、サイト側の見え方は同じ。 */
const DIR = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.join(__dirname, '..', '..', DIR_REL);
const FOLDER_ID_FILE = path.join(__dirname, '..', 'drive-folder-id.txt');

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/* ---------- 設定 ---------- */

/* フォルダのURLをそのまま貼っても動くようにIDを取り出す。
   環境変数・設定ファイルのどちらから来ても同じ扱いにする。 */
function toFolderId(value) {
  const raw = String(value || '').trim();
  const m = /\/folders\/([a-zA-Z0-9_-]+)/.exec(raw);
  return m ? m[1] : raw;
}

function readFolderId() {
  if (process.env.DRIVE_FOLDER_ID && process.env.DRIVE_FOLDER_ID.trim()) {
    return toFolderId(process.env.DRIVE_FOLDER_ID);
  }
  if (!fs.existsSync(FOLDER_ID_FILE)) return '';
  const line = fs.readFileSync(FOLDER_ID_FILE, 'utf8')
    .split('\n')
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l && !l.startsWith('#'); })[0] || '';
  return toFolderId(line);
}

function readCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) return null;
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON がJSONとして読み取れません: ' + e.message);
  }
  if (!json.client_email || !json.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON に client_email または private_key がありません');
  }
  return json;
}

function isConfigured() {
  return !!(readFolderId() && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

/* ---------- 認証（JWT を自前で組み立てて access token を取る） ---------- */

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: creds.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const signature = base64url(
    crypto.createSign('RSA-SHA256').update(header + '.' + claim).sign(creds.private_key)
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claim + '.' + signature
    })
  });
  if (!res.ok) {
    throw new Error('サービスアカウントの認証に失敗しました（HTTP ' + res.status + '）。' +
      '鍵の内容と、Google Drive API が有効になっているかをご確認ください。');
  }
  return (await res.json()).access_token;
}

/* ---------- フォルダの中身を一覧する ---------- */

async function listFolder(token, folderId) {
  const files = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: "'" + folderId + "' in parents and trashed = false",
      fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, size)',
      pageSize: '200',
      /* 共有ドライブのファイルも対象にする */
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch('https://www.googleapis.com/drive/v3/files?' + params, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      const detail = res.status === 404
        ? 'フォルダが見つかりません。IDが正しいか、サービスアカウントに閲覧権限が付いているかをご確認ください。'
        : 'HTTP ' + res.status;
      throw new Error('フォルダの一覧を取得できませんでした（' + detail + '）');
    }
    const body = await res.json();
    files.push.apply(files, body.files || []);
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return files.filter(function (f) { return IMAGE_EXT_RE.test(f.name); });
}

async function downloadFile(token, fileId) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media&supportsAllDrives=true',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!res.ok) throw new Error('ダウンロードに失敗しました（HTTP ' + res.status + '）');
  return Buffer.from(await res.arrayBuffer());
}

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

/* ---------- 同期 ----------
   ドライブの中身を images/properties/ に反映する。
   ・新規／内容が変わったファイルだけダウンロードする
   ・ドライブから消えたファイルはローカルからも削除する
   戻り値: { added, updated, removed, kept } */
async function sync(log) {
  const folderId = readFolderId();
  const creds = readCredentials();
  const say = log || function () {};

  const token = await getAccessToken(creds);
  const remote = await listFolder(token, folderId);
  say('Googleドライブの写真: ' + remote.length + '枚');

  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

  const local = fs.readdirSync(DIR).filter(function (n) {
    return !n.startsWith('.') && IMAGE_EXT_RE.test(n);
  });

  const result = { added: 0, updated: 0, removed: 0, kept: 0 };
  const remoteNames = {};

  for (const file of remote) {
    remoteNames[file.name] = true;
    const dest = path.join(DIR, file.name);
    const exists = fs.existsSync(dest);

    /* md5 が一致していればダウンロードしない。
       取り込み時に自動縮小しているとローカルの md5 は変わるため、
       元ファイルの md5 を控えておいて比較する。 */
    const stampPath = dest + '.drive-md5';
    const stamp = exists && fs.existsSync(stampPath)
      ? fs.readFileSync(stampPath, 'utf8').trim()
      : '';
    if (exists && file.md5Checksum && stamp === file.md5Checksum) {
      result.kept++;
      continue;
    }

    const buf = await downloadFile(token, file.id);
    fs.writeFileSync(dest, buf);
    fs.writeFileSync(stampPath, file.md5Checksum || md5(buf));
    if (exists) { result.updated++; say('  更新: ' + file.name); }
    else { result.added++; say('  追加: ' + file.name); }
  }

  /* ドライブにないファイルは掲載を終えたものとみなして消す */
  for (const name of local) {
    if (remoteNames[name]) continue;
    fs.unlinkSync(path.join(DIR, name));
    try { fs.unlinkSync(path.join(DIR, name + '.drive-md5')); } catch (ignore) { /* なくてよい */ }
    result.removed++;
    say('  削除: ' + name + '（ドライブにないため）');
  }

  return result;
}

module.exports = {
  DIR_REL: DIR_REL,
  FOLDER_ID_FILE: FOLDER_ID_FILE,
  isConfigured: isConfigured,
  readFolderId: readFolderId,
  sync: sync
};
