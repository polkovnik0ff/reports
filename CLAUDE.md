# CLAUDE.md — Генератор SEO-отчётов

Читай этот файл в начале каждой сессии. Здесь всё что нужно знать о проекте.

---

## Среда разработки

- **ОС:** Windows 10
- **Путь проекта:** `F:\projects\reports`
- **Терминал:** PowerShell или Windows Terminal (не cmd)
- **Node.js:** установлен с nodejs.org (проверить: `node -v` должен быть 20+)
- **PostgreSQL:** установлен с postgresql.org, работает как Windows Service (автозапуск)
- **VS Code:** с расширением Claude Code

### Важные особенности Windows

**Пути в командах** — в PowerShell слеши можно писать прямые или обратные:
```powershell
cd F:\projects\reports
# или
cd F:/projects/reports
```

**npx и npm** — работают из PowerShell без изменений.

**Playwright на Windows** — при первой установке запустить:
```powershell
npx playwright install chromium
```
Скачает ~150 МБ. После этого работает без изменений.

**PostgreSQL на Windows** — сервис запускается автоматически. Если нужно проверить:
```powershell
Get-Service -Name postgresql*
```
Подключение через pgAdmin (устанавливается вместе с PostgreSQL) или через psql в PowerShell.

**Переменные окружения** — файл `.env.local` в корне проекта. На Windows работает точно так же как на Mac/Linux — Next.js читает его автоматически.

**Git** — установить Git for Windows (git-scm.com). После установки git доступен в PowerShell.

**Создать БД** (выполнить один раз после установки PostgreSQL):
```powershell
psql -U postgres -c "CREATE DATABASE seo_reports;"
psql -U postgres -c "CREATE USER seo_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE seo_reports TO seo_user;"
```

**DATABASE_URL для Windows PostgreSQL:**
```
DATABASE_URL=postgresql://seo_user:yourpassword@localhost:5432/seo_reports
```

---

## Что мы строим

Веб-приложение для SEO-агентства. Специалист выбирает проект, настраивает период и блоки, пишет текст вручную, нажимает «Сгенерировать». Данные из Метрики и Topvisor забираются **один раз** и замораживаются в БД. Отчёт доступен по постоянному URL без авторизации. Можно скачать PDF.

**Ключевая идея:** снапшот данных неизменен. URL отчёта показывает одни и те же данные всегда.

---

## Стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16, App Router, TypeScript |
| БД | PostgreSQL 18 |
| ORM | Prisma 7 (provider: prisma-client, Driver Adapter) |
| UI | shadcn/ui + Tailwind CSS |
| Drag-and-drop | dnd-kit |
| Rich-text | Tiptap |
| PDF | Playwright (headless Chromium) |
| Авторизация | JWT в httpOnly cookie (jose + bcryptjs) |
| Шифрование | AES-256-GCM (встроенный crypto Node.js) |
| ID | nanoid (slug публичных отчётов) |
| Валидация | Zod |

### Установленные пакеты (сверх create-next-app)

```
prisma @prisma/client @prisma/adapter-pg
pg @types/pg
jose bcryptjs @types/bcryptjs
nanoid zod dotenv
tsx ts-node (dev)
shadcn/ui: button card input label
```

---

## Переменные окружения (.env.local)

```
DATABASE_URL=postgresql://user:password@localhost:5432/seo_reports
JWT_SECRET=<случайная строка 64 символа>
ENCRYPTION_KEY=<hex 32 байта — для AES-256>
YANDEX_CLIENT_ID=<из oauth.yandex.ru>
YANDEX_CLIENT_SECRET=<из oauth.yandex.ru>
APP_URL=http://localhost:3000
TOPVISOR_BASE_URL=https://api.topvisor.com
```

---

## Модель данных (Prisma schema)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  role         Role     @default(MEMBER)
  createdAt    DateTime @default(now())
  reports      Report[]
}

enum Role { OWNER ADMIN MEMBER }

