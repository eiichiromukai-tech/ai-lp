/* =====================================================
   microCMS 取り込みの検証

     node tests/cms.js

   microCMS の API をモックして tools/lib/cms.js と cms-photos.js を
   動かします。実際のmicroCMSには接続しないため、APIキーは不要です。
   npm test からも実行されます。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* 実際に掲載している写真には触れず、一時フォルダで確認する。 */
const DIR = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cms-test-'));
process.env.IMAGES_DIR = DIR;

process.env.MICROCMS_SERVICE_DOMAIN = 'https://test-portal.microcms.io/apis/properties';
process.env.MICROCMS_API_KEY = 'test-key';

/* --- microCMS 側のデータ（テストで差し替える） --- */
let contents = [];
let listStatus = 200;
const assetBody = {};

function png(seed) {
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n'), Buffer.from(seed.repeat(40))]);
}

function asset(name, seed) {
  const url = 'https://images.microcms-assets.io/assets/aaa/' + seed + '/' + name;
  assetBody[url] = png(seed);
  return url;
}

/* 検証を通る最小の物件。テストごとに一部だけ差し替える */
function record(over) {
  return Object.assign({
    id: 'cms-generated-id',
    propertyId: 'CMP-9001',
    title: 'テスト物件',
    deal: '賃貸',
    type: '店舗',
    status: '募集中',
    ward: '千代田区',
    address: '東京都千代田区神田三崎町三丁目4番9号',
    access: [{ line: 'JR中央・総武線', station: '水道橋', walk: 3 }],
    rent: 480000,
    areaTsubo: 22.4,
    contractTerm: '2年（定期借家）',
    built: '1998-08',
    features: ['1階路面', '居抜き'],
    usage: ['飲食店', '物販'],
    updatedAt: '2026-08-04T09:00:00.000Z',
    description: 'テスト用の説明です。'
  }, over || {});
}

/* --- fetch を差し替える --- */
const realFetch = global.fetch;
global.fetch = async function (url, opts) {
  const u = String(url);
  if (u.startsWith('https://test-portal.microcms.io/api/v1/properties')) {
    if ((opts || {}).headers['X-MICROCMS-API-KEY'] !== 'test-key') {
      return { ok: false, status: 401 };
    }
    if (listStatus !== 200) return { ok: false, status: listStatus };
    const params = new URL(u).searchParams;
    const offset = Number(params.get('offset') || 0);
    const limit = Number(params.get('limit') || 100);
    return {
      ok: true, status: 200,
      json: async () => ({
        contents: contents.slice(offset, offset + limit),
        totalCount: contents.length, offset, limit
      })
    };
  }
  if (assetBody[u]) {
    return { ok: true, status: 200, arrayBuffer: async () => assetBody[u] };
  }
  if (u.startsWith('https://images.microcms-assets.io/')) return { ok: false, status: 404 };
  return realFetch(url, opts);
};

const cms = require(path.join(ROOT, 'tools/lib/cms.js'));
const cmsPhotos = require(path.join(ROOT, 'tools/lib/cms-photos.js'));
const schema = require(path.join(ROOT, 'tools/lib/schema.js'));

const listImages = () => fs.readdirSync(DIR).filter(n => /\.(png|jpe?g)$/i.test(n)).sort();


let failures = 0;
function check(name, cond, detail) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : '  → ' + detail));
  if (!cond) failures++;
}

function convert(rec) {
  const errors = [], warnings = [];
  const p = schema.build(cms.getterFor(rec), '[1件目] ', errors, warnings);
  return { p, errors, warnings };
}

