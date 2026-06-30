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

var BITRIX_WEBHOOK = "https://bitrix.ferraraoceanllp.com/rest/653/7bm2v7m6v643x35o/";

// ID воронки "Масс найм" — запустите findPipelineId() чтобы узнать
var CATEGORY_ID = 0; // ← замените на правильный ID

// Ключевые слова для поиска нужных столбцов (часть названия, без учёта регистра)
// Форма многоязычная, поэтому ищем по кусочку слова, общему для всех языков
var KEYWORDS = {
  candidateName:  ["ime i prezime", "vor- und nachnamen", "ees- ja perekon", "numele și prenu", "jméno a příjmení", "vardą ir pavardę", "vārdu un uzvārdu", "kereszt- és vezet", "ime и фамилия", "имя и фамилию", "nombre"],
  age:            ["dob kandidata", "alter des", "kandidaadi vanus", "vârsta candidat", "věk kandidáta", "kandidato amžius", "kandidāta vecums", "jelölt életkora", "възраст на канд", "возраст канд", "edad"],
  contacts:       ["kontaktni podaci", "kontaktdaten", "kontaktandmed", "date de contact", "kontaktní údaje", "kontaktiniai", "kontaktinformācija", "elérhetőségek", "контактни данни", "контактные данные", "datos de contacto"],
  experience:     ["radno iskustvo", "berufserfahrung", "töökogemus", "experiența prof", "pracovní zkušen", "darbo patirtis", "darba pieredze", "munkatapasztalat", "трудов опит", "опыт работы", "experiencia"],
  employment:     ["trenutni radni", "aktuelle beschäf", "praegune tööhõive", "locul de muncă", "současné zaměst", "dabartinis užimtumas", "pašreizējais nodarbinātības", "jelenlegi munkahely", "настояща заетост", "текущ", "empleo actual"],
  referrerName:   ["tvoje prezime", "dein nachname", "sinu perekon", "numele și prenu", "vaše příjmení", "tavo pavardė", "tavs uzvārds", "te vezet", "вашите фамилия", "фамилия и имя", "tu apellido"],
  geo:            ["za koji geo", "für welches geo", "millisele geo", "pe ce geo", "do kterého geo", "į kurį geo", "uz kuru geo", "melyik geo", "за кое geo", "за кой гео", "geo preporučujete", "que geo"]
};

// ============================================================

function onFormSubmit(e) {
  try {
    var responses = e.namedValues;

    // Находим значения по ключевым словам
    var candidateName = findValue(responses, KEYWORDS.candidateName);
    var age           = findValue(responses, KEYWORDS.age);
    var contacts      = findValue(responses, KEYWORDS.contacts);
    var experience    = findValue(responses, KEYWORDS.experience);
    var employment    = findValue(responses, KEYWORDS.employment);
    var referrerName  = findValue(responses, KEYWORDS.referrerName);
    var geo           = findValue(responses, KEYWORDS.geo);

    // Название сделки
    var dealTitle = "Operator" + (geo ? " - " + geo : "");

    // Комментарий: все вопросы и ответы
    var commentParts = [];
    for (var key in responses) {
      var val = (responses[key][0] || "").trim();
      if (val && key !== "Отметка времени" && key !== "Select language") {
        commentParts.push(key + "\n" + val);
      }
    }
    var comment = commentParts.join("\n\n");

    // Создаём контакт в Битриксе
    var contactId = createContact(candidateName, contacts, age);

    // Создаём сделку
    var dealId = createDeal(dealTitle, comment, contactId);

    Logger.log("Сделка создана. ID: " + dealId + " | Контакт ID: " + contactId);

  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
  }
}

// Ищет первое совпадение по списку ключевых слов среди заголовков
function findValue(responses, keywords) {
  for (var key in responses) {
    var keyLower = key.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
      if (keyLower.indexOf(keywords[i].toLowerCase()) !== -1) {
        var val = (responses[key][0] || "").trim();
        if (val) return val;
      }
    }
  }
  return "";
}

function createContact(fullName, contactDetails, age) {
  var url = BITRIX_WEBHOOK + "crm.contact.add.json";

  // Разбиваем ФИО на имя и фамилию (первое слово = имя, остальное = фамилия)
  var parts = (fullName || "").trim().split(/\s+/);
  var firstName = parts[0] || "";
  var lastName  = parts.slice(1).join(" ") || "";

  var fields = {
    NAME:      firstName,
    LAST_NAME: lastName,
    COMMENTS:  "Возраст: " + (age || "—") + "\nКонтакты: " + (contactDetails || "—")
  };

  // Пробуем вытащить email и телефон из поля контактов
  if (contactDetails) {
    var emailMatch = contactDetails.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    var phoneMatch = contactDetails.match(/[\+\d][\d\s\-\(\)]{6,}/);
    if (emailMatch) {
      fields.EMAIL = [{ VALUE: emailMatch[0], VALUE_TYPE: "WORK" }];
    }
    if (phoneMatch) {
      fields.PHONE = [{ VALUE: phoneMatch[0].trim(), VALUE_TYPE: "WORK" }];
    }
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (result.result) return result.result;
  Logger.log("Contact error: " + JSON.stringify(result));
  return null;
}

function createDeal(title, comment, contactId) {
  var url = BITRIX_WEBHOOK + "crm.deal.add.json";

  var fields = {
    TITLE:       title,
    CATEGORY_ID: CATEGORY_ID,
    OPENED:      "Y",
    COMMENTS:    comment
  };

  if (contactId) {
    fields.CONTACT_ID = contactId;
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields, params: { REGISTER_SONET_EVENT: "Y" } }),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (result.result) return result.result;
  Logger.log("Deal error: " + JSON.stringify(result));
  return null;
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
  var fakeResponses = {
    "Отметка времени":                         ["30.06.2026 12:00:00"],
    "Select language":                          ["RU"],
    "Укажите имя и фамилию друга, который хочет работать в нашей компании": ["Ivan Petrov"],
    "Возраст кандидата":                       ["28"],
    "Контактные данные для связи (e-mail, телефон, аккаунт в соцсетях)": ["ivan@example.com, +34 600 123 456"],
    "Рабочий опыт кандидата":                  ["3 года в продажах"],
    "Текущая занятость (если известно)":       ["Безработный"],
    "Ваши Фамилия и Имя":                      ["Maria Gonzalez"],
    "За какое GEO рекомендуете кандидата?":    ["Испания"]
  };

  var geo           = findValue(fakeResponses, KEYWORDS.geo);
  var candidateName = findValue(fakeResponses, KEYWORDS.candidateName);
  var contacts      = findValue(fakeResponses, KEYWORDS.contacts);
  var age           = findValue(fakeResponses, KEYWORDS.age);

  Logger.log("ГЕО: " + geo);
  Logger.log("Кандидат: " + candidateName);
  Logger.log("Контакты: " + contacts);
  Logger.log("Возраст: " + age);

  var contactId = createContact(candidateName, contacts, age);
  Logger.log("Contact ID: " + contactId);

  var commentParts = [];
  for (var key in fakeResponses) {
    var val = (fakeResponses[key][0] || "").trim();
    if (val && key !== "Отметка времени" && key !== "Select language") {
      commentParts.push(key + "\n" + val);
    }
  }

  var dealId = createDeal("Operator - " + geo + " [TEST]", commentParts.join("\n\n"), contactId);
  Logger.log("Deal ID: " + dealId);
}