model AccountSettings {
  id                  String  @id @default(cuid())
  topvisorUserId      String? // зашифрован
  topvisorApiKey      String? // зашифрован
  whiteLabelDomain    String?
  updatedAt           DateTime @updatedAt
}

model ConnectedAccount {
  id           String            @id @default(cuid())
  name         String?           // имя владельца аккаунта
  email        String
  service      ConnectedService
  accessToken  String            // зашифрован AES-256-GCM
  refreshToken String?           // зашифрован
  expiresAt    DateTime?
  status       AccountStatus     @default(CONNECTED)
  connectedAt  DateTime          @default(now())
  projects     Project[]

  @@unique([email, service])
}

enum ConnectedService {
  YANDEX_METRIKA
  YANDEX_DIRECT
  YANDEX_WEBMASTER
  GOOGLE_ANALYTICS
  GOOGLE_ADS
  GOOGLE_SEARCH_CONSOLE
  VK_ADS
  FACEBOOK
  BITRIX24
}

enum AccountStatus { CONNECTED NO_ACCESS DISCONNECTED }

model Project {
  id                 String           @id @default(cuid())
  metrіkaCounterId   Int              @unique  // = ID счётчика Метрики
  name               String
  url                String
  connectedAccount   ConnectedAccount @relation(fields: [connectedAccountId], references: [id])
  connectedAccountId String
  createdAt          DateTime         @default(now())
  reports            Report[]
}

model Template {
  id           String   @id @default(cuid())
  name         String
  blocksConfig Json     // BlockConfig[]
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
  reports      Report[]
}

// BlockConfig (JSON структура):
// {
//   id: string,           // уникальный id внутри шаблона
//   type: BlockType,
//   enabled: boolean,
//   order: number,
//   commentAbove: string, // HTML
//   commentBelow: string, // HTML
//   settings: {}          // специфично для каждого типа
// }

model WorkTemplate {
  id        String   @id @default(cuid())
  name      String
  content   String   // HTML rich-text
  createdAt DateTime @default(now())
}

model Report {
  id           String       @id @default(cuid())
  slug         String       @unique // nanoid(10)
  title        String
  project      Project      @relation(fields: [projectId], references: [id])
  projectId    String
  template     Template?    @relation(fields: [templateId], references: [id])
  templateId   String?
  createdBy    User         @relation(fields: [createdById], references: [id])
  createdById  String
  dateFrom     DateTime
  dateTo       DateTime
  compareFrom  DateTime?
  compareTo    DateTime?
  reportConfig Json         // BlockConfig[] — копия на момент генерации
  snapshotData Json?        // все данные из API — заменяется при регенерации через редактор
  pdfPath      String?
  status       ReportStatus @default(GENERATING)
  generatedAt  DateTime?
  createdAt    DateTime     @default(now())

  @@index([projectId, createdAt])
}

enum ReportStatus { GENERATING READY ERROR }
```

---

## Типы блоков отчёта

```typescript
type BlockType =
  // Метрика
  | 'traffic_summary'       // KPI: визиты, уники, отказы, глубина, время
  | 'traffic_channels'      // Распределение по каналам (donut + таблица)
  | 'traffic_search_engines'// По поисковым системам (donut + легенда, без таблицы; dim: ym:s:SearchEngineRoot)
  | 'search_engines_dynamics'// Динамика переходов из поисковых систем (LineChart по движкам + таблица с динамикой)
  | 'traffic_search_dynamics'// LineChart: посетители по поисковым системам по дням (те же данные что search_engines_dynamics, без таблицы)
  | 'traffic_yoy'           // Сравнение с прошлым годом (area chart, только organic-трафик)
  | 'traffic_geography'     // География (donut + таблица регионов)
  | 'traffic_devices'       // Устройства (donut + таблица)
  | 'top_pages'             // Топ посадочных страниц
  | 'top_queries'           // Топ поисковых фраз
  | 'referrals'             // Переходы с сайтов
  | 'high_bounce_pages'     // Страницы с высоким отказом
  // Topvisor
  | 'positions_summary'     // Сводка: всего запросов, видимость, ТОП-1/3/5/10
  | 'positions_table'       // Таблица позиций по группам
  // Яндекс Вебмастер
  | 'webmaster_queries'     // Топ запросов: показы/клики/CTR/позиция (Webmaster API v4)
  | 'webmaster_indexing'    // Индексация: в индексе / исключено / ошибки сканирования
  // Google Search Console
  | 'gsc_queries'           // Топ запросов GSC: клики/показы/CTR/позиция
  | 'gsc_pages'             // Топ страниц GSC: клики/показы/CTR/позиция
  // Ручные
  | 'work_done'             // Проделанная работа (rich-text)
  | 'work_plan'             // Планируемая работа (rich-text)
  | 'custom_text'           // Произвольный текстовый блок
  | 'custom_kpi'            // Таблица план/факт
