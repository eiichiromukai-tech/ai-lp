/* =====================================================
   図面から取り出した文字を、入力欄の値に振り分ける
   -----------------------------------------------------
   Node（テスト）とブラウザ（import.html）の両方から読み込みます。

   【方針】自信のあるものだけ入れて、迷ったら空のままにします。
   図面の書き方は会社ごとにばらばらで、機械が確実に読めるものではありません。
   間違った値をそれらしく入れるより、空欄にして人に入れてもらうほうが安全です。

   入れた項目は画面上で色を付け、必ず人の目で確認してもらいます。
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EXTRACT_CORE = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TSUBO_PER_SQM = 0.3025;   /* 1m² = 0.3025坪（表示規約で使われる換算） */

  /* 全角の数字・記号を半角に直す。図面はどちらの表記も混ざる */
  function normalize(text) {
    return String(text || '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[．]/g, '.').replace(/[，]/g, ',').replace(/[：]/g, ':')
      .replace(/[〜～]/g, '~').replace(/　/g, ' ');
  }

  /* 「1,234,000円」「123万円」「1億2,000万円」などを円の数値にする */
  function toYen(raw) {
    var s = String(raw || '').replace(/[,\s]/g, '');
    var total = 0, matched = false;
    var oku = /([0-9]+(?:\.[0-9]+)?)億/.exec(s);
    if (oku) { total += parseFloat(oku[1]) * 100000000; matched = true; s = s.replace(oku[0], ''); }
    var man = /([0-9]+(?:\.[0-9]+)?)万/.exec(s);
    if (man) { total += parseFloat(man[1]) * 10000; matched = true; s = s.replace(man[0], ''); }
    if (matched) {
      /* 「1億2000万5000円」のような端数 */
      var rest = /([0-9]+(?:\.[0-9]+)?)\s*円/.exec(s);
      if (rest) total += parseFloat(rest[1]);
      return Math.round(total);
    }
    var plain = /([0-9]+(?:\.[0-9]+)?)/.exec(s);
    return plain ? Math.round(parseFloat(plain[1])) : null;
  }

  /* 和暦を西暦に直す */
  function toYear(era, n) {
    var base = { '令和': 2018, '平成': 1988, '昭和': 1925 }[era];
    return base ? base + n : null;
  }

  /* 見出しのすぐ後ろの値を取る。「賃料：1,234,000円」「賃料 1,234,000円」
     直後の数文字（tail）も返す。「25,000円/坪」のような単位の違いに気づくため。 */
  function after(text, labels, valuePattern) {
    for (var i = 0; i < labels.length; i++) {
      var re = new RegExp(labels[i] + '[^0-9a-zA-Z\\u4e00-\\u9fa5]{0,6}?(' + valuePattern + ')');
      var m = re.exec(text);
      if (m) {
        return { value: m[1], tail: text.slice(m.index + m[0].length, m.index + m[0].length + 4) };
      }
    }
    return null;
  }

  /* 金額の書き方。「1,234,000円」「123万円」「1億2,000万円」をまとめて拾う */
  var MONEY = '[0-9][0-9,.]*(?:\\s*[億万]\\s*[0-9,.]*)*\\s*円?';

  /* 坪単価・m²単価は「総額」ではないので、取り違えないようにする */
  function isUnitPrice(tail) {
    return /^\s*[\/／]?\s*(?:坪|m2|m²|㎡|平米)/.test(String(tail || ''));
  }

  function create(MASTERS) {
    var M = MASTERS || {};
    var AREAS = M.areas || [];
    var TYPES = (M.types || []).map(function (t) { return t.label; });
    var FEATURES = M.features || [];

    /* 図面によくある言い回しと、物件種別の対応 */
    var TYPE_HINTS = [
      { label: 'オフィス', words: ['オフィス', '事務所'] },
      { label: '倉庫・工場', words: ['倉庫', '工場', '物流'] },
      { label: '一棟ビル', words: ['一棟', '１棟', 'ビル一括', '一棟売り'] },
      { label: '事業用地', words: ['事業用地', '売土地', '土地面積', '更地'] },
      { label: '店舗', words: ['店舗', '路面', '飲食'] }
    ];

    /* こだわり条件は、図面に書かれている言葉から拾う */
    var FEATURE_HINTS = {
      '1階路面': ['1階路面', '一階路面', '路面店', '路面区画'],
      '居抜き': ['居抜き', '居抜'],
      'スケルトン': ['スケルトン'],
      '飲食可': ['飲食可', '飲食店可', '重飲食'],
      '深夜営業可': ['深夜営業'],
      '24時間利用可': ['24時間'],
      '駐車場あり': ['駐車場'],
      'エレベーターあり': ['エレベーター', 'ＥＶ', 'EV有'],
      '空調更新済': ['空調更新'],
      '看板設置可': ['看板'],
      'セットアップ': ['セットアップ', '居抜きオフィス']
    };

    function extract(rawText) {
      var text = normalize(rawText);
      if (!text.trim()) return { values: {}, notes: [] };

      var v = {};
      var notes = [];

      /* ---------- 金額 ---------- */
      var rent = after(text, ['月額賃料', '賃料', '月額'], MONEY);
      if (rent) {
        var yen = toYen(rent.value);
        if (isUnitPrice(rent.tail)) {
          notes.push('賃料が坪単価（' + rent.value.trim() + rent.tail.trim() +
            '）で書かれているため、入れていません。総額をご入力ください');
        } else if (yen && yen >= 10000) {
          v.rent = String(yen);
        } else if (yen) {
          notes.push('賃料らしき数字（' + rent.value.trim() +
            '）は桁が小さいため、入れていません');
        }
      }
      var fee = after(text, ['共益費', '管理費'], MONEY);
      if (fee && !isUnitPrice(fee.tail)) {
        var f = toYen(fee.value); if (f !== null) v.managementFee = String(f);
      }

      /* 敷金・礼金は「ヶ月」表記が多い。円で書かれていたら入れない（単位が違うため） */
      var deposit = after(text, ['敷金', '保証金'], '[0-9.]+\\s*[ヶかカケ]?月');
      if (deposit) v.deposit = String(parseFloat(deposit.value));
      var key = after(text, ['礼金'], '[0-9.]+\\s*[ヶかカケ]?月');
      if (key) v.keyMoney = String(parseFloat(key.value));
      else if (/礼金[^0-9]{0,6}(無|なし|0)/.test(text)) v.keyMoney = '0';

      var price = after(text, ['販売価格', '売買価格', '価格'], MONEY);
      if (price && !isUnitPrice(price.tail)) {
        var p = toYen(price.value);
        /* 事業用不動産の価格が100万円を下回ることはまず無い。
           下回る場合は坪単価や別の数字を拾っている */
        if (p && p >= 1000000) v.price = String(p);
        else if (p) notes.push('価格らしき数字（' + price.value.trim() +
          '）は桁が小さいため、入れていません');
      }

      var yieldRate = after(text, ['表面利回り', '利回り'], '[0-9.]+\\s*%?');
      if (yieldRate) v.yieldRate = String(parseFloat(yieldRate.value));

      /* ---------- 取引種別 ---------- */
      if (v.price && !v.rent) v.deal = '売買';
      else if (v.rent) v.deal = '賃貸';

      /* ---------- 面積 ---------- */
      /* 坪が書いてあればそれを使う。無ければ m² から換算する */
      var tsuboHit = after(text, ['面積', '専有面積', '貸室面積', '契約面積', '土地面積'], '[0-9,.]+\\s*坪');
      var tsubo = tsuboHit ? tsuboHit.value : null;
      if (!tsubo) { var t2 = /([0-9,.]+)\s*坪/.exec(text); if (t2) tsubo = t2[1]; }
      if (tsubo) {
        v.areaTsubo = String(parseFloat(String(tsubo).replace(/,/g, '')));
      } else {
        var sqm = /([0-9,.]+)\s*(?:m2|m²|㎡|平米|平方メートル)/.exec(text);
        if (sqm) {
          var n = parseFloat(sqm[1].replace(/,/g, ''));
          if (n > 0) {
            v.areaTsubo = String(Math.round(n * TSUBO_PER_SQM * 100) / 100);
            notes.push(sqm[1] + 'm² を ' + v.areaTsubo + '坪 に換算しました');
          }
        }
      }

      /* ---------- 階数・建物階数 ---------- */
      var floor = /(地下\s*[0-9]+\s*階|B\s*[0-9]+\s*F|[0-9]+\s*階(?!建)|[0-9]+\s*F(?![a-zA-Z]))/.exec(text);
      if (floor) {
        v.floor = floor[1].replace(/\s/g, '')
          .replace(/^地下([0-9]+)階$/, 'B$1F')
          .replace(/^([0-9]+)階$/, '$1F');
      }
      var total = /(?:地上)?\s*([0-9]+)\s*階建/.exec(text);
      if (total) v.floorsTotal = total[1];

      /* ---------- 築年月 ---------- */
      var wa = /(令和|平成|昭和)\s*(元|[0-9]+)\s*年\s*([0-9]+)?\s*月?/.exec(text);
      var sei = /((?:19|20)[0-9]{2})\s*[年\/\-.]\s*([0-9]{1,2})?\s*月?/.exec(text);
      var year = null, month = null;
      if (sei) { year = Number(sei[1]); month = sei[2] ? Number(sei[2]) : null; }
      else if (wa) {
        year = toYear(wa[1], wa[2] === '元' ? 1 : Number(wa[2]));
        month = wa[3] ? Number(wa[3]) : null;
      }
      if (year && year >= 1900 && year <= 2100) {
        if (month && month >= 1 && month <= 12) {
          v.built = year + '-' + (month < 10 ? '0' + month : String(month));
        } else {
          notes.push('築年は' + year + '年と読めましたが、月が分からないため入れていません（月まで必要です）');
        }
      }

      /* ---------- 物件名 ---------- */
      /* 見出しが付いているときだけ拾う。図面のどこが物件名かは、
         見出しが無いと機械には判断できないため。 */
      var title = /(?:物件名|建物名|ビル名|名称)\s*[:：]?\s*([^\n]{1,40})/.exec(text);
      if (title) {
        var t = title[1].trim().replace(/\s{2,}.*$/, '');
        if (t) v.title = t;
      }

      /* ---------- 所在地・エリア ---------- */
      var addr = /((?:東京都|神奈川県|埼玉県|千葉県)[^\s、,。]{2,40})/.exec(text);
      if (addr) v.address = addr[1];
      /* エリアは所在地から。無ければ本文全体から探す */
      var haystack = v.address || text;
      var found = AREAS.filter(function (a) { return haystack.indexOf(a) !== -1; });
      /* 「中央区」と「中央林間」のような誤検出を避けるため、長いものを優先して1つだけ採る */
      if (found.length) {
        found.sort(function (a, b) { return b.length - a.length; });
        v.ward = found[0];
      }

      /* ---------- 交通 ---------- */
      /* 「路線『駅』徒歩N分」の形に整えてから渡す。一括登録ツールと同じ読み方をさせるため */
      var lines = [];
      text.split(/[\n／/]/).forEach(function (chunk) {
        var m = /([^\s。、,]{2,20}(?:線|ライン))\s*[「『]?([^\s「」『』]{1,12}?)[」』]?\s*駅?\s*(?:より|から)?\s*徒歩\s*([0-9]+)\s*分/.exec(chunk);
        if (m) lines.push(m[1] + '「' + m[2].replace(/駅$/, '') + '」駅徒歩' + m[3] + '分');
      });
      if (lines.length) v.access = lines.join('／');

      /* ---------- 物件種別 ---------- */
      for (var i = 0; i < TYPE_HINTS.length; i++) {
        var hit = TYPE_HINTS[i].words.some(function (w) { return text.indexOf(w) !== -1; });
        if (hit && TYPES.indexOf(TYPE_HINTS[i].label) !== -1) { v.type = TYPE_HINTS[i].label; break; }
      }

      /* ---------- 建物・条件 ---------- */
      var st = /(SRC造|RC造|S造|鉄骨鉄筋コンクリート造|鉄筋コンクリート造|鉄骨造|木造)/.exec(text);
      if (st) v.structure = st[1];

      var zoning = /((?:第[一二１２]種)?(?:低層|中高層)?住居[^\s、,。]{0,6}地域|近隣商業地域|商業地域|準?工業地域|工業専用地域)/.exec(text);
      if (zoning) v.zoning = zoning[1];

      var bc = after(text, ['建ぺい率', '建蔽率'], '[0-9.]+\\s*%?');
      if (bc) v.buildingCoverage = String(parseFloat(bc.value));
      var far = after(text, ['容積率'], '[0-9.]+\\s*%?');
      if (far) v.floorAreaRatio = String(parseFloat(far.value));

      var term = /((?:定期借家|定借|普通借家)[^\s、,。]{0,10})/.exec(text);
      if (term) v.contractTerm = term[1];

      var avail = after(text, ['入居可能時期', '入居時期', '引渡し?時期', '入居'], '即[^\\s、,。]{0,4}|[0-9]{4}年[0-9]{1,2}月[^\\s、,。]{0,4}|相談');
      if (avail) v.availableFrom = avail.value.trim();

      /* ---------- こだわり条件 ---------- */
      var features = [];
      Object.keys(FEATURE_HINTS).forEach(function (label) {
        if (FEATURES.indexOf(label) === -1) return;
        if (FEATURE_HINTS[label].some(function (w) { return text.indexOf(w) !== -1; })) features.push(label);
      });
      if (features.length) v.features = features;

      return { values: v, notes: notes };
    }

    return { extract: extract, toYen: toYen, normalize: normalize, TSUBO_PER_SQM: TSUBO_PER_SQM };
  }

  return { create: create };
}));
