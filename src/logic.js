/* ========= ユーティリティ ========= */
const rnd=Math.random;
const ri=(a,b)=>Math.floor(a+rnd()*(b-a+1));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const wpick=pairs=>{let s=pairs.reduce((t,p)=>t+p[1],0),x=rnd()*s;for(const[v,w]of pairs){if((x-=w)<0)return v}return pairs[pairs.length-1][0]};
const noise=sd=>(rnd()+rnd()+rnd()-1.5)*2*sd; // 近似正規 (sd)
const K=(r,c)=>r+','+c;
const $=id=>document.getElementById(id);

/* ========= 打者生成 ========= */
// 名前は実在のプロ野球選手の苗字・下の名前から拾い、ランダムに組み合わせる（組み合わせは架空）
const SURN=["大谷","村上","山田","柳田","坂本","岡本","佐藤","近藤","吉田","鈴木","山本","佐々木","牧","宮城","森下","今永","千賀","菅野","丸","浅村",
  "中村","西川","源田","外崎","周東","栗原","甲斐","松田","秋山","菊池","大山","近本","中野","梅野","小園","堂林","頓宮","杉本","森","紅林",
  "野村","清宮","万波","今宮","牧原","細川","石川","高橋","戸郷","則本","田中","岸","平良","山川","井上","藤原","安田","荻野","角中","和田",
  "長野","宮崎","筒香","桑原","京田","岡林","細谷","大島","福留","阿部","原","松井","清原","落合","掛布","山崎","糸井","青木","中田","西岡",
  "谷","岩隈","黒田","上原","斉藤","内川","鳥谷","金本","前田","新井","広岡","達川","伊東","工藤","秋広","門脇","塩見","長岡","増田","中島"];
const GIVN=["翔平","宗隆","哲人","悠岐","勇人","和真","輝明","健介","正尚","誠也","由伸","朗希","秀悟","大弥","暢仁","昇太","智之","佳浩","栄斗","剛",
  "遥輝","壮亮","右京","拓也","宣浩","翔吾","亮汰","輝","光司","健斗","将吾","至","悠","尚輝","大輔","隆一","浩二","一朗","秀樹","和博",
  "篤紀","竜也","亮太","聖也","颯","陽岱","慎之助","達也","賢人","大地","海斗","晴","優斗","裕太","雄星","将大","圭","大樹","真之","匠",
  "貴浩","直人","剛志","孝介","大成","泰示","郁也","陽斗","泰輔","将","克哉","颯真","泰然","雅也","奎二","慎吾","拓郎","弘樹","俊介","洋平"];
// 一般的な苗字・名前（野球選手の名前と半々で混ぜる）
const SURN2=["佐藤","鈴木","高橋","田中","伊藤","渡辺","小林","加藤","山口","松本","井上","木村","林","清水","山崎","池田","橋本","石井","小川","前川",
  "長谷川","藤田","後藤","岡田","近藤","村田","坂口","遠藤","青山","西村","福田","太田","三浦","藤井","松田","中山","石田","小野","竹内","金子",
  "和田","中島","原田","上田","森田","柴田","酒井","工藤","横山","宮本","内田","高木","安藤","谷口","大野","丸山","今井","河野","藤本","村山"];
const GIVN2=["大翔","蓮","陽翔","湊","悠真","樹","蒼","颯太","大和","陸","翔太","健太","拓海","優太","大輝","直樹","和也","達也","誠","浩之",
  "一輝","隼人","亮","智也","健一","正樹","康介","雄太","祐介","慎也","瑛太","陽太","翼","航","岳","駿","圭吾","光","渉","晃"];
function randName(used){
  const sp=()=>rnd()<0.5?pick(SURN):pick(SURN2);   // 苗字：野球選手 or 一般
  let sur=sp(), g=0;
  if(used){ while(used.has(sur)&&g++<80) sur=sp(); used.add(sur); }   // 同じチームで苗字がかぶらないように
  return sur+' '+(rnd()<0.5?pick(GIVN):pick(GIVN2));                  // 下の名前も半々
}
const TYPES={
  '強打':{p:[72,99],c:[35,65],s:[30,60],e:[40,72]},
  '巧打':{p:[28,55],c:[75,96],s:[45,75],e:[60,92]},
  '俊足':{p:[18,45],c:[55,82],s:[82,99],e:[45,78]},
  'バランス':{p:[55,76],c:[55,76],s:[55,76],e:[55,76]},
  '主砲':{p:[88,99],c:[62,85],s:[35,65],e:[60,88]},   // 圧倒的なクリーンナップ用
  '非力':{p:[18,40],c:[40,62],s:[40,72],e:[35,60]},   // 下位打線用
};
const RANDOM_TYPES=['強打','巧打','俊足','バランス'];

/* ---- 相手打線のパターン（1番〜9番のタイプ） ---- */
const LINEUPS={
  standard:{name:'スタンダード',desc:'1番俊足・2番巧打・4〜5番強打・下位は非力の標準的な打線',
    slots:['俊足','巧打','バランス','強打','強打','バランス','バランス','非力','俊足']},
  power:{name:'1番から強打者',desc:'どこからでも一発がある重量打線',
    slots:['強打','強打','強打','主砲','強打','強打','強打','強打','バランス']},
  contact:{name:'全員巧打者',desc:'ミートが高く三振しにくい。つながる打線',
    slots:['巧打','巧打','巧打','巧打','巧打','巧打','巧打','巧打','巧打']},
  cleanup:{name:'圧倒的なクリーンナップ',desc:'3〜5番は超強力、それ以外は非力。主軸をどう抑えるか',
    slots:['俊足','巧打','主砲','主砲','主砲','バランス','非力','非力','非力']},
  speed:{name:'俊足多め',desc:'足が速くゴロが内野安打になりやすい。出塁させると厄介',
    slots:['俊足','俊足','巧打','強打','俊足','俊足','バランス','俊足','俊足']},
};
const HANDS={normal:{name:'左右バランス',pL:null},left:{name:'左打者多め',pL:0.72},right:{name:'右打者多め',pL:0.22}};
let OPP={pattern:'standard',hand:'normal'};
const INNER=[];for(let r=1;r<=3;r++)for(let c=1;c<=3;c++)INNER.push(K(r,c));

function genTarget(hand){
  // 戻り値: {cells:Set, label}
  const insideC = hand==='R'?3:1, outsideC = hand==='R'?1:3;   // 投手目線：右打者の内角は右側
  const kind=wpick([['col',35],['row',30],['block',25],['amai',10]]);
  const cells=new Set(); let label='';
  if(kind==='col'){
    const inside=rnd()<.5, c=inside?insideC:outsideC;
    for(let r=1;r<=3;r++)cells.add(K(r,c));
    label=(inside?'内角':'外角')+'一本に絞る';
  }else if(kind==='row'){
    const r=pick([1,3,2]); for(let c=1;c<=3;c++)cells.add(K(r,c));
    label=['','高め','ベルト付近','低め'][r]+'狙い';
  }else if(kind==='block'){
    const r0=pick([1,2]), c0=pick([1,2]);
    for(let r=r0;r<r0+2;r++)for(let c=c0;c<c0+2;c++)cells.add(K(r,c));
    const v=r0===1?'高め':'低め';
    const cIn = hand==='R'? (c0===2) : (c0===1);
    label=(cIn?'内角':'外角')+v+'寄りを狙う';
  }else{
    ['2,2','1,2','3,2','2,1','2,3'].forEach(k=>cells.add(k));
    label='甘い球（真ん中付近）狙い';
  }
  return {cells,label};
}

function genBatter(type,pL,used){
  type=type||pick(RANDOM_TYPES); const t=TYPES[type];
  const power=ri(...t.p), contact=ri(...t.c), speed=ri(...t.s), eye=ri(...t.e);
  const pLeft = pL!=null ? pL : (type==='俊足'||type==='巧打' ? .5 : .32);
  const hand = rnd()<pLeft ? 'L':'R';
  const avg = clamp(0.172+contact*0.00135+speed*0.00035+(rnd()-.5)*0.03, .180, .365);
  // 本塁打率（1打席あたり）：パワー18で年1本ペース、パワー99で年60本ペース（年600打席換算）
  const hrRate = (typeof myHrRate==='function'?myHrRate(power):clamp(HR_MIN*Math.pow(HR_MAX/HR_MIN,(power-18)/81), HR_MIN, HR_MAX))*(1+(rnd()-.5)*0.2);   // 自分と同じパワー依存の式
  const sh=shuffle(INNER);
  const nG=ri(1,3), nB=ri(1,2);
  const good=new Set(sh.slice(0,nG)), bad=new Set(sh.slice(nG,nG+nB));
  const target=genTarget(hand);
  const name=randName(used);
  const btype=typeof cpuTypeOf==='function'?cpuTypeOf({m:contact,p:power,s:speed,d:50,e:eye},rnd()<0.3):type;   // 表示・効果用のタイプ
  return {name, num:ri(0,99), type:btype, arch:type, hand, power, contact, speed, eye, avg, hrRate, good, bad, target, res:[]};
}
function genLineup(){
  const L=LINEUPS[OPP.pattern]||LINEUPS.standard, used=new Set();
  return L.slots.map((t,i)=>({...genBatter(t,HANDS[OPP.hand].pL,used),order:i+1}));
}

/* ========= コース表記 ========= */
function horizIdx(c,hand){return hand==='R'?4-c:c} // 0=内角側（投手目線：右打者は右側に立つ）
function courseName(r,c,hand){
  const d=horizIdx(c,hand);
  const hz=['内角','内角','真ん中','外角','外角'][d];
  const vt=['高め','高め','','低め','低め'][r];
  const inZone=r>=1&&r<=3&&c>=1&&c<=3;
  let n;
  if(d===2&&r===2) n='ど真ん中';
  else if(d===2) n='真ん中'+vt;
  else n=hz+vt;
  return inZone?n:n+'（ボール）';
}

const PA_SEASON=600, HR_MIN=1/PA_SEASON, HR_MAX=60/PA_SEASON;
const HR_K=1.05;   // 打球1つあたりの本塁打確率への補正（シミュレーションで調整済み：表示の本塁打率≒実際の発生率）

/* ========= 状態 ========= */
const r1=v=>Math.round(v*10)/10;   // 能力・持ち点は0.1刻み
const bhandJP=h=>h==='S'?'両打':h==='L'?'左打':'右打';
const PTYPES=['ストレート','カットボール','ツーシーム','チェンジアップ','高速スライダー','スライダー','スロースライダー','スイーパー','シュート','高速シュート','シンカー','高速シンカー','カーブ','ドロップカーブ','スローカーブ','パワーカーブ','フォーク','SFF'];
const LEARN_TYPES=PTYPES.filter(t=>t!=='ストレート'&&t!=='スイーパー');   // 最初から・キャンプで選べる変化球（スイーパーはスライダーLv.7からさらに上げると覚える）
// 球種の系統（表示用）
const PFAM={'ストレート':'fast','カットボール':'fast','ツーシーム':'fast','チェンジアップ':'fast','高速スライダー':'slider','スライダー':'slider','スロースライダー':'slider','スイーパー':'slider',
  'シュート':'shoot','高速シュート':'shoot','シンカー':'sinker','高速シンカー':'sinker','カーブ':'curve','ドロップカーブ':'curve','スローカーブ':'curve','パワーカーブ':'curve','フォーク':'fork','SFF':'fork'};
const PFAM_JP={fast:'ストレート系',slider:'スライダー系',shoot:'シュート系',sinker:'シンカー系',curve:'カーブ系',fork:'フォーク系'};
// 球種グループ（読みが「近い」かどうかの判定・色分け用）：速い球／横・斜めに曲がる球／沈む球
const PGROUP={'ストレート':'fast','カットボール':'fast','ツーシーム':'fast','高速スライダー':'break','スライダー':'break','スロースライダー':'break','スイーパー':'break','シュート':'break','高速シュート':'break',
  'カーブ':'break','ドロップカーブ':'break','スローカーブ':'break','パワーカーブ':'break','チェンジアップ':'sink','シンカー':'sink','高速シンカー':'sink','フォーク':'sink','SFF':'sink'};
