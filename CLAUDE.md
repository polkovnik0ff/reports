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
  snapshotData Json?        // все данные из API — никогда не изменяется
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
  | 'traffic_search_engines'// По поисковым системам (donut + таблица)
  | 'traffic_search_dynamics'// Динамика поискового трафика (area chart)
  | 'traffic_yoy'           // Сравнение с прошлым годом (area chart)
  | 'traffic_geography'     // География (donut + таблица регионов)
  | 'traffic_devices'       // Устройства (donut + таблица)
  | 'top_pages'             // Топ посадочных страниц
  | 'top_queries'           // Топ поисковых фраз
  | 'referrals'             // Переходы с сайтов
  | 'high_bounce_pages'     // Страницы с высоким отказом
  // Topvisor
  | 'positions_summary'     // Сводка: всего запросов, видимость, ТОП-1/3/5/10
  | 'positions_table'       // Таблица позиций по группам
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
    layout.tsx               # Sidebar: Проекты / Источники / Шаблоны / Отчёты / Настройки
    projects/                # Список проектов + добавить (модалка со счётчиками)
    sources/                 # Источники данных: подключить/отключить аккаунты
    templates/               # Список + конструктор шаблонов (drag-and-drop)
    reports/
      page.tsx               # История отчётов
      new/page.tsx           # Генератор (период → настройки → текст → генерировать)
    settings/                # Topvisor API keys, белый лейбл, смена пароля
  r/[slug]/                  # Публичная страница отчёта (без авторизации)
  api/
    auth/                    # login, logout, me
    projects/                # CRUD + /counters (список счётчиков из Яндекса)
    sources/                 # список, подключить, отключить
    oauth/yandex/            # start, callback
    templates/               # CRUD
    work-templates/          # CRUD
    reports/                 # создать (→ генерация), список, детали, удалить
    pdf/[slug]/              # Playwright → PDF
    settings/                # get/patch настроек + /topvisor/projects

lib/
  auth-edge.ts               # edge-safe: verifyToken, SessionPayload (только jose)
  auth.ts                    # server-only: createToken, getSession, sessionCookieOptions
  crypto.ts                  # encryptToken, decryptToken (AES-256-GCM)
  prisma.ts                  # PrismaClient синглтон с PrismaPg adapter
  report-generator.ts        # оркестратор генерации снапшота
  pdf.ts                     # Playwright headless → PDF
  services/
    metrika.ts               # клиент Яндекс Метрика Reporting API
    topvisor.ts              # клиент Topvisor API v2
  blocks/                    # по файлу на каждый тип блока

components/
  report/                    # компоненты блоков (для публичной страницы)
  builder/                   # конструктор шаблона (drag-and-drop)
  ui/                        # shadcn компоненты

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
Текущая фаза: 3 — ЗАВЕРШЕНА
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
   - ✅ DEFAULT_BLOCKS (15 блоков), seed "Стандартный отчёт" в БД
   - ✅ MetrikaClient (10 методов), generateReport оркестратор, fire-and-forget генерация
   - ✅ /reports/new: 3-шаговая форма (проект+период → блоки → тексты), polling → /r/[slug]
   - ✅ /reports: история с бейджами статуса, open/copy/delete
   - ✅ /r/[slug]: публичная страница (без авторизации), SSR, все блоки Метрики, recharts DonutChart + AreaChart, print-стили
4. Topvisor + блоки позиций + PDF
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