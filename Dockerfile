FROM node:22-alpine

WORKDIR /app

COPY .output .

EXPOSE 3000
ENV HOST 0.0.0.0

CMD ["pnpm", "start"]