/* =====================================================
   図面の文字から入力欄へ振り分ける処理の検証

   実際の募集図面によくある書き方を並べて、正しく読み取れるか、
   そして「読み取れないものを、それらしく埋めてしまわないか」を見ます。
   間違った値が入るほうが、空欄より危険なためです。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const w = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'data/properties.js'), 'utf8'))(w);
const EX = require(path.join(ROOT, 'js/extract-core.js')).create(w.PORTAL_DATA);

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function get(text, key) { return EX.extract(text).values[key]; }

console.log('\n金額の読み取り');
ok('賃料（カンマ区切り）', get('賃料：1,234,000円', 'rent') === '1234000', get('賃料：1,234,000円', 'rent'));
ok('月額賃料', get('月額賃料 850,000円', 'rent') === '850000', get('月額賃料 850,000円', 'rent'));
ok('万円の表記', get('賃料 123万円', 'rent') === '1230000', get('賃料 123万円', 'rent'));
ok('共益費', get('共益費 85,000円', 'managementFee') === '85000', get('共益費 85,000円', 'managementFee'));
ok('管理費という言い方', get('管理費 50,000円', 'managementFee') === '50000');
ok('販売価格（億と万）', get('価格 1億2,000万円', 'price') === '120000000', get('価格 1億2,000万円', 'price'));
ok('利回り', get('表面利回り 4.2%', 'yieldRate') === '4.2');
ok('敷金はヶ月で読む', get('敷金 10ヶ月', 'deposit') === '10');
ok('礼金なしは0', get('礼金 無', 'keyMoney') === '0', get('礼金 無', 'keyMoney'));

console.log('\n読み取れないものを埋めない');
/* 図面の賃料欄が坪単価のことがある。桁で気づいて入れない */
const tsuboTanka = EX.extract('賃料 25,000円/坪');
ok('坪単価らしき賃料は入れない', tsuboTanka.values.rent === undefined, tsuboTanka.values.rent);
ok('入れなかった理由を伝える',
  tsuboTanka.notes.some(n => n.indexOf('坪単価') !== -1), tsuboTanka.notes);
ok('敷金が円表記なら入れない（単位が違う）',
  get('敷金 3,000,000円', 'deposit') === undefined, get('敷金 3,000,000円', 'deposit'));
ok('空の文字は何も返さない', Object.keys(EX.extract('').values).length === 0);
ok('関係ない文章からは拾わない',
  Object.keys(EX.extract('こんにちは。よろしくお願いします。').values).length === 0,
  EX.extract('こんにちは。よろしくお願いします。').values);

console.log('\n面積');
ok('坪をそのまま使う', get('面積 42.5坪', 'areaTsubo') === '42.5');
const sqm = EX.extract('専有面積 140.5㎡');
ok('m²は坪に換算する', sqm.values.areaTsubo === '42.5', sqm.values.areaTsubo);
ok('換算したことを伝える', sqm.notes.some(n => n.indexOf('換算') !== -1), sqm.notes);
ok('坪と㎡が両方あれば坪を使う', get('140.5㎡（42.5坪）', 'areaTsubo') === '42.5',
  get('140.5㎡（42.5坪）', 'areaTsubo'));

console.log('\n築年月');
ok('西暦（年月）', get('築年月 2015年4月', 'built') === '2015-04', get('築年月 2015年4月', 'built'));
ok('スラッシュ区切り', get('1998/8 竣工', 'built') === '1998-08', get('1998/8 竣工', 'built'));
ok('平成を西暦に直す', get('平成10年8月 竣工', 'built') === '1998-08', get('平成10年8月 竣工', 'built'));
ok('令和を西暦に直す', get('令和3年5月', 'built') === '2021-05', get('令和3年5月', 'built'));
ok('昭和を西暦に直す', get('昭和60年3月', 'built') === '1985-03', get('昭和60年3月', 'built'));
const noMonth = EX.extract('築年 2015年');
ok('月が無ければ入れない', noMonth.values.built === undefined, noMonth.values.built);
ok('月が要ることを伝える', noMonth.notes.some(n => n.indexOf('月') !== -1), noMonth.notes);

console.log('\n物件名');
ok('見出し付きなら拾う', get('物件名　テスト五反田ビル', 'title') === 'テスト五反田ビル',
  get('物件名　テスト五反田ビル', 'title'));
ok('建物名という言い方', get('建物名: 恵比寿プライムスクエア', 'title') === '恵比寿プライムスクエア',
  get('建物名: 恵比寿プライムスクエア', 'title'));
ok('見出しが無ければ拾わない', get('テスト五反田ビル', 'title') === undefined,
  get('テスト五反田ビル', 'title'));

console.log('\n所在地とエリア');
ok('所在地を拾う',
  get('所在地 東京都品川区西五反田1-1-1', 'address') === '東京都品川区西五反田1-1-1',
  get('所在地 東京都品川区西五反田1-1-1', 'address'));
ok('エリアを所在地から決める', get('東京都品川区西五反田1-1-1', 'ward') === '品川区');
/* マスタは市までなので、区まで書かれていても「横浜市」に寄せる */
ok('神奈川も拾う', get('神奈川県横浜市西区北幸1-1', 'ward') === '横浜市',
  get('神奈川県横浜市西区北幸1-1', 'ward'));
ok('マスタに無い区は入れない', get('東京都○○区1-1-1', 'ward') === undefined,
  get('東京都○○区1-1-1', 'ward'));

