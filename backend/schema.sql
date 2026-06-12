-- BLISS schema (PostgreSQL)
-- 参照される側を先に作る（FK順）

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
  phase TEXT NOT NULL DEFAULT 'signup',
  op_id TEXT REFERENCES ops(id),
  de_tan TEXT,
  epm TEXT,
  applied TEXT,
  lk INTEGER DEFAULT 3,
  departure_date TEXT,
  return_date TEXT
);

CREATE TABLE IF NOT EXISTS op_template (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  seq INTEGER,
  title TEXT NOT NULL,
  note TEXT,
  res TEXT,
  sup TEXT,
  dead TEXT,
  dc INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ep_task (
  ep_id TEXT REFERENCES eps(id),
  task_id TEXT REFERENCES op_template(id),
  status TEXT DEFAULT '未',
  done_at TEXT,
  PRIMARY KEY (ep_id, task_id)
);

CREATE TABLE IF NOT EXISTS doc_template (
  id TEXT PRIMARY KEY,
  seq INTEGER,
  name TEXT NOT NULL,
  phase TEXT
);

CREATE TABLE IF NOT EXISTS ep_doc (
  ep_id TEXT REFERENCES eps(id),
  doc_id TEXT REFERENCES doc_template(id),
  status TEXT DEFAULT '未提出',
  double_checked INTEGER DEFAULT 0,
  PRIMARY KEY (ep_id, doc_id)
);

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
  result TEXT DEFAULT '未判定',
  PRIMARY KEY (ep_id, audit_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  ep_id TEXT REFERENCES eps(id),
  sender TEXT,
  name TEXT,
  date TEXT,
  text TEXT
);

CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  ep_id TEXT REFERENCES eps(id),
  date TEXT,
  title TEXT,
  note TEXT
);
