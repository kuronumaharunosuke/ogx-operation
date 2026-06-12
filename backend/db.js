// db.js — SQLite (Node 内蔵) 接続とスキーマ定義
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "bliss.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS lcs (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ops (
  id TEXT PRIMARY KEY,
  flag TEXT, country TEXT, project TEXT, org TEXT,
  slots INTEGER, region TEXT, dl TEXT, sdg TEXT
);

CREATE TABLE IF NOT EXISTS eps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  univ TEXT,
  lc TEXT REFERENCES lcs(code),
  phase TEXT NOT NULL DEFAULT 'signup',   -- signup/raise/applied/accepted/approved/realized/finished/completed
  op_id TEXT REFERENCES ops(id),
  de_tan TEXT,        -- De担（送り出しオペレーション担当）
  epm TEXT,           -- EP Manager
  applied TEXT,
  lk INTEGER DEFAULT 3,
  departure_date TEXT,   -- 出発日 YYYY-MM-DD（タイムライン逆算の起点）
  return_date TEXT       -- 帰国日 YYYY-MM-DD
);

-- 運用タスクの「マスターテンプレート」: 運用管理シートを構造化したもの
CREATE TABLE IF NOT EXISTS op_template (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,    -- su_raise / raise_accept / accept_approve / approve_realize / fin
  seq INTEGER,
  title TEXT NOT NULL,
  note TEXT,
  res TEXT,                -- 主担当ロール
  sup TEXT,                -- サポートロール
  dead TEXT,               -- 目安期限
  dc INTEGER DEFAULT 0     -- ダブルチェック対象なら1
);

-- EPごとの各タスク進捗
CREATE TABLE IF NOT EXISTS ep_task (
  ep_id TEXT REFERENCES eps(id),
  task_id TEXT REFERENCES op_template(id),
  status TEXT DEFAULT '未',   -- 未 / 進行中 / 完了
  done_at TEXT,
  PRIMARY KEY (ep_id, task_id)
);

-- 提出物（ダブルチェック対象書類）マスター
CREATE TABLE IF NOT EXISTS doc_template (
  id TEXT PRIMARY KEY,
  seq INTEGER,
  name TEXT NOT NULL,
  phase TEXT
);

CREATE TABLE IF NOT EXISTS ep_doc (
  ep_id TEXT REFERENCES eps(id),
  doc_id TEXT REFERENCES doc_template(id),
  status TEXT DEFAULT '未提出',     -- 未提出 / 確認中 / 受領
  double_checked INTEGER DEFAULT 0,
  PRIMARY KEY (ep_id, doc_id)
);

-- 渡航先情報収集一覧（といちらん）項目マスター
CREATE TABLE IF NOT EXISTS toi_field (
  key TEXT PRIMARY KEY,
  seq INTEGER,
  section TEXT,
  label TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS ep_toi (
  ep_id TEXT REFERENCES eps(id),
  field_key TEXT REFERENCES toi_field(key),
  value TEXT DEFAULT '',
  double_checked INTEGER DEFAULT 0,
  PRIMARY KEY (ep_id, field_key)
);

-- 資格審査項目（PHI / Healthier・Safety）
CREATE TABLE IF NOT EXISTS audit_item (
  id TEXT PRIMARY KEY,
  area TEXT,
  indicator TEXT,
  measurement TEXT,
  pass TEXT,
  weight TEXT
);

CREATE TABLE IF NOT EXISTS ep_audit (
  ep_id TEXT REFERENCES eps(id),
  audit_id TEXT REFERENCES audit_item(id),
  result TEXT DEFAULT '未判定',   -- 合 / 否 / 未判定 / 対象外
  PRIMARY KEY (ep_id, audit_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ep_id TEXT REFERENCES eps(id),
  sender TEXT,   -- me / mentor / ep / host
  name TEXT,
  date TEXT,
  text TEXT
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ep_id TEXT REFERENCES eps(id),
  date TEXT,
  title TEXT,
  note TEXT
);
`);

module.exports = db;
