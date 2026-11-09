
/* ================================================================
   球団の選手（ロースター）：野手は守備位置ごと、投手は先発・リリーフ
   ・スタメンは守備位置ごとに「能力＋監督の評価（調子）」で決まる（野手のあなたもここで競う）
   ・毎年ドラフトで新しい選手が入る（4＋チーム順位 人：投手1〜5・野手1〜5）。年齢で成長・衰え・引退
   ================================================================ */
const POSS=['C','1B','2B','3B','SS','OF'];   // 守備位置（外野はまとめて3枠）
const POS_JP={C:'捕手','1B':'一塁手','2B':'二塁手','3B':'三塁手',SS:'遊撃手',OF:'外野手',DH:'指名打者'};
const POS_S={C:'捕',  '1B':'一','2B':'二','3B':'三',SS:'遊',OF:'外',DH:'指'};
const SLOTS=['C','1B','2B','3B','SS','OF','OF','OF','DH'];
const DEF_W={C:0.5,SS:0.45,'2B':0.35,'3B':0.25,OF:0.25,'1B':0.1,DH:0};   // 守備の重み（捕手・遊撃ほど守備が大事）
const hitScore=f=>f.m*0.35+f.p*0.35+f.s*0.1+f.e*0.2;
const posValue=(f,pos)=>hitScore(f)+(f.d-50)*DEF_W[pos]*0.8+(f.pf||0);   // pf＝監督の評価（調子）
const fType=f=>f.btype||(f.btype=cpuTypeOf(f,true));   // 打者タイプ（シーズン開始時に assignTypesAll で付け直す）
let FID=0;
/* ---- 野手の能力の目盛り：表示（プロのスタメン平均70前後）⇔ 試合での強さ（内部値・プロ平均50） ----
   CPUの野手は内部値で持ち、表示するときだけ abShow で直す。自分の能力は表示の目盛りで持ち、試合では abPerf で内部値にする
   36までは同じ。36〜70は伸びが小さく（70で内部値50＝プロ平均）、70〜100は伸びが大きい（100で100） */
function abPerf(v){ v=v??50; return v<=36?v : v<=70?36+(v-36)*14/34 : 50+(v-70)*50/30; }
function abShow(o){ o=o??50; return o<=36?o : o<=50?36+(o-36)*34/14 : 70+(o-50)*30/50; }
const abS=o=>Math.round(abShow(o));
function perfB(a){ if(!a) return a; const o={...a}; for(const k of ['meet','power','speed','eye','def']) o[k]=Math.round(abPerf(a[k]??(k==='def'?70:50))*10)/10; return o; }
// 年齢に沿った能力：プロ平均は全能力50（27〜31歳がピーク。若手は低く、ベテランは衰える）
const AGE_ADJ=a=>a<=18?-13:a<=24?-13+(a-18)*2:a<=27?-1+(a-24)*1:a<=31?3-(a-29>0?a-29:0)*0.5:a<=33?1-(a-32):a<=40?-2-(a-34)*2:-14;
// タイプで上下（強打・巧打・俊足・守備型・バランス）。足し引きはだいたいゼロになるようにしてある
const FTYPE_W=[['power',22],['contact',22],['speed',16],['defense',16],['balance',24]];
const FTYPE_ADJ={power:{p:15,m:-4,s:-6,d:-5},contact:{m:15,p:-8,e:5,d:-2},speed:{s:18,d:4,p:-12,m:-2},defense:{d:16,p:-8,m:-4,e:-2},balance:{}};
// 野手を作る（tier＝平均からのずれ。レギュラー級はプラス、控えはマイナス）
// CPUの年齢ごとの能力（表示の値）：野手は5つの能力の合計の平均が18歳118 → 30歳290（そのあとは衰えが始まるまで横ばい）
const CPU_SUM=a=>a<=18?CPU_G.s0:a>=30?CPU_G.s1:CPU_G.s0+(a-18)*(CPU_G.s1-CPU_G.s0)/12;
const CPU_DECL_GEN=a=>a<=32?0:a===33?1.5:a===34?4:a===35?7:7+(a-35)*4;   // 作るときの衰えの目安（1能力あたり・平均）
const CPU_TIER_D=1.5;   // tier（平均からのずれ）1あたりの表示の値
// 同じ名前の選手が球界に同時にいないように：今いる選手・自分・このプレイ中に作った名前と重ならない名前を選ぶ
const NAME_MADE=new Set();
function leagueNames(){ const S=new Set(NAME_MADE); if(typeof PEN!=='undefined'&&PEN){ if(PEN.pname) S.add(PEN.pname); for(const id in (PEN.teams||{})){ const T=PEN.teams[id]; (T.F||[]).forEach(f=>{ if(f&&f.n) S.add(f.n); }); (T.P||[]).forEach(p=>{ if(p&&!p.isMe&&p.name) S.add(p.name); }); } } return S; }
function uniqName(){ const S=leagueNames(); let n=randName(), g=0; while(S.has(n)&&g++<400) n=randName(); NAME_MADE.add(n); return n; }
// 前の版のセーブ・新しいペナント：同じ名前の選手がいたら、あとの選手の名前を変える（自分の名前は変えない）
function dedupeNames(){ if(!PEN||!PEN.teams) return 0; const seen=new Set([PEN.pname]); let n=0;
  for(const id in PEN.teams){ const T=PEN.teams[id];
    (T.F||[]).forEach(f=>{ if(!f) return; if(seen.has(f.n)){ f.n=uniqName(); n++; } seen.add(f.n); NAME_MADE.add(f.n); });
    (T.P||[]).forEach(p=>{ if(!p||p.isMe) return; if(seen.has(p.name)){ p.name=uniqName(); n++; } seen.add(p.name); NAME_MADE.add(p.name); }); }
  return n; }