console.log('\n交通');
ok('路線と駅と徒歩分',
  get('JR山手線「五反田」駅徒歩4分', 'access') === 'JR山手線「五反田」駅徒歩4分',
  get('JR山手線「五反田」駅徒歩4分', 'access'));
ok('かぎかっこが無くても読む',
  get('JR山手線 五反田駅 徒歩4分', 'access') === 'JR山手線「五反田」駅徒歩4分',
  get('JR山手線 五反田駅 徒歩4分', 'access'));
ok('複数路線を並べる',
  get('JR山手線「大崎」駅徒歩4分／都営浅草線「五反田」駅徒歩6分', 'access')
    === 'JR山手線「大崎」駅徒歩4分／都営浅草線「五反田」駅徒歩6分',
  get('JR山手線「大崎」駅徒歩4分／都営浅草線「五反田」駅徒歩6分', 'access'));

console.log('\n種別・条件');
ok('事務所はオフィス', get('用途 事務所', 'type') === 'オフィス');
ok('路面は店舗', get('1階路面店舗', 'type') === '店舗');
ok('倉庫', get('倉庫・物流施設', 'type') === '倉庫・工場');
ok('賃料があれば賃貸', get('賃料 500,000円', 'deal') === '賃貸');
ok('価格だけなら売買', get('価格 1億2,000万円', 'deal') === '売買', get('価格 1億2,000万円', 'deal'));
ok('構造', get('構造 SRC造', 'structure') === 'SRC造');
ok('用途地域', get('用途地域 商業地域', 'zoning') === '商業地域');
ok('建ぺい率', get('建ぺい率 80%', 'buildingCoverage') === '80');
ok('容積率', get('容積率 500%', 'floorAreaRatio') === '500');
ok('階数', get('5階', 'floor') === '5F', get('5階', 'floor'));
ok('地下', get('地下1階', 'floor') === 'B1F', get('地下1階', 'floor'));
ok('建物階数', get('地上8階建', 'floorsTotal') === '8', get('地上8階建', 'floorsTotal'));
ok('こだわり条件を拾う', (get('1階路面・居抜き・飲食可', 'features') || []).join(',') === '1階路面,居抜き,飲食可',
  get('1階路面・居抜き・飲食可', 'features'));

console.log('\n図面まるごと');
const zumen = [
  '募集図面',
  '物件名　テスト五反田ビル',
  '所在地　東京都品川区西五反田一丁目1番1号',
  '交通　　JR山手線「五反田」駅徒歩4分／都営浅草線「五反田」駅徒歩6分',
  '用途　　事務所',
  '賃料　　850,000円（税別）',
  '共益費　85,000円',
  '敷金　　10ヶ月',
  '礼金　　無',
  '面積　　140.5㎡',
  '階数　　5階／地上8階建',
  '構造　　SRC造',
  '竣工　　平成27年4月',
  '契約形態　定期借家5年',
  '設備　　エレベーター・空調更新済'
].join('\n');
const r = EX.extract(zumen);
ok('賃料', r.values.rent === '850000', r.values.rent);
ok('共益費', r.values.managementFee === '85000', r.values.managementFee);
ok('敷金', r.values.deposit === '10', r.values.deposit);
ok('礼金', r.values.keyMoney === '0', r.values.keyMoney);
ok('面積（換算）', r.values.areaTsubo === '42.5', r.values.areaTsubo);
ok('エリア', r.values.ward === '品川区', r.values.ward);
ok('種別', r.values.type === 'オフィス', r.values.type);
ok('取引種別', r.values.deal === '賃貸', r.values.deal);
ok('築年月', r.values.built === '2015-04', r.values.built);
ok('階数', r.values.floor === '5F', r.values.floor);
ok('建物階数', r.values.floorsTotal === '8', r.values.floorsTotal);
ok('構造', r.values.structure === 'SRC造', r.values.structure);
ok('交通が2駅', (r.values.access || '').split('／').length === 2, r.values.access);
ok('契約期間', (r.values.contractTerm || '').indexOf('定期借家') === 0, r.values.contractTerm);
ok('こだわり条件', (r.values.features || []).indexOf('エレベーターあり') !== -1, r.values.features);
ok('物件名', r.values.title === 'テスト五反田ビル', r.values.title);
/* 物件番号は会社が決めるものなので、図面からは拾わない */
ok('物件番号は拾わない', r.values.id === undefined, r.values.id);

/* 取り出した値が、サイトの検証を通ることまで確かめる */
console.log('\n取り出した値がサイトの検証を通るか');
const SCHEMA = require(path.join(ROOT, 'tools/lib/schema.js'));
const errors = [], warnings = [];
/* 情報更新日は画面が自動で入れるので、ここでも補う */
const vals = Object.assign({ id: 'CMP-9001', status: '募集中', updatedAt: '2026-08-05' }, r.values);
vals.features = (r.values.features || []).join(';');
SCHEMA.build(function (k) {
  if (k === 'access') return SCHEMA.encodeAccess(SCHEMA.parseAccessText(vals.access));
  return vals[k] == null ? '' : String(vals[k]);
}, '', errors, warnings);
ok('エラーが出ない', errors.length === 0, errors);

if (fail) {
  console.error('\n図面の読み取りの検証で ' + fail + '件失敗しました');
  process.exit(1);
}