const PDESC={
  'ストレート':'いちばん速い球（MAXの球速）。球威があり、遅い変化球を待っている打者ほど空振り・打ち損じが増える',
  'カットボール':'直球−5km/h。同じマスの中で小さく横に動く。利き腕と逆の打席の打者の内角でゴロ、同じ打席の打者の内角は見逃されやすい',
  'ツーシーム':'直球−3km/h。同じマスの中でシュート方向に動く。利き腕と同じ打席の打者の内角でフライ、逆の打席の打者の内角は見逃されやすい',
  'チェンジアップ':'直球−30km/h。同じマスの中で少し沈む。速い球（直球〜直球−10km/h）を待つ打者から空振りがとても取れるが、狙われると打たれやすい',
  '高速スライダー':'直球−10km/h。横に1マス曲がる',
  'スライダー':'直球−20km/h。横に2マス曲がる',
  'スロースライダー':'直球−35km/h。横に2マス曲がる。狙われると打たれやすい',
  'スイーパー':'直球−15km/h。横に3マス大きく曲がる（スライダーLv.7からさらに上げると進化して覚える）。ボール→ストライクは見逃され、ストライク→ボールは空振りを取りやすいが死球も増える',
  'シュート':'直球−17km/h。シュート方向に2マス曲がる',
  '高速シュート':'直球−8km/h。シュート方向に1マス。利き腕と同じ打席の打者の内角でフライ（死球に注意）、逆の打席の打者の内角はとても見逃されやすい',
  'シンカー':'直球−25km/h。シュート方向に1マス・下に2マス沈む',
  '高速シンカー':'直球−20km/h。シュート方向の斜め下に1マス。ボール→ストライクで見逃し、ストライク→ボールで振らせやすい',
  'カーブ':'直球−25km/h。斜め下に1マス曲がる',
  'ドロップカーブ':'直球−15km/h。縦に2マス・横に1マス落ちる',
  'スローカーブ':'直球−45km/h。斜め下に2マス。速い球を待つ打者から空振り・打ち損じがとても取れるが、狙われるととても長打にされやすい',
  'パワーカーブ':'直球−10km/h。斜め下に1マス。ボール→ストライクで見逃しを取りやすいが、打たれると長打になりやすい',
  'フォーク':'直球−20km/h。下に2マス落ちる。低め・低めのボールで空振りを取りやすく、高め・真ん中は打たれやすい（狙われると空振りしにくい）',
  'SFF':'直球−10km/h。下に1マス落ちる。直球・スライダー・シュート系を待つ打者からゴロや空振りを取りやすい（狙われると打たれやすい）',
};
let REP=['ストレート','カーブ','スライダー'];   // 持ち球
let PHAND='R';   // 自分の利き腕（R=右投げ L=左投げ）
let PLEV={};   // 球種ごとの質：'少'＝少し投げられる／'普'＝普通／'決'＝決め球（ペナントではLv.1〜7の数字）
const LEVN={'少':'少し','普':'普通','決':'決め球'};
const LV_MAX=7;
// レベル（数字）：少し＝Lv.1／普通＝Lv.2／決め球＝Lv.3。プロ入り後はLv.7まで上がる
const lvNum=t=>{ const v=PLEV[t]; if(typeof v==='number') return v; if(t==='ストレート') return 3; return v==='少'?1 : v==='決'?3 : 2; };   // ストレートは Lv.3 が標準
const lev=t=>{ if(t==='ストレート') return '普'; const n=lvNum(t); return n<=1?'少':n>=3?'決':'普'; };   // Lv.3以上は決め球として扱う（ストレートは別枠でLvの効果）
const stLv=()=>lvNum('ストレート')-3;   // ストレートのLv（3が標準）。高いほど伸びがあり、見逃し・空振りが増え、打球が弱くなる
// 打席の中での読み方（打席ごとに決まる）
const RSTYLE={freq:'この打席で多い球種・コースを狙う',contra:'まだ来ていない球種・コースを読む',none:'特に読まず来た球に対応'};
let PNAME_IN='', TNAME_IN='';   // 自分の名前・チーム名（空欄なら試合ごとにランダム）
const PVELO=146, MYNUM=18;   // ストレートの平均球速（通常モード）・自分の背番号
// 自分の能力（ペナントは G.abil：球速・コントロール・スタミナ）
const myVelo=()=>G&&G.abil?G.abil.velo:PVELO;
const fatigue=()=>G&&G.abil?Math.max(0,G.st.pitches-(45+G.abil.stamina*0.75)):0;   // スタミナを超えた球数
// 球速：直球からの差（km/h）。投げるたびに±2.5km/hのばらつき（小数第1位まで・それより下は切り捨て）
const VOFF={'ストレート':0,'カットボール':-5,'ツーシーム':-3,'チェンジアップ':-30,'高速スライダー':-10,'スライダー':-20,'スロースライダー':-35,'スイーパー':-15,
  'シュート':-17,'高速シュート':-8,'シンカー':-25,'高速シンカー':-20,'カーブ':-25,'ドロップカーブ':-15,'スローカーブ':-45,'パワーカーブ':-10,'フォーク':-20,'SFF':-10};
const spd1=v=>Math.floor(v*10)/10;
const jitterSpd=v=>spd1(v+(rnd()-0.5)*5);
// 球種ごとの当てにくさ（ct）と打球の弱さ（q）
const PT_CT={'ストレート':0,'カットボール':-0.03,'ツーシーム':-0.02,'チェンジアップ':-0.06,'高速スライダー':-0.05,'スライダー':-0.06,'スロースライダー':-0.04,'スイーパー':-0.07,
  'シュート':-0.04,'高速シュート':-0.03,'シンカー':-0.05,'高速シンカー':-0.04,'カーブ':-0.05,'ドロップカーブ':-0.06,'スローカーブ':-0.03,'パワーカーブ':-0.06,'フォーク':-0.07,'SFF':-0.06};
const PT_Q ={'ストレート':0,'カットボール':-0.07,'ツーシーム':-0.06,'チェンジアップ':-0.07,'高速スライダー':-0.06,'スライダー':-0.05,'スロースライダー':-0.04,'スイーパー':-0.05,
  'シュート':-0.06,'高速シュート':-0.06,'シンカー':-0.08,'高速シンカー':-0.07,'カーブ':-0.04,'ドロップカーブ':-0.05,'スローカーブ':-0.02,'パワーカーブ':-0.04,'フォーク':-0.09,'SFF':-0.08};
// ゾーンに来たときの振られやすさ（カーブ系は見送られやすい）
const PT_SWZ={'カーブ':-0.07,'ドロップカーブ':-0.05,'スローカーブ':-0.10,'パワーカーブ':-0.03,'ツーシーム':0.03,'カットボール':0.03,'SFF':0.03,'高速シンカー':0.02};
// 低め（r=4のボール）を振らせやすさ／低めの当てにくさ・打球の弱さ
const PT_LOWB={'チェンジアップ':0.16,'フォーク':0.2,'シンカー':0.1,'高速シンカー':0.08,'SFF':0.15,'ドロップカーブ':0.1,'カーブ':0.06,'パワーカーブ':0.06,'スローカーブ':0.04};
const PT_LOWCT={'チェンジアップ':0.08,'フォーク':0.12,'SFF':0.08,'ドロップカーブ':0.06,'シンカー':0.05,'高速シンカー':0.04,'パワーカーブ':0.03};
const PT_LOWQ={'チェンジアップ':0.05,'フォーク':0.06,'シンカー':0.06,'高速シンカー':0.05,'SFF':0.05,'ドロップカーブ':0.03};
const SLOWP=new Set(['カーブ','ドロップカーブ','スローカーブ','チェンジアップ','フォーク','スロースライダー','シンカー']);   // 緩い球（直球の後に効く・引っかけやすい）
// 架空のチーム名（実在の球団名は使わない）
const CITIES=['札幌','仙台','千葉','埼玉','東京','横浜','静岡','名古屋','京都','大阪','神戸','広島','高松','福岡','那覇'];
const NICKS=['ファルコンズ','シャークス','タイタンズ','ウルフズ','フェニックス','サンダース','コメッツ','マスタングス','オーシャンズ','レッドウイングス','ブルーノーツ','グリフォンズ'];
function genNames(){
  const [c1,c2]=shuffle(CITIES), [n1,n2]=shuffle(NICKS);
  const myName=TNAME_IN||c1+n1, ms=myName[0];   // 自分のチーム名：決めていればそれ、空欄ならランダム
  return {my:{name:myName,s:ms},opp:{name:c2+n2,s:c2[0]===ms?c2.slice(0,2):c2[0]}};
}
// 方向・守備位置の一文字（左2塁打、遊ゴロ など）
const POS1={P:'投',C:'捕','1B':'一','2B':'二',SS:'遊','3B':'三',LF:'左',CF:'中',RF:'右'};
function npbLabel(p,big){
  if(p.kind==='K') return p.look?'見逃し三振':'空振り三振';
  if(p.kind==='BB') return '四球'; if(p.kind==='hbp') return '死球';
  if(p.kind==='foulout') return (POS1[{キャッチャー:'C',ファースト:'1B',サード:'3B'}[p.fielder]]||'')+'邪飛';
  const x=p.bip, d={left:'左',center:'中',right:'右'}[x.side];
  if(x.res==='HR') return d+'本塁打'; if(x.res==='3B') return d+'3塁打'; if(x.res==='2B') return d+'2塁打';
  if(x.res==='1B') return d+'安'; if(x.res==='IFH') return (POS1[x.fielder]||'')+'内野安';
  const f=POS1[x.fielder]||'';
  if(big==='ゲッツー！') return f+'併殺打';
  return f+{GO:'ゴロ',LO:'直',PO:'飛',FO:'飛'}[x.res];
}
function runnersText(){
  const on=['1塁','2塁','3塁'].filter((_,i)=>G.bases[i]);
  return on.length===3?'満塁':on.length?'ランナー'+on.join('・'):'ランナーなし';
}
const INNINGS=9;
const newStat=()=>({pitches:0,hits:0,hr:0,k:0,bb:0,bf:0,outs:0,runs:0});
function newCareer(){return {...newStat(),games:0,shutouts:0,w:0,l:0,cg:0,agg:newAgg()}}
let C=newCareer();   // 通算成績（セーブ対象）。agg＝今までの全投球の集計（相手ベンチの分析に使う）
let RECS=[];         // 試合記録（新しい順・最大30試合）
const MAX_INN=12;    // 延長は12回まで
// 9イニングあたりの率（防御率など）
function fmtRate(n,outs){return outs? (n*27/outs).toFixed(2) : '-.--'}
function fmtIP(outs){const i=Math.floor(outs/3),f=outs%3;return i+(f?` ${f}/3`:'')}
let G, sel=null, ptype='ストレート';

/* ========= 相手ベンチの配球分析 =========
   投げた球をすべて記録し、イニングが終わるたびに集計し直す。
   場面＝初球／有利（ストライク先行）／平行／不利（ボール先行）／追込（2ストライク）
   ・球種：場面別（＋打者の左右別）でよく投げる球を読む
   ・コース：左右別×場面別でよく投げるマスを張る。ボール球なら見極める */
const SITS=['初球','有利','平行','不利','追込'];
function sitOf(ab){
  if(!ab.pitches.length) return '初球';
  if(ab.strikes===2) return '追込';
  if(ab.strikes>ab.balls) return '有利';
  if(ab.balls>ab.strikes) return '不利';
  return '平行';
}
// 集計（件数）
function newAgg(){return {n:0,types:{},cells:{}}}
function aggAdd(A,p){
  const add=key=>{
    const T=A.types[key]||(A.types[key]={n:0,c:{}}); T.n++; T.c[p.pt]=(T.c[p.pt]||0)+1;
    const Cc=A.cells[key]||(A.cells[key]={n:0,c:{},ball:0}); Cc.n++; const k=K(p.r,p.c); Cc.c[k]=(Cc.c[k]||0)+1; if(!p.z)Cc.ball++;
  };
  A.n++; add(p.s+'|*'); add('*|'+p.h); add(p.s+'|'+p.h); add('*|*');
}
function buildScout(list){const A=newAgg(); list.forEach(p=>aggAdd(A,p)); return A}
// 件数 → 率
function toRates(A){
  const S={n:A.n,types:{},cells:{}};
  for(const k in A.types){const T=A.types[k];const p={};for(const t in T.c)p[t]=T.c[t]/T.n;S.types[k]={n:T.n,p}}
  for(const k in A.cells){const C=A.cells[k];const p={};for(const c in C.c)p[c]=C.c[c]/C.n;S.cells[k]={n:C.n,p,ball:C.ball/C.n}}
  return S;
}
// 通算の率とこの試合の率を半々で混ぜる（この試合のデータが5球未満の場面は通算のみ）
function blendRates(Sc,Sg){
  const out={n:Sc.n,nGame:Sg.n,types:{},cells:{}};
  for(const part of ['types','cells']){
    const keys=new Set([...Object.keys(Sc[part]),...Object.keys(Sg[part])]);
    for(const k of keys){
      const a=Sc[part][k], g=Sg[part][k];
      if(!a){out[part][k]=g;continue}
      if(!g||g.n<5){out[part][k]=a;continue}
      const p={}; new Set([...Object.keys(a.p),...Object.keys(g.p)]).forEach(x=>p[x]=(a.p[x]||0)*0.5+(g.p[x]||0)*0.5);
      const o={n:a.n,p}; if(part==='cells') o.ball=a.ball*0.5+g.ball*0.5;
      out[part][k]=o;
    }
  }
  return out;
}
// 傾向読みは打者ごと：その打者があなたから受けた投球（今までの試合＋この試合）だけで読む
const vsKey=b=>b?(b.fid||b.name||''):'';
function vsAggOf(b){ C.vs=C.vs||{}; const k=vsKey(b); if(!k) return null; return C.vs[k]||(C.vs[k]=newAgg()); }
function vsTrim(){ const ks=Object.keys(C.vs||{}); if(ks.length>400){ ks.sort((a,b)=>C.vs[a].n-C.vs[b].n).slice(0,100).forEach(k=>delete C.vs[k]); } }
function rebuildScout(){
  const b=G&&G.batter, A=b&&C.vs&&C.vs[vsKey(b)];
  if(!A||A.n<6){ G.scout=null; return; }
  G.scout=toRates(A); G.scout.nGame=G.phist.filter(p=>p.who===vsKey(b)).length;
}
function scoutRead(hand,sit){
  const S=G.scout; if(!S) return null;
  const first=(obj,keys)=>{for(const[k,m]of keys){const o=obj[k];if(o&&o.n>=m)return o}return null};
  const T=first(S.types,[[sit+'|'+hand,4],[sit+'|*',4]]);
  const Cc=first(S.cells,[[sit+'|'+hand,5],['*|'+hand,6]]);
  const types=T?T.p:{};
  const cells=new Set();
  if(Cc) Object.entries(Cc.p).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([k,v])=>{ if(v>=0.18&&v*Cc.n>=3) cells.add(k) });
  return {types,cells,ballRate:Cc?Cc.ball:null};
}
// 分析レポート（文章）
function topOf(o){return Object.entries(o.p).sort((a,b)=>b[1]-a[1])}
function pct(v){return Math.round(v*100)+'%'}
function scoutReport(S){
  if(!S||!S.n) return [];
  const L=[];
  const T0=S.types['初球|*'];
  if(T0&&T0.n>=3){const[t,v]=topOf(T0)[0];const C0=S.cells['初球|*'];L.push(`初球は<b>${t}</b>が${pct(v)}、ボール球${pct(C0.ball)}`)}
  for(const h of ['R','L']){
    const Cc=S.cells['*|'+h]; if(!Cc||Cc.n<6) continue;
    const tops=topOf(Cc).slice(0,2).map(([k,v])=>{const[r,c]=k.split(',').map(Number);return `${courseName(r,c,h)} ${pct(v)}`});
    L.push(`${h==='R'?'右':'左'}打者には <b>${tops.join('、')}</b>（ボール球${pct(Cc.ball)}）`);
  }
  for(const s of ['有利','不利','追込']){
    const T=S.types[s+'|*']; if(!T||T.n<4) continue;
    const[t,v]=topOf(T)[0];
    L.push(`${{有利:'ストライク先行',不利:'ボール先行',追込:'追い込んでから'}[s]}は<b>${t}</b> ${pct(v)}`);
  }
  return L;
}

