/* RFC4180準拠の最小CSVパーサ / ライタ（依存パッケージなし） */
'use strict';

/* CSV文字列 → 行の配列（各行は文字列の配列） */
function parse(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM除去
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += c; }
  }

  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  /* 末尾の空行を落とす */
  while (rows.length && rows[rows.length - 1].every(function (v) { return v === ''; })) {
    rows.pop();
  }
  return rows;
}

function escapeField(value) {
  var s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/* 行の配列 → CSV文字列（Excelでも文字化けしないようBOM付き） */
function stringify(rows) {
  return '﻿' + rows.map(function (row) {
    return row.map(escapeField).join(',');
  }).join('\r\n') + '\r\n';
}

module.exports = { parse: parse, stringify: stringify };