function genFielder(pos,age,tier){
  const mu=CPU_SUM(age)/5-CPU_DECL_GEN(age)+(tier||0)*CPU_TIER_D-CPU_G.off, r=()=>mu+(rnd()-.5)*30;   // off＝守備位置の補正・レギュラー級の多さのぶんを戻す
  const D={m:r(),p:r(),s:r(),e:r(),d:r()};
  const ta=FTYPE_ADJ[wpick(FTYPE_W)]; for(const k in ta) D[k]+=ta[k]*1.3;   // タイプで能力が偏る
  if(pos==='C'){ D.d+=12; D.s-=18; }
  if(pos==='SS'||pos==='2B'){ D.d+=10; D.s+=7; D.p-=10; }
  if(pos==='1B'){ D.p+=12; D.d-=12; }
  if(pos==='OF'&&rnd()<0.4) D.s+=12;
  const f={id:'f'+(Date.now()%1e6)+'_'+(FID++),n:uniqName(),pos,h:rnd()<0.33?'L':'R',age,pf:0,num:ri(0,99)};
  for(const k in D) f[k]=Math.round(abPerf(clamp(D[k],1,100))*10)/10;   // 試合では内部値
  if(age>=34&&rnd()<0.8) f.decl=age-ri(0,1);
  f.rec=cpuRecGen(age); f.fat=0;   // 回復力・疲労
  return f;
}
// 投手を作る（tier＝平均からのずれ）。コントロール・スタミナの平均は50、球速は年齢と質で上下
// CPUの投手：コントロール＋スタミナの合計の平均が18歳46 → 30歳134、球速の平均が18歳135 → 30歳144km/h。先発型（55%）はスタミナに大きく寄り（30歳でスタミナ100近く）、中継ぎ型はコントロール・球速に寄りがち
const CPU_PCS=a=>a<=18?CPU_G.c0:a>=30?CPU_G.c1:CPU_G.c0+(a-18)*(CPU_G.c1-CPU_G.c0)/12;
const CPU_PV=a=>a<=18?135:a>=30?144:135+(a-18)*0.75;
const CPU_PDECL=a=>a<=32?0:a===33?2:a===34?6:a===35?10:10+(a-35)*6;   // 作るときの衰えの目安（コントロール＋スタミナ）
const CPU_SP_STS=0.76, CPU_SP_GW={control:20,stamina:60};   // 先発型：コントロール＋スタミナのうちスタミナに振る割合（作るとき）・伸びるときの重み（スタミナ寄り）
const SP_STA_W=0.5;   // 先発ローテの順位で見るスタミナの重み（80を基準に1あたり0.3。60で−6・100で+6）
function genRosterPitcher(age,tier){
  const p=genPitcher(); p.name=uniqName(); p.age=age; const t=tier||0; p.prole=rnd()<0.55?'sp':'rp'; const sp=p.prole==='sp';
  const cs=CPU_PCS(age)-CPU_PDECL(age)+t*3, stS=sp?CPU_SP_STS:0.45;
  p.velo=clamp(Math.round(CPU_PV(age)-(age>=34?(age-33)*0.7:0)+t*0.35+(sp?-1:1.5)+(rnd()-.5)*14),120,VELO_MAX);
  p.stamina=clamp(Math.round(cs*stS+(rnd()-.5)*24),1,100);   // スタミナ＝投げられる球数の目安（80で約90〜120球）
  p.control=clamp(Math.round(cs*(1-stS)+(rnd()-.5)*24),1,100);
  if(age>=34&&rnd()<0.8) p.decl=age-ri(0,1);
  p.rec=cpuRecGen(age,true); p.fat=0;   // 回復力・疲労（投手は少し高め）
  p.q=pitQ(p); return p;
}
// 投手の質 q（1より小さいほど打たれにくい）：自分と同じ式の「投手の力」→ 防御率 → リーグの試合でその防御率になる q
//  リーグの試合の防御率は q に対しておよそ 3.5×e^(2(q−1))
function pitQ(p){
  const bp=(p.types||[]).filter(t=>t!=='ストレート').reduce((t,x)=>{ const L=pitLv(p,x); return t+lvPts(typeof L==='number'?L:2); },0);
  p.rn=rnOf(p.velo,p.control,p.stamina,bp);
  return clamp(1+Math.log(eraOfR(p.rn)/3.5)/2,0.6,1.6);
}
const pitScore=p=>50+(1-p.q)*120;
function newRoster(){
  const F=[], P=[];
  const ages=()=>ri(20,34);
  for(const pos of ['C','C','1B','2B','3B','SS','OF','OF','OF']) F.push(genFielder(pos,ages(),ri(2,10)));   // レギュラー級
  for(const pos of ['1B','2B','3B','SS','OF','OF','C']) F.push(genFielder(pos,ages(),ri(-10,-2)));          // 控え
  for(let i=0;i<13;i++) P.push(genRosterPitcher(ages(),i<6?ri(0,10):ri(-8,4)));
  return {F,P};
}
// 野手 → 試合で使う打者データ（打率・本塁打率・得意不得意・狙い）
function toBatter(f,order){
  const avg=clamp(0.172+f.m*0.00135+f.s*0.00035,.180,.365);
  const hrRate=typeof cpuHrRate==='function'?cpuHrRate(f.p):clamp(HR_MIN*Math.pow(HR_MAX/HR_MIN,(f.p-18)/81),HR_MIN,HR_MAX);   // 本塁打率は自分と同じパワー依存の式
  const sh=shuffle(INNER), nG=ri(1,3), nB=ri(1,2);
  return {name:f.n,num:f.num,type:fType(f),hand:f.h,power:f.p,contact:f.m,speed:f.s,eye:f.e,avg,hrRate,
    good:new Set(sh.slice(0,nG)),bad:new Set(sh.slice(nG,nG+nB)),target:genTarget(f.h),res:[],order,pos:f.pos,fid:f.id,
    appr:typeof apprOf==='function'?apprOf(fType(f),f.e):'mid'};   // 打ち方（早打ち型・粘り打ち型・スタンダード型）は打席ごとに抽選し直す（nextBatter）
}
// スタメンを決める（守備位置ごとにいちばん評価の高い選手。指名打者は残りでいちばん打てる選手）
// me：野手のあなた（このチームにいるとき）
function pickStarters(T,me,slots){
  const pool=T.F.map(f=>({f})); if(me) pool.push({f:me,me:true});
  const used=new Set(), out=[], m=T.mgr||null;   // 監督の志向で選手の見方が変わる
  for(const pos of slots||SLOTS){
    let best=null, bv=-1e9;
    const meX=pool.find(x=>x.me);
    if(meX&&!used.has(meX)&&isBat()&&PEN.bAssign&&PEN.bAssign.pos===pos){ used.add(meX); out.push({...meX,slot:pos,val:mgrPosValue(m,meX.f,pos)}); continue; }   // 打診で決まった守備位置ではスタメン
    for(const x of pool){ if(used.has(x)) continue;
      if(pos!=='DH'&&x.f.pos!==pos) continue;
      const v=mgrPosValue(m,x.f,pos); if(v>bv){ bv=v; best=x; } }
    if(!best){ for(const x of pool){ if(used.has(x)) continue; const v=hitScore(x.f)-20; if(v>bv){ bv=v; best=x; } } }   // その位置の選手がいないときは誰かが守る
    if(best){ used.add(best); out.push({...best,slot:pos,val:bv}); }
  }
  return out;
}
// 打順を組む（1番：足と選球眼、2番：ミート、3番：ミート＋パワー、4番：パワー、5番：パワー、6〜9番：残りを打力順）
// 監督の打順志向：スタンダード型／流線型（左右交互）／核弾道型（強い順）／つなぎの四番型（打率重視）／代打多用型（スタンダードの打順）
function battingOrder(st,m){
  const rest=st.slice(), take=fn=>{ let bi=0; rest.forEach((x,i)=>{ if(fn(x.f)>fn(rest[bi].f)) bi=i; }); return rest.splice(bi,1)[0]; };
  const o=new Array(9), kind=typeof mgrOrder==='function'?mgrOrder(m):'std';
  if(kind==='nuke'){ rest.sort((a,b)=>hitScore(b.f)-hitScore(a.f)); return rest; }
  if(kind==='alt'){ rest.sort((a,b)=>hitScore(b.f)-hitScore(a.f)); const out=[]; let h=null;
    while(rest.length){ let i=rest.findIndex(x=>h==null||x.f.h!==h); if(i<0) i=0; const x=rest.splice(i,1)[0]; out.push(x); h=x.f.h; } return out; }
  if(kind==='link'){ const c=f=>f.m*1.0+f.e*0.3+f.s*0.1;
    o[3]=take(c); o[2]=take(c); o[0]=take(f=>f.m*0.8+f.s*0.5+f.e*0.4); o[1]=take(c); o[4]=take(c);
    rest.sort((a,b)=>c(b.f)-c(a.f)); for(let i=5;i<9;i++) o[i]=rest.shift(); return o; }
  o[3]=take(f=>f.p*1.2+f.m*0.5); o[0]=take(f=>f.m*0.7+f.s*0.5+f.e*0.5); o[2]=take(f=>f.m*0.7+f.p*0.7);
  o[1]=take(f=>f.m*0.8+f.e*0.4+f.s*0.3); o[4]=take(f=>f.p+f.m*0.4);
  rest.sort((a,b)=>hitScore(b.f)-hitScore(a.f)); for(let i=5;i<9;i++) o[i]=rest.shift();
  return o;
}
// 投手陣：先発6人（評価順）・リリーフ
/* ---- 投手陣：先発ローテ（監督の先発起用で6〜10人）・ブルペン（1番手が抑え、上位ほど勝ちパターン） ----
   チームの投手を「投手の力（能力）・今季の成績・通算の成績・監督の見方（調子・年齢の好み・三振重視など）」で総合評価して順位をつける。自分も同じ物差し
   先発候補（スタミナ60以上。自分は先発の配置のとき）の上位がローテーション、残りはブルペン（順位順。1番手が抑え） */
const eraToR=e=>clamp(55+(5.3-e)/0.1,25,100);   // 防御率 → 投手の力と同じ目盛り
// 成績の重み：今年の成績：通算成績＝7：3（今年が30回投げるまでは成績の重みが小さい）。年の初めは去年の最後の評価（順位）を引き継ぎ、今年の登板が増えるにつれて今年の評価に移る
function pEval(o,m){
  const s=o.s, c=o.c, so=s&&s.outs||0, co=c&&c.outs||0;
  const ws=so?Math.min(1,so/90)*0.6:0, wc=co>=30?(so?ws*3/7:Math.min(1,co/450)*0.6*3/7):0;
  // 自分の成績はノルマ（防御率・WHIP・奪三振率）の達成度で、監督の性格で重みが変わる。CPUは被安打・四球の記録がないので防御率で（奪三振至上主義は奪三振率も）
  const pf=x=>o.me?pPerfR(x,m):eraToR(x.er*27/x.outs);
  let v=o.rn*(1-ws-wc)+(ws?pf(s)*ws:0)+(wc?pf(c)*wc:0);
  if(!o.me&&m&&m.p==='k'&&s&&so>=30) v+=clamp((s.k*27/so-8),-4,6);   // 奪三振至上主義（CPU）
  v+=(m&&m.a==='merit'?0.3:1)*(o.pf||0)+mgrAgeAdj(m,o.age)*0.8;
  if(o.prev!=null){ const wp=Math.max(0,1-Math.max(so/45,(PEN&&PEN.day||0)/40)); v=v*(1-wp)+o.prev*wp; }   // 去年の順位を引き継ぐ（今年15回・40試合で今年の評価だけに）
  return v;
}
function myPitEval(m,prev){ const ss=PEN.ss, c=PEN.career; return pEval({me:true,rn:abilityR(),s:{outs:ss.outs,er:ss.runs*0.9,k:ss.k,h:ss.hits,bb:ss.bb},c:{outs:c.outs,er:c.runs*0.9,k:c.k,h:c.hits,bb:c.bb},age:PEN.age,pf:Math.min(15,ss.mBonus||0)*0.5+favBonus()-(ss.tPen||0),prev},m); }
const staffKey=T=>T.P.map(p=>p.pid).join(',');
const PEN_MIN=5;   // ブルペン（ローテ外の先発候補を除く）に最低限残す人数
function staffBuild(T,id,keep,reroll){
  const m=mgrOf(id), N=rotN(m); ensurePids();
  while(T.P.length<2*N+3){ T.P.push(genRosterPitcher(ri(22,30),ri(-10,-2))); ensurePids(); }   // ローテ（N人）・ローテ外の先発候補（N−2人）・ブルペン（5人）がそろうように投手を補充
  const pv=T.prevSc||{};   // 去年の最後の総合評価
  const E=T.P.map(p=>{ if(p.rn==null) p.q=pitQ(p); if(reroll||p.pf==null) p.pf=Math.round((rnd()-.5)*6);
    return {id:p.pid,p,st:(p.stamina??86)>=STA_ROLE_MIN,sc:pEval({rn:p.rn,s:PEN.cs&&PEN.cs[p.pid],c:p.car,age:p.age,pf:p.pf,prev:pv[p.pid]},m)}; });
  // 自分は配置（ローテ／ローテ外／中継ぎ／クローザー）が決まっていて、その中の番手だけが評価で決まる
  let me=null; if(id===PEN.team&&!isBat()&&!PEN.released){ const cat=myPcat(); me={id:'ME',me:true,cat,grp:cat==='rot'||cat==='out'?'start':'relief',sc:myPitEval(m,pv.ME)}; E.push(me); }
  const tr=me&&PEN.trial?PEN.trial.to:null;   // お試し中は、その配置の最下位として（人数の上限を超えてもよい）。決まったらその時の最下位と入れ替え
  const stOf=x=>(x.me?PEN.abil&&PEN.abil.stamina:x.p&&x.p.stamina)??80, rsOf=x=>x.sc+(stOf(x)-80)*SP_STA_W;   // 先発の順位：長いイニングを投げられる（スタミナが高い）ほど上（自分も同じ）
  const byS=(a,b)=>b.sc-a.sc, S=E.filter(x=>x.me?x.grp==='start':x.st).sort((a,b)=>rsOf(b)-rsOf(a)), nRot=me&&me.cat==='rot'&&tr!=='rot'?N-1:N;
  let cpuS=S.filter(x=>!x.me); if(cpuS.length<nRot) cpuS=cpuS.concat(E.filter(x=>!x.me&&!x.st).sort((a,b)=>(b.p.stamina??0)-(a.p.stamina??0)).slice(0,nRot-cpuS.length));   // 先発（スタミナ60以上）が足りなければ、スタミナの高い投手から
  const rot=cpuS.slice(0,nRot).concat(me&&me.cat==='rot'?[me]:[]);
  // ローテ外の先発候補：ローテに入らなかった投手の上位から（ローテの人数−2）人まで（ブルペンに最低5人は残す）。
  //   上位半分は先発組（ロングリリーフ＋ときどき先発）、下位半分（奇数なら1人少ない）はロングリリーフのみ
  const cap=Math.max(1,N-2), rest=cpuS.filter(x=>!rot.includes(x)), nCore=E.filter(x=>!x.me&&!rot.includes(x)).length;
  let out=rest.slice(0,Math.max(0,Math.min(me&&me.cat==='out'&&tr!=='out'?cap-1:cap,nCore-PEN_MIN)));
  if(me&&me.cat==='out') out=tr==='out'?out.concat([me]):out.concat([me]).sort(byS);   // お試し中は最下位
  const ns=Math.ceil(out.length/2);
  if(me&&me.cat==='out'&&tr!=='out'&&PEN.outSwap){ const i=out.indexOf(me); if(i>=ns){ out.splice(i,1); out.splice(ns-1,0,me); } }   // 監督の判断で先発組の最下位と入れ替え
  // ブルペン：ローテとローテ外の先発候補を除いた投手（評価順。1番手がクローザー）。ローテ外の先発候補はロングリリーフとして最後に入る
  const pen=E.filter(x=>!rot.includes(x)&&!out.includes(x)&&!(x.me&&x.grp==='start')).sort(byS);
  if(me&&me.cat==='close'){ pen.splice(pen.indexOf(me),1); pen.unshift(me); }
  else if(me&&me.cat==='pen'&&pen[0]===me&&pen.length>1){ pen[0]=pen[1]; pen[1]=me; }   // クローザーには打診（お試し）でしかならない
  T.penN=pen.length; pen.push(...out);
  const ids=rot.map(x=>x.id); let order=ids;
  if(keep&&T.rotIds&&T.rotIds.length===ids.length){ order=T.rotIds.map(x=>ids.includes(x)?x:null); const nw=ids.filter(x=>!order.includes(x)); order=order.map(x=>x??nw.shift()); }   // 残る投手の登板順はそのまま、空いた枠に新しく入った投手
  if(!keep){ T.rotSt=null; T.spHist={}; }   // 開幕：登板の順番を作り直す
  T.rotIds=order; T.penIds=pen.map(x=>x.id); T.rankS=S.map(x=>x.id); T.outIds=out.map(x=>x.id); T.outN=ns; T.pSc={}; E.forEach(x=>T.pSc[x.id]=Math.round(x.sc)); T.rotKey=staffKey(T);
  if(tr==='rot') T.rankS=T.rankS.filter(x=>x!=='ME').concat(['ME']);   // お試し中はローテの最下位
}
function staff(T){
  const id=PEN&&PEN.teams?Object.keys(PEN.teams).find(k=>PEN.teams[k]===T):null;
  if(!id){ const s=T.P.slice().sort((a,b)=>a.q-b.q); return {rot:s.slice(0,6),pen:s.slice(6),N:6}; }   // 球団以外（記念試合など）
  if(!T.rotIds||T.rotKey!==staffKey(T)) staffBuild(T,id,true);
  const by={}; T.P.forEach(p=>by[p.pid]=p);
  return {rot:rotOrderByRank(T).map(x=>by[x]).filter(Boolean),pen:T.penIds.map(x=>by[x]).filter(Boolean),N:T.rotIds.length};
}
/* ---- 先発の登板間隔：1番手がいちばん短く、ローテの最下位は1番手の2倍。その間は順位に応じて長くなる ----
   1試合に1人が先発するように間隔を決め（6人ローテなら1番手が約4.2試合ごと〜6番手が約8.5試合ごと）、
   毎試合「間隔のぶんだけたまった順番」がいちばん多い投手が先発する（同じ試合は何度呼んでも同じ投手） */
