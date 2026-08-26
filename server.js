//Подключаем библиотеку dotenv и вызываем функцию, которая читает файл .env и загружает переменные
require('dotenv').config();



//Подключаем библиотеку express
const express = require('express');
//Подключаем библиотеку для работы с сессиями
const session = require('express-session');
//Подключаем connect-sqlite3 — хранилище сессий на основе SQLite, 
//чтобы не использовать стандартный MemoryStore, который не подходит для продакшена
const SQLiteStore = require('connect-sqlite3')(session);
//Подключаем встроенный модуль crypto, он нужен для генерации случайного state, чтобы защититься от CSRF в OAuth
const crypto = require('crypto');
//Создаём приложение
const app = express();

//Список переменных окружения, без которых сервер работать не должен
const REQUIRED_ENV_VARS = [
  'YANDEX_CLIENT_ID',
  'YANDEX_CLIENT_SECRET',
  'REDIRECT_URI',
  'SESSION_SECRET',
];

//Проверяем, все ли обязательные переменные заданы в .env
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

//Если чего то не хватает, то сервер не запускается, а сразу выводит, каких переменных нет
if (missingEnvVars.length > 0) {
  console.error(
    `Не заданы обязательные переменные окружения: ${missingEnvVars.join(', ')}. ` +
    `Проверьте файл .env`
  );
  process.exit(1);
}

//Данные для подключения к приложению OAuth Яндекс
const CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

//Подключаем библиотеки для работы с SQLite
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

//Инициализация базы данных вынесена в отдельную функцию, чтобы сервер запускался только тогда, когда база уже готова
async function initDb() {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database,
  });

  //Включаем проверку внешних ключей, потому что в SQLite по умолчанию она выключена
  await db.exec('PRAGMA foreign_keys = ON');

  //Если таблицы пользователей ещё нет, то создаём её
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      ID INTEGER NOT NULL UNIQUE,
      YandexID TEXT NOT NULL UNIQUE,
      Name TEXT,
      Email TEXT NOT NULL,
      RegistrationDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(ID AUTOINCREMENT)
    )
  `);

  //Если таблицы заявок ещё нет, то создаём и её тоже
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Requests (
      ID INTEGER NOT NULL UNIQUE,
      UserID INTEGER NOT NULL,
      Interests TEXT NOT NULL,
      RequestDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(ID AUTOINCREMENT),
      FOREIGN KEY(UserID) REFERENCES Users(ID)
    )
  `);
}

//Если сервер работает за реверс прокси (например nginx) на проде, то Express должен доверять заголовку X-Forwarded-Proto
//Иначе secure cookie не будет правильно ставиться, когда COOKIE_SECURE=true
if (process.env.COOKIE_SECURE === 'true') {
  app.set('trust proxy', 1);
}

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  },
}));

//Ограничиваем размер JSON тела запроса до 10кб, чтобы нельзя было прислать слишком большие данные
app.use(express.json({ limit: '10kb' }));

//Разрешаем серверу отдавать статичные файлы (html, css, картинки) из папки public
app.use(express.static('ready-html'));

//Если запрос к API пришёл раньше, чем база данных успела инициализироваться, то отвечаем ошибкой
app.use((req, res, next) => {
  if (!db) {
    return res.status(503).send('Сервер ещё запускается, попробуйте через секунду');
  }
  next();
});

//Отдаёт статус входа для фронтенда, то есть вошёл пользователь по настоящему или нет
app.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, name: req.session.user.Name });
  } else {
    res.json({ loggedIn: false });
  }
});

//Если пользователь переходит на этот адрес, то сразу перенаправляем его по ссылке на Яндекс
app.get('/auth/login', (req, res) => {
  //Генерируем случайный state и кладём его в сессию, чтобы потом на callback проверить, что запрос пришёл именно от нас
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  //Собираем ссылку через URLSearchParams, тогда все значения (в том числе REDIRECT_URI) корректно экранируются сами
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  //Переходим по ссылке
  res.redirect(`https://oauth.yandex.ru/authorize?${params.toString()}`);
});

