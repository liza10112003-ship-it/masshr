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
  { keywords: ["ime i prezime", "vor- und nachnamen", "ees- ja perekon", "numele și prenu",
               "jméno a příjmení", "vardą ir pavardę", "vārdu un uzvārdu", "kereszt- és vezet",
               "ime и фамилия", "имя и фамилию", "nombre y apellido", "укажите имя и фамилию",
               "napišite ime"],
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
  // BG
  "румъния": "Romania", "чехия / словакия": "Czech Republic", "българия": "Bulgaria",
  "унгария": "Hungary", "естония": "Estonia", "португалия": "Portugal", "полша": "Poland"
};

// ============================================================

function onFormSubmit(e) {
  try {
    var responses = e.namedValues;
    var mapped    = mapFields(responses);

    var fio = mapped["ФИО кандидата"] || "";
    var geo = mapped["ГЕО"] || "";
    var dealTitle = "[REFERRAL] " + fio + (geo ? " - " + geo : "");

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

    // Найти enum ID для ГЕО в Битриксе
    var geoEnumId = getGeoEnumId(geo);

    var dealId = createDeal(dealTitle, geoEnumId);
    if (dealId) addTimelineComment(dealId, comment);
    Logger.log("Сделка создана. ID: " + dealId);

  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
  }
}

// Переводит значение ГЕО из формы → enum ID в Битриксе
function getGeoEnumId(geoValue) {
  if (!GEO_FIELD_CODE || !geoValue) return null;

  // Переводим в английское название
  var geoEn = GEO_TRANSLATIONS[geoValue.toLowerCase().trim()] || geoValue;

  // Получаем список значений поля из Битрикса
  try {
    var url = BITRIX_WEBHOOK + "crm.deal.fields.json";
    var resp = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    var fields = JSON.parse(resp.getContentText());
    var field = fields.result && fields.result[GEO_FIELD_CODE];
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

  var geoEnumId = getGeoEnumId(geo);
  Logger.log("GEO enum ID: " + geoEnumId);

  var dealId = createDeal("[REFERRAL] " + fio + " - " + geo + " [TEST]", geoEnumId);
  if (dealId) addTimelineComment(dealId, commentParts.join("\n\n"));
  Logger.log("Test Deal ID: " + dealId);
}
