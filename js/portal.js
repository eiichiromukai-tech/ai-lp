/* =====================================================
   RE/MAX COMPASS 物件ポータル — 共通ロジック
   - ヘッダー / モバイルメニュー
   - 物件データの整形・検索・絞り込み
   - お気に入り・閲覧履歴（localStorage）
   - 物件画像プレースホルダ（SVG data URI）
   ===================================================== */
(function (global) {
  'use strict';

  var DATA = global.PORTAL_DATA || { properties: [], types: [], features: [], areas: [] };

  /* ---------- 定数 ---------- */
  var TYPE_LABEL = {};
  DATA.types.forEach(function (t) { TYPE_LABEL[t.value] = t.label; });

  var STATUS_LABEL = {
    'new': '新着',
    'available': '募集中',
    'negotiating': '商談中'
  };

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

  /* ---------- 絞り込み ---------- */
  /* criteria: {keyword, types[], areas[], rentMin, rentMax, tsuboMin, tsuboMax, walk, features[], status[]} */
  function filterProperties(list, c) {
    c = c || {};
    return list.filter(function (p) {
      if (c.types && c.types.length && c.types.indexOf(p.type) === -1) return false;
      if (c.areas && c.areas.length && c.areas.indexOf(p.ward) === -1) return false;
      if (c.status && c.status.length && c.status.indexOf(p.status) === -1) return false;
      if (c.rentMin != null && p.rent < c.rentMin) return false;
      if (c.rentMax != null && p.rent > c.rentMax) return false;
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
            p.title, p.address, p.ward, p.id, p.description,
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

  var SORTERS = {
    'new': function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); },
    'rent-asc': function (a, b) { return a.rent - b.rent; },
    'rent-desc': function (a, b) { return b.rent - a.rent; },
    'area-desc': function (a, b) { return b.areaTsubo - a.areaTsubo; },
    'area-asc': function (a, b) { return a.areaTsubo - b.areaTsubo; },
    'unit-asc': function (a, b) { return a.tsuboUnitPrice - b.tsuboUnitPrice; }
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
    return '<span class="badge badge-' + p.status + '">' + (STATUS_LABEL[p.status] || '') + '</span>';
  }

  function propertyCard(p) {
    var fav = isFavorite(p.id);
    return '' +
      '<article class="p-card">' +
        '<a class="p-card-link" href="property.html?id=' + encodeURIComponent(p.id) + '">' +
          '<div class="p-card-media">' +
            '<img src="' + placeholderImage(p) + '" alt="' + escapeHtml(p.title) + 'のイメージ" width="480" height="320" loading="lazy">' +
            '<div class="p-card-badges">' + statusBadge(p) + '<span class="badge badge-type">' + (TYPE_LABEL[p.type] || '') + '</span></div>' +
          '</div>' +
          '<div class="p-card-body">' +
            '<h3 class="p-card-title">' + escapeHtml(p.title) + '</h3>' +
            '<p class="p-card-access">' + escapeHtml(nearestAccess(p)) + '</p>' +
            '<p class="p-card-rent"><span class="rent-value">' + formatRent(p.rent) + '</span><span class="rent-unit">／月</span>' +
              '<span class="p-card-unit">坪単価 ' + p.tsuboUnitPrice.toLocaleString('ja-JP') + '円</span></p>' +
            '<dl class="p-card-spec">' +
              '<div><dt>面積</dt><dd>' + p.areaTsubo.toFixed(1) + '坪</dd></div>' +
              '<div><dt>階数</dt><dd>' + escapeHtml(p.floor) + '</dd></div>' +
              '<div><dt>入居</dt><dd>' + escapeHtml(p.availableFrom) + '</dd></div>' +
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
      var active = toggleFavorite(btn.getAttribute('data-fav-id'));
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
    return {
      keyword: params.get('q') || '',
      types: multi('type'),
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
    if (c.keyword) params.set('q', c.keyword);
    ['types:type', 'areas:area', 'features:feature', 'status:status'].forEach(function (pair) {
      var parts = pair.split(':');
      var arr = c[parts[0]];
      if (arr && arr.length) params.set(parts[1], arr.join(','));
    });
    ['rentMin', 'rentMax', 'tsuboMin', 'tsuboMax', 'walk'].forEach(function (k) {
      if (c[k] != null && c[k] !== '') params.set(k, c[k]);
    });
    if (c.sort && c.sort !== 'new') params.set('sort', c.sort);
    if (c.page && c.page > 1) params.set('page', c.page);
    return params.toString();
  }

  global.Portal = {
    data: DATA,
    TYPE_LABEL: TYPE_LABEL,
    STATUS_LABEL: STATUS_LABEL,
    formatRent: formatRent,
    formatYen: formatYen,
    formatMonths: formatMonths,
    formatArea: formatArea,
    formatDate: formatDate,
    nearestAccess: nearestAccess,
    minWalk: minWalk,
    placeholderImage: placeholderImage,
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

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    bindFavoriteButtons(document);
    updateFavoriteBadge();
  });
})(window);
