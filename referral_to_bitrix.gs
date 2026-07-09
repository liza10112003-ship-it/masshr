// ============================================================
// Referral Form → Bitrix24 (Mass Hire Pipeline)
// Форма многоязычная — скрипт сам определяет заполненный язык
//
// Установка:
//   1. Вставьте код в Apps Script таблицы с ответами
//   2. Запустите findDealFields() → скопируйте код поля ГЕО и ID "реферальная программа"
//   3. Вставьте их в константы GEO_FIELD_CODE и SOURCE_REFERRAL_ID ниже
//   4. Установите триггер: onFormSubmit | При отправке формы
// ============================================================

var BITRIX_WEBHOOK = "https://bitrix.ferraraoceanllp.com/rest/45/kpfsu7g1dgfzpojr/";
var CATEGORY_ID    = 7;

var GEO_FIELD_CODE      = "UF_CRM_1769653536652";
var SOURCE_FIELD_CODE   = "UF_CRM_1727275868670";
var SOURCE_REFERRAL_ID  = "3039";

// Маппинг: ключевое слово из заголовка столбца → русское название для комментария
var FIELD_MAP = [
  // Уникальные слова из вопроса про кандидата (слово "друг" на каждом языке)
  { keywords: ["prijatelja",    // HR — друга
               "freundes",      // DE — друга
               "sõbra",         // ET — друга
               "unui prieten",  // RO — друга
               "kamaráda",      // CZ — друга
               "draugo",        // LI — друга
               "drauga",        // LA — друга
               "barátja",       // HU — друга
               "приятел",       // BG — друга
               "друга",         // RU — друга
               "amigo"],        // ES — друга
    label: "ФИО кандидата" },

  { keywords: ["dob kandidata", "alter des kand", "kandidaadi vanus", "vârsta candidat",
               "věk kandidáta", "kandidato amžius", "kandidāta vecums", "jelölt életkora",
               "възраст на канд", "возраст канд", "edad del candidato"],
    label: "Возраст кандидата" },

  { keywords: ["kontaktni podaci", "kontaktdaten zur", "kontaktandmed", "date de contact",
               "kontaktní údaje", "kontaktiniai duom", "kontaktinformācija", "elérhetőségek",
               "контактни данни", "контактные данные", "datos de contacto"],
    label: "Контактные данные" },

  { keywords: ["radno iskustvo", "berufserfahrung", "töökogemus", "experiența prof",
               "pracovní zkušen", "darbo patirtis", "darba pieredze", "munkatapasztalat",
               "трудов опит", "опыт работы", "experiencia laboral"],
    label: "Опыт работы кандидата" },

  { keywords: ["trenutni radni", "aktuelle beschäf", "praegune tööhõive", "locul de muncă",
               "současné zaměst", "dabartinis užimtumas", "pašreizējais nodarbinātības",
               "jelenlegi munkahely", "настояща заетост", "текущая занятость", "empleo actual"],
    label: "Текущая занятость" },

  { keywords: ["tvoje prezime", "dein nachname", "sinu perekon", "numele și prenumele tău",
               "vaše příjmení", "tavo pavardė", "tavs uzvārds", "te vezet", "вашите фамилия",
               "ваши фамилия", "tu apellido"],
    label: "Реферер (ФИО)" },

  { keywords: ["za koji geo", "für welches geo", "millisele geo", "pe ce geo",
               "do kterého geo", "į kurį geo", "uz kuru geo", "melyik geo",
               "за кое geo", "geo preporučujete", "que geo", "за какое geo",
               "рекомендуете кандидата"],
    label: "ГЕО" }
];

