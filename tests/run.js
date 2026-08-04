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
const server = require('../tools/serve.js');

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
    if (!EXTERNAL.test(r.url())) consoleErrors.push('REQFAIL: ' + r.url());
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

    /* ---------- お問い合わせ ---------- */
    section('お問い合わせフォーム');
    await go('/property.html?id=CMP-1001'); await settle(700);
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
      (await page.locator('body').textContent()).indexOf('eiichiro.mukai@remax-agt.net') !== -1);
    await go('/owner.html'); await settle(400);
    check('オーナー向けページがある', (await page.locator('h1').count()) === 1);
    await go('/contact.html'); await settle(500);
    check('お問い合わせページに同意欄がある', await page.locator('#c-consent').count() === 1);

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

    /* ---------- コンソールエラー ---------- */
    section('コンソールエラー');
    check('サイト由来のエラーがない', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' / '));

  } finally {
    await browser.close();
    server.close();
  }

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
