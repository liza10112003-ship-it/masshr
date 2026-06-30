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

// Ключевые слова для определения столбца с ГЕО (многоязычная форма)
var GEO_KEYWORDS = ["za koji geo", "für welches geo", "millisele geo", "pe ce geo",
                    "do kterého geo", "į kurį geo", "uz kuru geo", "melyik geo",
                    "за кое geo", "geo preporučujete", "que geo", "за какое geo",
                    "рекомендуете кандидата"];

// ============================================================

function onFormSubmit(e) {
  try {
    var responses = e.namedValues;

    // Найти ГЕО
    var geo = "";
    for (var key in responses) {
      var keyLower = key.toLowerCase();
      for (var i = 0; i < GEO_KEYWORDS.length; i++) {
        if (keyLower.indexOf(GEO_KEYWORDS[i].toLowerCase()) !== -1) {
          var val = (responses[key][0] || "").trim();
          if (val) { geo = val; break; }
        }
      }
      if (geo) break;
    }

    // Название сделки
    var dealTitle = "Operator" + (geo ? " - " + geo : "");

    // Комментарий: все вопросы и ответы, пропускаем пустые и служебные
    var commentParts = [];
    for (var key in responses) {
      if (key === "Отметка времени" || key === "Select language") continue;
      var val = (responses[key][0] || "").trim();
      if (val) {
        commentParts.push(key + "\n" + val);
      }
    }
    var comment = commentParts.join("\n\n");

    // Создаём сделку
    var dealId = createDeal(dealTitle, comment);
    Logger.log("Сделка создана. ID: " + dealId);

  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
  }
}

function createDeal(title, comment) {
  var url = BITRIX_WEBHOOK + "crm.deal.add.json";

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      fields: {
        TITLE:       title,
        CATEGORY_ID: CATEGORY_ID,
        OPENED:      "Y",
        COMMENTS:    comment
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
    "Отметка времени":          ["30.06.2026 12:00:00"],
    "Select language":           ["RU"],
    "Укажите имя и фамилию друга, который хочет работать в нашей компании": ["Ivan Petrov"],
    "Возраст кандидата":        ["28"],
    "Контактные данные для связи (e-mail, телефон, аккаунт в соцсетях)": ["@ivan_tg, +34 600 123 456"],
    "Рабочий опыт кандидата":   ["3 года в продажах"],
    "Текущая занятость (если известно)": ["Безработный"],
    "Ваши Фамилия и Имя":       ["Maria Gonzalez"],
    "За какое GEO рекомендуете кандидата?": ["Испания"]
  };

  var dealId = createDeal("Operator - Испания [TEST]", buildComment(fakeResponses));
  Logger.log("Test Deal ID: " + dealId);
}

function buildComment(responses) {
  var parts = [];
  for (var key in responses) {
    if (key === "Отметка времени" || key === "Select language") continue;
    var val = (responses[key][0] || "").trim();
    if (val) parts.push(key + "\n" + val);
  }
  return parts.join("\n\n");
}
