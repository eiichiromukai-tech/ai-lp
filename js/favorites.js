/* お気に入りページ */
(function () {
  'use strict';

  var P = window.Portal;

  document.addEventListener('DOMContentLoaded', function () {
    render();
    document.addEventListener('favorites:changed', render);

    document.getElementById('fav-clear').addEventListener('click', function () {
      if (!window.confirm('お気に入りをすべて削除します。よろしいですか？')) return;
      P.getFavorites().slice().forEach(function (id) { P.toggleFavorite(id); });
      render();
    });
  });

  function render() {
    var list = P.getFavorites().map(P.findById).filter(Boolean);
    var grid = document.getElementById('fav-grid');
    var empty = document.getElementById('fav-empty');
    var actions = document.getElementById('fav-actions');
    var summary = document.getElementById('fav-summary');

    grid.innerHTML = list.map(P.propertyCard).join('');
    empty.hidden = list.length !== 0;
    actions.hidden = list.length === 0;
    summary.textContent = list.length
      ? list.length + '件の物件を登録しています。登録内容はこのブラウザにのみ保存されます。'
      : 'まだ物件が登録されていません。';
    P.updateFavoriteBadge();
  }
})();
