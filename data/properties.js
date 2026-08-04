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

  /* =====================================================
     サイト全体の設定
     -----------------------------------------------------
     公開前に見直すのはこのブロックだけです。
     詳しくは README の「公開前チェックリスト」を参照してください。
     ===================================================== */
  var SITE_CONFIG = {
    /* 公開URL。sitemap.xml・canonical・OGPの生成に使います。末尾のスラッシュなし */
    siteUrl: 'https://property.lomets-inc.com',

    /* サイト名・会社情報（構造化データとOGPに使います） */
    siteName: 'REMAX COMPASS 物件ポータル',
    companyName: '株式会社ロメッツ',
    brandName: 'REMAX COMPASS',
    tel: '03-6261-5098',
    /* 電話受付時間。画面表示に使います */
    businessHours: '平日 9:30〜18:00',
    address: {
      postalCode: '101-0061',
      region: '東京都',
      locality: '千代田区',
      street: '神田三崎町三丁目4番9号 横山ビル3F'
    },
    license: '東京都知事(1)第110605号',

    /* お問い合わせフォームの送信先 */
    form: {
      /* 送信先メールアドレス（送信できなかったときのメール作成にも使います） */
      email: 'eiichiro.mukai@remax-agt.net',
      /* 送信に使うエンドポイント。空にするとメールソフトが開く方式になります。
         既定は FormSubmit（アカウント登録不要・初回のみ確認メールの承認が必要）。
         Formspree を使う場合は 'https://formspree.io/f/xxxxxxxx' に差し替えてください。 */
      endpoint: 'https://formsubmit.co/ajax/eiichiro.mukai@remax-agt.net'
    },

    /* Google アナリティクス（GA4）の測定ID。空のあいだは一切読み込みません。
       例: 'G-XXXXXXXXXX' */
    analyticsId: '',

    /* デモ用サンプルデータの注意書きを出すかどうか。実データに入れ替えたら false に */
    demoNotice: false
  };

  /* ---------- 地図の設定 ----------
     所在地が「番地・号」まで入っている物件だけ、詳細ページに地図を出します
     （丁目までしか入っていない物件は、場所を特定できないので出しません）。

     apiKey が空のときは、キーのいらない埋め込みURLを使います。設定ゼロで
     動きますが、Googleの仕様変更で止まる可能性があります。長く運用する場合は
     Google Maps Embed API のキー（無料）を取得してここに貼ってください。
     取得手順は README の「地図表示について」に書いてあります。 */
  var MAP_CONFIG = {
    enabled: true,   /* false にすると地図を一切出しません */
    apiKey: '',      /* 例: 'AIzaSy...' */
    zoom: 17
  };

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
      id: 'YOKOHAMA-CONNECT-SQ-7F4',
      title: '横浜コネクトスクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '横浜市',
      address: '神奈川県横浜市西区みなとみらい3-3-3',
      access: [
        { line: 'みなとみらい線', station: 'みなとみらい', walk: 4 },
        { line: 'JR', station: '桜木町', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 276.87,
      floor: '7階4',
      floorsTotal: 28,
      builtYear: 2023,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上28階/地下1階\n敷金・共益費：相談。VAVによるゾーン制御、天井高2,900mm（4・18階3,200mm）、床荷重500kg/㎡（一部800kg/㎡）、コンセント容量50VA/㎡（4・18階80VA/㎡）、フリーアクセスフロア100mm、機械警備（ICカード）、オフィスエントランスにフラッパーゲート設置。駐車場：相談。\n募集面積：915.26㎡。'
    },
    {
      id: 'YOKOHAMA-CONNECT-SQ-7F2',
      title: '横浜コネクトスクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '横浜市',
      address: '神奈川県横浜市西区みなとみらい3-3-3',
      access: [
        { line: 'みなとみらい線', station: 'みなとみらい', walk: 4 },
        { line: 'JR', station: '桜木町', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 171.53,
      floor: '7階2',
      floorsTotal: 28,
      builtYear: 2023,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上28階/地下1階\n敷金・共益費：相談。VAVによるゾーン制御、天井高2,900mm（4・18階3,200mm）、床荷重500kg/㎡（一部800kg/㎡）、コンセント容量50VA/㎡（4・18階80VA/㎡）、フリーアクセスフロア100mm、機械警備（ICカード）、オフィスエントランスにフラッパーゲート設置。駐車場：相談。\n募集面積：567.03㎡。'
    },
    {
      id: 'YOKOHAMA-CONNECT-SQ-15-17F',
      title: '横浜コネクトスクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '横浜市',
      address: '神奈川県横浜市西区みなとみらい3-3-3',
      access: [
        { line: 'みなとみらい線', station: 'みなとみらい', walk: 4 },
        { line: 'JR', station: '桜木町', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 1255.99,
      floor: '15〜17階（各階）',
      floorsTotal: 28,
      builtYear: 2023,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上28階/地下1階\n敷金・共益費：相談。VAVによるゾーン制御、天井高2,900mm（4・18階3,200mm）、床荷重500kg/㎡（一部800kg/㎡）、コンセント容量50VA/㎡（4・18階80VA/㎡）、フリーアクセスフロア100mm、機械警備（ICカード）、オフィスエントランスにフラッパーゲート設置。駐車場：相談。\n募集面積：4,152.04㎡。'
    },
    {
      id: 'OSAKI-WIZ-TOWER-8A',
      title: '大崎ウィズタワー',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区大崎2-11-1',
      access: [
        { line: 'JR各線', station: '大崎', walk: 4 },
        { line: 'りんかい線', station: '大崎', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 117.27,
      floor: '8階A',
      floorsTotal: 24,
      builtYear: 2014,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.01.03(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上24階/地下2階\n共益費：賃料に含む。セントラル空調（VAVによるゾーン制御）、天井高2,800mm、床荷重500kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア100mm、機械警備・有人管理、光ケーブル導入可（MDFまで引込済）。駐車場：相談。\n募集面積：387.70㎡。'
    },
    {
      id: 'TTS-MINAMIAOYAMA-1-2F',
      title: 'TTS南青山ビル（店舗区画）',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '港区',
      address: '東京都港区南青山6-12-1',
      access: [
        { line: '東京メトロ銀座線', station: '表参道', walk: 7 },
        { line: '半蔵門線', station: '表参道', walk: 7 },
        { line: '千代田線', station: '表参道', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 133.74,
      floor: '1・2階',
      floorsTotal: 8,
      builtYear: 1984,
      builtMonth: 5,
      structure: '',
      features: [],
      usage: ['店舗'],
      availableFrom: '2027.06.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上8階/地下1階\n関係会社募集物件（店舗区画）。共益費：賃料に含む。想定天井高2,500mm、床荷重300kg/㎡、電気容量 電灯100A・動力は空調用のみ、機械警備（ICカード）、光ケーブル引込済、ガス設備なし、水道設備なし、引渡状態：PB下地渡し。駐車場：相談。\n募集面積：442.13㎡。'
    },
    {
      id: 'APLACE-SHINAGAWA-E-5FB2',
      title: 'A-PLACE品川東（本館）',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区港南1-7-18',
      access: [
        { line: '京急線', station: '品川', walk: 10 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 92.15,
      floor: '5階B2',
      floorsTotal: 7,
      builtYear: 1985,
      builtMonth: 9,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上7階/地下1階\n共益費：賃料に含む。個別空調、天井高2,550mm、床荷重300kg/㎡、コンセント容量90VA/㎡、フリーアクセスフロア40mm、機械警備・有人管理、光ケーブル導入可（MDFまで引込済）。駐車場：相談。\n募集面積：304.64㎡。'
    },
    {
      id: 'FUJI-BLDG-40-9F',
      title: 'フジビル40',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区桜丘町15-14',
      access: [
        { line: '東京メトロ', station: '渋谷', walk: 5 },
        { line: '東急線', station: '渋谷', walk: 5 },
        { line: '京王線', station: '渋谷', walk: 5 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 28.52,
      floor: '9階',
      floorsTotal: 9,
      builtYear: 1992,
      builtMonth: 4,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.04.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上9階/地下1階\n敷金：相談。個別空調、天井高2,390mm、床荷重300kg/㎡、コンセント容量100VA/㎡、フリーアクセスフロアなし、光ケーブル引込済（MDFまで引込済）、機械警備。駐車場：なし。\n募集面積：94.29㎡。'
    },
    {
      id: 'WAVE-SHIBUYA-5-6',
      title: 'WAVE渋谷',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区東2-25-3',
      access: [
        { line: 'JR各線', station: '渋谷', walk: 10 },
        { line: '東京メトロ', station: '渋谷', walk: 10 },
        { line: '東急線', station: '渋谷', walk: 10 },
        { line: '京王線', station: '渋谷', walk: 10 },
        { line: 'JR各線', station: '恵比寿', walk: 11 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 11 },
        { line: '東急東横線', station: '代官山', walk: 13 }
      ],
      rent: 0, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 22.54,
      floor: '5・6階',
      floorsTotal: 6,
      builtYear: 1995,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上6階\n個別空調、天井高2F 2,700mm／3F 2,770mm／5F 2,370mm／6F 2,800mm（一部下がり天井・上部吹抜あり）、床荷重300kg/㎡（5・6F 180kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロアなし、光ケーブル引込済（Wi-Fi無料）、セキュリティなし。駐車場：相談。\n募集面積：74.52㎡。'
    },
    {
      id: 'WAVE-SHIBUYA-3',
      title: 'WAVE渋谷',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区東2-25-3',
      access: [
        { line: 'JR各線', station: '渋谷', walk: 10 },
        { line: '東京メトロ', station: '渋谷', walk: 10 },
        { line: '東急線', station: '渋谷', walk: 10 },
        { line: '京王線', station: '渋谷', walk: 10 },
        { line: 'JR各線', station: '恵比寿', walk: 11 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 11 },
        { line: '東急東横線', station: '代官山', walk: 13 }
      ],
      rent: 0, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 16.98,
      floor: '3階',
      floorsTotal: 6,
      builtYear: 1995,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.01.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上6階\n個別空調、天井高2F 2,700mm／3F 2,770mm／5F 2,370mm／6F 2,800mm（一部下がり天井・上部吹抜あり）、床荷重300kg/㎡（5・6F 180kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロアなし、光ケーブル引込済（Wi-Fi無料）、セキュリティなし。駐車場：相談。\n募集面積：56.14㎡。'
    },
    {
      id: 'WAVE-SHIBUYA-2',
      title: 'WAVE渋谷',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区東2-25-3',
      access: [
        { line: 'JR各線', station: '渋谷', walk: 10 },
        { line: '東京メトロ', station: '渋谷', walk: 10 },
        { line: '東急線', station: '渋谷', walk: 10 },
        { line: '京王線', station: '渋谷', walk: 10 },
        { line: 'JR各線', station: '恵比寿', walk: 11 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 11 },
        { line: '東急東横線', station: '代官山', walk: 13 }
      ],
      rent: 0, managementFee: 0, deposit: 6, keyMoney: 0,
      areaTsubo: 19.56,
      floor: '2階',
      floorsTotal: 6,
      builtYear: 1995,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上6階\n個別空調、天井高2F 2,700mm／3F 2,770mm／5F 2,370mm／6F 2,800mm（一部下がり天井・上部吹抜あり）、床荷重300kg/㎡（5・6F 180kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロアなし、光ケーブル引込済（Wi-Fi無料）、セキュリティなし。駐車場：相談。\n募集面積：64.67㎡。'
    },
    {
      id: 'IO-SHIMBASHI-6F',
      title: 'I/O shimbashi',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区新橋1-11-2',
      access: [
        { line: '東京メトロ銀座線', station: '新橋', walk: 1 },
        { line: 'JR山手線', station: '新橋', walk: 2 },
        { line: '都営浅草線', station: '新橋', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 17.47,
      floor: '6階',
      floorsTotal: 6,
      builtYear: 1964,
      builtMonth: 11,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】改修2020.8／地上6階/地下1階\n内装付き・家具なしプラン。\n契約：定期借家契約（2〜3年）※3ヶ月前解約予告／敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／清掃・水光熱費は賃料に含む。※プラン欄記載の引渡日は2026.09.01（予定）、募集表記載は即日。\n個別空調、天井高2,650mm、床荷重300kg/㎡、電源容量75A/㎡、フリーアクセスフロア50mm、光ケーブル導入可（各階EPSまで引込済）、機械警備（SECOM）。駐車場：なし。\nhttps://spacely.co.jp/tokyu-land/io-shimbashi_QUICK。\n募集面積：57.77㎡。'
    },
    {
      id: 'ST-LUKES-TOWER-3809',
      title: '聖路加タワー',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区明石町8-1',
      access: [
        { line: '東京メトロ日比谷線', station: '築地', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 100.43,
      floor: '3809（38階）',
      floorsTotal: 47,
      builtYear: 1994,
      builtMonth: 4,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上47階/地下4階\n用途：1階 飲食店舗、3階以上 事務所。\nセントラル空調、天井高2,600mm（一部下がり天井2,100mmあり）、床荷重300kg/㎡、コンセント容量100VA/㎡（照明容量含む／照明容量除くと60VA/㎡）、フリーアクセスフロア220mm、光ケーブル導入可（MDFまで引込済）、機械警備。駐車場：相談。\n募集面積：332.00㎡。'
    },
    {
      id: 'NIHONBASHI-HONCHO-2F',
      title: '日本橋本町東急ビル',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区日本橋本町2-4-1',
      access: [
        { line: '東京メトロ銀座線', station: '三越前', walk: 3 },
        { line: 'JR総武線', station: '新日本橋', walk: 4 },
        { line: '東京メトロ銀座線', station: '日本橋', walk: 8 },
        { line: '東西線', station: '日本橋', walk: 8 },
        { line: '都営浅草線', station: '日本橋', walk: 8 },
        { line: 'JR', station: '東京', walk: 10 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 340.35,
      floor: '2階',
      floorsTotal: 8,
      builtYear: 2004,
      builtMonth: 10,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2028.02.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】リニューアル2014.3／地上8階/地下1階\n日本橋エリアで希少な300坪超・1フロアにて募集開始。CPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。ZEB。\n個別空調、天井高2,750mm、床荷重300kg/㎡（一部500kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロア実装125mm（有効95mm）、光回線引込可、機械警備（ICカード）。駐車場：相談。\n募集面積：1,125.13㎡。'
    },
    {
      id: 'NIHONBASHI-MARUZEN-5A',
      title: '日本橋丸善東急ビル',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '中央区',
      address: '東京都中央区日本橋2-3-10',
      access: [
        { line: 'JR', station: '東京', walk: 3 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 134.98,
      floor: '5-A',
      floorsTotal: 11,
      builtYear: 2006,
      builtMonth: 11,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.05.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上11階/地下2階\nCPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。\n個別空調、天井高2,750mm、床荷重300kg/㎡（一部500kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロア実装150mm（有効100mm）、光ケーブル引込可、機械警備（ICカード）。駐車場：機械式（普通）／機械式（HR）台数相談。\n募集面積：446.22㎡。'
    },
    {
      id: 'HAMAMATSUCHO-SQ-9F',
      title: '浜松町スクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区浜松町1-30-5',
      access: [
        { line: 'JR', station: '浜松町', walk: 1 },
        { line: '東京モノレール', station: '浜松町', walk: 1 },
        { line: '都営浅草線', station: '大門', walk: 1 },
        { line: '大江戸線', station: '大門', walk: 1 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 274.04,
      floor: '9階',
      floorsTotal: 20,
      builtYear: 2004,
      builtMonth: 9,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】リニューアル2021.10／地上20階/地下1階\n浜松町スクエア。CPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。2021.10共用部リニューアル。\n個別空調、天井高2,700mm、床荷重300kg/㎡（一部500kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロア実装125mm、光回線引込可、機械警備（ICカード）。駐車場：機械式（中型）¥55千/月 台数相談。\nhttps://spacely.co.jp/tokyu-land/hamamatsucho-square。\n募集面積：905.95㎡。'
    },
    {
      id: 'HAMAMATSUCHO-SQ-2-A',
      title: '浜松町スクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区浜松町1-30-5',
      access: [
        { line: 'JR', station: '浜松町', walk: 1 },
        { line: '東京モノレール', station: '浜松町', walk: 1 },
        { line: '都営浅草線', station: '大門', walk: 1 },
        { line: '大江戸線', station: '大門', walk: 1 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 134.61,
      floor: '2-A',
      floorsTotal: 20,
      builtYear: 2004,
      builtMonth: 9,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】リニューアル2021.10／地上20階/地下1階\n浜松町スクエア。CPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。2021.10共用部リニューアル。\n個別空調、天井高2,700mm、床荷重300kg/㎡（一部500kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロア実装125mm、光回線引込可、機械警備（ICカード）。駐車場：機械式（中型）¥55千/月 台数相談。\nhttps://spacely.co.jp/tokyu-land/hamamatsucho-square。\n募集面積：445.01㎡。'
    },
    {
      id: 'TAMACHI-SQUARE-3B',
      title: '田町スクエア',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区芝5-26-24',
      access: [
        { line: 'JR山手線', station: '田町', walk: 5 },
        { line: '京浜東北線', station: '田町', walk: 5 },
        { line: '都営浅草線', station: '三田', walk: 2 },
        { line: '都営三田線', station: '三田', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 111.11,
      floor: '3-B',
      floorsTotal: 6,
      builtYear: 1985,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】改修2021.1／地上6階/地下1階\nCPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。事務所化工事実施／2021.1全面リニューアル。\n3-B：個別空調、天井高3,600mm（大梁下2,620mm）、床荷重300kg/㎡、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア実装50mm、給排水設備 貸室内使用可、中和処理装置/給排気設備/ガス設備なし、光回線引込可、機械警備（ICカード）。駐車場：相談。\nhttps://spacely.co.jp/tokyu-land/tamachi_square。\n募集面積：367.32㎡。'
    },
    {
      id: 'APLACE-AOYAMA-2-A',
      title: 'A-PLACE青山',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区北青山2-11-3',
      access: [
        { line: '東京メトロ銀座線', station: '外苑前', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 281.47,
      floor: '2-A',
      floorsTotal: 6,
      builtYear: 1966,
      builtMonth: 9,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.11.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】耐震改装2008.7／リニューアル2025.5／地上6階/地下1階\nA-PLACE青山。個別空調、天井高1-A 2,700mm（一部2,500mm）／2-A 2,700mm（一部2,550mm）、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装75mm、光回線引込可、機械警備（ICカード）。バイク置場・駐輪場あり、荷捌き台あり。駐車場：平置き2台。\n募集面積：930.50㎡。'
    },
    {
      id: 'APLACE-AOYAMA-1-A',
      title: 'A-PLACE青山',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '港区',
      address: '東京都港区北青山2-11-3',
      access: [
        { line: '東京メトロ銀座線', station: '外苑前', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 182.41,
      floor: '1-A',
      floorsTotal: 6,
      builtYear: 1966,
      builtMonth: 9,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.11.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】耐震改装2008.7／リニューアル2025.5／地上6階/地下1階\nA-PLACE青山。個別空調、天井高1-A 2,700mm（一部2,500mm）／2-A 2,700mm（一部2,550mm）、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装75mm、光回線引込可、機械警備（ICカード）。バイク置場・駐輪場あり、荷捌き台あり。駐車場：平置き2台。\n※1-Aは別途倉庫契約必須となります。\n募集面積：603.04㎡。'
    },
    {
      id: 'SHINMEGURO-TOKYU-4B',
      title: '新目黒東急ビル',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区上大崎2-25-2',
      access: [
        { line: 'JR山手線', station: '目黒', walk: 2 },
        { line: '東京メトロ南北線', station: '目黒', walk: 2 },
        { line: '都営三田線', station: '目黒', walk: 2 },
        { line: '東急目黒線', station: '目黒', walk: 2 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 197.91,
      floor: '4-B',
      floorsTotal: 14,
      builtYear: 2012,
      builtMonth: 12,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.01.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上14階/地下1階\n居抜き相談可能／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。共用シャワーブースあり、駐輪場：複数台空きあり。\n個別空調、天井高2〜7階2,800mm・8〜14階2,700mm、床荷重300kg/㎡（一部500kg/㎡）、コンセント容量60VA/㎡、フリーアクセスフロア実装100mm（有効75mm）、光回線引込可、機械警備（ICカード）、フロアセキュリティ。駐車場：機械式（普通・HR）台数相談。\nhttps://spacely.co.jp/tokyu-land/shinmeguro_tokyu_bldg。\n募集面積：654.25㎡。'
    },
    {
      id: 'TOKYU-LAND-EBISU-1F',
      title: '東急不動産恵比寿ビル',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区恵比寿1-18-18',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 4 },
        { line: '埼京線', station: '恵比寿', walk: 4 },
        { line: '湘南新宿ライン', station: '恵比寿', walk: 4 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 186.48,
      floor: '1階',
      floorsTotal: 9,
      builtYear: 1993,
      builtMonth: 3,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】地上9階/地下1階\n個別空調、天井高2,550mm、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装70mm、光回線引込可、機械警備。※本区画は通常事務所使用での引渡しとなります。\nhttps://www.vr-view.jp/TC/tokyu-land-corporation-ebisu/final/。\n募集面積：616.49㎡。'
    },
    {
      id: 'APLACE-EBISU-HIGASHI-5F',
      title: 'A-PLACE恵比寿東',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区東3-13-11',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 6 },
        { line: '埼京線', station: '恵比寿', walk: 6 },
        { line: '湘南新宿ライン', station: '恵比寿', walk: 6 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 91.65,
      floor: '5階',
      floorsTotal: 10,
      builtYear: 1992,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】リニューアル2008.9／地上10階/地下2階\n個別空調、天井高2,500mm、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装50mm、光回線引込可、機械警備。駐車場：相談。\n募集面積：303.00㎡。'
    },
    {
      id: 'EBISU-PRIME-SQ-9-C',
      title: '恵比寿プライムスクエア タワー',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区広尾1-1-39',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 6 },
        { line: '埼京線', station: '恵比寿', walk: 6 },
        { line: '湘南新宿ライン', station: '恵比寿', walk: 6 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 82.67,
      floor: '9-C',
      floorsTotal: 22,
      builtYear: 1997,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.02.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上22階/地下3階\n恵比寿プライムスクエア タワー。セントラル空調（個別制御可能）、天井高2,630mm、床荷重500kg/㎡、コンセント容量45VA/㎡、フリーアクセスフロア実装70mm、光回線引込可、機械警備（キーボックス）、管理人常駐（24時間）。\nhttps://www.vr-view.jp/TC/ebisu-prime-square-tower/final/。\n9-C：居抜き相談可能【新規】。\n募集面積：273.32㎡。'
    },
    {
      id: 'EBISU-PRIME-SQ-2-C1',
      title: '恵比寿プライムスクエア タワー',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区広尾1-1-39',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 6 },
        { line: '埼京線', station: '恵比寿', walk: 6 },
        { line: '湘南新宿ライン', station: '恵比寿', walk: 6 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 27.02,
      floor: '2-C1',
      floorsTotal: 22,
      builtYear: 1997,
      builtMonth: 1,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.11.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上22階/地下3階\n恵比寿プライムスクエア タワー。セントラル空調（個別制御可能）、天井高2,630mm、床荷重500kg/㎡、コンセント容量45VA/㎡、フリーアクセスフロア実装70mm、光回線引込可、機械警備（キーボックス）、管理人常駐（24時間）。\nhttps://www.vr-view.jp/TC/ebisu-prime-square-tower/final/。\n2-C1：什器付きプラン（オプション）。\n募集面積：89.35㎡。'
    },
    {
      id: 'GUILD-EBISUMINAMI-2F',
      title: 'GUILD恵比寿南',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区恵比寿南2-14-6',
      access: [
        { line: 'JR山手線', station: '恵比寿', walk: 8 },
        { line: '埼京線', station: '恵比寿', walk: 8 },
        { line: '湘南新宿ライン', station: '恵比寿', walk: 8 },
        { line: '東京メトロ日比谷線', station: '恵比寿', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 45.77,
      floor: '2階',
      floorsTotal: 4,
      builtYear: 1991,
      builtMonth: 3,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】リニューアル2026.7予定／地上4階/地下1階\n事務所（内装・家具付き）。座席数26席、会議室2室、個室2室。専用バルコニー有。\n敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／内装・家具付き／原状変更・原状回復不要。事務所テナント様向け特典：ビジネスエアポート優待サービス。\n個別空調、スケルトン天井、天井高2階2,800mm（梁下有効2,300mm）、床荷重295kg/㎡、コンセント容量70VA/㎡、フリーアクセスフロア2階実装50mm（有効30mm）、光回線引込可、機械警備（ICカード）。\nhttps://spacely.co.jp/kino-bim/GUILD_ebisuminami。\n募集面積：151.33㎡。'
    },
    {
      id: 'COERU-SHIBUYA-11',
      title: 'コエル渋谷',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区道玄坂1-20-3',
      access: [
        { line: 'JR山手線', station: '渋谷', walk: 6 },
        { line: '埼京線', station: '渋谷', walk: 6 },
        { line: '湘南新宿ライン', station: '渋谷', walk: 6 },
        { line: '東京メトロ銀座線', station: '渋谷', walk: 6 },
        { line: '半蔵門線', station: '渋谷', walk: 6 },
        { line: '副都心線', station: '渋谷', walk: 6 },
        { line: '東急東横線', station: '渋谷', walk: 6 },
        { line: '田園都市線', station: '渋谷', walk: 6 },
        { line: '京王井の頭線', station: '神泉', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 29.19,
      floor: '11階',
      floorsTotal: 13,
      builtYear: 2022,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.12.12(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上13階\n事務所（内装・家具付きオフィス 4F・11F）。6カ月前予告で解約可（対象フロアのみ）／敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／内装・家具付き／原状回復不要（※内装・家具付きのみ）。\n個別空調、スケルトン風天井、天井高3,210mm（梁下有効2,530mm）、床荷重300kg/㎡、電源容量60VA/㎡、フリーアクセスフロア60mm、光回線引込可、機械警備（スマートロック）、専有部内にトイレ・洗面台男女各1ヶ所、パントリー有。\nhttps://spacely.co.jp/tokyu-land/COERU。\n募集面積：96.50㎡。'
    },
    {
      id: 'COERU-SHIBUYA-4',
      title: 'コエル渋谷',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区道玄坂1-20-3',
      access: [
        { line: 'JR山手線', station: '渋谷', walk: 6 },
        { line: '埼京線', station: '渋谷', walk: 6 },
        { line: '湘南新宿ライン', station: '渋谷', walk: 6 },
        { line: '東京メトロ銀座線', station: '渋谷', walk: 6 },
        { line: '半蔵門線', station: '渋谷', walk: 6 },
        { line: '副都心線', station: '渋谷', walk: 6 },
        { line: '東急東横線', station: '渋谷', walk: 6 },
        { line: '田園都市線', station: '渋谷', walk: 6 },
        { line: '京王井の頭線', station: '神泉', walk: 4 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 29.19,
      floor: '4階',
      floorsTotal: 13,
      builtYear: 2022,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.09.27(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上13階\n事務所（内装・家具付きオフィス 4F・11F）。6カ月前予告で解約可（対象フロアのみ）／敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／内装・家具付き／原状回復不要（※内装・家具付きのみ）。\n個別空調、スケルトン風天井、天井高3,210mm（梁下有効2,530mm）、床荷重300kg/㎡、電源容量60VA/㎡、フリーアクセスフロア60mm、光回線引込可、機械警備（スマートロック）、専有部内にトイレ・洗面台男女各1ヶ所、パントリー有。\nhttps://spacely.co.jp/tokyu-land/COERU。\n募集面積：96.50㎡。'
    },
    {
      id: 'COERU-SHIBUYA-2CHOME-3F',
      title: 'コエル渋谷二丁目',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区渋谷2-3-5',
      access: [
        { line: '東京メトロ銀座線', station: '渋谷', walk: 8 },
        { line: '半蔵門線', station: '渋谷', walk: 8 },
        { line: '副都心線', station: '渋谷', walk: 8 },
        { line: '東急東横線', station: '渋谷', walk: 8 },
        { line: '田園都市線', station: '渋谷', walk: 8 },
        { line: '東京メトロ銀座線', station: '表参道', walk: 9 },
        { line: '千代田線', station: '表参道', walk: 9 },
        { line: '半蔵門線', station: '表参道', walk: 9 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 64.65,
      floor: '3階',
      floorsTotal: 10,
      builtYear: 2025,
      builtMonth: 3,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.08.16(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上10階\n事務所（内装・家具付き）。短期での賃借可（6ヶ月前予告で解約可）／敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／内装・家具付き／原状変更・原状回復不要。事務所テナント様向け特典：ビジネスエアポート優待サービス。\n個別空調、システム天井、天井高2,800mm（10階2,780mm）、床荷重295kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装100mm（有効65.6mm）、機械警備（ICカード）。\n募集面積：213.72㎡。'
    },
    {
      id: 'COERU-SHIBUYA-EAST-4F',
      title: 'コエル渋谷イースト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '渋谷区',
      address: '東京都渋谷区渋谷2-6-6',
      access: [
        { line: 'JR山手線', station: '渋谷', walk: 8 },
        { line: '埼京線', station: '渋谷', walk: 8 },
        { line: '湘南新宿ライン', station: '渋谷', walk: 8 },
        { line: '東京メトロ銀座線', station: '渋谷', walk: 8 },
        { line: '半蔵門線', station: '渋谷', walk: 8 },
        { line: '副都心線', station: '渋谷', walk: 8 },
        { line: '東急東横線', station: '渋谷', walk: 8 },
        { line: '田園都市線', station: '渋谷', walk: 8 },
        { line: '東京メトロ千代田線', station: '表参道', walk: 7 },
        { line: '銀座線', station: '表参道', walk: 7 },
        { line: '半蔵門線', station: '表参道', walk: 7 }
      ],
      rent: 0, managementFee: 0, deposit: 0, keyMoney: 0,
      areaTsubo: 42.75,
      floor: '4階',
      floorsTotal: 6,
      builtYear: 1972,
      builtMonth: 6,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '即日',
      updatedAt: '2026-08-01',
      description: '【建物】改修2024.10／地上6階\n事務所（内装・家具付き）。執務席30席（22席＋インナーバルコニー8席）、会議室2室（6名用・4名用）、個室ブース1室、入居者限定屋上バルコニー有。\n短期での賃借可（6ヶ月前予告で解約可）／敷金0ヶ月（当社指定保証会社利用、もしくは敷金6ヶ月）／内装・家具付き／原状変更・原状回復不要。\nスケルトン天井、天井高4F 2,435mm（梁下有効2,040mm）、個別空調、床荷重 既存部180kg/㎡・増築部290kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装50mm（有効約30mm）、機械警備。\n募集面積：141.34㎡。'
    },
    {
      id: 'KUDANKAIKAN-3-C',
      title: '九段会館テラス『Classic Office』',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区九段南1-6-5',
      access: [
        { line: '東京メトロ半蔵門線', station: '九段下', walk: 1 },
        { line: '東西線', station: '九段下', walk: 1 },
        { line: '都営新宿線', station: '九段下', walk: 1 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 23.71,
      floor: '3-C（先行）',
      floorsTotal: 17,
      builtYear: 2022,
      builtMonth: 7,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.09.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上17階/地下3階\n九段会館テラス『Classic Office』THROUGH 〜原状回復免除サービス付〜。\nCPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。\n個別空調、2・3階スケルトン風天井、天井高3,850mm（設備下2,800mm）、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装40mm（有効36mm）、光回線引込可、機械警備（ICカード）、非常用発電機120時間、3回線スポットネットワーク受電。\nテナント特典：施設食堂(B1F)・貸し会議室/貸しホール(2F・3F)割引、シェアオフィス(B1F・1F)優待、Classic Office専用ラウンジ(3F)無料利用。\nhttps://spacely.co.jp/tokyu-land/kudankaikan_terrace_CO。\n募集面積：78.41㎡。'
    },
    {
      id: 'KUDANKAIKAN-2-C',
      title: '九段会館テラス『Classic Office』',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区九段南1-6-5',
      access: [
        { line: '東京メトロ半蔵門線', station: '九段下', walk: 1 },
        { line: '東西線', station: '九段下', walk: 1 },
        { line: '都営新宿線', station: '九段下', walk: 1 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 23.1,
      floor: '2-C',
      floorsTotal: 17,
      builtYear: 2022,
      builtMonth: 7,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2026.09.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】地上17階/地下3階\n九段会館テラス『Classic Office』THROUGH 〜原状回復免除サービス付〜。\nCPI連動賃料導入物件／環境付加価値施策推進費対象物件（別途 月額91円/㎡）。\n個別空調、2・3階スケルトン風天井、天井高3,850mm（設備下2,800mm）、床荷重300kg/㎡、コンセント容量60VA/㎡、フリーアクセスフロア実装40mm（有効36mm）、光回線引込可、機械警備（ICカード）、非常用発電機120時間、3回線スポットネットワーク受電。\nテナント特典：施設食堂(B1F)・貸し会議室/貸しホール(2F・3F)割引、シェアオフィス(B1F・1F)優待、Classic Office専用ラウンジ(3F)無料利用。\nhttps://spacely.co.jp/tokyu-land/kudankaikan_terrace_CO。\n募集面積：76.38㎡。'
    },
    {
      id: 'OSAKI-CORE-20',
      title: '（仮称）大崎コアプロジェクト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東五反田2-12-19',
      access: [
        { line: 'JR山手線', station: '大崎', walk: 4 },
        { line: '埼京線', station: '大崎', walk: 4 },
        { line: '湘南新宿ライン', station: '大崎', walk: 4 },
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '都営浅草線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '五反田', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 740.04,
      floor: '20階',
      floorsTotal: 20,
      builtYear: 2027,
      builtMonth: 2,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.03.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】竣工予定／地上20階/地下2階\n（仮称）大崎コアプロジェクト（街区名称：大崎リバーウォークガーデン）\n基準階貸床面積2,562㎡（約775坪）。個別空調、グリッド式システム天井、天井高2,900mm、床荷重500kg/㎡（ヘビーデューティーゾーン800kg/㎡）、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア100mm、非常用発電機120時間、光回線引込可、機械警備（ICカード）、フラッパーゲート。\n環境認証複数取得予定／1・2階食堂設置／シェアオフィス（ラウンジ・会議室等）／先行仕上げ区画ご案内開始。\n賃料・共益費・駐車場：相談。\n募集面積：2,446.41㎡。'
    },
    {
      id: 'OSAKI-CORE-19',
      title: '（仮称）大崎コアプロジェクト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東五反田2-12-19',
      access: [
        { line: 'JR山手線', station: '大崎', walk: 4 },
        { line: '埼京線', station: '大崎', walk: 4 },
        { line: '湘南新宿ライン', station: '大崎', walk: 4 },
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '都営浅草線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '五反田', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 773.65,
      floor: '19階',
      floorsTotal: 20,
      builtYear: 2027,
      builtMonth: 2,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.03.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】竣工予定／地上20階/地下2階\n（仮称）大崎コアプロジェクト（街区名称：大崎リバーウォークガーデン）\n基準階貸床面積2,562㎡（約775坪）。個別空調、グリッド式システム天井、天井高2,900mm、床荷重500kg/㎡（ヘビーデューティーゾーン800kg/㎡）、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア100mm、非常用発電機120時間、光回線引込可、機械警備（ICカード）、フラッパーゲート。\n環境認証複数取得予定／1・2階食堂設置／シェアオフィス（ラウンジ・会議室等）／先行仕上げ区画ご案内開始。\n賃料・共益費・駐車場：相談。\n募集面積：2,557.53㎡。'
    },
    {
      id: 'OSAKI-CORE-17-18',
      title: '（仮称）大崎コアプロジェクト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東五反田2-12-19',
      access: [
        { line: 'JR山手線', station: '大崎', walk: 4 },
        { line: '埼京線', station: '大崎', walk: 4 },
        { line: '湘南新宿ライン', station: '大崎', walk: 4 },
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '都営浅草線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '五反田', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 775.02,
      floor: '17〜18階（各階）',
      floorsTotal: 20,
      builtYear: 2027,
      builtMonth: 2,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.03.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】竣工予定／地上20階/地下2階\n（仮称）大崎コアプロジェクト（街区名称：大崎リバーウォークガーデン）\n基準階貸床面積2,562㎡（約775坪）。個別空調、グリッド式システム天井、天井高2,900mm、床荷重500kg/㎡（ヘビーデューティーゾーン800kg/㎡）、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア100mm、非常用発電機120時間、光回線引込可、機械警備（ICカード）、フラッパーゲート。\n環境認証複数取得予定／1・2階食堂設置／シェアオフィス（ラウンジ・会議室等）／先行仕上げ区画ご案内開始。\n賃料・共益費・駐車場：相談。\n募集面積：2,562.04㎡。'
    },
    {
      id: 'OSAKI-CORE-16-A',
      title: '（仮称）大崎コアプロジェクト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東五反田2-12-19',
      access: [
        { line: 'JR山手線', station: '大崎', walk: 4 },
        { line: '埼京線', station: '大崎', walk: 4 },
        { line: '湘南新宿ライン', station: '大崎', walk: 4 },
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '都営浅草線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '五反田', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 235.37,
      floor: '16-A',
      floorsTotal: 20,
      builtYear: 2027,
      builtMonth: 2,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.03.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】竣工予定／地上20階/地下2階\n（仮称）大崎コアプロジェクト（街区名称：大崎リバーウォークガーデン）\n基準階貸床面積2,562㎡（約775坪）。個別空調、グリッド式システム天井、天井高2,900mm、床荷重500kg/㎡（ヘビーデューティーゾーン800kg/㎡）、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア100mm、非常用発電機120時間、光回線引込可、機械警備（ICカード）、フラッパーゲート。\n環境認証複数取得予定／1・2階食堂設置／シェアオフィス（ラウンジ・会議室等）／先行仕上げ区画ご案内開始。\n賃料・共益費・駐車場：相談。\n募集面積：778.11㎡。'
    },
    {
      id: 'OSAKI-CORE-11-ABC',
      title: '（仮称）大崎コアプロジェクト',
      deal: 'rent',
      type: 'office',
      status: 'available',
      ward: '品川区',
      address: '東京都品川区東五反田2-12-19',
      access: [
        { line: 'JR山手線', station: '大崎', walk: 4 },
        { line: '埼京線', station: '大崎', walk: 4 },
        { line: '湘南新宿ライン', station: '大崎', walk: 4 },
        { line: 'JR山手線', station: '五反田', walk: 6 },
        { line: '都営浅草線', station: '五反田', walk: 6 },
        { line: '東急池上線', station: '五反田', walk: 6 }
      ],
      rent: 0, managementFee: 0, deposit: 12, keyMoney: 0,
      areaTsubo: 539.63,
      floor: '11-ABC',
      floorsTotal: 20,
      builtYear: 2027,
      builtMonth: 2,
      structure: '',
      features: [],
      usage: ['事務所'],
      availableFrom: '2027.03.01(予定)',
      updatedAt: '2026-08-01',
      description: '【建物】竣工予定／地上20階/地下2階\n（仮称）大崎コアプロジェクト（街区名称：大崎リバーウォークガーデン）\n基準階貸床面積2,562㎡（約775坪）。個別空調、グリッド式システム天井、天井高2,900mm、床荷重500kg/㎡（ヘビーデューティーゾーン800kg/㎡）、コンセント容量60VA/㎡（将来増設40VA/㎡）、フリーアクセスフロア100mm、非常用発電機120時間、光回線引込可、機械警備（ICカード）、フラッパーゲート。\n環境認証複数取得予定／1・2階食堂設置／シェアオフィス（ラウンジ・会議室等）／先行仕上げ区画ご案内開始。\n賃料・共益費・駐車場：相談。\n募集面積：1,783.93㎡。'
    }
  ];
  /* === PROPERTIES:END === */

  /* 面積換算と坪単価は自動計算するため、物件データ側では持ちません。

     updatedAt（情報更新日）は「新着」バッジの自動判定と新着順の並び替えに
     使います。サンプルデータでは未設定の物件に掲載順で少しずつ古い日付を
     割り当てていますが、実データでは各物件に必ず設定してください。 */
  var FALLBACK_BASE = new Date('2026-07-17T00:00:00');

  /* 取引条件の有効期限を情報更新日から何日後にするか */
  var VALID_DAYS = 14;

  PROPERTIES.forEach(function (p, i) {
    if (!p.updatedAt) {
      var d = new Date(FALLBACK_BASE.getTime() - i * 5 * 86400000);
      p.updatedAt = d.toISOString().slice(0, 10);
    }
    /* 都県は市区名から補完する（マスタにない市区は空のまま） */
    p.pref = AREA_PREF[p.ward] || '';
    /* 取引条件の有効期限。不動産の表示に関する公正競争規約で表示が必要な項目。
       情報更新日から VALID_DAYS 日間として自動算出するため、入力は不要です。 */
    var validUntil = new Date(p.updatedAt + 'T00:00:00');
    validUntil.setDate(validUntil.getDate() + VALID_DAYS);
    p.validUntil = validUntil.toISOString().slice(0, 10);
    p.areaSqm = Math.round(p.areaTsubo * 3.30578 * 10) / 10;
    /* 賃貸は月額賃料、売買は販売価格を金額として扱う */
    p.amount = p.deal === 'sale' ? p.price : p.rent;
    /* 金額が「応相談」のときは坪単価も出さない（0円と表示すると誤解を招く） */
    p.tsuboUnitPrice = (p.areaTsubo && p.amount) ? Math.round(p.amount / p.areaTsubo) : 0;
  });

  global.PORTAL_DATA = {
    site: SITE_CONFIG,
    map: MAP_CONFIG,
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
