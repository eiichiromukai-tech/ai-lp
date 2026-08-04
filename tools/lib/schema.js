/* =====================================================
   CSV と物件データの対応づけ（Node用の入口）
   -----------------------------------------------------
   検証・変換のルールそのものは js/schema-core.js にあります。
   ブラウザ（import.html）と同じものを使うためです。
   ここでは data/properties.js からマスタを読み込んで渡すだけです。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const core = require('../../js/schema-core.js');

/* data/properties.js からマスタ（種別・こだわり条件・エリア）を読み込む */
function loadMasters() {
  const file = path.join(__dirname, '..', '..', 'data', 'properties.js');
  const src = fs.readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  /* IIFE を実行して window.PORTAL_DATA を取り出す */
  new Function('window', src)(sandbox.window);
  const data = sandbox.window.PORTAL_DATA;
  if (!data) throw new Error('data/properties.js から PORTAL_DATA を取得できませんでした');
  return data;
}

module.exports = core.create(loadMasters());
