/* =====================================================
   RE/MAX COMPASS 物件ポータル — 共通ロジック
   - ヘッダー / モバイルメニュー
   - 物件データの整形・検索・絞り込み
   - お気に入り・閲覧履歴（localStorage）
   - 物件画像プレースホルダ（SVG data URI）
   ===================================================== */
(function (global) {
  'use strict';

  var DATA = global.PORTAL_DATA || { properties: [], deals: [], types: [], features: [], areas: [] };

  /* ---------- 定数 ---------- */
  var TYPE_LABEL = {};
  DATA.types.forEach(function (t) { TYPE_LABEL[t.value] = t.label; });

  var DEAL_LABEL = {};
  (DATA.deals || []).forEach(function (d) { DEAL_LABEL[d.value] = d.label; });

  /* 取引種別ごとの表示の違いをここに集約する */
  var DEAL_CONFIG = {
    rent: { label: '賃貸', amountLabel: '月額賃料', amountSuffix: '／月', unitLabel: '坪単価' },
    sale: { label: '売買', amountLabel: '販売価格', amountSuffix: '', unitLabel: '坪単価' }
  };

  function dealOf(p) { return p.deal === 'sale' ? 'sale' : 'rent'; }
  function dealConfig(p) { return DEAL_CONFIG[dealOf(p)]; }
  function isSale(p) { return dealOf(p) === 'sale'; }

  /* ---------- 都県（一都三県） ---------- */
  var PREFECTURES = DATA.prefectures || [];
  var AREA_SECTIONS = DATA.areaSections || {};
  var AREA_PREF = DATA.areaPref || {};

  var PREF_LABEL = {};
  PREFECTURES.forEach(function (p) { PREF_LABEL[p.value] = p.label; });

  /* 物件の都県。データ側で補完済みだが、市区名からも引けるようにしておく */
  function prefOf(p) { return p.pref || AREA_PREF[p.ward] || ''; }
  function prefLabel(value) { return PREF_LABEL[value] || ''; }

  /* ---------- 沿線・駅 ----------
     物件データの access から自動的に一覧を作る（マスタ管理は不要）。 */
  function lineStationIndex(list) {
    var lines = {};
    (list || []).forEach(function (p) {
      (p.access || []).forEach(function (a) {
        (lines[a.line] = lines[a.line] || {})[a.station] = true;
      });
    });
    return Object.keys(lines).sort().map(function (line) {
      return { line: line, stations: Object.keys(lines[line]).sort() };
    });
  }

  function linesOf(p) {
    return (p.access || []).map(function (a) { return a.line; });
  }

  function stationsOf(p) {
    return (p.access || []).map(function (a) { return a.station; });
  }

  /* 市区の一覧を都県ごとにまとめる。keep(市区名, 都県) が false を返すものは除外し、
     残りが1つもない小見出し／都県は落とす。
     戻り値: [{ value, label, sections: [{label, areas}], areas }] */
  function areaGroups(keep) {
    return PREFECTURES.map(function (pref) {
      var sections = (AREA_SECTIONS[pref.value] || []).map(function (sec) {
        return {
          label: sec.label,
          areas: sec.areas.filter(function (a) { return keep ? keep(a, pref.value) : true; })
        };
      }).filter(function (sec) { return sec.areas.length > 0; });

      return {
        value: pref.value,
        label: pref.label,
        sections: sections,
        areas: sections.reduce(function (list, sec) { return list.concat(sec.areas); }, [])
      };
    }).filter(function (g) { return g.areas.length > 0; });
  }

  /* 表示用の募集状況。'new' は updatedAt から自動判定する派生ステータスで、
     データ側で持つのは available / negotiating / closed の3つ。 */
  var STATUS_LABEL = {
    'new': '新着',
    'available': '募集中',
    'negotiating': '商談中',
    'closed': '成約済'
  };

  /* 情報更新日から何日間を「新着」として扱うか */
  var NEW_DAYS = 14;

  function daysSince(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return Infinity;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - d) / 86400000);
  }

  function isClosed(p) { return p.status === 'closed'; }

  function isNew(p) {
    return !isClosed(p) && p.status !== 'negotiating' && daysSince(p.updatedAt) <= NEW_DAYS;
  }

  /* カードやバッジ、絞り込みで使う表示上の募集状況 */
  function displayStatus(p) {
    if (isClosed(p)) return 'closed';
    if (p.status === 'negotiating') return 'negotiating';
    return isNew(p) ? 'new' : 'available';
  }

  /* ---------- フォーマッタ ---------- */
  function formatRent(yen) {
    if (!yen) return '応相談';
    if (yen >= 10000) {
      var man = yen / 10000;
      var str = man % 1 === 0 ? String(man) : man.toFixed(1);
      return str + '万円';
    }
    return yen.toLocaleString('ja-JP') + '円';
  }

  /* 売買価格は億／万で区切る（1,450,000,000 → 14億5,000万円） */
  function formatPrice(yen) {
    if (!yen) return '応相談';
    var oku = Math.floor(yen / 100000000);
    var man = Math.floor((yen % 100000000) / 10000);
    if (oku && man) return oku + '億' + man.toLocaleString('ja-JP') + '万円';
    if (oku) return oku + '億円';
    if (man) return man.toLocaleString('ja-JP') + '万円';
    return yen.toLocaleString('ja-JP') + '円';
  }

  /* 取引種別に応じた金額表示 */
  function formatAmount(p) {
    return isSale(p) ? formatPrice(p.price) : formatRent(p.rent);
  }

  function formatYield(rate) {
    return rate ? rate.toFixed(1) + '%' : '—';
  }

  function formatYen(yen) {
    if (yen === 0) return '無料';
    if (yen == null) return '—';
    return yen.toLocaleString('ja-JP') + '円';
  }

  function formatMonths(n, unit) {
    if (n === 0) return 'なし';
    if (n == null) return '—';
    return n + 'ヶ月' + (unit ? '（' + unit + '）' : '');
  }

  function formatArea(p) {
    return p.areaTsubo.toFixed(1) + '坪（' + p.areaSqm.toFixed(1) + 'm²）';
  }

  /* 築年月。月が分からない物件は年だけ出す */
  function formatBuilt(p) {
    if (!p.builtYear) return '—';
    return p.builtYear + '年' + (p.builtMonth ? p.builtMonth + '月' : '');
  }

  function formatDate(iso) {
    var d = iso.split('-');
    return d[0] + '年' + Number(d[1]) + '月' + Number(d[2]) + '日';
  }

  function nearestAccess(p) {
    if (!p.access || !p.access.length) return '—';
    var a = p.access[0];
    return a.line + ' ' + a.station + '駅 徒歩' + a.walk + '分';
  }

  function minWalk(p) {
    if (!p.access || !p.access.length) return 99;
    return p.access.reduce(function (m, a) { return Math.min(m, a.walk); }, 99);
  }

  /* ---------- 物件画像プレースホルダ ----------
     実写真が未登録の物件向けに、物件種別と ID から
     決定的に生成する SVG プレースホルダを返す。 */
  var PALETTE = [
    { bg: '#000B35', fg: '#A3D4F2', accent: '#FF1200' },
    { bg: '#0C2249', fg: '#F7F5EE', accent: '#FF1200' },
    { bg: '#232323', fg: '#A3D4F2', accent: '#FF1200' },
    { bg: '#650000', fg: '#F7F5EE', accent: '#A3D4F2' }
  ];

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function shapesFor(type, seed, c) {
    var s = [];
    var i;
    var rect = function (x, y, w, h, fill, op) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
        '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
    };

    if (type === 'office') {
      /* 高さの異なるビル群 */
      for (i = 0; i < 4; i++) {
        var w = 62 + ((seed >> i) % 3) * 12;
        var h = 108 + ((seed >> (i + 2)) % 5) * 24;
        var x = 60 + i * 94;
        s.push(rect(x, 296 - h, w, h, c.fg, 0.92));
        for (var r = 0; r < Math.floor(h / 30); r++) {
          s.push(rect(x + 10, 296 - h + 16 + r * 30, w - 20, 8, c.bg, 0.42));
        }
      }
    } else if (type === 'building') {
      /* 一棟ビル：窓の並ぶタワー */
      s.push(rect(148, 92, 184, 204, c.fg, 0.94));
      s.push(rect(140, 84, 200, 12, c.accent, 0.9));
      for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 3; col++) {
          s.push(rect(168 + col * 54, 116 + row * 34, 34, 20, c.bg, 0.45));
        }
      }
      s.push(rect(226, 252, 28, 44, c.bg, 0.3));
    } else if (type === 'warehouse') {
      s.push('<polygon points="52,178 240,112 428,178" fill="' + c.accent + '" opacity="0.85"/>');
      s.push(rect(72, 178, 336, 118, c.fg, 0.92));
      s.push(rect(112, 210, 96, 86, c.bg, 0.4));
      s.push(rect(272, 210, 96, 86, c.bg, 0.4));
      for (i = 0; i < 4; i++) {
        s.push(rect(112, 222 + i * 20, 96, 4, c.fg, 0.5));
        s.push(rect(272, 222 + i * 20, 96, 4, c.fg, 0.5));
      }
    } else if (type === 'land') {
      s.push('<polygon points="64,296 176,190 416,190 304,296" fill="' + c.fg + '" opacity="0.55"/>');
      s.push('<polygon points="64,296 176,190 416,190 304,296" fill="none" stroke="' + c.fg +
        '" stroke-width="3" stroke-dasharray="12 8"/>');
      s.push(rect(232, 118, 6, 74, c.fg, 0.9));
      s.push('<polygon points="238,120 292,134 238,148" fill="' + c.accent + '"/>');
    } else {
      /* 店舗：路面のファサード */
      s.push(rect(96, 158, 288, 138, c.fg, 0.92));
      s.push('<polygon points="82,158 398,158 372,120 108,120" fill="' + c.accent + '" opacity="0.9"/>');
      s.push(rect(128, 196, 104, 100, c.bg, 0.5));
      s.push(rect(258, 196, 62, 100, c.bg, 0.32));
      s.push(rect(96, 150, 288, 8, c.bg, 0.25));
      s.push('<circle cx="312" cy="248" r="5" fill="' + c.fg + '" opacity="0.8"/>');
    }
    return s.join('');
  }

  function placeholderImage(p) {
    var seed = hashCode(p.id);
    var c = PALETTE[seed % PALETTE.length];
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img">' +
      '<rect width="480" height="320" fill="' + c.bg + '"/>' +
      shapesFor(p.type, seed, c) +
      '<rect x="0" y="300" width="480" height="20" fill="' + c.accent + '" opacity="0.85"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- サイト設定 ---------- */
  var SITE = DATA.site || {};

  function siteUrl(pathAndQuery) {
    var base = String(SITE.siteUrl || '').replace(/\/+$/, '');
    return base + '/' + String(pathAndQuery || '').replace(/^\/+/, '');
  }

  /* ---------- アクセス解析 ----------
     測定IDが空のあいだは何も読み込まず、track() も黙って何もしません。 */
  function initAnalytics() {
    var id = SITE.analyticsId;
    if (!id || window.__gaLoaded) return;
    window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ---------- お問い合わせの送信 ----------
     送信先は data/properties.js の SITE_CONFIG.form で設定します。
     endpoint が空、または送信に失敗したときはメールソフトを開く方式に切り替えます。 */
  function inquiryEmail() { return (SITE.form || {}).email || ''; }

  function sendInquiry(fields) {
    var endpoint = (SITE.form || {}).endpoint || '';
    if (!endpoint) return Promise.reject(new Error('endpoint-not-configured'));
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(fields)
    }).then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status);
      return res;
    });
  }

  /* 送信できなかったときに、同じ内容でメールを作れるようにする */
  function inquiryMailto(subject, fields) {
    var body = Object.keys(fields)
      .filter(function (k) { return k.charAt(0) !== '_' && fields[k]; })
      .map(function (k) { return k + '：' + fields[k]; })
      .join('\n');
    return 'mailto:' + inquiryEmail() +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  /* 同意チェックの検証。未チェックならメッセージを出して false を返す */
  function validateConsent(id) {
    var el = document.getElementById(id);
    if (!el) return true;
    var err = document.querySelector('[data-error-for="' + id + '"]');
    var ok = el.checked;
    if (err) err.textContent = ok ? '' : 'プライバシーポリシーへの同意が必要です';
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  /* お問い合わせの送信処理。2つのフォームで共通に使う。
     opts = { name, submit, status, subject, label, fields } */
  function runInquirySubmit(o) {
    var btn = o.submit;
    var status = o.status;
    var label = o.label || btn.textContent;
    var fields = o.fields();

    btn.disabled = true;
    btn.textContent = '送信中…';
    status.textContent = '送信しています…';
    status.className = 'form-status';

    return sendInquiry(fields).then(function () {
      btn.textContent = '送信しました';
      status.textContent = 'お問い合わせを受け付けました。担当より2営業日以内にご連絡します。';
      status.className = 'form-status is-success';
      track('inquiry_submit', { form: o.name, property_id: fields['物件番号'] || '' });
    }).catch(function () {
      /* 送信に失敗しても入力内容を捨てず、メールで送れるようにする */
      btn.disabled = false;
      btn.textContent = label;
      status.innerHTML = '送信できませんでした。お手数ですが' +
        '<a href="' + escapeHtml(inquiryMailto(o.subject, fields)) + '">メールでのご連絡</a>' +
        '（' + escapeHtml(inquiryEmail()) + '）' +
        'または<a href="tel:0362615098">お電話</a>にてご連絡ください。';
      status.className = 'form-status is-error';
      track('inquiry_error', { form: o.name });
    });
  }

  /* 個人情報の取り扱いへの同意欄。両方のフォームで同じものを使う */
  function consentHtml(id) {
    return '<div class="form-row form-row-full consent-row">' +
      '<label class="consent-label" for="' + id + '">' +
        '<input type="checkbox" id="' + id + '" name="consent" required>' +
        '<span><a href="privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>' +
        'に同意し、物件情報のご案内（メール・郵送等）を受け取ることに同意します' +
        '<span class="required">必須</span></span>' +
      '</label>' +
      '<p class="field-error" data-error-for="' + id + '"></p>' +
    '</div>';
  }

  /* ---------- canonical / OGP ----------
     ページごとのURLは公開URL（SITE_CONFIG.siteUrl）を基準に組み立てる。
     詳細ページは物件が決まったあとに setPageMeta() で上書きします。 */
  function currentPath() {
    var file = location.pathname.split('/').pop() || 'index.html';
    return file + (location.search || '');
  }

  function setMeta(selector, attr, value) {
    var el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function applyMeta() {
    if (!SITE.siteUrl) return;
    var url = siteUrl(currentPath());
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:url"]', 'content', url);
    var desc = document.head.querySelector('meta[name="description"]');
    if (desc) {
      setMeta('meta[property="og:description"]', 'content', desc.getAttribute('content') || '');
      setMeta('meta[name="twitter:description"]', 'content', desc.getAttribute('content') || '');
    }
    setMeta('meta[property="og:title"]', 'content', document.title);
    setMeta('meta[name="twitter:title"]', 'content', document.title);
    var img = document.head.querySelector('meta[property="og:image"]');
    if (img && !/^https?:/.test(img.getAttribute('content') || '')) {
      setMeta('meta[property="og:image"]', 'content', siteUrl(img.getAttribute('content')));
      setMeta('meta[name="twitter:image"]', 'content', siteUrl(img.getAttribute('content')));
    }
  }

  /* 詳細ページ用。タイトル・説明・OGP・canonical をまとめて差し替える */
  function setPageMeta(opts) {
    document.title = opts.title;
    setMeta('meta[name="description"]', 'content', opts.description);
    setMeta('meta[property="og:title"]', 'content', opts.title);
    setMeta('meta[name="twitter:title"]', 'content', opts.title);
    setMeta('meta[property="og:description"]', 'content', opts.description);
    setMeta('meta[name="twitter:description"]', 'content', opts.description);
    if (opts.path && SITE.siteUrl) {
      setMeta('link[rel="canonical"]', 'href', siteUrl(opts.path));
      setMeta('meta[property="og:url"]', 'content', siteUrl(opts.path));
    }
    if (opts.image) {
      var abs = /^(https?:|data:)/.test(opts.image) ? opts.image : siteUrl(opts.image);
      setMeta('meta[property="og:image"]', 'content', abs);
      setMeta('meta[name="twitter:image"]', 'content', abs);
    }
  }

  /* 構造化データ（JSON-LD）を差し込む */
  function setJsonLd(id, data) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  /* ---------- 物件写真 ---------- */
  /* 写真は images/properties/ に置かれたファイルを tools/csv-to-properties.js が
     取り込みます。1枚もない物件は種別ごとのイメージ画像で代替します。 */
  function hasPhotos(p) { return !!(p.images && p.images.length); }

  function galleryImages(p) {
    return hasPhotos(p)
      ? p.images
      : [{ src: placeholderImage(p), caption: '', placeholder: true }];
  }

  function mainImage(p) { return galleryImages(p)[0].src; }

  /* ---------- 地図 ---------- */
  var MAP = DATA.map || { enabled: false, apiKey: '', zoom: 17 };

  /* 「番地」「号」「4-9」「丁目4」まで入っていれば場所を特定できたとみなす。
     「〇〇三丁目」で終わる住所は特定できないので地図を出さない。 */
  var STREET_NUMBER_RE = /\d+\s*番|\d+\s*号|\d+\s*[-‐‑–—−ー－]\s*\d+|丁目\s*\d/;

  function hasStreetNumber(address) {
    return STREET_NUMBER_RE.test(String(address || ''));
  }

  function canShowMap(p) {
    return !!(MAP.enabled && p && hasStreetNumber(p.address));
  }

  function mapEmbedUrl(p) {
    var q = encodeURIComponent(p.address);
    var zoom = MAP.zoom || 17;
    return MAP.apiKey
      ? 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(MAP.apiKey) +
        '&q=' + q + '&zoom=' + zoom + '&language=ja&region=JP'
      : 'https://maps.google.com/maps?q=' + q + '&z=' + zoom + '&hl=ja&output=embed';
  }

  function mapLinkUrl(p) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.address);
  }

  /* ---------- 絞り込み ---------- */
  /* criteria: {keyword, prefs[], types[], areas[], rentMin, rentMax, tsuboMin, tsuboMax, walk, features[], status[]} */
  function filterProperties(list, c) {
    c = c || {};
    var wantsClosed = !!(c.status && c.status.indexOf('closed') !== -1);
    return list.filter(function (p) {
      /* 成約済は明示的に指定されたときだけ検索結果に含める */
      if (isClosed(p) && !wantsClosed) return false;
      if (c.deal && dealOf(p) !== c.deal) return false;
      if (c.priceMin != null && (!isSale(p) || p.price < c.priceMin)) return false;
      if (c.priceMax != null && (!isSale(p) || p.price > c.priceMax)) return false;
      if (c.types && c.types.length && c.types.indexOf(p.type) === -1) return false;
      if (c.prefs && c.prefs.length && c.prefs.indexOf(prefOf(p)) === -1) return false;
      if (c.lines && c.lines.length) {
        var pl = linesOf(p);
        if (!c.lines.some(function (l) { return pl.indexOf(l) !== -1; })) return false;
      }
      if (c.stations && c.stations.length) {
        var ps = stationsOf(p);
        if (!c.stations.some(function (st) { return ps.indexOf(st) !== -1; })) return false;
      }
      if (c.areas && c.areas.length && c.areas.indexOf(p.ward) === -1) return false;
      if (c.status && c.status.length && c.status.indexOf(displayStatus(p)) === -1) return false;
      if (c.rentMin != null && (isSale(p) || p.rent < c.rentMin)) return false;
      if (c.rentMax != null && (isSale(p) || p.rent > c.rentMax)) return false;
      if (c.tsuboMin != null && p.areaTsubo < c.tsuboMin) return false;
      if (c.tsuboMax != null && p.areaTsubo > c.tsuboMax) return false;
      if (c.walk != null && minWalk(p) > c.walk) return false;
      if (c.features && c.features.length) {
        var ok = c.features.every(function (f) { return p.features.indexOf(f) !== -1; });
        if (!ok) return false;
      }
      if (c.keyword) {
        var kw = c.keyword.trim().toLowerCase();
        if (kw) {
          var hay = [
            p.title, p.address, p.ward, prefLabel(prefOf(p)), p.id, p.description,
            TYPE_LABEL[p.type],
            p.features.join(' '),
            (p.usage || []).join(' '),
            (p.access || []).map(function (a) { return a.line + a.station; }).join(' ')
          ].join(' ').toLowerCase();
          if (hay.indexOf(kw) === -1) return false;
        }
      }
      return true;
    });
  }

  /* 金額の並び替えは取引種別ごとの amount（賃料 or 価格）で比較する */
  var SORTERS = {
    'new': function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); },
    'rent-asc': function (a, b) { return a.amount - b.amount; },
    'rent-desc': function (a, b) { return b.amount - a.amount; },
    'area-desc': function (a, b) { return b.areaTsubo - a.areaTsubo; },
    'area-asc': function (a, b) { return a.areaTsubo - b.areaTsubo; },
    'unit-asc': function (a, b) { return a.tsuboUnitPrice - b.tsuboUnitPrice; },
    'yield-desc': function (a, b) { return (b.yieldRate || 0) - (a.yieldRate || 0); }
  };

  function sortProperties(list, key) {
    var fn = SORTERS[key] || SORTERS['new'];
    return list.slice().sort(fn);
  }

  function findById(id) {
    for (var i = 0; i < DATA.properties.length; i++) {
      if (DATA.properties[i].id === id) return DATA.properties[i];
    }
    return null;
  }

  /* ---------- localStorage（お気に入り・閲覧履歴） ---------- */
  function readStore(key) {
    try {
      var raw = global.localStorage.getItem(key);
      var val = raw ? JSON.parse(raw) : [];
      return Array.isArray(val) ? val : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* プライベートモード等では無視 */ }
  }

  var FAV_KEY = 'compass.favorites';
  var HIST_KEY = 'compass.history';

  function getFavorites() { return readStore(FAV_KEY); }
  function isFavorite(id) { return getFavorites().indexOf(id) !== -1; }

  function toggleFavorite(id) {
    var favs = getFavorites();
    var i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    writeStore(FAV_KEY, favs);
    updateFavoriteBadge();
    return i === -1;
  }

  function pushHistory(id) {
    var h = readStore(HIST_KEY).filter(function (x) { return x !== id; });
    h.unshift(id);
    writeStore(HIST_KEY, h.slice(0, 8));
  }

  function getHistory() { return readStore(HIST_KEY); }

  function updateFavoriteBadge() {
    var n = getFavorites().length;
    document.querySelectorAll('[data-fav-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  /* ---------- 物件カード ---------- */
  function statusBadge(p) {
    var s = displayStatus(p);
    return '<span class="badge badge-' + s + '">' + (STATUS_LABEL[s] || '') + '</span>';
  }

  function dealBadge(p) {
    var d = dealOf(p);
    return '<span class="badge badge-deal badge-deal-' + d + '">' + DEAL_CONFIG[d].label + '</span>';
  }

  function propertyCard(p) {
    var fav = isFavorite(p.id);
    var sale = isSale(p);
    return '' +
      '<article class="p-card' + (isClosed(p) ? ' p-card-closed' : '') + '">' +
        '<a class="p-card-link" href="property.html?id=' + encodeURIComponent(p.id) + '">' +
          '<div class="p-card-media">' +
            '<img src="' + mainImage(p) + '" alt="' + escapeHtml(p.title) +
              (hasPhotos(p) ? '' : 'のイメージ') + '" width="480" height="320" loading="lazy">' +
            '<div class="p-card-badges">' + dealBadge(p) + statusBadge(p) +
              '<span class="badge badge-type">' + (TYPE_LABEL[p.type] || '') + '</span></div>' +
          '</div>' +
          '<div class="p-card-body">' +
            '<h3 class="p-card-title">' + escapeHtml(p.title) + '</h3>' +
            '<p class="p-card-access">' + escapeHtml(nearestAccess(p)) + '</p>' +
            '<p class="p-card-rent"><span class="rent-value">' + formatAmount(p) + '</span>' +
              (sale ? '' : '<span class="rent-unit">／月</span>') +
              '<span class="p-card-unit">坪単価 ' + p.tsuboUnitPrice.toLocaleString('ja-JP') + '円</span></p>' +
            '<dl class="p-card-spec">' +
              '<div><dt>面積</dt><dd>' + p.areaTsubo.toFixed(1) + '坪</dd></div>' +
              '<div><dt>階数</dt><dd>' + escapeHtml(p.floor) + '</dd></div>' +
              (sale
                ? '<div><dt>表面利回り</dt><dd>' + formatYield(p.yieldRate) + '</dd></div>'
                : '<div><dt>入居</dt><dd>' + escapeHtml(p.availableFrom) + '</dd></div>') +
            '</dl>' +
            '<ul class="p-card-tags">' + p.features.slice(0, 3).map(function (f) {
              return '<li>' + escapeHtml(f) + '</li>';
            }).join('') + '</ul>' +
          '</div>' +
        '</a>' +
        '<button type="button" class="fav-btn' + (fav ? ' is-active' : '') + '" data-fav-id="' + p.id + '" ' +
          'aria-pressed="' + fav + '" aria-label="お気に入りに追加">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path d="M12 21s-7.5-4.6-9.6-9A5.3 5.3 0 0 1 12 6.3 5.3 5.3 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z"/></svg>' +
        '</button>' +
      '</article>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* お気に入りボタンの委譲ハンドラ（1度だけ登録） */
  function bindFavoriteButtons(root) {
    (root || document).addEventListener('click', function (e) {
      var btn = e.target.closest('[data-fav-id]');
      if (!btn) return;
      e.preventDefault();
      var favId = btn.getAttribute('data-fav-id');
      var active = toggleFavorite(favId);
      track(active ? 'add_favorite' : 'remove_favorite', { property_id: favId });
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
      document.dispatchEvent(new CustomEvent('favorites:changed'));
    });
  }

  /* ---------- ヘッダー ---------- */
  function initHeader() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var header = document.getElementById('header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 12);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var year = document.getElementById('current-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- クエリ文字列 ----------
     単一ファイルのプレビュー版（window.PORTAL_SPA）ではハッシュ側の
     クエリを参照する。通常のマルチページ構成では location.search。 */
  function currentParams() {
    if (global.PORTAL_SPA) {
      var h = global.location.hash.replace(/^#/, '');
      var i = h.indexOf('?');
      return new URLSearchParams(i === -1 ? '' : h.slice(i + 1));
    }
    return new URLSearchParams(global.location.search);
  }

  function writeQuery(qs) {
    if (global.PORTAL_SPA) {
      var path = global.location.hash.replace(/^#/, '').split('?')[0] || '/';
      global.history.replaceState(null, '', '#' + path + (qs ? '?' + qs : ''));
    } else {
      global.history.replaceState(null, '', global.location.pathname + (qs ? '?' + qs : ''));
    }
  }

  /* ページ単位の初期化登録。プレビュー版ではルーター側から呼び出す。 */
  function onReady(name, fn) {
    if (global.PORTAL_SPA) {
      global.PORTAL_INIT = global.PORTAL_INIT || {};
      global.PORTAL_INIT[name] = fn;
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function parseQuery() {
    var params = currentParams();
    var multi = function (k) {
      var v = params.get(k);
      return v ? v.split(',').filter(Boolean) : [];
    };
    var num = function (k) {
      var v = params.get(k);
      return v === null || v === '' ? null : Number(v);
    };
    var deal = params.get('deal');
    return {
      deal: deal === 'sale' ? 'sale' : 'rent',   /* 既定は賃貸 */
      keyword: params.get('q') || '',
      priceMin: num('priceMin'),
      priceMax: num('priceMax'),
      types: multi('type'),
      prefs: multi('pref').filter(function (v) { return !!PREF_LABEL[v]; }),
      lines: multi('line'),
      stations: multi('station'),
      areas: multi('area'),
      features: multi('feature'),
      status: multi('status'),
      rentMin: num('rentMin'),
      rentMax: num('rentMax'),
      tsuboMin: num('tsuboMin'),
      tsuboMax: num('tsuboMax'),
      walk: num('walk'),
      sort: params.get('sort') || 'new',
      page: Number(params.get('page') || 1)
    };
  }

  function buildQuery(c) {
    var params = new URLSearchParams();
    if (c.deal === 'sale') params.set('deal', 'sale');
    if (c.keyword) params.set('q', c.keyword);
    ['types:type', 'prefs:pref', 'areas:area', 'lines:line', 'stations:station',
     'features:feature', 'status:status'].forEach(function (pair) {
      var parts = pair.split(':');
      var arr = c[parts[0]];
      if (arr && arr.length) params.set(parts[1], arr.join(','));
    });
    ['rentMin', 'rentMax', 'priceMin', 'priceMax', 'tsuboMin', 'tsuboMax', 'walk'].forEach(function (k) {
      if (c[k] != null && c[k] !== '') params.set(k, c[k]);
    });
    if (c.sort && c.sort !== 'new') params.set('sort', c.sort);
    if (c.page && c.page > 1) params.set('page', c.page);
    return params.toString();
  }

  global.Portal = {
    data: DATA,
    TYPE_LABEL: TYPE_LABEL,
    DEAL_LABEL: DEAL_LABEL,
    DEAL_CONFIG: DEAL_CONFIG,
    dealOf: dealOf,
    dealConfig: dealConfig,
    isSale: isSale,
    PREF_LABEL: PREF_LABEL,
    prefOf: prefOf,
    lineStationIndex: lineStationIndex,
    linesOf: linesOf,
    stationsOf: stationsOf,
    prefLabel: prefLabel,
    areaGroups: areaGroups,
    dealBadge: dealBadge,
    formatPrice: formatPrice,
    formatAmount: formatAmount,
    formatYield: formatYield,
    STATUS_LABEL: STATUS_LABEL,
    NEW_DAYS: NEW_DAYS,
    isNew: isNew,
    isClosed: isClosed,
    displayStatus: displayStatus,
    activeProperties: function () { return DATA.properties.filter(function (p) { return !isClosed(p); }); },
    formatRent: formatRent,
    formatYen: formatYen,
    formatMonths: formatMonths,
    formatArea: formatArea,
    formatBuilt: formatBuilt,
    formatDate: formatDate,
    nearestAccess: nearestAccess,
    minWalk: minWalk,
    site: SITE,
    siteUrl: siteUrl,
    setPageMeta: setPageMeta,
    setJsonLd: setJsonLd,
    track: track,
    sendInquiry: sendInquiry,
    inquiryMailto: inquiryMailto,
    inquiryEmail: inquiryEmail,
    consentHtml: consentHtml,
    validateConsent: validateConsent,
    runInquirySubmit: runInquirySubmit,
    placeholderImage: placeholderImage,
    hasPhotos: hasPhotos,
    galleryImages: galleryImages,
    mainImage: mainImage,
    hasStreetNumber: hasStreetNumber,
    canShowMap: canShowMap,
    mapEmbedUrl: mapEmbedUrl,
    mapLinkUrl: mapLinkUrl,
    filterProperties: filterProperties,
    sortProperties: sortProperties,
    findById: findById,
    propertyCard: propertyCard,
    statusBadge: statusBadge,
    escapeHtml: escapeHtml,
    bindFavoriteButtons: bindFavoriteButtons,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    pushHistory: pushHistory,
    getHistory: getHistory,
    updateFavoriteBadge: updateFavoriteBadge,
    initHeader: initHeader,
    parseQuery: parseQuery,
    buildQuery: buildQuery,
    currentParams: currentParams,
    writeQuery: writeQuery,
    onReady: onReady
  };

  /* サンプルデータの注意書きは SITE_CONFIG.demoNotice で出し分ける */
  function applyDemoNotice() {
    if (SITE.demoNotice !== false) return;
    document.querySelectorAll('.demo-notice, .footer-note').forEach(function (el) { el.remove(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAnalytics();
    applyMeta();
    applyDemoNotice();
    initHeader();
    bindFavoriteButtons(document);
    updateFavoriteBadge();
  });
})(window);
