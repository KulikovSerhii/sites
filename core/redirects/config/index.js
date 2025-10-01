// Загружаем нужные модули
const fs = require("fs");  // Работа с файловой системой
const express = require("express");  // Веб-сервер

// Первичная загрузка (один раз при старте) редиректов из файла
let redirects = require("./list.json");

// Инициализация Express и конфигурация порта
const app = express();  // Создаём приложение Express
app.set("trust proxy", true);  // Доверяем заголовкам прокси (X-Forwarded-For)
const REDIRECTS_PORT = process.env.REDIRECTS_PORT;  // Порт на котором работает скрипт
const REDIRECTS_LOGS = process.env.REDIRECTS_LOGS === "true";  // Логирование в файл

// Настройки Plausible
const PLAUSIBLE_URL = process.env.PLAUSIBLE_URL;
const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;

// Обработчик всех /go/*
app.get("/go/:key", (req, res) => {
  // Ключ из URL, например: /go/google → "google"
  const key = cleanInput(req.params.key, "key");  // ⛔ Обязательно проверяем входящие данные
  const target = redirects[key];  // Целевой URL из словаря

  // Формируем полный URL запроса
  const hostname = req.hostname;
  const originalUrl = cleanInput(req.originalUrl, "url");  // ⛔ Обязательно проверяем входящие данные
  const fullUrl = `https://${hostname}${originalUrl}`;

  // Получаем IP пользователя
  const ip = getClientIp(req) || "unknown";  // ⛔ Обязательно проверяем входящие данные

  // Получаем User-Agent и источник перехода (referer)
  const userAgent = cleanInput(req.get("user-agent"), "userAgent") || "unknown";  // ⛔ Обязательно проверяем входящие данные
  const referer = cleanInput(req.get("referer") || req.get("x-requested-with"), "referer") || "unknown";  // ⛔ Обязательно проверяем входящие данные

  // Если ключ не найден — редирект на страницу с ошибкой
  if (!target) {
    if (allowAction(ip)) logMessage(`🛑 | IP: ${ip} | Referer: ${referer} | Redirect: ${fullUrl} -> 404 | User-Agent: ${userAgent}`, true);

    return res.redirect(302, "/404/");
  }

  // Логируем каждый клик по ссылке
  if (allowAction(ip)) logMessage(`IP: ${ip} | Referer: ${referer} | Redirect: ${fullUrl} -> ${target} | User-Agent: ${userAgent}`, false, { hostname, key });

  // Делаем редирект
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  // const separator = target.includes('?') ? '&' : '?';
  // res.redirect(302, target + separator + 't=' + Date.now());
  res.redirect(302, target);

  // Логируем данные запроса для отладки
  // logRequestSnapshot(req, { "my_referer": referer, "my_target": target, "my_ip": ip });  // Закомментировать для продакшена

  // Отправляем событие в Plausible
  if (allowAction(ip)) sendToPlausible({ userAgent, ip, fullUrl, hostname, referer, target });
});

// Контроль частоты запросов с одного IP
const limitStore = {};  
function allowAction(ip) {
  if (limitStore[ip]) return false;
  limitStore[ip] = true;
  setTimeout(() => delete limitStore[ip], 5000);
  return true;
}

// Функция для получения IP-адреса клиента
function getClientIp(req) {
  // Функция для получения первого IP из заголовка
  function firstIpFromHeader(headerValue) {
    if (!headerValue) return null;

    let arr = [];

    if (Array.isArray(headerValue)) {
      arr = headerValue;  // ["1.2.3.4", "5.6.7.8"]  →  arr = ["1.2.3.4", "5.6.7.8"]
    } else if (typeof headerValue === "string") {
      arr = headerValue.split(",").map(s => s.trim());  // "1.2.3.4, 5.6.7.8"  →  arr = ["1.2.3.4", "5.6.7.8"]
    }

    // Убираем пустые элементы
    arr = arr.filter(s => Boolean(s));  // ["", "1.2.3.4"]  →  ["1.2.3.4"]

    return arr[0] || null;
  }

  const cfFirstIp = firstIpFromHeader(req.headers["cf-connecting-ip"]);
  const xrFirstIp = firstIpFromHeader(req.headers["x-real-ip"]);
  const xfFirstIp = firstIpFromHeader(req.headers["x-forwarded-for"]);
  const clientIp = cfFirstIp || xrFirstIp || xfFirstIp || req.ip;

  return cleanInput(clientIp, "ip");  // ⛔ Обязательно проверяем входящие данные
}

/**
 * Функция чистки и проверок (убираем переносы строк, обрезаем до 1000 символов и т.д.)
 * @param {string | null | undefined} value входная строка
 * @param {"key" | "url" | "referer" | "ip" | "userAgent"} type тип проверки
 * @returns {string | null} правильное значение или null
 */