function rotIntervals(n){ const f=k=>1+(n>1?k/(n-1):0); let s=0; for(let k=0;k<n;k++) s+=1/f(k); return Array.from({length:n},(_,k)=>s*f(k)); }
function rotOrderByRank(T){ const R=T.rankS||[], ids=T.rotIds||[]; return R.filter(x=>ids.includes(x)).concat(ids.filter(x=>!R.includes(x))); }
// ローテ外の先発候補：ロングリリーフのほか、ときどき先発する（成績が良いほど多く、最大でローテ最下位の2/3）
//  防御率2.50以下で最大、5.00以上で最小（最大の1割）。まだあまり投げていないときは4割
function spotF(era,outs){ if(!outs||outs<15) return 0.4; return clamp((5.0-era)/2.5,0.1,1); }
// ローテ外の先発候補（staffBuild で決まる）。outN＝そのうち先発組（ときどき先発）の人数
function outIds(T){ if(T.outIds) return T.outIds; const p3=(T.penIds||[]).slice(0,3); return (T.rankS||[]).filter(x=>!(T.rotIds||[]).includes(x)&&!p3.includes(x)); }
const outStartN=T=>T.outN!=null?T.outN:Math.ceil(outIds(T).length/2);
function rotSpots(T,IN){
  const L=outIds(T).slice(0,outStartN(T));   // 先発組だけがときどき先発（ロングリリーフ組は先発しない）
  return L.map(id=>{ let era=null,outs=0; if(id==='ME'){ const s=PEN.ss; outs=s.outs; era=outs?s.runs*0.9*27/outs:null; } else { const c=PEN.cs&&PEN.cs[id]; outs=c?c.outs:0; era=outs?c.er*27/outs:null; }
    return {id,w:(2/3)/IN*spotF(era,outs)}; });
}
function rotStep(T,st,d){
  const ord=rotOrderByRank(T), I=rotIntervals(ord.length); if(!ord.length) return null;
  const C=ord.map((id,k)=>({id,w:1/I[k]})).concat(rotSpots(T,I[I.length-1])), ids=C.map(x=>x.id);
  for(const id in st.cred) if(!ids.includes(id)) delete st.cred[id];
  C.forEach(x=>{ st.cred[x.id]=Math.min(1.2,(st.cred[x.id]||0)+x.w); });   // 休んでいた投手が続けて先発しないように、たまる分は1.2回まで
  let best=null; C.forEach(x=>{ if(d-(st.last[x.id]??-99)<Math.max(2,Math.floor(0.6/x.w))) return; if(typeof fatSpSkip==='function'&&d===PEN.day&&fatSpSkip(T,x.id)) return; if(best==null||st.cred[x.id]>st.cred[best]) best=x.id; });   // 間隔が短すぎる投手は休ませる。疲れている投手は先発を回避（ずらす）
  if(best==null){ const sk=id=>typeof fatSpSkip==='function'&&d===PEN.day&&fatSpSkip(T,id), gap=id=>d-(st.last[id]??-99), now=d===PEN.day;
    let ok=C.map(x=>x.id).filter(id=>!sk(id)&&gap(id)>=4); if(!ok.length&&now) ok=outIds(T).filter(id=>!sk(id)&&gap(id)>=4);   // 中3日以上空いた疲れていない投手（いなければローテ外の投手から）
    if(ok.length) best=ok.reduce((a,b)=>gap(a)>gap(b)||(gap(a)===gap(b)&&(st.cred[a]||0)>=(st.cred[b]||0))?a:b);   // 間隔がいちばん空いている投手から
    else if(now&&typeof myFat==='function'){ const by={}; (T.P||[]).forEach(p=>{ if(p.pid) by[p.pid]=p; }); const fz=id=>(id==='ME'?myFat():by[id]?(by[id].fat||0)+((by[id].out||0)>PEN.day?999:0):999)+(gap(id)<3?500:0);   // みんな疲れていたら、いちばん疲れていない投手（ローテ外も。中2日以内は最後）
      best=[...new Set(C.map(x=>x.id).concat(outIds(T)))].reduce((a,b)=>fz(a)<=fz(b)?a:b); if(best==='ME'&&myFat()>=myFatThr()+FAT_SP) T.meSkip=null; }
    else best=ord.reduce((a,b)=>st.cred[a]>=st.cred[b]?a:b); }
  st.cred[best]-=1; st.last[best]=d; return best;
}
// セーブ機会の分け合い：クローザーとセットアッパーの総合評価が近いほど、セットアッパーもセーブ機会で投げる（最大 6:4）
function saveShare(T){ const a=T.penIds&&T.penIds[0], b=T.penIds&&T.penIds[1]; if(!a||!b||!T.pSc) return 0; const d=(T.pSc[a]??0)-(T.pSc[b]??0); return clamp(0.4*(1-Math.max(0,d)/10),0,0.4); }
function rotPick(T,day){
  T.spHist=T.spHist||{}; if(T.spHist[day]!=null) return T.spHist[day];
  const st=T.rotSt||(T.rotSt={cred:{},last:{},d:-1});
  for(let d=st.d+1;d<=day;d++){ T.spHist[d]=rotStep(T,st,d); st.d=d; }
  return T.spHist[day];
}
function rotPeek(T,day){   // 先の試合の先発の見込み（状態は変えない）
  if(T.spHist&&T.spHist[day]!=null) return T.spHist[day];
  const s0=T.rotSt||{cred:{},last:{},d:-1}, st={cred:{...s0.cred},last:{...s0.last},d:s0.d}; let r=null;
  for(let d=st.d+1;d<=day;d++) r=rotStep(T,st,d);
  return r;
}
const penOrder=T=>{ const p=staff(T).pen; return p.slice(0,Math.min(5,p.length)); };
// 打線のタイプ名（相手打線の発表用）
function lineupPattern(L){
  const c={}; L.forEach(b=>c[b.type]=(c[b.type]||0)+1);
  const pat = (c['フルスイング']||0)>=4?'power' : (c['ヒットメーカー']||0)>=5?'contact' : (c['スピードスター']||0)>=4?'speed' : L.slice(2,5).every(b=>b.power>=65)?'cleanup' : 'standard';
  const nl=L.filter(b=>b.hand==='L').length;
  return {pattern:pat,hand:nl>=6?'left':nl<=2?'right':'normal'};
}
// チームの打線と戦力を作り直す（シーズン開始時・自分のチームは10試合ごと）
// 守れるポジションが2つあるときは、チームにとっていちばん良くなる（監督が必要とする）ポジションで出る
function bestStarters(T,id){
  if(!(isBat()&&PEN.team===id)) return pickStarters(T,null);
  if(PEN.bAssign&&PEN.bAssign.bench) return pickStarters(T,null);   // 監督の判断で控え
  const sum=st=>st.reduce((t,x)=>t+x.val,0);
  let best=null;
  for(const pos of myPositions()){ const st=pickStarters(T,myFielder(pos)); if(!best||sum(st)>sum(best)) best=st; }
  return best;
}
function rebuildTeam(id){
  const T=PEN.teams[id]; mgrOf(id); delete T.lineupBase;   // 疲労の入れ替えは組み直しで消える
  T.F.forEach(f=>{ f.pf=Math.round((rnd()-.5)*10); });   // 監督の評価（調子）を少し入れ替える
  const st=battingOrder(bestStarters(T,id),T.mgr);
  if(id===PEN.team&&isBat()&&PEN.bAssign&&PEN.bAssign.order&&!(PEN.favMod&&PEN.favMod.order)){ const i=st.findIndex(x=>x.me), j=PEN.bAssign.order-1; if(i>=0&&j<st.length&&i!==j){ const t=st[i]; st[i]=st[j]; st[j]=t; } }   // 打診で決まった打順
  if(id===PEN.team&&PEN.favMod&&PEN.favMod.order){ const i=st.findIndex(x=>x.me), j=PEN.favMod.order-1; if(i>=0&&j<st.length&&i!==j){ const t=st[i]; st[i]=st[j]; st[j]=t; } }   // 贔屓監督の打順
  T.lineup=st.map((x,i)=>serB(x.me?{...toBatter(x.f,i+1),isMe:true}:toBatter(x.f,i+1)));
  T.lpos=st.map(x=>x.slot);
  const lp=lineupPattern(T.lineup); T.pattern=lp.pattern; T.hand=lp.hand;
  const hs=st.reduce((t,x)=>t+hitScore(x.f),0)/9, ds=st.filter(x=>x.slot!=='DH').reduce((t,x)=>t+x.f.d,0)/8;
  staffBuild(T,id,PEN.day>0,true);   // 投手陣の順位も見直す（シーズン開幕時は登板順も組み直す）
  const rotP=staff(T).rot, ps=rotP.reduce((t,p)=>t+pitScore(p),0)/Math.max(1,rotP.length);
  T.off=clamp((hs-50)*0.035,-0.6,0.6); T.def=clamp((ps-50)*0.02+(ds-50)*0.006,-0.6,0.6); T.fdef=ds;
  return st;
}
// 野手のあなた（スタメン争い用）：能力＋監督の評価（成績）。ME_PF_ADD＝スタメンを外すかどうかを決めるときの今のスタメンの上乗せ
let ME_PF_ADD=0;
const myPositions=()=>PEN.favMod&&PEN.favMod.pos?[PEN.favMod.pos]:PEN.bAssign&&PEN.bAssign.pos&&isBat()?[PEN.bAssign.pos]:(PEN.bposs&&PEN.bposs.length?PEN.bposs:[PEN.bpos||'OF']);   // 打診で決まった守備位置があればそこだけ
function myFielder(pos){
  const a=perfB(PEN.babil);   // 内部値でCPUと比べる
  return {id:'me',n:PEN.pname,pos:pos||myPositions()[0],h:PEN.bhand,m:a.meet,p:a.power,s:a.speed,e:a.eye,d:a.def??50,age:PEN.age,pf:Math.round((evalOld()-50)*0.6)+ME_PF_ADD-((pos||myPositions()[0])!=='DH'?Math.round(defBad()*6):0),num:B_NUM,isMe:true};   // 失策が多い・UZRが低いと、DH以外ではスタメンに選ばれにくい
}