```

---

## Структура файлов (важные части)

```
app/
  (auth)/login/              # Страница входа
  (dashboard)/
    layout.tsx               # Sidebar: Проекты / Источники / Шаблоны / Настройки (Отчёты убраны)
    projects/
      page.tsx               # Список проектов (строки кликабельны → /projects/[id])
      [id]/
        page.tsx             # Страница проекта: инфо + список отчётов + кнопка "+ Новый отчёт"
        reports/
          new/page.tsx       # Форма создания отчёта (без выбора проекта, 3 шага)
    sources/                 # Источники данных: подключить/отключить аккаунты
    templates/               # Список + конструктор шаблонов (drag-and-drop)
    reports/
      page.tsx               # redirect → /projects
      new/page.tsx           # redirect → /projects
    settings/                # Topvisor API keys, белый лейбл, смена пароля
  (editor)/                  # Отдельный layout без sidebar (только auth + toaster)
    layout.tsx
    projects/[id]/reports/[reportId]/
      edit/page.tsx          # Редактор отчёта: split-pane (панель слева + iframe справа)
  r/[slug]/                  # Публичная страница отчёта (без авторизации)
  api/
    auth/                    # login, logout, me
    projects/                # CRUD + /counters (список счётчиков из Яндекса)
    sources/                 # список, подключить, отключить
    oauth/yandex/            # start, callback
    templates/               # CRUD
    work-templates/          # CRUD
    reports/                 # GET (список, ?projectId=), POST (создать → генерация)
    reports/[id]/            # GET (?full=1 возвращает reportConfig), PATCH (обновить → регенерация), DELETE
    pdf/[slug]/              # Playwright → PDF
    settings/                # get/patch настроек + /topvisor/projects
    upload/                  # POST multipart/form-data → сохраняет в /public/uploads/, возвращает { url }

lib/
  auth-edge.ts               # edge-safe: verifyToken, SessionPayload (только jose)
  auth.ts                    # server-only: createToken, getSession, sessionCookieOptions
  crypto.ts                  # encryptToken, decryptToken (AES-256-GCM)
  prisma.ts                  # PrismaClient синглтон с PrismaPg adapter
  report-generator.ts        # оркестратор генерации снапшота
  pdf.ts                     # Playwright headless → PDF
  utils/
    engine-colors.ts         # getEngineColor(id, idx) — единые цвета поисковиков
  services/
    metrika.ts               # клиент Яндекс Метрика Reporting API
    topvisor.ts              # клиент Topvisor API v2
  blocks/                    # по файлу на каждый тип блока

components/
  report/                    # компоненты блоков (для публичной страницы)
    blocks/
      donut-table.tsx        # DonutTable — donut + таблица (channels, geo, devices, search engines)
      ranked-table.tsx       # RankedTable — пронумерованная таблица (top_pages, referrals, top_queries)
      high-bounce-pages.tsx  # таблица страниц с высоким отказом
      area-chart-block.tsx   # YoY area chart
      traffic-search-dynamics.tsx  # LineChart поисковиков по дням + сводная таблица
      search-engines-dynamics.tsx  # LineChart + таблица с динамикой по движкам
  builder/                   # конструктор шаблона (drag-and-drop)
  reports/
    report-form-embedded.tsx # форма создания отчёта (без выбора проекта)
    report-editor.tsx        # редактор отчёта: split-pane с табами и iframe preview
  projects/
    projects-client.tsx      # список проектов (строки → /projects/[id])
    project-page-client.tsx  # страница проекта с отчётами
  ui/
    rich-text-editor.tsx     # RichTextEditor — Tiptap, тулбар, загрузка изображений, таблицы

