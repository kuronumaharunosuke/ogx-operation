// copilot.js — 属人化を防ぐルールエンジン。EPの状態から「次にやること」と定型文面を自動生成。
const { computeTimeline } = require("./timeline");

const PHASE_ORDER = ["signup","raise","applied","accepted","approved","realized","finished","completed"];

// ---- 定型メッセージ（実運用のSlack文面を雛形化）----
const TEMPLATES = {
  haraiKakunin: (ep) => ({
    title: `${ep.name}/MCL提出確認＆振込メール送信のお願い`,
    body: `@MC お疲れ様です。\n${ep.name}（${ep.lc}）がMCLを提出いたしましたので、確認及び10万円の振込依頼メールの送信をお願いいたします。\nお忙しいところ恐れ入りますが、お早めにご対応いただけますと幸いです。よろしくお願いいたします🙏`,
  }),
  chakkin: (ep) => ({
    title: `${ep.name}/着金確認のお願い`,
    body: `@MCF お疲れ様です。\n${ep.name}が参加費を振込済みです。#ogx_lc_着金確認依頼 のワークフローより着金確認をお願いいたします。\n（土日入金等の場合は振込明細のアップロードをもって着金確認とさせてください）`,
  }),
  approvedByHome: (ep) => ({
    title: `${ep.name}/approved by home 操作のお願い`,
    body: `@MC お疲れ様です。\n${ep.name}の着金が確認できましたら、EXPAの "Approved by Home" 操作をお願いいたします。Approved by host の最終deadにご注意ください。`,
  }),
  flightSeisa: (ep) => ({
    title: `${ep.name}/フライト精査のお願い`,
    body: `@MC お疲れ様です。\n${ep.name}のフライト候補を共有いたします。危機管理ガイドラインの条件（直行便優先・日中着・MCT・乗継）を満たすか、精査をお願いいたします。`,
  }),
  toiRemind: (ep) => ({
    title: `${ep.name}/といちらん（渡航先情報収集一覧）記入のお願い`,
    body: `${ep.name}さん お疲れ様です！\n渡航先情報収集一覧（といちらん）の記入をお願いします。現地LCとのコミュが必要な項目もあるので、計画的に進めましょう。\n1回目（暫定版）dead・2回目（完全版）deadはタイムラインを参照してください。`,
  }),
  ryoshinSeisa: (ep) => ({
    title: `${ep.name}/渡航先精査フォーム送信報告`,
    body: `@MC お疲れ様です。\n${ep.name}の渡航先精査フォームを送信いたしました。ご確認よろしくお願いいたします。`,
  }),
  anRemind: (ep) => ({
    title: `${ep.name}/AN署名のリマインド`,
    body: `${ep.name}さん\nAcceptおめでとうございます！AN（Acceptance Note）の署名に進みましょう。研修開始日/終了日に誤りがないか、現地LCと再確認をお願いします。`,
  }),
};

// ---- 「次にやること」を算出 ----
function nextActions(ep, taskStatus, toiStats, docs, audit) {
  const tl = computeTimeline(ep, taskStatus);
  const actions = [];
  const drafts = [];

  // 1) 期限超過・直近のマイルストーン
  tl.milestones.forEach(m => {
    if (!m.taskId) return;
    if (m.state === "overdue")
      actions.push({ level:"urgent", text:`【期限超過】${m.label}（${m.date} / ${m.note||""}）`, taskId:m.taskId });
    else if (m.state === "soon")
      actions.push({ level:"soon", text:`【まもなく】${m.label}（${m.date}・あと${m.daysFromToday}日）`, taskId:m.taskId });
  });

  // 2) フェーズ起点の定型アクション＆ドラフト
  const pi = PHASE_ORDER.indexOf(ep.phase);
  const done = id => taskStatus[id] === "完了";
  if (ep.phase === "accepted") {
    if (!done("t32")) { actions.push({level:"normal", text:"Match Check List（MCL）の記入・提出をEPに促す"}); }
    if (done("t32") && !done("t35")) { drafts.push(TEMPLATES.haraiKakunin(ep)); actions.push({level:"normal", text:"MCL提出済 → MCへ振込メール送信を依頼"}); }
    if (!done("t30")) drafts.push(TEMPLATES.anRemind(ep));
  }
  if (ep.phase === "approved") {
    drafts.push(TEMPLATES.toiRemind(ep));
    if (!done("t39")) actions.push({level:"normal", text:"フライト取得（渡航35日前）→ 取得後フライト精査を依頼"});
    drafts.push(TEMPLATES.flightSeisa(ep));
  }
  if (ep.phase === "applied") { drafts.push(TEMPLATES.ryoshinSeisa(ep)); }
  if (ep.phase === "accepted" || ep.phase === "approved") {
    if (done("t35") && !done("t36")) drafts.push(TEMPLATES.approvedByHome(ep));
  }

  // 3) といちらん未充足（approved以降）
  if (pi >= PHASE_ORDER.indexOf("approved") && toiStats) {
    const pct = toiStats.total ? Math.round(toiStats.filled / toiStats.total * 100) : 0;
    if (pct < 100)
      actions.push({ level: pct < 50 ? "urgent":"normal", text:`といちらん ${toiStats.filled}/${toiStats.total} 充足（${pct}%）— 残りを埋める / ダブルチェック`});
  }

  // 4) 提出物ダブルチェック漏れ
  if (docs) docs.filter(d => d.status==="受領" && !d.double_checked)
    .forEach(d => actions.push({ level:"normal", text:`提出物ダブルチェック未済：${d.name}`}));

  // 5) 資格審査リスク
  if (audit) audit.filter(a => a.result==="否")
    .forEach(a => actions.push({ level:"urgent", text:`資格審査リスク：${a.indicator}（基準 ${a.pass}）`}));

  // 並べ替え（urgent→soon→normal）
  const rank = { urgent:0, soon:1, normal:2 };
  actions.sort((a,b)=>(rank[a.level]??3)-(rank[b.level]??3));

  return { actions, drafts, timeline: tl };
}

module.exports = { nextActions, TEMPLATES };
