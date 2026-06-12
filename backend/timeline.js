// timeline.js — 出発日・帰国日から全工程の期限を逆算する（運用管理シート/2APDの逆算ルール）
// anchor: "D"=出発日基準, "R"=帰国日基準。offset: 日数（マイナス=前, プラス=後）

// [taskId(対応する運用タスク or null), label, anchor, offset, note]
const MILESTONES = [
  ["t17", "参加申込承諾書 締結（≒SRB合格）", "D", -64, "渡航64日前"],
  ["t18", "SOS用 1万円振込・着金確認",       "D", -64, "渡航64日前"],
  ["t30", "AN署名（≒OP決定）",               "D", -47, "渡航47日前"],
  ["t36", "EXPA Approved 確認",              "D", -40, "渡航40日前"],
  ["t39", "フライト取得",                     "D", -35, "渡航35日前・往復"],
  ["t40", "フライト情報 提出・ダブルチェック", "D", -30, "必ず30日前まで"],
  [null,  "保険発行情報回収フォーム 提出",     "D", -28, "フライト提出後"],
  ["t45", "連絡手段（音声通話可SIM）確保",    "D", -14, "アフリカは早めに"],
  ["t46", "危機管理講習会 cert（10枚）UL",    "D", -12, "といちらん提出より前"],
  [null,  "現地LCへフライト情報を伝達",        "D", -20, "出国20日前まで"],
  ["t47", "といちらん 1回目（暫定版）提出",   "D", -10, "TL上のdead=10日前"],
  ["t48", "といちらん 2回目（完全版）提出",   "D", -5,  "TL上のdead=5日前"],
  ["t49", "たびレジ 登録",                    "D", -7,  ""],
  ["t51", "OPS（事前研修・Fruit）参加",       "D", -7,  ""],
  ["t50", "到着確認/トラブル対応グループ作成", "D", -5,  ""],
  [null,  "フライトカレンダー申請",            "D", -3,  ""],
  ["t52", "出国前日 MC連絡・PU確認",          "D", -1,  "前日"],
  ["t53", "ピックアップ写真UL・到着確認GSS",  "D", 0,   "渡航日・到着30分以内"],
  ["t54", "帰国報告（GSS）",                  "R", 0,   "帰国後1.5時間以内"],
  ["t55", "修了コンサル",                     "R", 7,   "帰国後7日以内"],
  ["t56", "修了届 締結",                      "R", 14,  "研修修了後14日以内"],
  ["t59", "Exchange Standards 回答",          "R", 30,  "帰国後1か月以内"],
];

// 固定オフセットがない（早めに、の）タスク
const FLOATING = [
  ["t41", "予防接種", "医師と相談し早めに。必須予防接種は必ず"],
  ["t42", "VISA取得", "公式案内より時間がかかる前提で早めに。レコメ要否を確認"],
];

function parse(d){ if(!d) return null; const [y,m,day]=d.split("-").map(Number); return new Date(Date.UTC(y,m-1,day)); }
function fmt(dt){ return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`; }
function addDays(dt,n){ const x=new Date(dt); x.setUTCDate(x.getUTCDate()+n); return x; }
function todayUTC(){ const n=new Date(); return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())); }
function diffDays(a,b){ return Math.round((a-b)/86400000); }

// ep: {departure_date, return_date}, taskStatus: {taskId: '未'|'進行中'|'完了'}
function computeTimeline(ep, taskStatus = {}) {
  const D = parse(ep.departure_date), R = parse(ep.return_date), T = todayUTC();
  const rows = MILESTONES.map(([taskId, label, anchor, offset, note]) => {
    const base = anchor === "D" ? D : R;
    const date = base ? addDays(base, offset) : null;
    const status = taskId ? (taskStatus[taskId] || "未") : "—";
    let state = "scheduled";
    if (date) {
      const dd = diffDays(date, T);
      if (status === "完了") state = "done";
      else if (dd < 0) state = "overdue";
      else if (dd <= 7) state = "soon";
      else state = "upcoming";
    } else state = "nodate";
    return {
      taskId, label, anchor, offset, note,
      date: date ? fmt(date) : null,
      daysFromToday: date ? diffDays(date, T) : null,
      status, state,
    };
  });
  const floating = FLOATING.map(([taskId, label, note]) => ({
    taskId, label, note, floating: true, status: taskStatus[taskId] || "未",
  }));
  return {
    departure: ep.departure_date || null,
    return: ep.return_date || null,
    today: fmt(T),
    milestones: rows.sort((a,b) => (a.date||"9999").localeCompare(b.date||"9999")),
    floating,
  };
}

// ---- 研修日程ベースの変換 ----
// 研修初日〜研修最終日 = 42日間（研修最終日 = 研修初日+41）
// 出発日 = 研修初日-2 / 帰国日 = 研修最終日+1（= 研修初日+42）
const TRAINING_DAYS = 42;

function trainingToTravel(startStr) {
  const S = parse(startStr); if (!S) return null;
  const end = addDays(S, TRAINING_DAYS - 1);
  return { start: fmt(S), end: fmt(end), departure: fmt(addDays(S, -2)), return: fmt(addDays(end, 1)) };
}
// 出発日 から研修日程を逆算（出発日 = 研修初日-2 の前提）
function trainingFromDeparture(depStr) {
  const d = parse(depStr); if (!d) return null;
  const S = addDays(d, 2);
  return { start: fmt(S), end: fmt(addDays(S, TRAINING_DAYS - 1)) };
}
// 備考の自動文面
function travelNote(depStr, retStr) {
  const t = trainingFromDeparture(depStr); if (!t) return null;
  return `研修 ${t.start}〜${t.end}（${TRAINING_DAYS}日間）｜出発 ${depStr}・帰国 ${retStr || ""}`.trim();
}

module.exports = { computeTimeline, MILESTONES, FLOATING, parse, fmt, addDays, todayUTC, diffDays,
  TRAINING_DAYS, trainingToTravel, trainingFromDeparture, travelNote };
