/* api.js — バックエンド(/api)との通信レイヤ */
async function jget(u){ const r = await fetch(u); if(!r.ok) throw new Error(u+" "+r.status); return r.json(); }
async function jsend(u, method, body){
  const r = await fetch(u, { method, headers:{"Content-Type":"application/json"}, body: body?JSON.stringify(body):undefined });
  return r.json();
}

const API = {
  _meta:null,
  async meta(){ return this._meta ??= await jget("/api/meta"); },
  dashboard(){ return jget("/api/dashboard"); },
  eps(){ return jget("/api/eps"); },
  ep(id){ return jget("/api/eps/"+id); },
  ops(){ return jget("/api/ops"); },
  template(){ return jget("/api/operation-template"); },
  setTask(id,taskId,status){ return jsend(`/api/eps/${id}/tasks/${taskId}`,"PATCH",{status}); },
  setDoc(id,docId,patch){ return jsend(`/api/eps/${id}/docs/${docId}`,"PATCH",patch); },
  setToi(id,key,patch){ return jsend(`/api/eps/${id}/toichiran/${key}`,"PATCH",patch); },
  advance(id){ return jsend(`/api/eps/${id}/advance`,"POST"); },
  setPhase(id,phase){ return jsend(`/api/eps/${id}/phase`,"POST",{phase}); },
  match(id,opId){ return jsend(`/api/eps/${id}/match`,"POST",{opId}); },
  setAudit(id,auditId,result){ return jsend(`/api/eps/${id}/audit/${auditId}`,"PATCH",{result}); },
  addMessage(id,text,sender,name){ return jsend(`/api/eps/${id}/messages`,"POST",{text,sender,name}); },
  addCheckin(id,note){ return jsend(`/api/eps/${id}/checkins`,"POST",{note}); },
  // timeline & copilot
  timeline(id){ return jget(`/api/eps/${id}/timeline`); },
  setDates(id,departure,ret){ return jsend(`/api/eps/${id}/dates`,"POST",{departure,return:ret}); },
  next(id){ return jget(`/api/eps/${id}/next`); },
  trouble(){ return jget(`/api/trouble`); },
  copilotStatus(){ return jget(`/api/copilot/status`); },
  copilot(epId,question){ return jsend(`/api/copilot`,"POST",{epId,question}); },
};

/* phase / lifecycle 定数（バックエンドと一致） */
const PHASE_LABEL = {
  signup:["Sign Up","p-lead"], raise:["Raise","p-info"], applied:["Apply","p-apply"],
  accepted:["Accept","p-interview"], approved:["Approve","p-prep"],
  realized:["Realize","p-abroad"], finished:["Finish","p-back"], completed:["Complete","p-match"],
};
const LIFECYCLE = ["signup","raise","applied","accepted","approved","realized","finished","completed"];
const PHASE_JP = { signup:"Sign Up", raise:"Raise", applied:"Apply", accepted:"Accept",
  approved:"Approve", realized:"Realize", finished:"Finish", completed:"Complete" };