/* ---- 年をまたぐとき：成長・衰え・引退、ドラフト ---- */
// CPU選手の1年の変化：衰え（年齢）＋ 持ち点による成長（自分と同じ仕組み：基本点＋監督ボーナス＋覚醒・タイトル）。持ち点はタイプに応じて即時に割り振る
const CPU_BASE=age=>age<=24?1.4:age<=28?1.1:age<=32?0.8:0.5;   // 年齢で基本点が変わる（若いほど伸びる）
function cpuEvents(age,star){   // 覚醒・タイトル相当の持ち点（確率）。star＝リーグ上位なら多め
  let p=0; if(rnd()<0.35) p+=1; if(rnd()<0.10) p+=3; if(age>=27&&rnd()<0.05) p+=5; if(age>=30&&rnd()<0.015) p+=10;
  if(star===1) p+=3; else if(star===2) p+=1;   // タイトル相当
  return p;
}
// CPUの1年の基本の持ち点（若いうちは大きく伸び、30〜32歳は少し。衰えが始まったらなし）
const CPU_G=Object.assign({fy:8,fm:0.5,py:8.2,pm:0.5,off:2,pv:14,rv:22,s0:118,s1:290,c0:46,c1:134,e0:80,ev:0.04},(typeof process!=='undefined'&&process.env&&process.env.CPUG)?JSON.parse(process.env.CPUG):{});
const cpuGrowBase=(age,isP)=>age<=30?(isP?CPU_G.py:CPU_G.fy):age<=32?(isP?CPU_G.pm:CPU_G.fm):0;
const CPU_WEIGHT={'フルスイング':{p:4,m:2,e:1,s:1,d:1},'ヒットメーカー':{m:4,e:2,s:1,p:1,d:1},'スピードスター':{s:4,d:2,m:1,e:1,p:1},'守備職人':{d:4,s:1,m:1,e:1,p:1},'代打男':{m:3,p:3,e:1,s:1,d:1},'アスリート':{m:2,p:2,s:2,e:1,d:2},'バランス':{m:2,p:2,s:1,e:2,d:2}};
// CPUの成長は能力が高いほど伸びにくい（表示の値で80から上は効きが落ち、90で6割・95で4割・100の手前で1/4）。100近い能力を2つ以上持つ野手は数年に1人くらい
const cpuEff=v=>v<CPU_G.e0?1:Math.max(0.25,1-(v-CPU_G.e0)*CPU_G.ev), cpuEffV=v=>v<150?1:Math.max(0.25,1-(v-150)*0.05);
// 持ち点を能力に振る（野手）：表示の値で1点＝1。タイプで振られやすい能力が違う（ランダム）
function cpuGrowF(f,pts){
  const W=CPU_WEIGHT[f.btype]||CPU_WEIGHT['バランス'], keys=Object.keys(W), D={}; keys.forEach(k=>D[k]=abShow(f[k]));
  const R={}; keys.forEach(k=>R[k]=W[k]*(0.3+rnd()*1.4));   // その年の振られやすさ（ランダム）
  let left=pts, guard=0;
  while(left>0.05&&guard++<200){ const open=keys.filter(k=>D[k]<100); if(!open.length) break;
    const step=Math.min(left,2), sw=open.reduce((t,k)=>t+R[k],0); let used=0;
    open.forEach(k=>{ const e=cpuEff(D[k]), g=Math.min(100-D[k],step*R[k]/sw*e); D[k]+=g; used+=g/e; }); left-=used; if(used<1e-6) break; }
  keys.forEach(k=>f[k]=clamp(Math.round(abPerf(D[k])*10)/10,1,100));
}
// 持ち点を能力に振る（投手）：球速0.1km/h＝0.5点・コントロール/スタミナ0.1＝0.1点・変化球のLvアップ。先発型はスタミナ、中継ぎ型はコントロール・球速に振られやすい
function cpuGrowP(p,pts){
  if(!p.prole) p.prole=(p.stamina||0)>=70?'sp':'rp';
  const W=p.prole==='sp'?{velo:CPU_G.pv,control:CPU_SP_GW.control,stamina:CPU_SP_GW.stamina,lv:5}:{velo:CPU_G.rv,control:42,stamina:18,lv:10};
  let left=pts, lvP=pts*W.lv/100*(0.5+rnd()), guard=0;
  while(lvP>=1&&guard++<10){ const ts=(p.types||[]).filter(t=>t!=='ストレート'&&pitLv(p,t)<7); if(!ts.length) break; const t=pick(ts), nl=pitLv(p,t)+1, c=nl<=2?1:nl===3?3:nl; if(c>lvP) break; p.plv=p.plv||{}; p.plv[t]=nl; lvP-=c; left-=c; }
  if(left<=0) return;
  const r={velo:W.velo*(0.5+rnd()),control:W.control*(0.5+rnd()),stamina:W.stamina*(0.5+rnd())}, sw=r.velo+r.control+r.stamina;
  p.velo=Math.round(Math.min(VELO_MAX,p.velo+left*r.velo/sw/5*cpuEffV(p.velo))*10)/10;
  p.control=Math.round(Math.min(100,p.control+left*r.control/sw*cpuEff(p.control))*10)/10;
  p.stamina=Math.round(Math.min(100,p.stamina+left*r.stamina/sw*cpuEff(p.stamina))*10)/10;
}
// 去年の成績から決まるCPUの持ち点（自分と同じように、活躍・覚醒・タイトルで増える）
//  ev：{pts, m, p}（m/p＝覚醒でミート・パワーが直接+5）
function cpuStatEvents(x,s,isP,titles,age){
  const ev={pts:0,m:0,p:0,why:[]};
  if(s){
    if(!isP){ const avg=s.ab?s.h/s.ab:0, half=s.pa>=Math.ceil(QUAL_PA/2), qual=s.pa>=QUAL_PA;
      if(s.pa>=300) ev.pts+=1;                                                                   // レギュラーとして1年出た
      if((qual&&avg>=0.300)||s.hr>=25||s.sb>=25||s.rbi>=80) ev.pts+=3;                            // 好成績
      if(age<=25&&half&&avg>=0.300&&rnd()<0.25){ ev.pts+=10; ev.m+=5; ev.why.push('安打製造機の覚醒'); }
      if(age<=25&&half&&s.hr>=10&&rnd()<0.25){ ev.pts+=10; ev.p+=5; ev.why.push('長距離砲の覚醒'); }
    }else{ const era=s.outs?s.er*27/s.outs:99;
      if(s.outs>=300||s.g>=40) ev.pts+=1;
      if((s.outs>=SEASON_GAMES*3&&era<=2.80)||s.w>=12||s.sv>=25||s.k>=150) ev.pts+=3;
      if(age<=25&&s.outs>=Math.ceil(SEASON_GAMES*3/2)&&era<=3.00&&rnd()<0.25){ ev.pts+=20; ev.why.push('エースピッチャーへの兆し'); }
    }
  }
  ev.pts+=titles||0;                                                  // タイトル争い（1〜5位）・表彰（MVP・敢闘賞）の持ち点
  if(age>=27&&rnd()<0.05) ev.pts+=5; if(age>=30&&rnd()<0.015) ev.pts+=10;   // ベテランの覚醒（まれ）
  return ev;
}
// 表示の値で増減して内部値に戻す
const fAddD=(f,k,d)=>{ f[k]=clamp(Math.round(abPerf(clamp(abShow(f[k])+d,1,100))*10)/10,1,100); };
function ageFielder(f,T,star,ev){
  f.age++;
  if(!f.decl&&rnd()<declP(f.age)) f.decl=f.age;   // 衰えの始まり（33歳50%・34歳75%・35歳以上100%）
  if(f.decl){ const y=f.age-f.decl+1; for(const k of ['m','p','s','e','d']) fAddD(f,k,-((1+0.8*y)*(0.5+rnd())+(k==='s'?1:0))); }   // 衰え（年々大きくなる）
  if(ev){ if(ev.m) fAddD(f,'m',ev.m); if(ev.p) fAddD(f,'p',ev.p); }
  const pts=cpuGrowBase(f.age,false)*(f.decl?0:1)+(T&&T.mgr?mgrCampBonus(T.mgr):0.5)+(ev?ev.pts:cpuEvents(f.age,star));
  cpuGrowF(f,pts); f.btype=cpuTypeOf(f,true); cpuRecAge(f);   // 回復力：若いうちは伸び、衰えると下がる
}
function agePitcher(p,T,star,ev){
  p.age++;
  if(!p.decl&&rnd()<declP(p.age)) p.decl=p.age;   // 衰えの始まり
  if(p.decl){ const y=p.age-p.decl+1, k=()=>0.5+rnd(); p.velo=clamp(Math.round((p.velo-(0.5+0.4*y)*k())*10)/10,110,VELO_MAX); p.control=clamp(Math.round((p.control-(1+0.8*y)*k())*10)/10,1,100); p.stamina=clamp(Math.round((p.stamina-(1.5+1*y)*k())*10)/10,1,100); }
  const pts=cpuGrowBase(p.age,true)*(p.decl?0:1)+(T&&T.mgr?mgrCampBonus(T.mgr):0.5)+(ev?ev.pts:cpuEvents(p.age,star));
  cpuGrowP(p,pts); p.q=pitQ(p); cpuRecAge(p);
}
function retireAndTrim(T){
  T.F=T.F.filter(f=>!(f.age>=40||(f.age>=35&&hitScore(f)<45&&rnd()<0.6)));
  T.P=T.P.filter(p=>!(p.age>=41||(p.age>=35&&pitScore(p)<45&&rnd()<0.6)));
  // 人数オーバーは評価の低い（年上の）選手から退団。ただし各守備位置に最低限は残す
  const need={C:2,'1B':1,'2B':1,'3B':1,SS:1,OF:3};
  while(T.F.length>17){
    const cnt={}; T.F.forEach(f=>cnt[f.pos]=(cnt[f.pos]||0)+1);
    const cands=T.F.filter(f=>cnt[f.pos]>need[f.pos]).sort((a,b)=>(hitScore(a)-a.age*0.5)-(hitScore(b)-b.age*0.5));
    if(!cands.length) break; T.F.splice(T.F.indexOf(cands[0]),1);
  }
  while(T.P.length>rotN(T.mgr)+7){ const s=T.P.slice().sort((a,b)=>(pitScore(a)-a.age*0.5)-(pitScore(b)-b.age*0.5)); T.P.splice(T.P.indexOf(s[0]),1); }
  for(const pos in need){ let n=T.F.filter(f=>f.pos===pos).length; while(n++<need[pos]) T.F.push(genFielder(pos,ri(22,30),ri(-12,-4))); }
  while(T.P.length<rotN(T.mgr)+5) T.P.push(genRosterPitcher(ri(22,30),ri(-10,-2)));
}
// ドラフト：4＋順位 の人数（投手1〜5・野手1〜5）。返り値は指名した選手
function draftFor(id,rank){
  const T=PEN.teams[id], N=4+rank, np=ri(Math.max(1,N-5),Math.min(5,N-1)), nf=N-np, got=[];
  for(let i=0;i<np;i++){ const p=genRosterPitcher(ri(18,22),ri(-8,6)); p.rookie=PEN.year; T.P.push(p); got.push({k:'P',n:p.name,v:p.velo,age:p.age}); }
  for(let i=0;i<nf;i++){ const f=genFielder(pick(POSS),ri(18,22),ri(-6,8)); f.rookie=PEN.year; T.F.push(f); got.push({k:'F',n:f.n,pos:f.pos,age:f.age,v:Math.round(posValue(f,f.pos))}); }
  return {np,nf,got};
}
// シーズンの切り替え（年俸査定のあと）
function rosterNewSeason(fin,cs){
  const res={}, hasCS=!!(cs&&Object.keys(cs).length);
  // 去年のタイトル争い（各リーグの1〜5位）の持ち点：打率・本塁打・打点・盗塁・安打・出塁率／防御率・勝利・奪三振・セーブ（自分も順位に入れて数える）
  const tit={};
  if(hasCS){ const last=(PEN.seasons||[]).slice(-1)[0], meOk=last&&last.year===PEN.year-1&&TEAM[last.team], meLg=meOk?TEAM[last.team].lg:null;
    const meB=meOk?(last.pos==='B'?last.ss:last.pos==='W'?last.bss:null):null, meP=meOk&&last.pos!=='B'?last.ss:null;
    for(const lg of ['セ','パ']){
      const F=[],P=[]; lgTeams(lg).forEach(id=>{ const T=PEN.teams[id]; (T.F||[]).forEach(f=>{ if(cs[f.id]) F.push({k:f.id,s:cs[f.id]}); }); (T.P||[]).forEach(p=>{ if(p.pid&&cs[p.pid]) P.push({k:p.pid,s:cs[p.pid]}); }); });
      if(lg===meLg){ if(meB) F.push({k:'ME',s:meB}); if(meP) P.push({k:'ME',s:{...meP,er:meP.runs}}); }
      for(const st in CS_STAT){ const o=CS_STAT[st], L=(o.b?F:P).filter(x=>o.ok(x.s,SEASON_GAMES)).map(x=>({k:x.k,v:o.v(x.s)})).sort((a,b)=>o.low?a.v-b.v:b.v-a.v);
        L.slice(0,8).forEach(x=>{ const rk=L.findIndex(y=>y.v===x.v)+1; if(rk<=5&&x.k!=='ME') tit[x.k]=r1((tit[x.k]||0)+(typeof TITLE_CP!=='undefined'?TITLE_CP[rk]:0)); }); }
    } }
  const cpts=PEN.cpuPts||{}; PEN.cpuPts={};   // 去年の表彰（MVP・敢闘賞）の持ち点
  for(const k in cpts) tit[k]=r1((tit[k]||0)+cpts[k]);
  for(const t of NPB){
    const T=PEN.teams[t.id];
    // リーグ上位（タイトル相当）：各リーグの野手上位3人・投手上位3人に+3、次の3人に+1
    const lgF=[],lgP=[]; lgTeams(t.lg).forEach(id=>{ PEN.teams[id].F.forEach(f=>lgF.push(f)); PEN.teams[id].P.forEach(p=>lgP.push(p)); });
    const topF=lgF.sort((a,b)=>hitScore(b)-hitScore(a)), topP=lgP.sort((a,b)=>pitScore(b)-pitScore(a));
    const starOf=(x,arr)=>{ const i=arr.indexOf(x); return i>=0&&i<3?1:i>=0&&i<6?2:0; };
    if(hasCS) T.P.forEach(p=>{ const c=p.pid&&cs[p.pid]; if(c&&c.outs){ const fresh=!p.car; p.car=p.car||{outs:0,er:0}; for(const k in c) if(typeof c[k]==='number'&&(fresh||k in p.car||k==='k')) p.car[k]=(p.car[k]||0)+c[k]; } });   // 投手の通算成績（登板・勝敗・S・Hも。チーム内の評価に使う）
    // 前年の成績・野手の通算成績（オールスター・WBCのチーム内の評価に使う）
    // 前の版の通算（打点・試合・勝敗などがない）は、ない項目を数え始めない（途中からの合計を通算と見せないように）
    const carAdd=(o,c)=>{ const fresh=!o.car; o.car=o.car||{}; for(const k in c) if(typeof c[k]==='number'&&(fresh||k in o.car)) o.car[k]=(o.car[k]||0)+c[k]; };
    T.F.forEach(f=>{ const c=hasCS&&cs[f.id]; if(c&&c.pa){ f.ly={...c}; carAdd(f,c); } else delete f.ly; });   // 昨季：試合・打点も含めて全部
    T.P.forEach(p=>{ const c=hasCS&&p.pid&&cs[p.pid]; if(c&&c.outs) p.ly={...c}; else delete p.ly; });
    if(hasCS){ T.F.forEach(f=>ageFielder(f,T,0,cpuStatEvents(f,cs[f.id],false,tit[f.id],f.age))); T.P.forEach(p=>agePitcher(p,T,0,cpuStatEvents(p,p.pid&&cs[p.pid],true,tit[p.pid],p.age))); }   // 去年の成績で成長
    else { T.F.forEach(f=>ageFielder(f,T,starOf(f,topF))); T.P.forEach(p=>agePitcher(p,T,starOf(p,topP))); }
    retireAndTrim(T);
    const rank=fin?fin[t.lg].findIndex(x=>x.id===t.id)+1:ri(1,6);
    res[t.id]=draftFor(t.id,rank);
    T.F.forEach(f=>{ if(f.rookie&&f.rookie<PEN.year) delete f.rookie; }); T.P.forEach(p=>{ if(p.rookie&&p.rookie<PEN.year) delete p.rookie; });
  }
  return res;
}
// 二刀流：先発の日はDHなし。8人の野手＋自分で、打撃の能力と成績から監督が打順を決める
function twLineup(){
  const T=myT(), a=perfB(PEN.babil), perf=Math.round((toOldB(twBatEval())-50)*0.5);
  const me={id:'me',n:PEN.pname,pos:'P',h:PEN.bhand,m:a.meet+perf,p:a.power+perf,s:a.speed,e:a.eye,d:50,age:PEN.age,isMe:true};
  const st=pickStarters(T,null,SLOTS.slice(0,8)); st.push({f:me,me:true,slot:'P',val:0});
  return battingOrder(st,myMgr()).map((x,i)=>x.me?{...meBatter(),order:i+1}:{...plainB(toBatter(x.f,i+1)),order:i+1});
}
// 試合で使う自分の打者データ（二刀流）
function meBatter(){
  const a=perfB(PEN.babil);
  return {isMe:true,name:PEN.pname,hand:PEN.bhand,type:'あなた',num:MYNUM,power:a.power,contact:a.meet,speed:a.speed,eye:a.eye,
    avg:clamp(0.21+a.meet*0.0008+a.speed*0.0002,.2,.33),hrRate:hrRateOf(a.power)*1.2,res:[]};
}
// 自分のチーム（投手のとき）：この試合の味方リリーフ／相手の先発・リリーフ
function gamePitchers(id,day){
  const T=PEN.teams[id], s=staff(T), spId=rotPick(T,day);
  let sp=spId&&spId!=='ME'?T.P.find(p=>p.pid===spId):null;
  if(!sp) sp=s.pen[s.pen.length-1]||s.rot[0];   // 自分の先発の日に自分が投げないとき（ケガなど）はロングリリーフが先発
  return {sp, pen:s.pen.slice(0,3), bull:s.pen.slice(0,5), me:spId==='ME'};
}
// 二刀流：投げない日の指名打者争い（打撃の能力＋打撃成績の評価で、チームの指名打者候補と比べる）
const twMeB=()=>{ const a=perfB(PEN.babil); return {id:'me',n:PEN.pname,pos:'DH',h:PEN.bhand,m:a.meet,p:a.power,s:a.speed,e:a.eye,d:0,age:PEN.age,pf:Math.round((toOldB(twDhEval())-50)*0.6)-TW_DH_PEN,isMe:true,num:MYNUM}; };   // 指名打者の争いでの自分（二刀流は少し不利）
function twCompete(quiet){
  if(!isTW()) return;
  const T=myT(), me=twMeB();
  const st=battingOrder(pickStarters(T,me)), i=st.findIndex(x=>x.me);
  const was=!!PEN.dh;
  PEN.dh=i>=0; PEN.dhOrder=i>=0?i+1:0;
  PEN.dhLineup = i>=0 ? st.map((x,k)=>serB(x.me?{...toBatter(x.f,k+1),isMe:true}:toBatter(x.f,k+1))) : null;
  // 比べた相手（指名打者に入った、または入れなかったときの指名打者）
  const st2=pickStarters(T,null), dh=st2.find(x=>x.slot==='DH');
  PEN.dhVal=abS(hitScore(me)+me.pf); PEN.dhRival=dh?{n:dh.f.n,v:abS(hitScore(dh.f)+(dh.f.pf||0))}:null;   // 表示の目盛りで
  if(quiet||was===PEN.dh) return;
  penNotice(PEN.dh?`投げない日は指名打者（${PEN.dhOrder}番）で出場することになった！`:'打撃の評価が下がり、投げない日の指名打者から外れた');
  if(typeof mgrSay==='function') mgrSay(PEN.dh?`打撃の調子が上がってきたな。投げない日は指名打者（${PEN.dhOrder}番）で使うぞ。`:'打撃の結果が出ていないな。投げない日の指名打者はしばらく外れてもらう。投げる方とは別に見ているからな。',PEN.dh?'起用の変更':'指名打者から外す');   // 画面にかぶせる監督との会話
}

