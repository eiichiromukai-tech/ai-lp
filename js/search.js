/* 物件検索ページ — 絞り込み・並び替え・ページング（URLと同期） */
(function () {
  'use strict';

  var P = window.Portal;
  var ALL = P.data.properties;
  var PER_PAGE = 9;

  var state = null;
  /* 沿線の選択は絞り込み条件ではなく、駅一覧を切り替えるためのUI状態 */
  var currentLine = '';
  var bound = false;

  /* 並び替えの選択肢は取引種別で入れ替える */
  var SORT_OPTIONS = {
    rent: [
      ['new', '新着順'],
      ['rent-asc', '賃料が安い順'],
      ['rent-desc', '賃料が高い順'],
      ['area-desc', '面積が広い順'],
      ['area-asc', '面積が狭い順'],
      ['unit-asc', '坪単価が安い順']
    ],
    sale: [
      ['new', '新着順'],
      ['rent-asc', '価格が安い順'],
      ['rent-desc', '価格が高い順'],
      ['yield-desc', '利回りが高い順'],
      ['area-desc', '面積が広い順'],
      ['area-asc', '面積が狭い順'],
      ['unit-asc', '坪単価が安い順']
    ]
  };

  function renderSortOptions() {
    var sel = document.getElementById('sort-select');
    if (!sel) return;
    var options = SORT_OPTIONS[state.deal] || SORT_OPTIONS.rent;
    var keep = options.some(function (o) { return o[0] === state.sort; }) ? state.sort : 'new';
    state.sort = keep;
    sel.innerHTML = options.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === keep ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
  }

  /* 取引種別に応じて金額レンジの表示を切り替える */
  function syncDealUI() {
    var sale = state.deal === 'sale';
    var rentGroup = document.getElementById('f-rent-group');
    var priceGroup = document.getElementById('f-price-group');
    if (rentGroup) rentGroup.hidden = sale;
    if (priceGroup) priceGroup.hidden = !sale;

    document.querySelectorAll('#f-deal input[name="deal"]').forEach(function (input) {
      input.checked = input.value === state.deal;
    });

    var title = document.getElementById('results-title');
    if (title) title.textContent = sale ? '売買物件を探す' : '賃貸物件を探す';
    renderSortOptions();
  }

  P.onReady('search', function () {
    state = P.parseQuery();
    buildCheckLists();
    syncFormFromState();
    syncDealUI();
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

    fill('f-prefs', (P.data.prefectures || []).filter(function (pref) {
      return countPref(pref.value) > 0;
    }).map(function (pref) {
      return { value: pref.value, label: pref.label, count: countPref(pref.value) };
    }), 'prefs');

    /* エリアは都県ごとに見出しを付けて並べる。掲載のない市区は出さない。
       都県が選ばれているときは、その都県の市区だけに絞る。 */
    var prefs = (state && state.prefs) || [];
    fillGrouped('f-areas', P.areaGroups(function (a, pref) {
      if (prefs.length && prefs.indexOf(pref) === -1) return false;
      return countBy('ward', a) > 0;
    }).map(function (g) {
      return {
        label: g.label,
        /* 東京都のように小見出しを持つ都県は、さらに 23区／多摩・市部 で分ける */
        sections: g.sections.map(function (sec) {
          return {
            label: g.sections.length > 1 ? sec.label : '',
            items: sec.areas.map(function (a) {
              return { value: a, label: a, count: countBy('ward', a) };
            })
          };
        })
      };
    }), 'areas');

    buildLinePicker();

    fill('f-status', Object.keys(P.STATUS_LABEL).map(function (s) {
      return { value: s, label: P.STATUS_LABEL[s], count: countStatus(s) };
    }), 'status');

    fill('f-features', P.data.features.filter(function (f) {
      return countFeature(f) > 0;
    }).map(function (f) {
      return { value: f, label: f, count: countFeature(f) };
    }), 'features');
  }

  /* 件数は選択中の取引種別かつ掲載中の物件で数える（成約済の件数のみ実数） */
  function inDeal(list) {
    var deal = (state && state.deal) || 'rent';
    return list.filter(function (p) { return P.dealOf(p) === deal; });
  }

  function countBy(key, value) {
    return inDeal(P.activeProperties()).filter(function (p) { return p[key] === value; }).length;
  }

  /* 沿線を選ぶとその沿線の駅だけを出す。駅の件数は取引種別に追従する */
  function buildLinePicker() {
    var sel = document.getElementById('f-line');
    if (!sel) return;
    var index = P.lineStationIndex(inDeal(P.activeProperties()));

    /* 選択中の駅が属する沿線を初期表示にする */
    if (!currentLine && (state.stations || []).length) {
      var hit = index.filter(function (g) {
        return g.stations.some(function (st) { return state.stations.indexOf(st) !== -1; });
      })[0];
      if (hit) currentLine = hit.line;
    }
    if (currentLine && !index.some(function (g) { return g.line === currentLine; })) currentLine = '';

    sel.innerHTML = '<option value="">沿線を選ぶ</option>' + index.map(function (g) {
      var n = countLine(g.line);
      return '<option value="' + P.escapeHtml(g.line) + '"' +
        (g.line === currentLine ? ' selected' : '') + '>' +
        P.escapeHtml(g.line) + '（' + n + '件）</option>';
    }).join('');

    renderStations(index);
  }

  function renderStations(index) {
    var hint = document.getElementById('f-station-hint');
    var group = (index || P.lineStationIndex(inDeal(P.activeProperties())))
      .filter(function (g) { return g.line === currentLine; })[0];

    if (!group) {
      fill('f-stations', [], 'stations');
      if (hint) hint.hidden = false;
      return;
    }
    if (hint) hint.hidden = true;
    fill('f-stations', group.stations.map(function (st) {
      return { value: st, label: st + '駅', count: countStation(st) };
    }), 'stations');
  }

  function countLine(line) {
    return inDeal(P.activeProperties()).filter(function (p) {
      return P.linesOf(p).indexOf(line) !== -1;
    }).length;
  }

  function countStation(st) {
    return inDeal(P.activeProperties()).filter(function (p) {
      return P.stationsOf(p).indexOf(st) !== -1;
    }).length;
  }

  function dropAreasOutsidePrefs() {
    var prefs = state.prefs || [];
    if (!prefs.length) return;
    state.areas = (state.areas || []).filter(function (a) {
      return prefs.indexOf(P.data.areaPref[a]) !== -1;
    });
  }

  function countPref(value) {
    return inDeal(P.activeProperties()).filter(function (p) { return P.prefOf(p) === value; }).length;
  }

  function countFeature(f) {
    return inDeal(P.activeProperties()).filter(function (p) { return p.features.indexOf(f) !== -1; }).length;
  }

  function countStatus(s) {
    return inDeal(ALL).filter(function (p) { return P.displayStatus(p) === s; }).length;
  }

  function fill(id, items, group) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(function (it, i) {
      return checkItem(id + '-' + i, group, it);
    }).join('');
  }

  /* 見出し付きのチェックリスト（都県ごと、必要なら都県内の小見出しごと） */
  function fillGrouped(id, groups, group) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = groups.map(function (g, gi) {
      return '<div class="check-group">' +
        '<p class="check-group-label">' + P.escapeHtml(g.label) + '</p>' +
        g.sections.map(function (sec, si) {
          return (sec.label ? '<p class="check-sub-label">' + P.escapeHtml(sec.label) + '</p>' : '') +
            '<div class="check-list check-list-2col">' +
              sec.items.map(function (it, i) {
                return checkItem(id + '-' + gi + '-' + si + '-' + i, group, it);
              }).join('') +
            '</div>';
        }).join('') +
      '</div>';
    }).join('');
  }

  function checkItem(inputId, group, it) {
    return '<label class="check-item" for="' + inputId + '">' +
      '<input type="checkbox" id="' + inputId + '" data-group="' + group + '" value="' + P.escapeHtml(it.value) + '">' +
      '<span class="check-text">' + P.escapeHtml(it.label) + '</span>' +
      '<span class="check-count">' + it.count + '</span>' +
    '</label>';
  }

  /* ---------- state ⇄ フォーム ---------- */
  function syncFormFromState() {
    setValue('f-keyword', state.keyword);
    setValue('f-rent-min', state.rentMin);
    setValue('f-rent-max', state.rentMax);
    setValue('f-price-min', state.priceMin);
    setValue('f-price-max', state.priceMax);
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
    var deal = document.querySelector('#f-deal input[name="deal"]:checked');
    state.deal = deal && deal.value === 'sale' ? 'sale' : 'rent';
    state.keyword = getValue('f-keyword');
    state.rentMin = num('f-rent-min');
    state.rentMax = num('f-rent-max');
    state.priceMin = num('f-price-min');
    state.priceMax = num('f-price-max');
    state.tsuboMin = num('f-tsubo-min');
    state.tsuboMax = num('f-tsubo-max');
    state.walk = num('f-walk');
    state.sort = getValue('sort-select') || 'new';

    ['types', 'prefs', 'areas', 'stations', 'status', 'features'].forEach(function (g) {
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
      form.addEventListener('change', function (e) {
        var dealChanged = e.target && e.target.name === 'deal';
        var prefChanged = e.target && e.target.getAttribute('data-group') === 'prefs';
        readFormIntoState();
        state.page = 1;
        if (dealChanged) {
          /* 取引種別を切り替えたら金額条件と沿線・駅は持ち越さない */
          state.rentMin = state.rentMax = state.priceMin = state.priceMax = null;
          state.stations = [];
          currentLine = '';
          buildCheckLists();
          syncFormFromState();
          syncDealUI();
        }
        if (prefChanged) {
          /* 都県を絞ったら、その外側で選ばれていた市区は外す */
          dropAreasOutsidePrefs();
          buildCheckLists();
          syncFormFromState();
        }
        render();
      });
      form.addEventListener('input', debounce(function () { readFormIntoState(); state.page = 1; render(); }, 250));
    }

    var lineSel = document.getElementById('f-line');
    if (lineSel) {
      lineSel.addEventListener('change', function () {
        currentLine = lineSel.value;
        /* 沿線を変えたら、その沿線にない駅の選択は外す */
        var group = P.lineStationIndex(inDeal(P.activeProperties()))
          .filter(function (g) { return g.line === currentLine; })[0];
        state.stations = (state.stations || []).filter(function (st) {
          return group && group.stations.indexOf(st) !== -1;
        });
        state.page = 1;
        renderStations();
        syncFormFromState();
        render();
      });
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
      deal: state.deal,               /* 取引種別は保持する */
      keyword: '', types: [], prefs: [], areas: [], lines: [], stations: [],
      features: [], status: [],
      rentMin: null, rentMax: null, priceMin: null, priceMax: null,
      tsuboMin: null, tsuboMax: null, walk: null,
      sort: 'new', page: 1
    };
    currentLine = '';
    syncFormFromState();
    syncDealUI();
    buildCheckLists();
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
    if (group === 'prefs') buildCheckLists();   /* エリアの一覧が広がる */
    if (group === 'stations') renderStations();
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
    trackSearch(sorted.length);
  }

  /* どんな条件で何件見つかったかを記録する（入力のたびに送らないよう間引く） */
  var trackSearch = debounce(function (count) {
    P.track('search', {
      deal: state.deal,
      results: count,
      keyword: state.keyword || '',
      types: (state.types || []).join(','),
      prefs: (state.prefs || []).join(','),
      areas: (state.areas || []).join(','),
      stations: (state.stations || []).join(',')
    });
  }, 1200);

  function renderChips() {
    var chips = [];
    var push = function (group, value, label) {
      chips.push('<li><button type="button" class="chip" data-chip data-chip-group="' + group + '" data-chip-value="' + P.escapeHtml(value == null ? '' : value) + '">' +
        P.escapeHtml(label) + '<span aria-hidden="true">×</span><span class="sr-only">条件を解除</span></button></li>');
    };

    if (state.keyword) push('keyword', state.keyword, '「' + state.keyword + '」');
    (state.types || []).forEach(function (t) { push('types', t, P.TYPE_LABEL[t] || t); });
    (state.prefs || []).forEach(function (v) { push('prefs', v, P.prefLabel(v)); });
    (state.stations || []).forEach(function (st) { push('stations', st, st + '駅'); });
    (state.areas || []).forEach(function (a) { push('areas', a, a); });
    (state.status || []).forEach(function (s) { push('status', s, P.STATUS_LABEL[s] || s); });
    (state.features || []).forEach(function (f) { push('features', f, f); });
    if (state.rentMin != null) push('rentMin', state.rentMin, P.formatRent(state.rentMin) + '以上');
    if (state.rentMax != null) push('rentMax', state.rentMax, P.formatRent(state.rentMax) + '以下');
    if (state.priceMin != null) push('priceMin', state.priceMin, P.formatPrice(state.priceMin) + '以上');
    if (state.priceMax != null) push('priceMax', state.priceMax, P.formatPrice(state.priceMax) + '以下');
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