function cleanInput(value, type) {
  if (!value) return null;

  switch(type) {
    case 'key':
      return /^[a-zA-Z0-9-]+$/.test(value) ? value : null;

    case 'url':
    case 'referer':
      return encodeURI(decodeURI(value))
        .replace(/'/g, '%27')
        .replace(/"/g, '%22')
        .slice(0, 1000);

    case 'ip':
      // IPv4: 1.2.3.4, IPv6: ::1 или 2001:0db8:85a3:0000:0000:8a2e:0370:7334
      const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(n => n>=0 && n<=255);
      const ipv6 = /^[0-9a-fA-F:]+(%[0-9a-zA-Z]+)?$/.test(value);
      return (ipv4 || ipv6) ? value : null;

    case 'userAgent':
      return String(value).replace(/[\r\n]/g, ' ').slice(0, 1000);

    default:
      return null;
  }
}

// Функция для логирования сообщений
function logMessage(message, isError = false, data) {
  // Добавляем временную метку
  const timestamp = new Date().toLocaleString("sv-SE", { hour12: false }).replace("T", " "); // Формат: "YYYY-MM-DD HH:MM:SS"
  const line = `[${timestamp}] | ${message}`;

  // Вывод в консоль
  if (isError) {
    console.error(line);
  } else {
    console.log(line);
  }

  // Логируем в файл
  if (REDIRECTS_LOGS) {
    // Создаём директорию для логов, если она не существует
    const logDir = "./logs";
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    // Определяем файл для записи
    let filePath = `${logDir}/system.log`;  // Путь и имя файла по умолчанию
    if (data && data.hostname && data.key) {
      const safeHost = data.hostname.replace(/[^a-zA-Z0-9-]/g, "_");
      const safeKey  =      data.key.replace(/[^a-zA-Z0-9-]/g, "_");
      filePath = `${logDir}/${safeHost}__${safeKey}.log`;
    }

    // Записываем в файл
    fs.appendFile(filePath, line + '\n', (err) => {
      if (err) console.error("🛑 | File log error: ", err);
    });
  }
}

// Функция для отправки данных в Plausible
async function sendToPlausible({ userAgent, ip, fullUrl, hostname, referer, target }) {
  // Готовим данные для Plausible (если настроен URL и API-ключ)
  if (!PLAUSIBLE_URL || !PLAUSIBLE_API_KEY) return;

  // Создаём AbortController для управления таймаутом
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    // Отправляем событие "outbound-click" в Plausible
    const response = await fetch(PLAUSIBLE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PLAUSIBLE_API_KEY}`,
        "User-Agent": userAgent,
        "X-Forwarded-For": ip
      },
      body: JSON.stringify({
        name: "outbound-click",  // Имя события
        url: fullUrl,
        domain: hostname,
        referrer: referer,
        props: { target }
      }),
      signal: controller.signal  // Для управления таймаутом
    });

    // ОБЯЗАТЕЛЬНО: fetch не кидает исключение на 4xx/5xx
    if (!response.ok) {
      let errText = "";
      try { errText = await response.text(); } catch {}
      throw new Error(
        `Plausible responded with ${response.status} ${response.statusText}` +
        (errText ? ` – ${errText.slice(0, 200)}` : "")
      );
    }
  } catch (err) {
    // Ошибки Plausible не должны ломать редирект
    logMessage("🛑 | Plausible error: " + (err?.message || err), true);
  } finally {
    clearTimeout(timeout);  // Очищаем таймер, даже если fetch упал
  }
}

// Авто-подхват изменений list.json (без падений при битом JSON)
let updateTimeout;
fs.watch("./list.json", (eventType) => {
  if (eventType === "change") {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(() => {
      try {
        // Читаем как текст и парсим JSON
        redirects = JSON.parse(fs.readFileSync("./list.json", "utf8"));
        logMessage("✅ | Redirect list updated!");
      } catch (err) {
        // Если JSON битый — не ломаем сервер, оставляем старую версию в памяти
        logMessage("🛑 | Error in list.json: " + err.message, true);
      }
    }, 5000); // ждём 5 секунд, если файл ещё сохраняется, сбрасываем таймер
  }
});

// Функция для логирования полного снимка запроса
function logRequestSnapshot(req, extra = {}, full = false) {
  if (full) {
    console.dir(req, { depth: 2, colors: true });
    return;
  }

  const data = {
    protocol: req.protocol,
    secure: req.secure,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: req.headers,
    ...extra
  };

  console.dir(data, { depth: null, colors: true });
}

// Запускаем сервер
app.listen(REDIRECTS_PORT, () => {
  logMessage(`✅ | Redirect server running on port: ${REDIRECTS_PORT}`);
});