proxy.ts                     # защита роутов (Next.js 16, кроме /login и /r/*)
scripts/
  create-admin.ts            # создать OWNER пользователя: npx tsx scripts/create-admin.ts
prisma/schema.prisma
prisma.config.ts             # конфиг Prisma CLI (читает .env.local через dotenv)
```

---

## Ключевые правила безопасности

- **Пароли:** bcrypt с cost=12. Никогда не хранить plaintext.
- **Токены OAuth и API ключи:** шифровать AES-256-GCM через `lib/crypto.ts` перед записью в БД.
- **ENCRYPTION_KEY:** только в env. Никогда в код и никогда в git.
- **JWT:** httpOnly cookie, SameSite=Lax. Не хранить в localStorage.
- **OAuth state:** nanoid в сессии, проверять в callback (защита от CSRF).
- **Slug вместо ID:** публичные ссылки используют nanoid(10), не числовой ID.
- **Zod:** валидировать все входящие данные на API-роутах.
- **Rate limit:** особенно /api/auth/login и /api/reports (POST).

---

## Логика генерации отчёта

```
POST /api/reports
  │
  ├─ Создать запись Report { status: GENERATING, slug: nanoid() }
  ├─ Вернуть { id, slug } клиенту (клиент начинает polling)
  │
  └─ Запустить generateReport(reportId) асинхронно
       │
       ├─ Достать токены проекта (ConnectedAccount)
       ├─ Достать Topvisor ключи (AccountSettings)
       ├─ Для каждого enabled блока из reportConfig:
       │    └─ вызвать lib/blocks/[type].ts → данные из API
       ├─ Собрать snapshotData = { [blockId]: data }
       ├─ Сохранить snapshotData в Report
       └─ Обновить status → READY (или ERROR)

GET /api/reports/[id] — polling каждые 2 сек пока status !== READY|ERROR
```

---

## Публичная страница /r/[slug]

- Server Component (SSR)
- Загружает Report по slug из БД
- Рендерит блоки из `snapshotData` по `reportConfig`
- **Без авторизации**, без редиректов
- `?print=1` скрывает кнопки (для Playwright)
- Белый лейбл: если `account_settings.whiteLabelDomain` задан — показывать домен агентства

---

## PDF

```typescript
// lib/pdf.ts
async function generatePdf(slug: string): Promise<string> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${APP_URL}/r/${slug}?print=1`)
  await page.waitForLoadState('networkidle')
  const buffer = await page.pdf({ format: 'A4', printBackground: true })
  await browser.close()
  // сохранить в /public/pdfs/${slug}.pdf или Object Storage
  // обновить report.pdfPath
  return pdfPath
}
```

---

## Интеграции

### Яндекс Метрика (Reporting API)
- OAuth через Яндекс. Endpoint: `https://api-metrika.yandex.net/stat/v1/data`
- Токен в `ConnectedAccount.accessToken` (расшифровать перед использованием)
- Основные параметры: `ids`, `metrics`, `dimensions`, `date1`, `date2`, `limit`

### Topvisor (API v2)
- API key (не OAuth). UserId + API Key в `AccountSettings` (зашифрованы)
- Endpoint: `https://api.topvisor.com/v2/json/`
- Нужные методы: `get/projects_2/projects` (список), `get/positions_2/history` (позиции)

---

## Важные технические решения (принятые в ходе разработки)

### Next.js 16

