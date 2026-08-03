/* 物件検索ページ — 絞り込み・並び替え・ページング（URLと同期） */
(function () {
  'use strict';

  var P = window.Portal;
  var ALL = P.data.properties;
  var PER_PAGE = 9;

  var state = null;
  var bound = false;

  P.onReady('search', function () {
    state = P.parseQuery();
    buildCheckLists();
    syncFormFromState();
    if (!bound) {
      bound = true;
      bindEvents();
    }
    render();
  });

  /* ---------- フィルタUIの生成 ---------- */
  function buildCheckLists() {
    fill('f-types', P.data.types.map(function (t) {
      return { value: t.value, label: t.label, count: countBy('type', t.value) };
    }), 'types');

    fill('f-areas', P.data.areas.filter(function (a) {
      return countBy('ward', a) > 0;
    }).map(function (a) {
      return { value: a, label: a, count: countBy('ward', a) };
    }), 'areas');

    fill('f-status', Object.keys(P.STATUS_LABEL).map(function (s) {
      return { value: s, label: P.STATUS_LABEL[s], count: countBy('status', s) };
    }), 'status');

    fill('f-features', P.data.features.filter(function (f) {
      return countFeature(f) > 0;
    }).map(function (f) {
      return { value: f, label: f, count: countFeature(f) };
    }), 'features');
  }

  function countBy(key, value) {
    return ALL.filter(function (p) { return p[key] === value; }).length;
  }

  function countFeature(f) {
    return ALL.filter(function (p) { return p.features.indexOf(f) !== -1; }).length;
  }

  function fill(id, items, group) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(function (it, i) {
      var inputId = id + '-' + i;
      return '<label class="check-item" for="' + inputId + '">' +
        '<input type="checkbox" id="' + inputId + '" data-group="' + group + '" value="' + P.escapeHtml(it.value) + '">' +
        '<span class="check-text">' + P.escapeHtml(it.label) + '</span>' +
        '<span class="check-count">' + it.count + '</span>' +
      '</label>';
    }).join('');
  }

  /* ---------- state ⇄ フォーム ---------- */
  function syncFormFromState() {
    setValue('f-keyword', state.keyword);
    setValue('f-rent-min', state.rentMin);
    setValue('f-rent-max', state.rentMax);
    setValue('f-tsubo-min', state.tsuboMin);
    setValue('f-tsubo-max', state.tsuboMax);
    setValue('f-walk', state.walk);
    setValue('sort-select', state.sort);

    document.querySelectorAll('[data-group]').forEach(function (input) {
      var group = input.getAttribute('data-group');
      input.checked = (state[group] || []).indexOf(input.value) !== -1;
    });
  }

  function setValue(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v == null ? '' : String(v);
  }

  function readFormIntoState() {
    state.keyword = getValue('f-keyword');
    state.rentMin = num('f-rent-min');
    state.rentMax = num('f-rent-max');
    state.tsuboMin = num('f-tsubo-min');
    state.tsuboMax = num('f-tsubo-max');
    state.walk = num('f-walk');
    state.sort = getValue('sort-select') || 'new';

    ['types', 'areas', 'status', 'features'].forEach(function (g) {
      state[g] = Array.prototype.slice
        .call(document.querySelectorAll('[data-group="' + g + '"]:checked'))
        .map(function (i) { return i.value; });
    });
  }

  function getValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function num(id) {
    var v = getValue(id);
    return v === '' ? null : Number(v);
  }

  /* ---------- イベント ---------- */
  function bindEvents() {
    var form = document.getElementById('filter-form');
    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      form.addEventListener('change', function () { readFormIntoState(); state.page = 1; render(); });
      form.addEventListener('input', debounce(function () { readFormIntoState(); state.page = 1; render(); }, 250));
    }

    var sort = document.getElementById('sort-select');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; state.page = 1; render(); });

    document.getElementById('filter-reset').addEventListener('click', resetAll);
    document.getElementById('empty-reset').addEventListener('click', resetAll);

    /* モバイル: 絞り込みドロワー */
    var panel = document.getElementById('filter-panel');
    var backdrop = document.getElementById('filter-backdrop');
    var open = function () {
      panel.classList.add('is-open');
      backdrop.hidden = false;
      document.body.classList.add('no-scroll');
    };
    var close = function () {
      panel.classList.remove('is-open');
      backdrop.hidden = true;
      document.body.classList.remove('no-scroll');
    };
    document.getElementById('filter-open').addEventListener('click', open);
    document.getElementById('filter-close').addEventListener('click', close);
    document.getElementById('filter-apply').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    /* 条件チップの削除 */
    document.getElementById('active-chips').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-chip]');
      if (!btn) return;
      removeCondition(btn.getAttribute('data-chip-group'), btn.getAttribute('data-chip-value'));
    });

    /* ページャ */
    document.getElementById('pagination').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      state.page = Number(btn.getAttribute('data-page'));
      render();
      window.scrollTo({ top: document.querySelector('.results-head').offsetTop - 100, behavior: 'smooth' });
    });

    /* 戻る/進むでの状態復元。単一ファイルのプレビュー版では
       ハッシュ遷移でもpopstateが発火するため、ルーター側に任せる。 */
    if (!window.PORTAL_SPA) {
      window.addEventListener('popstate', function () {
        state = P.parseQuery();
        syncFormFromState();
        render();
      });
    }
  }

  function resetAll() {
    state = {
      keyword: '', types: [], areas: [], features: [], status: [],
      rentMin: null, rentMax: null, tsuboMin: null, tsuboMax: null, walk: null,
      sort: 'new', page: 1
    };
    syncFormFromState();
    render();
  }

  function removeCondition(group, value) {
    if (group === 'keyword') state.keyword = '';
    else if (group === 'sort') state.sort = 'new';
    else if (Array.isArray(state[group])) {
      state[group] = state[group].filter(function (v) { return v !== value; });
    } else {
      state[group] = null;
    }
    state.page = 1;
    syncFormFromState();
    render();
  }

  /* ---------- 描画 ---------- */
  function render() {
    var filtered = P.filterProperties(ALL, state);
    var sorted = P.sortProperties(filtered, state.sort);

    var pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * PER_PAGE;
    var pageItems = sorted.slice(start, start + PER_PAGE);

    var grid = document.getElementById('result-grid');
    grid.innerHTML = pageItems.map(P.propertyCard).join('');

    document.getElementById('empty-state').hidden = sorted.length !== 0;

    var summary = document.getElementById('result-summary');
    summary.textContent = sorted.length === 0
      ? '該当する物件はありません'
      : '全' + sorted.length + '件中 ' + (start + 1) + '〜' + (start + pageItems.length) + '件を表示';

    var applyCount = document.getElementById('filter-apply-count');
    if (applyCount) applyCount.textContent = '（' + sorted.length + '件）';

    renderChips();
    renderPagination(pages);
    updateUrl();
  }

  function renderChips() {
    var chips = [];
    var push = function (group, value, label) {
      chips.push('<li><button type="button" class="chip" data-chip data-chip-group="' + group + '" data-chip-value="' + P.escapeHtml(value == null ? '' : value) + '">' +
        P.escapeHtml(label) + '<span aria-hidden="true">×</span><span class="sr-only">条件を解除</span></button></li>');
    };

    if (state.keyword) push('keyword', state.keyword, '「' + state.keyword + '」');
    (state.types || []).forEach(function (t) { push('types', t, P.TYPE_LABEL[t] || t); });
    (state.areas || []).forEach(function (a) { push('areas', a, a); });
    (state.status || []).forEach(function (s) { push('status', s, P.STATUS_LABEL[s] || s); });
    (state.features || []).forEach(function (f) { push('features', f, f); });
    if (state.rentMin != null) push('rentMin', state.rentMin, P.formatRent(state.rentMin) + '以上');
    if (state.rentMax != null) push('rentMax', state.rentMax, P.formatRent(state.rentMax) + '以下');
    if (state.tsuboMin != null) push('tsuboMin', state.tsuboMin, state.tsuboMin + '坪以上');
    if (state.tsuboMax != null) push('tsuboMax', state.tsuboMax, state.tsuboMax + '坪以下');
    if (state.walk != null) push('walk', state.walk, '駅徒歩' + state.walk + '分以内');

    var el = document.getElementById('active-chips');
    el.innerHTML = chips.join('');
    el.hidden = chips.length === 0;
  }

  function renderPagination(pages) {
    var el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }

    var html = '';
    html += '<button type="button" class="page-btn page-nav" data-page="' + (state.page - 1) + '"' +
      (state.page === 1 ? ' disabled' : '') + '>前へ</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" class="page-btn' + (i === state.page ? ' is-current' : '') + '" data-page="' + i + '"' +
        (i === state.page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    html += '<button type="button" class="page-btn page-nav" data-page="' + (state.page + 1) + '"' +
      (state.page === pages ? ' disabled' : '') + '>次へ</button>';
    el.innerHTML = html;
  }

  function updateUrl() {
    P.writeQuery(P.buildQuery(state));
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }
})();
