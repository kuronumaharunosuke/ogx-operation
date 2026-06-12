# BLISS — AIESEC Japan 統合プラットフォーム（DB付きフルスタック版）

2627fruit の **oGV 渡航オペレーション**を、実データベース付きで回せるアプリ。
運用管理シート（SU〜Raise〜Accepted〜Approved〜Realize〜Fin の全 60 工程）、提出物ダブルチェック、
渡航先情報収集一覧（といちらん）、資格審査項目（PHI）を、EP 単位で DB に載せています。

## 構成

```
BLISS-app/
├── backend/                Node + Express + SQLite（Node内蔵 node:sqlite）
│   ├── server.js           REST API + フロント配信
│   ├── db.js               スキーマ定義
│   ├── seed-data.js        運用資料から起こしたシード（LC/OP/60工程/といちらん/資格審査）
│   ├── seed.js             DBへ投入（node --experimental-sqlite seed.js --reset）
│   └── bliss.db            起動時に生成される SQLite ファイル
└── frontend/               素のHTML/CSS/JS（ビルド不要）
    ├── login.html          入口（役割選択：管理者 / EP）
    ├── index.html          管理者ダッシュボード
    ├── eps.html            渡航者一覧（8フェーズ）
    ├── ep.html             ★渡航オペレーション本体（運用シート/予定逆算/Copilot/提出物/といちらん/連絡/資格審査）
    ├── me.html             ★EPポータル（マイタスク/提出物/といちらん/予定/連絡）
    ├── matching.html       マッチング
    ├── ops.html            OP検索
    ├── trouble.html        危機対応 triage
    ├── c2c.html            体験フィード
    ├── api.js / app.js     API接続層・共通シェル
    └── styles.css          デザインシステム
```

## 管理者 / ユーザーの2系統

入口は `login.html`（`/`）。**管理者（MC / De担 / EPM）** か **EP（渡航者）** を選びます。
- 管理者 → `index.html` 以下のコンソール（全EPの運用・マッチング・Copilot・資格審査）。
- EP → `me.html?id=ep-XXX` の自分専用ポータル（マイタスク=Res:EPのタスク／提出物／といちらん記入／予定／連絡）。
- 管理者のEP詳細から「ユーザー画面で開く ↗」で対応ポータルへ。

**ダブルチェックは両画面から操作可能**。提出物・といちらんのダブチは管理者・EPポータルどちらからでも
同じAPI（`PATCH /api/eps/:id/docs/:docId`・`/toichiran/:key`）で更新され、状態は即共有されます。

> 認証は簡易（役割選択のみ）。本番は Firebase Auth を @aiesec.jp 限定にし、EPは自分のレコードのみ、
> といちらん（個人情報）は担当者のみ、の行レベル制御を入れること。

## 動かし方

```bash
cd backend
npm install            # express だけ（SQLiteはNode内蔵を使用）
npm run seed           # 初回のみ：DB作成＋シード投入
npm start              # → http://localhost:3000
```

ブラウザで **http://localhost:3000** を開く。サーバが API もフロントも配信します。
（Node 22 内蔵の SQLite を使うため、起動スクリプトに `--experimental-sqlite` を付けています）

データをリセットしたいとき：`npm run seed` をもう一度。

## データモデル（uploadした資料の対応）

| テーブル | 由来した資料 |
|---|---|
| `op_template`（60工程） | HIOGX Operation管理シート 原本 |
| `doc_template` / `ep_doc` | 提出物チェックシート・ダブルチェックタイミング |
| `toi_field` / `ep_toi`（28項目） | 渡航先情報収集一覧（といちらん）EP to do・Questions to LC |
| `audit_item` / `ep_audit` | 2603春国以降 資格審査項目（PHI oGV） |
| `eps` / `ops` | 希望渡航先フォーム（oGV Tracker）の EY×PJT |

## API（主なもの）

```
GET   /api/meta                       term / LC / phase / bucket
GET   /api/dashboard                  KPI・ファネル
GET   /api/eps                        渡航者一覧
GET   /api/eps/:id                    EP詳細（運用60工程/提出物/といちらん/資格審査/連絡）
PATCH /api/eps/:id/tasks/:taskId      タスク状態（未/進行中/完了）
PATCH /api/eps/:id/docs/:docId        提出物の状態・ダブルチェック
PATCH /api/eps/:id/toichiran/:key     といちらん項目の値・ダブルチェック
PATCH /api/eps/:id/audit/:auditId     資格審査の判定
POST  /api/eps/:id/advance|phase|match|messages|checkins
GET   /api/ops  /  /api/operation-template
```

## タイムライン自動計算（逆算）

出発日・帰国日を入れると、全工程の期限を逆算します（運用シート / 2APD の逆算ルール）。
EP詳細 →「予定(逆算)」タブで日付を入れて「逆算する」。

主な逆算（D=出発日, R=帰国日）：承諾書・1万円振込 `D-64` / AN署名 `D-47` / approved `D-40` /
フライト取得 `D-35` / フライト情報提出 `D-30` / 現地LCへ通知 `D-20` / といちらん1回目 `D-10` /
といちらん2回目 `D-5` / 出国前日連絡 `D-1` / 到着確認 `D0` / 帰国報告 `R0` / 修了コンサル `R+7` /
修了届 `R+14` / Exchange Standards `R+30`。期限超過・まもなく を自動で色分け表示。

## Copilot（属人化を防ぐ）

EP詳細 →「Copilot」タブ。`backend/copilot.js` のルールエンジンが、EPの状態（フェーズ・タスク・
逆算した期限・といちらん充足・提出物ダブチ・資格審査）から **「次にやること」** と **定型文面のドラフト**
（MCL提出→振込メール、フライト精査依頼、といちらんリマインド 等、実運用のSlack文面ベース）を自動生成します。
これは **AIキー無しでも常に動く**のが肝で、属人化対策の本体です。

### AI応答を有効化（任意）

自然言語の質問に答えさせたい場合は、サーバ起動前に環境変数を設定：

```bash
export ANTHROPIC_API_KEY=sk-ant-...        # 自分のキー（リポジトリに直書きしない）
export ANTHROPIC_MODEL=claude-sonnet-4-6   # 任意
npm start
```

未設定でもルールエンジンの「次にやること」は常に表示されます（AIはあくまで上乗せ）。

## 危機対応（トラブルマニュアルの triage）

`trouble.html` ＝ 2024年度 海外危機管理マニュアルを構造化。状況別フロー（体調不良 / 自然災害・政変 /
内部トラブル）、重大度ケース①〜④の報告先、内部トラブルの型（宿泊先 / VISA / その他・APIP交渉）、
保護者対応、SSI安全サポートデスク `+81-3-6550-9939` をその場で開けます。
原則：報告はトラブル発生フォーム（Slackは報告と見做さない）／初期対応は同時並行。



## 次の一手：Firebase / コードベース版へ

データ層は `db.js`（スキーマ）と `server.js`（API）に閉じています。

- **本番化**：SQLite → Firestore（または Cloud SQL）に差し替え。`server.js` の各ルートを Firestore 呼び出しに。
- **認証**：Firebase Auth を @aiesec.jp 限定に。といちらん（個人情報）は閲覧権限を絞る運用に対応させる。
- **セキュリティ**：API キー・接続情報は環境変数（`.env`）に。リポジトリには絶対に直書きしない。

⚠️ といちらん／根拠集は EP の重要な個人情報。本番では行レベルのアクセス制御（担当 De担・EPM・MC のみ）を入れること。