- **`middleware.ts` переименован в `proxy.ts`**, функция экспортируется как `proxy` (не `middleware`):
  ```typescript
  // proxy.ts
  export async function proxy(request: NextRequest) { ... }
  export const config = { matcher: [...] }
  ```
- **Edge runtime** (где выполняется `proxy.ts`) не поддерживает `next/headers` и Node.js-only API.
  Всё что импортируется в `proxy.ts` должно быть edge-safe.

### Auth — два модуля

| Файл | Содержимое | Где импортировать |
|------|-----------|-------------------|
| `lib/auth-edge.ts` | `verifyToken`, `SessionPayload` (только `jose`) | `proxy.ts` |
| `lib/auth.ts` | `createToken`, `getSession`, `sessionCookieOptions` (импортирует `next/headers`) | API роуты, Server Components |

`proxy.ts` импортирует **только из `lib/auth-edge.ts`** — иначе ошибка edge runtime.

### Prisma 6 с кастомным output

- Новый провайдер `prisma-client` (вместо `prisma-client-js`) требует **Driver Adapter**.
  Обычная строка подключения в конструкторе не работает.
- Установлены: `@prisma/adapter-pg` + `pg` + `@types/pg`.
- Синглтон клиента в `lib/prisma.ts`:
  ```typescript
  import { PrismaPg } from "@prisma/adapter-pg";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```
- Prisma Client генерируется в `app/generated/prisma` (прописан в `prisma.config.ts`).
  Импортировать: `import { PrismaClient } from "@/app/generated/prisma/client"`.
- `prisma.config.ts` читает `.env.local` через `dotenv` (не `.env`).
- PostgreSQL 18: пользователю `seo_user` нужны права `CREATEDB` и `GRANT ALL ON SCHEMA public`.

### Скрипты (scripts/)

- Запускать через `npx tsx` — поддерживает ESM (не `ts-node`):
  ```powershell
  npx tsx scripts/create-admin.ts admin@agency.ru Password123!
  ```
- В скриптах `dotenv.config()` вызывать **до** импорта Prisma (иначе `DATABASE_URL` не установлен).

### Работа с live-отчётами (отладка данных)

Когда пользователь скидывает ссылку вида `http://localhost:3000/r/<slug>`, данные можно получить напрямую из БД:

```javascript
// Таблица называется "Report" (с заглавной), колонки в camelCase
// Пример: получить снапшот и настройки отчёта
node -e "
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT \\\"dateFrom\\\", \\\"dateTo\\\", attribution, \\\"crossDevice\\\", \\\"withRobots\\\", \\\"snapshotData\\\"::text FROM \\\"Report\\\" WHERE slug = '<slug>'\", (err, res) => {
  const row = res.rows[0];
  const snap = JSON.parse(row.snapshotData);
  console.log('keys:', Object.keys(snap));
  process.exit(0);
});
"
```

Для прямых запросов к Метрике — получить токен через скрипт:
```typescript
// scripts/test-something.ts
import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { decryptToken } from '../lib/crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);
// prisma.report.findFirst({ where: { slug: '...' }, include: { project: { include: { connectedAccount: true } } } })
// token = decryptToken(report.project.connectedAccount.accessToken)
// counterId = report.project.metrikaCounterId
```

**Важно:** `dateFrom`/`dateTo` в БД хранятся как UTC timestamp. При конвертации в строку для Метрики использовать `fmt()` из `report-generator.ts` (`toISOString().slice(0,10)`) — это даёт правильный результат для дат без времени. Локальные даты в компонентах формировать через `getFullYear/getMonth/getDate`, не через `toISOString()`.

### Единые цвета поисковых систем

Все цвета поисковиков — в `lib/utils/engine-colors.ts`, функция `getEngineColor(id, idx)`.
Никогда не дублировать цвета в компонентах — импортировать из этого файла.

### Метрика API — особенности

