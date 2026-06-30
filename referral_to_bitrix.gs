// ============================================================
// Referral Form → Bitrix24 (Mass Hire Pipeline)
// Установка:
//   1. Откройте таблицу с ответами формы
//   2. Расширения → Apps Script → вставьте этот код
//   3. Запустите findPipelineId() один раз, чтобы узнать CATEGORY_ID
//   4. Вставьте нужный CATEGORY_ID в константу ниже
//   5. Сохраните, затем: Триггеры → Добавить триггер
//      Функция: onFormSubmit | Событие: При отправке формы
// ============================================================

var BITRIX_WEBHOOK = "https://bitrix.ferraraoceanllp.com/rest/653/7bm2v7m6v643x35o/";

// ID воронки "Масс найм" — запустите findPipelineId() один раз, чтобы узнать
var CATEGORY_ID = 0; // ← замените на правильный ID

// Название столбца с ГЕО (часть названия, без учёта регистра)
var GEO_COLUMN_KEYWORD = "гео";

// ============================================================

function onFormSubmit(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Берём данные из события (последняя строка с ответами)
    var responses = e.namedValues;

    // Найти ГЕО
    var geo = "";
    var geoKey = "";
    for (var key in responses) {
      if (key.toLowerCase().indexOf(GEO_COLUMN_KEYWORD) !== -1) {
        geo = responses[key][0];
        geoKey = key;
        break;
      }
    }

    // Название карточки
    var dealTitle = "Operator" + (geo ? " - " + geo : "");

    // Собираем комментарий: вопрос\nответ\n\nвопрос\nответ
    var commentLines = [];
    for (var key in responses) {
      var answer = responses[key][0] || "";
      commentLines.push(key + "\n" + answer);
    }
    var comment = commentLines.join("\n\n");

    // Создаём сделку в Битриксе
    var dealId = createDeal(dealTitle, comment);

    if (dealId) {
      Logger.log("Сделка создана. ID: " + dealId);
    } else {
      Logger.log("Ошибка создания сделки");
    }

  } catch (err) {
    Logger.log("Ошибка: " + err.toString());
    // Опционально: отправить email об ошибке
    // MailApp.sendEmail("your@email.com", "Ошибка Bitrix интеграции", err.toString());
  }
}

function createDeal(title, comment) {
  var url = BITRIX_WEBHOOK + "crm.deal.add.json";

  var payload = {
    fields: {
      TITLE: title,
      CATEGORY_ID: CATEGORY_ID,
      OPENED: "Y",
      COMMENTS: comment
    },
    params: { REGISTER_SONET_EVENT: "Y" }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (result.result) {
    return result.result;
  } else {
    Logger.log("Bitrix error: " + JSON.stringify(result));
    return null;
  }
}

// ============================================================
// Вспомогательная функция — запустите один раз вручную,
// чтобы увидеть все воронки и их ID в логах (Вид → Журналы)
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
// Тест — запустите вручную, чтобы проверить создание сделки
// без реальной отправки формы
// ============================================================
function testCreateDeal() {
  var testComment = [
    "ГЕО",
    "Испания",
    "",
    "ФИО кандидата",
    "Ivan Petrov",
    "",
    "Кто рефер",
    "Maria Gonzalez"
  ].join("\n");

  var dealId = createDeal("Operator - Испания [TEST]", testComment);
  Logger.log("Test deal ID: " + dealId);
}
