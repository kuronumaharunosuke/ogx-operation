// seed.js — DBへシード投入（PostgreSQL）。CLI でも server.js の自動シードでも使える。
const db = require("./db");
const D = require("./seed-data");

const PHASE_ORDER = D.PHASES.map(p => p[0]);
const bucketCompletedFor = (bucket, phase) =>
  PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(D.BUCKET_MILESTONE[bucket]);
const bucketIsCurrent = (bucket, phase) =>
  PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(D.BUCKET_MILESTONE[bucket]);

async function runSeed(reset = false) {
  if (reset) {
    for (const t of ["ep_audit","ep_toi","ep_doc","ep_task","messages","checkins","eps","ops","op_template","doc_template","toi_field","audit_item","lcs"])
      await db.query(`DELETE FROM ${t}`);
  }
  const cnt = (await db.query("SELECT COUNT(*)::int c FROM eps")).rows[0].c;
  if (cnt > 0 && !reset) return { skipped: true };

  for (const r of D.LCS) await db.query("INSERT INTO lcs(code,name) VALUES(?,?)", r);

  for (const [id,flag,country,project,org,slots,region,sdg,dl] of D.OPS)
    await db.query("INSERT INTO ops(id,flag,country,project,org,slots,region,sdg,dl) VALUES(?,?,?,?,?,?,?,?,?)",
      [id,flag,country,project,org,slots,region,sdg,dl]);

  for (let i=0;i<D.OP_TEMPLATE.length;i++){
    const [id,bucket,title,note,res,sup,dead,dc] = D.OP_TEMPLATE[i];
    await db.query("INSERT INTO op_template(id,bucket,seq,title,note,res,sup,dead,dc) VALUES(?,?,?,?,?,?,?,?,?)",
      [id,bucket,i,title,note,res,sup,dead,dc]);
  }

  for (let i=0;i<D.DOC_TEMPLATE.length;i++){
    const [id,name,phase] = D.DOC_TEMPLATE[i];
    await db.query("INSERT INTO doc_template(id,seq,name,phase) VALUES(?,?,?,?)", [id,i,name,phase]);
  }

  for (let i=0;i<D.TOI_FIELDS.length;i++){
    const [section,label,source] = D.TOI_FIELDS[i];
    await db.query("INSERT INTO toi_field(key,seq,section,label,source) VALUES(?,?,?,?,?)", ["toi"+i,i,section,label,source]);
  }

  for (const [id,area,indicator,measurement,pass,weight] of D.AUDIT_ITEMS)
    await db.query("INSERT INTO audit_item(id,area,indicator,measurement,pass,weight) VALUES(?,?,?,?,?,?)",
      [id,area,indicator,measurement,pass,weight]);

  const DATES = {
    "ep-005": ["2026-06-05","2026-07-20"],
    "ep-007": ["2026-07-15","2026-08-26"],
    "ep-009": ["2026-07-20","2026-08-31"],
    "ep-001": ["2026-08-01","2026-09-12"],
    "ep-006": ["2026-08-05","2026-09-16"],
  };
  const tplRows = (await db.query("SELECT id,bucket FROM op_template")).rows;
  const toiRows = (await db.query("SELECT key FROM toi_field")).rows;
  const docRows = (await db.query("SELECT id,phase FROM doc_template")).rows;

  for (const [id,name,univ,lc,phase,opId,deTan,epm,applied,lk] of D.EPS) {
    const [dep, ret] = DATES[id] || [null, null];
    await db.query("INSERT INTO eps(id,name,univ,lc,phase,op_id,de_tan,epm,applied,lk,departure_date,return_date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [id,name,univ,lc,phase,opId,deTan,epm,applied,lk,dep,ret]);

    for (const {id:tid,bucket} of tplRows) {
      const status = (bucketCompletedFor(bucket,phase) && !bucketIsCurrent(bucket,phase)) ? "完了" : "未";
      await db.query("INSERT INTO ep_task(ep_id,task_id,status,done_at) VALUES(?,?,?,?)",
        [id,tid,status, status==="完了"?"—":null]);
    }
    for (const {id:did,phase:dph} of docRows) {
      let st="未提出", dc=0;
      if (bucketCompletedFor(dph,phase) && !bucketIsCurrent(dph,phase)) { st="受領"; dc=1; }
      await db.query("INSERT INTO ep_doc(ep_id,doc_id,status,double_checked) VALUES(?,?,?,?)", [id,did,st,dc]);
    }
    for (const {key} of toiRows)
      await db.query("INSERT INTO ep_toi(ep_id,field_key,value,double_checked) VALUES(?,?,?,?)",
        [id,key,"", PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("realized") ? 1 : 0]);
    for (const [aid] of D.AUDIT_ITEMS)
      await db.query("INSERT INTO ep_audit(ep_id,audit_id,result) VALUES(?,?,?)",
        [id,aid, PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("finished") ? "合" : "未判定"]);
  }

  for (const r of D.MESSAGES)
    await db.query("INSERT INTO messages(ep_id,sender,name,date,text) VALUES(?,?,?,?,?)", r);
  for (const r of D.CHECKINS)
    await db.query("INSERT INTO checkins(ep_id,date,title,note) VALUES(?,?,?,?)", r);

  return {
    eps: (await db.query("SELECT COUNT(*)::int c FROM eps")).rows[0].c,
    tasks: (await db.query("SELECT COUNT(*)::int c FROM op_template")).rows[0].c,
    toi: (await db.query("SELECT COUNT(*)::int c FROM toi_field")).rows[0].c,
  };
}

module.exports = { runSeed };

if (require.main === module) {
  (async () => {
    await db.init();
    const r = await runSeed(process.argv.includes("--reset"));
    if (r.skipped) console.log("既にシード済み。--reset で再投入できます。");
    else console.log("✅ seed 完了:", r.eps, "EPs,", r.tasks, "tasks,", r.toi, "といちらん項目");
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
