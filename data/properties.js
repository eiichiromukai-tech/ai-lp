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
    demoNotice: true
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
      id: 'CMP-9001',
      title: '【テスト】神田三崎町 1階路面店舗',
      deal: 'rent',
      type: 'shop',
      status: 'available',
      ward: '千代田区',
      address: '東京都千代田区神田三崎町三丁目4番9号',
      access: [
        { line: 'JR中央・総武線', station: '水道橋', walk: 3 }
      ],
      rent: 480000, managementFee: 35000, deposit: 10, keyMoney: 0,
      contractTerm: '2年（定期借家）',
      areaTsubo: 22.4,
      floor: '1F',
      floorsTotal: 8,
      builtYear: 1998,
      builtMonth: 8,
      structure: 'SRC造',
      features: ['1階路面', '居抜き', '飲食可'],
      usage: ['飲食店', '物販'],
      availableFrom: '即入居可',
      updatedAt: '2026-08-04',
      images: [
        { src: 'images/properties/CMP-9001-01_テスト.jpg', caption: 'テスト' }
      ],
      description: '動作確認用のテスト物件です。'
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
    p.tsuboUnitPrice = p.areaTsubo ? Math.round(p.amount / p.areaTsubo) : 0;
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
