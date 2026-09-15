FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci

COPY server ./server
COPY web ./web
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/web/dist ./web/dist

EXPOSE 8787
CMD ["npm", "run", "start", "--workspace", "server"]
