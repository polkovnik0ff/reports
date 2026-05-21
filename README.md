# SEO Reports Application

Next.js приложение для генерации SEO-отчётов с интеграцией Google Search Console, Yandex Metrika, Topvisor и других сервисов.

## 🛠 Стек технологий

| Категория | Технологии |
|-----------|------------|
| **Фреймворк** | Next.js 16.2.4 (App Router) |
| **Язык** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Base UI |
| **Редактор** | Tiptap 3 (rich-text editor) |
| **Графики** | Recharts 3 |
| **БД** | PostgreSQL + Prisma ORM 7.7.0 |
| **Аутентификация** | JWT (jose), bcryptjs |
| **PDF генерация** | Playwright |
| **API интеграции** | Google Search Console, Yandex Metrika/Direct/Webmaster, Topvisor, OpenAI |

## 📋 Требования

- **Node.js** 20+
- **PostgreSQL** 14+
- **pnpm** 9+ (рекомендуется) или npm
- **Docker** (опционально, для контейнеризации)

## 🚀 Быстрый старт (локально)

```bash
# Установка зависимостей
pnpm install

# Настройка окружения
cp .env.example .env.local
# Отредактируйте .env.local с вашими данными

# Применить миграции БД
pnpm prisma migrate dev

# Сгенерировать Prisma Client
pnpm prisma generate

# Установить Playwright браузеры (для PDF)
pnpm playwright install chromium

# Запуск dev-сервера
pnpm dev
```

## 🏗 Сборка для production

```bash
# Build
pnpm build

# Запуск production-сервера
pnpm start
```

## 🐳 Docker

### Сборка образа

```bash
docker build -t seo-reports:latest .
```

### Запуск контейнера

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  --name seo-reports \
  seo-reports:latest
```

### Docker Compose (опционально)

Создайте `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/seo_reports
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: seo_reports
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Запуск:
```bash
docker-compose up -d
```

## 🔄 CI/CD (GitLab)

Проект настроен для автоматической сборки и деплоя через GitLab CI/CD.

### Переменные CI/CD (настройте в GitLab > Settings > CI/CD)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | URL приложения в production |
| `DEPLOY_USER` | Пользователь SSH для деплоя |
| `DEPLOY_HOST` | Хост сервера |
| `DEPLOY_PATH` | Путь на сервере для деплоя |
| `APP_NAME` | Название приложения в PM2 |
| `SSH_PRIVATE_KEY` | Приватный SSH ключ для деплоя |

### Пайплайн

```
┌─────────┐    ┌────────┐    ┌────────┐    ┌─────────┐    ┌────────┐
│  lint   │───▶│  test  │───▶│  build │───▶│ migrate │───▶│ deploy │
└─────────┘    └────────┘    └────────┘    └─────────┘    └────────┘
   (auto)       (auto)        (auto)       (manual)      (manual)
```

### Ручной деплой

1. Создайте MR в `main` ветку
2. После мержа пайплайн выполнит `lint`, `test`, `build`
3. Запустите `migrate` вручную (GitLab CI > Pipelines)
4. Запустите `deploy` вручную

## 📁 Структура проекта

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Маршруты аутентификации
│   ├── (dashboard)/       # Основной дашборд
│   ├── (editor)/          # Редакторы
│   ├── api/               # API Routes
│   └── r/                 # Public report links
├── components/            # React компоненты
│   ├── report/blocks/     # Блоки отчётов
│   ├── ui/                # UI компоненты (shadcn)
│   └── ...
├── lib/                   # Утилиты и сервисы
│   ├── services/          # Интеграции (GSC, Metrika, etc.)
│   └── blocks/            # Логика блоков отчётов
├── prisma/                # Prisma schema и миграции
└── scripts/               # Утилиты (seed, admin creation)
```

## 🔐 Окружение (.env)

Пример `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/seo_reports"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OAuth (Google)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# OAuth (Yandex)
YANDEX_CLIENT_ID="your-client-id"
YANDEX_CLIENT_SECRET="your-client-secret"

# Topvisor
TOPVISOR_USER_ID="your-user-id"
TOPVISOR_API_KEY="your-api-key"

# OpenAI (если используется)
OPENAI_API_KEY="your-api-key"

# Playwright (PDF генерация)
PLAYWRIGHT_HEADLESS=true
```

## 📚 Полезные команды

```bash
# Миграции БД
pnpm prisma migrate dev      # dev окружение
pnpm prisma migrate deploy   # production
pnpm prisma migrate status   # статус миграций

# Prisma Studio (GUI для БД)
pnpm prisma studio

# Генерация типов
pnpm prisma generate

# Проверка кода
pnpm lint

# Сброс БД (осторожно!)
pnpm prisma migrate reset
```

## 🤝 Вклад

1. Fork проекта
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Proprietary. Все права защищены.