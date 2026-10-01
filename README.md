# SCT Service — клиентский фронтенд

> Обновлено: 2026-07-19

Клиентский сайт сервиса SCT (Алматы) — запись на сервис, сервисная книжка,
гараж, услуги. Только клиентский контекст (**client**, для владельцев авто).

> **Админка вынесена в отдельный проект** — см. `../sct-admin` (staff-панель:
> пакеты, автомобили, записи, Telegram-заявки). Раньше client и staff жили
> в одном репозитории; 2026-07-19 их разделили под разные домены. Бэкенд
> общий, поэтому `shared/` в обоих проектах почти идентичен.

Бэкенд: Django + DRF + JWT. Демо: `https://sct-back-demo.topcoder.kz`.

Другие доки:

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** — что готово, что в работе,
  что блокирует. Для ПМа/заказчика и для быстрой сверки «где мы».
- **[BACKEND_NOTES.md](./BACKEND_NOTES.md)** — всё для бэкендщика:
  расхождения OpenAPI ↔ реальность, недостающие эндпоинты, payload'ы.
- **[HANDOFF.md](./HANDOFF.md)** — точка входа для новой Claude-сессии:
  правила работы, привычки в коде, флоу с Claude Preview.

---

## Стек

| Слой              | Выбор                                            |
| ----------------- | ------------------------------------------------ |
| Сборка            | Vite 8                                           |
| Язык              | TypeScript 5.7                                   |
| UI                | React 19 + Tailwind CSS 3                        |
| Роутинг           | React Router v7 (`createBrowserRouter`)          |
| Данные с сервера  | TanStack Query v5 + axios + JWT-refresh          |
| Формы             | React Hook Form + Zod                            |
| Стейт авторизации | Zustand                                          |
| Типы из API       | `openapi-typescript` (генерация из `schema.yml`) |

Менеджер пакетов — `pnpm` или `npm`. Примеры ниже с `npm`, `pnpm <cmd>`
работает идентично.

---

## Быстрый старт

```bash
npm install                        # один раз
echo 'VITE_API_BASE_URL=https://sct-back-demo.topcoder.kz' > .env.local
npm run dev                        # http://localhost:5173
```

### Скрипты

| Скрипт             | Что делает                                                   |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Vite dev-сервер с HMR                                        |
| `npm run build`    | tsc + Vite production build → `dist/`                        |
| `npm run preview`  | Отдать собранное локально (порт 4173)                        |
| `npm run lint`     | ESLint по всему `src/`                                       |
| `npm run gen:api`  | Перегенерировать TS-типы из `src/shared/api/schema.yml`      |

После любой смены `schema.yml` (бэкендщик присылает новую версию) —
запускайте `npm run gen:api`, чтобы синхронизировать типы.

### Переменные окружения

```ini
# .env.local
VITE_API_BASE_URL=https://sct-back-demo.topcoder.kz
```

Если переменной нет — фолбэк на demo из `src/shared/config/env.ts`.
На проде обязательно укажите свой URL.

---

## Структура проекта (FSD-light)

```
src/
├── app/         # роутер, layouts, провайдеры, guards, ErrorBoundary
├── pages/       # страницы (по одной на роут, lazy-loaded)
├── features/    # доменные модули с api/queries/UI
└── shared/
    ├── api/     # axios-инстансы, endpoints, типы (schema.ts — autogen)
    ├── config/  # env и константы
    ├── lib/     # утилиты (cn, format, phone, …)
    └── ui/      # дизайн-система (Button, Input, Modal, Toast, Skeleton…)
```

Принципы:

- `pages/` содержит только маршруты и layout. Бизнес-логика и работа с
  API живут в `features/`. Это упрощает реюз (например, `CarHero` из
  `service-book` используется на `HomePage`).
- `shared/api/schema.ts` автогенерится — руками не править.
- axios-инстанс `http` (`shared/api/http.ts`) с клиентской JWT-сессией и
  авто-refresh на 401. (Staff-инстанс `staffHttp` переехал в sct-admin.)
- Все формы — RHF + Zod. Серверные ошибки парсятся через `parseApiError`
  (`features/auth/errors.ts`).

---

## Демо-учётки

Для теста на `sct-back-demo.topcoder.kz`:

| Роль   | Логин            | Пароль   | Что внутри                                |
| ------ | ---------------- | -------- | ----------------------------------------- |

Клиентский логин — модалка с главной (`/?modal=login`).
Стафф-учётка (`admin_staff`) и вход теперь в проекте **sct-admin**.

---

## Деплой

Готовый бандл лежит в `dist/`. Можно отдавать любым статикером:

- **nginx**: положить `dist/` в `/var/www/sct-web`, в конфиге включить
  `try_files $uri $uri/ /index.html;` (SPA-fallback).
- **Vercel/Netlify**: указать `npm run build`, output `dist`, rewrite all
  to `/index.html`.
- **Docker**: `nginx:alpine` + copy dist в `/usr/share/nginx/html` + свой
  `nginx.conf` с fallback. Образ ~30 МБ.

CORS на бэке должен пропускать ваш домен (см. BACKEND_NOTES).

---

## Известные особенности бэка

Полный список расхождений OpenAPI ↔ реальность и недостающих эндпоинтов
— в **[BACKEND_NOTES.md](./BACKEND_NOTES.md)**. На фронте мы их обходим
как можем (см. `as unknown as`-касты, помеченные ссылкой на соответствующий
раздел BACKEND_NOTES).

Что видно сразу при первом запуске:

- `/api/schema/` отдаёт 403 — типы генерим из присланного руками
  `Template.yaml` в корне.
- Логотипы марок (S3) отдают 403 — `SafeImage` показывает инициалы как
  фолбэк.
- Django-ошибки приходят на английском, фронт переводит через
  `parseApiError`.

---

## Часто задаваемые вопросы

**Почему на главной два варианта вёрстки?**
Гость видит promo + benefits, авторизованный — мини-дашборд из сервисной
книжки (`CarHero`, `Recommendation`, `Appointments`). Переключение через
`useAuthStore().phase === 'authed'`.

**Где переводы Django-ошибок?**
`src/features/auth/errors.ts → parseApiError` принимает axios-ошибку и
возвращает `{ general, fields }`. Маппинг `common-passwords` и т.п. делается
там же. Когда бэк поставит `LANGUAGE_CODE = 'ru'` — слой переводов можно
убрать.

**Почему s3-логотипы марок не отображаются?**
Бакет закрыт (403 анонимам). `SafeImage` при ошибке показывает инициалы.
Когда бакет откроют — настоящие лого появятся автоматически.

**Почему регистрация ругается «пароль слишком распространённый»?**
Django проверяет пароль 4 валидаторами (length, numeric, common, similarity).
Common-паролей у Django ~20k, на фронте полный список не воспроизводим.
Используйте сложный — буквы + цифры + спецсимвол.