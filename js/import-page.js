/* =====================================================
   図面から物件の下書きを作る画面
   -----------------------------------------------------
   ・PDFを落とすと、文字を取り出して左に表示します
   ・右のフォームに書き写すと、その場で検証されます
   ・検証は js/schema-core.js（サイトと運用ツールと同じルール）
   ・「一覧に追加」を繰り返し、最後にCSVを書き出します

   すべてブラウザの中で動きます。図面がどこかへ送られることはありません。
   ===================================================== */
(function () {
  'use strict';

  var SCHEMA = SCHEMA_CORE.create(window.PORTAL_DATA);
  var M = window.PORTAL_DATA;
  var rows = [];          /* 追加済みの物件（CSVの1行ぶんずつ） */
  var touched = false;    /* 一度でも入力されたか。開いた直後は指摘を出さない */

  /* CSVの列キー → 入力欄のid */
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value || '').trim() : ''; }

  /* ---------- 入力欄の組み立て ---------- */
  function option(v, label) {
    return '<option value="' + escapeAttr(v) + '">' + escapeHtml(label || v) + '</option>';
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function buildSelects() {
    el('f-deal').innerHTML = M.deals.map(function (d) { return option(d.label); }).join('');
    el('f-type').innerHTML = '<option value="">選択してください</option>' +
      M.types.map(function (t) { return option(t.label); }).join('');
    el('f-status').innerHTML = ['募集中', '商談中', '成約済']
      .map(function (s) { return option(s); }).join('');
    /* エリアは都県ごとにまとめて出す */
    el('f-ward').innerHTML = '<option value="">選択してください</option>' +
      M.prefectures.map(function (p) {
        var areas = M.areas.filter(function (a) { return M.areaPref[a] === p.value; });
        if (!areas.length) return '';
        return '<optgroup label="' + escapeAttr(p.label) + '">' +
          areas.map(function (a) { return option(a); }).join('') + '</optgroup>';
      }).join('');
    el('f-features').innerHTML = M.features.map(function (f) {
      return '<label class="imp-check"><input type="checkbox" value="' + escapeAttr(f) + '"> ' +
        escapeHtml(f) + '</label>';
    }).join('');
  }

  /* 「用途」の選択肢はサイト側では持っておらず、microCMSにしかない。
     決められた言葉以外を入れると登録のときに弾かれるので、
     microCMSの項目定義（docs/microcms-schema.json）から選択肢を作る。
     読み込めなかったときは、手入力の欄がそのまま残る。 */
  function buildUsageOptions() {
    return fetch('docs/microcms-schema.json').then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (json) {
      if (!json) return;
      var fields = json.apiFields || json.fields || [];
      var usage = fields.filter(function (f) { return f.fieldId === 'usage'; })[0];
      if (!usage || !usage.selectItems || !usage.selectItems.length) return;
      el('f-usage-checks').innerHTML = usage.selectItems.map(function (i) {
        return '<label class="imp-check"><input type="checkbox" value="' +
          escapeAttr(i.value) + '"> ' + escapeHtml(i.value) + '</label>';
      }).join('');
      el('f-usage').hidden = true;
    }).catch(function () { /* 手入力の欄で続けられるので、何もしない */ });
  }

  function checkedValues(selector) {
    return [].slice.call(document.querySelectorAll(selector + ' input:checked'))
      .map(function (c) { return c.value; });
  }

  /* ---------- 入力内容 → CSVの1行 ---------- */
  function currentValues() {
    var features = checkedValues('#f-features');
    /* 用途は選択肢を読めていれば、そちらを使う */
    var hasUsageChecks = document.querySelectorAll('#f-usage-checks input').length > 0;
    var usage = hasUsageChecks ? checkedValues('#f-usage-checks').join(';') : val('f-usage');
    return {
      id: val('f-id'),
      title: val('f-title'),
      deal: val('f-deal'),
      type: val('f-type'),
      status: val('f-status'),
      pref: '',                       /* エリアから自動で決まるので入力させない */
      ward: val('f-ward'),
      address: val('f-address'),
      access: val('f-access'),
      rent: val('f-rent'),
      managementFee: val('f-managementFee'),
      deposit: val('f-deposit'),
      keyMoney: val('f-keyMoney'),
      price: val('f-price'),
      yieldRate: val('f-yieldRate'),
      tenure: val('f-tenure'),
      contractTerm: val('f-contractTerm'),
      areaTsubo: val('f-areaTsubo'),
      floor: val('f-floor'),
      floorsTotal: val('f-floorsTotal'),
      built: val('f-built'),
      structure: val('f-structure'),
      zoning: val('f-zoning'),
      buildingCoverage: val('f-buildingCoverage'),
      floorAreaRatio: val('f-floorAreaRatio'),
      privateRoad: val('f-privateRoad'),
      buildingPermit: val('f-buildingPermit'),
      features: features.join(';'),
      usage: usage,
      availableFrom: val('f-availableFrom'),
      updatedAt: val('f-updatedAt'),
      description: val('f-description')
    };
  }

  /* ---------- 検証（サイトと同じルール） ---------- */
  function validate() {
    var v = currentValues();
    var errors = [], warnings = [];

    /* 交通は図面どおりの文章で入れてもらい、一括登録ツールと同じ処理で分解する。
       検証にかけるときだけ、サイト内部の「路線|駅|徒歩分」の形に直す。 */
    var accessItems = SCHEMA.parseAccessText(v.access);
    if (v.access && !accessItems.length) {
      errors.push('交通「' + v.access + '」を読み取れません。' +
        'JR山手線・埼京線「大崎」駅徒歩4分／都営浅草線「五反田」駅徒歩6分 のように書いてください');
    }

    SCHEMA.build(function (key) {
      if (key === 'access') return SCHEMA.encodeAccess(accessItems);
      return v[key] == null ? '' : String(v[key]);
    }, '', errors, warnings);

    /* 既に一覧にある物件番号との重複も見る */
    if (v.id && rows.some(function (r) { return r.id === v.id; })) {
      errors.push('物件番号「' + v.id + '」は、この一覧にすでにあります');
    }

    var box = el('validation');
    if (!touched) {
      /* 開いた直後に赤い指摘が並ぶと、何をすればいいのか分からなくなるため */
      box.className = 'imp-result';
      box.innerHTML = '図面を見ながら、上から入力してください。入力するとその場で確認します。';
      el('add-row').disabled = true;
      return false;
    }
    if (!errors.length && !warnings.length) {
      box.className = 'imp-result imp-ok';
      box.innerHTML = v.id ? '入力に問題はありません。「一覧に追加」できます。' : '入力してください。';
    } else {
      box.className = 'imp-result' + (errors.length ? ' imp-ng' : ' imp-warn');
      box.innerHTML =
        (errors.length ? '<p class="imp-label">直さないと登録できません</p><ul>' +
          errors.map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') + '</ul>' : '') +
        (warnings.length ? '<p class="imp-label">登録はできますが、確認してください</p><ul>' +
          warnings.map(function (w) { return '<li>' + escapeHtml(w) + '</li>'; }).join('') + '</ul>' : '');
    }
    el('add-row').disabled = errors.length > 0 || !v.id;
    return errors.length === 0;
  }

  /* ---------- 一覧 ---------- */
  function renderRows() {
    var tbody = el('rows-body');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="imp-empty">まだ追加されていません</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (r, i) {
        return '<tr><td>' + escapeHtml(r.id) + '</td><td>' + escapeHtml(r.title) +
          '</td><td>' + escapeHtml(r.ward) + '</td><td>' + escapeHtml(r.areaTsubo) +
          '</td><td><button type="button" class="imp-del" data-i="' + i + '">削除</button></td></tr>';
      }).join('');
    }
    el('rows-count').textContent = rows.length;
    el('download').disabled = rows.length === 0;
  }

  /* ---------- CSVの書き出し ---------- */
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadCsv() {
    /* 一括登録ツールが読む列の並びに合わせる */
    var keys = ['propertyId', 'title', 'deal', 'type', 'status', 'ward', 'address', 'access',
      'rent', 'managementFee', 'deposit', 'keyMoney', 'contractTerm',
      'price', 'yieldRate', 'tenure', 'zoning', 'buildingCoverage', 'floorAreaRatio',
      'privateRoad', 'buildingPermit', 'areaTsubo', 'floor', 'floorsTotal', 'built',
      'structure', 'features', 'usage', 'availableFrom', 'description', 'infoUpdatedAt'];
    var body = rows.map(function (r) {
      return keys.map(function (k) {
        if (k === 'propertyId') return csvCell(r.id);
        if (k === 'infoUpdatedAt') return csvCell(r.updatedAt);
        return csvCell(r[k]);
      }).join(',');
    });
    var csv = keys.join(',') + '\n' + body.join('\n') + '\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '物件データ_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- PDFから文字を取り出す ---------- */
  function showPdfStatus(message, busy) {
    var s = el('pdf-status');
    s.textContent = message;
    s.className = 'imp-pdf-status' + (busy ? ' is-busy' : '');
  }

  async function readPdf(file) {
    showPdfStatus(file.name + ' を読み込んでいます…', true);
    try {
      /* import() は「このファイル(js/)」から、workerSrc は「開いている画面」から数えます */
      var pdfjs = await import('../vendor/pdfjs/pdf.min.js');
      pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
      var buf = await file.arrayBuffer();
      var doc = await pdfjs.getDocument({ data: buf }).promise;
      var out = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var page = await doc.getPage(i);
        var content = await page.getTextContent();
        out.push(content.items.map(function (it) { return it.str; }).join(' '));
      }
      var text = out.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim();
      el('pdf-text').value = text;
      if (!text) {
        showPdfStatus('文字を取り出せませんでした。画像として作られたPDFの可能性があります。', false);
      } else {
        showPdfStatus(doc.numPages + 'ページから ' + text.length + '文字を取り出しました。', false);
      }
    } catch (e) {
      showPdfStatus('読み込めませんでした（' + (e && e.message ? e.message : e) + '）', false);
    }
  }

  /* ---------- 起動 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    buildSelects();
    buildUsageOptions();
    el('f-updatedAt').value = new Date().toISOString().slice(0, 10);
    renderRows();
    validate();

    ['input', 'change'].forEach(function (ev) {
      document.getElementById('property-form').addEventListener(ev, function () {
        touched = true;
        validate();
      });
    });

    el('add-row').addEventListener('click', function () {
      if (!validate()) return;
      rows.push(currentValues());
      renderRows();
      /* 同じ建物の別区画を続けて入れることが多いので、物件番号と区画だけ空にする */
      ['f-id', 'f-floor', 'f-areaTsubo'].forEach(function (id) { el(id).value = ''; });
      el('f-id').focus();
      validate();
    });

    el('rows-body').addEventListener('click', function (e) {
      var b = e.target.closest('.imp-del');
      if (!b) return;
      rows.splice(Number(b.dataset.i), 1);
      renderRows();
      validate();
    });

    el('download').addEventListener('click', downloadCsv);

    var drop = el('pdf-drop');
    var input = el('pdf-input');
    input.addEventListener('change', function () { if (input.files[0]) readPdf(input.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0];
      if (f) readPdf(f);
    });
  });
})();