// 打席の中で張るコース（2球以上見てから）
function abReadCells(b,ab){
  const out=new Set(), P=ab.pitches; if(!b.rstyle||b.rstyle==='none'||P.length<2) return out;
  const zone=[];for(let r=1;r<=3;r++)for(let c=1;c<=3;c++)zone.push([r,c]);
  if(b.rstyle==='freq'){
    // いちばん多く来たマスとその上下左右
    const cnt={}; P.forEach(p=>{const k=K(p.r,p.c);cnt[k]=(cnt[k]||0)+1});
    const [k,n]=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]; if(n<2) return out;
    const [r0,c0]=k.split(',').map(Number);
    zone.forEach(([r,c])=>{ if(Math.abs(r-r0)+Math.abs(c-c0)<=1) out.add(K(r,c)) });
    [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{const r=r0+dr,c=c0+dc; if(r>=0&&r<=4&&c>=0&&c<=4) out.add(K(r,c))});
  }else{
    // まだ来ていない側を読む（外中心なら内、低め中心なら高め…）
    const dI=P.reduce((t,p)=>t+horizIdx(p.c,b.hand),0)/P.length, rr=P.reduce((t,p)=>t+p.r,0)/P.length;
    const pickD = dI>2.4 ? 1 : dI<1.6 ? 3 : null, pickR = rr>2.4 ? 1 : rr<1.6 ? 3 : null;
    zone.forEach(([r,c])=>{ const d=horizIdx(c,b.hand);
      if(pickD!=null && d===pickD) out.add(K(r,c));
      else if(pickD==null && pickR!=null && r===pickR) out.add(K(r,c)); });
  }
  return out;
}

/* ---- 打者の球種読み（持ち球の中から考える） ---- */
function batterGuess(rd){
  const b=G.batter, ab=G.ab;
  const recent=G.hist.slice(-12);
  const w=REP.map(t=>{
    let x=1;
    if(t==='ストレート') x+=1.2;                         // 基本はストレート待ち
    if((b.type==='フルスイング'||b.type==='強打')&&PGROUP[t]==='fast') x+=0.5;
    x+=recent.filter(h=>h===t).length*0.3;              // 最近よく投げる球
    if(rd&&rd.types[t]) x+=rd.types[t]*6;                // 分析：この場面でよく投げる球を読む
    const seen=ab.pitches.filter(p=>p.pt===t).length;
    if(b.rstyle==='freq'&&ab.pitches.length>=2) x+=seen*0.9;                       // この打席で多い球を狙う
    else if(b.rstyle==='contra'&&ab.pitches.length>=2) x= seen? Math.max(0.2,x-seen*0.4) : x+1.6;   // 来ていない球を読む
    else x+=seen*0.4;
    if(lev(t)==='決') x+= 0.8 + (ab.strikes===2?1.0:0);   // 決め球は張られやすい（特に追い込んでから）
    if(lev(t)==='少') x=Math.max(0.2,x-0.4);
    if(ab.balls>ab.strikes&&ab.balls>=2&&PGROUP[t]==='fast') x+=1.5; // 投手不利カウントは直球
    if(ab.strikes===2&&PGROUP[t]!=='fast') x+=0.6;      // 追い込まれたら変化球も警戒
    return [t,x];
  });
  return wpick(w);
}

// opts：ペナントモードの試合（相手・味方・途中からの登板）。省略時はランダムな1試合
function newGame(withTitle,opts){
  opts=opts||null;
  // 相手打線は試合ごとにランダム（パターン＋左右）
  OPP= opts ? opts.OPP : {pattern:pick(Object.keys(LINEUPS)),hand:pick(Object.keys(HANDS))};
  G={inning:1,outs:0,runs:0,bases:[0,0,0],batter:null,ab:null,abOver:false,
     st:newStat(), logs:[], hist:[], over:false, lineup:opts?opts.lineup:genLineup(), order:-1, phist:[], scout:null,
     myTeam:opts?opts.myTeam:genTeam(), score:{opp:[0],my:[]}, xBottom:false, names:opts?opts.names:genNames(), hitsMy:0, hitsOpp:0,
     pname:opts?opts.pname:(PNAME_IN||randName()), pen:opts?opts.pen:null, abil:opts&&opts.abil?{...opts.abil}:null,
     mission:opts&&opts.mission?opts.mission:null,
     oppPitcher:opts&&opts.oppPitcher||genPitcher(), oppPen:opts&&opts.oppPen&&opts.oppPen.length?opts.oppPen:[genPitcher(),genPitcher(),genPitcher()],
     bullpen:opts&&opts.bullpen&&opts.bullpen.length?opts.bullpen:[genPitcher(),genPitcher(),genPitcher(),genPitcher(),genPitcher()],
     oppPQ:0.85+rnd()*0.3, penQ:0.85+rnd()*0.3,   // 相手投手陣／味方リリーフの出来（1より大きいと打たれやすい）
     innRuns0:0, obStreak:0, pulled:null, exit:null, restDone:false, result:null, lastBIP:null};
  // 途中のイニングから登板（中継ぎ・抑え）：それまでの回の結果を入れておく
  if(opts&&opts.pre){
    const P=opts.pre; G.score={opp:P.score.opp.slice(),my:P.score.my.slice()}; G.inning=P.entry; G.score.opp[P.entry-1]=0;
    G.order=P.oppOrder; G.myTeam.order=P.myOrder; G.hitsOpp=P.hitsOpp; G.hitsMy=P.hitsMy;
  }
  if(G.pen) G.pen.L0=myTot()-oppTot();   // 登板した時点の点差
  if(!REP.includes(ptype)) ptype=REP[0];
  $('log').innerHTML='';
  addLog(`<div class="chg">本日の相手：${LINEUPS[OPP.pattern].name}（${HANDS[OPP.hand].name}）／味方：${G.myTeam.name}／${PHAND==='R'?'右投げ':'左投げ'}・持ち球：${REP.join('・')}</div>`);
  { const known=G.lineup.filter(b=>C.vs&&C.vs[vsKey(b)]&&C.vs[vsKey(b)].n>=6);
    if(known.length) addLog(`<div class="scout">📋 相手打線のうち${known.length}人は、あなたとの対戦データを持っている（${known.map(b=>`${b.name} ${C.vs[vsKey(b)].n}球`).join('・')}）。打者ごとに、自分が受けた球から傾向を読んでくる</div>`); }
  if(opts&&opts.pre) addLog(`<div class="chg">${G.inning}回表から登板　相手 ${oppTot()} − ${myTot()} 味方</div>`);
  nextBatter();
  if(opts&&opts.pre) setResult('', `${G.inning}回表から登板`, `相手 ${oppTot()} − ${myTot()} 味方　${G.pen.L0>0?G.pen.L0+'点リード':G.pen.L0<0?(-G.pen.L0)+'点ビハインド':'同点'}`,0);
  if(withTitle && typeof showTitle==='function') showTitle();
}
// ランダムな投手（相手の先発・両チームのリリーフ）
// 変化球は1〜5球種（平均2.5）。それぞれLv.1〜7で、いちばんレベルの高い球（Lv.3以上）が決め球になりやすい
const NB_W=[[1,22],[2,32],[3,25],[4,13],[5,8]];
const CPU_LV_W=[[1,15],[2,30],[3,25],[4,15],[5,9],[6,4],[7,2]];
// 配球パターン：外中心・内中心・高め中心・低め中心・ボール球を使う・全体にバラバラ
const PSTYLE_W=[['out',24],['in',14],['high',12],['low',22],['ball',14],['mix',14]];
const PSTYLE_JP={out:'外角中心',in:'内角中心',high:'高め中心',low:'低め中心',ball:'ボール球を使う',mix:'全体にバラバラ'};
const pitLv=(p,t)=>p.plv&&p.plv[t]!=null ? p.plv[t] : ({'少':1,'普':2,'決':3}[(p.levs||{})[t]]||2);
// 決め球：いちばんレベルの高い変化球が決め球になりやすい（レベルが低いと決め球のない投手もいる）
function pickKime(p){
  let best=null, bl=0;
  p.types.forEach(t=>{ if(t==='ストレート') return; const L=pitLv(p,t); if(L>bl){ bl=L; best=t; } });
  const pr = bl>=6?0.97 : bl===5?0.92 : bl===4?0.8 : bl===3?0.55 : 0;
  return best&&rnd()<pr ? best : null;
}
function kimeOf(p){
  if(p&&'kime' in p) return p.kime&&p.types.includes(p.kime) ? p.kime : null;
  let best=null, bl=2;
  p.types.forEach(t=>{ if(t==='ストレート') return; const L=pitLv(p,t); if(L>bl){ bl=L; best=t; } });
  return best;
}
function levsFrom(p){
  const sl=(p.plv&&p.plv['ストレート'])||(p.velo>=152?4:p.velo<=141?2:3); if(p.plv&&p.plv['ストレート']==null) p.plv['ストレート']=sl;
  const L={'ストレート':sl>=4?'決':sl<=2?'少':'普'}, k=kimeOf(p);
  p.types.forEach(t=>{ if(t!=='ストレート') L[t]= t===k?'決' : pitLv(p,t)<=1?'少':'普'; });
  return L;
}
// 変化球のレベルの強さ（打たれにくさの計算用）
const kScore=p=>p.types.reduce((a,t)=>a+(t==='ストレート'?(p.levs&&p.levs[t]==='決'?0.5:0):Math.max(0,pitLv(p,t)-2)*0.5),0);
function genPitcher(){
  const hand=rnd()<.7?'R':'L', nb=wpick(NB_W);
  let brk=shuffle(LEARN_TYPES).slice(0,nb), plv={};
  brk.forEach(t=>plv[t]=clamp(wpick(CPU_LV_W)+(nb<=2&&rnd()<0.4?1:0),1,7));   // 球種が少ない投手は1つ1つの球の質が高め
  if(plv['スライダー']>=6&&rnd()<0.4){ brk=brk.map(t=>t==='スライダー'?'スイーパー':t); plv['スイーパー']=ri(1,3); delete plv['スライダー']; }   // スライダーを極めた投手はスイーパー
  const types=PTYPES.filter(t=>t==='ストレート'||brk.includes(t));
  const velo=ri(138,157), control=ri(30,90), stamina=ri(30,95);
  const p={isP:true,name:randName(),num:ri(11,69),hand,velo,types,plv,control,stamina,style:wpick(PSTYLE_W)};
  p.kime=pickKime(p); p.levs=levsFrom(p);
  p.q=clamp(1.18-(velo-138)/19*0.16-(control-30)/60*0.14-kScore(p)*0.02+(rnd()-.5)*0.1,0.78,1.25);   // 1より小さいほど打たれにくい
  return p;
}
// 前の版の投手（少し・普通・決め球の3段階、変化球2〜4球種）を新しい形に直す
function upgradePit(p){
  if(!p||p.isMe||!Array.isArray(p.types)) return p;
  if(p.plv){ if(!('kime' in p)){ p.kime=pickKime(p); p.levs=levsFrom(p); } return p; }   // 決め球の有無がまだ決まっていない投手
  const brk=p.types.filter(t=>t!=='ストレート'), lv={};
  brk.forEach(t=>lv[t]= (p.levs||{})[t]==='決'?ri(3,5) : (p.levs||{})[t]==='少'?1 : wpick([[2,60],[3,40]]));
  const nb=wpick(NB_W), keep=brk.slice().sort((a,b)=>lv[b]-lv[a]).slice(0,nb);
  while(keep.length<nb){ const t=pick(LEARN_TYPES.filter(x=>!keep.includes(x))); keep.push(t); lv[t]=ri(1,2); }
  p.types=PTYPES.filter(t=>t==='ストレート'||keep.includes(t)); p.plv={}; keep.forEach(t=>p.plv[t]=lv[t]);
  p.kime=pickKime(p); p.levs=levsFrom(p); if(!p.style) p.style=wpick(PSTYLE_W);
  return p;
}
function nextBatter(){
  G.order=(G.order+1)%G.lineup.length;
  G.batter=G.lineup[G.order]; G.batter.target=genTarget(G.batter.hand);   // 狙いは打席ごとに変わる
  G.batter.rstyle=wpick([['freq',38],['contra',32],['none',30]]);        // 打席の中での読み方
  G.ab={balls:0,strikes:0,pitches:[]}; G.abOver=false;   // 選んだコースは次の打者にも引き継ぐ
  rebuildScout();   // この打者が今までにあなたから受けた球で、傾向を読む
  if(typeof setView==='function') setView('pitch');
  if(pullTimer){ clearTimeout(pullTimer); pullTimer=null; $('throw').textContent='投げる'; }
  $('reveal').innerHTML=''; $('next').style.display='none'; $('throw').style.display='';
  const b=G.batter;
  addLog(`<div class="ab">▶ ${b.order}番 ${b.name}（${b.hand==='R'?'右':'左'}打・${b.type}）</div>`);
  // 結果の枠は「投げた球の結果」専用。新しい打者では前の結果を残し、試合の最初だけプレイボールと出す
  if(G.st.pitches===0 && G.inning===1 && G.order===0) setResult('','プレイボール',`${b.order}番 ${b.name}（${b.hand==='R'?'右打':'左打'}・${b.type}）が打席に`,0);
  renderAll();
}

