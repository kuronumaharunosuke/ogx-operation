/* app.js — 共通シェル & ヘルパー（API版） */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};

const NAV = [
  ["dash","index.html","指標","<rect x='3' y='3' width='7' height='9'/><rect x='14' y='3' width='7' height='5'/><rect x='14' y='12' width='7' height='9'/><rect x='3' y='16' width='7' height='5'/>"],
  ["recruit","recruit.html","新歓","<path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'/>"],
  ["ep","eps.html","渡航","<path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z'/><path d='M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12'/>"],
  ["match","matching.html","適合","<path d='M16 3h5v5'/><path d='M8 21H3v-5'/><path d='M21 3l-7 7'/><path d='M3 21l7-7'/>"],
  ["op","ops.html","案件","<circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35'/>"],
  ["trouble","trouble.html","危機","<path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/><path d='M12 9v4M12 17h.01'/>"],
  ["c2c","c2c.html","交流","<path d='M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z'/>"],
];

let META = null;
async function mountShell({active, ribbon=true}){
  META = await API.meta();
  const lcMap = Object.fromEntries(META.lcs.map(l=>[l.code,l.name]));
  window.lcName = code => lcMap[code] || code;

  const app = $("#app");
  const spine = el("nav","spine"); spine.setAttribute("aria-label","レイヤー");
  spine.innerHTML = `<div class="spine-mark">BL<b>I</b>SS</div><div class="layers">${
    NAV.map(([id,href,jp,svg])=>`<a class="lyr ${id===active?"on":""}" href="${href}" aria-label="${jp}">
      <span class="ic"><svg viewBox="0 0 24 24">${svg}</svg></span><span class="jp">${jp}</span></a>`).join("")
  }</div><div class="spine-foot">IM · ${META.term.replace(".","")}</div>`;

  const main = el("div","main");
  main.innerHTML = `
    <header class="masthead">
      <div class="mh-l"><a class="wordmark" href="index.html">BL<i>I</i>SS</a>
        <div class="mh-sub">AIESEC Japan 統合プラットフォーム<span class="proto-tag">LIVE · SQLite</span></div></div>
      <div class="issue">
        <div>ISSUE <b>${META.term}</b> — 2627 fruits</div>
        <div>管轄 : <b>IM (ODTM)</b> / 運営 太郎</div>
        <div>oGV operation<span class="modebadge">管理者モード<a href="login.html">切替</a></span></div>
      </div>
    </header>
    ${ribbon?`<div class="mh-ribbon" id="ribbon"></div>`:""}
    <section class="view" id="view"></section>`;
  app.append(spine, main);
  return main.querySelector("#view");
}

const phaseChip = ph => { const [t,c]=PHASE_LABEL[ph]||["?","p-lead"]; return `<span class="phase ${c}">${t}</span>`; };
const lkBar = (n,warm)=>{let s='<span class="lk'+(warm?' warm':'')+'">';for(let i=0;i<5;i++)s+=`<i class="${i<n?'f':''}"></i>`;return s+'</span>';};

function toast(msg){
  let t=$(".toast"); if(!t){t=el("div","toast");document.body.appendChild(t);}
  t.textContent=msg; t.classList.add("on");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("on"),1800);
}
function animateBars(scope=document){
  scope.querySelectorAll(".bar-fill[data-w]").forEach((b,i)=>setTimeout(()=>b.style.width=b.dataset.w+"%",60+i*55));
}
