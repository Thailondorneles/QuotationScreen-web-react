FROM docker.io/library/node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY services ./services

EXPOSE 3001

CMD ["node", "server.js"]