// Перевод значения ГЕО из формы (точные значения дропдауна) в английское название Битрикса
var GEO_TRANSLATIONS = {
  // RU
  "румыния": "Romania", "чехия/словакия": "Czech Republic", "болгария": "Bulgaria",
  "испания": "Spain", "венгрия": "Hungary", "литва": "Lithuania",
  "латвия": "Latvia", "эстония": "Estonia", "португалия": "Portugal",
  "польша": "Poland", "италия": "Italy", "хорватия": "Croatia",
  // HR
  "rumunjska": "Romania", "češka / slovačka": "Czech Republic", "bugarska": "Bulgaria",
  "španjolska": "Spain", "mađarska": "Hungary", "litva": "Lithuania",
  "latvija": "Latvia", "estonija": "Estonia", "portugal": "Portugal",
  "poljska": "Poland", "italija": "Italy", "hrvatska": "Croatia", "njemačka": "Germany",
  // DE
  "rumänien": "Romania", "tschechien / slowakei": "Czech Republic", "bulgarien": "Bulgaria",
  "spanien": "Spain", "ungarn": "Hungary", "litauen": "Lithuania",
  "lettland": "Latvia", "estland": "Estonia", "polen": "Poland",
  "italien": "Italy", "kroatien": "Croatia", "deutschland": "Germany",
  // ET
  "rumeenia": "Romania", "tšehhi / slovakkia": "Czech Republic", "bulgaaria": "Bulgaria",
  "hispaania": "Spain", "ungari": "Hungary", "leedu": "Lithuania",
  "läti": "Latvia", "eesti": "Estonia", "poola": "Poland",
  // RO
  "românia": "Romania", "cehia / slovacia": "Czech Republic", "bulgaria": "Bulgaria",
  "spania": "Spain", "ungaria": "Hungary", "lituania": "Lithuania",
  "letonia": "Latvia", "estonia": "Estonia", "portugalia": "Portugal",
  "polonia": "Poland",
  // CZ
  "rumunsko": "Romania", "česko / slovensko": "Czech Republic", "bulharsko": "Bulgaria",
  "španělsko": "Spain", "maďarsko": "Hungary", "lotyšsko": "Latvia",
  "estonsko": "Estonia", "portugalsko": "Portugal", "polsko": "Poland",
  // LI (Lithuanian)
  "rumunija": "Romania", "čekija / slovakija": "Czech Republic", "bulgarija": "Bulgaria",
  "ispanija": "Spain", "vengrija": "Hungary", "lietuva": "Lithuania",
  "estija": "Estonia", "portugalija": "Portugal", "lenkija": "Poland",
  // LV (Latvian)
  "rumānija": "Romania", "čehija / slovākija": "Czech Republic", "bulgārija": "Bulgaria",
  "spānija": "Spain", "ungārija": "Hungary", "igaunija": "Estonia",
  "portugāle": "Portugal", "polija": "Poland",
  // HU
  "románia": "Romania", "csehország / szlovákia": "Czech Republic", "bulgária": "Bulgaria",
  "spanyolország": "Spain", "magyarország": "Hungary", "litvánia": "Lithuania",
  "lettország": "Latvia", "észtország": "Estonia", "portugália": "Portugal",
  "lengyelország": "Poland",
  // BG (кириллица совпадает с RU для: испания, литва, латвия, португалия — уже покрыты выше)
  "румъния": "Romania", "чехия / словакия": "Czech Republic", "българия": "Bulgaria",
  "унгария": "Hungary", "естония": "Estonia", "полша": "Poland"
};

// ============================================================

function onFormSubmit(e) {
  try {
    var responses = e.namedValues;
    var mapped    = mapFields(responses);

    var fio = mapped["ФИО кандидата"] || "";
    var geo   = mapped["ГЕО"] || "";
    var geoEn = geo ? (GEO_TRANSLATIONS[geo.toLowerCase().trim()] || geo) : "";
    var dealTitle = "[REFERRAL] " + fio + (geoEn ? " - " + geoEn : "");

    // Перевод ответов на русский
    var NO_TRANSLATE = ["ФИО кандидата", "Контактные данные", "Реферер (ФИО)", "ГЕО"];
    var ORDER = ["ФИО кандидата", "Возраст кандидата", "Контактные данные",
                 "Опыт работы кандидата", "Текущая занятость", "Реферер (ФИО)", "ГЕО"];
    var commentParts = [];
    ORDER.forEach(function(label) {
      if (!mapped[label]) return;
      var val = mapped[label];
      if (NO_TRANSLATE.indexOf(label) === -1) {
        try {
          var translated = LanguageApp.translate(val, "", "ru");
          if (translated && translated !== val) val = translated;
        } catch (te) {}
      }
      commentParts.push(label + "\n" + val);
    });
    var comment = commentParts.join("\n\n");

    // Найти enum ID для ГЕО в Битриксе (по английскому названию)
    var geoEnumId = getGeoEnumId(geoEn);

    var dealId = createDeal(dealTitle, geoEnumId);
    if (dealId) addTimelineComment(dealId, comment);
    Logger.log("Сделка создана. ID: " + dealId);

  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
  }
}

