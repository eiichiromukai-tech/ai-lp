#!/usr/bin/env node
/* =====================================================
   サイト全体の自動テスト

     npm test              … すべて実行
     npm test -- --headed  … ブラウザを表示して実行

   実際のブラウザ（Chromium）でページを開き、表示・絞り込み・
   フォーム・SEOタグなどを確認します。GitHub Actions でも同じものが動きます。
   ===================================================== */
'use strict';

const { chromium } = require('playwright');

/* テストは tests/fixture/ の固定データで動かす。
   実際に掲載している物件の件数が変わってもテストが壊れないようにするため。
   （サーバーは SITE_OVERLAY にあるファイルを優先して返す） */
buildFixture();
process.env.SITE_OVERLAY = require('path').join(__dirname, 'fixture', 'site');

const server = require('../tools/serve.js');

function buildFixture() {
  const path = require('path');
  const dir = path.join(__dirname, 'fixture');
  require('child_process').execFileSync(process.execPath, [
    path.join(__dirname, '..', 'tools', 'csv-to-properties.js'),
    '--csv', path.join(dir, 'properties.csv'),
    '--out-dir', path.join(dir, 'site')
  ], {
    stdio: 'pipe',
    env: Object.assign({}, process.env, {
      IMAGES_DIR: path.join(dir, 'site', 'images', 'properties')
    })
  });
}

const PORT = Number(process.env.PORT || 8080);
const BASE = 'http://localhost:' + PORT;
const HEADED = process.argv.includes('--headed');

/* 外部サービス（フォント・地図・解析）はテスト環境から出られないので、
   その失敗はサイトの不具合と区別する */
const EXTERNAL = /fonts\.googleapis|fonts\.gstatic|maps\.google|google\.com\/maps|googletagmanager|formsubmit/;

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log('  ✓ ' + name);
  } else {
    failures.push(name + (detail ? '（' + detail + '）' : ''));
    console.log('  ✗ ' + name + (detail ? '  → ' + detail : ''));
  }
}

function section(title) { console.log('\n' + title); }

