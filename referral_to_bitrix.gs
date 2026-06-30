// ============================================================
// Referral Form → Bitrix24 (Mass Hire Pipeline)
// Форма многоязычная — скрипт сам определяет заполненный язык
//
// Установка:
//   1. Откройте таблицу с ответами формы
//   2. Расширения → Apps Script → вставьте этот код
//   3. Запустите findPipelineId() один раз → посмотрите логи → вставьте ID воронки
//   4. Сохраните, затем: Триггеры → Добавить триггер
//      Функция: onFormSubmit | Событие: При отправке формы
// ============================================================

var BITRIX_WEBHOOK = "https://bitrix.ferraraoceanllp.com/rest/45/kpfsu7g1dgfzpojr/";

var CATEGORY_ID = 7;

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

// ============================================================

function onFormSubmit(e) {
  try {
    var responses = e.namedValues;
    var mapped = mapFields(responses);

    var geo = mapped["ГЕО"] || "";
    var dealTitle = "Operator" + (geo ? " - " + geo : "");

    // Комментарий из нормализованных русских названий + перевод ответов
    var commentParts = [];
    // ФИО и контакты не переводим — имена и номера телефонов переводить не нужно
    var NO_TRANSLATE = ["ФИО кандидата", "Контактные данные", "Реферер (ФИО)", "ГЕО"];
    var ORDER = ["ФИО кандидата", "Возраст кандидата", "Контактные данные",
                 "Опыт работы кандидата", "Текущая занятость", "Реферер (ФИО)", "ГЕО"];
    ORDER.forEach(function(label) {
      if (!mapped[label]) return;
      var val = mapped[label];
      if (NO_TRANSLATE.indexOf(label) === -1) {
        try {
          var translated = LanguageApp.translate(val, "", "ru");
          if (translated && translated !== val) val = translated;
        } catch (te) {
          Logger.log("Перевод не удался для '" + label + "': " + te);
        }
      }
      commentParts.push(label + "\n" + val);
    });
    var comment = commentParts.join("\n\n");

    var dealId = createDeal(dealTitle);
    if (dealId) {
      addTimelineComment(dealId, comment);
    }
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

function createDeal(title) {
  var url = BITRIX_WEBHOOK + "crm.deal.add.json";

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      fields: {
        TITLE:       title,
        CATEGORY_ID: CATEGORY_ID,
        OPENED:      "Y"
      },
      params: { REGISTER_SONET_EVENT: "Y" }
    }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

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
      fields: {
        ENTITY_ID:   dealId,
        ENTITY_TYPE: "deal",
        COMMENT:     comment
      }
    }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (!result.result) {
    Logger.log("Timeline comment error: " + JSON.stringify(result));
  }
}

// ============================================================
// Запустите один раз вручную → Вид → Журналы → найдите воронку "Масс найм"
// ============================================================
function findPipelineId() {
  var url = BITRIX_WEBHOOK + "crm.category.list.json";
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ entityTypeId: 2 }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (result.result && result.result.categories) {
    result.result.categories.forEach(function(cat) {
      Logger.log("ID: " + cat.id + " | Название: " + cat.name);
    });
  } else {
    Logger.log("Ответ: " + JSON.stringify(result));
  }
}

// ============================================================
// Тест без реальной отправки формы
// ============================================================
function testIntegration() {
  // Симулируем ответ на венгерском языке
  var fakeResponses = {
    "Отметка времени": ["30.06.2026 12:00:00"],
    "Select language":  ["HU"],
    "Kérjük, adja meg egy olyan barátja kereszt- és vezetéknevét, aki szeretne nálunk dolgozni": ["Ivan Petrov"],
    "A jelölt életkora": ["28"],
    "Elérhetőségek a kommunikációhoz (e-mail, telefon, közösségi média fiók)": ["@ivan_tg, +36 30 123 4567"],
    "A jelölt munkatapasztalata": ["3 év értékesítés"],
    "Jelenlegi munkahely (ha ismert)": ["Munkanélküli"],
    "A te vezetékneved és keresztneved.": ["Maria Gonzalez"],
    "  Melyik GEO-ba ajánlja a jelöltet?  ": ["Венгрия"]
  };

  var mapped = mapFields(fakeResponses);
  Logger.log("Mapped fields: " + JSON.stringify(mapped));

  var geo = mapped["ГЕО"] || "";
  var ORDER = ["ФИО кандидата", "Возраст кандидата", "Контактные данные",
               "Опыт работы кандидата", "Текущая занятость", "Реферер (ФИО)", "ГЕО"];
  var commentParts = [];
  ORDER.forEach(function(label) {
    if (mapped[label]) commentParts.push(label + "\n" + mapped[label]);
  });

  var comment = commentParts.join("\n\n");
  var dealId = createDeal("Operator - " + geo + " [TEST]");
  if (dealId) addTimelineComment(dealId, comment);
  Logger.log("Test Deal ID: " + dealId);
}
