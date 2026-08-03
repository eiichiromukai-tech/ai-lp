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

  var AREAS = [
    '千代田区', '中央区', '港区', '新宿区', '渋谷区', '品川区',
    '目黒区', '世田谷区', '豊島区', '台東区', '墨田区', '江東区'
  ];

  var PROPERTIES = [
    {
      id: 'CMP-1001',
      title: '神田三崎町 1階路面店舗（居抜き）',
      type: 'shop',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田三崎町三丁目',
      access: [
        { line: 'JR中央・総武線', station: '水道橋', walk: 3 },
        { line: '都営三田線', station: '水道橋', walk: 5 }
      ],
      rent: 480000,
      managementFee: 35000,
      deposit: 10,
      keyMoney: 0,
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
      type: 'office',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区丸の内二丁目',
      access: [
        { line: 'JR各線', station: '東京', walk: 4 },
        { line: '東京メトロ千代田線', station: '二重橋前', walk: 2 }
      ],
      rent: 3850000,
      managementFee: 0,
      deposit: 12,
      keyMoney: 0,
      areaTsubo: 110.0,
      floor: '6F',
      floorsTotal: 22,
      builtYear: 2015,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2026年10月',
      description: '東京駅至近、丸の内エリアのハイグレードビル6階フロアです。無柱空間で天井高2,800mm、OAフロア100mm、個別空調。共用部のグレードが高く、来訪の多い企業の本社機能に適します。基準階一括での賃貸が可能です。'
    },
    {
      id: 'CMP-1003',
      title: '銀座並木通り 2F 路面近接店舗',
      type: 'shop',
      status: 'negotiating',
      ward: '中央区',
      address: '東京都中央区銀座六丁目',
      access: [
        { line: '東京メトロ銀座線', station: '銀座', walk: 2 },
        { line: 'JR山手線', station: '有楽町', walk: 7 }
      ],
      rent: 1650000,
      managementFee: 120000,
      deposit: 12,
      keyMoney: 0,
      areaTsubo: 34.8,
      floor: '2F',
      floorsTotal: 9,
      builtYear: 2006,
      structure: 'S造',
      features: ['飲食可', '看板設置可', '駅徒歩5分以内', 'エレベーターあり'],
      usage: ['飲食店', '物販', 'クリニック'],
      availableFrom: '相談',
      description: '銀座並木通りに面したビルの2階区画。1階エントランスからの視認性が高く、外部看板の設置が可能です。ハイブランド路面店が並ぶ通りで、ブランド発信を伴う出店に適したロケーションです。'
    },
    {
      id: 'CMP-1004',
      title: '西新宿 セットアップオフィス 11F',
      type: 'office',
      status: 'available',
      ward: '新宿区',
      address: '東京都新宿区西新宿六丁目',
      access: [
        { line: '都営大江戸線', station: '都庁前', walk: 4 },
        { line: 'JR各線', station: '新宿', walk: 9 }
      ],
      rent: 1420000,
      managementFee: 96000,
      deposit: 10,
      keyMoney: 0,
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
      type: 'shop',
      status: 'available',
      ward: '港区',
      address: '東京都港区北青山三丁目',
      access: [
        { line: '東京メトロ銀座線', station: '表参道', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '表参道', walk: 3 }
      ],
      rent: 2200000,
      managementFee: 150000,
      deposit: 12,
      keyMoney: 2,
      areaTsubo: 41.5,
      floor: '1F',
      floorsTotal: 5,
      builtYear: 2003,
      structure: 'RC造',
      features: ['1階路面', 'スケルトン', '飲食可', '看板設置可', '駅徒歩5分以内'],
      usage: ['物販', '飲食店', 'サービス'],
      availableFrom: '2026年9月',
      description: '青山通り沿い、表参道交差点から徒歩圏の1階路面区画です。スケルトン渡しのため、ブランドの世界観に合わせた自由な設計が可能。ファサードの間口8.5m、天井高3,600mm。'
    },
    {
      id: 'CMP-1006',
      title: '渋谷宮益坂 飲食居抜き 地下1F',
      type: 'shop',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区渋谷一丁目',
      access: [
        { line: 'JR各線', station: '渋谷', walk: 5 },
        { line: '東京メトロ銀座線', station: '渋谷', walk: 4 }
      ],
      rent: 620000,
      managementFee: 40000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 28.0,
      floor: 'B1F',
      floorsTotal: 6,
      builtYear: 1991,
      structure: 'SRC造',
      features: ['居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内'],
      usage: ['飲食店', 'バー'],
      availableFrom: '即入居可',
      description: '宮益坂沿いのビル地下1階、バー業態の居抜き区画です。カウンター・厨房・音響設備をそのまま引き継げます。深夜営業可、周辺は夜間人口の多いエリアです。'
    },
    {
      id: 'CMP-1007',
      title: '五反田 バックオフィス向け 8F',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区西五反田二丁目',
      access: [
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '大崎広小路', walk: 4 }
      ],
      rent: 780000,
      managementFee: 62000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 46.0,
      floor: '8F',
      floorsTotal: 10,
      builtYear: 2004,
      structure: 'S造',
      features: ['エレベーターあり', '空調更新済', '24時間利用可'],
      usage: ['事務所'],
      availableFrom: '2026年8月',
      description: '五反田駅から徒歩6分、コストバランスに優れたオフィス区画です。ワンフロア貸しで間仕切りなし、OAフロア対応。スタートアップの拡張移転やバックオフィス集約に適します。'
    },
    {
      id: 'CMP-1008',
      title: '江東区新木場 物流倉庫（低温対応）',
      type: 'warehouse',
      status: 'available',
      ward: '江東区',
      address: '東京都江東区新木場二丁目',
      access: [
        { line: 'JR京葉線', station: '新木場', walk: 12 }
      ],
      rent: 2850000,
      managementFee: 0,
      deposit: 6,
      keyMoney: 0,
      areaTsubo: 310.0,
      floor: '1F',
      floorsTotal: 3,
      builtYear: 2009,
      structure: 'S造',
      features: ['24時間利用可', '駐車場あり'],
      usage: ['倉庫', '軽作業'],
      availableFrom: '2026年11月',
      description: '首都高速湾岸線 新木場ICから約1.5km。荷捌きスペースと大型車の接車バースを確保。一部低温区画あり、床荷重1.5t/m²、有効天井高5.5m。24時間稼働可能です。'
    },
    {
      id: 'CMP-1009',
      title: '池袋東口 2F 物販・サービス区画',
      type: 'shop',
      status: 'available',
      ward: '豊島区',
      address: '東京都豊島区南池袋一丁目',
      access: [
        { line: 'JR各線', station: '池袋', walk: 3 },
        { line: '東京メトロ有楽町線', station: '東池袋', walk: 6 }
      ],
      rent: 890000,
      managementFee: 70000,
      deposit: 10,
      keyMoney: 1,
      areaTsubo: 37.2,
      floor: '2F',
      floorsTotal: 7,
      builtYear: 2000,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['物販', 'サービス', 'スクール'],
      availableFrom: '即入居可',
      description: '池袋東口の繁華街に位置する2階区画。1階に飲食テナントが入る視認性の高いビルで、サロン・スクール・クリニック等の集客型サービス業態に適します。'
    },
    {
      id: 'CMP-1010',
      title: '浅草雷門通り 一棟ビル（4層）',
      type: 'building',
      status: 'available',
      ward: '台東区',
      address: '東京都台東区雷門二丁目',
      access: [
        { line: '東京メトロ銀座線', station: '浅草', walk: 4 },
        { line: '都営浅草線', station: '浅草', walk: 5 }
      ],
      rent: 2400000,
      managementFee: 0,
      deposit: 12,
      keyMoney: 0,
      areaTsubo: 96.0,
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
      type: 'shop',
      status: 'available',
      ward: '目黒区',
      address: '東京都目黒区上目黒一丁目',
      access: [
        { line: '東急東横線', station: '中目黒', walk: 2 },
        { line: '東京メトロ日比谷線', station: '中目黒', walk: 2 }
      ],
      rent: 385000,
      managementFee: 25000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 14.6,
      floor: '1F',
      floorsTotal: 1,
      builtYear: 2016,
      structure: 'S造',
      features: ['1階路面', 'スケルトン', '飲食可', '駅徒歩5分以内'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      description: '中目黒駅から徒歩2分、感度の高い個店が集まるエリアの小規模路面区画です。10〜16坪の業態に適したサイズ感で、テイクアウト主体のカフェやベーカリーの出店に向いています。'
    },
    {
      id: 'CMP-1012',
      title: '三軒茶屋 2F スクール・サロン向け',
      type: 'shop',
      status: 'closed',
      ward: '世田谷区',
      address: '東京都世田谷区太子堂四丁目',
      access: [
        { line: '東急田園都市線', station: '三軒茶屋', walk: 4 }
      ],
      rent: 320000,
      managementFee: 20000,
      deposit: 8,
      keyMoney: 0,
      areaTsubo: 19.8,
      floor: '2F',
      floorsTotal: 5,
      builtYear: 1999,
      structure: 'RC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['サービス', 'スクール', 'クリニック'],
      availableFrom: '2026年9月',
      description: '三軒茶屋駅から徒歩4分、住宅地と商店街の接点にある2階区画。地域密着型のサロン・教室・治療院に適したサイズと賃料水準です。'
    },
    {
      id: 'CMP-1013',
      title: '日本橋室町 オフィス 4F（分割可）',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区日本橋室町三丁目',
      access: [
        { line: '東京メトロ銀座線', station: '三越前', walk: 3 },
        { line: 'JR総武快速線', station: '新日本橋', walk: 4 }
      ],
      rent: 1180000,
      managementFee: 88000,
      deposit: 12,
      keyMoney: 0,
      areaTsubo: 52.5,
      floor: '4F',
      floorsTotal: 11,
      builtYear: 2008,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可'],
      usage: ['事務所'],
      availableFrom: '即入居可',
      description: '日本橋室町の再開発エリアに隣接するオフィスビル4階。約26坪ずつの分割貸しにも対応可能です。金融・法務系のテナントが多く入居しています。'
    },
    {
      id: 'CMP-1014',
      title: '錦糸町 大型飲食区画 1F・B1F',
      type: 'shop',
      status: 'negotiating',
      ward: '墨田区',
      address: '東京都墨田区江東橋三丁目',
      access: [
        { line: 'JR総武線', station: '錦糸町', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '錦糸町', walk: 5 }
      ],
      rent: 1250000,
      managementFee: 90000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 68.0,
      floor: '1F・B1F',
      floorsTotal: 6,
      builtYear: 1994,
      structure: 'SRC造',
      features: ['1階路面', '居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内'],
      usage: ['飲食店'],
      availableFrom: '相談',
      description: '錦糸町駅南口の繁華街に位置する1階＋地下1階の大型飲食区画です。前テナントは大箱居酒屋で、厨房・客席什器の一部を引き継げます。宴会需要の見込める立地。'
    },
    {
      id: 'CMP-1015',
      title: '大井町 事業用地（約180坪）',
      type: 'land',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東大井五丁目',
      access: [
        { line: 'JR京浜東北線', station: '大井町', walk: 8 }
      ],
      rent: 1450000,
      managementFee: 0,
      deposit: 6,
      keyMoney: 0,
      areaTsubo: 182.0,
      floor: '—',
      floorsTotal: 0,
      builtYear: null,
      structure: '更地',
      features: ['駐車場あり', '24時間利用可'],
      usage: ['店舗', '駐車場', '事業用建物'],
      availableFrom: '2026年12月',
      description: '幹線道路に接道する約180坪の事業用地です。建築条件なしの定期借地でのご提案が可能。ロードサイド店舗・コインパーキング・事業所建設などの用途を想定しています。'
    },
    {
      id: 'CMP-1016',
      title: '恵比寿 デザイナーズオフィス 3F',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区恵比寿西一丁目',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 4 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 5 }
      ],
      rent: 940000,
      managementFee: 60000,
      deposit: 10,
      keyMoney: 0,
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
      type: 'warehouse',
      status: 'available',
      ward: '港区',
      address: '東京都港区芝浦四丁目',
      access: [
        { line: 'JR山手線', station: '田町', walk: 11 }
      ],
      rent: 1380000,
      managementFee: 0,
      deposit: 6,
      keyMoney: 0,
      areaTsubo: 120.0,
      floor: '1F・2F',
      floorsTotal: 2,
      builtYear: 2001,
      structure: 'S造',
      features: ['駐車場あり', '24時間利用可'],
      usage: ['倉庫', '事務所', '軽作業'],
      availableFrom: '即入居可',
      description: '1階倉庫＋2階事務所の一体利用が可能な物件です。都心配送の拠点として利便性が高く、シャッター高3.5m、2t車の接車が可能。駐車スペース3台分付き。'
    },
    {
      id: 'CMP-1018',
      title: '神保町 古書店街 1F小型区画',
      type: 'shop',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田神保町二丁目',
      access: [
        { line: '都営三田線', station: '神保町', walk: 3 },
        { line: '東京メトロ半蔵門線', station: '神保町', walk: 3 }
      ],
      rent: 265000,
      managementFee: 18000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 11.2,
      floor: '1F',
      floorsTotal: 5,
      builtYear: 1988,
      structure: 'RC造',
      features: ['1階路面', 'スケルトン', '駅徒歩5分以内', '看板設置可'],
      usage: ['物販', 'カフェ', 'ギャラリー'],
      availableFrom: '即入居可',
      description: '神保町の古書店街に面した11坪の1階区画です。小型のカフェ・ギャラリー・セレクトショップに適したサイズ感で、周辺は文化的な回遊性の高いエリアです。'
    },
    {
      id: 'CMP-1019',
      title: '新橋 飲食ビル 3F 居抜き',
      type: 'shop',
      status: 'closed',
      ward: '港区',
      address: '東京都港区新橋三丁目',
      access: [
        { line: 'JR各線', station: '新橋', walk: 4 },
        { line: '都営浅草線', station: '新橋', walk: 3 }
      ],
      rent: 430000,
      managementFee: 30000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 24.0,
      floor: '3F',
      floorsTotal: 8,
      builtYear: 1990,
      structure: 'SRC造',
      features: ['居抜き', '飲食可', '深夜営業可', '駅徒歩5分以内', 'エレベーターあり'],
      usage: ['飲食店'],
      availableFrom: '即入居可',
      description: '新橋の飲食ビル3階、和食業態の居抜き区画です。厨房・カウンター・個室をそのまま利用でき、開業までの期間を大幅に短縮できます。ビル全体が飲食テナントで構成されています。'
    },
    {
      id: 'CMP-1020',
      title: '豊洲 大型オフィス ワンフロア',
      type: 'office',
      status: 'available',
      ward: '江東区',
      address: '東京都江東区豊洲三丁目',
      access: [
        { line: '東京メトロ有楽町線', station: '豊洲', walk: 5 },
        { line: 'ゆりかもめ', station: '豊洲', walk: 5 }
      ],
      rent: 4200000,
      managementFee: 0,
      deposit: 12,
      keyMoney: 0,
      areaTsubo: 240.0,
      floor: '14F',
      floorsTotal: 24,
      builtYear: 2013,
      structure: 'S造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '24時間利用可', '空調更新済'],
      usage: ['事務所'],
      availableFrom: '2027年1月',
      description: '豊洲エリアの大規模オフィスビル、基準階240坪のワンフロア区画です。無柱空間・OAフロア150mm・個別空調。BCP対応の非常用発電機を備えます。本社機能の集約に適した規模です。'
    },
    {
      id: 'CMP-1021',
      title: '下北沢 2F カフェ居抜き',
      type: 'shop',
      status: 'available',
      ward: '世田谷区',
      address: '東京都世田谷区北沢二丁目',
      access: [
        { line: '京王井の頭線', station: '下北沢', walk: 3 },
        { line: '小田急線', station: '下北沢', walk: 4 }
      ],
      rent: 298000,
      managementFee: 22000,
      deposit: 8,
      keyMoney: 0,
      areaTsubo: 17.5,
      floor: '2F',
      floorsTotal: 4,
      builtYear: 1997,
      structure: 'RC造',
      features: ['居抜き', '飲食可', '駅徒歩5分以内'],
      usage: ['飲食店', 'カフェ'],
      availableFrom: '即入居可',
      description: '下北沢駅から徒歩3分、カフェ居抜きの2階区画です。厨房設備・カウンター・客席什器付き。若年層の回遊が多く、個性のある業態と親和性の高いエリアです。'
    },
    {
      id: 'CMP-1022',
      title: '押上 一棟ビル（テナント付き）',
      type: 'building',
      status: 'available',
      ward: '墨田区',
      address: '東京都墨田区押上一丁目',
      access: [
        { line: '東京メトロ半蔵門線', station: '押上', walk: 6 }
      ],
      rent: 1780000,
      managementFee: 0,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 88.0,
      floor: '1F-5F',
      floorsTotal: 5,
      builtYear: 2005,
      structure: 'RC造',
      features: ['1階路面', 'エレベーターあり', '看板設置可'],
      usage: ['事務所', '店舗', '複合'],
      availableFrom: '相談',
      description: '東京スカイツリー至近の5層一棟ビル。現況で2フロアにテナントが入居しており、収益を確保しながらの取得・一棟借りが可能です。1階は路面店舗として稼働中。'
    },
    {
      id: 'CMP-1023',
      title: '高田馬場 スクール向け 3F',
      type: 'office',
      status: 'available',
      ward: '新宿区',
      address: '東京都新宿区高田馬場二丁目',
      access: [
        { line: 'JR山手線', station: '高田馬場', walk: 5 },
        { line: '西武新宿線', station: '高田馬場', walk: 5 }
      ],
      rent: 520000,
      managementFee: 38000,
      deposit: 10,
      keyMoney: 0,
      areaTsubo: 32.0,
      floor: '3F',
      floorsTotal: 7,
      builtYear: 1995,
      structure: 'SRC造',
      features: ['駅徒歩5分以内', 'エレベーターあり', '看板設置可'],
      usage: ['スクール', '事務所', 'サービス'],
      availableFrom: '2026年9月',
      description: '学生の多い高田馬場エリア、駅徒歩5分の3階区画です。教室利用を想定した間取りで、スクール・予備校・研修施設に適します。'
    },
    {
      id: 'CMP-1024',
      title: '築地 生鮮対応 1F区画',
      type: 'shop',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区築地六丁目',
      access: [
        { line: '東京メトロ日比谷線', station: '築地', walk: 7 },
        { line: '都営大江戸線', station: '築地市場', walk: 5 }
      ],
      rent: 560000,
      managementFee: 42000,
      deposit: 10,
      keyMoney: 0,
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
    }
  ];

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
    p.areaSqm = Math.round(p.areaTsubo * 3.30578 * 10) / 10;
    p.tsuboUnitPrice = p.areaTsubo ? Math.round(p.rent / p.areaTsubo) : 0;
  });

  global.PORTAL_DATA = {
    properties: PROPERTIES,
    types: PROPERTY_TYPES,
    features: FEATURES,
    areas: AREAS
  };
})(window);
