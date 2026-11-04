/**
 * Ответы гостей: Google Таблица + сообщение в Telegram.
 * Установка — README.md, раздел «Ответы гостей».
 *
 * Свойства скрипта (Настройки проекта → Свойства скрипта):
 *   TG_TOKEN    — токен бота от @BotFather
 *   TG_CHAT_IDS — один или несколько chat_id через запятую (жених, невеста, общий чат)
 */

var SHEET_NAME = "Гости";            // вечер 11 ноября
var EVENTS = { fotiha: { sheet: "Фотиха", title: "🌸 <b>Фотиха-туй</b>" } };
var HEADERS = ["Когда ответил", "Имя", "Придёт?", "Сколько человек", "Чья сторона", "Пожелание", "Язык", "Повторный ответ"];

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json({ ok: true });                       // ловушка для спам-ботов

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var row, totals;
  try {
    var ev = EVENTS[p.event] || null;
    var sheet = getSheet(ev ? ev.sheet : SHEET_NAME);
    var attending = p.attending === "yes";
    row = {
      name: clean(p.name, 80),
      attending: attending,
      guests: attending ? Math.max(1, Math.min(10, parseInt(p.guests, 10) || 1)) : 0,
      side: p.side === "groom" ? "Жених" : p.side === "bride" ? "Невеста" : "",
      message: clean(p.message, 600),
      lang: p.lang === "ru" ? "RU" : "UZ",
      update: p.update ? "да" : "",
      eventTitle: ev ? ev.title : "",
    };
    if (!row.name) return json({ ok: false, error: "name" });
    sheet.appendRow([new Date(), row.name, attending ? "Да" : "Нет", row.guests, row.side, row.message, row.lang, row.update]);
    totals = countTotals(sheet);
  } finally {
    lock.releaseLock();
  }

  try { notifyTelegram(row, totals); } catch (err) { console.error(err); }  // таблица важнее: ошибка Telegram не теряет ответ
  return json({ ok: true });
}

/* ---------- таблица ---------- */
function getSheet(name) {
  name = name || SHEET_NAME;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#6c1b2b").setFontColor("#f6e7c8");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 220); sheet.setColumnWidth(6, 360);
  }
  return sheet;
}

// Итоги по последнему ответу каждого гостя (если гость изменил ответ — считается новый)
function countTotals(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return { answers: 0, coming: 0, people: 0, declined: 0 };
  var data = sheet.getRange(2, 2, last - 1, 3).getValues();      // Имя, Придёт?, Сколько
  var byName = {};
  data.forEach(function (r) { byName[String(r[0]).trim().toLowerCase()] = r; });
  var t = { answers: 0, coming: 0, people: 0, declined: 0 };
  Object.keys(byName).forEach(function (k) {
    var r = byName[k]; t.answers++;
    if (r[1] === "Да") { t.coming++; t.people += Number(r[2]) || 1; } else { t.declined++; }
  });
  return t;
}

/* ---------- Telegram ---------- */
function notifyTelegram(row, totals) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TG_TOKEN");
  var ids = String(props.getProperty("TG_CHAT_IDS") || "").split(",").map(function (s) { return s.trim(); }).filter(String);
  if (!token || !ids.length) return;

  var lines = [];
  lines.push(row.attending ? "💌 <b>Новый гость!</b>" : "✉️ <b>Ответ гостя</b>");
  if (row.update) lines[0] += " <i>(изменил ответ)</i>";
  if (row.eventTitle) lines.unshift(row.eventTitle);
  lines.push("");
  lines.push("👤 <b>" + esc(row.name) + "</b>");
  lines.push(row.attending ? "✅ Придёт" + (row.guests > 1 ? " · всего " + row.guests + " чел." : "") : "❌ Не сможет прийти");
  if (row.side) lines.push("🤝 Сторона: " + row.side);
  if (row.message) lines.push("💬 «" + esc(row.message) + "»");
  lines.push("");
  lines.push("📊 Ответили: " + totals.answers + " · придут: " + totals.coming + " (" + totals.people + " чел.) · не смогут: " + totals.declined);

  ids.forEach(function (id) {
    var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: id, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
      muteHttpExceptions: true,
    });
    var j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) { /* не JSON */ }
    console.log("Telegram " + id + ": " + (j.ok ? "отправлено" : "ошибка " + res.getResponseCode() + " — " + (j.description || res.getContentText())));
  });
}

/**
 * Помощник: напишите своему боту любое сообщение в Telegram,
 * затем выберите эту функцию вверху редактора и нажмите «Выполнить».
 * В журнале появятся chat_id всех, кто писал боту.
 */
function findChatIds() {
  var token = PropertiesService.getScriptProperties().getProperty("TG_TOKEN");
  if (!token) { console.log("Сначала добавьте свойство TG_TOKEN"); return; }
  var raw = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getUpdates", { muteHttpExceptions: true });
  var res = JSON.parse(raw.getContentText());
  if (!res.ok) { console.log("Ошибка Telegram " + raw.getResponseCode() + ": " + res.description + " — проверьте TG_TOKEN"); return; }
  var seen = {};
  (res.result || []).forEach(function (u) {
    var m = u.message || u.my_chat_member || u.channel_post;
    if (m && m.chat && !seen[m.chat.id]) {
      seen[m.chat.id] = true;
      console.log("chat_id: " + m.chat.id + "  —  " + (m.chat.title || [m.chat.first_name, m.chat.last_name].join(" ")));
    }
  });
  if (!Object.keys(seen).length) console.log("Пусто. Напишите боту /start и запустите ещё раз.");
}

/** Помощник: отправляет пробное сообщение во все чаты из TG_CHAT_IDS. */
function testTelegram() {
  notifyTelegram({ name: "Тестовый гость", attending: true, guests: 2, side: "Жених", message: "Проверка связи 🎉", update: "" },
    { answers: 1, coming: 1, people: 2, declined: 0 });
}

/* ---------- мелочи ---------- */
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// обрезаем длину и не даём тексту гостя выполниться как формула (=, +, -, @)
function clean(value, max) {
  var s = String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
