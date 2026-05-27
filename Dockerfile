# ──────────────────────────────────────────────────────────────────────────────
# Build stage: компиляция приложения
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json ./

# Устанавливаем все зависимости (включая dev для build)
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Строим приложение
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Production stage: минималистичный образ для запуска
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем собранные артефакты из build stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Создаем non-root пользователя
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Настраиваем права
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]