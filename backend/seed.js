// seed.js — DBへシード投入（--reset で全消去して再投入）
const db = require("./db");
const D = require("./seed-data");

const reset = process.argv.includes("--reset");
if (reset) {
  for (const t of ["ep_audit","ep_toi","ep_doc","ep_task","messages","checkins","eps","ops","op_template","doc_template","toi_field","audit_item","lcs"])
    db.exec(`DELETE FROM ${t};`);
}

const count = db.prepare("SELECT COUNT(*) c FROM eps").get().c;
if (count > 0 && !reset) { console.log("既にシード済み。--reset で再投入できます。"); process.exit(0); }

const tx = (fn) => { db.exec("BEGIN"); try { fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } };

const BUCKET_ORDER = D.BUCKETS.map(b => b[0]);
const PHASE_ORDER = D.PHASES.map(p => p[0]);

// bucket が「現在フェーズより前」なら完了扱いにする判定
function bucketCompletedFor(bucket, phase) {
  const ms = D.BUCKET_MILESTONE[bucket];               // bucketが到達するマイルストーン
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(ms) + 1
      || PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(ms);
}
function bucketIsCurrent(bucket, phase) {
  // 現在フェーズが含まれるbucket（おおまかに：そのbucketのマイルストーン手前）
  const ms = D.BUCKET_MILESTONE[bucket];
  return PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(ms);
}

tx(() => {
  const insLc = db.prepare("INSERT INTO lcs(code,name) VALUES(?,?)");
  D.LCS.forEach(r => insLc.run(...r));

  const insOp = db.prepare("INSERT INTO ops(id,flag,country,project,org,slots,region,sdg,dl) VALUES(?,?,?,?,?,?,?,?,?)");
  D.OPS.forEach(([id,flag,country,project,org,slots,region,sdg,dl]) =>
    insOp.run(id,flag,country,project,org,slots,region,sdg,dl));

  const insT = db.prepare("INSERT INTO op_template(id,bucket,seq,title,note,res,sup,dead,dc) VALUES(?,?,?,?,?,?,?,?,?)");
  D.OP_TEMPLATE.forEach(([id,bucket,title,note,res,sup,dead,dc],i) =>
    insT.run(id,bucket,i,title,note,res,sup,dead,dc));

  const insDoc = db.prepare("INSERT INTO doc_template(id,seq,name,phase) VALUES(?,?,?,?)");
  D.DOC_TEMPLATE.forEach(([id,name,phase],i) => insDoc.run(id,i,name,phase));

  const insToi = db.prepare("INSERT INTO toi_field(key,seq,section,label,source) VALUES(?,?,?,?,?)");
  D.TOI_FIELDS.forEach(([section,label,source],i) => insToi.run("toi"+i,i,section,label,source));

  const insAudit = db.prepare("INSERT INTO audit_item(id,area,indicator,measurement,pass,weight) VALUES(?,?,?,?,?,?)");
  D.AUDIT_ITEMS.forEach(([id,area,indicator,measurement,pass,weight]) =>
    insAudit.run(id,area,indicator,measurement,pass,weight));

  const insEp = db.prepare("INSERT INTO eps(id,name,univ,lc,phase,op_id,de_tan,epm,applied,lk,departure_date,return_date) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
  // フェーズに応じた出発日/帰国日（今日=2026-06-12 基準）
  const DATES = {
    "ep-005": ["2026-06-05","2026-07-20"],   // realized（渡航中）
    "ep-007": ["2026-07-15","2026-08-26"],   // approved
    "ep-009": ["2026-07-20","2026-08-31"],   // approved
    "ep-001": ["2026-08-01","2026-09-12"],   // accepted（仮）
    "ep-006": ["2026-08-05","2026-09-16"],   // accepted（仮）
  };
  const insEpTask = db.prepare("INSERT INTO ep_task(ep_id,task_id,status,done_at) VALUES(?,?,?,?)");
  const insEpDoc = db.prepare("INSERT INTO ep_doc(ep_id,doc_id,status,double_checked) VALUES(?,?,?,?)");
  const insEpToi = db.prepare("INSERT INTO ep_toi(ep_id,field_key,value,double_checked) VALUES(?,?,?,?)");
  const insEpAudit = db.prepare("INSERT INTO ep_audit(ep_id,audit_id,result) VALUES(?,?,?)");
  const tplRows = db.prepare("SELECT id,bucket FROM op_template").all();
  const toiRows = db.prepare("SELECT key FROM toi_field").all();
  const docRows = db.prepare("SELECT id,phase FROM doc_template").all();

  D.EPS.forEach(([id,name,univ,lc,phase,opId,deTan,epm,applied,lk]) => {
    const [dep, ret] = DATES[id] || [null, null];
    insEp.run(id,name,univ,lc,phase,opId,deTan,epm,applied,lk,dep,ret);

    // 各タスクの状態をフェーズから推定
    tplRows.forEach(({id:tid,bucket}) => {
      let status = "未";
      if (bucketCompletedFor(bucket,phase) && !bucketIsCurrent(bucket,phase)) status = "完了";
      else if (bucketIsCurrent(bucket,phase)) status = "未"; // 現bucketは未着手中心
      // 直近完了bucketのうち最後のbucketだけ「進行中」が混ざる演出
      insEpTask.run(id,tid,status, status==="完了"?"—":null);
    });

    // 書類状態
    docRows.forEach(({id:did,phase:dph}) => {
      let st = "未提出", dc = 0;
      if (bucketCompletedFor(dph,phase) && !bucketIsCurrent(dph,phase)) { st="受領"; dc=1; }
      insEpDoc.run(id,did,st,dc);
    });

    // といちらん（基本は空、提出済フェーズなら一部ダブルチェック済）
    toiRows.forEach(({key}) => insEpToi.run(id,key,"",
      PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("realized") ? 1 : 0));

    // 資格審査（既定は未判定、帰国後フェーズは合に）
    D.AUDIT_ITEMS.forEach(([aid]) => insEpAudit.run(id,aid,
      PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("finished") ? "合" : "未判定"));
  });

  const insMsg = db.prepare("INSERT INTO messages(ep_id,sender,name,date,text) VALUES(?,?,?,?,?)");
  D.MESSAGES.forEach(r => insMsg.run(...r));
  const insCi = db.prepare("INSERT INTO checkins(ep_id,date,title,note) VALUES(?,?,?,?)");
  D.CHECKINS.forEach(r => insCi.run(...r));
});

console.log("✅ seed 完了:",
  db.prepare("SELECT COUNT(*) c FROM eps").get().c, "EPs,",
  db.prepare("SELECT COUNT(*) c FROM op_template").get().c, "tasks,",
  db.prepare("SELECT COUNT(*) c FROM toi_field").get().c, "といちらん項目");