// Находит заполненные поля и переводит заголовки в русские названия
function mapFields(responses) {
  var result = {};
  for (var key in responses) {
    var val = (responses[key][0] || "").trim();
    if (!val) continue;
    var keyLower = key.toLowerCase();
    var matched = false;
    for (var i = 0; i < FIELD_MAP.length; i++) {
      var entry = FIELD_MAP[i];
      for (var j = 0; j < entry.keywords.length; j++) {
        if (keyLower.indexOf(entry.keywords[j].toLowerCase()) !== -1) {
          result[entry.label] = val;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }
  return result;
}

// Находит enum ID по английскому названию ГЕО
function getGeoEnumId(geoEn) {
  if (!GEO_FIELD_CODE || !geoEn) return null;
  try {
    var url  = BITRIX_WEBHOOK + "crm.deal.fields.json";
    var resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    var fields = JSON.parse(resp.getContentText());
    var field  = fields.result && fields.result[GEO_FIELD_CODE];
    if (field && field.items) {
      for (var i = 0; i < field.items.length; i++) {
        if (field.items[i].VALUE.toLowerCase() === geoEn.toLowerCase()) {
          return field.items[i].ID;
        }
      }
    }
  } catch (e) {
    Logger.log("Ошибка получения ГЕО enum: " + e);
  }
  return null;
}

function createDeal(title, geoEnumId) {
  var url = BITRIX_WEBHOOK + "crm.deal.add.json";

  var fields = {
    TITLE:       title,
    CATEGORY_ID: CATEGORY_ID,
    OPENED:      "Y"
  };

  if (GEO_FIELD_CODE && geoEnumId) {
    fields[GEO_FIELD_CODE] = geoEnumId;
  }

  if (SOURCE_FIELD_CODE && SOURCE_REFERRAL_ID) {
    fields[SOURCE_FIELD_CODE] = SOURCE_REFERRAL_ID;
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields, params: { REGISTER_SONET_EVENT: "Y" } }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result   = JSON.parse(response.getContentText());

  if (result.result) return result.result;
  Logger.log("Deal error: " + JSON.stringify(result));
  return null;
}

function addTimelineComment(dealId, comment) {
  var url = BITRIX_WEBHOOK + "crm.timeline.comment.add.json";
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      fields: { ENTITY_ID: dealId, ENTITY_TYPE: "deal", COMMENT: comment }
    }),
    muteHttpExceptions: true
  };
  var result = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
  if (!result.result) Logger.log("Comment error: " + JSON.stringify(result));
}

// ============================================================
// Запустите один раз → найдёт поле Источник и ID "реферальная программа"
// ============================================================
function findSourceField() {
  var url  = BITRIX_WEBHOOK + "crm.deal.fields.json";
  var resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());

  if (!data.result) { Logger.log("Ошибка: " + JSON.stringify(data)); return; }

  var fields = data.result;
  var found  = false;

  Object.keys(fields).forEach(function(code) {
    var f = fields[code];
    if (!f.items || !f.items.length) return;
    f.items.forEach(function(item) {
      if (item.VALUE && item.VALUE.toLowerCase().indexOf("реферальн") !== -1) {
        Logger.log("✅ НАЙДЕНО! Код поля: " + code + " | ID значения: " + item.ID + " | Значение: " + item.VALUE);
        found = true;
      }
    });
  });

  if (!found) Logger.log("❌ 'реферальная программа' не найдено. Проверьте название в Битриксе.");
}

// ============================================================
// Запустите один раз → Журналы покажут коды поля ГЕО и Источника
// ============================================================
function findDealFields() {
  var url  = BITRIX_WEBHOOK + "crm.deal.fields.json";
  var resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());

  if (!data.result) { Logger.log("Ошибка: " + JSON.stringify(data)); return; }

  var fields = data.result;

  // Показываем поле SOURCE_ID (Источник) и его значения
  Logger.log("=== ИСТОЧНИК (SOURCE_ID) ===");
  if (fields.SOURCE_ID && fields.SOURCE_ID.items) {
    fields.SOURCE_ID.items.forEach(function(item) {
      Logger.log("ID: " + item.ID + " | Значение: " + item.VALUE);
    });
  }

  // Показываем все пользовательские поля (UF_CRM_*) — ищем ГЕО
  Logger.log("\n=== ПОЛЬЗОВАТЕЛЬСКИЕ ПОЛЯ (ищите ГЕО) ===");
  Object.keys(fields).forEach(function(code) {
    if (code.indexOf("UF_CRM_") === 0) {
      var f = fields[code];
      Logger.log("Код: " + code + " | Название: " + (f.title || f.listLabel || "—") + " | Тип: " + f.type);
      if (f.items && f.items.length) {
        f.items.slice(0, 5).forEach(function(item) {
          Logger.log("   → ID: " + item.ID + " | " + item.VALUE);
        });
      }
    }
  });
}

// ============================================================
// Запустите один раз → покажет все страны и их ID в поле ГЕО Битрикса
// ============================================================
function findGeoEnumIds() {
  var url  = BITRIX_WEBHOOK + "crm.userfield.get.json?id=" + GEO_FIELD_CODE;
  var resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());

  if (!data.result || !data.result.LIST) {
    // Попробуем через crm.deal.fields
    var url2  = BITRIX_WEBHOOK + "crm.deal.fields.json";
    var resp2 = UrlFetchApp.fetch(url2, { method: "get", muteHttpExceptions: true });
    var data2 = JSON.parse(resp2.getContentText());
    var field = data2.result && data2.result[GEO_FIELD_CODE];
    if (field && field.items) {
      field.items.forEach(function(item) {
        Logger.log("ID: " + item.ID + " | " + item.VALUE);
      });
    } else {
      Logger.log("Не удалось получить: " + JSON.stringify(data));
    }
    return;
  }

  data.result.LIST.forEach(function(item) {
    Logger.log("ID: " + item.ID + " | " + item.VALUE);
  });
}