/* ========= 1球のシミュレーション ========= */
// 制球ブレ：実際に届くマスを決める
// この試合で、同じ利き手の打者に近くのマス（上下左右斜め1マス）へ投げた割合
function locFamShare(r,c,hand){
  const P=G.phist.slice(-50).filter(p=>p.h===hand); if(P.length<6) return 0;
  return P.filter(p=>Math.abs(p.r-r)<=1&&Math.abs(p.c-c)<=1).length/P.length;
}
function decideLoc(r,c){
  const r0=r,c0=c; let note='';
  const ctl=G.abil?G.abil.control:null;
  const pMiss = ctl!=null ? clamp(0.45-ctl*0.0042+fatigue()*0.003,0.03,0.55) : ($('optCtrl').checked?0.22:0);
  if(rnd()<pMiss){
    const far = ctl!=null && ctl<30 && rnd()<0.3;   // コントロールが悪いと2マスずれることも
    const dr=pick([-1,0,1])*(far?2:1), dc=pick([-1,0,1])*(far?2:1);
    const nr=clamp(r+dr,0,4), nc=clamp(c+dc,0,4);
    if(nr!==r||nc!==c){r=nr;c=nc;note='（制球ミスで '+courseName(r,c,G.batter.hand)+' へ）'}
  }
  return {r,c,note,r0,c0};
}
// 変化（投手目線・右投手の場合。x:+は腕側＝シュート方向、−はグラブ側＝スライダー方向、y:+は下。単位はマス）
//   曲がる前のマス＝投げたマス−変化。カット・ツーシーム・チェンジアップは同じマスの中で動くだけ（見た目だけ BRV で少し動かす）
const BREAK={
  'ストレート':[0,0],'カットボール':[0,0],'ツーシーム':[0,0],'チェンジアップ':[0,0],
  '高速スライダー':[-1,0],'スライダー':[-2,0],'スロースライダー':[-2,0],'スイーパー':[-3,0],
  'シュート':[2,0],'高速シュート':[1,0],'シンカー':[1,2],'高速シンカー':[1,1],
  'カーブ':[-1,1],'ドロップカーブ':[-1,2],'スローカーブ':[-2,2],'パワーカーブ':[-1,1],'フォーク':[0,2],'SFF':[0,1],
};
// 球種名をタップすると説明が出る（render.js の ptipShow）
const ptn=(t,label)=>PDESC[t]?`<span class="ptn" data-pt="${t}">${label??t}</span>`:(label??t);
const BRV=t=>t==='カットボール'?[-0.3,0.05]:t==='ツーシーム'?[0.3,0.08]:t==='チェンジアップ'?[0,0.32]:BREAK[t];   // アニメーション用（同じマスの中の動き）
const PFX_K={sbSw:0.12,sbWh:0.06,sbQ:0.05,bsSw:0.14,fool:0.15};
const PIT_ADJ={sw:0.03,ct:0.25,q:0,swNT:0.58,foul:0.05,oz:0.14,ctMin:0.38,qNT:0.2};   // 三振が多すぎないように：狙っていないストライクも振り、当てやすく、ファウル・打球を増やす   // 球種を作り直したときの全体のバランス調整（自分が投げる打席）   // ストライク→ボール／ボール→ストライク／曲がる前のマスを狙ったときの強さ（調整値）
let BIPFX=null;   // 打球の結果に渡す球種の特徴（ゴロ・フライ・長打）
// 球種ごとの特徴（自分が投げる打席・自分が打つ打席の両方で使う）
//  x: {pt,r,c,sr,sc（曲がる前のマス）,hand（打者の打席）,phand（投手の利き腕）,mainT（打者の本命の球種）,mainSpd（本命の球速）,stSpd（この投手の直球の球速）}
//  戻り値 sw:ゾーンの球を振る確率の増減 swB:ボール球を振る確率の増減 wh:空振りの増減 q:打球の質の増減 gb/fb:ゴロ・フライの増減 xbh:長打の増減 hbp:死球の倍率 sb:ストライク→ボール bs:ボール→ストライク
function pitchFx(x){
  const {pt,r,c}=x, endZ=r>=1&&r<=3&&c>=1&&c<=3, stZ=x.sr>=1&&x.sr<=3&&x.sc>=1&&x.sc<=3, moved=x.sr!==r||x.sc!==c;
  const fx={sw:0,swB:0,wh:0,q:0,gb:0,fb:0,xbh:0,hbp:1,sb:moved&&stZ&&!endZ,bs:moved&&!stZ&&endZ};
  if(fx.sb){ fx.swB+=PFX_K.sbSw; fx.wh+=PFX_K.sbWh; fx.q-=PFX_K.sbQ; }   // ストライク→ボール：振らせて空振り・打ち損じ
  if(fx.bs){ fx.sw-=PFX_K.bsSw; }                                         // ボール→ストライク：見逃されやすい
  const inside=horizIdx(c,x.hand)<=1, same=x.phand===x.hand, main=x.mainT||null, mS=x.mainSpd, st=x.stSpd, isMain=main===pt;
  switch(pt){
    case 'ストレート': if(main&&main!=='ストレート'&&mS!=null){ const d=clamp(st-mS,0,50); fx.wh+=d*0.004; fx.q-=d*0.003; } break;
    case 'カットボール': if(inside&&!same){ fx.gb+=0.15; fx.q-=0.04; } if(inside&&same&&endZ) fx.sw-=0.12; break;
    case 'ツーシーム': if(inside&&same){ fx.fb+=0.15; fx.q-=0.04; } if(inside&&!same&&endZ) fx.sw-=0.12; break;
    case 'チェンジアップ': if(isMain){ fx.wh-=0.08; fx.q+=0.12; } else if(mS!=null&&mS>=st-10.5&&mS<=st+3){ fx.wh+=0.15; fx.q-=0.06; } break;
    case 'スロースライダー': if(isMain){ fx.wh-=0.06; fx.q+=0.12; } break;
    case 'スイーパー': if(fx.bs) fx.sw-=0.08; if(fx.sb){ fx.wh+=0.06; fx.hbp=2.5; } break;
    case '高速シュート': if(inside&&same){ fx.fb+=0.15; fx.q-=0.04; fx.hbp=2.5; } if(inside&&!same&&endZ) fx.sw-=0.22; break;
    case '高速シンカー': if(fx.bs) fx.sw-=0.08; if(fx.sb) fx.swB+=0.08; break;
    case 'スローカーブ': if(isMain){ fx.q+=0.18; fx.xbh+=0.25; fx.wh-=0.05; } else if(main&&PFAM[main]==='fast'&&main!=='チェンジアップ'){ fx.wh+=0.12; fx.q-=0.1; } break;
    case 'パワーカーブ': if(fx.bs) fx.sw-=0.08; fx.xbh+=0.12; break;
    case 'フォーク': if(r<=2){ fx.q+=0.08; fx.wh-=0.04; } else fx.wh+= isMain?-0.04:0.08; break;
    case 'SFF': if(isMain){ fx.q+=0.1; fx.wh-=0.04; } else if(main&&main!=='チェンジアップ'&&['fast','slider','shoot'].includes(PFAM[main])){ fx.gb+=0.1; fx.wh+=0.05; } break;
  }
  return fx;
}
const COL_STRIKE='#f5c542', COL_BALL='#7fe0a2', COL_FOUL='#f5c542', COL_HIT='#4ea1ff', COL_OUT='#ff5a52';
// 投げた球の色：ストライク黄・ファウル薄灰・ボール緑。ヒット／ホームランは青、アウトは赤を優先
function pitchColor(p){
  if(p.kind==='bip') return p.bip&&!p.bip.out ? COL_HIT : COL_OUT;
  if(p.kind==='foulout') return COL_OUT;
  if(p.kind==='foul') return COL_FOUL;
  if(p.kind==='ball'||p.kind==='hbp') return COL_BALL;
  return COL_STRIKE;
}
const RES_CLS={hit:'ch',hr:'ch',out:'co',k:'co',bb:'cb'};
const inZoneRC=(r,c)=>r>=1&&r<=3&&c>=1&&c<=3;
const breakX=pt=>BREAK[pt][0]*(PHAND==='R'?1:-1);   // 左投手は左右反転

