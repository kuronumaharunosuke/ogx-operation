// ai.js — 任意のLLM層。ANTHROPIC_API_KEY があれば自然言語で応答、無ければ null（ルールエンジンにフォールバック）。
// セキュリティ：キーは環境変数のみ。コードに直書きしない。
const trouble = require("./trouble");

const KEY = process.env.ANTHROPIC_API_KEY || null;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const enabled = () => !!KEY;

function systemPrompt() {
  return `あなたはAIESEC JapanのoGV渡航オペレーションを支援するアシスタント「BLISS Copilot」です。
属人化を防ぐため、運用マニュアルとトラブル対応マニュアルに基づいて、De担/EPMが次に取るべき行動を簡潔に日本語で示します。

# 運用フェーズ
SU〜Raise → Raise〜Accepted → Accepted〜Approved → Approved〜Realize → Fin〜
EXPAマイルストーン: signup/raise/applied/accepted/approved/realized/finished/completed

# 逆算の主要dead（出発日D/ 帰国日R 基準）
承諾書・1万円振込=D-64, AN署名=D-47, approved=D-40, フライト取得=D-35, フライト情報提出=D-30,
現地LCへ通知=D-20, といちらん1回目=D-10, といちらん2回目=D-5, 出国前日連絡=D-1, 到着確認=D0,
帰国報告=R0, 修了コンサル=R+7, 修了届=R+14, Exchange Standards=R+30

# トラブル対応の原則
${trouble.PRINCIPLE}
安全サポートデスク(SSI): ${trouble.SSI.phone}（${trouble.SSI.hours}）。${trouble.SSI.note}
状況別: 体調不良 / 自然災害・政変 / 内部トラブル(宿泊先・VISA・その他)。
重大度: ケース①(影響なし)〜④(生命に影響)。出国後・生命影響はMC・EB・理事へ。

# 出力ルール
- 推測で個人情報を創作しない。わからない項目は「要確認」と書く。
- 箇条書きで、誰が・何を・いつまでに、を明確に。
- 文面ドラフトを求められたら、Slackに貼れる簡潔な日本語で。`;
}

async function ask(question, epContext) {
  if (!enabled()) return null;
  const body = {
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt(),
    messages: [{
      role: "user",
      content: `# 対象EPの状態\n${JSON.stringify(epContext, null, 2)}\n\n# 質問\n${question}`,
    }],
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}

module.exports = { enabled, ask, MODEL };
