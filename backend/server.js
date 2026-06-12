// server.js — BLISS API + フロント配信（PostgreSQL / 非同期）
const express = require("express");
const path = require("path");
const { query, init } = require("./db");
const D = require("./seed-data");
const { computeTimeline } = require("./timeline");
const { nextActions } = require("./copilot");
const trouble = require("./trouble");
const ai = require("./ai");

const app = express();
app.use(express.json());

const PHASE_ORDER = D.PHASES.map(p => p[0]);
const today = () => { const d = new Date(); return `${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };

// ---- query helpers（? プレースホルダのまま書ける） ----
const q  = async (sql, ...p) => (await query(sql, p)).rows;
const q1 = async (sql, ...p) => (await query(sql, p)).rows[0];
const run = async (sql, ...p) => query(sql, p);
// 非同期ハンドラのエラーを500に
const h = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => {
  console.error(e); res.status(500).json({ error: String(e.message || e) });
});

async function epProgress(epId) {
  const r = await q1(`SELECT COUNT(*)::int total,
      COALESCE(SUM(CASE WHEN status='完了' THEN 1 ELSE 0 END),0)::int done
      FROM ep_task WHERE ep_id=?`, epId);
  return { done: r.done || 0, total: r.total || 0 };
}
const opLabel = op => op ? `${op.flag} ${op.country} / ${op.project}` : null;

async function epTaskStatus(epId) {
  const o = {};
  (await q("SELECT task_id, status FROM ep_task WHERE ep_id=?", epId)).forEach(r => o[r.task_id] = r.status);
  return o;
}
async function epToiStats(epId) {
  const r = await q1(`SELECT COUNT(*)::int total,
      COALESCE(SUM(CASE WHEN value<>'' THEN 1 ELSE 0 END),0)::int filled
      FROM ep_toi WHERE ep_id=?`, epId);
  return { total: r.total || 0, filled: r.filled || 0 };
}
const epDocsLite = epId => q(`SELECT d.name, COALESCE(x.status,'未提出') status, COALESCE(x.double_checked,0) double_checked
  FROM doc_template d LEFT JOIN ep_doc x ON x.doc_id=d.id AND x.ep_id=? ORDER BY d.seq`, epId);
const epAuditLite = epId => q(`SELECT a.indicator, a.pass, COALESCE(x.result,'未判定') result
  FROM audit_item a LEFT JOIN ep_audit x ON x.audit_id=a.id AND x.ep_id=? ORDER BY a.id`, epId);

// ---- bucket / phase 自動化ヘルパー ----
const bucketCompletedFor = (bucket, phase) =>
  PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(D.BUCKET_MILESTONE[bucket]);
const bucketIsCurrent = (bucket, phase) =>
  PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(D.BUCKET_MILESTONE[bucket]);

// 新規EPの子行（タスク/提出物/といちらん/資格審査）をフェーズから生成
async function initEpChildren(epId, phase) {
  const tpl = await q("SELECT id,bucket FROM op_template");
  for (const t of tpl) {
    const status = (bucketCompletedFor(t.bucket, phase) && !bucketIsCurrent(t.bucket, phase)) ? "完了" : "未";
    await run(`INSERT INTO ep_task(ep_id,task_id,status,done_at) VALUES(?,?,?,?)
               ON CONFLICT (ep_id,task_id) DO NOTHING`, epId, t.id, status, status === "完了" ? "—" : null);
  }
  for (const d of await q("SELECT id,phase FROM doc_template")) {
    let st = "未提出", dc = 0;
    if (bucketCompletedFor(d.phase, phase) && !bucketIsCurrent(d.phase, phase)) { st = "受領"; dc = 1; }
    await run(`INSERT INTO ep_doc(ep_id,doc_id,status,double_checked) VALUES(?,?,?,?)
               ON CONFLICT (ep_id,doc_id) DO NOTHING`, epId, d.id, st, dc);
  }
  for (const f of await q("SELECT key FROM toi_field"))
    await run(`INSERT INTO ep_toi(ep_id,field_key,value,double_checked) VALUES(?,?,?,?)
               ON CONFLICT (ep_id,field_key) DO NOTHING`, epId, f.key, "", 0);
  for (const a of await q("SELECT id FROM audit_item"))
    await run(`INSERT INTO ep_audit(ep_id,audit_id,result) VALUES(?,?,?)
               ON CONFLICT (ep_id,audit_id) DO NOTHING`, epId, a.id, "未判定");
}

// 次のEP ID（ep-001形式の最大+1）
async function nextEpId() {
  const rows = await q("SELECT id FROM eps WHERE id ~ '^ep-[0-9]+$'");
  let max = 0;
  rows.forEach(r => { const n = parseInt(r.id.slice(3), 10); if (n > max) max = n; });
  return "ep-" + String(max + 1).padStart(3, "0");
}

// フェーズ自動進行：bucketが順に全完了したら、到達マイルストーンまで前進（前進のみ）
async function autoAdvance(epId) {
  const e = await q1("SELECT phase FROM eps WHERE id=?", epId);
  if (!e) return null;
  const st = await epTaskStatus(epId);
  const tpl = await q("SELECT id,bucket FROM op_template");
  let reached = e.phase, prevAllDone = true;
  for (const [bid] of D.BUCKETS) {
    const tasks = tpl.filter(t => t.bucket === bid);
    const done = tasks.length > 0 && tasks.every(t => st[t.id] === "完了");
    if (prevAllDone && done) reached = D.BUCKET_MILESTONE[bid];
    else prevAllDone = false;
  }
  if (PHASE_ORDER.indexOf(reached) > PHASE_ORDER.indexOf(e.phase)) {
    await run("UPDATE eps SET phase=? WHERE id=?", reached, epId);
    return reached;
  }
  return e.phase;
}

// ---- meta ----
app.get("/api/meta", h(async (_req, res) => {
  res.json({ term: "26.27", lcs: await q("SELECT * FROM lcs ORDER BY code"),
    phases: D.PHASES, buckets: D.BUCKETS });
}));

// ---- dashboard ----
app.get("/api/dashboard", h(async (_req, res) => {
  const phaseCounts = {};
  (await q("SELECT phase, COUNT(*)::int c FROM eps GROUP BY phase")).forEach(r => phaseCounts[r.phase] = r.c);
  const nationalFunnel = [
    ["新歓説明会参加","",2425],["GV説明会参加","",791],["個別相談会(o2o)","",646],
    ["Sign Up","signup",302],["Raise","raise",13],["Apply","applied",0],
  ];
  res.json({
    kpis: { cvr: 32.4, leads: 4182, su: 302, raise: 13, ops: (await q1("SELECT COUNT(*)::int c FROM ops")).c, lcs: 24 },
    phaseCounts, nationalFunnel,
    lcRank: [["慶應","KO",41.2],["一橋","HI",39.8],["名古屋","NZ",37.1],["早稲田","WA",35.6],["京都","KT",34.0],["大阪","OS",31.5],["関学","KG",29.9]],
  });
}));

// ---- ops ----
app.get("/api/ops", h(async (_req, res) => res.json(await q("SELECT * FROM ops"))));

// ---- operation template ----
app.get("/api/operation-template", h(async (_req, res) => {
  res.json({ buckets: D.BUCKETS, tasks: await q("SELECT * FROM op_template ORDER BY seq") });
}));

// ---- eps list ----
app.get("/api/eps", h(async (_req, res) => {
  const rows = await q("SELECT * FROM eps ORDER BY id");
  const out = [];
  for (const e of rows) {
    const op = e.op_id ? await q1("SELECT * FROM ops WHERE id=?", e.op_id) : null;
    out.push({ ...e, opLabel: opLabel(op), progress: await epProgress(e.id) });
  }
  res.json(out);
}));

// ---- ep detail ----
app.get("/api/eps/:id", h(async (req, res) => {
  const e = await q1("SELECT * FROM eps WHERE id=?", req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  const op = e.op_id ? await q1("SELECT * FROM ops WHERE id=?", e.op_id) : null;

  const tasks = await q(`SELECT t.*, COALESCE(s.status,'未') status, s.done_at
     FROM op_template t LEFT JOIN ep_task s ON s.task_id=t.id AND s.ep_id=?
     ORDER BY t.seq`, e.id);
  const buckets = D.BUCKETS.map(([bid,label]) => ({
    id: bid, label, milestone: D.BUCKET_MILESTONE[bid],
    tasks: tasks.filter(t => t.bucket === bid),
  }));

  const docs = await q(`SELECT d.id,d.name,d.phase, COALESCE(x.status,'未提出') status, COALESCE(x.double_checked,0) double_checked
     FROM doc_template d LEFT JOIN ep_doc x ON x.doc_id=d.id AND x.ep_id=? ORDER BY d.seq`, e.id);

  const toi = await q(`SELECT f.key,f.section,f.label,f.source, COALESCE(x.value,'') value, COALESCE(x.double_checked,0) double_checked
     FROM toi_field f LEFT JOIN ep_toi x ON x.field_key=f.key AND x.ep_id=? ORDER BY f.seq`, e.id);
  const toiSections = [];
  toi.forEach(f => {
    let s = toiSections.find(x => x.section === f.section);
    if (!s) { s = { section: f.section, fields: [] }; toiSections.push(s); }
    s.fields.push(f);
  });

  const audit = await q(`SELECT a.*, COALESCE(x.result,'未判定') result
     FROM audit_item a LEFT JOIN ep_audit x ON x.audit_id=a.id AND x.ep_id=? ORDER BY a.id`, e.id);

  res.json({
    ...e, op, opLabel: opLabel(op), progress: await epProgress(e.id),
    buckets, docs, toiSections, audit,
    messages: await q("SELECT * FROM messages WHERE ep_id=? ORDER BY id", e.id),
    checkins: await q("SELECT * FROM checkins WHERE ep_id=? ORDER BY id", e.id),
  });
}));

// ---- mutations ----
app.patch("/api/eps/:id/tasks/:taskId", h(async (req, res) => {
  const { status } = req.body;
  await run(`INSERT INTO ep_task(ep_id,task_id,status,done_at) VALUES(?,?,?,?)
       ON CONFLICT (ep_id,task_id) DO UPDATE SET status=excluded.status, done_at=excluded.done_at`,
    req.params.id, req.params.taskId, status, status === "完了" ? today() : null);
  const phase = await autoAdvance(req.params.id);   // bucket全完了で自動進行
  res.json({ ok: true, phase });
}));

app.patch("/api/eps/:id/docs/:docId", h(async (req, res) => {
  const cur = await q1("SELECT * FROM ep_doc WHERE ep_id=? AND doc_id=?", req.params.id, req.params.docId) || {};
  const status = req.body.status ?? cur.status ?? "未提出";
  const dc = req.body.doubleChecked != null ? (req.body.doubleChecked ? 1 : 0) : (cur.double_checked ?? 0);
  await run(`INSERT INTO ep_doc(ep_id,doc_id,status,double_checked) VALUES(?,?,?,?)
       ON CONFLICT (ep_id,doc_id) DO UPDATE SET status=excluded.status, double_checked=excluded.double_checked`,
    req.params.id, req.params.docId, status, dc);
  res.json({ ok: true });
}));

app.patch("/api/eps/:id/toichiran/:key", h(async (req, res) => {
  const cur = await q1("SELECT * FROM ep_toi WHERE ep_id=? AND field_key=?", req.params.id, req.params.key) || {};
  const value = req.body.value ?? cur.value ?? "";
  const dc = req.body.doubleChecked != null ? (req.body.doubleChecked ? 1 : 0) : (cur.double_checked ?? 0);
  await run(`INSERT INTO ep_toi(ep_id,field_key,value,double_checked) VALUES(?,?,?,?)
       ON CONFLICT (ep_id,field_key) DO UPDATE SET value=excluded.value, double_checked=excluded.double_checked`,
    req.params.id, req.params.key, value, dc);
  res.json({ ok: true });
}));

app.patch("/api/eps/:id/audit/:auditId", h(async (req, res) => {
  await run(`INSERT INTO ep_audit(ep_id,audit_id,result) VALUES(?,?,?)
       ON CONFLICT (ep_id,audit_id) DO UPDATE SET result=excluded.result`,
    req.params.id, req.params.auditId, req.body.result);
  res.json({ ok: true });
}));

app.post("/api/eps/:id/advance", h(async (req, res) => {
  const e = await q1("SELECT * FROM eps WHERE id=?", req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  const i = PHASE_ORDER.indexOf(e.phase);
  if (i < PHASE_ORDER.length - 1) await run("UPDATE eps SET phase=? WHERE id=?", PHASE_ORDER[i + 1], e.id);
  res.json({ phase: (await q1("SELECT phase FROM eps WHERE id=?", e.id)).phase });
}));

app.post("/api/eps/:id/phase", h(async (req, res) => {
  await run("UPDATE eps SET phase=? WHERE id=?", req.body.phase, req.params.id);
  res.json({ ok: true });
}));

app.post("/api/eps/:id/match", h(async (req, res) => {
  const e = await q1("SELECT * FROM eps WHERE id=?", req.params.id);
  let phase = e.phase;
  if (PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf("accepted")) phase = "accepted";
  await run("UPDATE eps SET op_id=?, phase=? WHERE id=?", req.body.opId, phase, req.params.id);
  res.json({ ok: true });
}));

app.post("/api/eps/:id/messages", h(async (req, res) => {
  const sender = req.body.sender === "ep" ? "ep" : "me";
  const name = req.body.name || (sender === "ep"
    ? ((await q1("SELECT name FROM eps WHERE id=?", req.params.id))?.name || "EP")
    : "運営 太郎");
  await run("INSERT INTO messages(ep_id,sender,name,date,text) VALUES(?,?,?,?,?)",
    req.params.id, sender, name, today(), req.body.text);
  res.json({ ok: true });
}));

app.post("/api/eps/:id/checkins", h(async (req, res) => {
  const n = (await q1("SELECT COUNT(*)::int c FROM checkins WHERE ep_id=?", req.params.id)).c;
  await run("INSERT INTO checkins(ep_id,date,title,note) VALUES(?,?,?,?)",
    req.params.id, today(), `週次 #${n + 1}`, req.body.note);
  res.json({ ok: true });
}));