//Когда пользователь возвращается обратно на сервер, вынимаем из адресной строки код и state
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  //Сверяем state из запроса с тем, что сохранили в сессии на шаге /auth/login
  //Если он отсутствует или не совпадает, то это может быть подделанный запрос, и вход прерывается
  if (!state || state !== req.session.oauthState) {
    return res.status(403).send('Ошибка: неверный или отсутствующий state (возможна попытка подделки запроса)');
  }

  //State одноразовый, поэтому удаляем его из сессии сразу после проверки
  delete req.session.oauthState;

  //Если кода нет, то дальше двигаться нет смысла, возвращаем ошибку
  if (!code) {
    return res.status(400).send('Ошибка: код авторизации не получен');
  }

  try {
    //Отправляем запрос на получение токена
    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      //Указываем, что это отправка данных методом POST
      method: 'POST',
      //Говорим, что отправляем данные в формате формы
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      //Данные, которые отправляем
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    //Если Яндекс ответил ошибкой (например код уже использован или истёк), то тело ответа может быть не тем, что мы ждём
    //Поэтому статус проверяем раньше, чем пытаемся разобрать JSON, иначе .json() может упасть с необработанной ошибкой
    if (!tokenResponse.ok) {
      console.error('Яндекс отклонил запрос токена, статус:', tokenResponse.status);
      return res.status(502).send('Ошибка: сервис авторизации Яндекса вернул ошибку');
    }

    //Конвертируем полученный ответ в JSON
    const tokenData = await tokenResponse.json();
    //Вытаскиваем токен
    const accessToken = tokenData.access_token;

    //Если токена нет, то возвращаем ошибку
    if (!accessToken) {
      return res.status(502).send('Ошибка: не удалось получить токен');
    }

    //Отправляем запрос на получение информации о пользователе
    const userResponse = await fetch('https://login.yandex.ru/info', {
      //Используем для этого полученный токен
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    //Точно так же проверяем статус ответа перед тем, как разбирать данные пользователя
    if (!userResponse.ok) {
      console.error('Яндекс отклонил запрос данных пользователя, статус:', userResponse.status);
      return res.status(502).send('Ошибка: не удалось получить данные пользователя от Яндекса');
    }

    //Конвертируем полученный ответ в JSON
    const userData = await userResponse.json();

    //Если сервер работает в проде, то в лог персональные данные пользователя (email, имя) не пишем
    //Логируем только сам факт получения данных и нечувствительный идентификатор
    if (process.env.NODE_ENV === 'production') {
      console.log('Получены данные пользователя от Яндекса, YandexID:', userData.id);
    } else {
      console.log('Данные пользователя от Яндекса:', userData);
    }

    //Проверяем, есть ли уже пользователь с таким YandexID
    const existingUser = await db.get(
      'SELECT * FROM Users WHERE YandexID = ?',
      userData.id
    );

    let user;

    if (existingUser) {
      //Если пользователь уже есть, то обновляем его Name и Email, так как они могли измениться со стороны Яндекса
      await db.run(
        'UPDATE Users SET Name = ?, Email = ? WHERE YandexID = ?',
        userData.display_name, userData.default_email, userData.id
      );
      user = await db.get(
        'SELECT * FROM Users WHERE YandexID = ?',
        userData.id
      );
    } else {
      //Если пользователя нет, то создаём нового
      await db.run(
        'INSERT INTO Users (YandexID, Name, Email) VALUES (?, ?, ?)',
        userData.id, userData.display_name, userData.default_email
      );
      //Достаём только что созданную запись, чтобы получить её ID
      user = await db.get(
        'SELECT * FROM Users WHERE YandexID = ?',
        userData.id
      );
    }

    //Если до логина кто то подсунул жертве заранее известный session ID, то после регенерации он перестаёт быть привязан к сессии
    //Поэтому перед тем, как записать в сессию данные вошедшего пользователя, session ID пересоздаётся
    req.session.regenerate((err) => {
      if (err) {
        console.error('Ошибка при пересоздании сессии:', err);
        return res.status(500).send('Что-то пошло не так при входе через Яндекс');
      }

      //В сессию кладём только запись из базы данных
      req.session.user = user;

      //Перенаправляем браузер пользователя на страницу сайта с формой
      res.redirect('/index.html');
    });

  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).send('Что-то пошло не так при входе через Яндекс');
  }
});

//Стираем данные из сессии и перенаправляем браузер пользователя на страницу сайта с формой
app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/index.html');
  });
});

//Приём заявки от пользователя (интересы)
app.post('/requests', async (req, res) => {
  //Если пользователь не вошёл, то заявку принимать нельзя, ведь она не должна быть анонимной
  if (!req.session.user) {
    return res.status(401).send('Сначала нужно войти через Яндекс');
  }

  //Если поле interests пришло не строкой, то .trim() ниже упадёт с необработанной ошибкой, поэтому проверяем тип заранее
  if (typeof req.body.interests !== 'string') {
    return res.status(400).send('Поле "Интересы" должно быть строкой');
  }

  //Достаём текст заявки из тела запроса, убираем пробелы по краям
  const interests = req.body.interests.trim();

  //Если поле пустое или состоит из одних пробелов, то отправлять заявку нет смысла
  if (!interests) {
    return res.status(400).send('Поле "Интересы" не может быть пустым');
  }

  //Ограничиваем максимальную длину поля, чтобы нельзя было прислать слишком длинный текст и захламить базу данных
  const MAX_INTERESTS_LENGTH = 500;

  if (interests.length > MAX_INTERESTS_LENGTH) {
    return res.status(400).send(
      `Поле "Интересы" не может быть длиннее ${MAX_INTERESTS_LENGTH} символов`
    );
  }

  try {
    //Сохраняем заявку, привязывая её к ID пользователя из сессии
    await db.run(
      'INSERT INTO Requests (UserID, Interests) VALUES (?, ?)',
      req.session.user.ID, interests
    );

    res.send('Заявка отправлена!');

  } catch (error) {
    console.error('Ошибка при сохранении заявки:', error);
    res.status(500).send('Не удалось сохранить заявку');
  }
});

//Если хостинг сам назначает порт через переменную PORT, то используем его. Если такой переменной нет, то запускаемся на 3000
const PORT = process.env.PORT || 3000;

//Запускаем сервер только после того, как база данных полностью готова
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Не удалось инициализировать базу данных:', error);
    process.exit(1);
  });