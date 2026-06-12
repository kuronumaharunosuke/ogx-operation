# BLISS — Node 22 + Express + 内蔵SQLite を一括で動かすコンテナ
FROM node:22-slim
WORKDIR /app

# 依存だけ先に入れてキャッシュを効かせる
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# アプリ本体
COPY backend ./backend
COPY frontend ./frontend

# データは /data に置く（ホスティングのボリュームをここにマウントすると永続化）
ENV DB_PATH=/data/bliss.db
ENV PORT=3000
EXPOSE 3000

# 初回起動時、DBが空なら server.js が自動でシード投入する
CMD ["node", "--experimental-sqlite", "backend/server.js"]
