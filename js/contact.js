/* お問い合わせフォーム（フロントのみ・送信先未実装） */
(function () {
  'use strict';

  var P = window.Portal;

  var REQUIRED = [
    { id: 'c-name', message: 'お名前をご入力ください' },
    { id: 'c-email', message: 'メールアドレスをご入力ください' },
    { id: 'c-message', message: 'ご相談内容をご入力ください' }
  ];

  var bound = false;

  P.onReady('contact', function () {
    renderFavAttachment();
    prefillFromQuery();
    if (!bound) {
      bound = true;
      bindForm();
    }
  });

  /* お気に入り物件をお問い合わせに添付表示 */
  function renderFavAttachment() {
    var row = document.getElementById('fav-attach-row');
    var list = document.getElementById('fav-attach-list');
    var count = document.getElementById('fav-attach-count');
    if (!row) return;

    var favs = P.getFavorites().map(P.findById).filter(Boolean);
    row.hidden = favs.length === 0;
    count.textContent = favs.length;
    list.innerHTML = favs.map(function (p) {
      return '<li><a href="property.html?id=' + encodeURIComponent(p.id) + '">' +
        p.id + '　' + P.escapeHtml(p.title) + '</a></li>';
    }).join('');
  }

  /* contact.html?type=shop&area=渋谷区 のような遷移に対応 */
  function prefillFromQuery() {
    var params = P.currentParams();
    var map = { type: 'c-type', area: 'c-area', budget: 'c-budget' };
    Object.keys(map).forEach(function (key) {
      var v = params.get(key);
      var el = document.getElementById(map[key]);
      if (v && el) el.value = v;
    });
  }

  function bindForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = document.getElementById('contact-status');
    var submit = document.getElementById('contact-submit');

    var validate = function () {
      var ok = true;
      REQUIRED.forEach(function (f) {
        var el = document.getElementById(f.id);
        var err = document.querySelector('[data-error-for="' + f.id + '"]');
        var msg = '';
        if (!el.value.trim()) msg = f.message;
        else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
          msg = 'メールアドレスの形式をご確認ください';
        }
        if (msg) ok = false;
        if (err) err.textContent = msg;
        el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      });
      if (!P.validateConsent('c-consent')) ok = false;
      return ok;
    };

    form.addEventListener('input', function (e) {
      if (REQUIRED.some(function (f) { return f.id === e.target.id; })) validate();
    });
    form.addEventListener('change', function (e) {
      if (e.target.id === 'c-consent') P.validateConsent('c-consent');
    });

    var value = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        status.textContent = '未入力の項目があります。ご確認ください。';
        status.className = 'form-status is-error';
        var firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) firstError.focus();
        return;
      }

      P.runInquirySubmit({
        name: 'contact',
        submit: submit,
        status: status,
        label: 'この内容で送信する',
        subject: '【物件リクエスト】' + value('c-name') + '様',
        fields: function () {
          var favs = P.getFavorites().map(P.findById).filter(Boolean);
          return {
            _subject: '【RE/MAX COMPASS 物件ポータル】物件リクエスト（' + value('c-name') + '様）',
            _template: 'table',
            _captcha: 'false',
            '送信元': 'お問い合わせページ',
            'お名前': value('c-name'),
            '会社名・屋号': value('c-company'),
            'メールアドレス': value('c-email'),
            'ご住所': value('c-address'),
            '電話番号': value('c-tel'),
            'ご希望の物件種別': value('c-type'),
            'ご希望エリア': value('c-area'),
            'ご予算（月額賃料）': value('c-budget'),
            'ご希望面積': value('c-tsubo'),
            'ご相談内容': value('c-message'),
            'お気に入り物件': favs.map(function (p) { return p.id + ' ' + p.title; }).join(' / '),
            '同意': 'プライバシーポリシーに同意済み'
          };
        }
      });
    });
  }
})();
