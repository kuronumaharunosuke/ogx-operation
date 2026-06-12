// seed-data.js — アップロードされた実運用資料からデータモデル化したシード

// 全国LC（fruits DashBoard の列より）
const LCS = [
  ["AG","青山学院"],["APU","立命館APU"],["CH","中央"],["DO","同志社"],["FK","福岡"],
  ["HD","北海道"],["HI","一橋"],["HU","広島"],["JO","上智"],["KB","神戸"],["KG","関西学院"],
  ["KO","慶應"],["KT","京都"],["MJ","明治"],["NA","名古屋"],["NI","名古屋市立"],["NZ","南山"],
  ["OI","大阪市立"],["OS","大阪"],["SFC","慶應SFC"],["SG","滋賀"],["SP","立教"],["TKB","筑波"],
  ["TO","東京"],["WA","早稲田"],
];

// EXPA / 渡航マイルストーン（EPのphase）
const PHASES = [
  ["signup","Sign Up"],["raise","Raise"],["applied","Apply"],["accepted","Accept"],
  ["approved","Approve"],["realized","Realize"],["finished","Finish"],["completed","Complete"],
];

// 運用タスクのbucket（管理シートのPhase区分）
const BUCKETS = [
  ["su_raise","SU 〜 Raise"],
  ["raise_accept","Raise 〜 Accepted"],
  ["accept_approve","Accepted 〜 Approved"],
  ["approve_realize","Approved 〜 Realize"],
  ["fin","Fin 〜（帰国後）"],
];

// OP（希望渡航先フォームの EY×PJT を反映）
const OPS = [
  ["np_gc","🇳🇵","Nepal","global classroom","AIESEC in Kathmandu",6,"asia","SDG4","08.05"],
  ["in_ryv","🇮🇳","India","raise your voice","AIESEC in Delhi",4,"asia","SDG16","08.10"],
  ["in_gl","🇮🇳","India","green leaders","AIESEC in Hyderabad",3,"asia","SDG13","08.10"],
  ["ug_fp","🇺🇬","Uganda","fingerprint","AIESEC in Kampala",5,"africa","SDG3","07.28"],
  ["rw_gc","🇷🇼","Rwanda","global classroom","AIESEC in Kigali",4,"africa","SDG4","08.01"],
  ["gh_eq","🇬🇭","Ghana","equify","AIESEC in KNUST",3,"africa","SDG5","07.28"],
  ["vn_gc","🇻🇳","Vietnam","global classroom","AIESEC in FTU Hanoi",6,"asia","SDG4","08.05"],
  ["lk_eq","🇱🇰","Sri Lanka","equify","AIESEC in Colombo",4,"asia","SDG5","07.30"],
  ["ph_hb","🇵🇭","Philippines","happy bus","AIESEC in Cebu",4,"asia","SDG11","08.03"],
  ["br_otm","🇧🇷","Brazil","on the map","AIESEC in São Paulo",3,"latam","SDG11","08.08"],
  ["id_gc","🇮🇩","Indonesia","global classroom","AIESEC in Bali",5,"asia","SDG4","08.02"],
  ["pl_gl","🇵🇱","Poland","green leaders","AIESEC in Warsaw",2,"europe","SDG13","07.20"],
  ["tr_su","🇹🇷","Türkiye","scale up!","AIESEC in Istanbul",3,"europe","SDG8","07.31"],
  ["mx_e4c","🇲🇽","Mexico","eat 4 change","AIESEC in CDMX",3,"latam","SDG2","08.06"],
];

