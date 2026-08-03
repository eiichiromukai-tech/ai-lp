#!/usr/bin/env node
/* =====================================================
   data/properties.js → data/properties.csv

   スプレッドシートの初期データを作るときや、サイト側の
   現状をシートに取り込み直すときに使います。

     node tools/properties-to-csv.js
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('./lib/csv');
const schema = require('./lib/schema');

const OUT = path.join(__dirname, '..', 'data', 'properties.csv');

const rows = [schema.HEADERS].concat(
  schema.MASTERS.properties.map(schema.toRow)
);

fs.writeFileSync(OUT, csv.stringify(rows));
console.log('書き出しました: ' + path.relative(process.cwd(), OUT) +
  '（' + schema.MASTERS.properties.length + '件）');
console.log('Googleスプレッドシートに [ファイル] → [インポート] で読み込んでください。');