(async () => {
  try {
    console.log('設定の読み取り');
    check('管理画面のURLからサービス名を取り出せる',
      cms.readConfig().serviceDomain === 'test-portal', cms.readConfig().serviceDomain);
    check('設定済みと判定される', cms.isConfigured() === true);

    console.log('\n物件の取得');
    contents = [record(), record({ propertyId: 'CMP-9002' })];
    let got = await cms.fetchAll();
    check('2件取得できる', got.length === 2, String(got.length));

    console.log('\n件数が多いときのページ送り');
    contents = [];
    for (let i = 0; i < 250; i++) contents.push(record({ propertyId: 'CMP-' + (9000 + i) }));
    got = await cms.fetchAll();
    check('250件すべて取得できる', got.length === 250, String(got.length));

    console.log('\nCSVと同じ検証ルールが効く');
    let r = convert(record());
    check('正しい物件はエラーにならない', r.errors.length === 0, r.errors.join(' / '));
    check('交通が読み取れる',
      r.p.access.length === 1 && r.p.access[0].station === '水道橋', JSON.stringify(r.p.access));
    check('こだわり条件が配列で入る',
      r.p.features.join(',') === '1階路面,居抜き', String(r.p.features));
    check('都県はエリアから自動で決まる', r.p.ward === '千代田区');

    r = convert(record({ ward: '渋谷' }));
    check('エリア名の誤りを検出する',
      r.errors.some(e => /マスタにありません/.test(e)), r.errors.join(' / '));

    r = convert(record({ features: ['駅近'] }));
    check('こだわり条件の誤りを検出する',
      r.errors.some(e => /こだわり条件/.test(e)), r.errors.join(' / '));

    r = convert(record({ built: '1998年ごろ' }));
    check('築年月の形式違いを検出する',
      r.errors.some(e => /築年月/.test(e)), r.errors.join(' / '));

    r = convert(record({ contractTerm: '' }));
    check('賃貸の契約期間なしを警告する',
      r.warnings.some(w => /契約期間/.test(w)), r.warnings.join(' / '));

    r = convert(record({ deal: '売買', rent: null, price: 980000000, zoning: '' }));
    check('売買の用途地域なしを警告する',
      r.warnings.some(w => /用途地域/.test(w)), r.warnings.join(' / '));

    console.log('\n賃料が「応相談」のとき');
    /* 事業用は賃料非公開の募集が珍しくない。必須にすると1件も載らなくなる */
    r = convert(record({ rent: null }));
    check('賃料が空でもエラーにならない', r.errors.length === 0, r.errors.join(' / '));
    check('賃料は0として扱う', r.p.rent === 0, String(r.p.rent));

    r = convert(record({ deal: '売買', rent: null, price: null, zoning: '商業地域' }));
    check('販売価格が空でもエラーにならない', r.errors.length === 0, r.errors.join(' / '));

    console.log('\n情報更新日の決まりかた');
    check('通常はCMSの更新日時を使う', convert(record()).p.updatedAt === '2026-08-04');
    check('指定があればそちらを優先する',
      convert(record({ infoUpdatedAt: '2026-07-01' })).p.updatedAt === '2026-07-01');

    console.log('\n写真の取り込み');
    const wanted = [{
      id: 'CMP-9001',
      photos: [
        { url: asset('a.png', 'A'), caption: '外観' },
        { url: asset('b.png', 'B'), caption: '' }
      ]
    }];
    let w = [];
    let res = await cmsPhotos.sync(wanted, w, () => {});
    check('2枚が追加される', res.added === 2, JSON.stringify(res));
    check('キャプションがファイル名に入る',
      listImages().indexOf('CMP-9001-01_外観.png') !== -1, listImages().join(','));
    check('キャプションなしは番号だけ',
      listImages().indexOf('CMP-9001-02.png') !== -1, listImages().join(','));
    check('管理画面にない写真は消える', listImages().length === 2, listImages().join(','));

    res = await cmsPhotos.sync(wanted, w = [], () => {});
    check('2回目は再ダウンロードしない',
      res.added === 0 && res.updated === 0 && res.kept === 2, JSON.stringify(res));

    wanted[0].photos[1] = { url: asset('b2.png', 'Z'), caption: '' };
    res = await cmsPhotos.sync(wanted, w = [], () => {});
    check('差し替えを検知して更新する', res.updated === 1 && res.kept === 1, JSON.stringify(res));

    wanted[0].photos = wanted[0].photos.slice(0, 1);
    res = await cmsPhotos.sync(wanted, w = [], () => {});
    check('外した写真はサイトからも消える', res.removed === 1, JSON.stringify(res));

    wanted[0].photos = [];
    for (let i = 0; i < 12; i++) wanted[0].photos.push({ url: asset('p' + i + '.png', String(i)), caption: '' });
    res = await cmsPhotos.sync(wanted, w = [], () => {});
    check('11枚目以降は取り込まず警告する',
      listImages().length === 10 && w.some(m => /先頭10枚/.test(m)), listImages().length + ' / ' + w.join(' '));

    console.log('\nファイル名に使えない文字の扱い');
    check('キャプションの記号を落とす',
      cmsPhotos.fileNameFor('CMP-1', 0, 'A/B_C.D', 'x.jpg') === 'CMP-1-01_ABCD.jpg',
      cmsPhotos.fileNameFor('CMP-1', 0, 'A/B_C.D', 'x.jpg'));

    console.log('\n手順書と実装のずれ');
    /* フィールドIDが1つでも違うと取り込めない。手順書が実装から遅れないよう突き合わせる */
    const doc = fs.readFileSync(path.join(ROOT, 'docs/microcms-setup.md'), 'utf8');
    const src = fs.readFileSync(path.join(ROOT, 'tools/lib/cms.js'), 'utf8');
    const ids = (src.match(/^\s{2}\w+: '(\w+)',?$/gm) || [])
      .map(l => /'(\w+)'/.exec(l)[1])
      .concat(['access', 'photos', 'image', 'caption', 'line', 'station', 'walk', 'infoUpdatedAt']);
    const missing = [...new Set(ids)].filter(id => doc.indexOf('`' + id + '`') === -1);
    check('全フィールドIDが手順書に載っている', missing.length === 0, missing.join(', '));

    /* 読み込ませるスキーマ定義が、コードの期待と一致しているか */
    const gen = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/microcms-schema.json'), 'utf8'));
    const have = gen.apiFields.map(f => f.fieldId);
    const lacking = [...new Set(ids)].filter(id =>
      have.indexOf(id) === -1 &&
      [].concat(...gen.customFields.map(c => c.fields.map(f => f.fieldId))).indexOf(id) === -1);
    check('スキーマ定義に全フィールドがある', lacking.length === 0, lacking.join(', '));
    check('フィールドIDが重複していない', new Set(have).size === have.length);

    const masters = require(path.join(ROOT, 'tools/lib/schema.js')).MASTERS;
    const wardField = gen.apiFields.find(f => f.fieldId === 'ward');
    check('スキーマ定義のエリアがマスタと一致する',
      wardField.selectItems.map(i => i.value).join() === masters.areas.join(),
      wardField.selectItems.length + ' / ' + masters.areas.length);
    check('エリアの選択肢が手順書と一致する',
      masters.areas.every(a => new RegExp('^' + a + '$', 'm').test(doc)),
      masters.areas.filter(a => !new RegExp('^' + a + '$', 'm').test(doc)).join(','));
    check('こだわり条件の選択肢が手順書と一致する',
      masters.features.every(f => new RegExp('^' + f + '$', 'm').test(doc)),
      masters.features.filter(f => !new RegExp('^' + f + '$', 'm').test(doc)).join(','));

    /* 運用マニュアルの数字が実装とずれると、現場の判断を誤らせる */
    function cronToText(c) {
      const every = /^\*\/(\d+) \* \* \* \*$/.exec(c);
      if (every) return every[1] + '分おき';
      if (/^0 \* \* \* \*$/.test(c)) return '1時間おき';
      return c;   /* 想定外の書き方はそのまま探して落とす */
    }
    const man = fs.readFileSync(path.join(ROOT, 'MANUAL.md'), 'utf8');
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/sync-cms.yml'), 'utf8');
    const cron = /cron: '([^']+)'/.exec(wf)[1];
    check('マニュアルの反映間隔がワークフローと一致する',
      man.indexOf(cronToText(cron)) !== -1, cron + ' → ' + cronToText(cron));
    check('マニュアルの写真上限が実装と一致する',
      man.indexOf(cmsPhotos.MAX_PER_PROPERTY + '枚まで') !== -1,
      String(cmsPhotos.MAX_PER_PROPERTY));
    check('マニュアルに物件種別がすべて載っている',
      masters.types.every(t => man.indexOf(t.label) !== -1),
      masters.types.filter(t => man.indexOf(t.label) === -1).map(t => t.label).join(','));
    check('マニュアルにこだわり条件がすべて載っている',
      masters.features.every(f => man.indexOf(f) !== -1),
      masters.features.filter(f => man.indexOf(f) === -1).join(','));
    check('マニュアルに移行前の記述が残っていない',
      !/Webhook|スプレッドシート|GitHubにアップロード/.test(man),
      (man.match(/Webhook|スプレッドシート|GitHubにアップロード/g) || []).join(','));

    console.log('\nエラーの伝えかた');
    listStatus = 401;
    let msg = '';
    try { await cms.fetchAll(); } catch (e) { msg = e.message; }
    check('APIキーの誤りを分かる形で伝える', /MICROCMS_API_KEY/.test(msg), msg);

    listStatus = 404;
    msg = '';
    try { await cms.fetchAll(); } catch (e) { msg = e.message; }
    check('API名の誤りを分かる形で伝える', /API名/.test(msg), msg);
    listStatus = 200;
  } finally {
    fs.rmSync(DIR, { recursive: true, force: true });
    global.fetch = realFetch;
  }

  if (failures) {
    console.error('\nmicroCMS取り込みの検証で ' + failures + '件失敗しました');
    process.exit(1);
  }
})();