// ============================================================
// Проверяет маппинг всех ГЕО значений из формы → Битрикс (без создания карточек)
// ============================================================
function testAllGeos() {
  // Все значения ГЕО из дропдауна формы по всем языкам
  var allGeoValues = [
    // RU
    "Румыния","Чехия/Словакия","Болгария","Испания","Венгрия",
    "Литва","Латвия","Эстония","Португалия","Польша","Италия","Хорватия",
    // HR
    "Rumunjska","Češka / Slovačka","Bugarska","Španjolska","Mađarska",
    "Litva","Latvija","Estonija","Portugal","Poljska","Italija","Hrvatska","Njemačka",
    // DE
    "Rumänien","Tschechien / Slowakei","Bulgarien","Spanien","Ungarn",
    "Litauen","Lettland","Estland","Polen","Italien","Kroatien","Deutschland",
    // ET
    "Rumeenia","Tšehhi / Slovakkia","Bulgaaria","Hispaania","Ungari",
    "Leedu","Läti","Eesti","Poola",
    // RO
    "România","Cehia / Slovacia","Bulgaria","Spania","Ungaria",
    "Lituania","Letonia","Estonia","Portugalia","Polonia",
    // CZ
    "Rumunsko","Česko / Slovensko","Bulharsko","Španělsko","Maďarsko",
    "Lotyšsko","Estonsko","Portugalsko","Polsko",
    // LI
    "Rumunija","Čekija / Slovakija","Bulgarija","Ispanija","Vengrija",
    "Lietuva","Latvija","Estija","Portugalija","Lenkija",
    // LA
    "Rumānija","Čehija / Slovākija","Bulgārija","Spānija","Ungārija",
    "Igaunija","Portugāle","Polija",
    // HU
    "Románia","Csehország / Szlovákia","Bulgária","Spanyolország","Magyarország",
    "Litvánia","Lettország","Észtország","Portugália","Lengyelország",
    // BG
    "Румъния","Чехия / Словакия","България","Унгария",
    "Естония","Португалия","Полша"
  ];

  var ok = 0, fail = 0;
  allGeoValues.forEach(function(val) {
    var en = GEO_TRANSLATIONS[val.toLowerCase().trim()];
    if (en) {
      Logger.log("✅ " + val + " → " + en);
      ok++;
    } else {
      Logger.log("❌ НЕТ МАППИНГА: " + val);
      fail++;
    }
  });
  Logger.log("\nИтого: " + ok + " ОК, " + fail + " не найдено");
}

// ============================================================
// Тест
// ============================================================
function testIntegration() {
  var fakeResponses = {
    "Отметка времени": ["30.06.2026 12:00:00"],
    "Select language":  ["HR"],
    "Navedite ime i prezime prijatelja koji želi raditi u našoj tvrtki.": ["Ana Horvat"],
    "Dob kandidata": ["25"],
    "Kontaktni podaci za kontakt (e-mail, telefon, račun na društvenim mrežama)": ["@ana_hr, +385 91 123 4567"],
    "Radno iskustvo kandidata": ["2 godine u prodaji"],
    "Trenutni radni status (ako je poznato)": ["Nezaposlena"],
    "Tvoje prezime i ime": ["Maria Gonzalez"],
    "Za koji GEO preporučujete kandidata?": ["Хорватия"]
  };

  var mapped = mapFields(fakeResponses);
  Logger.log("Mapped: " + JSON.stringify(mapped));

  var fio = mapped["ФИО кандидата"] || "";
  var geo = mapped["ГЕО"] || "";
  var ORDER = ["ФИО кандидата", "Возраст кандидата", "Контактные данные",
               "Опыт работы кандидата", "Текущая занятость", "Реферер (ФИО)", "ГЕО"];
  var commentParts = [];
  ORDER.forEach(function(label) {
    if (mapped[label]) commentParts.push(label + "\n" + mapped[label]);
  });

  var geoEn     = geo ? (GEO_TRANSLATIONS[geo.toLowerCase().trim()] || geo) : "";
  var geoEnumId = getGeoEnumId(geoEn);
  Logger.log("GEO: " + geo + " → " + geoEn + " → enum ID: " + geoEnumId);

  var dealId = createDeal("[REFERRAL] " + fio + " - " + geoEn + " [TEST]", geoEnumId);
  if (dealId) addTimelineComment(dealId, commentParts.join("\n\n"));
  Logger.log("Test Deal ID: " + dealId);
}
