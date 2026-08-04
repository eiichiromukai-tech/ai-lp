/* 物件詳細ページ — ?id=CMP-1001 で物件を描画 */
(function () {
  'use strict';

  var P = window.Portal;

  P.onReady('detail', function () {
    var id = P.currentParams().get('id');
    var p = id ? P.findById(id) : null;
    var root = document.getElementById('detail-root');

    if (!p) {
      root.innerHTML = notFound();
      document.title = '物件が見つかりません｜REMAX COMPASS 物件ポータル';
      return;
    }

    var desc = p.title + '（' + p.ward + '）｜' + P.formatAmount(p) +
      (P.isSale(p) ? '' : '／月') + '・' + p.areaTsubo.toFixed(1) + '坪。' + p.description.slice(0, 70);

    P.setPageMeta({
      title: p.title + '｜REMAX COMPASS 物件ポータル',
      description: desc,
      path: 'property.html?id=' + encodeURIComponent(p.id),
      image: P.hasPhotos(p) ? p.images[0].src : 'images/COMPASS_BLACK_Primary.png'
    });
    setStructuredData(p);

    root.innerHTML = detailHtml(p);
    P.pushHistory(p.id);
    P.track('view_property', {
      property_id: p.id,
      deal: P.dealOf(p),
      type: p.type,
      ward: p.ward,
      price: p.amount
    });
    bindForm(p);
    bindGallery(p);
  });

  /* 検索結果に価格・面積を出すための構造化データ */
  function setStructuredData(p) {
    var url = P.siteUrl('property.html?id=' + encodeURIComponent(p.id));
    var sale = P.isSale(p);
    var listing = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: p.title,
      description: p.description,
      url: url,
      datePosted: p.updatedAt,
      identifier: p.id,
      image: P.galleryImages(p)
        .filter(function (img) { return !img.placeholder; })
        .map(function (img) { return P.siteUrl(img.src); }),
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'JP',
        addressRegion: P.prefLabel(P.prefOf(p)),
        addressLocality: p.ward,
        streetAddress: p.address
      },
      floorSize: { '@type': 'QuantitativeValue', value: p.areaSqm, unitCode: 'MTK' },
      provider: {
        '@type': 'RealEstateAgent',
        name: P.site.brandName,
        legalName: P.site.companyName,
        telephone: P.site.tel,
        url: P.siteUrl('')
      }
    };
    if (p.builtYear) listing.yearBuilt = p.builtYear;
    if (p.amount) {
      listing.offers = {
        '@type': 'Offer',
        price: p.amount,
        priceCurrency: 'JPY',
        availability: P.isClosed(p)
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
        businessFunction: sale
          ? 'http://purl.org/goodrelations/v1#Sell'
          : 'http://purl.org/goodrelations/v1#LeaseOut'
      };
      if (!sale) listing.offers.unitCode = 'MON';
    }
    P.setJsonLd('ld-listing', listing);

    var crumbs = [
      ['ホーム', P.siteUrl('')],
      ['物件検索', P.siteUrl('properties.html')],
      [P.DEAL_CONFIG[P.dealOf(p)].label, P.siteUrl('properties.html?deal=' + P.dealOf(p))],
      [P.prefLabel(P.prefOf(p)), P.siteUrl('properties.html?pref=' + P.prefOf(p))],
      [p.ward, P.siteUrl('properties.html?area=' + encodeURIComponent(p.ward))],
      [P.TYPE_LABEL[p.type], P.siteUrl('properties.html?type=' + p.type)],
      [p.title, url]
    ];
    P.setJsonLd('ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(function (c, i) {
        return { '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] };
      })
    });
  }

  function notFound() {
    return '<div class="container empty-state empty-state-page">' +
      '<h1>物件が見つかりませんでした</h1>' +
      '<p>URLが正しくないか、掲載が終了した可能性があります。物件検索から他の物件をご覧ください。</p>' +
      '<div class="empty-actions"><a href="properties.html" class="btn btn-primary">物件検索へ</a>' +
      '<a href="contact.html" class="link-cta">条件を伝えて探してもらう</a></div></div>';
  }

  function detailHtml(p) {
    var closed = P.isClosed(p);
    var sale = P.isSale(p);
    /* おすすめには成約済を出さない */
    var similar = P.activeProperties().filter(function (o) {
      return o.id !== p.id && P.dealOf(o) === P.dealOf(p) &&
        (o.type === p.type || o.ward === p.ward);
    }).slice(0, 3);

    return '' +
    '<div class="container">' +
      '<nav class="breadcrumb" aria-label="パンくずリスト"><ol>' +
        '<li><a href="index.html">ホーム</a></li>' +
        '<li><a href="properties.html">物件検索</a></li>' +
        '<li><a href="properties.html?deal=' + P.dealOf(p) + '">' + P.DEAL_CONFIG[P.dealOf(p)].label + '</a></li>' +
        '<li><a href="properties.html?deal=' + P.dealOf(p) + '&pref=' + P.prefOf(p) + '">' + P.prefLabel(P.prefOf(p)) + '</a></li>' +
        '<li><a href="properties.html?deal=' + P.dealOf(p) + '&area=' + encodeURIComponent(p.ward) + '">' + P.escapeHtml(p.ward) + '</a></li>' +
        '<li><a href="properties.html?deal=' + P.dealOf(p) + '&type=' + p.type + '">' + P.TYPE_LABEL[p.type] + '</a></li>' +
        '<li aria-current="page">' + P.escapeHtml(p.title) + '</li>' +
      '</ol></nav>' +

      '<div class="detail-head">' +
        '<div class="detail-badges">' + P.dealBadge(p) + P.statusBadge(p) +
          '<span class="badge badge-type">' + P.TYPE_LABEL[p.type] + '</span>' +
          '<span class="detail-id">物件番号 ' + p.id + '</span></div>' +
        '<h1 class="detail-title">' + P.escapeHtml(p.title) + '</h1>' +
        '<p class="detail-address">' + P.escapeHtml(p.address) + '／' + P.escapeHtml(P.nearestAccess(p)) + '</p>' +
      '</div>' +

      (closed ? '<div class="closed-notice" role="note">' +
        '<h2>この物件は成約済みです</h2>' +
        '<p>募集は終了しています。過去の取扱実績として掲載しています。同じエリア・条件の物件をお探しの場合はご相談ください。</p>' +
        '<div class="closed-actions">' +
          '<a href="properties.html?deal=' + P.dealOf(p) + '&type=' + p.type + '&area=' + encodeURIComponent(p.ward) + '" class="btn btn-primary">同じ条件の物件を探す</a>' +
          '<a href="contact.html" class="link-cta">条件を伝えて探してもらう</a>' +
        '</div></div>' : '') +

      '<div class="detail-layout">' +
        '<div class="detail-main">' +
          galleryHtml(p) +

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
              row('取引種別', P.DEAL_CONFIG[P.dealOf(p)].label) +
              row('物件種別', P.TYPE_LABEL[p.type]) +
              row('所在地', p.address) +
              row('交通', (p.access || []).map(function (a) {
                return a.line + '「' + a.station + '」駅 徒歩' + a.walk + '分';
              }).join('<br>') || '—', true) +
              (sale
                ? row('販売価格', P.formatPrice(p.price) + (p.price ? '（税別）' : '')) +
                  row('表面利回り', P.formatYield(p.yieldRate)) +
                  row('坪単価', p.tsuboUnitPrice ? p.tsuboUnitPrice.toLocaleString('ja-JP') + '円／坪' : '—') +
                  row('権利形態', p.tenure || '—')
                : row('月額賃料', P.formatRent(p.rent) + (p.rent ? '（税別）' : '')) +
                  row('共益費・管理費', p.managementFee ? P.formatYen(p.managementFee) + '／月' : 'なし') +
                  row('坪単価', p.tsuboUnitPrice ? p.tsuboUnitPrice.toLocaleString('ja-JP') + '円／坪' : '—') +
                  row('敷金・保証金', P.formatMonths(p.deposit)) +
                  row('礼金', P.formatMonths(p.keyMoney))) +
              (sale ? '' : row('契約期間', p.contractTerm || 'お問い合わせください')) +
              row('面積', P.formatArea(p)) +
              row('階数', p.floor + (p.floorsTotal ? '（地上' + p.floorsTotal + '階建）' : '')) +
              row('構造', p.structure) +
              row('築年月', P.formatBuilt(p)) +
              (p.zoning ? row('用途地域', p.zoning) : '') +
              (p.buildingCoverage != null || p.floorAreaRatio != null
                ? row('建ぺい率／容積率',
                    (p.buildingCoverage != null ? p.buildingCoverage + '%' : '—') + '／' +
                    (p.floorAreaRatio != null ? p.floorAreaRatio + '%' : '—'))
                : '') +
              (p.privateRoad ? row('私道負担', p.privateRoad) : '') +
              (p.buildingPermit ? row('建築確認番号', p.buildingPermit) : '') +
              row('用途', (p.usage || []).join('／') || '—') +
              row(sale ? '引渡し時期' : '入居可能時期', p.availableFrom) +
              row('仲介手数料', (sale
                ? '売買価格の3%＋6万円（税別）'
                : '月額賃料の1ヶ月分（税別）') +
                '<br><span class="spec-note">宅地建物取引業法に定める報酬額によります</span>', true) +
              row('取引態様', '仲介') +
              row('情報提供元', P.site.companyName + '（' + P.site.brandName + '）／宅地建物取引業免許 ' + P.site.license) +
              row('情報更新日', P.formatDate(p.updatedAt)) +
              row('取引条件の有効期限', P.formatDate(p.validUntil) +
                '（期限後は最新の条件をお問い合わせください）') +
            '</tbody></table>' +
          '</section>' +

          mapHtml(p) +

          (closed ? '' : '<section class="detail-section">' +
            '<h2>ご契約までの流れ</h2>' +
            '<ol class="flow-list">' +
              '<li><span class="flow-step">STEP 1</span><h3>お問い合わせ</h3><p>本ページのフォームまたはお電話でご連絡ください。ご相談は無料です。</p></li>' +
              (sale
                ? '<li><span class="flow-step">STEP 2</span><h3>資料のご開示</h3><p>謄本・図面・レントロール・修繕履歴などをお送りし、現地内覧を調整します。</p></li>' +
                  '<li><span class="flow-step">STEP 3</span><h3>買付・条件交渉</h3><p>買付証明書のご提出後、価格・引渡し条件を売主様と交渉します。</p></li>' +
                  '<li><span class="flow-step">STEP 4</span><h3>売買契約・決済</h3><p>宅地建物取引士が重要事項をご説明のうえ契約を締結し、決済・引渡しを行います。このときに仲介手数料を申し受けます。</p></li>'
                : '<li><span class="flow-step">STEP 2</span><h3>詳細資料のご案内</h3><p>図面・現地写真・詳細条件をお送りし、ご希望に応じて内見を調整します。</p></li>' +
                  '<li><span class="flow-step">STEP 3</span><h3>条件交渉・申込</h3><p>賃料・フリーレント・契約期間などの条件をオーナー様と交渉します。</p></li>' +
                  '<li><span class="flow-step">STEP 4</span><h3>重要事項説明・契約</h3><p>宅地建物取引士が重要事項をご説明のうえ、ご契約手続きを行います。このときに仲介手数料を申し受けます。</p></li>') +
            '</ol>' +
            '<p class="fee-note">ご相談・物件のご紹介・内見に費用はかかりません。' +
              '<strong>ご成約時に、宅地建物取引業法に定める報酬額を仲介手数料として申し受けます</strong>' +
              '（' + (sale ? '売買価格の3%＋6万円（税別）' : '月額賃料の1ヶ月分（税別）') + '）。</p>' +
          '</section>') +
        '</div>' +

        '<aside class="detail-side">' +
          '<div class="side-card">' +
            '<p class="side-rent"><span class="rent-value">' + P.formatAmount(p) + '</span>' +
              '<span class="rent-unit">' + (sale ? '（税別）' : '／月（税別）') + '</span></p>' +
            '<dl class="side-spec">' +
              (sale
                ? '<div><dt>表面利回り</dt><dd>' + P.formatYield(p.yieldRate) + '</dd></div>'
                : '<div><dt>共益費</dt><dd>' + (p.managementFee ? P.formatYen(p.managementFee) + '／月' : 'なし') + '</dd></div>') +
              '<div><dt>面積</dt><dd>' + p.areaTsubo.toFixed(1) + '坪</dd></div>' +
              '<div><dt>階数</dt><dd>' + P.escapeHtml(p.floor) + '</dd></div>' +
              '<div><dt>' + (sale ? '引渡し' : '入居時期') + '</dt><dd>' + P.escapeHtml(p.availableFrom) + '</dd></div>' +
            '</dl>' +
            (closed
              ? '<p class="side-closed">この物件は成約済みです</p>' +
                '<a href="contact.html" class="btn btn-primary btn-block">似た条件で相談する</a>'
              : '<a href="#detail-inquiry" class="btn btn-primary btn-block">この物件を問い合わせる</a>' +
                '<button type="button" class="btn btn-ghost btn-block fav-btn-wide' + (P.isFavorite(p.id) ? ' is-active' : '') + '" ' +
                  'data-fav-id="' + p.id + '" aria-pressed="' + P.isFavorite(p.id) + '">お気に入りに追加</button>') +
            '<a href="tel:0362615098" class="side-tel"><span>お電話でのご相談</span><strong>03-6261-5098</strong><small>平日 9:30〜18:30</small></a>' +
          '</div>' +
        '</aside>' +
      '</div>' +

      (closed ? '' : '<section class="detail-section detail-inquiry" id="detail-inquiry">' +
        '<h2>この物件についてお問い合わせ</h2>' +
        '<p class="section-lead">物件番号 ' + p.id + '（' + P.escapeHtml(p.title) + '）についてのお問い合わせです。図面・詳細条件をお送りします。</p>' +
        inquiryForm(p) +
      '</section>') +

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
      '<div class="form-row form-row-full"><label for="i-address">ご住所<span class="optional">任意</span></label>' +
        '<input type="text" id="i-address" name="address" autocomplete="street-address" placeholder="例：東京都千代田区神田三崎町3-4-9 横山ビル3F">' +
        '<p class="field-hint">資料の郵送をご希望の場合にご記入ください。</p></div>' +
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
      P.consentHtml('i-consent') +
      '<div class="form-row form-row-full">' +
        '<ul class="trust-signals"><li>2営業日以内にご返信します</li><li>しつこい営業電話はいたしません</li><li>ご入力内容は物件のご提案・ご案内に利用します</li></ul>' +
        '<button type="submit" class="btn btn-primary btn-lg" id="inquiry-submit">この内容で問い合わせる</button>' +
        '<p class="form-status" id="inquiry-status" role="status"></p>' +
      '</div>' +
    '</form>';
  }

  /* ---------- 物件個別のお問い合わせフォーム ---------- */
  function bindForm(p) {
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
      if (!P.validateConsent('i-consent')) ok = false;
      return ok;
    };

    form.addEventListener('input', function (e) {
      if (e.target.id === 'i-name' || e.target.id === 'i-email') validate();
    });
    form.addEventListener('change', function (e) {
      if (e.target.id === 'i-consent') P.validateConsent('i-consent');
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
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }

      P.runInquirySubmit({
        name: 'detail',
        submit: submit,
        status: status,
        label: 'この内容で問い合わせる',
        subject: '【物件のお問い合わせ】' + p.id + ' ' + p.title,
        fields: function () {
          return {
            _subject: '【REMAX COMPASS 物件ポータル】' + p.id + ' ' + p.title,
            _template: 'table',
            _captcha: 'false',
            '送信元': '物件ページ',
            '物件番号': p.id,
            '物件名': p.title,
            '物件URL': P.siteUrl('property.html?id=' + encodeURIComponent(p.id)),
            '取引種別': P.DEAL_CONFIG[P.dealOf(p)].label,
            '金額': P.formatAmount(p) + (P.isSale(p) ? '' : '／月'),
            'お名前': value('i-name'),
            '会社名・屋号': value('i-company'),
            'メールアドレス': value('i-email'),
            '電話番号': value('i-tel'),
            'ご希望': value('i-purpose'),
            'ご住所': value('i-address'),
            'ご質問・ご要望': value('i-message'),
            '同意': 'プライバシーポリシーに同意済み'
          };
        }
      });
    });
  }

  /* ---------- ギャラリー ----------
     images/properties/ に写真があればそれを、なければ種別ごとの
     イメージ画像を1枚だけ表示する。 */
  function galleryHtml(p) {
    var shots = P.galleryImages(p);
    var real = P.hasPhotos(p);
    var first = shots[0];
    var alt = P.escapeHtml(p.title) + (real ? '' : 'のイメージ');

    return '<figure class="detail-gallery' + (real ? ' has-photos' : '') + '">' +
      '<div class="gallery-stage">' +
        '<img id="gallery-main" src="' + first.src + '" alt="' + alt + '" width="480" height="320">' +
        (shots.length > 1
          ? '<button type="button" class="gallery-nav gallery-prev" data-gallery-step="-1" aria-label="前の写真">‹</button>' +
            '<button type="button" class="gallery-nav gallery-next" data-gallery-step="1" aria-label="次の写真">›</button>' +
            '<p class="gallery-counter" id="gallery-counter" aria-live="polite">1 / ' + shots.length + '</p>'
          : '') +
      '</div>' +
      (shots.length > 1
        ? '<ul class="gallery-thumbs" id="gallery-thumbs">' +
            shots.map(function (img, i) {
              return '<li><button type="button" class="gallery-thumb' + (i === 0 ? ' is-current' : '') + '"' +
                ' data-gallery-index="' + i + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' +
                '<img src="' + img.src + '" alt="' + P.escapeHtml(p.title) + ' 写真' + (i + 1) +
                (img.caption ? '：' + P.escapeHtml(img.caption) : '') + '" width="120" height="80" loading="lazy">' +
              '</button></li>';
            }).join('') +
          '</ul>'
        : '') +
      '<figcaption id="gallery-caption">' +
        (real
          ? (first.caption ? P.escapeHtml(first.caption) : '現地写真')
          : '') +
      '</figcaption>' +
      '<p class="gallery-note">' +
        (real
          ? '※ 掲載写真は当該物件を撮影したものです。撮影時期により現況と異なる場合があります。'
          : '※ 現地写真は未掲載です。上の画像は物件種別に基づくイメージイラストで、当該物件の外観・内装とは異なります。現地写真・図面は個別にご案内します。') +
      '</p>' +
    '</figure>';
  }

  /* サムネイル・矢印での切り替え */
  function bindGallery(p) {
    var main = document.getElementById('gallery-main');
    var thumbs = document.getElementById('gallery-thumbs');
    if (!main || !thumbs) return;

    var shots = P.galleryImages(p);
    var caption = document.getElementById('gallery-caption');
    var counter = document.getElementById('gallery-counter');
    var index = 0;

    function show(next) {
      index = (next + shots.length) % shots.length;
      var img = shots[index];
      main.src = img.src;
      if (caption) caption.textContent = img.caption || '現地写真';
      if (counter) counter.textContent = (index + 1) + ' / ' + shots.length;
      Array.prototype.forEach.call(thumbs.querySelectorAll('.gallery-thumb'), function (btn, i) {
        btn.classList.toggle('is-current', i === index);
        if (i === index) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      });
    }

    thumbs.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-gallery-index]');
      if (btn) show(Number(btn.getAttribute('data-gallery-index')));
    });

    document.querySelectorAll('[data-gallery-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(index + Number(btn.getAttribute('data-gallery-step')));
      });
    });
  }

  /* ---------- 地図 ----------
     所在地に番地・号まで入っている物件だけ表示する。 */
  function mapHtml(p) {
    /* 番地まで分からない住所では地図を出さない（別の場所を指してしまうため） */
    if (!P.canShowMap(p)) return '';
    return '<section class="detail-section">' +
      '<h2>地図</h2>' +
      '<div class="detail-map">' +
        /* 1ファイルのプレビュー版は外部の読み込みが遮断されるため、地図の代わりに案内を出す */
        (window.PORTAL_SPA
          ? '<p class="detail-map-fallback">プレビュー版では地図を表示できません。' +
            '公開サイトではここにGoogleマップが表示されます。</p>'
          : '<iframe src="' + P.escapeHtml(P.mapEmbedUrl(p)) + '" title="' + P.escapeHtml(p.address) + 'の地図"' +
            ' loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>') +
      '</div>' +
      '<p class="detail-map-note">' + P.escapeHtml(p.address) +
        '<a class="link-cta" href="' + P.escapeHtml(P.mapLinkUrl(p)) + '" target="_blank" rel="noopener">' +
        'Googleマップで開く</a></p>' +
    '</section>';
  }
})();