/* ===== CPU選手のシーズン成績（チームの試合結果から1試合ずつ作る）・タイトル争いの順位 ===== */
let PID_N=1;
function ensurePids(){ for(const id in PEN.teams){ (PEN.teams[id].P||[]).forEach(p=>{ if(!p.pid) p.pid='p'+(Date.now()%1e6)+'_'+(PID_N++); }); } }
const csB=()=>({g:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,rbi:0,bb:0,k:0,sb:0,cs:0});
const csP=()=>({g:0,gs:0,outs:0,er:0,w:0,l:0,sv:0,hld:0,k:0});
function csGet(key,isP){ const C=PEN.cs||(PEN.cs={}); return C[key]||(C[key]=isP?csP():csB()); }
// 捕手の守備（盗塁の阻止）：スタメンの捕手の守備力
function catcherDef(T){ if(!T) return 50; const i=(T.lpos||[]).indexOf('C'), b=i>=0&&T.lineup?T.lineup[i]:null;
  if(b&&b.isMe) return abPerf((PEN.babil&&PEN.babil.def)??70);
  const f=b&&T.F?T.F.find(x=>x.id===b.fid):null; return f?f.d:(T.fdef||50); }
// CPUの盗塁：足に自信のある選手（走力60以上）だけが走る。成功率は足・捕手の守備・投手の球の速さ（平均）で決まる
function cpuStealP(spd,cDef,pitchSpd){ return clamp(0.46+(spd-50)*0.008+(50-cDef)*0.004+(140-(pitchSpd||140))*0.004,0.3,0.93); }
function csStealTry(b,s,O){
  if(b.speed<60||rnd()>(b.speed-55)*0.01) return;
  if(rnd()<cpuStealP(b.speed,catcherDef(O),136)) s.sb++; else s.cs++;
}
const CS_K={hr:0.4,hit:0.035,era:3.0};   // 見た目の調整値
const CS_W=[4.65,4.55,4.45,4.35,4.25,4.15,4.05,3.95,3.85];
// 1チームの1試合ぶんの成績を作る。rf＝得点 ra＝失点。me：自分が出た試合なら {bat:true} か {pitch:{outs,runs,dec}}
function csTeamGame(tid,rf,ra,res,oid,me){
  const T=PEN.teams[tid], O=PEN.teams[oid]; if(!T||!O) return;
  ensurePids();
  // 打者
  const L=T.lineup||[], oq=((gamePitchers(oid,PEN.day)||{}).sp||{q:1}).q||1, tot=CS_W.reduce((a,b)=>a+b,0), PA=33.5+rf*0.9, H=[]; let hrN=0;
  L.forEach((b,i)=>{ if(b.isMe||!b.fid) return; const s=csGet(b.fid,false); s.g++;
    const n=Math.floor(PA*CS_W[i%9]/tot+rnd()); let hits=0;
    for(let k=0;k<n;k++){ let r=simPA(b,oq); s.pa++;
      if(r==='HR'&&rnd()<CS_K.hr) r='FO'; else if((r==='GO'||r==='FO'||r==='K')&&rnd()<CS_K.hit) r='1B';   // 成績の見た目をNPBらしく（本塁打を減らし、安打を少し増やす）
      if(r==='BB'){ s.bb++; csStealTry(b,s,O); continue; }
      s.ab++; if(r==='K'){ s.k++; continue; } if(r==='GO'||r==='FO') continue;
      s.h++; hits++; if(r==='2B') s.d2++; else if(r==='3B') s.d3++; else if(r==='HR'){ s.hr++; s.rbi++; hrN++; } else csStealTry(b,s,O); }
    H.push({s,w:(hits+0.25)*(i>=2&&i<=4?1.2:i<=1?0.95:0.85)}); });
  // 打点：本塁打の本人分を除いたチームの得点を、打った選手に配る（クリーンアップ寄り）
  let rest=Math.max(0,Math.round(rf*0.93)-H.reduce((t,x)=>t+0,0)-L.reduce((t,b)=>t,0));
  const hrR=H.reduce((t,x)=>t,0); rest=Math.max(0,rest-0);
  for(let k=0;k<rest&&H.length;k++){ const x=wpick(H.map(h=>[h,h.w])); x.s.rbi++; }
  // 投手
  const gp=gamePitchers(tid,PEN.day), mp=me&&me.pitch;
  let outs=27, left=ra; const used=[];
  if(mp){ outs-=mp.outs||0; left-=mp.runs||0; }
  const sp=gp&&gp.sp&&!(mp&&mp.kind==='start')?gp.sp:null;
  if(sp){ const s=csGet(sp.pid,true); s.g++; s.gs++;
    let o=Math.round(clamp(spOutsAvg((sp.stamina||50)*(typeof fatStaMul==='function'?fatStaMul(sp.fat||0):1))+1.5+(1-(sp.q||1))*25+noise(3)-Math.max(0,ra-4)*1.6,5,Math.min(27,outs)));   // 1打席ずつ回す試合と同じくらい投げる（疲れていると短い）
    const er=Math.min(left,poisson(o/27*CS_K.era*Math.pow(sp.q||1,3)));   // 投手の質で自責点が決まる（チームの失点を超えない）
    s.outs+=o; s.er+=er; s.k+=poisson(o/27*clamp(7.2+(1-(sp.q||1))*18,4,12)); outs-=o; left-=er; used.push({p:sp,s,o,er,sp:true}); }
  const pen0=(staff(T).pen||[]).filter(p=>p.pid), pen1=pen0.filter(p=>!(typeof cpuPTired==='function'&&cpuPTired(p,T))), pen=pen1.length>=3?pen1:pen0; let guard=0;   // 疲れた・連投の続いた中継ぎは使わない
  while(outs>0&&pen.length&&guard++<8){
    const close=res==='W'&&rf-ra<=3&&outs<=3, p=close?pen[0]:pick(pen.slice(1).length?pen.slice(1):pen);
    if(used.some(u=>u.p===p)&&!close) continue;
    const o=Math.min(outs,close?outs:ri(2,5)), er=left>0?Math.min(left,outs-o<=0?left:poisson(o/27*CS_K.era*Math.pow(p.q||1,3))):0;
    const s=csGet(p.pid,true); s.g++; s.outs+=o; s.er+=er; s.k+=poisson(o/27*clamp(8+(1-(p.q||1))*18,4,13));
    outs-=o; left-=er; used.push({p,s,o,er,close}); }
  if(left>0&&used.length){ const u=used[used.length-1], e=Math.round(left*0.85); u.s.er+=e; u.er+=e; }   // 残りの失点（自責点は約85%）
  // 勝ち負け・セーブ（自分に付いたものは除く）
  const dec=mp&&mp.dec||'';
  if(res==='W'&&!/勝/.test(dec)){ const s0=used.find(u=>u.sp); const w=s0&&s0.o>=15&&rnd()<0.8?s0:used.filter(u=>!u.sp)[0]||s0; if(w) w.s.w++; }
  if(res==='L'&&!/負/.test(dec)){ const s0=used.find(u=>u.sp); const l=s0&&(s0.er>=ra*0.5||rnd()<0.5)?s0:used.filter(u=>!u.sp).sort((a,b)=>b.er-a.er)[0]||s0; if(l) l.s.l++; }
  if(res==='W'&&rf-ra<=3&&!/S/.test(dec)){ const c=used.find(u=>u.close); if(c&&rnd()<0.9) c.s.sv++; used.filter(u=>!u.sp&&!u.close&&!u.er&&u.o>=1).forEach(u=>{ if(rnd()<0.7) u.s.hld=(u.s.hld||0)+1; }); }
}
/* ===== CPUの試合を選手1人ずつ1打席ずつ回す（全試合）。結果と成績はこの試合の中身そのもの ===== */
const LG_K={q:1.05,hrCut:0,hit:0,steal:0.02};   // 見た目をNPBらしくする調整値（盗塁の多さ）。安打はミートに比例、本塁打はヒットのうちパワーで決まる割合なので、上乗せ・削りはなし
// CPUの先発の交代（回の始めに判断）：自分が投げているときの監督（managerCheck）と同じ基準。スタミナの残り15%未満・終盤の勝負どころ・失点（大量リードなら長め）
//   sta：スタミナ、r：この投手の失点、rI：前の回の始めの失点、L：自分のチームのリード、inn：これから始まる回。打者で出る試合の相手投手も同じ
function spPullCheck(S,r,rI,L,inn){ const x=S.cur/Math.max(1,S.max), leash=L>=5?2:L>=3?1:0, iR=r-(rI??0);
  if(S.cur<=0) return true; if(x<0.15&&rnd()<0.55) return true; if(x<0.3&&inn>=8&&Math.abs(L)<=2&&rnd()<0.35) return true;
  if(r>=7+leash) return true; if(r>=5+leash&&inn<=6&&rnd()<0.6) return true; if(iR>=4+leash&&rnd()<0.75) return true; return false; }
