# BLISS — AIESEC Japan oGV 統合プラットフォーム

Node + Express + **PostgreSQL** のフルスタックアプリ。oGV 渡航オペレーション（運用60工程・提出物ダブルチェック・
といちらん・資格審査PHI・タイムライン逆算・Copilot・危機対応）を、管理者画面とEPポータルの2系統で回す。

## 構成

```
BLISS-app/
├── Dockerfile / .dockerignore   どこでも同じに動くコンテナ
├── .env.example                 接続情報のひな形（DATABASE_URL 等）
├── backend/                     Node + Express + pg
│   ├── server.js                REST API + フロント配信（非同期）
│   ├── db.js                    PostgreSQL 接続（DATABASE_URL）
│   ├── schema.sql               テーブル定義（DDL）
│   ├── seed-data.js             運用資料から起こしたシード
│   ├── seed.js                  DBへ投入（CLI / 起動時自動）
│   ├── timeline.js              出発・帰国日からの逆算
│   ├── copilot.js               属人化を防ぐルールエンジン
│   ├── trouble.js               危機対応マニュアル
│   └── ai.js                    任意のLLM層（ANTHROPIC_API_KEY）
└── frontend/                    素のHTML/CSS/JS（ビルド不要）
    ├── login.html               入口（管理者 / EP 選択）
    ├── index/eps/ep/matching/ops/trouble/c2c.html
    ├── me.html                  EPポータル
    └── api.js / app.js / styles.css
```

## 管理者 / ユーザーの2系統

入口は `login.html`（`/`）。**管理者（MC/De担/EPM）** か **EP（渡航者）** を選ぶ。
EPポータル `me.html?id=ep-XXX` は自分のタスク/提出物/といちらん/予定/連絡。
提出物・といちらんの**ダブルチェックは両画面から**同じAPIで更新できる。

## 動かし方（ローカル）

PostgreSQL が必要。手元にDBが無ければ Railway/Neon/Supabase 等の無料Postgresの接続URLでもOK。

```bash
cd backend
npm install
export DATABASE_URL="postgres://USER:PASS@HOST:5432/DBNAME"   # 自分のPostgres
npm start          # 起動時にテーブル作成＋空なら自動シード → http://localhost:3000
```

- 手動でシードし直す：`npm run seed`（全消し＋再投入）
- SSLが要る外部URLなら `export PGSSL=1`
- スキーマだけ流したい：`psql "$DATABASE_URL" -f schema.sql`

## デプロイ（Railway）

1. railway.app → **New Project → Deploy from GitHub repo** → `ogx-operation`（Dockerfile自動検出）
2. 同じプロジェクトに **＋ New → Database → PostgreSQL** を追加
3. アプリのサービス → **Variables** → `DATABASE_URL` を、Postgresサービスの参照変数にする
   （Railwayの「Reference」で `${{Postgres.DATABASE_URL}}` を選ぶ／内部URLを貼る）
4. 再デプロイ → アプリ起動時にテーブル作成＋シードが走る
5. サービス → **Settings → Networking → Generate Domain** で公開URL

> 起動時に `schema.sql` で `CREATE TABLE IF NOT EXISTS`（冪等）→ EPが0件なら自動シード。
> データはPostgresに永続。多人数同時アクセスOK。

## API（主なもの）

```
GET   /api/meta /api/dashboard /api/ops /api/operation-template
GET   /api/eps  /api/eps/:id
PATCH /api/eps/:id/tasks/:taskId | /docs/:docId | /toichiran/:key | /audit/:auditId
POST  /api/eps/:id/advance | /phase | /match | /messages | /checkins | /dates
GET   /api/eps/:id/timeline | /next
GET   /api/trouble  /api/copilot/status   POST /api/copilot
```

## 次の一手（B：本番強化）

- **認証**：ログインを @aiesec.jp 限定に（Google OAuth など）。EPは自分のレコードのみ、といちらん（個人情報）は担当者のみ、の行レベル制御。
- バックアップ運用、監査ログ、Slack連携 など。

DBは既に本物のPostgreSQLなので、ここからは認証と権限が中心。
