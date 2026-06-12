// db.js — PostgreSQL 接続（pg）。DATABASE_URL で接続する。
// テスト時は setBackend() で別の {query(text,params)->{rows}} に差し替え可能。
const fs = require("fs");
const path = require("path");

let backend = null;
function setBackend(b) { backend = b; }

function getBackend() {
  if (!backend) {
    const { Pool } = require("pg");
    backend = new Pool({
      connectionString: process.env.DATABASE_URL,
      // SSLが必要なホスト（外部URL等）では PGSSL=1 を設定
      ssl: process.env.PGSSL ? { rejectUnauthorized: false } : false,
    });
  }
  return backend;
}

// SQLは従来通り "?" で書く。実行時に "$1, $2, ..." へ変換（Postgres形式）
function toPg(sql) { let i = 0; return sql.replace(/\?/g, () => "$" + (++i)); }

async function query(sql, params = []) {
  return getBackend().query(toPg(sql), params);
}

// schema.sql でテーブル作成（CREATE TABLE IF NOT EXISTS なので冪等）
async function init() {
  const ddl = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  for (const stmt of ddl.split(";").map(s => s.trim()).filter(Boolean)) {
    await getBackend().query(stmt);
  }
}

module.exports = { query, init, setBackend };
