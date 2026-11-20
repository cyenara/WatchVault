FROM node:24-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

RUN npm ci --prefix backend --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "backend/server.js"]
