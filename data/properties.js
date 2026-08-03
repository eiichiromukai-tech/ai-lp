/* =====================================================
   物件データ（デモ用サンプル）
   -----------------------------------------------------
   ※ 掲載している物件はすべて架空のサンプルデータです。
     実際の募集物件ではありません。運用時はこのファイルを
     CMS / API からの取得に差し替えてください。

   金額は円（月額）、面積は坪 / m² を保持します。
   ===================================================== */
(function (global) {
  'use strict';

  var DEAL_TYPES = [
    { value: 'rent', label: '賃貸' },
    { value: 'sale', label: '売買' }
  ];

  var PROPERTY_TYPES = [
    { value: 'shop', label: '店舗' },
    { value: 'office', label: 'オフィス' },
    { value: 'warehouse', label: '倉庫・工場' },
    { value: 'building', label: '一棟ビル' },
    { value: 'land', label: '事業用地' }
  ];

  var FEATURES = [
    '1階路面', '居抜き', 'スケルトン', '飲食可', '深夜営業可', '24時間利用可',
    '駐車場あり', '駅徒歩5分以内', 'エレベーターあり', '空調更新済', '看板設置可', 'セットアップ'
  ];

  /* 対応エリアは一都三県。東京都は23区と26市のすべて、3県は事業用不動産の
     需要がある主要市。市区を増やすときは AREA_MASTER の該当する都県に
     追加してください（市区名から都県が自動で決まります）。 */
  var PREFECTURES = [
    { value: 'tokyo', label: '東京都' },
    { value: 'kanagawa', label: '神奈川県' },
    { value: 'saitama', label: '埼玉県' },
    { value: 'chiba', label: '千葉県' }
  ];

  /* 値は市区名の配列。東京都のように数が多い都県は
     { 小見出し: [市区名…] } と書くと、絞り込みで小見出しごとに分かれます。 */
  var AREA_MASTER = {
    tokyo: {
      '23区': [
        '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
        '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区',
        '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
      ],
      '多摩・市部': [
        '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市', '府中市', '昭島市', '調布市',
        '町田市', '小金井市', '小平市', '日野市', '東村山市', '国分寺市', '国立市', '福生市',
        '狛江市', '東大和市', '清瀬市', '東久留米市', '武蔵村山市', '多摩市', '稲城市',
        '羽村市', 'あきる野市', '西東京市'
      ]
    },
    kanagawa: [
      '横浜市', '川崎市', '相模原市', '藤沢市', '厚木市', '海老名市',
      '大和市', '平塚市', '茅ヶ崎市', '鎌倉市', '横須賀市', '小田原市'
    ],
    saitama: [
      'さいたま市', '川口市', '川越市', '所沢市', '越谷市', '草加市',
      '春日部市', '上尾市', '戸田市', '新座市', '熊谷市'
    ],
    chiba: [
      '千葉市', '船橋市', '柏市', '松戸市', '市川市', '浦安市',
      '習志野市', '流山市', '八千代市', '木更津市', '成田市'
    ]
  };

  /* 配列でも { 小見出し: [...] } でも受け取れるように [{label, areas}] へ揃える */
  function toSections(value) {
    if (Array.isArray(value)) return [{ label: '', areas: value }];
    return Object.keys(value).map(function (k) { return { label: k, areas: value[k] }; });
  }

  /* 都県 → 小見出しの一覧、市区名 → 都県 の逆引きをまとめて作る */
  var AREA_SECTIONS = {};
  var AREA_PREF = {};
  PREFECTURES.forEach(function (pref) {
    var sections = toSections(AREA_MASTER[pref.value] || []);
    AREA_SECTIONS[pref.value] = sections;
    sections.forEach(function (sec) {
      sec.areas.forEach(function (name) { AREA_PREF[name] = pref.value; });
    });
  });

  /* 市区名のフラットな一覧（掲載順は都県順） */
  var AREAS = PREFECTURES.reduce(function (acc, pref) {
    return AREA_SECTIONS[pref.value].reduce(function (list, sec) {
      return list.concat(sec.areas);
    }, acc);
  }, []);

  /* === PROPERTIES:BEGIN =========================================
     この配列は tools/csv-to-properties.js が data/properties.csv から
     生成します。スプレッドシート運用中は直接編集しないでください。
     ============================================================= */
  var PROPERTIES = [
    {
      id: 'CMP-1001',
      title: '神田三崎町 1階路面店舗（居抜き）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田三崎町三丁目',
      access: [
        { line: 'JR中央・総武線', station: '水道橋', walk: 3 },
        { line: '都営三田線', station: '水道橋', walk: 5 }
      ],
      rent: 480000, managementFee: 35000, deposit: 10, keyMoney: 0,
      areaTsubo: 22.4,
      floor: '1F',
      floorsTotal: 8,
      builtYear: 1998,
      structure: 'SRC造',
      features: ['1階路面', '居抜き', '飲食可', '看板設置可', '駅徒歩5分以内'],
      usage: ['飲食店', '物販', 'サービス'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-30',
      description: '水道橋駅から徒歩3分、大学・オフィスが集積するエリアの1階路面店舗です。前テナントは和食業態で、厨房設備・ダクトを居抜きで引き継げるため初期投資を抑えた出店が可能です。間口が広く視認性に優れ、平日はオフィスワーカーと学生、週末は東京ドーム周辺の来街者を取り込めます。'
    },
    {
      id: 'CMP-1002',
      title: '丸の内 ハイグレードオフィス 6F',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区丸の内二丁目',
      access: [
        { line: 'JR各線', station: '東京', walk: 4 },
        { line: '東京メトロ千代田線', station: '二重橋前', walk: 2 }
      ],
      rent: 3850000, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 110,
      floor: '6F',
      floorsTotal: 22,
      builtYear: 2015,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2026年10月',
      updatedAt: '2026-07-12',
      description: '東京駅至近、丸の内エリアのハイグレードビル6階フロアです。無柱空間で天井高2,800mm、OAフロア100mm、個別空調。共用部のグレードが高く、来訪の多い企業の本社機能に適します。基準階一括での賃貸が可能です。'
    },
    {
      id: 'CMP-1003',
      title: '銀座並木通り 2F 路面近接店舗',
      deal: 'rent',
      type: 'shop',
      status: 'negotiating',
      ward: '中央区',
      address: '東京都中央区銀座六丁目',
      access: [
        { line: '東京メトロ銀座線', station: '銀座', walk: 2 },
        { line: 'JR山手線', station: '有楽町', walk: 7 }
      ],
      rent: 1650000, managementFee: 120000, deposit: 12, keyMoney: 0,
      areaTsubo: 34.8,
      floor: '2F',
      floorsTotal: 9,
      builtYear: 2006,
      structure: 'S造',
      features: ['飲食可', '看板設置可', '駅徒歩5分以内', 'エレベーターあり'],
      usage: ['飲食店', '物販', 'クリニック'],
      availableFrom: '相談',
      updatedAt: '2026-07-07',
      description: '銀座並木通りに面したビルの2階区画。1階エントランスからの視認性が高く、外部看板の設置が可能です。ハイブランド路面店が並ぶ通りで、ブランド発信を伴う出店に適したロケーションです。'
    },
    {
      id: 'CMP-1004',
      title: '西新宿 セットアップオフィス 11F',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '新宿区',
      address: '東京都新宿区西新宿六丁目',
      access: [
        { line: '都営大江戸線', station: '都庁前', walk: 4 },
        { line: 'JR各線', station: '新宿', walk: 9 }
      ],
      rent: 1420000, managementFee: 96000, deposit: 10, keyMoney: 0,
      areaTsubo: 58.2,
      floor: '11F',
      floorsTotal: 20,
      builtYear: 2011,
      structure: 'SRC造',
      features: ['セットアップ', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-29',
      description: '会議室3室・執務席48席・フリーアドレスエリアを備えたセットアップオフィス。内装・什器付きのため、工事期間なしで事業を開始できます。新宿中央公園を望む眺望。'
    },
    {
      id: 'CMP-1005',
      title: '青山通り 路面区画（スケルトン）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '港区',
      address: '東京都港区北青山三丁目',
      access: [
        { line: '東京メトロ銀座線', station: '表参道', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '表参道', walk: 3 }
      ],
      rent: 2200000, managementFee: 150000, deposit: 12, keyMoney: 2,
      areaTsubo: 41.5,
      floor: '1F',
      floorsTotal: 5,
      builtYear: 2003,
      structure: 'RC造',
      features: ['1階路面', 'スケルトン', '飲食可', '看板設置可', '駅徒歩5分以内'],
      usage: ['物販', '飲食店', 'サービス'],
      availableFrom: '2026年9月',
      updatedAt: '2026-06-27',
      description: '青山通り沿い、表参道交差点から徒歩圏の1階路面区画です。スケルトン渡しのため、ブランドの世界観に合わせた自由な設計が可能。ファサードの間口8.5m、天井高3,600mm。'
    },
    {
      id: 'CMP-1006',
      title: '渋谷宮益坂 飲食居抜き 地下1F',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区渋谷一丁目',
      access: [
        { line: 'JR各線', station: '渋谷', walk: 5 },
        { line: '東京メトロ銀座線', station: '渋谷', walk: 4 }
      ],
      rent: 620000, managementFee: 40000, deposit: 10, keyMoney: 0,
      areaTsubo: 28,
      floor: 'B1F',
      floorsTotal: 6,
      builtYear: 1991,
      structure: 'SRC造',
      features: ['居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内'],
      usage: ['飲食店', 'バー'],
      availableFrom: '即入居可',
      updatedAt: '2026-06-22',
      description: '宮益坂沿いのビル地下1階、バー業態の居抜き区画です。カウンター・厨房・音響設備をそのまま引き継げます。深夜営業可、周辺は夜間人口の多いエリアです。'
    },
    {
      id: 'CMP-1007',
      title: '五反田 バックオフィス向け 8F',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区西五反田二丁目',
      access: [
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '大崎広小路', walk: 4 }
      ],
      rent: 780000, managementFee: 62000, deposit: 10, keyMoney: 0,
      areaTsubo: 46,
      floor: '8F',
      floorsTotal: 10,
      builtYear: 2004,
      structure: 'S造',
      features: ['エレベーターあり', '空調更新済', '24時間利用可'],
      usage: ['事務所'],
      availableFrom: '2026年8月',
      updatedAt: '2026-06-17',
      description: '五反田駅から徒歩6分、コストバランスに優れたオフィス区画です。ワンフロア貸しで間仕切りなし、OAフロア対応。スタートアップの拡張移転やバックオフィス集約に適します。'
    },
    {
      id: 'CMP-1008',
      title: '江東区新木場 物流倉庫（低温対応）',
      deal: 'rent',
      type: 'warehouse',
      status: 'available',
      ward: '江東区',
      address: '東京都江東区新木場二丁目',
      access: [
        { line: 'JR京葉線', station: '新木場', walk: 12 }
      ],
      rent: 2850000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 310,
      floor: '1F',
      floorsTotal: 3,
      builtYear: 2009,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '軽作業'],
      availableFrom: '2026年11月',
      updatedAt: '2026-06-12',
      description: '首都高速湾岸線 新木場ICから約1.5km。荷捌きスペースと大型車の接車バースを確保。一部低温区画あり、床荷重1.5t/m²、有効天井高5.5m。24時間稼働可能です。'
    },
    {
      id: 'CMP-1009',
      title: '池袋東口 2F 物販・サービス区画',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '豊島区',
      address: '東京都豊島区南池袋一丁目',
      access: [
        { line: 'JR各線', station: '池袋', walk: 3 },
        { line: '東京メトロ有楽町線', station: '東池袋', walk: 6 }
      ],
      rent: 890000, managementFee: 70000, deposit: 10, keyMoney: 1,
      areaTsubo: 37.2,
      floor: '2F',
      floorsTotal: 7,
      builtYear: 2000,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['物販', 'サービス', 'スクール'],
      availableFrom: '即入居可',
      updatedAt: '2026-06-07',
      description: '池袋東口の繁華街に位置する2階区画。1階に飲食テナントが入る視認性の高いビルで、サロン・スクール・クリニック等の集客型サービス業態に適します。'
    },
    {
      id: 'CMP-1010',
      title: '浅草雷門通り 一棟ビル（4層）',
      deal: 'rent',
      type: 'building',
      status: 'available',
      ward: '台東区',
      address: '東京都台東区雷門二丁目',
      access: [
        { line: '東京メトロ銀座線', station: '浅草', walk: 4 },
        { line: '都営浅草線', station: '浅草', walk: 5 }
      ],
      rent: 2400000, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 96,
      floor: '1F-4F',
      floorsTotal: 4,
      builtYear: 1996,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '看板設置可', '駅徒歩5分以内'],
      usage: ['飲食店', '物販', '宿泊'],
      availableFrom: '相談',
      updatedAt: '2026-07-31',
      description: '雷門通りに面した4層の一棟貸しビルです。インバウンド需要の高いエリアで、飲食・物販の複合利用や宿泊業態への転用実績のある立地。1階は路面店舗として運用可能です。'
    },
    {
      id: 'CMP-1011',
      title: '中目黒 高架下 小規模路面店舗',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '目黒区',
      address: '東京都目黒区上目黒一丁目',
      access: [
        { line: '東急東横線', station: '中目黒', walk: 2 },
        { line: '東京メトロ日比谷線', station: '中目黒', walk: 2 }
      ],
      rent: 385000, managementFee: 25000, deposit: 10, keyMoney: 0,
      areaTsubo: 14.6,
      floor: '1F',
      floorsTotal: 1,
      builtYear: 2016,
      structure: 'S造',
      features: ['1階路面', 'スケルトン', '飲食可', '駅徒歩5分以内'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      updatedAt: '2026-05-28',
      description: '中目黒駅から徒歩2分、感度の高い個店が集まるエリアの小規模路面区画です。10〜16坪の業態に適したサイズ感で、テイクアウト主体のカフェやベーカリーの出店に向いています。'
    },
    {
      id: 'CMP-1012',
      title: '三軒茶屋 2F スクール・サロン向け',
      deal: 'rent',
      type: 'shop',
      status: 'closed',
      ward: '世田谷区',
      address: '東京都世田谷区太子堂四丁目',
      access: [
        { line: '東急田園都市線', station: '三軒茶屋', walk: 4 }
      ],
      rent: 320000, managementFee: 20000, deposit: 8, keyMoney: 0,
      areaTsubo: 19.8,
      floor: '2F',
      floorsTotal: 5,
      builtYear: 1999,
      structure: 'RC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['サービス', 'スクール', 'クリニック'],
      availableFrom: '2026年9月',
      updatedAt: '2026-05-23',
      description: '三軒茶屋駅から徒歩4分、住宅地と商店街の接点にある2階区画。地域密着型のサロン・教室・治療院に適したサイズと賃料水準です。'
    },
    {
      id: 'CMP-1013',
      title: '日本橋室町 オフィス 4F（分割可）',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区日本橋室町三丁目',
      access: [
        { line: '東京メトロ銀座線', station: '三越前', walk: 3 },
        { line: 'JR総武快速線', station: '新日本橋', walk: 4 }
      ],
      rent: 1180000, managementFee: 88000, deposit: 12, keyMoney: 0,
      areaTsubo: 52.5,
      floor: '4F',
      floorsTotal: 11,
      builtYear: 2008,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可'],
      usage: ['事務所'],
      availableFrom: '即入居可',
      updatedAt: '2026-05-18',
      description: '日本橋室町の再開発エリアに隣接するオフィスビル4階。約26坪ずつの分割貸しにも対応可能です。金融・法務系のテナントが多く入居しています。'
    },
    {
      id: 'CMP-1014',
      title: '錦糸町 大型飲食区画 1F・B1F',
      deal: 'rent',
      type: 'shop',
      status: 'negotiating',
      ward: '墨田区',
      address: '東京都墨田区江東橋三丁目',
      access: [
        { line: 'JR総武線', station: '錦糸町', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '錦糸町', walk: 5 }
      ],
      rent: 1250000, managementFee: 90000, deposit: 10, keyMoney: 0,
      areaTsubo: 68,
      floor: '1F・B1F',
      floorsTotal: 6,
      builtYear: 1994,
      structure: 'SRC造',
      features: ['1階路面', '居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内'],
      usage: ['飲食店'],
      availableFrom: '相談',
      updatedAt: '2026-05-13',
      description: '錦糸町駅南口の繁華街に位置する1階＋地下1階の大型飲食区画です。前テナントは大箱居酒屋で、厨房・客席什器の一部を引き継げます。宴会需要の見込める立地。'
    },
    {
      id: 'CMP-1015',
      title: '大井町 事業用地（約180坪）',
      deal: 'rent',
      type: 'land',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東大井五丁目',
      access: [
        { line: 'JR京浜東北線', station: '大井町', walk: 8 }
      ],
      rent: 1450000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 182,
      floor: '—',
      floorsTotal: 0,
      builtYear: null,
      structure: '更地',
      features: ['駐車場あり', '24時間利用可'],
      usage: ['店舗', '駐車場', '事業用建物'],
      availableFrom: '2026年12月',
      updatedAt: '2026-05-08',
      description: '幹線道路に接道する約180坪の事業用地です。建築条件なしの定期借地でのご提案が可能。ロードサイド店舗・コインパーキング・事業所建設などの用途を想定しています。'
    },
    {
      id: 'CMP-1016',
      title: '恵比寿 デザイナーズオフィス 3F',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区恵比寿西一丁目',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 4 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 5 }
      ],
      rent: 940000, managementFee: 60000, deposit: 10, keyMoney: 0,
      areaTsubo: 38.4,
      floor: '3F',
      floorsTotal: 6,
      builtYear: 2018,
      structure: 'RC造',
      features: ['セットアップ', '駅徒歩5分以内', 'エレベーターあり', '空調更新済'],
      usage: ['事務所', 'ショールーム'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-28',
      description: '恵比寿駅西口から徒歩4分、築浅のデザイナーズビル3階区画。天井現し・大開口サッシで採光良好。クリエイティブ職やショールーム併設のオフィス利用に適します。'
    },
    {
      id: 'CMP-1017',
      title: '田町 ロードサイド倉庫兼事務所',
      deal: 'rent',
      type: 'warehouse',
      status: 'available',
      ward: '港区',
      address: '東京都港区芝浦四丁目',
      access: [
        { line: 'JR山手線', station: '田町', walk: 11 }
      ],
      rent: 1380000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 120,
      floor: '1F・2F',
      floorsTotal: 2,
      builtYear: 2001,
      structure: 'S造',
      features: ['駐車場あり', '24時間利用可'],
      usage: ['倉庫', '事務所', '軽作業'],
      availableFrom: '即入居可',
      updatedAt: '2026-04-28',
      description: '1階倉庫＋2階事務所の一体利用が可能な物件です。都心配送の拠点として利便性が高く、シャッター高3.5m、2t車の接車が可能。駐車スペース3台分付き。'
    },
    {
      id: 'CMP-1018',
      title: '神保町 古書店街 1F小型区画',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田神保町二丁目',
      access: [
        { line: '都営三田線', station: '神保町', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '神保町', walk: 3 }
      ],
      rent: 265000, managementFee: 18000, deposit: 10, keyMoney: 0,
      areaTsubo: 11.2,
      floor: '1F',
      floorsTotal: 5,
      builtYear: 1988,
      structure: 'RC造',
      features: ['1階路面', 'スケルトン', '駅徒歩5分以内', '看板設置可'],
      usage: ['物販', 'カフェ', 'ギャラリー'],
      availableFrom: '即入居可',
      updatedAt: '2026-04-23',
      description: '神保町の古書店街に面した11坪の1階区画です。小型のカフェ・ギャラリー・セレクトショップに適したサイズ感で、周辺は文化的な回遊性の高いエリアです。'
    },
    {
      id: 'CMP-1019',
      title: '新橋 飲食ビル 3F 居抜き',
      deal: 'rent',
      type: 'shop',
      status: 'closed',
      ward: '港区',
      address: '東京都港区新橋三丁目',
      access: [
        { line: 'JR各線', station: '新橋', walk: 4 },
        { line: '都営浅草線', station: '新橋', walk: 3 }
      ],
      rent: 430000, managementFee: 30000, deposit: 10, keyMoney: 0,
      areaTsubo: 24,
      floor: '3F',
      floorsTotal: 8,
      builtYear: 1990,
      structure: 'SRC造',
      features: ['居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内', 'エレベーターあり'],
      usage: ['飲食店'],
      availableFrom: '即入居可',
      updatedAt: '2026-04-18',
      description: '新橋の飲食ビル3階、和食業態の居抜き区画です。厨房・カウンター・個室をそのまま利用でき、開業までの期間を大幅に短縮できます。ビル全体が飲食テナントで構成されています。'
    },
    {
      id: 'CMP-1020',
      title: '豊洲 大型オフィス ワンフロア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '江東区',
      address: '東京都江東区豊洲三丁目',
      access: [
        { line: '東京メトロ有楽町線', station: '豊洲', walk: 5 },
        { line: 'ゆりかもめ', station: '豊洲', walk: 5 }
      ],
      rent: 4200000, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 240,
      floor: '14F',
      floorsTotal: 24,
      builtYear: 2013,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2027年1月',
      updatedAt: '2026-04-13',
      description: '豊洲エリアの大規模オフィスビル、基準階240坪のワンフロア区画です。無柱空間・OAフロア150mm・個別空調。BCP対応の非常用発電機を備えます。本社機能の集約に適した規模です。'
    },
    {
      id: 'CMP-1021',
      title: '下北沢 2F カフェ居抜き',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '世田谷区',
      address: '東京都世田谷区北沢二丁目',
      access: [
        { line: '京王井の頭線', station: '下北沢', walk: 3 },
        { line: '小田急線', station: '下北沢', walk: 4 }
      ],
      rent: 298000, managementFee: 22000, deposit: 8, keyMoney: 0,
      areaTsubo: 17.5,
      floor: '2F',
      floorsTotal: 4,
      builtYear: 1997,
      structure: 'RC造',
      features: ['居抜き', '飲食可', '駅徒歩5分以内'],
      usage: ['飲食店', 'カフェ'],
      availableFrom: '即入居可',
      updatedAt: '2026-04-08',
      description: '下北沢駅から徒歩3分、カフェ居抜きの2階区画です。厨房設備・カウンター・客席什器付き。若年層の回遊が多く、個性のある業態と親和性の高いエリアです。'
    },
    {
      id: 'CMP-1022',
      title: '押上 一棟ビル（テナント付き）',
      deal: 'rent',
      type: 'building',
      status: 'available',
      ward: '墨田区',
      address: '東京都墨田区押上一丁目',
      access: [
        { line: '東京メトロ半蔵門線', station: '押上', walk: 6 }
      ],
      rent: 1780000, managementFee: 0, deposit: 10, keyMoney: 0,
      areaTsubo: 88,
      floor: '1F-5F',
      floorsTotal: 5,
      builtYear: 2005,
      structure: 'RC造',
      features: ['1階路面', 'エレベーターあり', '看板設置可'],
      usage: ['事務所', '店舗', '複合'],
      availableFrom: '相談',
      updatedAt: '2026-04-03',
      description: '東京スカイツリー至近の5層一棟ビル。現況で2フロアにテナントが入居しており、収益を確保しながらの取得・一棟借りが可能です。1階は路面店舗として稼働中。'
    },
    {
      id: 'CMP-1023',
      title: '高田馬場 スクール向け 3F',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '新宿区',
      address: '東京都新宿区高田馬場二丁目',
      access: [
        { line: 'JR山手線', station: '高田馬場', walk: 5 },
        { line: '西武新宿線', station: '高田馬場', walk: 5 }
      ],
      rent: 520000, managementFee: 38000, deposit: 10, keyMoney: 0,
      areaTsubo: 32,
      floor: '3F',
      floorsTotal: 7,
      builtYear: 1995,
      structure: 'SRC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['スクール', '事務所', 'サービス'],
      availableFrom: '2026年9月',
      updatedAt: '2026-03-29',
      description: '学生の多い高田馬場エリア、駅徒歩5分の3階区画です。教室利用を想定した間取りで、スクール・予備校・研修施設に適します。'
    },
    {
      id: 'CMP-1024',
      title: '築地 生鮮対応 1F区画',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区築地六丁目',
      access: [
        { line: '東京メトロ日比谷線', station: '築地', walk: 7 },
        { line: '都営大江戸線', station: '築地市場', walk: 5 }
      ],
      rent: 560000, managementFee: 42000, deposit: 10, keyMoney: 0,
      areaTsubo: 26.3,
      floor: '1F',
      floorsTotal: 6,
      builtYear: 2002,
      structure: 'RC造',
      features: ['1階路面', '居抜き', '飲食可', '看板設置可'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-27',
      description: '築地エリアの1階路面区画です。給排水・グリストラップ完備で生鮮を扱う業態にも対応。観光需要と近隣オフィス需要の両方を取り込める立地です。'
    },
    {
      id: 'CMP-2001',
      title: '神田錦町 一棟オフィスビル（満室稼働中）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田錦町二丁目',
      access: [
        { line: '東京メトロ半蔵門線', station: '神保町', walk: 5 },
        { line: '都営新宿線', station: '小川町', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 980000000,
      yieldRate: 4.2,
      tenure: '所有権',
      areaTsubo: 420,
      floor: '1F-8F',
      floorsTotal: 8,
      builtYear: 2007,
      structure: 'SRC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可'],
      usage: ['事務所', '店舗'],
      availableFrom: '相談',
      updatedAt: '2026-07-31',
      description: '神保町・小川町の2駅が使える立地の一棟オフィスビルです。現況は満室稼働中で、テナントは事務所5社と1階店舗1店。長期入居のテナントが中心で稼働は安定しています。レントロール・修繕履歴は個別にご開示します。'
    },
    {
      id: 'CMP-2002',
      title: '日本橋 区分オフィス 7F（投資用）',
      deal: 'sale',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区日本橋本町三丁目',
      access: [
        { line: 'JR総武快速線', station: '新日本橋', walk: 3 },
        { line: '東京メトロ銀座線', station: '三越前', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 168000000,
      yieldRate: 4.6,
      tenure: '所有権',
      areaTsubo: 48.5,
      floor: '7F',
      floorsTotal: 12,
      builtYear: 2012,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2026年10月',
      updatedAt: '2026-07-28',
      description: '日本橋エリアの区分所有オフィスです。現テナントは賃貸借契約継続中で、オーナーチェンジでの引渡しとなります。管理体制の整ったビルで、初めての区分投資にも適した規模です。'
    },
    {
      id: 'CMP-2003',
      title: '表参道 路面店舗ビル（3層）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '港区',
      address: '東京都港区南青山五丁目',
      access: [
        { line: '東京メトロ銀座線', station: '表参道', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 1450000000,
      yieldRate: 3.4,
      tenure: '所有権',
      areaTsubo: 186,
      floor: '1F-3F',
      floorsTotal: 3,
      builtYear: 2014,
      structure: 'RC造',
      features: ['1階路面', '駅徒歩5分以内', '看板設置可'],
      usage: ['店舗', '物販'],
      availableFrom: '相談',
      updatedAt: '2026-07-25',
      description: '南青山の商業集積エリアに立地する3層の店舗ビルです。1階は路面店として視認性が高く、アパレル・飲食いずれの業態でも高い集客が見込めます。希少性の高い立地のため利回りは低めですが、資産性を重視する取得に向きます。'
    },
    {
      id: 'CMP-2004',
      title: '大森 事業用地（約240坪・建築条件なし）',
      deal: 'sale',
      type: 'land',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区南大井四丁目',
      access: [
        { line: 'JR京浜東北線', station: '大森', walk: 9 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 620000000,
      yieldRate: 0,
      tenure: '所有権',
      areaTsubo: 240,
      floor: '—',
      floorsTotal: 0,
      builtYear: null,
      structure: '更地',
      features: ['駐車場あり'],
      usage: ['事業用建物', '店舗', '倉庫'],
      availableFrom: '即引渡し可',
      updatedAt: '2026-07-22',
      description: '幹線道路に接道する約240坪の事業用地です。建築条件はなく、ロードサイド店舗・物流拠点・事業所いずれの用途にも対応できます。整形地で分割検討も可能です。'
    },
    {
      id: 'CMP-2005',
      title: '錦糸町 一棟店舗ビル（テナント付き）',
      deal: 'sale',
      type: 'building',
      status: 'negotiating',
      ward: '墨田区',
      address: '東京都墨田区江東橋四丁目',
      access: [
        { line: 'JR総武線', station: '錦糸町', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 445000000,
      yieldRate: 6.8,
      tenure: '所有権',
      areaTsubo: 168,
      floor: '1F-5F',
      floorsTotal: 5,
      builtYear: 1998,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '深夜営業可', '駅徒歩5分以内'],
      usage: ['飲食店', '店舗'],
      availableFrom: '相談',
      updatedAt: '2026-07-19',
      description: '錦糸町駅南口の繁華街に立地する5層の店舗ビルです。飲食テナントが各階に入居しており、利回りは6%台後半。築年は経過していますが、外壁と屋上防水は改修済みです。'
    },
    {
      id: 'CMP-2006',
      title: '西新宿 区分オフィス 15F（自社利用可）',
      deal: 'sale',
      type: 'office',
      status: 'available',
      ward: '新宿区',
      address: '東京都新宿区西新宿七丁目',
      access: [
        { line: 'JR各線', station: '新宿', walk: 8 },
        { line: '東京メトロ丸ノ内線', station: '西新宿', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 232000000,
      yieldRate: 4.1,
      tenure: '所有権',
      areaTsubo: 62,
      floor: '15F',
      floorsTotal: 21,
      builtYear: 2010,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '即引渡し可',
      updatedAt: '2026-07-16',
      description: '空室での引渡しとなるため、自社オフィスとしての利用も投資用の賃貸運用も選べます。15階からの眺望が良く、採用面でも訴求しやすい物件です。'
    },
    {
      id: 'CMP-2007',
      title: '浅草 一棟ビル（インバウンド立地）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '台東区',
      address: '東京都台東区浅草二丁目',
      access: [
        { line: '東京メトロ銀座線', station: '浅草', walk: 6 },
        { line: 'つくばエクスプレス', station: '浅草', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 386000000,
      yieldRate: 5.9,
      tenure: '所有権',
      areaTsubo: 132,
      floor: '1F-4F',
      floorsTotal: 4,
      builtYear: 2004,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '看板設置可'],
      usage: ['店舗', '飲食店', '宿泊'],
      availableFrom: '相談',
      updatedAt: '2026-07-13',
      description: '浅草寺周辺の観光動線上に立地する4層の一棟ビルです。物販・飲食に加え、宿泊業態への転用実績もあるエリアです。インバウンド需要の回復により周辺の店舗稼働は堅調に推移しています。'
    },
    {
      id: 'CMP-2008',
      title: '中目黒 店舗付き一棟（デザイナーズ）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '目黒区',
      address: '東京都目黒区青葉台一丁目',
      access: [
        { line: '東急東横線', station: '中目黒', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 528000000,
      yieldRate: 4.4,
      tenure: '所有権',
      areaTsubo: 148,
      floor: '1F-4F',
      floorsTotal: 4,
      builtYear: 2019,
      structure: 'RC造',
      features: ['1階路面', '飲食可', 'エレベーターあり', '空調更新済'],
      usage: ['店舗', '事務所'],
      availableFrom: '相談',
      updatedAt: '2026-07-10',
      description: '築浅のデザイナーズ一棟ビルです。1階はカフェ、2階以上は事務所として稼働中。目黒川沿いの遊歩道に近く、感度の高い層が集まるエリアで、テナント募集にも困りにくい立地です。'
    },
    {
      id: 'CMP-2009',
      title: '新木場 倉庫（自社利用向け）',
      deal: 'sale',
      type: 'warehouse',
      status: 'available',
      ward: '江東区',
      address: '東京都江東区新木場一丁目',
      access: [
        { line: 'JR京葉線', station: '新木場', walk: 15 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 745000000,
      yieldRate: 5.2,
      tenure: '所有権',
      areaTsubo: 380,
      floor: '1F-2F',
      floorsTotal: 2,
      builtYear: 2006,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '軽作業', '事務所'],
      availableFrom: '2026年12月',
      updatedAt: '2026-07-06',
      description: '湾岸エリアの倉庫です。1階は荷捌き・保管、2階は事務所として利用できます。大型車の接車が可能で、都心配送の拠点として自社取得を検討される事業者様に適します。'
    },
    {
      id: 'CMP-2010',
      title: '三軒茶屋 区分店舗 1F（オーナーチェンジ）',
      deal: 'sale',
      type: 'shop',
      status: 'available',
      ward: '世田谷区',
      address: '東京都世田谷区三軒茶屋二丁目',
      access: [
        { line: '東急田園都市線', station: '三軒茶屋', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 96000000,
      yieldRate: 5.6,
      tenure: '所有権',
      areaTsubo: 24.5,
      floor: '1F',
      floorsTotal: 6,
      builtYear: 2001,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '駅徒歩5分以内', '看板設置可'],
      usage: ['店舗', '飲食店'],
      availableFrom: '相談',
      updatedAt: '2026-07-03',
      description: '三軒茶屋の商店街沿いにある1階の区分店舗です。飲食テナントが長期入居中で、オーナーチェンジでの引渡しとなります。1億円を下回る価格帯で、収益物件の入口として検討しやすい物件です。'
    },
    {
      id: 'CMP-1025',
      title: '横浜駅西口 1階路面店舗（飲食可）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '横浜市',
      address: '神奈川県横浜市西区南幸二丁目',
      access: [
        { line: 'JR各線', station: '横浜', walk: 4 },
        { line: '東急東横線', station: '横浜', walk: 5 }
      ],
      rent: 880000, managementFee: 65000, deposit: 10, keyMoney: 0,
      areaTsubo: 32.5,
      floor: '1F',
      floorsTotal: 8,
      builtYear: 2008,
      structure: 'SRC造',
      features: ['1階路面', '飲食可', '深夜営業可', '駅徒歩5分以内', '看板設置可'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      updatedAt: '2026-08-01',
      description: '横浜駅西口の繁華街に面した1階路面店舗です。前面道路の歩行者通行量が多く、視認性の高い間口を確保しています。重飲食も相談可能で、深夜営業の実績もあるビルです。'
    },
    {
      id: 'CMP-1026',
      title: '川崎駅前 オフィス 6F（セットアップ）',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '川崎市',
      address: '神奈川県川崎市川崎区駅前本町',
      access: [
        { line: 'JR東海道線', station: '川崎', walk: 3 },
        { line: '京急本線', station: '京急川崎', walk: 6 }
      ],
      rent: 1120000, managementFee: 84000, deposit: 10, keyMoney: 0,
      areaTsubo: 78,
      floor: '6F',
      floorsTotal: 12,
      builtYear: 2013,
      structure: 'S造',
      features: ['セットアップ', '駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2026年9月',
      updatedAt: '2026-07-29',
      description: '川崎駅から徒歩3分のセットアップオフィスです。会議室2室とフリーアドレス席が施工済みで、内装工事なしで入居できます。東京都心へのアクセスも良く、支店開設に適します。'
    },
    {
      id: 'CMP-1027',
      title: '大宮駅東口 路面店舗（居抜き）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: 'さいたま市',
      address: '埼玉県さいたま市大宮区宮町一丁目',
      access: [
        { line: 'JR各線', station: '大宮', walk: 5 }
      ],
      rent: 620000, managementFee: 45000, deposit: 10, keyMoney: 1,
      areaTsubo: 26,
      floor: '1F',
      floorsTotal: 5,
      builtYear: 2003,
      structure: 'RC造',
      features: ['1階路面', '居抜き', '飲食可', '駅徒歩5分以内', '看板設置可'],
      usage: ['飲食店', '店舗'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-27',
      description: '大宮駅東口の商店街沿いにある居抜き店舗です。前テナントの厨房設備・客席をそのまま引き継げるため、開業までの初期費用を抑えられます。'
    },
    {
      id: 'CMP-1028',
      title: '船橋 倉庫（幹線道路沿い・大型車接車可）',
      deal: 'rent',
      type: 'warehouse',
      status: 'available',
      ward: '船橋市',
      address: '千葉県船橋市西浦三丁目',
      access: [
        { line: 'JR京葉線', station: '二俣新町', walk: 12 }
      ],
      rent: 1450000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 420,
      floor: '1F-2F',
      floorsTotal: 2,
      builtYear: 2011,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '軽作業', '事務所'],
      availableFrom: '2026年10月',
      updatedAt: '2026-07-24',
      description: '京葉道路に近い立地の倉庫です。大型車の接車が可能なプラットフォームを備え、1階が荷捌き・保管、2階が事務所という構成です。都内配送と千葉県内配送の両方に対応できます。'
    },
    {
      id: 'CMP-1029',
      title: '柏駅前 2階店舗（スケルトン）',
      deal: 'rent',
      type: 'shop',
      status: 'negotiating',
      ward: '柏市',
      address: '千葉県柏市柏一丁目',
      access: [
        { line: 'JR常磐線', station: '柏', walk: 3 },
        { line: '東武アーバンパークライン', station: '柏', walk: 3 }
      ],
      rent: 450000, managementFee: 32000, deposit: 10, keyMoney: 0,
      areaTsubo: 28,
      floor: '2F',
      floorsTotal: 6,
      builtYear: 1999,
      structure: 'RC造',
      features: ['スケルトン', '飲食可', '駅徒歩5分以内', '看板設置可'],
      usage: ['飲食店', 'サービス'],
      availableFrom: '相談',
      updatedAt: '2026-07-21',
      description: '柏駅東口のペデストリアンデッキに近い2階店舗です。スケルトン渡しのため、業態に合わせた自由な内装計画が可能です。物販・サービス業でも相談を承ります。'
    },
    {
      id: 'CMP-1030',
      title: '川口 工場・倉庫（電力容量に余裕）',
      deal: 'rent',
      type: 'warehouse',
      status: 'available',
      ward: '川口市',
      address: '埼玉県川口市領家四丁目',
      access: [
        { line: 'JR京浜東北線', station: '川口', walk: 18 }
      ],
      rent: 980000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 265,
      floor: '1F',
      floorsTotal: 1,
      builtYear: 2005,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['工場', '倉庫', '軽作業'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-18',
      description: '川口の準工業地域にある平屋の工場・倉庫です。動力電源の容量に余裕があり、製造ラインの設置にも対応できます。敷地内に大型車の駐車スペースを確保しています。'
    },
    {
      id: 'CMP-1031',
      title: '藤沢駅南口 1階店舗（角地）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '藤沢市',
      address: '神奈川県藤沢市南藤沢',
      access: [
        { line: 'JR東海道線', station: '藤沢', walk: 6 },
        { line: '小田急江ノ島線', station: '藤沢', walk: 5 }
      ],
      rent: 520000, managementFee: 38000, deposit: 10, keyMoney: 0,
      areaTsubo: 24,
      floor: '1F',
      floorsTotal: 4,
      builtYear: 2016,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '看板設置可'],
      usage: ['飲食店', '物販', 'サービス'],
      availableFrom: '2026年9月',
      updatedAt: '2026-07-15',
      description: '藤沢駅南口の商店街にある角地の1階店舗です。二面接道で視認性が高く、テラス席の設置についても相談可能です。周辺は休日の人通りが多いエリアです。'
    },
    {
      id: 'CMP-1032',
      title: '松戸 オフィス 4F（駅直結ビル）',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '松戸市',
      address: '千葉県松戸市本町',
      access: [
        { line: 'JR常磐線', station: '松戸', walk: 2 },
        { line: '新京成線', station: '松戸', walk: 2 }
      ],
      rent: 385000, managementFee: 28000, deposit: 8, keyMoney: 0,
      areaTsubo: 32,
      floor: '4F',
      floorsTotal: 9,
      builtYear: 2007,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-12',
      description: '松戸駅から徒歩2分のオフィスビルです。常磐線で都心へ直結しながら賃料水準を抑えられるため、バックオフィスや営業拠点の設置に向いています。'
    },
    {
      id: 'CMP-2011',
      title: '横浜関内 一棟オフィスビル（満室稼働中）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '横浜市',
      address: '神奈川県横浜市中区尾上町三丁目',
      access: [
        { line: 'JR根岸線', station: '関内', walk: 4 },
        { line: '横浜市営地下鉄', station: '関内', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 720000000,
      yieldRate: 5.4,
      tenure: '所有権',
      areaTsubo: 310,
      floor: '1F-7F',
      floorsTotal: 7,
      builtYear: 2003,
      structure: 'SRC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可'],
      usage: ['事務所', '店舗'],
      availableFrom: '相談',
      updatedAt: '2026-07-31',
      description: '関内駅至近の一棟オフィスビルです。現況は満室稼働で、事務所テナント中心に長期入居が続いています。レントロールと修繕履歴は個別にご開示します。'
    },
    {
      id: 'CMP-2012',
      title: '千葉中央 一棟店舗ビル（テナント付き）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '千葉市',
      address: '千葉県千葉市中央区富士見二丁目',
      access: [
        { line: 'JR総武線', station: '千葉', walk: 7 },
        { line: '京成千葉線', station: '京成千葉', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 298000000,
      yieldRate: 7.2,
      tenure: '所有権',
      areaTsubo: 142,
      floor: '1F-5F',
      floorsTotal: 5,
      builtYear: 1997,
      structure: 'RC造',
      features: ['1階路面', '飲食可', '深夜営業可', '看板設置可'],
      usage: ['飲食店', '店舗'],
      availableFrom: '相談',
      updatedAt: '2026-07-26',
      description: '千葉駅からの動線上、繁華街に立地する5層の店舗ビルです。各階に飲食テナントが入居しており、利回りは7%台。外壁は改修済みで、当面の大規模修繕は想定していません。'
    },
    {
      id: 'CMP-2013',
      title: '越谷 事業用地（約310坪・建築条件なし）',
      deal: 'sale',
      type: 'land',
      status: 'available',
      ward: '越谷市',
      address: '埼玉県越谷市大字大房',
      access: [
        { line: '東武スカイツリーライン', station: '北越谷', walk: 16 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 268000000,
      yieldRate: 0,
      tenure: '所有権',
      areaTsubo: 310,
      floor: '—',
      floorsTotal: 0,
      builtYear: null,
      structure: '更地',
      features: ['駐車場あり'],
      usage: ['事業用建物', '店舗', '倉庫'],
      availableFrom: '即引渡し可',
      updatedAt: '2026-07-23',
      description: '県道に接道する約310坪の整形地です。建築条件はなく、ロードサイド店舗・物流拠点・事業所いずれの用途にも対応できます。分割での検討も相談可能です。'
    },
    {
      id: 'CMP-2014',
      title: '相模原 倉庫（自社利用向け・圏央道近接）',
      deal: 'sale',
      type: 'warehouse',
      status: 'available',
      ward: '相模原市',
      address: '神奈川県相模原市中央区田名',
      access: [
        { line: 'JR相模線', station: '上溝', walk: 22 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 412000000,
      yieldRate: 6.1,
      tenure: '所有権',
      areaTsubo: 480,
      floor: '1F-2F',
      floorsTotal: 2,
      builtYear: 2009,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '工場', '軽作業'],
      availableFrom: '2026年11月',
      updatedAt: '2026-07-20',
      description: '圏央道相模原愛川ICに近い倉庫です。首都圏全域への配送拠点として使いやすく、自社取得のほか賃貸運用も想定できます。天井高と床荷重は資料でご確認ください。'
    },
    {
      id: 'CMP-1033',
      title: '立川駅北口 1階路面店舗（飲食可）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '立川市',
      address: '東京都立川市曙町二丁目',
      access: [
        { line: 'JR中央線', station: '立川', walk: 4 },
        { line: '多摩都市モノレール', station: '立川北', walk: 3 }
      ],
      rent: 680000, managementFee: 48000, deposit: 10, keyMoney: 0,
      areaTsubo: 29.5,
      floor: '1F',
      floorsTotal: 7,
      builtYear: 2009,
      structure: 'SRC造',
      features: ['1階路面', '飲食可', '駅徒歩5分以内', '看板設置可'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      updatedAt: '2026-08-02',
      description: '立川駅北口のサンサンロード沿いに面した1階路面店舗です。駅と大型商業施設をつなぐ動線上にあり、平日・休日ともに歩行者通行量が安定しています。多摩地区で最も商業集積が進んだエリアです。'
    },
    {
      id: 'CMP-1034',
      title: '吉祥寺 サンロード近接 店舗（居抜き）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '武蔵野市',
      address: '東京都武蔵野市吉祥寺本町一丁目',
      access: [
        { line: 'JR中央線', station: '吉祥寺', walk: 4 },
        { line: '京王井の頭線', station: '吉祥寺', walk: 4 }
      ],
      rent: 560000, managementFee: 40000, deposit: 10, keyMoney: 1,
      areaTsubo: 21,
      floor: '2F',
      floorsTotal: 5,
      builtYear: 2001,
      structure: 'RC造',
      features: ['居抜き', '飲食可', '駅徒歩5分以内'],
      usage: ['飲食店', 'サービス'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-30',
      description: '吉祥寺サンロード商店街からすぐの2階店舗です。カフェ業態の居抜きで、厨房設備と客席をそのまま引き継げます。住みたい街ランキング上位の街で、平日夜と休日の集客が見込めます。'
    },
    {
      id: 'CMP-1035',
      title: '町田駅前 オフィス 5F（分割可）',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '町田市',
      address: '東京都町田市原町田六丁目',
      access: [
        { line: 'JR横浜線', station: '町田', walk: 5 },
        { line: '小田急小田原線', station: '町田', walk: 6 }
      ],
      rent: 420000, managementFee: 32000, deposit: 8, keyMoney: 0,
      areaTsubo: 38,
      floor: '5F',
      floorsTotal: 9,
      builtYear: 2006,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2026年9月',
      updatedAt: '2026-07-28',
      description: '町田駅前のオフィスビル5階です。神奈川県北部と多摩地区の両方をカバーできる立地で、営業拠点に適します。半区画での分割賃貸も相談可能です。'
    },
    {
      id: 'CMP-1036',
      title: '八王子 倉庫（幹線道路沿い）',
      deal: 'rent',
      type: 'warehouse',
      status: 'available',
      ward: '八王子市',
      address: '東京都八王子市石川町',
      access: [
        { line: 'JR八高線', station: '北八王子', walk: 14 }
      ],
      rent: 890000, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 310,
      floor: '1F-2F',
      floorsTotal: 2,
      builtYear: 2008,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '軽作業', '事務所'],
      availableFrom: '即入居可',
      updatedAt: '2026-07-25',
      description: '国道16号に近い八王子の倉庫です。中央道八王子ICへのアクセスが良く、多摩地区・神奈川県北部への配送拠点として使えます。1階が保管・荷捌き、2階が事務所と休憩室です。'
    },
    {
      id: 'CMP-1037',
      title: '三鷹駅前 セットアップオフィス 4F',
      deal: 'rent',
      type: 'office',
      status: 'negotiating',
      ward: '三鷹市',
      address: '東京都三鷹市下連雀三丁目',
      access: [
        { line: 'JR中央線', station: '三鷹', walk: 3 }
      ],
      rent: 365000, managementFee: 28000, deposit: 8, keyMoney: 0,
      areaTsubo: 27.5,
      floor: '4F',
      floorsTotal: 8,
      builtYear: 2014,
      structure: 'S造',
      features: ['セットアップ', '駅徒歩5分以内', 'エレベーターあり', '24時間利用可'],
      usage: ['事務所'],
      availableFrom: '相談',
      updatedAt: '2026-07-22',
      description: '三鷹駅南口すぐのセットアップオフィスです。会議室1室と執務席20席が施工済みで、内装工事なしで入居できます。新宿まで直通で、都心オフィスの分室としても検討しやすい規模です。'
    },
    {
      id: 'CMP-2015',
      title: '府中 一棟オフィスビル（駅近・満室）',
      deal: 'sale',
      type: 'building',
      status: 'available',
      ward: '府中市',
      address: '東京都府中市宮西町一丁目',
      access: [
        { line: '京王線', station: '府中', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 385000000,
      yieldRate: 6.3,
      tenure: '所有権',
      areaTsubo: 168,
      floor: '1F-5F',
      floorsTotal: 5,
      builtYear: 2002,
      structure: 'RC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '1階路面'],
      usage: ['事務所', '店舗'],
      availableFrom: '相談',
      updatedAt: '2026-07-29',
      description: '府中駅から徒歩4分の一棟オフィスビルです。1階は路面店舗、2階以上は事務所として満室稼働しています。多摩地区の行政・商業の中心で、テナント需要が安定したエリアです。'
    },
    {
      id: 'CMP-2016',
      title: '多摩 事業用地（約280坪・建築条件なし）',
      deal: 'sale',
      type: 'land',
      status: 'available',
      ward: '多摩市',
      address: '東京都多摩市和田',
      access: [
        { line: '京王相模原線', station: '京王永山', walk: 18 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      price: 198000000,
      yieldRate: 0,
      tenure: '所有権',
      areaTsubo: 280,
      floor: '—',
      floorsTotal: 0,
      builtYear: null,
      structure: '更地',
      features: ['駐車場あり'],
      usage: ['事業用建物', '店舗', '倉庫'],
      availableFrom: '即引渡し可',
      updatedAt: '2026-07-19',
      description: '多摩市の幹線道路に接道する約280坪の事業用地です。建築条件はなく、ロードサイド店舗や事業所として利用できます。周辺は住宅地で、生活密着型の業態にも向きます。'
    }
  ];
  /* === PROPERTIES:END === */

  /* 面積換算と坪単価は自動計算するため、物件データ側では持ちません。

     updatedAt（情報更新日）は「新着」バッジの自動判定と新着順の並び替えに
     使います。サンプルデータでは未設定の物件に掲載順で少しずつ古い日付を
     割り当てていますが、実データでは各物件に必ず設定してください。 */
  var FALLBACK_BASE = new Date('2026-07-17T00:00:00');

  PROPERTIES.forEach(function (p, i) {
    if (!p.updatedAt) {
      var d = new Date(FALLBACK_BASE.getTime() - i * 5 * 86400000);
      p.updatedAt = d.toISOString().slice(0, 10);
    }
    /* 都県は市区名から補完する（マスタにない市区は空のまま） */
    p.pref = AREA_PREF[p.ward] || '';
    p.areaSqm = Math.round(p.areaTsubo * 3.30578 * 10) / 10;
    /* 賃貸は月額賃料、売買は販売価格を金額として扱う */
    p.amount = p.deal === 'sale' ? p.price : p.rent;
    p.tsuboUnitPrice = p.areaTsubo ? Math.round(p.amount / p.areaTsubo) : 0;
  });

  global.PORTAL_DATA = {
    properties: PROPERTIES,
    deals: DEAL_TYPES,
    types: PROPERTY_TYPES,
    features: FEATURES,
    prefectures: PREFECTURES,
    areaSections: AREA_SECTIONS,
    areaPref: AREA_PREF,
    areas: AREAS
  };
})(window);