function simulatePitch(r,c,pt,note){
  const b=G.batter, ab=G.ab;
  note=note||'';
  const key=K(r,c);
  const inZone=r>=1&&r<=3&&c>=1&&c<=3;
  const protect = ab.strikes>=2;                 // 追い込まれたらゾーン全体を待つ
  const isTarget = inZone && (protect || b.target.cells.has(key));
  const strictTarget = inZone && b.target.cells.has(key);
  const nearTarget = !inZone && [...b.target.cells].some(k=>{const[a,d]=k.split(',').map(Number);return Math.abs(a-r)<=1&&Math.abs(d-c)<=1});
  const isGood=b.good.has(key), isBad=b.bad.has(key);
  const middle = r===2&&c===2;
  const corner = !inZone && (r===0||r===4) && (c===0||c===4);
  const low = r>=3, high=r<=1;
  const dIn=horizIdx(c,b.hand);
  // 慣れ：同じ球種・近いコースが続くと合わせられる
  let fam=0;
  ab.pitches.forEach(p=>{ if(p.pt===pt) fam+=0.03; if(p.pt===pt && Math.abs(p.r-r)<=1 && Math.abs(p.c-c)<=1) fam+=0.04; });
  fam=Math.min(fam,0.2);
  // 球種の読み
  // 相手ベンチの分析（前のイニングまでの配球）
  const rd=scoutRead(b.hand,sitOf(ab));
  const readCell=!!(rd&&rd.cells.has(key));
  // 打席の中での読み：多いコースを張る／来ていないコースを読む
  const abCells=abReadCells(b,ab);
  const abRead=abCells.has(key);
  const guess=batterGuess(rd);
  const gMatch = guess===pt ? 2 : (PGROUP[guess]===PGROUP[pt] ? 1 : 0);   // 2=的中 1=近い 0=外れ
  // 投手と打者の左右：同じ利き腕は投手有利。打者から逃げていく変化球は打ちにくい
  const samePH = PHAND===b.hand;
  const bx=breakX(pt);
  const away = b.hand==='R' ? bx<-0.3 : bx>0.3;   // 投手目線：右打者は右に立つので、左へ曲がる球が逃げていく
  // 曲がる前のマスと球種の特徴
  const sr=r-BREAK[pt][1], sc=c-bx, moved=sr!==r||sc!==c;
  const gSpd=guess?myVelo()+VOFF[guess]:null;
  const fx=pitchFx({pt,r,c,sr,sc,hand:b.hand,phand:PHAND,mainT:guess,mainSpd:gSpd,stSpd:myVelo()});
  const fooled=moved&&!strictTarget&&b.target.cells.has(K(sr,sc));   // 曲がる前のマスを狙っていた（つられて振り、打ち損じ・空振りが増える）

  // --- ストライクとボールの使い分け ---
  // 最近ストライクばかりなら打者は積極的に振ってきて合わせやすくなる。ボールばかりなら見極められる
  const rec30=G.phist.slice(-30), zs=rec30.length>=8?rec30.filter(p=>p.z).length/rec30.length:0.55;
  const zoneHeavy=Math.max(0,zs-0.55), ballHeavy=Math.max(0,0.45-zs);
  const prevP=ab.pitches[ab.pitches.length-1];
  const showBall = prevP && !prevP.inZone && inZone && (Math.abs(prevP.r-r)+Math.abs(prevP.c-c))>=2;   // 見せ球のあとに別のところへストライク
  const lureBall = prevP && prevP.inZone && !inZone && Math.abs(prevP.r-r)<=1 && Math.abs(prevP.c-c)<=1; // ストライクの近くからボールへ（釣り球）
  // ストレートの球速：速いほど決め球のように打ちにくく、遅いほど対応される
  const sp = (pt==='ストレート'||pt==='ツーシーム'||pt==='カットボール') ? (myVelo()-145)/10*(pt==='ストレート'?1:0.5) : 0;
  const lx=Math.max(0,lvNum(pt)-3);   // Lv.4以上は決め球よりさらに打ちにくい
  // --- スイング判定 ---
  let swingP;
  if(inZone){
    if(protect) swingP=0.84;
    else if(strictTarget) swingP=0.92;
    else swingP=PIT_ADJ.swNT+(middle?0.12:0);   // 狙っていない → 甘くても見逃しやすい
    if(readCell) swingP=Math.max(swingP,0.9);   // 分析で張っていたコース
    if(abRead) swingP=Math.max(swingP,0.9);     // 打席の中で張っていたコース
    if(ab.balls===3&&ab.strikes===0) swingP*=0.45;
    swingP+=(PT_SWZ[pt]||0)+PIT_ADJ.sw;   // カーブ系は見送られやすい／小さく動く球はストライクに見えて手を出させる
    swingP+=fx.sw;           // ボール→ストライクは見逃されやすい など
    if(pt==='ストレート') swingP-=0.03*stLv();   // 伸びのあるストレートは見逃されやすい（Lvが低いと振られやすい）
    swingP+=[-0.07,0,0.08][gMatch];
    swingP+=zoneHeavy*0.3-ballHeavy*0.3;
  }else{
    swingP=(1-b.eye/100)*0.34;
    if(nearTarget) swingP+=0.14;
    if(protect) swingP+=0.16;
    if(r===4) swingP+=PT_LOWB[pt]||0;   // 低めに沈んで振らせる
    if(gMatch===2) swingP-=0.05; else if(gMatch===0&&PGROUP[pt]!=='fast') swingP+=0.06; // 読み外れの変化球に手が出る
    if((pt==='ツーシーム'||PFAM[pt]==='shoot')&&dIn<=1) swingP+=0.06;
    if(PFAM[pt]==='slider'&&dIn>=3) swingP+=({'高速スライダー':0.06,'スイーパー':0.1}[pt]||0.08);
    if(pt==='カットボール'&&dIn>=3) swingP+=0.04;
    swingP+=fx.swB;          // ストライク→ボールは振らせやすい
    if(away&&dIn>=3) swingP+=0.06;              // 外へ逃げる球を追いかける
    if(corner) swingP*=0.5;
    if(readCell) swingP*=0.4;                    // よく来るボール球は見極められる
    if(abRead) swingP*=0.5;
    if(lev(pt)==='決') swingP+=0.06+0.01*lx;     // 決め球のボール球は振らせやすい
    if(rd&&rd.ballRate>0.5) swingP*=0.8;         // この場面はボールが多いと読まれている
    if(ab.balls===3) swingP-=0.05;
    swingP*= (1+zoneHeavy*0.6)*(1-ballHeavy*1.2);   // ストライクばかりだと振ってくる／ボールばかりだと見極められる
    if(lureBall) swingP+=0.08;
    if(sp>0&&r<=1) swingP+=0.04*sp;             // 速い高めの釣り球
  }
  if(fooled&&!protect) swingP=Math.max(swingP,0.8);   // 狙っていたマスに来たように見えて振ってしまう
  swingP=clamp(swingP,0.02,0.97);
  const swing=rnd()<swingP;
  const speed=jitterSpd(myVelo()+VOFF[pt]-fatigue()*0.08);   // 球速（km/h・小数第1位まで）。疲れると落ちる
  const base={r,c,sr,sc,pt,inZone,note,guess,gMatch,readCell,abRead,speed,fooled,sb:fx.sb,bs:fx.bs};

  if(!swing){
    if(!inZone){
      // 内角のボールは死球の可能性
      if(dIn===0 && r>=1 && r<=3 && rnd()<0.05*fx.hbp) return {...base,kind:'hbp',text:'デッドボール'};
      return {...base,kind:'ball',text:'ボール'};
    }
    return {...base,kind:'look',text:'見逃しストライク'};
  }

  // --- コンタクト判定 ---
  let ct=0.52+b.contact/100*0.34;   // 相手打者のコンタクト率（少し低め）
  if(isGood) ct+=0.08;
  if(isBad) ct-=0.18;
  if(!inZone) ct-=PIT_ADJ.oz+(corner?0.1:0);
  if(strictTarget) ct+=0.05;
  if(readCell&&inZone) ct+=0.05;
  if(abRead&&inZone) ct+=0.05;
  // 球の質：少しの球は読みが外れても対応されやすい／決め球は打ちにくい
  const L=lev(pt);
  if(L==='少'){ ct+=0.05; if(gMatch===0) ct+=0.07; }
  if(L==='決'){ ct-=0.07+0.03*lx; if(ab.strikes===2) ct-=0.04; }
  if(pt==='ストレート') ct-=0.02*stLv();   // 球威：Lvが高いほど当てにくい
  // 粘り・対応：追い込まれたら当てにいく。球数を見るほど目が慣れる
  if(protect) ct+=0.04+b.contact*0.0006;
  ct+=Math.min(0.08,ab.pitches.length*0.015);
  if(inZone&&!isTarget) ct-=0.06;
  ct+=PT_CT[pt]||0;
  if(low) ct-=PT_LOWCT[pt]||0;
  ct+=PIT_ADJ.ct-fx.wh;                        // 球種の特徴（ストライク→ボール・待ち球とのずれ など）
  if(fooled) ct-=PFX_K.fool;                   // 曲がる前のマスを狙っていた
  ct+=[-0.07,0,0.07][gMatch];
  ct+= samePH ? -0.02 : 0.02;
  if(away) ct-=0.04;
  if(gMatch===0&&pt==='ストレート') ct-=0.05;   // 変化球待ちで直球に差し込まれる
  // 緩急：直前がストレートならカーブ・チェンジアップがより効く
  const prev=ab.pitches[ab.pitches.length-1];
  if(prev&&prev.pt==='ストレート'&&SLOWP.has(pt)) ct-= pt==='スローカーブ'?0.11:0.06;
  if(pt==='スローカーブ'){ if(gMatch===2) ct+=0.05; if(prev&&prev.pt==='スローカーブ') ct+=0.06; }   // 読まれたり続けたりすると合わされる
  if(pt==='ストレート'&&high&&b.power>70) ct-=0.06;
  ct+=fam;
  // よく来るコースとその周りは当てられやすい（この試合の配球から）
  const locShare=locFamShare(r,c,b.hand);
  ct+=Math.min(0.06,locShare*0.12);
  if(rd&&!readCell&&[...rd.cells].some(k=>{const[a,d]=k.split(',').map(Number);return Math.abs(a-r)<=1&&Math.abs(d-c)<=1})) ct+=0.03;   // 張っているコースの周り
  ct+=0.0;    // （全体の当てやすさの調整値）
  // 自分の能力：球速が速いほど当てにくい／スタミナ切れで当てられやすい
  if(G.abil){ ct-=(G.abil.velo-PVELO)*0.0015; ct+=Math.min(0.12,fatigue()*0.002); }
  ct-=0.06*sp;                                  // 速いストレートは空振りが取れる／遅いと当てられる
  if(inZone) ct+=zoneHeavy*0.18;                // ストライクばかりだとタイミングを合わせられる
  if(showBall) ct-=0.05;                        // 見せ球が効いている
  ct=clamp(ct,PIT_ADJ.ctMin,0.95);
  if(rnd()>ct) return {...base,kind:'swing',text:'空振り'};

  // --- ファウル判定 ---
  let foulP=0.40+PIT_ADJ.foul+(inZone?0:0.15)+(inZone&&!isTarget&&!protect?0.12:0)-(strictTarget?0.08:0)+(protect?0.16:0);   // 追い込まれるとファウルで粘る
  if(rnd()<foulP){
    if(rnd()<0.07){
      const f=wpick([['キャッチャー',5],['ファースト',2],['サード',2]]);
      return {...base,kind:'foulout',text:f+'ファウルフライ',fielder:f};
    }
    const where=pick(['バックネットへ','三塁側スタンドへ','一塁側スタンドへ','真後ろへ','レフト線の外へ','ライト線の外へ']);
    return {...base,kind:'foul',text:'ファウル（'+where+'）'};
  }

  // --- 打球の質 q ---
  let q=0;
  if(strictTarget||readCell||abRead) q+=0.06+b.contact/100*0.24; else if(protect&&inZone) q-=0.08; else q-=PIT_ADJ.qNT;   // 狙ったコースでもヒット性になるかはミート次第（ミート50で+0.20、80で+0.27）。狙っていない球はヒット・HRになりにくい
  if(L==='少'){ q+=0.06; if(gMatch===0) q+=0.08; }
  if(L==='決'){ q-=0.08+0.03*lx; }
  if(pt==='ストレート') q-=0.025*stLv();   // 伸び：Lvが高いほど打球が弱い（被打率が少しずつ良くなる）
  q+=Math.min(0.1,ab.pitches.length*0.02);   // 粘って球を見るほど捉えやすくなる
  if(readCell&&inZone&&strictTarget) q+=0.08;
  if(isGood) q+=0.22;
  if(isBad) q-=0.25;
  if(middle) q+=0.2;
  if(inZone && (r!==2) && (c!==2)) q-=0.08;   // ゾーンの四隅
  if(!inZone) q-=0.38;
  q+=PT_Q[pt]||0;
  if(low) q-=PT_LOWQ[pt]||0;
  q+=fx.q+PIT_ADJ.q;
  if(fooled) q-=PFX_K.fool;
  if(pt==='スローカーブ'&&(gMatch===2||(prev&&prev.pt==='スローカーブ'))) q+=0.08;
  q+=[-0.12,0,0.16][gMatch];   // 読みが当たると強い打球
  q+= samePH ? -0.04 : 0.03;
  if(away) q-=0.03;
  if(pt==='ツーシーム'&&dIn<=1) q-=0.06;   // 内角のツーシームで詰まらせる
  if(PFAM[pt]==='shoot'&&dIn<=1) q-=0.07;  // 内角のシュートで詰まらせる
  if(pt==='カットボール'&&!away&&dIn<=2) q-=0.06;   // 打者の手元に食い込むカットで芯を外す
  q+=fam*0.8;
  q+=locShare*0.08;
  if(G.abil){ q-=(G.abil.velo-PVELO)*0.0015; q+=Math.min(0.12,fatigue()*0.002); }
  q-=0.07*sp;
  if(inZone) q+=zoneHeavy*0.22;
  if(showBall) q-=0.05;
  q+=noise(0.22);

  BIPFX={gb:fx.gb,fb:fx.fb,xbh:fx.xbh};
  return {...base,kind:'bip',q,bip:Object.assign(resolveBIP(r,c,pt,q,b),BIPMETA)};
}

/* ========= 打球の結果 ========= */
const FN={P:'ピッチャー',C:'キャッチャー','1B':'ファースト','2B':'セカンド',SS:'ショート','3B':'サード',LF:'レフト',CF:'センター',RF:'ライト'};
function resolveBIP(r,c,pt,q,b){
  const inZone=r>=1&&r<=3&&c>=1&&c<=3, PX=BIPFX||{gb:0,fb:0,xbh:0}; BIPFX=null;   // 球種の特徴（ゴロ・フライ・長打）
  const dIn=horizIdx(c,b.hand);
  // 方向：引っ張り/センター/流し
  let pull=[0.55,0.55,0.38,0.22,0.2][dIn], opp=[0.14,0.15,0.27,0.48,0.5][dIn];
  if(SLOWP.has(pt)){pull+=0.07;opp-=0.04}   // 遅い球は引っかけやすい
  const dir=wpick([['pull',pull],['center',1-pull-opp],['opp',opp]]);
  // 右打者の引っ張り=左方向
  const side = dir==='center'?'center' : ((dir==='pull')===(b.hand==='R')?'left':'right');
  const IF={left:[['3B',5],['SS',5]],center:[['P',2.5],['SS',3.5],['2B',4]],right:[['2B',5],['1B',5]]}[side];
  const OF={left:'LF',center:'CF',right:'RF'}[side];
  const sideWord={left:'レフト',center:'センター',right:'ライト'}[side];
  BIPMETA={side,kind:'fly',q};   // グラウンド画面で打球を描くための情報

  // ホームラン
  let hrP=b.hrRate*HR_K*Math.exp((b.sure!==undefined?1.7:2.3)*q);   // 自分の打席はパワー依存を強く（打球の質への依存は弱め）
  if(!inZone) hrP*=0.3;
  if(b.sureK) hrP*= b.sure ? 1+0.5*b.sure : 1-0.5*b.sureK;   // 自分の打席：ミートが高いほど本塁打も「本命が芯」に集中する
  hrP*=1+PX.xbh;   // 長打になりやすい球種
  const BT=b.type;   // 打者タイプの効果（打席あたり±5%相当）
  hrP+=btFx(BT,'hr')*0.6;
  hrP=clamp(hrP,0,0.75);
  if(rnd()<hrP){
    const txt=pick([sideWord+'スタンドへ','バックスクリーンへ',sideWord+'ポール際へ']);
    return {res:'HR',bases:4,cls:'hr',big:'ホームラン！',text:(side==='center'?'バックスクリーンへ':txt)+'飛び込むホームラン'};
  }
  // 打球の種類
  let gP=[0.25,0.36,0.48,0.62,0.72][r]-(b.power-50)/260;
  const setKind=k=>{BIPMETA.kind=k};
  gP+=({'ツーシーム':0.16,'シンカー':0.2,'高速シンカー':0.17,'フォーク':0.1,'SFF':0.14,'チェンジアップ':0.07,'シュート':0.1,'高速シュート':0.08,'カットボール':0.06}[pt]||0); if(pt==='ストレート'&&r<=1)gP-=0.05;
  gP+=PX.gb-PX.fb;
  if(b.speed>=80) gP+=0.08;   // 俊足は転がして内野安打を狙う
  gP+=btFx(BT,'gb');
  let lP=0.17+Math.max(0,q)*0.15;
  gP=clamp(gP,0.15,0.8);
  const fP=Math.max(0.1,1-gP-lP)*(1+PX.fb);
  const kind=wpick([['ground',gP],['liner',lP],['fly',fP]]);
  setKind(kind);
  // ヒット確率
  let hitP=(b.avg+0.03)*Math.exp(1.1*q);
  if(kind==='liner')hitP*=1.9;
  if(kind==='ground')hitP*=0.95+(b.speed-50)/400;
  hitP*=1.03;   // 少しヒットが出やすく
  if(b.sureK) hitP*=1-0.95*Math.pow(b.sureK,1.5);   // 自分の打席：ミートが高いほど「本命が芯」以外の当たりは運任せになりにくい（◎の確実性に寄せる）
  hitP+=btFx(BT,'hit');
  hitP=clamp(hitP,0.03,0.85);

  if(rnd()<hitP||(b.sure&&rnd()<b.sure)){   // 自分の打席：本命が芯ならミートに応じて確実にヒット性
    if(kind==='ground'){
      const ifh=0.08+b.speed/100*0.28+btFx(BT,'ifh');
      if(rnd()<ifh){const f=wpick(IF); return {res:'IFH',bases:1,cls:'hit',big:'内野安打',fielder:f,text:FN[f]+'への当たりで俊足を飛ばして内野安打'}}
      const w={left:'三遊間を抜けるレフト前ヒット',center:'センター前へ抜けるヒット',right:'一二塁間を破るライト前ヒット'}[side];
      return {res:'1B',bases:1,cls:'hit',big:'ヒット',text:w};
    }
    let p2=Math.max(0,0.17+b.power/100*0.2+(kind==='liner'?0.05:0)+btFx(BT,'d2')+PX.xbh*0.6), p3=b.speed/100*0.08;
    const x=rnd();
    if(x<p3) return {res:'3B',bases:3,cls:'hit',big:'スリーベース',text:(side==='left'?'左中間':side==='right'?'右中間':'センター')+'を深々と破るスリーベース'};
    if(x<p3+p2) return {res:'2B',bases:2,cls:'hit',big:'ツーベース',text:pick([sideWord+'線を破るツーベース',(side==='right'?'右中間':'左中間')+'を割るツーベース',sideWord+'の頭を越えるツーベース'])};
    return {res:'1B',bases:1,cls:'hit',big:'ヒット',text:sideWord+'前に落ちるヒット'};
  }
  // アウト
  if(kind==='ground'){
    let f;
    if(q<-0.35&&rnd()<0.22) f=pick(['C','P']); else f=wpick(IF);
    const w= f==='C'?'キャッチャー前のボテボテのゴロ':FN[f]+'ゴロ';
    return {res:'GO',out:true,fielder:f,cls:'out',big:FN[f]+'ゴロ',text:w};
  }
  if(kind==='liner'){
    const f = rnd()<0.55 ? wpick(IF) : OF;
    return {res:'LO',out:true,fielder:f,cls:'out',big:FN[f]+'ライナー',text:FN[f]+'正面のライナー'};
  }
  // フライ
  const popP=clamp(0.33-q*0.35,0.08,0.7);
  if(rnd()<popP){
    let f = rnd()<0.08 ? 'C' : wpick(IF.concat([['P',1]]));
    return {res:'PO',out:true,fielder:f,cls:'out',big:FN[f]+'フライ',text:f==='C'?'真上に上がったキャッチャーフライ':FN[f]+'への内野フライ'};
  }
  return {res:'FO',out:true,fielder:OF,of:true,cls:'out',big:FN[OF]+'フライ',text:pick([FN[OF]+'フライ',FN[OF]+'がやや下がって捕球',FN[OF]+'正面のフライ'])};
}