// 運用タスク・テンプレート（管理シート原本を構造化、Res/Sup/Dead付き）
// [id, bucket, title, note, res, sup, dead, dc]
const OP_TEMPLATE = [
  // ---- SU 〜 Raise ----
  ["t01","su_raise","Sign up","Blissに貼られたSign upフォームから提出","EP","De担","",0],
  ["t02","su_raise","Sign up 確認","Bliss管理者画面より確認","XD","De担","",0],
  ["t03","su_raise","1stコンサル/SRB日程調整メール送信","雛形を元にメール送信","De担","OML","",0],
  ["t04","su_raise","1stコンサル実施","参加規約・SOS・参加費・危機管理ガイドライン説明、SRB日調、PS交付","De担","OML","",0],
  ["t05","su_raise","公的語学試験証明書をアップロード","申込日から2年以内・申込日より前にUL","De担","OML","2コン前日まで",1],
  ["t06","su_raise","在学/卒業証明書をアップロード","当該年度発行・申込日より前にUL","De担","OML","2コン前日まで",1],
  ["t07","su_raise","本人確認書類をアップロード","官公庁交付（学生証不可）・申込日より前にUL","De担","OML","2コン前日まで",1],
  ["t08","su_raise","書類アップロードのダブルチェック","#ogx_重要書類確認 で格納場所・名前・内容を確認","De担","OML","",1],
  ["t09","su_raise","2ndコンサル・一次テスト・内部面接 日程調整","XDと日調、IR MLにアサイン依頼","De担","OML","",0],
  ["t10","su_raise","参加申込書 作成（クラウドサイン転記）","SRB外部面接官情報を確認し転記","De担","EPM","",1],
  ["t11","su_raise","2ndコンサル 実施","参加申込書・PS・CV・語学証明・本人確認を回収、申込書記入","De担","OML","",0],
  ["t12","su_raise","参加申込書 記入ダブルチェック","保護者記入欄含めクラウドサイン照合","De担","OML","",1],
  ["t13","su_raise","YOP登録","YOPへの登録","EP","EPM","",0],
  ["t14","su_raise","一次テスト 受験・合格","De担同席。承諾書送信より前に合格・点数記録","EP","De担","",0],
  ["t15","su_raise","SRB内部面接","理念・危機管理の視点を評価（対面推奨）","XD","De担","",0],
  ["t16","su_raise","SRB外部面接 実施","前日までに覚書・講師契約を締結","De担","XD","",0],
  ["t17","su_raise","参加申込承諾書 締結","De担記入→ダブルチェック→MC確認","De担","XD","",1],
  ["t18","su_raise","SOS用 1万円振込・着金確認","#ogx_lc_着金確認依頼 で依頼","EP","All","渡航64日前",0],
  // ---- Raise 〜 Accepted ----
  ["t19","raise_accept","EXPA操作（Interviewed）","24h以内にXD/EPMをアサイン、Interviewedに変更","XD","De担","",0],
  ["t20","raise_accept","SOSアシスタンスアプリ登録","SOSアカウント作成","EP","De担","",0],
  ["t21","raise_accept","CV完成","1stコンサルで配布したCVを完成","De担","OML","",0],
  ["t22","raise_accept","YOPプロフィール完成","希望OPの参加条件を満たすよう整備","De担","OML","",0],
  ["t23","raise_accept","タイムライン作成","フライト情報提出・といちらん提出は必達","De担","OML","",0],
  ["t24","raise_accept","EP-現地LC-EPM 連絡体制整備","現地LCのWhatsAppにEPを追加","De担","IR担当者","",0],
  ["t25","raise_accept","渡航先精査フォーム 提出","Apply前にヒアリング。未提出だとApply不可","EPM","De担","Apply前",1],
  ["t26","raise_accept","渡航先精査call 実施","IR担当者が現地LCとcall、GV IR logを埋める","IR担当者","De担","",0],
  ["t27","raise_accept","アプライ","1人15OPまで。スロットのスクショ/日付を記録","EP","EPM","",0],
  ["t28","raise_accept","Interview","IR担当者同席。3日返信なしはリマインド","EP","All","",0],
  ["t29","raise_accept","Accept後 AN証憑メール送信","合格OPの1つだけAccept。研修開始/終了日を確認","EP","De担","",1],
  ["t30","raise_accept","AN（Acceptance Note）署名","YOPからDLし内容控え。De担同席推奨","EP","De担","渡航47日前",1],
  ["t31","raise_accept","フライトリサーチ開始","Accept後すぐ条件を満たす便を探索","EP","De担","",0],
  // ---- Accepted 〜 Approved ----
  ["t32","accept_approve","Match Check List 記入/提出","メアド・YOPID・生年月日・渡航日を要確認","EP","EPM","",1],
  ["t33","accept_approve","blissに転記・GSS照合","#ogx_重要書類確認 で照合","EP","EPM","",1],
  ["t34","accept_approve","フライト精査依頼（MC）","危機管理ガイドライン条件を満たすか","De担","EPM","",0],
  ["t35","accept_approve","参加費 振込","明細を取得（確認用）","EP","All","",0],
  ["t36","accept_approve","EXPA Approved 確認","Approved by Home/Host を確認","OML","De担","渡航40日前",0],
  // ---- Approved 〜 Realize ----
  ["t37","approve_realize","出国までのTL作成","航空券・VISA・予防接種・といちらん提出を計画","De担","EPM","",0],
  ["t38","approve_realize","Initial LDA survey 回答","Approved後にMCからリンク→LDAコンサル","EP","EPM","",0],
  ["t39","approve_realize","フライト取得","渡航35日前まで。条件を満たす便のみ、E-ticket保存","EP","De担","渡航35日前",1],
  ["t40","approve_realize","フライト情報 提出・ダブルチェック","アシスタンスアプリ登録、デリライ2人以上で確認","EP","De担","渡航30日前",1],
  ["t41","approve_realize","予防接種","医師と接種スケジュールを相談、早めに","EP","De担","",0],
  ["t42","approve_realize","VISA取得","レコメが必要ならMCに申請フォーム","EP","De担","",0],
  ["t43","approve_realize","保険証券 確認","渡航3日前まで未着ならMCにリマインド","EPM","De担","渡航3日前",0],
  ["t44","approve_realize","連絡手段（音声通話可SIM）確保","購入証明を取得。アフリカは早めに","EP","EPM","",1],
  ["t45","approve_realize","危機管理講習会 受講","ポータルから全10種のe-learning視聴（De担同席）","EP","De担","",0],
  ["t46","approve_realize","certificate（10個）アップロード","指定フォルダにUL→ダブルチェック→MC報告","De担","OML","",1],
  ["t47","approve_realize","渡航先情報収集一覧（といちらん）提出 1回目","暫定版。提出dead=渡航10日前","EP","EPM","渡航7日前",1],
  ["t48","approve_realize","渡航先情報収集一覧（といちらん）提出 2回目","完全版。提出dead=渡航5日前","EP","EPM","渡航3日前",1],
  ["t49","approve_realize","たびレジ 登録確認","外務省たびレジに新規登録","EPM","De担","",0],
  ["t50","approve_realize","到着確認/トラブル対応グループ作成","EB・OGXVD・オペチームを追加","De担","EPM","",0],
  ["t51","approve_realize","OPS（事前研修・Fruit）参加","HI独自設計の事前研修を代替機会に","EPM","De担","",0],
  ["t52","approve_realize","出国前日 MC連絡・ピックアップ確認","#ogx_lc_hi でフライトスケジュール共有","EP","De担","出国前日",0],
  ["t53","approve_realize","ピックアップ写真UL・到着確認GSS","合流写真をAJ公式LINEからUL→30分以内に記載","EP","EPM","渡航日",0],
  // ---- Fin 〜 ----
  ["t54","fin","帰国報告（GSS）","帰国後1.5時間以内に連絡を受けGSS記入","De担","OML","帰国後1.5h",0],
  ["t55","fin","修了コンサル","帰国後7日以内に実施","EPM","De担","帰国後7日",0],
  ["t56","fin","修了届 締結・ダブルチェック","研修開始/終了日に注意。14日以内に提出","De担","OML","研修修了後14日",1],
  ["t57","fin","Final Web Survey 回答","事後研修後にBlissから回答","EP","De担","",0],
  ["t58","fin","LDA Survey 回答","メールのSurveyに回答","EP","De担","",0],
  ["t59","fin","Exchange Standards 回答","帰国後1か月以内にYOPから回答","EP","IR担当者","帰国後1か月",0],
  ["t60","fin","NPS 回答","メールのアンケートに回答、EPMが結果回収","EP","De担","",0],
];

