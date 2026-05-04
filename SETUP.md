# SETUP — Развёртывание проекта на новом ПК

## Требования (установить вручную, один раз)

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL 18** — [postgresql.org](https://www.postgresql.org/download/windows/)
- **Git** — [git-scm.com](https://git-scm.com)

---

## Что нужно сделать руками (один раз)

### 1. Скопировать `.env.local`

Перенести файл `.env.local` со старого ПК или с защищённого хранилища.
Файл не хранится в git. Без него сервис не запустится.

### 2. Создать базу данных (если её нет)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE seo_reports;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE USER seo_user WITH PASSWORD 'yourpassword';"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE seo_reports TO seo_user;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "GRANT ALL ON SCHEMA public TO seo_user;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "ALTER USER seo_user CREATEDB;"
```

---

## Остальное — говоришь Клоду «актуализируй проект»

Клод сам выполнит все шаги ниже в правильном порядке.

---

## Что делает «актуализация» (для справки)

| Шаг | Команда | Зачем |
|-----|---------|-------|
| Обновить код | `git pull` | Получить последние изменения |
| Установить зависимости | `npm install` | Новые пакеты из package.json |
| Применить миграции | `npx prisma migrate deploy` | Добавить новые колонки в БД |
| Сгенерировать клиент | `npx prisma generate` | Обновить типы Prisma (папка в .gitignore) |
| Установить Chromium | `npx playwright install chromium` | Для генерации PDF |

---

## Возможные проблемы

### `column "X" already exists` при migrate deploy

Колонка была добавлена вручную в обход миграций. Пометить миграцию как выполненную:

```powershell
npx prisma migrate resolve --applied <имя_миграции>
npx prisma migrate deploy
```

После этого вручную убедиться через `npx prisma studio` что все колонки из той миграции реально есть в БД.

### `Module not found: playwright`

```powershell
npm install playwright
npx playwright install chromium
```

### Prisma Client устарел (ошибки типов)

```powershell
npx prisma generate
# Перезапустить dev-сервер
Stop-Process -Name node -Force
npm run dev
```