let BIPMETA={};
/* ========= 走者・アウト処理 ========= */
function score(n){G.runs+=n; return n}
function force(){const b=G.bases;let r=0;if(b[0]){if(b[1]){if(b[2])r+=score(1);b[2]=1}b[1]=1}b[0]=1;return r}
function advanceHit(n){
  const b=G.bases;let r=0,nb=[0,0,0];
  if(n===4){r=b[0]+b[1]+b[2]+1;G.bases=[0,0,0];return score(r)}
  if(n===3){r=b[0]+b[1]+b[2];G.bases=[0,0,1];return score(r)}
  if(n===2){r=b[1]+b[2];if(b[0]){if(rnd()<.4)r++;else nb[2]=1}nb[1]=1;G.bases=nb;return score(r)}
  // single
  if(b[2])r++;
  if(b[1]){if(rnd()<.6)r++;else nb[2]=1}
  if(b[0]){if(!nb[2]&&rnd()<.3)nb[2]=1;else nb[1]=1}
  nb[0]=1;G.bases=nb;return score(r);
}

function shortRes(p,big){
  if(p.kind==='K')return p.look?'見三振':'空三振';
  if(p.kind==='BB')return '四球'; if(p.kind==='hbp')return '死球';
  if(p.kind==='foulout')return 'ファ飛';
  const x=p.bip, f={P:'投',C:'捕','1B':'一','2B':'二',SS:'遊','3B':'三',LF:'左',CF:'中',RF:'右'};
  if(x.res==='HR')return '本塁打'; if(x.res==='3B')return '三塁打'; if(x.res==='2B')return '二塁打';
  if(x.res==='IFH')return '内野安';
  if(x.res==='1B')return '安打';
  if(big==='ゲッツー！')return f[x.fielder]+'併殺';
  return f[x.fielder]+{GO:'ゴロ',LO:'直',PO:'飛',FO:'飛'}[x.res];
}
// CPUの盗塁（自分が投げているとき）：一塁の走者（足に自信のある選手）が投げる前に走るか決め、投げた球の球速とこちらの捕手の守備で成否が決まる
const myCatcherDef=()=>typeof PEN!=='undefined'&&PEN&&PEN.teams&&G.pen&&!G.pen.wbc&&!G.pen.allstar&&typeof catcherDef==='function'?catcherDef(PEN.teams[PEN.team]):50;
function r1Update(done,b){
  const onFirst=done.kind==='BB'||done.kind==='hbp'||(done.bip&&!done.bip.out&&(done.bip.res==='1B'||done.bip.res==='IFH'));
  if(onFirst&&G.bases[0]) G.r1={spd:b.speed,name:b.name,tried:false}; else if(!G.bases[0]) G.r1=null;
}
function cpuStealDecide(){
  const R=G.r1; if(!R||R.tried||!G.bases[0]||G.bases[1]||G.outs>=2||typeof cpuStealP!=='function') return null;
  if(cpuStealP(R.spd,myCatcherDef(),136)<0.7) return null;   // 自信がなければ走らない
  if(rnd()>(R.spd-60)*0.008) return null;
  R.tried=true; return {R};
}
function cpuStealResolve(stl,p){
  if(p.kind==='foul'||p.kind==='foulout'||!G.bases[0]||G.bases[1]) return '';
  const cd=myCatcherDef(), pr=clamp(cpuStealP(stl.R.spd,cd,p.speed)+(p.kind==='swing'?0.03:0),0.05,0.97), ok=rnd()<pr;
  G.bases[0]=0; G.r1=null;
  let msg;
  if(ok){ G.bases[1]=1; msg=`一塁走者 ${stl.R.name} が二盗成功`; }
  else { G.outs++; G.st.outs++; C.outs++; msg=`一塁走者 ${stl.R.name} の盗塁を阻止！`; }   // 盗塁死のアウトも投球回に入れる
  addLog(`<div>🏃 ${msg}（${p.speed}km/h・捕手の守備${Math.round(cd)}）</div>`);
  return msg;
}
function endAB(p){
  const b=G.batter; G.abOver=true;
  const st0={...G.st}, outs0=G.outs, runs0=G.runs;
  G.st.bf++;
  let big,sub,cls,extra='';
  if(p.kind==='K'){
    G.outs++;G.st.k++;cls='k';big='三振！';sub=p.look?'見逃し三振':'空振り三振';
  }else if(p.kind==='BB'||p.kind==='hbp'){
    G.st.bb++;cls='bb';big=p.kind==='hbp'?'デッドボール':'フォアボール';sub=p.kind==='hbp'?'死球で出塁':'四球で出塁';
    const r=force(); if(r)extra=`押し出しで${r}点`;
  }else if(p.kind==='foulout'){
    G.outs++;cls='out';big=p.fielder+'ファウルフライ';sub='ファウルゾーンで捕球';
  }else{ // bip
    const x=p.bip;cls=x.cls;big=x.big;sub=x.text;
    if(!x.out){
      G.st.hits++; if(x.res==='HR')G.st.hr++;
      const r = x.res==='IFH'? force() : advanceHit(x.bases);
      if(r)extra=`${r}点が入った`;
    }else{
      if(x.res==='GO' && G.bases[0] && G.outs<2 && rnd()< 0.55-b.speed/400){
        G.outs+=2; G.bases[0]=0; big='ゲッツー！'; sub=x.text+' → 併殺打';
        if(G.outs<3&&G.bases[2]&&rnd()<.4){G.bases[2]=0;score(1);extra='三塁走者が生還'}
      }else{
        G.outs++;
        if(G.outs<3){
          if(x.res==='GO'){ // 進塁打
            if(G.bases[2]&&rnd()<.45){G.bases[2]=0;score(1);extra='三塁走者が生還'}
            if(G.bases[1]&&!G.bases[2]&&rnd()<.5){G.bases[1]=0;G.bases[2]=1}
            if(G.bases[0]&&!G.bases[1]){G.bases[0]=0;G.bases[1]=1}
          }
          if(x.of && G.bases[2] && rnd()<.75){G.bases[2]=0;score(1);extra='犠牲フライで1点'}
        }
      }
    }
  }
  b.res.push(shortRes(p,big));
  // 球種ごとの奪三振・被安打（年末の能力変化に使う）
  if(G.pen){ const lp=G.ab.pitches[G.ab.pitches.length-1]; if(lp&&G.st.byType&&G.st.byType[lp.pt]){ const e=G.st.byType[lp.pt];
    if(p.kind==='K') e.k++; if(p.kind==='bip'&&!p.bip.out) e.h++; } }
  G.lastBIP = (p.kind==='bip'||p.kind==='foulout') ? {kind:p.kind==='foulout'?'foulout':p.bip.kind,side:p.bip?p.bip.side:'center',fielder:p.kind==='foulout'?{キャッチャー:'C',ファースト:'1B',サード:'3B'}[p.fielder]:p.bip.fielder,res:p.kind==='foulout'?'FF':p.bip.res,label:big,q:p.bip?p.bip.q:0,seed:rnd()} : null;
  if(G.lastBIP && typeof setView==='function') setView('ground',true);   // 打球はグラウンド画面で見せる
  const lp=G.ab.pitches[G.ab.pitches.length-1];
  const lab=npbLabel(p,big);
  if(G.lastBIP) G.lastBIP.label=lab;
  setResult(RES_CLS[cls]||cls,lab,(lp?`${lp.speed}km/h ${lp.pt}、`:'')+sub+'、'+runnersText()+(extra?`／<b style="color:var(--red)">${extra}</b>`:''),b.order);
  addLog(`<div>　結果：<b>${big}</b>${extra?' ('+extra+')':''}</div>`);
  // 狙い公開
  $('reveal').innerHTML=`<div class="reveal">🔍 この打者の狙い：<b>${b.target.label}</b>／打席の中では<b>${RSTYLE[b.rstyle||'none']}</b>${G.scout?`／あなたとの対戦データ<b>${G.scout.n}球</b>から傾向を読んでいる`:'／あなたとの対戦データはまだ少ない'}<br>（点線のマス。追い込まれた後はゾーン全体を待つ）</div>`;
  // 成績の加算（この試合＋通算）
  G.st.outs+=Math.min(G.outs,3)-outs0; G.st.runs+=G.runs-runs0;
  for(const k of ['bf','hits','hr','k','bb','outs','runs']) C[k]+=G.st[k]-st0[k];
  G.score.opp[G.inning-1]=(G.score.opp[G.inning-1]||0)+(G.runs-runs0);
  const onBase = p.kind==='BB'||p.kind==='hbp'||(p.kind==='bip'&&!p.bip.out);
  G.obStreak = onBase ? G.obStreak+1 : 0;
  $('throw').style.display='none';
  // 監督の判断：降板させるか
  let why=null;
  if(G.pen && G.pen.tryout){
    // トライアウト：1イニング投げ終えたら（または大量失点で）そこで終わり
    if(G.outs>=3 || (G.st.runs>=5 && rnd()<0.8)){ G.exit={lead:0,outs:G.st.outs,lost:false,tied:false,atInnEnd:G.outs>=3}; if(G.outs<3){ G.pulled='ここまで'; addLog(`<div class="pull">🔁 ${G.st.runs}失点。審査はここまで</div>`); } renderAll(true); finishGame(); save(); return; }
  }else if(G.pen && G.pen.kind!=='start'){
    // 中継ぎ・抑え：1イニングを投げ終えたら交代（9回以降リードして終われば試合終了）。打ち込まれたら途中で交代
    if(G.outs>=3 && !(G.inning>=INNINGS && myTot()>oppTot())) why='役目を終えて交代';
    else if(G.outs<3 && G.st.runs-G.innRuns0>=3 && rnd()<0.7) why=`この回${G.st.runs-G.innRuns0}失点`;
  }else why = (G.outs>=3 && G.inning>=INNINGS) ? null : managerCheck();   // 9回以降の3アウト目では代えない
  if(why){
    G.pulled=why; G.exit={lead:myTot()-oppTot(),outs:G.st.outs,lost:false,tied:false,atInnEnd:G.outs>=3};
    addLog(`<div class="pull">🔁 降板：${why}（${fmtIP(G.st.outs)}回 ${G.st.pitches}球 失点${G.st.runs}）</div>`);
    $('next').textContent='降板… 試合の続きを見る';
  }else if(G.outs>=3){
    $('next').textContent='チェンジ（その裏の攻撃へ）';
  }else $('next').textContent='次の打者へ';
  $('next').style.display='';
  renderAll(true);
  if(why) pullWait(why);   // 降板：結果を見せてから、投げられないまま1.5秒後に降板の表示
  save();
}
// 降板の演出：投げた球の結果を出したまま「投げる」を押せなくして、1.5秒後に降板を表示する
let pullTimer=null;
const PULL_WAIT=1500;
function pullWait(why){
  const t=$('throw'), n=$('next');
  t.style.display=''; t.disabled=true; t.textContent='監督がベンチを出た…';
  n.style.display='none';
  clearTimeout(pullTimer);
  pullTimer=setTimeout(()=>{
    pullTimer=null;
    t.textContent='投げる'; t.style.display='none'; n.style.display='';
    if(typeof showPulled==='function' && (typeof SCREEN==='undefined'||SCREEN==='game') && (typeof PB==='undefined'||!PB) && G && G.pulled && !G.over) showPulled(why);
  },PULL_WAIT);
}

