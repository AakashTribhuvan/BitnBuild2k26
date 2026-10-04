FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM grafana/k6:latest AS k6

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=k6 /usr/bin/k6 /usr/local/bin/k6
COPY load ./load

EXPOSE 4000

CMD ["sh", "-c", "node dist/db/migrations.js && node dist/db/seed.js && node dist/index.js"]