- **users vs visits по дням:** `ym:s:users` при группировке по дням не дедуплицируется — один человек за 365 дней даёт 365. Для KPI-карточек с уникальными пользователями нужен запрос через `totals` без dimension-а date (или breakdown по каналу без date).
- **Фильтр organic:** использовать `channelsDimension()=='organic'`, а НЕ `ym:s:trafficSource=='organic'`. Последний не учитывает атрибуцию и кросс-девайс и даёт другие цифры.
- **Длинные периоды:** использовать `getAllReportPages()` вместо `getReport()` для запросов с group=day за год+.
- **Сортировка:** Метрика API не поддерживает многоуровневую сортировку. Брать больше строк (200+) и сортировать на сервере.

### Rich-text редактор (Tiptap)

- Компонент: `components/ui/rich-text-editor.tsx`, экспорт `RichTextEditor`.
- **Props:** `content: string` (HTML), `onChange: (html) => void`, `placeholder?`, `className?`, `minHeight?` (default `"200px"`).
- **Расширения:** StarterKit, Underline, TextStyle, TextAlign, Link, Placeholder, Image, Highlight, TaskList/TaskItem, Table/TableRow/TableCell/TableHeader.
- **Тулбар:** B/I/U/S/Highlight, H1/H2/H3, выравнивание, списки (маркер/нумер/задачи), ссылка (инлайн-инпут), загрузка изображения, таблица, очистка форматирования.
- **Контекстная панель таблицы:** появляется когда курсор внутри таблицы — добавить/удалить строки и столбцы, удалить таблицу.
- **Изображения:** загрузка через `POST /api/upload` (multipart), файл сохраняется в `public/uploads/`. Ограничения: JPEG/PNG/WebP, макс. 3 МБ. Папка в `.gitignore`.
- **SSR:** обязательно `immediatelyRender: false` в `useEditor` — иначе hydration mismatch в Next.js.
- **Защита от цикла:** `suppressNextUpdate` ref — при внешнем обновлении `content` блокирует один вызов `onUpdate`, чтобы не было петли parent→editor→onChange→parent.
- **Стили:** `.rich-text-content .tiptap` в `globals.css` — контент редактора. `.prose-report` — рендер HTML в публичном отчёте и комментариях блоков.
- **Где используется:** шаг 3 формы создания (work_done/work_plan), таб «Тексты» редактора отчёта, поля комментариев в конструкторе шаблона (`template-builder.tsx`).

### Остановка dev-сервера на Windows

Если `npm run dev` не стартует (порт занят), убить через PowerShell:
```powershell
Stop-Process -Name node -Force
```
После нескольких аварийных остановок может повредиться Turbopack cache — удалить `.next/`:
```powershell
Remove-Item -Recurse -Force .next
```

---

## Текущая фаза разработки

**Обновить эту строку при переходе между фазами.**

```
Текущая фаза: 3 — ЗАВЕРШЕНА (включая доработки UX и редактор)
Следующая фаза: 4 — Topvisor + блоки позиций + PDF
```

### Фазы:
1. ✅ Инит + Prisma + авторизация email/пароль + middleware
2. ✅ Источники данных + OAuth Яндекса + список счётчиков + добавление проектов
   - ✅ Dashboard layout (sidebar) + stub-страницы
   - ✅ OAuth Яндекса (Метрика + Вебмастер), страница /sources с таблицей и удалением
   - ✅ Страница /projects: список счётчиков Метрики, модалка добавления, CRUD проектов
   - Вебмастер: scope не передаём явно — разрешения настраиваются на oauth.yandex.ru уровне приложения
