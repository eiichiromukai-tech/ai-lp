/* ポータルトップ — 種別/エリアナビ、新着物件、閲覧履歴、件数プレビュー */
(function () {
  'use strict';

  var P = window.Portal;
  var props = P.data.properties;

  var bound = false;

  P.onReady('home', function () {
    renderTypeGrid();
    renderAreaSelect();
    renderAreaGrid();
    renderFeatured();
    renderHistory();
    bindCountPreview();
    if (!bound) {
      bound = true;
      document.addEventListener('favorites:changed', renderHistory);
    }
  });

  /* 種別から探す */
  function renderTypeGrid() {
    var el = document.getElementById('type-grid');
    if (!el) return;
    el.innerHTML = P.data.types.map(function (t) {
      var n = props.filter(function (p) { return p.type === t.value; }).length;
      return '<li class="type-item">' +
        '<a href="properties.html?type=' + t.value + '">' +
          '<span class="type-icon" aria-hidden="true">' + typeIcon(t.value) + '</span>' +
          '<span class="type-label">' + t.label + '</span>' +
          '<span class="type-count">' + n + '件</span>' +
        '</a></li>';
    }).join('');
  }

  function typeIcon(type) {
    var paths = {
      shop: '<path d="M4 9h24l-2-5H6L4 9zm0 2v15h24V11h-2v13H6V11H4zm7 3h6v8h-6v-8z"/>',
      office: '<path d="M6 3h20v26H6V3zm3 4v3h4V7H9zm6 0v3h4V7h-4zm-6 6v3h4v-3H9zm6 0v3h4v-3h-4zm-6 6v3h4v-3H9zm6 0v3h4v-3h-4z"/>',
      warehouse: '<path d="M2 13L16 6l14 7v3H2v-3zm3 6h22v10H5V19zm4 2v8h5v-8H9zm9 0v8h5v-8h-5z"/>',
      building: '<path d="M4 29V6l10-4v27H4zm12 0V11l12 4v14H16zM7 9h4v3H7V9zm0 6h4v3H7v-3zm0 6h4v3H7v-3zm12-2h4v3h-4v-3zm0 6h4v3h-4v-3z"/>',
      land: '<path d="M2 25l8-14h12l8 14H2zm10-11l-5 9h18l-5-9H12zM15 3h2v6h-2V3z"/>'
    };
    return '<svg viewBox="0 0 32 32" width="32" height="32">' + (paths[type] || paths.shop) + '</svg>';
  }

  /* ヒーロー検索のエリア選択肢 */
  function renderAreaSelect() {
    var sel = document.getElementById('hs-area');
    if (!sel) return;
    sel.innerHTML = '<option value="">すべてのエリア</option>';
    P.data.areas.forEach(function (a) {
      var n = props.filter(function (p) { return p.ward === a; }).length;
      if (!n) return;
      var opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a + '（' + n + '件）';
      sel.appendChild(opt);
    });
  }

  /* エリアから探す */
  function renderAreaGrid() {
    var el = document.getElementById('area-grid');
    if (!el) return;
    el.innerHTML = P.data.areas.map(function (a) {
      var n = props.filter(function (p) { return p.ward === a; }).length;
      var cls = n ? '' : ' is-empty';
      var inner = '<span class="area-name">' + a + '</span><span class="area-count">' + n + '件</span>';
      return '<li class="area-item' + cls + '">' +
        (n ? '<a href="properties.html?area=' + encodeURIComponent(a) + '">' + inner + '</a>'
           : '<span>' + inner + '</span>') +
        '</li>';
    }).join('');
  }

  /* 新着・注目 */
  function renderFeatured() {
    var el = document.getElementById('featured-grid');
    if (!el) return;
    var list = P.sortProperties(props, 'new').slice(0, 6);
    el.innerHTML = list.map(P.propertyCard).join('');
  }

  /* 最近見た物件 */
  function renderHistory() {
    var block = document.getElementById('history-block');
    var el = document.getElementById('history-grid');
    if (!block || !el) return;
    var list = P.getHistory().map(P.findById).filter(Boolean).slice(0, 3);
    block.hidden = list.length === 0;
    el.innerHTML = list.map(P.propertyCard).join('');
  }

  /* 検索ボタンに該当件数をリアルタイム表示 */
  function bindCountPreview() {
    var form = document.getElementById('hero-search');
    var badge = document.getElementById('hs-count');
    if (!form || !badge) return;

    var update = function () {
      var c = {
        types: value('hs-type') ? [value('hs-type')] : [],
        areas: value('hs-area') ? [value('hs-area')] : [],
        rentMax: value('hs-rent') ? Number(value('hs-rent')) : null,
        keyword: value('hs-q')
      };
      badge.textContent = '（' + P.filterProperties(props, c).length + '件）';
    };
    var value = function (id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    };

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }
})();