(async function main() {
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath: process.env.CHROMIUM_PATH || undefined
  });
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('pageerror', function (e) { consoleErrors.push('PAGEERROR: ' + e.message); });
  page.on('console', function (m) {
    if (m.type() !== 'error') return;
    /* 「Failed to load resource」はメッセージにURLが入らないので発生元で判定する */
    var from = (m.location() || {}).url || '';
    if (EXTERNAL.test(m.text()) || EXTERNAL.test(from)) return;
    consoleErrors.push('CONSOLE: ' + m.text() + (from ? ' @ ' + from : ''));
  });
  page.on('requestfailed', function (r) {
    var reason = (r.failure() || {}).errorText || '';
    /* 次のページへ移ったときに、まだ読み込み中だった画像などが打ち切られる。
       テストが素早く遷移するせいで起きるもので、サイトの不具合ではない。
       ファイルが無い場合は 404 が返るため requestfailed ではなく
       コンソールの「Failed to load resource」で検出される。 */
    if (reason.indexOf('ERR_ABORTED') !== -1) return;
    if (!EXTERNAL.test(r.url())) consoleErrors.push('REQFAIL: ' + r.url() + '（' + reason + '）');
  });

  const go = function (path) { return page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); };
  const settle = function (ms) { return page.waitForTimeout(ms || 500); };

  try {
    /* ---------- トップページ ---------- */
    section('トップページ');
    await go('/index.html'); await settle(700);
    check('新着物件が6件出る', await page.locator('#featured-grid .p-card').count() === 6);
    check('種別ナビが5件出る', await page.locator('#type-grid .type-item').count() === 5);
    check('エリアが都県ごとに分かれる', await page.locator('#area-groups .area-group').count() === 4);
    check('東京都は23区と市部に分かれる',
      (await page.locator('.area-sub-label').allTextContents()).join(',') === '23区,多摩・市部');
    check('件数バッジが出る', /\d+件/.test(await page.locator('#hs-count').textContent()));

    await page.click('#hs-deal label:has(input[value="sale"])'); await settle(300);
    const saleBadges = await page.locator('#featured-grid .badge-deal').allTextContents();
    check('売買に切り替えると売買物件だけになる',
      saleBadges.length > 0 && saleBadges.every(function (t) { return t === '売買'; }));
    check('売買では価格の欄に切り替わる', await page.locator('#hs-price-field').isVisible());

    /* ---------- SEO ---------- */
    section('SEO・構造化データ');
    await go('/index.html'); await settle(600);
    check('canonicalが公開URLになる',
      /^https?:\/\/.+\/index\.html$/.test(await page.locator('link[rel=canonical]').getAttribute('href')));
    check('OGP画像が絶対URLになる',
      /^https?:\/\//.test(await page.locator('meta[property="og:image"]').getAttribute('content')));
    const ldIds = await page.evaluate(function () {
      return [].map.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) { return s.id; });
    });
    check('会社情報とサイト検索の構造化データがある',
      ldIds.indexOf('ld-org') !== -1 && ldIds.indexOf('ld-website') !== -1, ldIds.join(','));

    /* ---------- 検索 ---------- */
    section('物件検索');
    await go('/properties.html'); await settle(700);
    check('賃貸が既定で表示される', (await page.locator('#results-title').textContent()) === '賃貸物件を探す');
    const total = await page.locator('#result-summary').textContent();
    check('件数が表示される', /全\d+件中/.test(total), total.trim());
    check('都県の絞り込みが4つ', await page.locator('#f-prefs .check-item').count() === 4);
    check('沿線の選択肢がある', await page.locator('#f-line option').count() > 5);

    await page.click('#f-prefs .check-item:has-text("神奈川県")'); await settle(400);
    check('都県で絞るとURLに反映される', page.url().indexOf('pref=kanagawa') !== -1);
    check('エリア一覧がその都県だけになる',
      (await page.locator('#f-areas .check-group-label').allTextContents()).join(',') === '神奈川県');

    await page.click('#filter-reset'); await settle(400);
    await page.selectOption('#f-line', 'JR山手線'); await settle(400);
    check('沿線を選ぶと駅が出る', await page.locator('#f-stations .check-item').count() > 0);
    await page.locator('#f-stations .check-item').first().click(); await settle(400);
    check('駅で絞り込める', /全\d+件中/.test(await page.locator('#result-summary').textContent()));
    check('駅がチップに出る', (await page.locator('#active-chips .chip').count()) > 0);

    await page.click('#filter-reset'); await settle(400);
    await page.click('#f-deal label:has(input[value="sale"])'); await settle(500);
    check('売買では利回り順が選べる',
      (await page.locator('#sort-select option').allTextContents()).indexOf('利回りが高い順') !== -1);
    check('売買では販売価格で絞れる', await page.locator('#f-price-group').isVisible());

    /* ---------- 物件詳細 ---------- */
    section('物件詳細');
    await go('/property.html?id=CMP-1025'); await settle(800);
    check('タイトルが物件名になる', (await page.title()).indexOf('横浜駅西口') === 0);
    check('写真が10枚出る', await page.locator('.gallery-thumb').count() === 10);
    check('枚数カウンタが出る', (await page.locator('#gallery-counter').textContent()).trim() === '1 / 10');
    await page.locator('.gallery-thumbs li:nth-child(3) .gallery-thumb').click(); await settle(250);
    check('サムネイルで切り替わる', (await page.locator('#gallery-counter').textContent()).trim() === '3 / 10');
    check('キャプションが切り替わる', (await page.locator('#gallery-caption').textContent()).trim() === '厨房');
    check('番地まである住所は地図が出る', await page.locator('.detail-map iframe').count() === 1);
    const listing = await page.evaluate(function () {
      return JSON.parse(document.getElementById('ld-listing').textContent);
    });
    check('物件の構造化データが出る', listing['@type'] === 'RealEstateListing' && listing.offers.price > 0);
    check('OGP画像が物件写真になる',
      (await page.locator('meta[property="og:image"]').getAttribute('content')).indexOf('properties/') !== -1);

    await go('/property.html?id=CMP-1002'); await settle(600);
    check('写真がない物件は代替画像になる',
      (await page.locator('#gallery-main').getAttribute('src')).indexOf('data:image/svg') === 0);
    check('丁目までの住所は地図を出さない', await page.locator('.detail-map iframe').count() === 0);

    await go('/property.html?id=NOPE'); await settle(400);
    check('存在しない物件は案内が出る', (await page.locator('h1').textContent()).indexOf('見つかりません') !== -1);

    /* ---------- 宅建業法・表示規約への適合 ---------- */
    section('宅建業法・不動産の表示に関する公正競争規約');
    await go('/property.html?id=CMP-1001'); await settle(700);
    const specRows = await page.evaluate(function () {
      return [].map.call(document.querySelectorAll('.spec-table tr'), function (tr) {
        return tr.children[0].textContent.trim();
      });
    });
    const has = function (label) { return specRows.indexOf(label) !== -1; };
    check('取引態様を明示している（法34条）', has('取引態様'));
    check('賃貸に契約期間がある（表示規約）', has('契約期間'));
    check('取引条件の有効期限がある（表示規約）', has('取引条件の有効期限'));
    check('仲介手数料を明示している（法46条）', has('仲介手数料'));
    check('情報提供元と免許番号を明示している', has('情報提供元'));
    check('消費税の扱いを明示している',
      (await page.locator('.spec-table').textContent()).indexOf('（税別）') !== -1);
    check('契約の流れに手数料の説明がある',
      (await page.locator('.fee-note').textContent()).indexOf('宅地建物取引業法に定める報酬額') !== -1);
    check('賃貸の手数料額を明示している',
      (await page.locator('.spec-table').textContent()).indexOf('月額賃料の1ヶ月分（税別）') !== -1);
    check('築年月を年月で表示している（表示規約）', has('築年月'));
    check('築年月に月まで出ている',
      /\d{4}年\d{1,2}月/.test(await page.evaluate(function () {
        var tr = [].filter.call(document.querySelectorAll('.spec-table tr'), function (t) {
          return t.children[0].textContent.trim() === '築年月';
        })[0];
        return tr ? tr.children[1].textContent : '';
      })));
    check('写真がない物件はイメージである旨を明示',
      (await page.locator('.gallery-note').textContent()).indexOf('イメージイラスト') !== -1);
    check('フッターに手数料と免許の共通表示がある',
      (await page.locator('.footer-legal').textContent()).indexOf('仲介手数料') !== -1);

    /* REMAXフランチャイズの必須表記。全ページに入っていないと規約違反になる */
    const FC = 'Each Office Independently Owned and Operated.';
    const fcPages = ['/index.html', '/properties.html', '/property.html?id=CMP-1025',
      '/contact.html', '/favorites.html', '/owner.html', '/privacy.html', '/404.html',
      '/import.html'];
    const fcMissing = [];
    for (const path of fcPages) {
      await go(path); await settle(250);
      if ((await page.locator('.footer-franchise').count()) === 0 ||
          (await page.locator('.footer-franchise').textContent()).indexOf(FC) === -1) {
        fcMissing.push(path);
      }
    }
    check('全ページにフランチャイズの必須表記がある', fcMissing.length === 0, fcMissing.join(', '));

    await go('/property.html?id=CMP-2013'); await settle(700);
    const saleRows = await page.evaluate(function () {
      return [].map.call(document.querySelectorAll('.spec-table tr'), function (tr) {
        return tr.children[0].textContent.trim();
      });
    });
    check('売買に用途地域がある（表示規約）', saleRows.indexOf('用途地域') !== -1);
    check('売買に建ぺい率・容積率がある（表示規約）', saleRows.indexOf('建ぺい率／容積率') !== -1);
    check('土地に私道負担がある（表示規約）', saleRows.indexOf('私道負担') !== -1);

    await go('/property.html?id=CMP-1025'); await settle(800);
    check('写真がある物件は当該物件の写真である旨を明示',
      (await page.locator('.gallery-note').textContent()).indexOf('当該物件を撮影') !== -1);

    /* 手数料に「上限」と書くと値引き交渉の余地があると受け取られるため使わない */
    const feePages = ['/property.html?id=CMP-1001', '/property.html?id=CMP-2013',
      '/contact.html', '/owner.html', '/privacy.html', '/index.html'];
    let capWording = [];
    for (const path of feePages) {
      await go(path); await settle(600);
      const body = await page.locator('body').textContent();
      /* 「上限なし」は絞り込みの選択肢なので除外する */
      if (/(上限とする|が上限|報酬額の範囲内)/.test(body)) capWording.push(path);
    }
    check('手数料に「上限」の表記がない', capWording.length === 0, capWording.join(','));

    const banned = /完全|絶対|万全|日本一|抜群|当社だけ|一流|特選|厳選|最高級|至便|買得|掘出|格安|投売|破格|激安|完璧/;
    await go('/properties.html'); await settle(700);
    check('検索結果に表示規約の特定用語がない', !banned.test(await page.locator('#result-grid').textContent()));

    /* ---------- お問い合わせ ---------- */
    section('お問い合わせフォーム');
    await go('/property.html?id=CMP-1001'); await settle(700);
    check('住所欄がある', await page.locator('#i-address').count() === 1);
    check('返信の目安が2営業日',
      (await page.locator('.trust-signals').textContent()).indexOf('2営業日') !== -1);
    check('個人情報の使いみちを明示している',
      (await page.locator('.trust-signals').textContent()).indexOf('物件のご提案・ご案内') !== -1);
    await page.fill('#i-name', 'テスト太郎');
    await page.fill('#i-email', 'test@example.com');
    await page.click('#inquiry-submit'); await settle(400);
    check('同意なしでは送信されない',
      (await page.locator('[data-error-for="i-consent"]').textContent()).indexOf('同意') !== -1);

    await page.route('**/formsubmit.co/**', function (r) {
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' });
    });
    await page.check('#i-consent');
    await page.click('#inquiry-submit'); await settle(900);
    check('同意すれば送信できる',
      (await page.locator('#inquiry-status').textContent()).indexOf('受け付けました') !== -1);

    await go('/property.html?id=CMP-1003'); await settle(700);
    await page.route('**/formsubmit.co/**', function (r) { return r.abort(); });
    await page.fill('#i-name', '失敗太郎');
    await page.fill('#i-email', 'ng@example.com');
    await page.check('#i-consent');
    await page.click('#inquiry-submit'); await settle(900);
    const fallback = await page.locator('#inquiry-status').innerHTML();
    check('送信に失敗したらメール導線を出す', fallback.indexOf('mailto:') !== -1);
    check('失敗後は再送信できる', !(await page.locator('#inquiry-submit').isDisabled()));
    await page.unroute('**/formsubmit.co/**');

    /* ---------- お気に入り ---------- */
    section('お気に入り・閲覧履歴');
    await go('/property.html?id=CMP-1001'); await settle(600);
    await page.locator('[data-fav-id]').first().click(); await settle(300);
    await go('/favorites.html'); await settle(500);
    check('お気に入りが保存される', await page.locator('.p-card').count() >= 1);
    await go('/index.html'); await settle(600);
    check('最近見た物件が出る', await page.locator('#history-grid .p-card').count() >= 1);

    /* ---------- 固定ページ ---------- */
    section('固定ページ');
    await go('/privacy.html'); await settle(400);
    check('プライバシーポリシーがある', (await page.locator('h1').textContent()).indexOf('プライバシー') !== -1);
    check('問い合わせ窓口が載っている',
      (await page.locator('body').textContent()).indexOf('03-6261-5098') !== -1);
    await go('/owner.html'); await settle(400);
    check('オーナー向けページがある', (await page.locator('h1').count()) === 1);
    await go('/contact.html'); await settle(500);
    check('お問い合わせページに同意欄がある', await page.locator('#c-consent').count() === 1);
    /* 問い合わせ導線はフォームに一本化しているため、画面上にメールアドレスを出さない */
    let mailPages = [];
    for (const path of ['/index.html', '/contact.html', '/owner.html', '/privacy.html',
      '/properties.html', '/property.html?id=CMP-1001', '/favorites.html']) {
      await go(path); await settle(500);
      if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(await page.locator('body').textContent())) mailPages.push(path);
    }
    check('画面上にメールアドレスの記載がない', mailPages.length === 0, mailPages.join(','));
    await go('/contact.html'); await settle(500);
    check('お問い合わせページに住所欄がある', await page.locator('#c-address').count() === 1);
    check('リード文に手数料の説明がある',
      (await page.locator('.page-lead').textContent()).indexOf('仲介手数料') !== -1);
    await go('/privacy.html'); await settle(400);
    const policy = await page.locator('body').textContent();
    check('利用目的にメールマガジン・DMが含まれる', policy.indexOf('メールマガジン') !== -1);
    check('配信停止の方法が書かれている', policy.indexOf('いつでも停止できます') !== -1);
    check('仲介手数料の説明がある', policy.indexOf('宅地建物取引業法第46条') !== -1);

    /* ---------- 生成物 ---------- */
    section('sitemap / robots');
    const sitemap = await page.goto(BASE + '/sitemap.xml');
    const xml = await sitemap.text();
    check('sitemap.xmlがある', sitemap.status() === 200 && xml.indexOf('<urlset') !== -1);
    check('物件ページが載っている', (xml.match(/property\.html/g) || []).length >= 50);
    const robots = await page.goto(BASE + '/robots.txt');
    const txt = await robots.text();
    check('robots.txtがある', robots.status() === 200 && txt.indexOf('Sitemap:') !== -1);

    /* ---------- モバイル ---------- */
    section('モバイル表示');
    const m = await context.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/index.html', '/properties.html', '/property.html?id=CMP-1025', '/contact.html']) {
      await m.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await m.waitForTimeout(600);
      const overflow = await m.evaluate(function () {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      check('横スクロールが出ない: ' + path, !overflow);
    }
    await m.goto(BASE + '/properties.html', { waitUntil: 'domcontentloaded' });
    await m.waitForTimeout(500);
    await m.click('#filter-open'); await m.waitForTimeout(400);
    check('絞り込みドロワーが開く', await m.locator('#filter-panel.is-open').count() === 1);

    /* ---------- 図面からの下書き（import.html） ---------- */
    section('図面からの下書き');
    await go('/import.html'); await settle(600);

    /* 選択肢は data/properties.js のマスタから組み立てられる */
    const impMasters = await page.evaluate(function () {
      const M = window.PORTAL_DATA;
      return {
        deals: M.deals.length, types: M.types.length,
        areas: M.areas.length, features: M.features.length,
        prefs: Object.keys(M.areas.reduce(function (a, w) { a[M.areaPref[w]] = 1; return a; }, {})).length
      };
    });
    check('取引種別の選択肢がマスタと同じ',
      await page.locator('#f-deal option').count() === impMasters.deals);
    check('物件種別の選択肢がマスタと同じ',
      await page.locator('#f-type option').count() === impMasters.types + 1);
    check('エリアの選択肢がマスタと同じ',
      await page.locator('#f-ward option').count() === impMasters.areas + 1);
    check('エリアが都県ごとに分かれる',
      await page.locator('#f-ward optgroup').count() === impMasters.prefs);
    check('こだわり条件がマスタと同じ',
      await page.locator('#f-features input').count() === impMasters.features);

    /* 用途はサイト側にマスタがなく、microCMSの項目定義にしかない。
       決められた言葉以外を入れると登録時に弾かれるので、選択式にしている。 */
    const impSchema = require('../docs/microcms-schema.json');
    const impUsage = (impSchema.apiFields || impSchema.fields)
      .filter(function (f) { return f.fieldId === 'usage'; })[0];
    check('用途がmicroCMSの選択肢から作られる',
      await page.locator('#f-usage-checks input').count() === impUsage.selectItems.length,
      String(await page.locator('#f-usage-checks input').count()));
    check('用途の手入力欄は隠れる', await page.locator('#f-usage').isHidden());

    /* 開いた直後は指摘を出さない */
    check('開いた直後は指摘が出ない',
      (await page.textContent('#validation')).indexOf('上から入力してください') !== -1);
    check('最初は追加できない', await page.isDisabled('#add-row'));

    /* 図面の文字から入力欄が埋まる（人が書き写さなくて済む） */
    const ZUMEN = ['募集図面', '物件名　テスト五反田ビル', '所在地　東京都品川区西五反田一丁目1番1号',
      '交通　　JR山手線「五反田」駅徒歩4分／都営浅草線「五反田」駅徒歩6分', '用途　　事務所',
      '賃料　　850,000円（税別）', '共益費　85,000円', '敷金　　10ヶ月', '礼金　　無',
      '面積　　140.5㎡', '階数　　5階／地上8階建', '構造　　SRC造', '竣工　　平成27年4月',
      '契約形態　定期借家5年', '設備　　エレベーター・空調更新済'].join('\n');
    await page.fill('#pdf-text', ZUMEN);
    await page.click('#auto-fill'); await settle(400);
    check('賃料が入る', (await page.inputValue('#f-rent')) === '850000',
      await page.inputValue('#f-rent'));
    check('m²を坪に換算して入る', (await page.inputValue('#f-areaTsubo')) === '42.5',
      await page.inputValue('#f-areaTsubo'));
    check('和暦の築年月を西暦で入れる', (await page.inputValue('#f-built')) === '2015-04',
      await page.inputValue('#f-built'));
    check('エリアが選ばれる', (await page.inputValue('#f-ward')) === '品川区');
    check('物件種別が選ばれる', (await page.inputValue('#f-type')) === 'オフィス');
    check('交通が図面どおりの文章で入る',
      (await page.inputValue('#f-access')).indexOf('JR山手線「五反田」駅徒歩4分') === 0,
      await page.inputValue('#f-access'));
    check('こだわり条件が選ばれる',
      await page.locator('#f-features input:checked').count() >= 2);
    check('自動で入れた欄に色が付く', await page.locator('.is-auto').count() >= 10,
      String(await page.locator('.is-auto').count()));
    check('確認をうながす案内が出る',
      (await page.textContent('#auto-result')).indexOf('必ず図面と見比べて') !== -1,
      await page.textContent('#auto-result'));
    /* 物件番号は会社が決めるものなので、図面からは入れない */
    check('物件番号は空のまま', (await page.inputValue('#f-id')) === '');

    /* 人が直したら、確認済みとして色を外す */
    await page.fill('#f-rent', '900000'); await settle(200);
    check('直した欄の色は消える',
      (await page.getAttribute('#f-rent', 'class') || '').indexOf('is-auto') === -1,
      await page.getAttribute('#f-rent', 'class'));

    /* 以降の確認のため、いったん元に戻す */
    await page.fill('#pdf-text', '');
    for (const id of ['f-title', 'f-rent', 'f-managementFee', 'f-deposit', 'f-keyMoney',
      'f-areaTsubo', 'f-built', 'f-floor', 'f-floorsTotal', 'f-structure', 'f-address',
      'f-access', 'f-contractTerm']) {
      await page.fill('#' + id, '');
    }
    /* :checked で絞ると、外すたびに対象がずれる。全部を見て、入っているものだけ外す */
    for (const c of await page.locator('#f-features input').all()) {
      if (await c.isChecked()) await c.uncheck();
    }
    await settle(200);

    /* 検証はサイト本体と同じルールで動く */
    await page.fill('#f-id', 'CMP-9001'); await settle(150);
    const impBlank = await page.textContent('#validation');
    check('足りない項目が指摘される',
      impBlank.indexOf('物件名') !== -1 && impBlank.indexOf('面積') !== -1, impBlank);

    await page.fill('#f-title', 'テスト品川ビル 5F');
    await page.selectOption('#f-type', { index: 1 });
    await page.selectOption('#f-ward', '品川区');
    await page.fill('#f-areaTsubo', '42.5');
    await page.fill('#f-built', '2015-04');
    await page.fill('#f-contractTerm', '定期借家 5年');
    await page.fill('#f-description', '五反田駅至近のオフィスです。');
    await page.fill('#f-rent', 'abc'); await settle(150);
    check('数字でない賃料が指摘される',
      (await page.textContent('#validation')).indexOf('賃料') !== -1);
    await page.fill('#f-rent', '850000');

    /* 交通は図面どおりの文章で入れる（一括登録ツールと同じ読み取り方） */
    await page.fill('#f-access', '五反田駅の近く'); await settle(150);
    check('読み取れない交通が指摘される',
      (await page.textContent('#validation')).indexOf('交通') !== -1);
    await page.fill('#f-access', 'JR山手線・都営浅草線「五反田」駅徒歩4分'); await settle(200);
    check('図面どおりの交通が通る',
      (await page.textContent('#validation')).indexOf('問題はありません') !== -1,
      await page.textContent('#validation'));
    check('埋めれば追加できる', !(await page.isDisabled('#add-row')));

    await page.click('#add-row'); await settle(200);
    check('一覧に追加される', (await page.textContent('#rows-count')) === '1');
    check('物件番号だけ空になる',
      (await page.inputValue('#f-id')) === '' &&
      (await page.inputValue('#f-title')) === 'テスト品川ビル 5F');

    await page.fill('#f-id', 'CMP-9001'); await settle(150);
    check('同じ物件番号の重複が分かる',
      (await page.textContent('#validation')).indexOf('すでに') !== -1);

    /* 2件目。追加すると物件番号・階数・面積は空になるので入れ直す */
    await page.fill('#f-id', 'CMP-9002');
    await page.fill('#f-floor', '6F');
    await page.fill('#f-areaTsubo', '30'); await settle(200);
    check('区画だけ入れ直せば続けて追加できる', !(await page.isDisabled('#add-row')),
      await page.textContent('#validation'));

    /* 書き出したCSVが、一括登録ツールの見出しと一致する */
    await page.click('#add-row'); await settle(200);
    check('2件目が追加される', (await page.textContent('#rows-count')) === '2');
    const [impDownload] = await Promise.all([
      page.waitForEvent('download'), page.click('#download')
    ]);
    const impCsv = require('fs').readFileSync(await impDownload.path(), 'utf8');
    const impExpected = (impSchema.apiFields || impSchema.fields)
      .map(function (f) { return f.fieldId; })
      .filter(function (f) { return f !== 'photos'; }).join(',');
    check('CSVの見出しがmicroCMSの項目と一致する',
      impCsv.split('\n')[0] === impExpected, impCsv.split('\n')[0]);
    check('CSVに2件ぶん入る', impCsv.trim().split('\n').length === 3);
    check('CSVの交通が図面どおりの文章のまま',
      impCsv.indexOf('JR山手線・都営浅草線「五反田」駅徒歩4分') !== -1);

    await page.click('.imp-del'); await settle(200);
    check('一覧から削除できる', (await page.textContent('#rows-count')) === '1');

    /* ---------- コンソールエラー ---------- */
    section('コンソールエラー');
    check('サイト由来のエラーがない', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' / '));

  } finally {
    await browser.close();
    server.close();
  }

  /* 外部サービスからの取り込み（APIをモックして実行する） */
  function runSub(title, file, label) {
    section(title);
    try {
      require('child_process').execFileSync(process.execPath,
        [require('path').join(__dirname, file)], { stdio: 'pipe' });
      check(label, true);
    } catch (e) {
      check(label, false,
        String(e.stdout || '').split('\n').filter(function (l) { return l.indexOf('✗') !== -1; }).join(' / '));
    }
  }
  runSub('microCMS取り込み', 'cms.js', '物件と写真の取り込み（検証・ページ送り・エラー処理）');
  runSub('まとめて下書きに戻す', 'unpublish.js', '宛先・送る内容・失敗したときの伝えかた');
  runSub('掲載を全部止めたとき', 'empty.js', '公開中が0件でも反映できる');
  runSub('図面の読み取り', 'extract.js', '金額・面積・築年月・エリアの読み取りと、読めないものを埋めないこと');

  console.log('\n' + '='.repeat(50));
  if (failures.length) {
    console.log('失敗 ' + failures.length + '件 / 成功 ' + passed + '件');
    failures.forEach(function (f) { console.log('  ✗ ' + f); });
    process.exit(1);
  }
  console.log('すべて成功しました（' + passed + '件）');
})().catch(function (e) {
  console.error('テストの実行中にエラーが発生しました:');
  console.error(e);
  process.exit(1);
});