function simLeagueGame(aid,bid,opts){
  opts=opts||{}; ensurePids();
  const A=PEN.teams[aid], B=PEN.teams[bid], day=PEN.day, rec=opts.rec!==false;
  const side=(T,tid,errUp)=>{ const gp=gamePitchers(tid,day), st=staff(T);
    const bull0=(st.pen||[]).filter(p=>p!==gp.sp), bull1=bull0.filter(p=>!(typeof cpuPTired==='function'&&cpuPTired(p,T))), bull=bull1.length>=3?bull1:bull0;   // 疲れた・連投の続いた中継ぎは使わない
    return {T,tid,lineup:(T.lineup||[]).slice(0,9),order:-1,sp:gp.sp,bull,used:[],cur:null,curS:null,lim:0,
      fq:1+(50-(T.fdef||50))*0.004+(errUp?0.08:0), cDef:catcherDef(T)}; };
  const S={a:side(A,aid,opts.errA),b:side(B,bid,opts.errB)}, sc={a:0,b:0};
  const bs=b=>(!b||b.isMe||!b.fid||!rec)?null:csGet(b.fid,false);
  const ps=p=>(!p||!p.pid||!rec)?null:csGet(p.pid,true);
  // 投手の交代：先発は球数（スタミナ・出来）まで、そのあとは中継ぎ1〜2回ずつ、9回はリードが3点以内なら抑え
  const setPitcher=(D,p,isSP)=>{ D.cur=p; D.curS={p,s:ps(p),outs:0,r:0,sp:!!isSP,entLead:null,sta:staNew((p.stamina??60)*(isSP&&typeof fatStaMul==='function'?fatStaMul(p.fat||0):1))}; D.used.push(D.curS); if(D.curS.s){ D.curS.s.g++; if(isSP) D.curS.s.gs++; } };
  const lead=k=>k==='a'?sc.a-sc.b:sc.b-sc.a;
  const spPull=(u,L,inn)=>spPullCheck(u.sta,u.r,u.rI,L,inn);
  const choosePitcher=(k,inn,force)=>{ const D=S[k], u=D.curS;
    if(!u){ setPitcher(D,D.sp,true); return; }
    const L=lead(k), need = u.sp ? spPull(u,L,inn) : (u.outs>=u.max||u.r>=3||u.sta.cur<=0); if(u.sp) u.rI=u.r;   // 先発は自分のときの監督と同じ判断（スタミナ・失点）
    let closer=D.bull[0]; const saveSit=inn>=9&&L>0&&L<=3;
    if(saveSit&&D.bull[1]&&!D.used.some(x=>x.p===D.bull[1])&&rnd()<saveShare(D.T)) closer=D.bull[1];   // 評価が近ければセットアッパーがセーブ機会に
    const hold=()=>{ if(u&&!u.sp&&u.s&&u.entLead!=null&&u.entLead>0&&u.entLead<=3&&u.outs>0&&L>0) u.s.hld=(u.s.hld||0)+1; };   // ホールド：セーブがつく場面で出て、リードを保ったまま降板
    if(saveSit&&closer&&D.cur!==closer&&!D.used.some(x=>x.p===closer)){ hold(); setPitcher(D,closer,false); D.curS.max=3; D.curS.entLead=L; return; }
    if(!need&&!force) return;
    const pool=D.bull.slice(1).filter(p=>!D.used.some(x=>x.p===p)), win=L>=0&&L<=3&&inn>=6;   // 勝ちパターン（終盤のリード・同点）はブルペンの上位、それ以外は下位から
    const p=pool.length?wpick(pool.map((x,i)=>[x,win?Math.pow(0.45,i):0.4+i*0.35])):(D.bull.find(p=>!D.used.some(x=>x.p===p))||D.cur);
    if(p===D.cur){ u.max=(u.max||0)+3; return; }
    hold(); setPitcher(D,p,false); D.curS.max=ri(1,2)*3; D.curS.entLead=L; };
  let goA=null;   // 決勝点のとき：{win:'a'|'b', wp, lp}
  const half=(att,def,inn,walk)=>{   // walk：サヨナラで終わる（裏）
    const O=S[att], D=S[def]; choosePitcher(def,inn);
    let outs=0, bases=[null,null,null];
    const score=(n,runners)=>{ if(!n) return; const before=lead(att); sc[att]+=n; D.curS.r+=n; if(D.curS.s){ for(let i=0;i<n;i++) if(rnd()<0.9) D.curS.s.er++; }
      runners.forEach(r=>{ const s=bs(r); if(s) s.run=(s.run||0)+1; });
      if(before<=0&&lead(att)>0) goA={win:att,wp:O.curS,lp:D.curS}; };
    while(outs<3){
      O.order=(O.order+1)%O.lineup.length; const b=O.lineup[O.order]; if(!b){ outs++; continue; }
      if(D.curS.sta.cur<=0){ D.curS.outs+=outs-(D.curS.o0??0); if(D.curS.s) D.curS.s.outs+=outs-(D.curS.o0??0); choosePitcher(def,inn,true); D.curS.o0=outs; }   // 回の途中でスタミナ切れ → 交代
      const P=D.cur, q=clamp((P.q||1)*D.fq*LG_K.q*(1+staF(D.curS.sta)*0.09)*(inPinch(bases)?PINCH.mul:1),0.6,1.6);   /* ピンチではわずかに乱れる */ let r=simPA(b,q); const s=bs(b); if(s) s.pa++;
      { const st=D.curS.sta; st.cur=r1(st.cur-ri(1,7)*staK(st.S)); }   // 1打席で1〜7球ぶんのスタミナを使う（自分と同じ量）
      if(r==='HR'&&rnd()<LG_K.hrCut) r='FO'; else if((r==='GO'||r==='FO'||r==='K')&&rnd()<LG_K.hit) r='1B';
      if(P.rn!=null){ const d=(P.rn-72.5)*0.00258; if(d>0){ if((r==='GO'||r==='FO')&&rnd()<d/0.45) r='K'; } else if(r==='K'&&rnd()<-d/0.21) r='GO'; }   // 力のある投手ほど三振が多い（自分と同じ奪三振率の式）
      let runs=0, sc0=[];
      if(r==='BB'){ if(s) s.bb++; if(bases[0]){ if(bases[1]){ if(bases[2]){ runs++; sc0.push(bases[2]); } bases[2]=bases[1]; } bases[1]=bases[0]; } bases[0]=b; }
      else { if(s) s.ab++;
        if(r==='HR'){ bases.forEach(x=>{ if(x){ runs++; sc0.push(x); } }); runs++; sc0.push(b); bases=[null,null,null]; if(s){ s.h++; s.hr++; } }
        else if(r==='3B'){ bases.forEach(x=>{ if(x){ runs++; sc0.push(x); } }); bases=[null,null,b]; if(s){ s.h++; s.d3++; } }
        else if(r==='2B'){ if(bases[2]){ runs++; sc0.push(bases[2]); } if(bases[1]){ runs++; sc0.push(bases[1]); } const r1=bases[0]; bases=[null,b,null]; if(r1){ if(rnd()<.4){ runs++; sc0.push(r1); } else bases[2]=r1; } if(s){ s.h++; s.d2++; } }
        else if(r==='1B'){ if(bases[2]){ runs++; sc0.push(bases[2]); } const nb=[b,null,null]; if(bases[1]){ if(rnd()<.6){ runs++; sc0.push(bases[1]); } else nb[2]=bases[1]; } if(bases[0]){ if(!nb[2]&&rnd()<.3) nb[2]=bases[0]; else nb[1]=bases[0]; } bases=nb; if(s) s.h++; }
        else if(r==='K'){ outs++; if(s) s.k++; if(D.curS.s) D.curS.s.k++; }
        else if(r==='GO'){ if(bases[0]&&outs<2&&rnd()<.35){ outs+=2; bases[0]=null; } else { outs++; if(outs<3&&bases[2]&&rnd()<.4){ runs++; sc0.push(bases[2]); bases[2]=null; } } }
        else { outs++; if(outs<3&&bases[2]&&rnd()<.5){ runs++; sc0.push(bases[2]); bases[2]=null; } }
      }
      const outsAdd=(r==='K'||r==='GO'||r==='FO')?1:0;   // （併殺は下で）
      if(s&&runs) s.rbi+=(r==='GO'&&runs&&outs>=2)?0:runs;
      score(runs,sc0);
      { const c=staHitCost(r,runs,D.curS.sta.S,pitLv(P,'ストレート')); if(c) D.curS.sta.cur=r1(D.curS.sta.cur-c); }   // 打たれると余分にスタミナを使う（自分と同じ）
      // 盗塁：一塁に出た足に自信のある走者（二塁が空いていて2アウト未満）
      if(outs<2&&bases[0]&&!bases[1]&&(r==='1B'||r==='BB')){ const R=bases[0], sp=R.speed||50;
        if(sp>=60&&rnd()<(sp-55)*LG_K.steal){ const rs=bs(R), ok=rnd()<cpuStealP(sp,D.cDef,(P.velo||145)-8);
          if(ok){ bases[1]=R; bases[0]=null; if(rs) rs.sb++; } else { bases[0]=null; outs++; if(rs) rs.cs++; } } }
      if(walk&&sc[att]>sc[def]) break;
    }
    { const o=Math.min(outs,3)-(D.curS.o0??0); D.curS.outs+=o; if(D.curS.s) D.curS.s.outs+=o; D.curS.o0=0; }
  };
  let inn=1;
  for(;inn<=12;inn++){
    half('a','b',inn,false);
    if(inn>=9&&sc.b>sc.a) break;
    half('b','a',inn,inn>=9);
    if(inn>=9&&sc.a!==sc.b) break;
  }
  // 勝ち負け・セーブ
  if(rec&&sc.a!==sc.b){ const W=sc.a>sc.b?'a':'b', L=W==='a'?'b':'a', g=goA&&goA.win===W?goA:null;
    let wp=(g&&g.wp)||S[W].used[0], lp=(g&&g.lp)||S[L].used[0];
    if(wp&&wp.sp&&wp.outs<15){ const rel=S[W].used.filter(x=>!x.sp); wp=rel.sort((x,y)=>x.r-y.r||y.outs-x.outs)[0]||wp; }
    if(wp&&wp.s) wp.s.w++; if(lp&&lp.s) lp.s.l++;
    const fin=S[W].used[S[W].used.length-1];
    if(fin&&fin!==wp&&fin.s&&fin.entLead!=null&&fin.entLead>0&&fin.entLead<=3&&fin.outs>=3) fin.s.sv++; }
  if(rec){ for(const k of ['a','b']) S[k].lineup.forEach(b=>{ const s=bs(b); if(s) s.g++; }); }
  return {ra:sc.a, rb:sc.b, res:sc.a>sc.b?'W':sc.a<sc.b?'L':'T'};
}
// まだ成績が無いセーブデータ：今日までの試合ぶんを作っておく
function csBackfill(){
  if(!PEN||!PEN.teams||PEN.cs) return; PEN.cs={};
  const d0=PEN.day; for(let d=0;d<Math.min(d0,SEASON_GAMES);d++){ PEN.day=d;
    dayPairs(PEN.sched[d]).forEach(([a,b])=>{ if(!PEN.teams[a]||!PEN.teams[b]) return; simLeagueGame(a,b); }); }
  PEN.day=d0;
  if(typeof save==='function') try{ save(); }catch(e){}   // 作った成績はすぐ保存（読み込み直すたびに作り直されないように）
}
// リーグの成績一覧（キャッシュ）
let CS_CACHE=null;
function csBoard(lg){
  if(!PEN||!PEN.teams) return null; if(!PEN.cs) csBackfill();
  const key=PEN.year+'-'+PEN.day+'-'+lg+'-'+JSON.stringify(PEN.ss&&[PEN.ss.pa,PEN.ss.outs]);
  if(CS_CACHE&&CS_CACHE.key===key) return CS_CACHE;
  const bat=[], pit=[];
  for(const id of lgTeams(lg)){ const T=PEN.teams[id]; if(!T) continue;
    (T.F||[]).forEach(f=>{ const s=PEN.cs[f.id]; if(s) bat.push({key:f.id,name:f.n,team:id,s}); });
    (T.P||[]).forEach(p=>{ const s=p.pid&&PEN.cs[p.pid]; if(s) pit.push({key:p.pid,name:p.name,team:id,s}); }); }
  if(TEAM[PEN.team].lg===lg){ const ms=hasBat()?(isBat()?PEN.ss:PEN.bss):null; if(ms) bat.push({key:'ME',name:PEN.pname,team:PEN.team,me:true,s:ms});
    if(!isBat()&&PEN.ss) pit.push({key:'ME',name:PEN.pname,team:PEN.team,me:true,s:{...PEN.ss,er:PEN.ss.runs}}); }
  CS_CACHE={key,bat,pit}; return CS_CACHE;
}
// 順位（同じ値は同じ順位）。規定：打率は打席がチーム試合数×3.1、防御率は投球回がチーム試合数以上
const CS_STAT={
  avg:{b:true,v:s=>s.ab?s.h/s.ab:0,ok:(s,g)=>s.pa>=g*3.1&&s.pa>0},
  hr:{b:true,v:s=>s.hr,ok:s=>s.hr>0}, sb:{b:true,v:s=>s.sb,ok:s=>s.sb>0}, rbi:{b:true,v:s=>s.rbi,ok:s=>s.rbi>0},
  hit:{b:true,v:s=>s.h,ok:s=>s.h>0}, obp:{b:true,v:s=>s.pa?(s.h+s.bb+(s.hbp||0))/s.pa:0,ok:(s,g)=>s.pa>=g*3.1&&s.pa>0},
  era:{low:true,v:s=>s.outs?s.er*27/s.outs:99,ok:(s,g)=>s.outs>=g*3&&s.outs>0}, win:{v:s=>s.w,ok:s=>s.w>0},
  k:{v:s=>s.k,ok:s=>s.k>0}, sv:{v:s=>s.sv,ok:s=>s.sv>0},
};
const csGames=()=>Math.max(1,PEN.day);
function csSorted(lg,stat){
  const B=csBoard(lg); if(!B) return []; const S=CS_STAT[stat], g=csGames();
  return (S.b?B.bat:B.pit).filter(x=>S.ok(x.s,g)).map(x=>({...x,v:S.v(x.s)})).sort((a,b)=>S.low?a.v-b.v:b.v-a.v);
}
function csRank(lg,stat,key){
  const L=csSorted(lg,stat), i=L.findIndex(x=>x.key===key); if(i<0) return 0;
  const v=L[i].v; return L.findIndex(x=>x.v===v)+1;
}
// 王冠のバッジ（1位金・2位銀・3位銅・4〜5位グレー）
function crownBadge(n){
  if(!n||n>5) return '';
  // 2位の銀は少し青みがかった明るい銀、4・5位は真っ白
  const col=n===1?'#e8b923':n===2?'#cbdbeb':n===3?'#c98443':'#ffffff', defs='';
  return `<svg class="crown" width="19" height="16" viewBox="0 0 19 16" aria-label="${n}位">${defs}<path d="M1.5 15 L1.5 5.5 L5.5 9.5 L9.5 2 L13.5 9.5 L17.5 5.5 L17.5 15 Z" fill="${col}" stroke="#0007" stroke-width=".8" stroke-linejoin="round"/><text x="9.5" y="13.6" text-anchor="middle" font-size="7.5" font-weight="900" fill="#1b1b1b">${n}</text></svg>`;
}
const csLgOf=team=>TEAM[team]?TEAM[team].lg:TEAM[PEN.team].lg;
// 打者の今季成績の1行（打率・本塁打・盗塁＋順位バッジ）
function csLineB(key,team){
  if(!PEN||!PEN.teams) return null; csBoard(csLgOf(team));
  const s=key==='ME'?(isBat()?PEN.ss:PEN.bss):PEN.cs&&PEN.cs[key]; if(!s) return null;
  const lg=csLgOf(team), r=k=>crownBadge(csRank(lg,k,key));
  return `${r('avg')}打率 ${s.ab?f3(s.h/s.ab):'-'}　${r('hr')}本塁打 ${s.hr}　${r('sb')}盗塁 ${s.sb||0}`;
}
// 投手の今季成績の1行（防御率・勝敗＋順位バッジ）
function csLineP(key,team){
  if(!PEN||!PEN.teams) return null; csBoard(csLgOf(team));
  if(key==='ME'&&isBat()) return null;   // 野手の登板（野手登板）は投手の成績がないので出さない
  let s=key==='ME'?PEN.ss:PEN.cs&&PEN.cs[key]; if(!s) return null; if(key==='ME') s={...s,er:s.runs};
  const lg=csLgOf(team), r=k=>crownBadge(csRank(lg,k,key));
  return `${r('era')}防御率 ${s.outs?(s.er*27/s.outs).toFixed(2):'-.--'}　${r('win')}${s.w}勝${s.l}敗`;
}
// タイトル争いのいちばん上のCPU選手（自分を除く）。まだ成績が無いときは null
function csLeader(lg,stat,qualAbs){
  const B=csBoard(lg); if(!B) return null; const S=CS_STAT[stat];
  const L=(S.b?B.bat:B.pit).filter(x=>!x.me&&(qualAbs?qualAbs(x.s):S.ok(x.s,csGames()))).map(x=>({...x,v:S.v(x.s)})).sort((a,b)=>S.low?a.v-b.v:b.v-a.v);
  return L[0]||null;
}
// タイトル判定用：CPUのいちばん上の選手 {name,team,v}（成績が無ければ null）
function csAI(lg,stat,qual,dig){ if(!PEN||!PEN.cs||!Object.keys(PEN.cs).length) return null; const x=csLeader(lg,stat,qual); if(!x) return null; return {name:x.name,team:x.team,v:dig?+x.v.toFixed(dig):x.v}; }