3. Конструктор шаблонов + генератор отчётов + Метрика + публичная страница
   - ✅ /templates, /templates/new, /templates/[id]: конструктор с dnd-kit, блоки вкл/выкл, комментарии
   - ✅ DEFAULT_BLOCKS (16 блоков), seed "Стандартный отчёт" в БД
   - ✅ MetrikaClient (12 методов), generateReport оркестратор, fire-and-forget генерация
   - ✅ /reports/new: 3-шаговая форма (проект+период → блоки → тексты), polling → /r/[slug]
   - ✅ /reports: история с бейджами статуса, open/copy/delete
   - ✅ /r/[slug]: публичная страница (без авторизации), SSR, все блоки Метрики, recharts DonutChart + AreaChart + LineChart, print-стили
   - ✅ Динамика (DiffSup ↑↓) во всех таблицах блоков, lang=ru для Метрики, базовая метрика ym:s:users
   - ✅ Новый блок search_engines_dynamics: LineChart по поисковикам + таблица с динамикой
   - ✅ traffic_search_dynamics переработан: LineChart посетителей по движкам по дням + сводная таблица
   - ✅ traffic_search_engines: только donut; dim: ym:s:SearchEngineRoot; топ-6, фильтр пустых
   - ✅ traffic_yoy: фильтр organic, график по visits, KPI через totals, getAllReportPages
   - ✅ traffic_geography: топ-6 + "Другие", фильтр "Не определено"
   - ✅ Единые цвета поисковых систем: lib/utils/engine-colors.ts
   - ✅ Форма создания: кросс-девайс и "с роботами" по умолчанию; пресеты; UTC-баг исправлен; dd.mm.yyyy
   - ✅ top_pages: фильтр organic, метрика visits, кликабельные ссылки
   - ✅ referrals: refererDomain, фильтр referral, атрибуция/кросс-девайс, кликабельные домены
   - ✅ high_bounce_pages: топ-200 → фильтр своего домена → сортировка bounceRate+visits → топ-10; ссылки
   - ✅ DiffSup ↑100% — когда элемент есть в текущем периоде, но отсутствует в сравниваемом
   **Реструктуризация роутов (отчёты вложены в проекты):**
   - ✅ /projects/[id] — страница проекта со списком отчётов
   - ✅ /projects/[id]/reports/new — форма создания без выбора проекта
   - ✅ "Отчёты" убраны из sidebar
   - ✅ /reports → redirect /projects
   **Редактор отчётов:**
   - ✅ /projects/[id]/reports/[reportId]/edit — full-screen split-pane редактор
   - ✅ Левая панель: 3 таба (Параметры / Блоки / Тексты) + кнопка "Сгенерировать"
   - ✅ Правая панель: iframe с /r/[slug], обновляется после регенерации
   - ✅ PATCH /api/reports/[id] — обновляет поля + запускает generateReport заново
   - ✅ GET /api/reports/[id]?full=1 — возвращает reportConfig и все настройки для редактора
   - ✅ (editor) route group — отдельный layout без sidebar
   **Rich-text редактор:**
   - ✅ components/ui/rich-text-editor.tsx — Tiptap, полный тулбар (B/I/U/S/Highlight, H1-H3, выравнивание, списки, ссылка, изображение, таблица)
   - ✅ Загрузка изображений: POST /api/upload → public/uploads/, JPEG/PNG/WebP, макс. 3 МБ
   - ✅ Расширения: Image, Highlight, TaskList, Table (с контекстной панелью строк/колонок)
   - ✅ Замена textarea во всех текстовых полях: форма создания (шаг 3), редактор отчёта (таб Тексты), конструктор шаблона (комментарии блоков)
   - ✅ Стили prose-report обновлены (h1/h2/h3/ul/ol/a/mark/table/taskList); стили редактора в globals.css