let busy=false;   // 投球アニメーション中
function throwPitch(){
  if(G.abOver||busy)return;
  if(!sel){ if(typeof warnNoCourse==='function')warnNoCourse(); return; }
  if(!REP.includes(ptype)) ptype=REP[0];
  const loc=decideLoc(sel[0],sel[1]);
  if(typeof animatePitch==='function'){
    busy=true; renderAll();
    animatePitch(loc.r,loc.c,ptype,()=>{busy=false;resolvePitch(loc)});
  }else resolvePitch(loc);
}
function resolvePitch(loc){
  const r=loc.r0, c=loc.c0; const ab=G.ab, b=G.batter;
  if(!ab||G.abOver) { renderAll(); return; }
  const sit=sitOf(ab);
  const stl=cpuStealDecide();   // 一塁の走者が走るか（投げる前に決まる）
  const p=simulatePitch(loc.r,loc.c,ptype,loc.note);
  const rec={h:b.hand,s:sit,pt:ptype,r:p.r,c:p.c,z:p.inZone?1:0,who:vsKey(b)};
  G.phist.push(rec); aggAdd(C.agg,rec);   // 配球の記録（この試合＋通算）
  { const A=vsAggOf(b); if(A){ aggAdd(A,rec); if(A.n%50===0) vsTrim(); } }   // この打者との対戦データ（打者ごとの傾向読みに使う）
  G.st.pitches++; C.pitches++; G.hist.push(ptype); if(G.hist.length>60)G.hist.shift();
  ab.pitches.push(p);
  if(G.pen){ const T=G.st.byType||(G.st.byType={}), e=T[ptype]||(T[ptype]={n:0,k:0,wh:0,h:0}); e.n++; if(p.kind==='swing') e.wh++; }
  const n=ab.pitches.length;
  let line=`${n}球目 ${ptype}・${courseName(r,c,b.hand)}${p.note} → `;
  let done=null;
  if(p.kind==='ball'){ab.balls++;line+='ボール';if(ab.balls>=4)done={kind:'BB'}}
  else if(p.kind==='hbp'){line+='デッドボール';done={kind:'hbp'}}
  else if(p.kind==='look'){ab.strikes++;line+='見逃しストライク';if(ab.strikes>=3)done={kind:'K',look:true}}
  else if(p.kind==='swing'){ab.strikes++;line+='空振り';if(ab.strikes>=3)done={kind:'K'}}
  else if(p.kind==='foul'){if(ab.strikes<2)ab.strikes++;line+=p.text}
  else if(p.kind==='foulout'){line+=p.text;done=p}
  else {line+=p.bip.cls==='out'?p.bip.text:'<b>'+p.bip.big+'</b>';done=p}
  line+=` <span style="color:var(--mute);font-size:12px">［読み:${p.guess}${['','△','◎'][p.gMatch]}${p.readCell?(p.inZone?'・コースを張られた':'・見極められた'):''}${p.abRead?(p.inZone?'・打席内で張られた':'・打席内で見極められた'):''}］</span>`;
  addLog(`<div>${line}</div>`);
  if(done){ endAB(done); r1Update(done,b); }
  else{
    const sm=stl?cpuStealResolve(stl,p):'';
    const cls={ball:'cb',hbp:'cb',look:'cs',swing:'cs',foul:'cf'}[p.kind];
    setResult(cls,p.kind==='foul'?'ファウル':p.text,`${p.speed}km/h ${ptype}、${courseName(p.r,p.c,b.hand)}${p.note}${sm?'／'+sm:''}`,b.order);
    renderAll();
    save();
  }
}

/* ========= 味方チーム・自動で進む攻撃 ========= */
function genTeam(){
  const pat=pick(Object.keys(LINEUPS)), hand=pick(Object.keys(HANDS)), used=new Set(G?G.lineup.map(b=>b.name):[]);
  const lineup=LINEUPS[pat].slots.map((t,i)=>{const b=genBatter(t,HANDS[hand].pL,used);
    return {order:i+1,name:b.name,type:b.type,hand:b.hand,avg:b.avg,hrRate:b.hrRate,power:b.power,contact:b.contact,speed:b.speed,eye:b.eye,res:[]}});
  return {name:LINEUPS[pat].name,hand:HANDS[hand].name,lineup,order:-1};
}
const sumN=a=>a.reduce((t,x)=>t+(typeof x==='number'?x:0),0);
const myTot=()=>sumN(G.score.my), oppTot=()=>sumN(G.score.opp);
// 1打席の簡易シミュレーション（自動で進むイニング用）。q>1で打者有利
function simPA(b,q){
  const BT=b.type, bb=clamp(0.04+b.eye*0.0007,0.04,0.12), hr=Math.max(0,b.hrRate*q+btFx(BT,'hr')*0.4);
  const hit=clamp((b.avg-b.hrRate)*0.8*q+btFx(BT,'hit')*0.7,0.1,0.4), k=clamp(0.3-b.contact*0.0016+btFx(BT,'k'),0.08,0.35);
  const x=rnd();
  if(x<bb) return 'BB';
  if(x<bb+hr) return 'HR';
  if(x<bb+hr+hit){const y=rnd(),p3=b.speed/100*0.04,p2=Math.max(0,0.15+b.power/100*0.15+btFx(BT,'d2'));return y<p3?'3B':y<p3+p2?'2B':'1B'}
  if(x<bb+hr+hit+k) return 'K';
  return rnd()<0.5?'GO':'FO';
}
// 半イニングを自動で進める。needToWin：その点数でサヨナラ（裏の攻撃用）
function simHalf(team,outs,bases,q,needToWin){
  let runs=0,hits=0,walkoff=false; const ev=[], pas=[]; bases=bases.slice();
  const L={'1B':'ヒット','2B':'ツーベース','3B':'スリーベース','HR':'ホームラン','BB':'四球','GO':'内野ゴロ','FO':'外野フライ'};
  while(outs<3){
    team.order=(team.order+1)%team.lineup.length; const b=team.lineup[team.order];
    let r=simPA(b,q); let sc=0, dp=false, special=null;
    // 打球の方向と守備位置（表示用。自分の守備位置に飛んだヒット性の打球は好プレーでアウトになることがある）
    const pull = rnd()<0.5 ? (b.hand==='R'?'left':'right') : pick(['left','center','right']);
    const side=pull, d={left:'左',center:'中',right:'右'}[side];
    const ofF={left:'LF',center:'CF',right:'RF'}[side];
    const ifF=pick({left:['3B','SS'],center:['SS','2B','P'],right:['2B','1B']}[side]);
    const gb1=r==='1B'&&rnd()<.5;
    if(!b.isMe&&(r==='1B'||r==='2B'||r==='3B')&&typeof myFieldPos==='function'){ const mp=myFieldPos();
      if(mp){ const nf=gb1?ifF:ofF, hitMe = mp==='OF' ? (['LF','CF','RF'].includes(nf)&&rnd()<0.34) : nf===mp;
        if(hitMe&&rnd()<myFldP()){ const dive=myBtype()==='守備職人'||rnd()<0.3; r=gb1?'GO':'FO'; special=`${POS1[nf]||''}${dive?'ダイビングキャッチ':'好捕'}（あなたの好プレー）`; G.st.gp=(G.st.gp||0)+1; } } }
    if(r==='BB'){if(bases[0]){if(bases[1]){if(bases[2])sc++;bases[2]=1}bases[1]=1}bases[0]=1}
    else if(r==='HR'){sc=bases[0]+bases[1]+bases[2]+1;bases=[0,0,0];hits++}
    else if(r==='3B'){sc=bases[0]+bases[1]+bases[2];bases=[0,0,1];hits++}
    else if(r==='2B'){sc=bases[1]+bases[2];let t=0;if(bases[0]){if(rnd()<.4)sc++;else t=1}bases=[0,1,t];hits++}
    else if(r==='1B'){sc=bases[2];const nb=[1,0,0];if(bases[1]){if(rnd()<.6)sc++;else nb[2]=1}if(bases[0]){if(!nb[2]&&rnd()<.3)nb[2]=1;else nb[1]=1}bases=nb;hits++}
    else if(r==='K'){outs++}
    else if(r==='GO'){if(bases[0]&&outs<2&&rnd()<.35){outs+=2;bases[0]=0;dp=true}else{outs++;if(outs<3&&bases[2]&&rnd()<.4){sc++;bases[2]=0}}}
    else {outs++;if(outs<3&&bases[2]&&rnd()<.5){sc++;bases[2]=0}}
    if(b.isMe&&G&&G.tw&&typeof twAutoRec==='function') twAutoRec(r,sc,dp);   // 二刀流：おまかせの打席も成績に
    else if(b.res) b.res.push({'1B':'安打','2B':'二塁打','3B':'三塁打','HR':'本塁打','BB':'四球','K':'三振','GO':dp?'併殺':'ゴロ','FO':'飛'}[r]);
    if(r==='1B'||r==='2B'||r==='3B'||r==='HR'||sc) ev.push(`${b.order}番${b.name} ${r==='FO'&&sc?'犠牲フライ':L[r]||''}${sc?`（${sc}点）`:''}`);
    runs+=sc;
    // 1打席ぶんの表示用データ（結果・打球・その時点のアウトと走者）
    let label, bip=null, hit=false;
    if(r==='HR'){label=d+'本塁打';hit=true;bip={kind:'fly',side,res:'HR'}}
    else if(r==='3B'){label=d+'3塁打';hit=true;bip={kind:'liner',side,res:'3B'}}
    else if(r==='2B'){label=d+'2塁打';hit=true;bip={kind:'liner',side,res:'2B'}}
    else if(r==='1B'){label=d+'安';hit=true;bip={kind:gb1?'ground':'liner',side,res:'1B'}}
    else if(r==='BB'){label='四球';hit=true}
    else if(r==='K'){label=rnd()<.35?'見逃し三振':'空振り三振'}
    else if(r==='GO'){label=POS1[ifF]+(dp?'併殺打':'ゴロ');bip={kind:'ground',side,res:'GO',fielder:ifF}}
    else {label=POS1[ofF]+(sc?'犠飛':'飛');bip={kind:'fly',side,res:'FO',fielder:ofF}}
    if(special){ label=special; if(bip) bip.fielder=gb1?ifF:ofF; ev.push(`${b.order}番${b.name} ${special}`); }
    if(bip) bip.seed=rnd();
    // 足に自信のあるCPUの走者は盗塁する（一塁に出た打者が、二塁が空いていて2アウト未満のとき）
    if(!b.isMe&&(r==='1B'||r==='BB')&&bases[0]&&!bases[1]&&outs<2&&typeof cpuStealP==='function'&&cpuStealP(b.speed,50,136)>=0.7&&rnd()<(b.speed-60)*0.03){
      if(rnd()<cpuStealP(b.speed,50,136)){ bases[0]=0; bases[1]=1; label+='・二盗成功'; ev.push(`${b.order}番${b.name} 二盗成功`); }
      else { bases[0]=0; outs++; label+='・盗塁失敗'; ev.push(`${b.order}番${b.name} 盗塁失敗`); } }
    pas.push({order:b.order,name:b.name,hand:b.hand,avg:b.avg,hrRate:b.hrRate,label:label+(sc?`（${sc}点）`:''),hit,bip,outs:Math.min(outs,3),bases:bases.slice(),runsSoFar:runs});
    if(needToWin!=null&&runs>=needToWin){walkoff=true;break}
  }
  return {runs,hits,ev,walkoff,pas};
}
// 降板後の勝敗判定のため、リードの移り変わりを見ておく
function trackExit(){
  if(!G.exit) return;
  const lead=myTot()-oppTot();
  if(G.exit.lead>0&&lead<=0) G.exit.lost=true;
  if(G.exit.lead<0&&lead>=0) G.exit.tied=true;
  if(G.exit.first==null) G.exit.first=lead;
  else { if(G.exit.first>0&&lead<=0) G.exit.lost2=true; if(G.exit.first<0&&lead>=0) G.exit.tied2=true; }
}
// その回の裏（味方の攻撃）。試合が終わったら true
function playBottom(){
  const i=G.inning-1, my=myTot(), opp=oppTot();
  G.lastBottom=null;
  if(G.inning>=INNINGS && my>opp){ G.xBottom=true; return true; }   // 9回以降、表終了でリードしていれば裏はなし
  const need = G.inning>=INNINGS ? opp-my+1 : null;
  const r=simHalf(G.myTeam,0,[0,0,0],(G.inning>=7?G.oppPen[(G.inning-7)%G.oppPen.length]:G.oppPitcher).q,need);
  G.score.my[i]=r.runs; G.hitsMy+=r.hits;
  const txt = r.runs? `${r.runs}点${r.walkoff?'（サヨナラ！）':''}` : (r.hits?`${r.hits}安打も無得点`:'三者凡退級で無得点');
  G.lastBottom={inning:G.inning,runs:r.runs,txt,ev:r.ev,walkoff:r.walkoff,pas:r.pas,scoreBefore:{opp:G.score.opp.slice(),my:G.score.my.slice(0,i)},hitsBefore:[G.st.hits+G.hitsOpp,G.hitsMy-r.hits]};
  addLog(`<div class="mybat">⚾ ${G.inning}回裏 味方の攻撃：${txt}${r.ev.length?'<br>　'+r.ev.join(' / '):''}</div>`);
  trackExit();
  const my2=myTot();
  if(G.inning>=INNINGS){
    if(my2!==opp) return true;
    if(G.inning>=MAX_INN) return true;   // 引き分け
  }
  return false;
}
// 降板後：残りをリリーフと両チームの攻撃で自動で進める
function runRest(){
  // 残りを全部決めてから、味方の攻撃は1打席ずつ、リリーフは回ごとにまとめて見せる
  const T={lineup:G.lineup,order:G.order}, Q=[]; let pk=0;
  const relief=(r,base,hitsBase,pit)=>{
    addLog(`<div class="relief">🧢 ${G.inning}回表 ${pit.name}：${r.runs?r.runs+'失点':'無失点'}${r.ev.length?'<br>　'+r.ev.join(' / '):''}</div>`);
    // 観戦：相手の攻撃も1打席ずつ
    const i=G.inning-1; let h=0;
    r.pas.forEach(p=>{ const opp=G.score.opp.slice(); opp[i]=base+p.runsSoFar; if(p.hit&&p.label!=='四球')h++;
      Q.push({...p,half:'top',pitcher:pit,inning:G.inning,score:{opp,my:G.score.my.slice()},hits:[hitsBase+h,G.hitsMy]}); });
  };
  if(G.outs<3){
    const pit=G.bullpen[pk++%G.bullpen.length], base=G.score.opp[G.inning-1], hb=G.st.hits+G.hitsOpp;
    const r=simHalf(T,G.outs,G.bases,pit.q,null);
    G.score.opp[G.inning-1]+=r.runs; G.hitsOpp+=r.hits; relief(r,base,hb,pit);
    G.outs=3; trackExit();
  }
  while(true){
    const over=playBottom();
    if(G.lastBottom) Q.push(...bottomQueue(G.lastBottom));
    if(over) break;
    G.inning++; G.score.opp[G.inning-1]=0;
    const pit=G.bullpen[pk++%G.bullpen.length], hb=G.st.hits+G.hitsOpp;
    const r=simHalf(T,0,[0,0,0],pit.q,null);
    G.score.opp[G.inning-1]=r.runs; G.hitsOpp+=r.hits; relief(r,0,hb,pit);
    trackExit();
  }
  G.order=T.order; G.restDone=true;
  finishGame(true);
  return Q;
}
/* ---- 投げている途中から「ここからスキップ」 ----
   残りの自分の登板を今の成績に応じて自動で決め、そのあとは観戦（runRest）へ */
