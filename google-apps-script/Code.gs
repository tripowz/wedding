/**
 * Ответы гостей: Google Таблица + сообщение в Telegram.
 * Установка — README.md, раздел «Ответы гостей».
 *
 * Свойства скрипта (Настройки проекта → Свойства скрипта):
 *   TG_TOKEN    — токен бота от @BotFather
 *   TG_CHAT_IDS — один или несколько chat_id через запятую (жених, невеста, общий чат)
 *   TG_ADMIN_IDS — (необязательно) ещё chat_id, кому можно открывать панель гостей
 *
 * Панель гостей (Mini App): адрес ниже. После вставки кода один раз
 * выберите функцию setupMiniApp → «Выполнить» — у бота появится кнопка «Гости».
 */
var MINIAPP_URL = "https://bf-guests.vercel.app";

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
      payload: JSON.stringify(withPanelButton({ chat_id: id, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }, id)),
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

/* ---------- панель гостей (Telegram Mini App) ---------- */
// Панель запрашивает список так: GET …/exec?action=guests&initData=<подпись Telegram>.
// Список отдаётся только тем, чей chat_id есть в TG_CHAT_IDS или TG_ADMIN_IDS.
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== "guests") return json({ ok: true });
  var props = PropertiesService.getScriptProperties();
  var user = verifyInitData(p.initData || "", props.getProperty("TG_TOKEN") || "");
  if (!user) return json({ ok: false, error: "auth" });
  if (adminIds(props).indexOf(String(user.id)) < 0) return json({ ok: false, error: "forbidden", id: user.id });
  return json({
    ok: true,
    user: user.first_name || "",
    events: {
      fotiha: readEvent(EVENTS.fotiha.sheet),
      wedding: readEvent(SHEET_NAME),
    },
  });
}

function adminIds(props) {
  return [props.getProperty("TG_CHAT_IDS"), props.getProperty("TG_ADMIN_IDS")].join(",")
    .split(",").map(function (s) { return s.trim(); }).filter(String);
}

// Проверка подписи Telegram: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyInitData(initData, token) {
  if (!initData || !token) return null;
  var fields = {}, hash = "";
  initData.split("&").forEach(function (pair) {
    var i = pair.indexOf("=");
    if (i < 0) return;
    var k = decodeURIComponent(pair.slice(0, i)), v = decodeURIComponent(pair.slice(i + 1));
    if (k === "hash") hash = v; else fields[k] = v;
  });
  if (!hash) return null;
  var check = Object.keys(fields).sort().map(function (k) { return k + "=" + fields[k]; }).join("\n");
  var secret = Utilities.computeHmacSha256Signature(Utilities.newBlob(token).getBytes(), Utilities.newBlob("WebAppData").getBytes());
  var sign = Utilities.computeHmacSha256Signature(Utilities.newBlob(check).getBytes(), secret);
  if (toHex(sign) !== hash.toLowerCase()) return null;
  if (Date.now() / 1000 - Number(fields.auth_date || 0) > 7 * 86400) return null;   // подпись старше недели
  try { return JSON.parse(fields.user || "null"); } catch (err) { return null; }
}
function toHex(bytes) { return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join(""); }

// Последний ответ каждого гостя (как в итогах), новые сверху
function readEvent(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var out = { guests: [] };
  if (!sheet || sheet.getLastRow() < 2) return out;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  var byName = {}, order = [];
  data.forEach(function (r) {
    var key = String(r[1]).trim().toLowerCase();
    if (!key) return;
    if (!(key in byName)) order.push(key);
    byName[key] = r;
  });
  out.guests = order.map(function (k) {
    var r = byName[k], t = r[0] instanceof Date ? r[0].getTime() : Date.parse(r[0]) || 0;
    return { name: String(r[1]), attending: r[2] === "Да", guests: Number(r[3]) || 0,
      side: r[4] === "Жених" ? "groom" : r[4] === "Невеста" ? "bride" : "",
      message: String(r[5] || ""), lang: String(r[6] || ""), updated: r[7] === "да", time: t };
  }).sort(function (a, b) { return b.time - a.time; });
  return out;
}

// Кнопка в уведомлении: в личном чате открывает панель внутри Telegram
function withPanelButton(msg, chatId) {
  if (MINIAPP_URL && Number(chatId) > 0) {
    msg.reply_markup = { inline_keyboard: [[{ text: "📋 Все гости", web_app: { url: MINIAPP_URL } }]] };
  }
  return msg;
}

/** Один раз: добавляет кнопку «Гости» слева от поля ввода в личных чатах с ботом. */
function setupMiniApp() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TG_TOKEN");
  if (!token) { console.log("Сначала добавьте свойство TG_TOKEN"); return; }
  adminIds(props).filter(function (id) { return Number(id) > 0; }).forEach(function (id) {
    var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/setChatMenuButton", {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: Number(id), menu_button: { type: "web_app", text: "Гости", web_app: { url: MINIAPP_URL } } }),
    });
    console.log("Кнопка для " + id + ": " + res.getContentText());
  });
}

/* ---------- мелочи ---------- */
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// обрезаем длину и не даём тексту гостя выполниться как формула (=, +, -, @)
function clean(value, max) {
  var s = String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
