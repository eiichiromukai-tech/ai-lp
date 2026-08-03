/* =====================================================
   Googleスプレッドシートの取り込み
   -----------------------------------------------------
   ブラウザで開いているときのURLをそのまま貼れるように、
   CSV書き出し用のURLへ変換してから取得します。

     https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>
       ↓
     https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const URL_FILE = path.join(__dirname, '..', 'sheet-url.txt');

/* 設定の読み取り。環境変数 SHEET_URL が優先（CI から差し替えられるように） */
function readConfiguredUrl() {
  if (process.env.SHEET_URL && process.env.SHEET_URL.trim()) {
    return process.env.SHEET_URL.trim();
  }
  if (!fs.existsSync(URL_FILE)) return '';
  return fs.readFileSync(URL_FILE, 'utf8')
    .split('\n')
    .map(function (line) { return line.trim(); })
    .filter(function (line) { return line && !line.startsWith('#'); })[0] || '';
}

/* 編集用URL → CSV書き出しURL。すでに書き出し用ならそのまま返す */
function toCsvUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/\/export\?/.test(raw) || /\/pub\?/.test(raw) || /output=csv/.test(raw)) return raw;

  const id = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(raw);
  if (id) {
    /* gid はシート（タブ）の指定。無ければ先頭シート */
    const gid = /[#&?]gid=(\d+)/.exec(raw);
    return 'https://docs.google.com/spreadsheets/d/' + id[1] +
      '/export?format=csv' + (gid ? '&gid=' + gid[1] : '');
  }

  /* Googleスプレッドシート以外でも、CSVを返すURLならそのまま使える
     （Microsoft 365 / Dropbox / 自社サーバーなど） */
  if (/^https?:\/\//.test(raw)) return raw;
  return '';
}

/* curl で取得する（社内プロキシ環境でも動くように） */
function download(csvUrl) {
  const out = execFileSync('curl', [
    '--fail', '--silent', '--show-error', '--location',
    '--max-time', '60', csvUrl
  ], { maxBuffer: 64 * 1024 * 1024 });
  return out.toString('utf8');
}

module.exports = {
  URL_FILE: URL_FILE,
  readConfiguredUrl: readConfiguredUrl,
  toCsvUrl: toCsvUrl,
  download: download
};