4. Topvisor + Вебмастер + Google Search Console + блоки позиций/индексации + PDF
   **Topvisor:**
   - [ ] lib/services/topvisor.ts — клиент API v2: get/projects_2/projects, get/positions_2/history
   - [ ] lib/blocks/positions_summary.ts — сводка: всего запросов, видимость, ТОП-1/3/5/10
   - [ ] lib/blocks/positions_table.ts — таблица позиций по группам
   - [ ] components/report/blocks/positions-summary.tsx
   - [ ] components/report/blocks/positions-table.tsx
   - [ ] Настройки Topvisor в /settings: UserId + API Key (шифруются AES-256)
   **Яндекс Вебмастер:**
   - [ ] lib/services/webmaster.ts — клиент Webmaster API v4 (токен из ConnectedAccount)
         Методы: getSearchQueries, getIndexingStats
   - [ ] lib/blocks/webmaster_queries.ts — топ запросов: показы/клики/CTR/позиция
         API: GET /v4/user/site/{host-id}/search-queries/popular?order_by=IMPRESSIONS
   - [ ] lib/blocks/webmaster_indexing.ts — сводка индексации: в индексе / исключено / ошибки
         API: GET /v4/user/site/{host-id}/indexing/stats
   - [ ] components/report/blocks/webmaster-queries.tsx — таблица запросов (показы/клики/CTR/позиция)
   - [ ] components/report/blocks/webmaster-indexing.tsx — KPI-карточки + динамика
   - [ ] Привязка host-id Вебмастера к Project (сейчас хранится только metrіkaCounterId)
         Вариант: добавить поле webmasterHostId: String? в модель Project
   **Google Search Console:**
   - [ ] OAuth через Google — добавить в /sources (ConnectedService.GOOGLE_SEARCH_CONSOLE уже есть в enum)
         Scopes: https://www.googleapis.com/auth/webmasters.readonly
         OAuth endpoints: accounts.google.com/o/oauth2/v2/auth, oauth2.googleapis.com/token
   - [ ] lib/services/gsc.ts — клиент Search Console API v1 (токен из ConnectedAccount)
         Методы: searchAnalytics (query, page, country, device), sitemaps
         Базовый URL: https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
         Тело запроса: { startDate, endDate, dimensions, rowLimit }
   - [ ] lib/blocks/gsc_queries.ts — топ запросов GSC: клики/показы/CTR/позиция
   - [ ] lib/blocks/gsc_pages.ts — топ страниц GSC: клики/показы/CTR/позиция
   - [ ] components/report/blocks/gsc-queries.tsx — таблица (аналог webmaster-queries но из Google)
   - [ ] components/report/blocks/gsc-pages.tsx — таблица страниц
   - [ ] Привязка siteUrl GSC к Project: добавить поле gscSiteUrl: String? в модель Project
         siteUrl в GSC — строка вида "https://example.com/" или "sc-domain:example.com"
   - [ ] Refresh token: GSC токены живут 1 час — нужен refresh через oauth2.googleapis.com/token
         (хранить refreshToken в ConnectedAccount.refreshToken, шифровать AES-256)
   **PDF:**
   - [ ] lib/pdf.ts — Playwright headless, сохранение в public/pdfs/${slug}.pdf
   - [ ] GET /api/pdf/[slug] — генерация по запросу, возвращает файл
   - [ ] Кнопка «Скачать PDF» на публичной странице /r/[slug]
5. Шаблоны работ + белый лейбл + команда + настройки аккаунта
6. Docker + VDS + мониторинг + бэкапы

---

## Команды разработки (Windows PowerShell)

```powershell
# Запустить dev-сервер
npm run dev
# Открыть: http://localhost:3000

# Применить новую миграцию после изменений schema.prisma
npx prisma migrate dev --name <название>

# Пересгенерировать Prisma Client (после migrate это делается автоматически)
npx prisma generate

# Открыть Prisma Studio (визуальный просмотр БД)
npx prisma studio

# Создать первого пользователя (OWNER)
npx tsx scripts/create-admin.ts admin@agency.ru YourPassword123!

# Убить все node-процессы (если dev-сервер завис)
Stop-Process -Name node -Force

# Очистить Turbopack cache (если сервер падает с ошибкой corrupted database)
Remove-Item -Recurse -Force .next
```

### .gitignore (актуальное):
```
.env*
node_modules/
.next/
public/pdfs/
.claude/settings.local.json
*.docx
/app/generated/prisma
```

## Созданные пользователи

| Email | Пароль | Роль |
|-------|--------|------|
| admin@agency.ru | AdminPass123! | OWNER |

Пользователь создан через scripts/create-admin.ts. 
Скрипт повторно запускать не нужно — выдаст ошибку что пользователь уже существует.