// bucket が到達するマイルストーン
const BUCKET_MILESTONE = {
  su_raise:"raise", raise_accept:"accepted", accept_approve:"approved",
  approve_realize:"realized", fin:"finished",
};

// 提出物（ダブルチェックタイミングより）
const DOC_TEMPLATE = [
  ["d1","語学スコア証明書","su_raise"],
  ["d2","在学/卒業証明書","su_raise"],
  ["d3","本人確認書類","su_raise"],
  ["d4","参加申込書","su_raise"],
  ["d5","参加申込承諾書","su_raise"],
  ["d6","渡航先精査フォーム","raise_accept"],
  ["d7","AN証憑メール","raise_accept"],
  ["d8","Match Check List","accept_approve"],
  ["d9","フライト情報（E-ticket）","approve_realize"],
  ["d10","危機管理講習会 certificate（10枚）","approve_realize"],
  ["d11","渡航先情報収集一覧（といちらん）","approve_realize"],
  ["d12","修了届","fin"],
];

// といちらん（渡航先情報収集一覧）項目
const TOI_FIELDS = [
  // section, label, source
  ["在外公館","在外公館の住所","外務省"],
  ["在外公館","在外公館HP","外務省"],
  ["在外公館","在外公館の電話番号","外務省"],
  ["救急","救急車の電話番号","現地調査"],
  ["連絡手段","海外携帯/Global SIM 種別","本人"],
  ["連絡手段","電話番号","本人"],
  ["連絡手段","購入証明（スクショ）","本人"],
  ["健康","必要な予防接種を全て受けた","厚労省検疫所"],
  ["健康","危機管理講習会を受講（cert 10枚）","SOSポータル"],
  ["緊急代理人","緊急代理人 氏名/続柄","参加申込書"],
  ["緊急代理人","緊急代理人 電話/メール","参加申込書"],
  ["緊急代理人","予備緊急代理人 氏名/続柄","参加申込書"],
  ["緊急代理人","予備緊急代理人 電話/メール","参加申込書"],
  ["出迎え","出迎え担当者 氏名","Questions to LC"],
  ["出迎え","出迎え担当者 連絡先","Questions to LC"],
  ["出迎え","待ち合わせ場所（写真）","Questions to LC"],
  ["出迎え","待ち合わせ日時（現地/日本時間）","Questions to LC"],
  ["VISA","VISA 種類","駐日大使館"],
  ["VISA","VISA 必要書類/取得日数","駐日大使館"],
  ["VISA","VISA レコメの有無","駐日大使館"],
  ["滞在先","滞在先 形態/名称","Questions to LC"],
  ["滞在先","滞在先 住所/連絡先/Map","Questions to LC"],
  ["病院・警察","最寄り病院 名称/住所/電話","Questions to LC"],
  ["病院・警察","最寄り警察 住所/電話","Questions to LC"],
  ["パスポート","パスポート表記名","パスポート"],
  ["パスポート","パスポート有効期限/番号","パスポート"],
  ["研修先","研修先機関 名称/住所/担当者","Questions to LC"],
  ["移動","空港→滞在先 移動経路","Questions to LC"],
];

