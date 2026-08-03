/* 物件詳細ページ — ?id=CMP-1001 で物件を描画 */
(function () {
  'use strict';

  var P = window.Portal;

  document.addEventListener('DOMContentLoaded', function () {
    var id = new URLSearchParams(window.location.search).get('id');
    var p = id ? P.findById(id) : null;
    var root = document.getElementById('detail-root');

    if (!p) {
      root.innerHTML = notFound();
      document.title = '物件が見つかりません｜RE/MAX COMPASS 物件ポータル';
      return;
    }

    document.title = p.title + '｜RE/MAX COMPASS 物件ポータル';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', p.title + '（' + p.ward + '）｜' + P.formatRent(p.rent) + '／月・' + p.areaTsubo.toFixed(1) + '坪。' + p.description.slice(0, 70));

    root.innerHTML = detailHtml(p);
    P.pushHistory(p.id);
    bindForm(p);
    bindGallery();
  });

  function notFound() {
    return '<div class="container empty-state empty-state-page">' +
      '<h1>物件が見つかりませんでした</h1>' +
      '<p>URLが正しくないか、掲載が終了した可能性があります。物件検索から他の物件をご覧ください。</p>' +
      '<div class="empty-actions"><a href="properties.html" class="btn btn-primary">物件検索へ</a>' +
      '<a href="contact.html" class="link-cta">条件を伝えて探してもらう</a></div></div>';
  }

  function detailHtml(p) {
    var img = P.placeholderImage(p);
    var similar = P.data.properties.filter(function (o) {
      return o.id !== p.id && (o.type === p.type || o.ward === p.ward);
    }).slice(0, 3);

    return '' +
    '<div class="container">' +
      '<nav class="breadcrumb" aria-label="パンくずリスト"><ol>' +
        '<li><a href="index.html">ホーム</a></li>' +
        '<li><a href="properties.html">物件検索</a></li>' +
        '<li><a href="properties.html?type=' + p.type + '">' + P.TYPE_LABEL[p.type] + '</a></li>' +
        '<li aria-current="page">' + P.escapeHtml(p.title) + '</li>' +
      '</ol></nav>' +

      '<div class="detail-head">' +
        '<div class="detail-badges">' + P.statusBadge(p) +
          '<span class="badge badge-type">' + P.TYPE_LABEL[p.type] + '</span>' +
          '<span class="detail-id">物件番号 ' + p.id + '</span></div>' +
        '<h1 class="detail-title">' + P.escapeHtml(p.title) + '</h1>' +
        '<p class="detail-address">' + P.escapeHtml(p.address) + '／' + P.escapeHtml(P.nearestAccess(p)) + '</p>' +
      '</div>' +

      '<div class="detail-layout">' +
        '<div class="detail-main">' +
          '<figure class="detail-gallery">' +
            '<img id="gallery-main" src="' + img + '" alt="' + P.escapeHtml(p.title) + 'のイメージ" width="480" height="320">' +
            '<figcaption>※ 画像は物件種別に基づくイメージです。現地写真・図面は個別にご案内します。</figcaption>' +
          '</figure>' +

          '<section class="detail-section">' +
            '<h2>この物件について</h2>' +
            '<p class="detail-desc">' + P.escapeHtml(p.description) + '</p>' +
            '<ul class="feature-tags">' + p.features.map(function (f) {
              return '<li>' + P.escapeHtml(f) + '</li>';
            }).join('') + '</ul>' +
          '</section>' +

          '<section class="detail-section">' +
            '<h2>物件概要</h2>' +
            '<table class="spec-table"><tbody>' +
              row('物件番号', p.id) +
              row('物件種別', P.TYPE_LABEL[p.type]) +
              row('所在地', p.address) +
              row('交通', (p.access || []).map(function (a) {
                return a.line + '「' + a.station + '」駅 徒歩' + a.walk + '分';
              }).join('<br>') || '—', true) +
              row('月額賃料', P.formatRent(p.rent) + (p.rent ? '（税別）' : '')) +
              row('共益費・管理費', p.managementFee ? P.formatYen(p.managementFee) + '／月' : 'なし') +
              row('坪単価', p.tsuboUnitPrice ? p.tsuboUnitPrice.toLocaleString('ja-JP') + '円／坪' : '—') +
              row('敷金・保証金', P.formatMonths(p.deposit)) +
              row('礼金', P.formatMonths(p.keyMoney)) +
              row('面積', P.formatArea(p)) +
              row('階数', p.floor + (p.floorsTotal ? '（地上' + p.floorsTotal + '階建）' : '')) +
              row('構造', p.structure) +
              row('築年', p.builtYear ? p.builtYear + '年' : '—') +
              row('用途', (p.usage || []).join('／') || '—') +
              row('入居可能時期', p.availableFrom) +
              row('取引態様', '仲介') +
              row('情報更新日', P.formatDate(p.updatedAt)) +
            '</tbody></table>' +
          '</section>' +

          '<section class="detail-section">' +
            '<h2>ご契約までの流れ</h2>' +
            '<ol class="flow-list">' +
              '<li><span class="flow-step">STEP 1</span><h3>お問い合わせ</h3><p>本ページのフォームまたはお電話でご連絡ください。ご相談は無料です。</p></li>' +
              '<li><span class="flow-step">STEP 2</span><h3>詳細資料のご案内</h3><p>図面・現地写真・詳細条件をお送りし、ご希望に応じて内見を調整します。</p></li>' +
              '<li><span class="flow-step">STEP 3</span><h3>条件交渉・申込</h3><p>賃料・フリーレント・契約期間などの条件をオーナー様と交渉します。</p></li>' +
              '<li><span class="flow-step">STEP 4</span><h3>重要事項説明・契約</h3><p>宅地建物取引士が重要事項をご説明のうえ、ご契約手続きを行います。</p></li>' +
            '</ol>' +
          '</section>' +
        '</div>' +

        '<aside class="detail-side">' +
          '<div class="side-card">' +
            '<p class="side-rent"><span class="rent-value">' + P.formatRent(p.rent) + '</span><span class="rent-unit">／月（税別）</span></p>' +
            '<dl class="side-spec">' +
              '<div><dt>共益費</dt><dd>' + (p.managementFee ? P.formatYen(p.managementFee) + '／月' : 'なし') + '</dd></div>' +
              '<div><dt>面積</dt><dd>' + p.areaTsubo.toFixed(1) + '坪</dd></div>' +
              '<div><dt>階数</dt><dd>' + P.escapeHtml(p.floor) + '</dd></div>' +
              '<div><dt>入居時期</dt><dd>' + P.escapeHtml(p.availableFrom) + '</dd></div>' +
            '</dl>' +
            '<a href="#detail-inquiry" class="btn btn-primary btn-block">この物件を問い合わせる</a>' +
            '<button type="button" class="btn btn-ghost btn-block fav-btn-wide' + (P.isFavorite(p.id) ? ' is-active' : '') + '" ' +
              'data-fav-id="' + p.id + '" aria-pressed="' + P.isFavorite(p.id) + '">お気に入りに追加</button>' +
            '<a href="tel:0362615098" class="side-tel"><span>お電話でのご相談</span><strong>03-6261-5098</strong><small>平日 9:30〜18:30</small></a>' +
          '</div>' +
        '</aside>' +
      '</div>' +

      '<section class="detail-section detail-inquiry" id="detail-inquiry">' +
        '<h2>この物件についてお問い合わせ</h2>' +
        '<p class="section-lead">物件番号 ' + p.id + '（' + P.escapeHtml(p.title) + '）についてのお問い合わせです。図面・詳細条件をお送りします。</p>' +
        inquiryForm(p) +
      '</section>' +

      (similar.length ? '<section class="detail-section">' +
        '<h2>この物件を見た方におすすめ</h2>' +
        '<div class="p-grid">' + similar.map(P.propertyCard).join('') + '</div>' +
      '</section>' : '') +
    '</div>';
  }

  function row(th, td, raw) {
    return '<tr><th>' + th + '</th><td>' + (raw ? td : P.escapeHtml(td)) + '</td></tr>';
  }

  function inquiryForm(p) {
    return '' +
    '<form class="inquiry-form" id="inquiry-form" novalidate>' +
      '<input type="hidden" name="propertyId" value="' + p.id + '">' +
      '<div class="form-row"><label for="i-name">お名前<span class="required">必須</span></label>' +
        '<input type="text" id="i-name" name="name" autocomplete="name" placeholder="山田 太郎" required>' +
        '<p class="field-error" data-error-for="i-name"></p></div>' +
      '<div class="form-row"><label for="i-company">会社名・屋号<span class="optional">任意</span></label>' +
        '<input type="text" id="i-company" name="company" autocomplete="organization" placeholder="株式会社〇〇"></div>' +
      '<div class="form-row"><label for="i-email">メールアドレス<span class="required">必須</span></label>' +
        '<input type="email" id="i-email" name="email" autocomplete="email" inputmode="email" placeholder="example@mail.com" required>' +
        '<p class="field-error" data-error-for="i-email"></p></div>' +
      '<div class="form-row"><label for="i-tel">電話番号<span class="optional">任意</span></label>' +
        '<input type="tel" id="i-tel" name="tel" autocomplete="tel" inputmode="tel" placeholder="090-0000-0000"></div>' +
      '<div class="form-row form-row-full"><label for="i-purpose">ご希望<span class="optional">任意</span></label>' +
        '<select id="i-purpose" name="purpose">' +
          '<option value="doc">資料・図面がほしい</option>' +
          '<option value="visit">内見を希望する</option>' +
          '<option value="condition">条件を相談したい</option>' +
          '<option value="similar">類似物件も紹介してほしい</option>' +
        '</select></div>' +
      '<div class="form-row form-row-full"><label for="i-message">ご質問・ご要望<span class="optional">任意</span></label>' +
        '<textarea id="i-message" name="message" rows="5" placeholder="想定業態、希望入居時期、ご予算などをご記入ください"></textarea></div>' +
      '<div class="form-row form-row-full">' +
        '<ul class="trust-signals"><li>1営業日以内にご返信します</li><li>しつこい営業電話はいたしません</li><li>個人情報は相談対応以外に利用しません</li></ul>' +
        '<button type="submit" class="btn btn-primary btn-lg" id="inquiry-submit">この内容で問い合わせる</button>' +
        '<p class="form-status" id="inquiry-status" role="status"></p>' +
      '</div>' +
    '</form>';
  }

  /* ---------- フォーム（フロントのみ・送信先未実装） ---------- */
  function bindForm() {
    var form = document.getElementById('inquiry-form');
    if (!form) return;
    var status = document.getElementById('inquiry-status');
    var submit = document.getElementById('inquiry-submit');

    var validate = function () {
      var ok = true;
      [['i-name', 'お名前をご入力ください'], ['i-email', 'メールアドレスをご入力ください']].forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        var err = document.querySelector('[data-error-for="' + pair[0] + '"]');
        var msg = '';
        if (!el.value.trim()) msg = pair[1];
        else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) msg = 'メールアドレスの形式をご確認ください';
        if (msg) ok = false;
        err.textContent = msg;
        el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      });
      return ok;
    };

    form.addEventListener('input', function (e) {
      if (e.target.id === 'i-name' || e.target.id === 'i-email') validate();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        status.textContent = '未入力の項目があります。ご確認ください。';
        status.className = 'form-status is-error';
        return;
      }
      submit.disabled = true;
      submit.textContent = '送信中…';
      /* 送信先は未実装です。実運用ではここでフォームAPIへPOSTしてください。 */
      setTimeout(function () {
        submit.textContent = '送信しました';
        status.textContent = 'お問い合わせを受け付けました（デモ環境のため実際には送信されていません）。担当より1営業日以内にご連絡します。';
        status.className = 'form-status is-success';
      }, 700);
    });
  }

  /* ギャラリー（サムネイル切替の受け口。実写真登録時に拡張） */
  function bindGallery() { /* 実写真登録時にサムネイル切替を実装 */ }
})();
