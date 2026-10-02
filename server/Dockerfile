FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --no-audit

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