// ---- dates ----
app.post("/api/eps/:id/dates", h(async (req, res) => {
  const cur = await q1("SELECT departure_date, return_date FROM eps WHERE id=?", req.params.id) || {};
  const dep = req.body.departure ?? cur.departure_date ?? null;
  const ret = req.body.return ?? cur.return_date ?? null;
  await run("UPDATE eps SET departure_date=?, return_date=? WHERE id=?", dep, ret, req.params.id);
  res.json({ ok: true, departure: dep, return: ret });
}));

// ---- timeline ----
app.get("/api/eps/:id/timeline", h(async (req, res) => {
  const e = await q1("SELECT * FROM eps WHERE id=?", req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  res.json(computeTimeline(e, await epTaskStatus(e.id)));
}));

// ---- copilot: next actions ----
app.get("/api/eps/:id/next", h(async (req, res) => {
  const e = await q1("SELECT * FROM eps WHERE id=?", req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  res.json(nextActions(e, await epTaskStatus(e.id), await epToiStats(e.id), await epDocsLite(e.id), await epAuditLite(e.id)));
}));

// ---- trouble manual ----
app.get("/api/trouble", (_req, res) => res.json({
  ssi: trouble.SSI, principle: trouble.PRINCIPLE,
  situations: trouble.SITUATIONS, severity: trouble.SEVERITY,
  internal: trouble.INTERNAL, parents: trouble.PARENTS,
}));

// ---- AI copilot ----
app.get("/api/copilot/status", (_req, res) => res.json({ ai: ai.enabled(), model: ai.MODEL }));
app.post("/api/copilot", h(async (req, res) => {
  const { epId, question } = req.body;
  const e = epId ? await q1("SELECT * FROM eps WHERE id=?", epId) : null;
  const ctx = e ? {
    name: e.name, lc: e.lc, phase: e.phase, departure: e.departure_date, return: e.return_date,
    op: e.op_id ? await q1("SELECT country,project,org FROM ops WHERE id=?", e.op_id) : null,
    toi: await epToiStats(e.id),
    tasksDone: Object.values(await epTaskStatus(e.id)).filter(s => s === "完了").length,
  } : null;
  const rules = e ? nextActions(e, await epTaskStatus(e.id), await epToiStats(e.id), await epDocsLite(e.id), await epAuditLite(e.id)) : null;
  let aiText = null, aiError = null;
  if (ai.enabled() && question) {
    try { aiText = await ai.ask(question, ctx); }
    catch (err) { aiError = String(err.message || err); }
  }
  res.json({ ai: ai.enabled(), aiText, aiError, rules });
}));

// ---- EP CRUD ----
app.post("/api/eps", h(async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "name required" });
  const id = b.id || await nextEpId();
  const phase = b.phase || "signup";
  await run(`INSERT INTO eps(id,name,univ,lc,phase,op_id,de_tan,epm,applied,lk,departure_date,return_date)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, b.name, b.univ || null, b.lc || null, phase, b.op_id || null,
    b.de_tan || null, b.epm || null, b.applied || today(), b.lk || 3,
    b.departure_date || null, b.return_date || null);
  await initEpChildren(id, phase);
  res.json({ ok: true, id });
}));

app.patch("/api/eps/:id", h(async (req, res) => {
  const fields = ["name","univ","lc","de_tan","epm","phase","op_id","lk","departure_date","return_date"];
  const sets = [], vals = [];
  for (const f of fields) if (f in (req.body || {})) { sets.push(`${f}=?`); vals.push(req.body[f]); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await run(`UPDATE eps SET ${sets.join(",")} WHERE id=?`, ...vals);
  res.json({ ok: true });
}));

app.delete("/api/eps/:id", h(async (req, res) => {
  const id = req.params.id;
  for (const t of ["ep_audit","ep_toi","ep_doc","ep_task","messages","checkins"])
    await run(`DELETE FROM ${t} WHERE ep_id=?`, id);
  await run("DELETE FROM eps WHERE id=?", id);
  res.json({ ok: true });
}));

// ---- OP CRUD ----
app.post("/api/ops", h(async (req, res) => {
  const b = req.body || {};
  if (!b.country && !b.project) return res.status(400).json({ error: "country/project required" });
  const id = b.id || ("op-" + Date.now().toString(36));
  await run(`INSERT INTO ops(id,flag,country,project,org,slots,region,sdg,dl) VALUES(?,?,?,?,?,?,?,?,?)`,
    id, b.flag || "🌐", b.country || "", b.project || "", b.org || "", b.slots || 1, b.region || "asia", b.sdg || "", b.dl || "");
  res.json({ ok: true, id });
}));

app.delete("/api/ops/:id", h(async (req, res) => {
  await run("UPDATE eps SET op_id=NULL WHERE op_id=?", req.params.id);  // 参照を外す
  await run("DELETE FROM ops WHERE id=?", req.params.id);
  res.json({ ok: true });
}));

// ---- 今日やること（全EP横断キュー） ----
app.get("/api/today", h(async (_req, res) => {
  const eps = await q("SELECT * FROM eps ORDER BY id");
  const actions = [];
  for (const e of eps) {
    const r = nextActions(e, await epTaskStatus(e.id), await epToiStats(e.id), await epDocsLite(e.id), await epAuditLite(e.id));
    r.actions.filter(a => a.level === "urgent" || a.level === "soon")
      .forEach(a => actions.push({ epId: e.id, epName: e.name, lc: e.lc, level: a.level, text: a.text }));
  }
  const rank = { urgent: 0, soon: 1 };
  actions.sort((a, b) => (rank[a.level] ?? 9) - (rank[b.level] ?? 9));

  // ダブルチェック待ち（受領済/記入済だが未ダブチ）
  const doubleChecks = await q(`
    SELECT e.id "epId", e.name "epName", e.lc, 'doc' kind, d.name label, x.doc_id ref
    FROM ep_doc x JOIN eps e ON e.id=x.ep_id JOIN doc_template d ON d.id=x.doc_id
    WHERE x.status='受領' AND x.double_checked=0
    UNION ALL
    SELECT e.id, e.name, e.lc, 'toi', f.label, x.field_key
    FROM ep_toi x JOIN eps e ON e.id=x.ep_id JOIN toi_field f ON f.key=x.field_key
    WHERE x.value<>'' AND x.double_checked=0
    ORDER BY 2`);
  res.json({ actions, doubleChecks });
}));

// ---- static frontend ----
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "login.html")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "login.html")));

const PORT = process.env.PORT || 3000;

// 起動：テーブル作成 → 空なら自動シード → listen
(async () => {
  try {
    await init();
    const n = (await query("SELECT COUNT(*)::int c FROM eps")).rows[0].c;
    if (n === 0) {
      const { runSeed } = require("./seed");
      const r = await runSeed(false);
      console.log("DBが空だったので初期データを投入:", r.eps, "EPs");
    }
  } catch (e) { console.error("DB init/seed error:", e.message); }
  app.listen(PORT, () => console.log(`BLISS → http://localhost:${PORT}`));
})();