// 資格審査項目（PHI / oGV Healthier・Safety）
const AUDIT_ITEMS = [
  ["a1","OGX","渡航先情報収集一覧 項目不備","空欄/仮提出・誤記載がないこと","提出数20%〜 で否","60%"],
  ["a2","OGX","音声通話可能な連絡手段の不持参","海外対応携帯/事前購入SIM を持参","1〜 で否","90%"],
  ["a3","OGX","週1度の安否確認 未実施","FWSの定期連絡を基に判断","1〜 で否","90%"],
  ["a4","OGX","危機管理講習会 不参加","cert 10枚UL後にといちらん提出","1〜 で否","60%"],
  ["a5","Contract","HC不備書類","HCと照合し不備をカウント","2〜 で否","90%"],
  ["a6","Contract","語学スコア 不備","正式・2年以内・申込前UL","2〜 で否","60%"],
  ["a7","Contract","本人確認書類 不備","官公庁交付・顔写真付・申込前UL","2〜 で否","60%"],
  ["a8","Contract","一次テスト 未合格契約","承諾書送信より前に合格","2〜 で否","60%"],
];

// EP（希望渡航先フォームの実データを反映、フェーズを分散）
// [id, name, univ, lc, phase, op_id, de_tan, epm, applied, lk]
const EPS = [
  ["ep-001","山田 太郎","一橋大 2年","HI","accepted","in_gl","運営 太郎","佐藤 一郎","05.02",5],
  ["ep-002","鈴木 花子","一橋大 1年","HI","raise",null,"運営 太郎","山田 太郎","05.20",4],
  ["ep-003","佐藤 一郎","一橋大 1年","HI","applied",null,"運営 太郎","鈴木 花子","05.28",3],
  ["ep-004","田中 美咲","立命館APU 1年","APU","applied",null,"加藤 彩","伊藤 さくら","06.01",3],
  ["ep-005","高橋 健太","京都大 1年","KT","realized","np_gc","伊藤 さくら","田中 美咲","04.20",5],
  ["ep-006","伊藤 さくら","立命館APU 1年","APU","accepted","rw_gc","加藤 彩","高橋 健太","05.10",4],
  ["ep-007","渡辺 大輔","大阪大 1年","OS","approved","in_gl","運営 太郎","佐藤 一郎","05.05",4],
  ["ep-008","中村 優子","同志社大 1年","DO","signup",null,"加藤 彩","田中 美咲","06.08",2],
  ["ep-009","小林 翔","立教大 1年","SP","approved","rw_gc","伊藤 さくら","渡辺 大輔","05.06",4],
  ["ep-010","加藤 彩","立命館APU 1年","APU","applied","gh_eq","運営 太郎","伊藤 さくら","05.30",3],
];

// EPごとの会話ログ（一部）
const MESSAGES = [
  ["ep-005","host","AIESEC in Kathmandu","06.02","She arrived safely and started at the school today!"],
  ["ep-005","ep","高橋 健太","06.03","無事到着しました！global classroom 楽しみです"],
  ["ep-005","mentor","伊藤 さくら","06.03","最高のスタート！週次安否確認、入れていこう。"],
  ["ep-007","mentor","運営 太郎","06.07","保険証券そろそろ来るはず。3日前までに届かなかったらMCにリマインドしよう。"],
  ["ep-001","mentor","運営 太郎","06.06","Hyderabad の green leaders にAccept！AN署名の前に研修開始/終了日をもう一度確認。"],
  ["ep-001","ep","山田 太郎","06.07","確認しました、日付OKです！"],
];

const CHECKINS = [
  ["ep-005","06.08","週次 #1","プロジェクト順調。言語の壁はあるが現地スタッフが手厚い。体調◎"],
];

module.exports = { LCS, PHASES, BUCKETS, BUCKET_MILESTONE, OPS, OP_TEMPLATE, DOC_TEMPLATE, TOI_FIELDS, AUDIT_ITEMS, EPS, MESSAGES, CHECKINS };
