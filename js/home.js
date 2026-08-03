/* ポータルトップ — 種別/エリアナビ、新着物件、閲覧履歴、件数プレビュー */
(function () {
  'use strict';

  var P = window.Portal;
  /* トップページの件数・一覧はすべて掲載中の物件のみを対象にする */
  var props = P.activeProperties();

  /* ヒーロー検索で選択中の取引種別。種別・エリアの件数もこれに追従する */
  var deal = 'rent';
  var bound = false;

  function dealProps() {
    return props.filter(function (p) { return P.dealOf(p) === deal; });
  }

  P.onReady('home', function () {
    deal = 'rent';
    renderAll();
    renderHistory();
    if (!bound) {
      bound = true;
      bindDealToggle();
      bindCountPreview();
      document.addEventListener('favorites:changed', renderHistory);
    }
    updateCount();
  });

  function renderAll() {
    renderTypeGrid();
    renderAreaSelect();
    renderAreaGrid();
    renderFeatured();
  }

  /* 賃貸／売買の切り替え */
  function bindDealToggle() {
    var group = document.getElementById('hs-deal');
    if (!group) return;
    group.addEventListener('change', function (e) {
      if (!e.target || e.target.name !== 'deal') return;
      deal = e.target.value === 'sale' ? 'sale' : 'rent';

      var rentField = document.getElementById('hs-rent-field');
      var priceField = document.getElementById('hs-price-field');
      if (rentField) rentField.hidden = deal === 'sale';
      if (priceField) priceField.hidden = deal !== 'sale';

      /* 切り替え時に金額条件を持ち越さない */
      var rentSel = document.getElementById('hs-rent');
      var priceSel = document.getElementById('hs-price');
      if (rentSel) rentSel.value = '';
      if (priceSel) priceSel.value = '';

      renderAll();
      updateCount();
    });
  }

  function dealParam() {
    return deal === 'sale' ? 'deal=sale&' : '';
  }

  /* 種別から探す */
  function renderTypeGrid() {
    var el = document.getElementById('type-grid');
    if (!el) return;
    var list = dealProps();
    el.innerHTML = P.data.types.map(function (t) {
      var n = list.filter(function (p) { return p.type === t.value; }).length;
      return '<li class="type-item">' +
        '<a href="properties.html?' + dealParam() + 'type=' + t.value + '">' +
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

  /* 掲載中の物件がある市区だけを都県ごとにまとめる */
  function groupsWithListings() {
    var list = dealProps();
    var count = function (a) {
      return list.filter(function (p) { return p.ward === a; }).length;
    };
    return P.areaGroups(function (a) { return count(a) > 0; }).map(function (g) {
      return {
        label: g.label,
        value: g.value,
        total: g.areas.reduce(function (n, a) { return n + count(a); }, 0),
        sections: g.sections.map(function (sec) {
          return {
            label: g.sections.length > 1 ? sec.label : '',
            areas: sec.areas.map(function (a) { return { name: a, count: count(a) }; })
          };
        })
      };
    });
  }

  /* ヒーロー検索のエリア選択肢。一都三県あるので都県ごとにグループ分けする */
  function renderAreaSelect() {
    var sel = document.getElementById('hs-area');
    if (!sel) return;
    sel.innerHTML = '<option value="">すべてのエリア</option>';
    groupsWithListings().forEach(function (g) {
      g.sections.forEach(function (sec) {
        var og = document.createElement('optgroup');
        og.label = sec.label ? g.label + '（' + sec.label + '）' : g.label;
        sec.areas.forEach(function (a) {
          var opt = document.createElement('option');
          opt.value = a.name;
          opt.textContent = a.name + '（' + a.count + '件）';
          og.appendChild(opt);
        });
        sel.appendChild(og);
      });
    });
  }

  /* エリアから探す */
  function renderAreaGrid() {
    var el = document.getElementById('area-groups');
    if (!el) return;
    el.innerHTML = groupsWithListings().map(function (g) {
      return '<div class="area-group">' +
        '<h3 class="area-group-title">' +
          '<a href="properties.html?' + dealParam() + 'pref=' + g.value + '">' +
            P.escapeHtml(g.label) + '<span class="area-group-count">' + g.total + '件</span>' +
          '</a>' +
        '</h3>' +
        g.sections.map(function (sec) {
          return (sec.label ? '<p class="area-sub-label">' + P.escapeHtml(sec.label) + '</p>' : '') +
            '<ul class="area-grid">' +
              sec.areas.map(function (a) {
                return '<li class="area-item">' +
                  '<a href="properties.html?' + dealParam() + 'area=' + encodeURIComponent(a.name) + '">' +
                    '<span class="area-name">' + P.escapeHtml(a.name) + '</span>' +
                    '<span class="area-count">' + a.count + '件</span>' +
                  '</a></li>';
              }).join('') +
            '</ul>';
        }).join('') +
      '</div>';
    }).join('');
  }

  /* 新着・注目 */
  function renderFeatured() {
    var el = document.getElementById('featured-grid');
    if (!el) return;
    var list = P.sortProperties(dealProps(), 'new').slice(0, 6);
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
  function updateCount() {
    var badge = document.getElementById('hs-count');
    if (!badge) return;
    badge.textContent = '（' + P.filterProperties(props, heroConditions()).length + '件）';
  }

  function bindCountPreview() {
    var form = document.getElementById('hero-search');
    if (!form) return;
    form.addEventListener('input', updateCount);
    form.addEventListener('change', updateCount);
    /* 素のGET送信だと未入力の項目まで空のクエリになるので、自前で組み立てる。
       1ファイルのプレビュー版ではルーター側が遷移を担当するため何もしない */
    form.addEventListener('submit', function (e) {
      if (window.PORTAL_SPA) return;
      e.preventDefault();
      var qs = P.buildQuery(heroConditions());
      location.href = 'properties.html' + (qs ? '?' + qs : '');
    });
  }

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function heroConditions() {
    return {
      deal: deal,
      types: value('hs-type') ? [value('hs-type')] : [],
      areas: value('hs-area') ? [value('hs-area')] : [],
      rentMax: deal === 'rent' && value('hs-rent') ? Number(value('hs-rent')) : null,
      priceMax: deal === 'sale' && value('hs-price') ? Number(value('hs-price')) : null,
      keyword: value('hs-q')
    };
  }
})();