function myQ(){
  // 1より小さいほど打たれにくい。ペナントは評価から、通常モードは通算防御率から
  if(typeof PEN!=='undefined'&&PEN&&G.pen&&typeof effERA==='function') return clamp(effERA()/3.9,0.72,1.35);
  if(C.outs>=30) return clamp((C.runs*27/C.outs)/3.9*0.5+0.5,0.75,1.3);
  return 1;
}
function skipMyOuting(){
  if(!G||G.over||busy||G.pulled) return null;
  // その裏の攻撃まで終わっている（読み込み直後など）なら、次の回に進めてから
  if(G.outs>=3 && G.bottomDone===G.inning){
    if(G.bottomOver){ finishGame(true); return []; }
    G.inning++; G.score.opp[G.inning-1]=0; G.outs=0; G.bases=[0,0,0]; G.innRuns0=G.st.runs; G.abOver=true;
  }
  const q=myQ(), Q=[], relief=G.pen&&G.pen.kind!=='start';
  const me={isMe:true,isP:true,name:G.pname,num:MYNUM,hand:PHAND,velo:PVELO,types:REP.slice(),levs:{...PLEV}};
  // 先発：あと何アウト投げるか（評価が高いほど長く）
  const target = relief ? null : clamp(Math.round(18+(q<1?(1-q)*25:-(q-1)*25)+(rnd()-.5)*6),G.st.outs+1,27);
  const T={lineup:G.lineup,order:G.abOver?G.order:G.order-1};   // 打席の途中ならその打者からやり直し
  let over=false;
  while(true){
    if(G.outs<3){
      const i=G.inning-1, base=G.score.opp[i]||0, hb=G.st.hits+G.hitsOpp, o0=G.outs;
      const r=simHalf(T,G.outs,G.bases,q,null);
      // 自分の成績に加える
      const cnt=f=>r.pas.filter(f).length;
      const add={outs:3-o0,runs:r.runs,hits:r.hits,hr:cnt(x=>/本塁打/.test(x.label)),bb:cnt(x=>x.label==='四球'),k:cnt(x=>/三振/.test(x.label)),bf:r.pas.length};
      add.pitches=Math.round(add.bf*3.9+ri(-3,3));
      for(const k in add){ G.st[k]+=add[k]; C[k]+=add[k]; }
      if(G.pen && typeof estByType==='function') mergeByType(G.st.byType||(G.st.byType={}),estByType(add));
      G.runs+=r.runs; G.score.opp[i]=base+r.runs; G.outs=3; G.bases=[0,0,0];
      let h=0;
      r.pas.forEach(p=>{ const opp=G.score.opp.slice(); opp[i]=base+p.runsSoFar; if(p.hit&&p.label!=='四球')h++;
        Q.push({...p,half:'top',pitcher:me,inning:G.inning,score:{opp,my:G.score.my.slice()},hits:[hb+h,G.hitsMy]}); });
      addLog(`<div class="relief">⏩ ${G.inning}回表（おまかせ）：${r.runs?r.runs+'失点':'無失点'}${r.ev.length?'<br>　'+r.ev.join(' / '):''}</div>`);
    }
    // 交代するか
    const stop = relief ? !(G.inning>=INNINGS && myTot()>oppTot()) :
      (G.st.outs>=target || G.st.runs>=6 || G.st.pitches>=118) && !(G.inning>=INNINGS && myTot()>oppTot());
    if(stop) break;
    // その裏
    over=playBottom(); if(G.lastBottom) Q.push(...bottomQueue(G.lastBottom));
    G.bottomDone=G.inning; G.bottomOver=over;
    if(over) break;
    G.inning++; G.score.opp[G.inning-1]=0; G.outs=0; G.bases=[0,0,0]; G.innRuns0=G.st.runs;
  }
  G.order=T.order; G.abOver=true;
  if(over){ finishGame(true); return Q; }
  // ここで交代 → 残りはリリーフと両チームの攻撃
  G.pulled='ここから先はおまかせ（スキップ）'; G.exit={lead:myTot()-oppTot(),outs:G.st.outs,lost:false,tied:false,atInnEnd:G.outs>=3};
  addLog(`<div class="pull">⏩ ${fmtIP(G.st.outs)}回 ${G.st.pitches}球 失点${G.st.runs}で交代（おまかせ）</div>`);
  Q.push(...runRest());
  return Q;
}

// 味方の攻撃（1回分）を1打席ずつの表示データにする
function bottomQueue(lb){
  const i=lb.inning-1;
  return lb.pas.map(p=>{
    const my=lb.scoreBefore.my.slice(); my[i]=p.runsSoFar;
    const hitsSoFar=lb.pas.slice(0,lb.pas.indexOf(p)+1).filter(x=>x.hit&&x.label!=='四球').length;
    return {...p,half:'bottom',pitcher:lb.inning>=7?G.oppPen[(lb.inning-7)%G.oppPen.length]:G.oppPitcher,inning:lb.inning,score:{opp:lb.scoreBefore.opp,my},hits:[lb.hitsBefore[0],lb.hitsBefore[1]+hitsSoFar]};
  });
}
// 監督の判断（打席ごと）。降板理由を返す
function managerCheck(){
  const pc=G.st.pitches, ra=G.st.runs, inn=G.st.runs-G.innRuns0, lead=myTot()-oppTot();
  if(G.pen&&G.pen.allstar){ if(G.outs>=3&&G.inning>=3) return 'オールスターの先発は3回まで'; if(ra>=5) return `${ra}失点`; return null; }
  const leash = lead>=5?2 : lead>=3?1 : 0;   // 大量リードなら長めに投げさせる
  const onb=G.bases.filter(Boolean).length;
  const lim = G.abil ? Math.round(60+G.abil.stamina*0.72) : 130;   // スタミナで球数の限界が変わる
  if(pc>=lim) return `球数が${pc}球に達した`;
  if(pc>=lim-18 && (onb||G.outs>=3) && rnd()<0.55) return `球数${pc}球、疲れが見えた`;
  if(pc>=lim-30 && G.inning>=7 && Math.abs(lead)<=2 && onb>=1 && rnd()<0.35) return `終盤の勝負どころで継投`;
  if(ra>=7+leash) return `${ra}失点で試合を壊した`;
  if(ra>=5+leash && G.inning<=5 && rnd()<0.6) return `序盤で${ra}失点`;
  if(inn>=4+leash && rnd()<0.75) return `この回${inn}失点`;
  if(G.obStreak>=4 && rnd()<0.5) return `${G.obStreak}者連続で出塁を許した`;
  if(G.st.bb>=6 && rnd()<0.5) return `四死球${G.st.bb}個と制球が定まらない`;
  return null;
}

function finishGame(noOverlay){
  G.over=true; C.games++;
  const st=G.st, my=myTot(), opp=oppTot();
  const res = my>opp?'W':my<opp?'L':'T';
  const cg = !G.pulled && !(G.pen && G.pen.kind!=='start');   // 途中から投げた試合は完投にしない
  let dec='－';
  if(cg){ dec = res==='W'?'勝':res==='L'?'負':'－'; }
  else {
    // 回の終わりで降りたときは、その裏の攻撃が終わった時点の点差で判断（その裏に勝ち越せば勝ち投手の権利）
    const ie=G.exit.atInnEnd&&G.exit.first!=null;
    const L=ie?G.exit.first:G.exit.lead, lost=ie?!!G.exit.lost2:G.exit.lost, tied=ie?!!G.exit.tied2:G.exit.tied;
    if(res==='W' && L>0 && !lost && G.exit.outs>=15) dec='勝';
    else if(res==='L' && L<0 && !tied) dec='負';
  }
  if(G.pen && G.pen.kind!=='start'){
    // 中継ぎ・抑えの勝敗／セーブ／ホールド
    const L0=G.pen.L0, L1=G.exit?G.exit.lead:my-opp;
    dec='－';
    if(res==='W' && !G.pulled && G.pen.kind==='closer' && L0>=1 && L0<=3) dec='S';
    else if(res==='L' && L1<0 && L0>=0 && !(G.exit&&G.exit.tied)) dec='負';
    else if(res==='W' && L0<=0 && G.exit && G.exit.first>0 && !G.exit.lost2) dec='勝';
    else if(L0>0 && L1>0 && G.pulled) dec='H';
  }
  if(dec==='勝')C.w++; if(dec==='負')C.l++;
  if(cg){C.cg++; if(opp===0)C.shutouts++;}
  G.result={res,dec,cg};
  const resTxt={W:'勝利',L:'敗戦',T:'引き分け'}[res];
  addLog(`<div class="chg">― 試合終了　相手 ${opp} − ${my} 味方（${resTxt}）${dec==='勝'?'／勝利投手':dec==='負'?'／敗戦投手':''} ―</div>`);
  // 試合記録
  const gameRates=toRates(buildScout(G.phist));
  RECS.unshift({
    date:new Date().toISOString(), hand:PHAND, rep:REP.slice(),
    opp:`${LINEUPS[OPP.pattern].name}（${HANDS[OPP.hand].name}）`, mine:`${G.myTeam.name}（${G.myTeam.hand}）`,
    score:{opp:G.score.opp.slice(),my:G.score.my.slice(),x:G.xBottom,names:G.names,h:[G.st.hits+G.hitsOpp,G.hitsMy]}, final:[opp,my], res, dec, cg, pulled:G.pulled,
    line:{...st}, era:fmtRate(st.runs,st.outs),
    bat:G.lineup.map(b=>({o:b.order,n:b.name,h:b.hand,t:b.type,r:b.res.slice()})),
    report:scoutReport(gameRates), careerReport:scoutReport(toRates(C.agg)),
  });
  if(RECS.length>30) RECS.length=30;
  const decTxt = dec==='勝'?'勝利投手':dec==='負'?'敗戦投手':dec==='S'?'セーブ':dec==='H'?'ホールド':'勝敗つかず';
  $('reveal').innerHTML=`<div class="reveal" style="background:#10233a;border-color:#35588d;color:#cfe3ff">🏁 試合終了　相手 <b>${opp}</b> − <b>${my}</b> 味方（${resTxt}）<br>${fmtIP(st.outs)}回 ${st.pitches}球 被安打${st.hits} 奪三振${st.k} 与四死球${st.bb} 失点${st.runs}　<b>${decTxt}</b>${cg?'（完投）':''}<br>この試合の記録は「記録」タブでいつでも見られます</div>`;
  $('throw').style.display='none'; $('next').style.display='';
  $('next').textContent=G.pen&&G.pen.tryout?'トライアウトの結果へ':G.pen?'日程に戻る':'次の試合へ（同じ持ち球）';
  if(G.pen&&G.pen.tryout) $('reveal').innerHTML=`<div class="reveal" style="background:#10233a;border-color:#35588d;color:#cfe3ff">🏁 トライアウト終了　${fmtIP(st.outs)}回 ${st.pitches}球 被安打${st.hits} 奪三振${st.k} 与四死球${st.bb} 失点${st.runs}</div>`;
  if(G.pen && typeof penGameDone==='function') penGameDone();
  if(!noOverlay && typeof showFinal==='function') showFinal(res,dec);
}

function goNext(){
  if(G.over){ if(G.pen && typeof penBack==='function'){ penBack(); return; } showScreen('mode'); return; }   // 1試合モードは無し
  if(G.pulled && !G.restDone && G.tw && typeof twRestFirst==='function'){ twRestFirst(); return; }   // 二刀流：降板しても打席は自分で打つ
  if(G.pulled && !G.restDone){
    const Q=runRest(); save();
    playBack(Q,()=>{ renderAll(); if(typeof showFinal==='function') showFinal(G.result.res,G.result.dec); });
    return;
  }
  if(G.outs>=3){
    // その裏の味方の攻撃（同じ回を二度やらないように記録しておく）
    // 二刀流：自分の打席がある裏の攻撃は、自分で打つ
    if(G.tw&&G.bottomDone!==G.inning&&typeof twBottomStart==='function'){
      if(G.inning>=INNINGS&&myTot()>oppTot()){ G.xBottom=true; G.bottomDone=G.inning; G.bottomOver=true; afterBottom(); return; }
      const Q=twBottomStart(); save(); playBack(Q,batAfterPlay); return;
    }
    if(G.bottomDone!==G.inning){
      addLog(`<div class="chg">― ${G.inning}回表終了　相手 ${oppTot()} − ${myTot()} 味方 ―</div>`);
      G.bottomOver=playBottom(); G.bottomDone=G.inning; save();
    }
    const Q=G.lastBottom?bottomQueue(G.lastBottom):[];
    playBack(Q,afterBottom);
    return;
  }
  nextBatter();
  save();
}
function afterBottom(){
  if(G.bottomOver){ finishGame(); renderAll(); save(); return; }
  if(G.pulled&&G.tw&&typeof twRestTop==='function'){ twRestTop(); return; }   // 降板後の二刀流：次の回の表はリリーフ、裏は自分で打つ
  {
    G.inning++; G.outs=0; G.bases=[0,0,0]; G.score.opp[G.inning-1]=0; G.innRuns0=G.st.runs;
    // イニングごとに、この試合の配球の傾向（相手ベンチが見ているもの）を出す
    const Sg=toRates(buildScout(G.phist)), rep=scoutReport(Sg);
    if(rep.length) addLog(`<div class="scout">📋 この試合の配球の傾向（${Sg.n}球）<br>・${rep.join('<br>・')}</div>`);
    nextBatter();
    if(typeof showScout==='function') showScout(rep);
    save();
  }
}
// 自動で進む場面の表示（画面側が無いときはすぐ次へ）
function playBack(Q,done){ if(typeof playBackUI==='function') playBackUI(Q,done); else done(); }

