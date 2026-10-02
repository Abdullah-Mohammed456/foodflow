FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run prisma:generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
