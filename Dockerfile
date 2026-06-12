# BLISS — Node + Express + PostgreSQL(pg)
FROM node:22-slim
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend ./backend
COPY frontend ./frontend

ENV PORT=3000
EXPOSE 3000

# 起動時：DATABASE_URL に接続 → テーブル作成 → 空なら自動シード
CMD ["node", "backend/server.js"]
