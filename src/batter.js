
/* ================================================================
   野手（バッター）：ペナントで「野手」を選んだときの打撃
   ・画面は打者（捕手）目線＝投手目線を左右反転して表示（中のデータは投手目線のまま）
   ・狙う球速の幅（バー上で自分の幅を動かす）と狙うコース（ミートで1〜4マス）を決めて「待つ」
   ・選球眼・技術でボール球の見極め／狙っていない球のカット、パワーで長打、走力で三塁打・内野安打・盗塁
   ================================================================ */
const B_ROLE_NAME={'スタメン':'スタメン','代打':'控え（代打）'};
const isBat=()=>!!(typeof PEN!=='undefined'&&PEN&&PEN.pos==='B');
const roleName=r=>B_ROLE_NAME[r]||(typeof PEN!=='undefined'&&PEN&&r===PEN.role&&!isBat()&&typeof pitRoleLabel==='function'?pitRoleLabel():ROLE_NAME[r])||r;   // 投手の今の役割は「先発◯番手」など
const batStat=()=>({g:0,gs:0,pa:0,ab:0,h:0,d2:0,d3:0,hr:0,rbi:0,run:0,bb:0,hbp:0,k:0,sb:0,cs:0,tl:0,php:0,pha:0,phh:0,ds:0,gp:0,pr:0,err:0,fg:0,mBonus:0,mOK:0,mNG:0});   // tl＝タイムリー（打点のついた安打）、php/pha/phh＝代打の打席・打数・安打、ds＝守備固め出場、gp＝守備の好プレー
const B_KEYS=['pa','ab','h','d2','d3','hr','rbi','run','bb','hbp','k','sb','cs','tl','php','pha','phh','ds','gp','pr','err','fg'];
const bAvg=s=>s.ab?s.h/s.ab:0, bObp=s=>s.pa?(s.h+s.bb+s.hbp)/s.pa:0, bSlg=s=>s.ab?(s.h+s.d2+2*s.d3+3*s.hr)/s.ab:0;
const f3=v=>v.toFixed(3).replace(/^0/,'');
// 能力 → 打撃の数字
const meetCells=m=>m>=75?4:m>=50?3:m>=25?2:1;             // 狙えるコースの数
const meetTol=m=>Math.round(3+clamp(m,0,100)*0.27);   // 狙う球速の幅（遅い側：−km/h）：ミート0で3〜100で30
const meetUp=m=>1+Math.round(clamp(m,0,100)/100*2);   // 速い側は+1〜+3km/hだけ（速い球には差し込まれる）
// 狙いからのずれ d（＋＝狙いより速い）に対する許容幅
const tolOf=(d,m)=>d>0?meetUp(m):meetTol(m);
const SWEET=5;   // 狙いの真ん中±5km/hは「芯」：ヒット性になりやすい
// 狙った球速とのずれ→タイミングの良さ（芯の中は0.92〜0.95、芯の外は幅の端に向かって0.85→0.15、幅の外は0）
function timingQ(dv,tol){
  if(dv>tol) return 0;
  if(dv<=Math.min(SWEET,tol)) return 0.95-0.03*dv/SWEET;
  const f=(dv-SWEET)/Math.max(1,tol-SWEET); return 0.85-0.70*f;
}
// 球速バーの範囲（相手投手の持ち球の球速が入るように）
// 本命の球種：狙いの真ん中にいちばん近い持ち球（幅の中にあるときだけ）
function mainType(pit,spd,half,up){
  if(spd==null) return null; let best=null, bd=1e9; if(up==null) up=meetUp(G.babil.meet);
  pit.types.forEach(t=>{ const d=pitSpeed(pit,t)-spd; if(d>up||-d>half) return; const ad=Math.abs(d); if(ad<bd){ bd=ad; best=t; } });
  return best;
}
// [バーの左端, 右端, 狙いの真ん中の最小, 最大]。バーは実際の球速の範囲だけ出し、幅がはみ出す分はバーの外に隠れる
function barRange(pit){
  const sp=pit.types.map(t=>pitSpeed(pit,t)), mn=Math.min(...sp), mx=Math.max(...sp);
  const lo=Math.floor((mn-10)/5)*5, hi=Math.ceil((mx+8)/5)*5;
  return [lo,hi,mn-4,mx+1];
}
// 狙いの球速（中心）をバーの中に収める
function fixSpd(){
  const pit=curPit(), [,,cmin,cmax]=barRange(pit), T=G.target;
  if(typeof T.spd!=='number') T.spd=pitSpeed(pit,pit.types.includes('ストレート')?'ストレート':pit.types[0]);
  T.spd=Math.round(clamp(T.spd,cmin,cmax)); delete T.type;
}
const SHORT_T={'ストレート':'直球','カットボール':'カット','ツーシーム':'2シーム','チェンジアップ':'チェンジ','高速スライダー':'高速スラ','スライダー':'スライダー','スロースライダー':'スロースラ','スイーパー':'スイーパー','シュート':'シュート','高速シュート':'高速シュ','シンカー':'シンカー','高速シンカー':'高速シンカ','カーブ':'カーブ','ドロップカーブ':'ドロップ','スローカーブ':'スローC','パワーカーブ':'パワーC','フォーク':'フォーク','SFF':'SFF'};
const hrRateOf=p=>clamp(HR_MIN*Math.pow(HR_MAX/HR_MIN,(p-18)/81),HR_MIN*0.5,HR_MAX*1.1);
const HR_ME_K=0.9;   // 自分の本塁打率（パワー依存）：打球になったときの基礎率。パワー100・ミート100で年70本くらいになる調整値
// パワーが高いところだけ本塁打率を調整：パワー100（ほかが平均的）で年50本前後になるように
const HR_TOP=(p,k)=>p>50?1+k*Math.pow((p-50)/50,2):1;
const cpuHrRate=p=>myHrRate(p)*HR_TOP(p,0.25);   // CPUの打者と、自分のおまかせ打席（リーグの試合と同じ計算）
const myHrRate=p=>clamp(0.006+Math.pow(clamp(p,0,100)/100,2)*HR_MAX*HR_ME_K,HR_MIN*0.5,HR_MAX*2);
const stealProb=(spd,toThird)=>clamp(0.42+spd*0.005-(toThird?0.25:0)+(typeof myBtype==='function'?btFx(myBtype(),'steal'):0),toThird?0.08:0.25,0.95);   // 三盗は失敗しやすい（成功率−25%）   // タイプ（スピードスター・アスリート）で成功率が上がる
const B_NUM=7;   // 野手の背番号

/* ---- 相手投手 ---- */
// 相手投手：回で決まる（先発〜6回・7回・8回・9回）。スタミナが切れたら次の投手に早めに交代
function cpuSta(i){ G.psta=G.psta||[]; return G.psta[i]||(G.psta[i]=staNew(((G.pits&&G.pits[i])||{}).stamina??50)); }
function curPitIdx(){ if(!G||!G.pits||!G.pits.length) return 0; let i=G.inning<=6?0:G.inning===7?1:G.inning===8?2:3; i=Math.min(Math.max(i,G.pitMin||0),G.pits.length-1);
  while(i<G.pits.length-1&&cpuSta(i).cur<=0&&!(G.meUp&&G.ab&&G.ab.pitches&&G.ab.pitches.length)) i++;   /* 打席の途中では代えない */ if(i>(G.pitMin||0)) G.pitMin=i; return i; }
const curPit=()=>G.pits[curPitIdx()];
const curPitF=()=>G&&G.pits?staF(cpuSta(curPitIdx())):0;   // 相手投手の疲れ（0〜1.5）
const cpuStaUse=(pit,n)=>{ const S=cpuSta(curPitIdx()); S.cur=r1(S.cur-n); };
const pitSpeed0=(pit,t)=>pit.velo-3+(VOFF[t]||0);   // その球種の平均球速（疲れる前）
// 今の平均球速：投げている投手が疲れていると、全球種がストレートと一番遅い球の中間に近づく（球速バーにもそのまま出る）
function pitSpeed(pit,t){ const b=pitSpeed0(pit,t); if(!G||!G.pits||!G.bat||pit!==G.pits[curPitIdx()]) return b; const f=curPitF(); if(!f) return b;
  return tiredSpd(b,pitSpeed0(pit,'ストレート'),Math.min(...pit.types.map(x=>pitSpeed0(pit,x))),f); }
const pbx=(pit,t)=>BREAK[t][0]*(pit.hand==='R'?1:-1);   // 変化の横（投手目線）
const SINKERS=new Set(['フォーク','SFF','チェンジアップ','ドロップカーブ','カーブ','スローカーブ','パワーカーブ','シンカー','高速シンカー']);
// 相手バッテリーの配球（カウント・持ち球・こちらの狙いの傾向を見て決める）
// 傾向読みは投手ごと：その投手があなたと対戦したときの狙い（今までの試合＋この試合）だけを覚えている
const pitKey=p=>p?`${p.name}#${p.num}`:'';
function readsOf(pit){ if(typeof PEN!=='undefined'&&PEN&&PEN.vsP){ const r=PEN.vsP[pitKey(pit)]; if(r) return r; } return G.reads; }
function readsAdd(pit,x){
  G.reads.push(x); if(G.reads.length>20) G.reads.shift();
  if(typeof PEN!=='undefined'&&PEN){ PEN.vsP=PEN.vsP||{}; const k=pitKey(pit), r=PEN.vsP[k]||(PEN.vsP[k]=[]); r.push(x); if(r.length>24) r.shift();
    const ks=Object.keys(PEN.vsP); if(ks.length>300) ks.slice(0,60).forEach(q=>delete PEN.vsP[q]); }
}
function pitAI(pit){
  const ab=G.ab, recent=readsOf(pit).slice(-6), sitT={}, kime=kimeOf(pit), sty=pit.style||'mix';
  pit.types.forEach(t=>{ const s=pitSpeed(pit,t); sitT[t]=recent.filter(x=>x.spd!=null&&(s-x.spd)<=(x.up==null?3:x.up)&&(x.spd-s)<=(x.half||10)).length; });   // その球種の球速を張られた回数
  const pt=wpick(pit.types.map(t=>{
    let x = t==='ストレート'?1.7:1;
    if(t!=='ストレート'){
      const L=pitLv(pit,t); x*=0.7+L*0.12;                       // レベルの高い球ほどよく投げる
      if(ab.strikes===2) x+=0.22*L+(t===kime?0.9:0);              // 追い込んだらレベルの高い球・決め球
    }else if(pit.levs[t]==='決'&&ab.strikes===2) x+=0.6;
    if(ab.balls>ab.strikes&&ab.balls>=2&&PGROUP[t]==='fast') x+=1.2;   // ボール先行は直球系
    if(ab.strikes===2&&PGROUP[t]!=='fast') x+=0.5;                      // 追い込んだら変化球
    if(recent.length>=3&&(sitT[t]||0)/recent.length>=0.5) x*=0.7;        // よく張られている球速の球種は避ける
    if(recent.length>=3&&recent.filter(r=>r.main===t).length/recent.length>=0.5) x*=0.8;   // 本命にされている球種はさらに避ける
    return [t,x]; }));
  const kb=gKeikB();   // 警戒されているとストライクゾーンで勝負してこない・狙われたマスをより避ける・失投が減る
  let zP = (ab.balls===3?0.85 : ab.balls>ab.strikes?0.72 : (ab.strikes===2&&ab.balls<2)?0.36 : 0.58)-0.04*kb;
  if(sty==='ball') zP-= ab.balls===3?0.05 : 0.14;     // ボール球をうまく使う投手
  // 配球パターン（ある程度その方向に偏る）。hz：0=内角〜4=外角（打者から見て）
  const hz=c=>horizIdx(c,G.bhand);
  const styW=(r,c)=>{ const h=hz(c);
    switch(sty){
      case 'out':  return h>=3?2.0:h===2?0.9:0.55;
      case 'in':   return h<=1?2.0:h===2?0.9:0.55;
      case 'high': return r<=1?2.0:r===2?0.9:0.55;
      case 'low':  return r>=3?2.0:r===2?0.9:0.55;
      default: return 1; } };
  const hot=new Map(); readsOf(pit).slice(-8).forEach(x=>x.cells.forEach(k=>hot.set(k,(hot.get(k)||0)+1)));
  const cand=[];
  if(rnd()<zP){
    for(let r=1;r<=3;r++)for(let c=1;c<=3;c++){
      let w=(r===2&&c===2)?(sty==='mix'?0.8:0.5):(r!==2&&c!==2)?1.4:1;
      if(SINKERS.has(pt)) w*= r===3?1.8:r===1?0.5:1;
      w*=styW(r,c);
      w/=1+(hot.get(r+','+c)||0)*(0.12+0.15*kb)*(typeof cbG==='function'&&cbG('data')?0.5:1);   // データ解析：読みが半分   // よく狙われているマスは避ける
      cand.push([[r,c],w]);
    }
  }else{
    for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      if(r>=1&&r<=3&&c>=1&&c<=3) continue; if((r===0||r===4)&&(c===0||c===4)) continue;
      let w=1; if(r===4&&SINKERS.has(pt)) w=3; if(r===0&&pt==='ストレート') w=1.6;
      w*=styW(r,c);
      cand.push([[r,c],w]);
    }
  }
  let [r,c]=wpick(cand);
  const fT=curPitF();
  if(rnd()<clamp(0.42-pit.control*0.0042+(sty==='mix'?0.08:0)+fT*0.15+(inPinch(G.bases)?PINCH.ctl:0)-0.08*kb,0.04,0.6)){   /* 疲れると制球が乱れる */ r=clamp(r+ri(-1,1),0,4); c=clamp(c+ri(-1,1),0,4); }   // 制球ミス
  const speed=jitterSpd(pitSpeed(pit,pt));   // ±2.5km/h（小数第1位まで）。疲れると全球種の球速が近づく
  const sr0=r-BREAK[pt][1], sc0=c-pbx(pit,pt), sr=clamp(sr0,0,4), sc=clamp(sc0,0,4);   // 曲がる前のマス（sr0/sc0はマスの外もそのまま）
  return {pt,r,c,sr,sc,sr0,sc0,speed};
}

/* ---- 自分のスイング：読み（球種・コース）と能力で決まる ---- */
function meObj(){
  const a=G.babil;
  return {name:G.pname,hand:G.bhand,power:a.power,contact:a.meet,speed:a.speed,eye:a.eye,
    avg:clamp(0.205+a.meet*0.0005+a.speed*0.0002,.2,.33),hrRate:cpuHrRate(a.power)*meetHrK(a.meet)*meetHrF(a.meet)*HR_TOP(a.power,EQ.hp),order:G.me.order,type:myBtype()};
}
const BAT_ADJ={wh:-0.05,q:0,ch:-0.03,sure:0.9};
const EQ=Object.assign({q:0.009,qm:0.004,qh:0.003,qp:0.35,qe:3,qx:0.14,sp:0.2,qcap:0.16,wh:0.005,hb:0.76,hlo:0.02,hhi:-0.0064,hp:0.81},(typeof process!=='undefined'&&process.env.EQ)?JSON.parse(process.env.EQ):{});
// 自分の打席の本塁打：CPUと同じ本塁打率（cpuHrRate）に、ミートによる補正（ミートが高いほど打球が良くなって本塁打が増えすぎるのをならす）
const eqQMeet=m=>m<=60?Math.min(EQ.qcap,(60-m)*EQ.q)-Math.max(0,35-m)*0.012 : m<=75?-(m-60)*EQ.qm : -15*EQ.qm-(m-75)*EQ.qh;   // 打球の質の補正（ミート）
const meetHrF=m=>m<=50?EQ.hb+Math.min(50-m,4)*EQ.hlo : m<=75?EQ.hb : Math.max(0.3,EQ.hb-(m-75)*EQ.hhi);
const gKeikB=()=>(G&&G.pen&&typeof keikai==='function')?keikai(true):0;   // 試合中の警戒度（打者）   // 球種を作り直したときの全体のバランス調整（自分が打つ打席）
function batResolve(p){
  const A=G.babil, ab=G.ab, T=G.target, pit=curPit();
  const key=K(p.r,p.c), inZ=inZoneRC(p.r,p.c), inT=T.cells.includes(key), sT=T.cells.includes(K(p.sr,p.sc));
  const dsp=p.speed-T.spd, tol=tolOf(dsp,A.meet), dv=Math.abs(dsp);   // 速い側は+1〜+3しか対応できない
  // 芯（±5km/h）は打ちやすく、幅の端ほどファウル・打ち損じが増える。
  // 本命の球種（真ん中にいちばん近い球種）はさらに打ちやすく、幅に入ったほかの球種は本命より打ちづらい
  const main=mainType(pit,T.spd,meetTol(A.meet),meetUp(A.meet)), isMain=!!main&&p.pt===main;
  let tq=timingQ(dv,tol); if(tq>0) tq = isMain ? Math.min(0.97,tq+0.12) : Math.max(0.08,tq-0.12);
  const brk=Math.hypot(BREAK[p.pt][0],BREAK[p.pt][1]);
  const fooled = sT && !inT && brk>=0.5;   // 狙ったコースから逃げていく変化
  const nearT=T.cells.some(k=>{const[a,b]=k.split(',').map(Number);return Math.abs(a-p.r)<=1&&Math.abs(b-p.c)<=1});
  const eye=A.eye/100, meet=A.meet/100, two=ab.strikes===2;
  // 球の質：変化球はLv（Lv.2が普通、Lv.7でいちばん打ちにくい）、ストレートは球速
  const lvP = p.pt==='ストレート' ? clamp((pitLv(pit,'ストレート')-3)*0.5,-1,2) : clamp((pitLv(pit,p.pt)-2)*0.45,-0.5,2.2), pfT=curPitF(), pq=pit.q*(1+pfT*0.12)*(inPinch(G.bases)?1+PINCH.q*2:1);   // ストレートもLv（3が標準）。疲れた投手は球威が落ちる
  const platoon=(G.bhand==='L'&&pit.hand==='R')||(G.bhand==='R'&&pit.hand==='L');   // 左打ちは右投手、右打ちは左投手に少し三振しづらい
  const fx=pitchFx({pt:p.pt,r:p.r,c:p.c,sr:p.sr0??p.sr,sc:p.sc0??p.sc,hand:G.bhand,phand:pit.hand,mainT:main,mainSpd:T.spd,stSpd:pitSpeed(pit,'ストレート')});   // 球種の特徴（ストライク→ボール・本命とのずれ など）
  let mode;
  if(inT&&tq>0) mode='hit';
  else if(inT) mode='late';
  else if(fooled&&rnd()<0.85-eye*0.35) mode='fooled';
  else if(inZ) mode = two ? (rnd()<0.88+eye*0.1+fx.sw?'cut':'take') : (rnd()<0.03+0.10*(1-eye)+fx.sw*0.3?'chaseZ':'take');   // ボール→ストライクは見逃しやすい
  else mode = rnd()<clamp((1-eye)*0.26+(two?0.10:0)+(nearT?0.07:0)-0.04+btFx(myBtype(),'chase')+fx.swB+BAT_ADJ.ch,0.02,0.7)*(1-0.3*Math.min(1,pfT)) ? 'chase' : 'take';   // 疲れた投手のボール球は見切りやすい   // ストライク→ボールは手を出しやすい
  const read = inT&&isMain&&dv<=SWEET ? '◎ 本命の球種が芯に来た・コースも的中' : inT&&isMain ? '◎ 本命の球種・コース的中' :
    inT&&dv<=SWEET ? '○ 球速は芯・コース的中（本命の球種ではない）' : inT&&tq>=0.45 ? '○ コース的中・球速は芯から少しずれた' :
    inT&&tq>0 ? '△ コース的中・球速は幅の端（ファウル・打ち損じしやすい）' : inT ? '✕ コースは合ったが球速が幅の外だった' :
    fooled ? '✕ 狙ったコースから逃げる変化だった' : inZ ? '－ 狙っていないコースのストライク' : '－ ボール球';
  const base={...p,inZone:inZ,read,mode};
  if(mode==='take'){
    if(!inZ){ if(horizIdx(p.c,G.bhand)===0&&p.r>=1&&p.r<=3&&rnd()<0.04*fx.hbp) return {...base,kind:'hbp',text:'デッドボール'}; return {...base,kind:'ball',text:'ボール'}; }
    return {...base,kind:'look',text:'見逃しストライク'};
  }
  // 振ったときの結果：空振り・ファウル・前に飛ぶ（qが大きいほど良い当たり）
  let wh, fo, q, sure=0;
  if(mode==='hit'){
    sure = isMain&&dv<=SWEET ? Math.min(1,Math.pow(Math.max(0,(meet-0.5)/0.5),1.5))*BAT_ADJ.sure*(1-EQ.sp*Math.max(0,(A.power-50)/50)) : 0;   // 本命が芯・コース的中：ミート100なら100%ヒット性（ミート80で約半分、50以下は0）
    wh=clamp(0.10-meet*0.06+(1-tq)*0.25+lvP*0.04+(pq-1)*0.2+(1-eye)*0.05,0.02,0.35)*(1-sure);
    fo=clamp(0.25-meet*0.06+(1-tq)*0.28,0.07,0.45)*(1-sure);   // 幅の端ほどファウルが増える
    q=-0.02+tq*0.25+meet*0.08-lvP*0.05-(pq-1)*0.5-(1-eye)*0.12+noise(0.2)+sure*0.1;   // 選球眼・技術が低いと狙い球でも打ち損じる
  }else if(mode==='late'){ wh=clamp(0.40-meet*0.2-eye*0.05,0.12,0.45); fo=0.32+meet*0.1; q=-0.22+meet*0.12+noise(0.2); }
  else if(mode==='fooled'){ wh=inZ?0.4-meet*0.1:0.55-meet*0.15; fo=inZ?0.3:0.25; q=(inZ?-0.3:-0.45)+noise(0.15); }
  else if(mode==='cut'){   // 追い込まれて、狙っていない球をカットで逃げる
    if(rnd()<clamp(0.5+eye*0.3+meet*0.2+(typeof cbG==='function'&&cbG('nebari')?0.08:0),0.45,0.95)) return {...base,kind:'foul',text:'ファウル（カット）',cut:true};
    if(rnd()<0.5) return {...base,kind:'swing',text:'空振り（カットし損ねた）'};
    wh=0; fo=0; q=-0.3+noise(0.15);
  }else if(mode==='chaseZ'){ wh=0.3; fo=0.35; q=-0.15+noise(0.18); }
  else { wh=clamp(0.45-meet*0.1,0.25,0.5); fo=0.30+(1-eye)*0.12; q=-0.5+noise(0.15); }   // ボール球に手を出す（選球眼が低いとカットしてしまう）
  wh=clamp(wh+fx.wh*(1-sure)+BAT_ADJ.wh,0,0.9); q+=fx.q+BAT_ADJ.q;   // 球種の特徴（＋全体のバランス調整）
  { const m=A.meet, pw=A.power; q+=eqQMeet(m)-(pw>50?EQ.qp*Math.pow((pw-50)/50,EQ.qe)*meetHrK(m)+EQ.qx*Math.max(0,(m-75)/25)*(pw-50)/50:0); if(m<60) wh=clamp(wh-(60-m)*EQ.wh,0,0.9); }   // 同じ能力のCPUと成績が近くなるように（ミートが低いと打てなさすぎ・高いと打てすぎるのをならす）
  { const kb=gKeikB(); if(kb){ wh=clamp(wh+0.04*kb,0,0.9); q-=0.07*kb; } }   // 警戒：研究されていて打ちにくい
  if(typeof cbG==='function'){ if(two&&cbG('nebari')){ wh*=0.85; q+=0.04; } if(cbG('yosho')&&inPinch(G.bases)){ wh*=0.9; q+=0.05; } }   // コーチ：粘り勝つ（2ストライク後）・要所（得点圏）
  if(platoon) wh*=0.88;
  { const BT=myBtype(); wh=clamp(wh+btFx(BT,'k'),0,0.9); fo=clamp(fo+btFx(BT,'foul'),0,0.9); }   // タイプ：フルスイングは三振↑ファウル↓、ヒットメーカーはファウル↑
  const x=rnd();
  if(x<wh) return {...base,kind:'swing',text:'空振り'};
  if(x<wh+fo){
    if(rnd()<0.05) return {...base,kind:'foulout',text:'キャッチャーファウルフライ',fielder:'キャッチャー'};
    return {...base,kind:'foul',text:'ファウル'};
  }
  BIPFX={gb:fx.gb,fb:fx.fb,xbh:fx.xbh};
  const bip=Object.assign(resolveBIP(p.r,p.c,p.pt,q,{...meObj(),sure,sureK:Math.min(1,Math.pow(Math.max(0,(meet-0.5)/0.5),1.5))}),BIPMETA);
  if(bip.res==='2B'&&rnd()<Math.max(0,(A.speed-50)*0.006)) Object.assign(bip,{res:'3B',bases:3,big:'スリーベース',text:'俊足を飛ばしてスリーベース'});   // 足で三塁へ
  return {...base,kind:'bip',q,bip};
}

/* ---- 走者を進める。b=[一,二,三]（0=なし、1=味方、2=自分） ---- */
function bAdvance(bs,kind,who,outs){
  const b=bs.slice(), sc=[]; let o=0, dp=false, sf=false;
  const spd=v=>v===2?G.babil.speed:50, home=v=>sc.push(v);
  if(kind==='BB'||kind==='HBP'){ if(b[0]){ if(b[1]){ if(b[2]) home(b[2]); b[2]=b[1]; } b[1]=b[0]; } b[0]=who; }
  else if(kind==='HR'){ b.forEach(v=>v&&home(v)); home(who); b[0]=b[1]=b[2]=0; }
  else if(kind==='3B'){ b.forEach(v=>v&&home(v)); b[0]=b[1]=0; b[2]=who; }
  else if(kind==='2B'){ if(b[2])home(b[2]); if(b[1])home(b[1]); const r1=b[0]; b[0]=0; b[1]=who; b[2]=0; if(r1){ if(rnd()<0.4+(spd(r1)-50)*0.006) home(r1); else b[2]=r1; } }
  else if(kind==='1B'||kind==='IFH'){
    const nb=[who,0,0];
    if(b[2]) home(b[2]);
    if(b[1]){ if(kind==='1B'&&rnd()<0.6+(spd(b[1])-50)*0.006) home(b[1]); else nb[2]=b[1]; }
    if(b[0]){ if(kind==='1B'&&!nb[2]&&rnd()<0.3+(spd(b[0])-50)*0.005) nb[2]=b[0]; else nb[1]=b[0]; }
    b[0]=nb[0]; b[1]=nb[1]; b[2]=nb[2];
  }
  else if(kind==='GO'){
    if(b[0]&&outs<2&&rnd()<0.45-(spd(who)-50)*0.004){ o=2; dp=true; b[0]=0; if(b[1]&&!b[2]){ b[2]=b[1]; b[1]=0; } }
    else { o=1; if(outs+1<3){ if(b[2]&&rnd()<.45){ home(b[2]); b[2]=0; } if(b[1]&&!b[2]&&rnd()<.5){ b[2]=b[1]; b[1]=0; } if(b[0]&&!b[1]){ b[1]=b[0]; b[0]=0; } } }
  }
  else if(kind==='FO'){ o=1; if(outs+1<3&&b[2]&&rnd()<.75){ home(b[2]); b[2]=0; sf=true; } }
  else o=1;   // 三振・ライナー・内野フライ
  if(outs+o>=3) sc.length=0;   // 3アウト目のあとは点が入らない
  return {b,sc,o,dp,sf};
}

/* ---- 試合の準備 ---- */
function batNewGame(o){
  const pits=(o.pits&&o.pits.length>=4?o.pits.map(x=>({...x})):[genPitcher(),genPitcher(),genPitcher(),genPitcher()]).map(upgradePit);
  const me={isMe:true,name:o.pname,hand:o.bhand==='S'?'L':o.bhand,order:o.order||9,type:'あなた',num:B_NUM,res:[]};
  const myL=o.myLineup.map((b,i)=>({...b,order:i+1,res:[]}));
  if(o.kind!=='pinch') myL[me.order-1]={...me,avg:0,hrRate:0};
  const POSK={C:'捕','1B':'一','2B':'二','3B':'三',SS:'遊',DH:'指',P:'投'};
  const myPosK = o.kind==='pinch' ? '' : o.slot==='OF' ? (o.ofSide||pick(['左','中','右'])) : (POSK[o.slot]||'');   // 試合中の守備位置（漢字1文字）
  G={bat:true,pen:o.pen,names:o.names,pname:o.pname,myPosK,bhand:o.bhand==='S'?'L':o.bhand,sw:o.bhand==='S',babil:{...(typeof effBabil==='function'?effBabil(o.babil,o.kind):o.babil)},babilRaw:{...o.babil},mission:o.mission||null,
    inning:1,half:'top',outs:0,bases:[0,0,0],score:{opp:[],my:[]},hitsOpp:0,hitsMy:0,
    lineup:o.lineup, oppOrder:-1, myTeam:{name:o.myTeam.name,hand:o.myTeam.hand,lineup:myL,order:-1},
    me, meActive:o.kind!=='pinch', pinch:o.kind==='pinch'?{inning:o.pinchInning||ri(6,8),after:ri(0,2),done:false}:null,
    pits, ours:o.ours&&o.ours.length>=3?o.ours.map(x=>({...x})):[genPitcher(),genPitcher(),genPitcher()], defAdj:o.defAdj||1, st:{...batStat(),g:1},
    ab:{balls:0,strikes:0,pitches:[]}, abOver:true, meUp:false, stealAsk:null, target:{spd:null,cells:[]}, reads:[],
    over:false, result:null, lastBIP:null, xBottom:false, halfPA:0, autoMe:false, order:0, st0:null};
  OPP=o.OPP;
  $('log').innerHTML='';
  addLog(`<div class="chg">${o.names.my.name} vs ${o.names.opp.name}　${o.kind==='pinch'?'代打で待機':`スタメン ${me.order}番`}</div>`);
}
// 相手打線（まとめて1イニングずつ）
const ourQ=()=>(G.inning<=6?G.ours[0].q:G.ours[Math.min(2,G.inning-6)].q)*(G.defAdj||1);   // 味方の守備が良いほど打たれにくい
function topHalf(Q){
  const i=G.inning-1, hb=G.hitsOpp, T={lineup:G.lineup,order:G.oppOrder};
  const r=simHalf(T,0,[0,0,0],ourQ(),null); G.oppOrder=T.order;
  G.score.opp[i]=r.runs; G.hitsOpp+=r.hits;
  addLog(`<div class="relief">🧢 ${G.inning}回表 ${G.names.opp.name}の攻撃：${r.runs?r.runs+'点':'無得点'}${r.ev.length?'<br>　'+r.ev.join(' / '):''}</div>`);
  Q.push({summary:true,half:'top',inning:G.inning,order:0,name:'',hand:'R',avg:0,hrRate:0,
    label:r.runs?`${r.runs}点を取られた`:'無得点に抑えた',hit:r.runs>0,outs:3,bases:[0,0,0],
    score:{opp:G.score.opp.slice(),my:G.score.my.slice()},hits:[G.hitsOpp,G.hitsMy],sub:r.ev.slice(0,3).join(' / ')});
}
const meOnBase=()=>G.bases.indexOf(2);
// 盗塁できるか（自分が一塁か二塁にいて、次の塁が空いている）
const stealKey=()=>G.inning+G.half+G.bases.join('');   // 同じ走者の状況では1回だけ聞く
function canSteal(){ const i=meOnBase(); return !G.over&&G.half==='bot'&&G.outs<3&&(i===0||i===1)&&!G.bases[i+1]&&G.babil.speed>=35; }
// 味方の攻撃を1打席ずつ進める。自分の番（または盗塁の判断）が来たら止まる
function bottomRun(Q){
  const T=G.myTeam, pit=curPit();
  if(G.walk) return 'end';
  while(G.outs<3){
    if(canSteal()&&G.stealAsk!==stealKey()&&!G.autoMe) return 'steal';
    if(canSteal()&&G.autoMe&&G.stealAsk!==stealKey()){ G.stealAsk=stealKey(); if(stealExpect(G.babil.speed,meOnBase()===1)>=0.75) Q.push(doSteal()); if(G.outs>=3) break; }
    const nx=(T.order+1)%9, pinchNow=G.pinch&&!G.pinch.done&&G.inning===G.pinch.inning&&G.halfPA>=G.pinch.after;
    if((T.lineup[nx].isMe&&G.meActive)||pinchNow){
      if(pinchNow){ G.pinch.done=true; G.me.order=nx+1; }
      T.order=nx; G.halfPA++;
      if(G.autoMe){ Q.push(autoMyPA(pit)); if(G.walk) return 'end'; continue; }
      startMyPA(); return 'me';
    }
    T.order=nx; G.halfPA++;
    const b=T.lineup[nx], r=simPA(b,pit.q*(1+curPitF()*0.12)*(inPinch(G.bases)?PINCH.mul:1)), kind=r==='K'?'K':r;
    { const S=cpuSta(curPitIdx()); S.cur=r1(S.cur-ri(1,7)*S.S/(S.S+staN(S.S))); }   // 味方の打席でも相手投手はスタミナを使う
    const adv=bAdvance(G.bases,kind,1,G.outs);
    G.bases=adv.b; G.outs+=adv.o; const runs=adv.sc.length; if(adv.sc.includes(2)) G.st.run++;
    G.score.my[G.inning-1]=(G.score.my[G.inning-1]||0)+runs;
    const hit=['1B','2B','3B','HR'].includes(r); if(hit) G.hitsMy++;
    b.res.push({'1B':'安打','2B':'二塁打','3B':'三塁打','HR':'本塁打','BB':'四球','K':'三振','GO':adv.dp?'併殺':'ゴロ','FO':'飛'}[r]);
    Q.push(tmEvent(b,r,adv,runs,pit));
    if(!G.tryout&&G.inning>=INNINGS&&myTot()>oppTot()){ G.walk=true; return 'end'; }   // サヨナラ
  }
  return 'end';
}
function tmEvent(b,r,adv,runs,pit){
  const side = rnd()<0.5 ? (b.hand==='R'?'left':'right') : pick(['left','center','right']);
  const d={left:'左',center:'中',right:'右'}[side], ofF={left:'LF',center:'CF',right:'RF'}[side], ifF=pick({left:['3B','SS'],center:['SS','2B','P'],right:['2B','1B']}[side]);
  let label, bip=null, hit=false;
  if(r==='HR'){label=d+'本塁打';hit=true;bip={kind:'fly',side,res:'HR'}}
  else if(r==='3B'){label=d+'3塁打';hit=true;bip={kind:'liner',side,res:'3B'}}
  else if(r==='2B'){label=d+'2塁打';hit=true;bip={kind:'liner',side,res:'2B'}}
  else if(r==='1B'){label=d+'安';hit=true;bip={kind:rnd()<.5?'ground':'liner',side,res:'1B'}}
  else if(r==='BB'){label='四球';hit=true}
  else if(r==='K'){label=rnd()<.35?'見逃し三振':'空振り三振'}
  else if(r==='GO'){label=POS1[ifF]+(adv.dp?'併殺打':'ゴロ');bip={kind:'ground',side,res:'GO',fielder:ifF}}
  else {label=POS1[ofF]+(adv.sf?'犠飛':'飛');bip={kind:'fly',side,res:'FO',fielder:ofF}}
  if(bip) bip.seed=rnd();
  return {half:'bottom',inning:G.inning,order:b.order,name:b.name,hand:b.hand,avg:b.avg,hrRate:b.hrRate,label:label+(runs?`（${runs}点）`:''),hit,bip,
    outs:Math.min(G.outs,3),bases:G.bases.slice(),pitcher:pit,score:{opp:G.score.opp.slice(),my:G.score.my.slice()},hits:[G.hitsOpp,G.hitsMy]};
}
// 自分の打席・盗塁・試合終了まで進める。見せる出来事の列を返す
function batProceed(){
  const Q=[];
  if(G.tw){ const st=bottomRun(Q); if(st==='end') twBottomEnd(); return Q; }   // 二刀流：その裏の攻撃だけ
  while(!G.over){
    if(G.half==='top'){
      if(G.outs<3) topHalf(Q);
      if(!G.tryout&&G.inning>=INNINGS&&myTot()>oppTot()){ G.xBottom=true; batFinish(); break; }   // 9回以降、表の終わりでリード
      G.half='bot'; G.outs=0; G.bases=[0,0,0]; G.score.my[G.inning-1]=G.score.my[G.inning-1]||0; G.halfPA=0; G.stealAsk=null;
    }
    if(G.tryout&&G.st.pa>=TRYOUT_PA){ batFinish(); break; }   // トライアウトは10打席で終わり
    const st=bottomRun(Q);
    if(st==='me'||st==='steal') break;
    if(G.tryout){ if(G.inning>=30){ batFinish(); break; } }
    else if(G.walk||(G.inning>=INNINGS&&myTot()!==oppTot())||G.inning>=MAX_INN){ batFinish(); break; }
    G.inning++; G.half='top'; G.outs=0; G.bases=[0,0,0]; G.score.opp[G.inning-1]=0;
  }
  return Q;
}
function swSet(h){ G.bhand=h; if(G.me) G.me.hand=h; const b=G.myTeam&&G.myTeam.lineup&&G.myTeam.lineup.find(x=>x.isMe); if(b) b.hand=h; }
function swToggle(){ if(!G.sw||!G.meUp||G.ab.pitches.length) return; swSet(G.bhand==='L'?'R':'L'); renderAll(); save(); }
function startMyPA(){
  G.meUp=true; G.abOver=false; G.ab={balls:0,strikes:0,pitches:[]}; G.st0={...G.st};
  if(G.sw){ const p0=curPit(); swSet(p0.hand==='L'?'R':'L'); }   // 両打ち：相手投手と逆の打席に（1球目まで変えられる）
  if(!G.target) G.target={spd:null,cells:[]};
  fixSpd();   // 狙いの球速は前の打席のまま（投手が代わればバーに収まるように）
  const max=meetCells(G.babil.meet); if(G.target.cells.length>max) G.target.cells=G.target.cells.slice(-max);
  const p=curPit();
  addLog(`<div class="ab">▶ ${G.inning}回裏 ${G.me.order}番 ${G.pname}（あなた）　投手 ${p.name}（${p.hand==='L'?'左':'右'}・最速${p.velo}km/h）</div>`);
}

/* ---- 1球 ---- */
function batPitch(){
  if(!G.meUp||busy) return;
  if(!G.target.cells.length){ const el=$('selinfo'); el.textContent='狙うコースのマスをタップしてください'; el.classList.add('warn'); return; }
  const pit=curPit(), p0=pitAI(pit);
  { const S=cpuSta(curPitIdx()); S.cur=r1(S.cur-staCost(p0.pt,pitLv(pit,p0.pt),S.S)); }   // 相手投手のスタミナ
  readsAdd(pit,{spd:G.target.spd,half:meetTol(G.babil.meet),up:meetUp(G.babil.meet),cells:G.target.cells.slice(),main:mainType(pit,G.target.spd,meetTol(G.babil.meet),meetUp(G.babil.meet))});
  busy=true; renderAll();
  animatePitch(p0.r,p0.c,p0.pt,()=>{ busy=false; batAfterPitch(p0); });
}
function batAfterPitch(p0){
  const ab=G.ab, p=batResolve(p0); ab.pitches.push(p);
  let done=null;
  if(p.kind==='ball'){ ab.balls++; if(ab.balls>=4) done='BB'; }
  else if(p.kind==='hbp') done='HBP';
  else if(p.kind==='look'||p.kind==='swing'){ ab.strikes++; if(ab.strikes>=3) done='K'; }
  else if(p.kind==='foul'){ if(ab.strikes<2) ab.strikes++; }
  else done=p.kind==='foulout'?'FF':p.bip.res;
  addLog(`<div>${ab.pitches.length}球目 ${p.speed}km/h ${p.pt}・${courseName(p.r,p.c,G.bhand)} → ${p.kind==='bip'?'<b>'+p.bip.big+'</b>':p.text} <span style="color:var(--mute);font-size:12px">［${p.read}］</span></div>`);
  $('reveal').innerHTML=`<div class="reveal">🔍 読み：<b>${p.read}</b>${p.mode==='cut'&&p.kind==='foul'?'（追い込まれてカット）':''}</div>`;
  if(done) batEndPA(done,p);
  else{
    const cls={ball:'cb',hbp:'cb',look:'cs',swing:'cs',foul:'cf'}[p.kind];
    setResult(cls,p.kind==='foul'?'ファウル':p.text,`${p.speed}km/h ${p.pt}、${courseName(p.r,p.c,G.bhand)}`,abPitchNo());   // 丸の数字＝この打席の何球目か
    renderAll(); save();
  }
}
const B_LABEL={K:'三振',BB:'四球',HBP:'死球'};
function batEndPA(kind,p){
  const st=G.st, A=G.babil; G.meUp=false; G.abOver=true;
  st.pa++;
  if(G.tryout){ G.tryoutEnd=true; }
  let big,sub,cls,rbi=0;
  const map={'1B':'1B','IFH':'IFH','2B':'2B','3B':'3B','HR':'HR','GO':'GO','FO':'FO','LO':'LO','PO':'PO','FF':'FF','K':'K','BB':'BB','HBP':'HBP'};
  const adv=bAdvance(G.bases,map[kind],2,G.outs);
  G.bases=adv.b; G.outs+=adv.o; const runs=adv.sc.length;
  G.score.my[G.inning-1]=(G.score.my[G.inning-1]||0)+runs;
  if(adv.sc.includes(2)) st.run++;
  if(kind!=='GO'||!adv.dp) rbi=runs;
  if(kind==='BB'||kind==='HBP'){ st[kind==='BB'?'bb':'hbp']++; cls='bb'; big=kind==='BB'?'フォアボール':'デッドボール'; sub='出塁'; }
  else if(kind==='K'){ st.ab++; st.k++; cls='k'; big='三振'; sub=p.kind==='look'?'見逃し三振':'空振り三振'; }
  else if(kind==='FF'){ st.ab++; cls='out'; big='捕邪飛'; sub='キャッチャーファウルフライ'; }
  else{
    const x=p.bip; if(!adv.sf) st.ab++;
    if(!x.out){ st.h++; G.hitsMy++; if(x.res==='2B') st.d2++; if(x.res==='3B') st.d3++; if(x.res==='HR') st.hr++; if(rbi>0) st.tl=(st.tl||0)+1; }
    cls=x.cls; big=npbLabel(p,x.big); sub=x.text;
    if(adv.dp){ big=(POS1[x.fielder]||'')+'併殺打'; sub=x.text+' → 併殺打'; }
    G.lastBIP={kind:x.kind,side:x.side,fielder:x.fielder,res:x.res,label:big,q:p.q,seed:rnd()};
    if(typeof setView==='function') setView('ground',true);
  }
  st.rbi+=rbi;
  G.me.res.push(B_LABEL[kind]||(p.kind==='bip'?shortRes(p,big):'邪飛'));
  setResult(RES_CLS[cls]||cls,big,`${p.speed}km/h ${p.pt}、${sub}${rbi?`／<b style="color:var(--red)">${rbi}打点</b>`:''}`,abPitchNo());
  addLog(`<div>　結果：<b>${big}</b>${rbi?`（${rbi}打点）`:''}</div>`);
  if(G.pinch) G.meActive=false;   // 代打は1打席だけ
  if(!G.tryout&&G.inning>=INNINGS&&myTot()>oppTot()) G.walk=true;
  renderAll(); save();
}
// 盗塁
// 盗塁：走った球の球種・球速と、相手捕手の守備で決まる（打者が空振りするとほんの少し成功しやすい）
const oppCatcherDef=()=>G&&G.pen&&typeof PEN!=='undefined'&&PEN&&PEN.teams&&G.pen.opp&&!G.pen.wbc&&!G.pen.allstar?catcherDef(PEN.teams[G.pen.opp]):50;
const stealExpect=(spd,toThird)=>clamp(stealProb(spd,toThird)+(50-oppCatcherDef())*0.004,toThird?0.05:0.15,0.97);   // 表示用のおおよその成功率
function stealPitch(){
  const pit=curPit(), t=wpick(pit.types.map(x=>[x,x==='ストレート'?1.7:0.7+pitLv(pit,x)*0.12])), v=jitterSpd(pitSpeed(pit,t));
  return {t,v,whiff:rnd()<0.1};
}
function doSteal(){
  const i=meOnBase(), sp=stealPitch(), cd=oppCatcherDef();
  const p=clamp(stealProb(G.babil.speed,i===1)+(145-sp.v)*0.005-0.045+(50-cd)*0.004+(sp.whiff?0.03:0),i===1?0.05:0.15,0.97), ok=rnd()<p;
  G.stealAsk=null;
  if(ok){ G.bases[i]=0; G.bases[i+1]=2; G.st.sb++; }
  else { G.bases[i]=0; G.outs++; G.st.cs++; }
  const how=`${sp.t} ${sp.v}km/h${sp.whiff?'・打者が空振り':''}・捕手の守備${Math.round(cd)}`;
  const label = ok ? `${i===0?'二':'三'}盗成功！（${how}）` : `盗塁失敗（${i===0?'二':'三'}塁でタッチアウト・${how}）`;
  addLog(`<div>🏃 ${label}</div>`);
  G.stealAsk=stealKey();
  return {half:'bottom',inning:G.inning,order:G.me.order,name:G.pname,hand:G.bhand,avg:0,hrRate:0,label,hit:ok,outs:Math.min(G.outs,3),bases:G.bases.slice(),
    score:{opp:G.score.opp.slice(),my:G.score.my.slice()},hits:[G.hitsOpp,G.hitsMy],isMe:true};
}
// 能力から1打席をおまかせで決める（スキップ用）
// おまかせ打席：CPUの打者とまったく同じ計算（同じ能力ならCPUと同じ成績になる）
//  能力（内部値）から CPUと同じ形の打者データを作り、リーグの試合と同じ simPA＋調整値（LG_K）で1打席を決める
const LG_QAVG=1.05;   // リーグの平均的な投手の打たれやすさ（投手の質×リーグの調整×疲れ）
function meCpuB(A){ return {avg:clamp(0.172+A.meet*0.00135+A.speed*0.00035,.180,.365),hrRate:cpuHrRate(A.power),contact:A.meet,power:A.power,speed:A.speed,eye:A.eye,type:myBtype()}; }
function autoKind(A,pit,risp){
  const kb=typeof keikai==='function'?keikai(true):0;   // 前年の活躍で警戒されている：打ちにくくなる
  let q=(pit&&pit.q?pit.q*LG_K.q:LG_QAVG)*(1-0.1*kb);
  if(pit&&G&&((G.bhand==='L'&&pit.hand==='R')||(G.bhand==='R'&&pit.hand==='L'))) q*=1.02;   // 左打ち×右投手、右打ち×左投手
  let r=simPA(meCpuB(A),q);
  if(r==='HR'&&rnd()<LG_K.hrCut) r='FO'; else if((r==='GO'||r==='FO'||r==='K')&&rnd()<LG_K.hit) r='1B';
  if((r==='GO'||r==='FO')&&rnd()<0.04*kb) r='K';
  if(r==='FO'&&rnd()<0.25) r='LO';
  if(r==='1B'&&rnd()<A.speed*0.0012) r='IFH';
  if(typeof cbOn==='function'){ if(cbOn('nebari')&&r==='K'&&rnd()<0.15) r=rnd()<0.4?'1B':'FO'; if(cbOn('yosho')&&risp&&(r==='GO'||r==='FO'||r==='K')&&rnd()<0.06) r='1B'; }   // コーチの効果（おまかせの打席）
  return r;
}
function autoMyPA(pit){
  const kind=autoKind(G.babil,pit,inPinch(G.bases)), st=G.st; st.pa++;
  { const S=cpuSta(curPitIdx()); S.cur=r1(S.cur-ri(1,7)*S.S/(S.S+staN(S.S))); }
  const adv=bAdvance(G.bases,kind,2,G.outs); G.bases=adv.b; G.outs+=adv.o;
  const runs=adv.sc.length; G.score.my[G.inning-1]=(G.score.my[G.inning-1]||0)+runs; if(adv.sc.includes(2)) st.run++;
  const hit=['1B','IFH','2B','3B','HR'].includes(kind);
  if(kind==='BB') st.bb++; else if(kind==='HBP') st.hbp++; else if(!adv.sf) st.ab++;
  if(kind==='K') st.k++;
  if(hit){ st.h++; G.hitsMy++; if(kind==='2B') st.d2++; if(kind==='3B') st.d3++; if(kind==='HR') st.hr++; }
  if(kind!=='GO'||!adv.dp) st.rbi+=runs;
  const L={'1B':'ヒット','IFH':'内野安打','2B':'ツーベース','3B':'スリーベース','HR':'ホームラン','BB':'四球','HBP':'死球','K':'三振','GO':adv.dp?'併殺打':'ゴロ','FO':adv.sf?'犠牲フライ':'フライ','LO':'ライナー'}[kind];
  G.me.res.push(L);
  if(G.pinch) G.meActive=false;
  if(!G.tryout&&G.inning>=INNINGS&&myTot()>oppTot()) G.walk=true;
  const side=pick(['left','center','right']);
  const bip=['GO','FO','LO','1B','IFH','2B','3B','HR'].includes(kind)?{kind:kind==='GO'||kind==='IFH'?'ground':kind==='LO'||kind==='2B'||kind==='3B'?'liner':'fly',side,res:kind==='LO'?'FO':kind,fielder:kind==='GO'?pick(['SS','2B','3B','1B']):kind==='FO'||kind==='LO'?{left:'LF',center:'CF',right:'RF'}[side]:undefined,seed:rnd()}:null;
  return {half:'bottom',inning:G.inning,order:G.me.order,name:G.pname,hand:G.bhand,avg:0,hrRate:0,label:L+(runs?`（${runs}点）`:''),hit:hit||kind==='BB'||kind==='HBP',bip,
    outs:Math.min(G.outs,3),bases:G.bases.slice(),pitcher:pit,score:{opp:G.score.opp.slice(),my:G.score.my.slice()},hits:[G.hitsOpp,G.hitsMy],isMe:true};
}
// 「次へ」：打席のあと・盗塁を決めたあと、試合を進める
function batNext(){
  if(G.over){ if(typeof penBack==='function') penBack(); return; }
  if(G.meUp) return;
  if(canSteal()) G.stealAsk=stealKey();   // 盗塁しないで進める
  batGo();
}
function batGo(){
  const Q=batProceed(); save();
  playBack(Q,batAfterPlay);
}
// 再生が終わったら：自分の打席なら配球（ゾーン）画面に戻す／試合終了なら結果
function batAfterPlay(){
  if(G.tw&&!G.bat){ afterBottom(); return; }   // 二刀流：攻撃が終わったら投球に戻る
  if(G.meUp&&typeof setView==='function') setView('pitch');
  renderAll(); if(G.over&&typeof showFinal==='function') showFinal(G.result.res,'－');
}
function batSteal(){
  if(!canSteal()||G.meUp||busy) return;
  const ev=doSteal(); save();
  playBack([ev],batAfterPlay);
}
// ここからスキップ（残りの自分の打席もおまかせで）
function batSkipRest(){
  if(!G||G.over||busy) return null;
  G.autoMe=true;
  if(G.meUp){ G.meUp=false; G.abOver=true; G.halfPA--; G.myTeam.order=(G.myTeam.order+8)%9; if(G.pinch){ G.pinch.done=false; } }   // 打席の途中ならその打席からおまかせ
  return batProceed();
}
function batFinish(){
  if(G.over) return;
  G.over=true; G.meUp=false; G.abOver=true;
  const my=myTot(), opp=oppTot(), res=my>opp?'W':my<opp?'L':'T';
  G.result={res,dec:'－'};
  addLog(`<div class="chg">― 試合終了　${G.names.opp.name} ${opp} − ${my} ${G.names.my.name}（${{W:'勝利',L:'敗戦',T:'引き分け'}[res]}） ―</div>`);
  if(G.pen&&typeof penGameDone==='function') penGameDone();
}
const batLineTxt=s=>`${s.ab}打数${s.h}安打${s.hr?` ${s.hr}本塁打`:''}${s.rbi?` ${s.rbi}打点`:''}${s.bb+s.hbp?` ${s.bb+s.hbp}四死球`:''}${s.sb?` ${s.sb}盗塁`:''}`;

/* ================= 二刀流：先発の日は打席にも立つ（DHなし） ================= */
const isTW=()=>!!(typeof PEN!=='undefined'&&PEN&&PEN.pos==='W');
const hasBat=()=>!!(typeof PEN!=='undefined'&&PEN&&(PEN.pos==='B'||PEN.pos==='W'));
function twBatEval(){ const r=ratingB(PEN.bss||batStat()); return r==null?abilityRB():r; }
// 試合を二刀流用にする（newGame のあと）
function twSetup(lineup){
  const me=lineup.find(b=>b.isMe);
  Object.assign(G,{tw:true,babil:perfB(typeof cbBab==='function'?cbBab(PEN.babil):PEN.babil),babilRaw:{...PEN.babil},bhand:PEN.bhand==='S'?'L':PEN.bhand,sw:PEN.bhand==='S',bst:{...batStat(),g:1},me:{isMe:true,name:G.pname,hand:PEN.bhand==='S'?'L':PEN.bhand,order:me.order,num:MYNUM,res:[]},
    target:{spd:null,cells:[]},reads:[],pits:[G.oppPitcher,...G.oppPen].slice(0,4),meActive:true,pinch:null,meUp:false,autoMe:false,walk:false,stealAsk:null,halfPA:0});
  while(G.pits.length<4) G.pits.push(G.oppPitcher);
  G.myTeam.lineup=lineup.map(b=>({...b,res:[]}));
}
// 表が終わったら、その裏の攻撃（自分の打席は自分で打つ）
function twBottomStart(){
  G.pctx={st:G.st,ab:G.ab,abOver:G.abOver};
  Object.assign(G,{bat:true,half:'bot',outs:0,bases:[0,0,0],st:G.bst,ab:{balls:0,strikes:0,pitches:[]},abOver:true,halfPA:0,stealAsk:null,walk:false,meUp:false});
  G.score.my[G.inning-1]=0;
  addLog(`<div class="chg">― ${G.inning}回表終了　相手 ${oppTot()} − ${myTot()} 味方 ―</div>`);
  return batProceed();
}
function twBottomEnd(){
  const over=G.walk||(G.inning>=INNINGS&&myTot()!==oppTot())||G.inning>=MAX_INN;
  const c=G.pctx||{st:newStat(),ab:{balls:0,strikes:0,pitches:[]}};
  G.bst=G.st; G.st=c.st; G.ab=c.ab; G.abOver=true; G.pctx=null;
  Object.assign(G,{bat:false,half:'top',meUp:false,autoMe:false,outs:3,bases:[0,0,0]});
  G.bottomDone=G.inning; G.bottomOver=over; G.lastBottom=null;
  addLog(`<div class="mybat">⚾ ${G.inning}回裏 味方の攻撃：${G.score.my[G.inning-1]||0}点${G.walk?'（サヨナラ！）':''}</div>`);
  if(typeof trackExit==='function') trackExit();
}
// 降板後の二刀流：表はリリーフがまとめて投げ、裏の自分の打席は自分で打つ
function twReliefTop(fromOuts,bases){
  const T={lineup:G.lineup,order:G.order}, pk=G.twPk||0, pit=G.bullpen[pk%G.bullpen.length]; G.twPk=pk+1;
  const i=G.inning-1, base=G.score.opp[i]||0, hb=G.st.hits+G.hitsOpp;
  const r=simHalf(T,fromOuts,bases,pit.q,null); G.order=T.order;
  G.score.opp[i]=base+r.runs; G.hitsOpp+=r.hits; G.outs=3;
  addLog(`<div class="relief">🧢 ${G.inning}回表 ${pit.name}：${r.runs?r.runs+'失点':'無失点'}${r.ev.length?'<br>　'+r.ev.join(' / '):''}</div>`);
  let h=0; const Q=r.pas.map(p=>{ const opp=G.score.opp.slice(); opp[i]=base+p.runsSoFar; if(p.hit&&p.label!=='四球')h++;
    return {...p,half:'top',pitcher:pit,inning:G.inning,score:{opp,my:G.score.my.slice()},hits:[hb+h,G.hitsMy]}; });
  if(typeof trackExit==='function') trackExit();
  return Q;
}
function twRestGo(Q){
  if(G.inning>=INNINGS&&myTot()>oppTot()){ G.xBottom=true; G.bottomDone=G.inning; G.bottomOver=true; playBack(Q,()=>{ finishGame(); renderAll(); save(); }); return; }
  const Q2=twBottomStart(); save(); playBack(Q.concat(Q2),batAfterPlay);
}
function twRestFirst(){
  G.restDone=true;
  const Q=G.outs<3?twReliefTop(G.outs,G.bases.slice()):[];
  twRestGo(Q);
}
function twRestTop(){
  G.inning++; G.outs=0; G.bases=[0,0,0]; G.score.opp[G.inning-1]=0;
  const Q=twReliefTop(0,[0,0,0]);
  twRestGo(Q);
}
// 自動で進む打席（降板後・スキップ）の自分の打撃成績
function twAutoRec(r,sc,dp){
  const s=G.bst; s.pa++;
  if(r==='BB') s.bb++; else s.ab++;
  if(r==='K') s.k++;
  if(['1B','2B','3B','HR'].includes(r)){ s.h++; if(r==='2B') s.d2++; if(r==='3B') s.d3++; if(r==='HR'){ s.hr++; s.run++; } if(sc>0&&!dp) s.tl=(s.tl||0)+1; }
  if(!dp) s.rbi+=sc;
  if(G.me) G.me.res.push({'1B':'安打','2B':'二塁打','3B':'三塁打','HR':'本塁打','BB':'四球','K':'三振','GO':dp?'併殺':'ゴロ','FO':'飛'}[r]);
}
// スキップのとき：先発した日の打撃（打順なりの打席数）
function twSkipBat(outs){
  const A=perfB(typeof cbBab==='function'?cbBab(PEN.babil):PEN.babil), st=batStat(), npa=Math.max(1,Math.round(3.6*Math.min(1,outs/18+0.4)+(rnd()-.5)));
  for(let i=0;i<npa;i++){ const k=autoKind(A); st.pa++;
    if(k==='BB'||k==='HBP') st[k==='BB'?'bb':'hbp']++; else st.ab++;
    if(k==='K') st.k++;
    if(['1B','IFH','2B','3B','HR'].includes(k)){ st.h++; if(k==='2B') st.d2++; if(k==='3B') st.d3++; if(k==='HR'){ st.hr++; st.rbi+=1+(rnd()<0.4?1:0); st.tl++; } else if(rnd()<0.3){ st.rbi++; st.tl++; } } }
  return st;
}
function addTwBat(st){
  PEN.bss=PEN.bss||batStat(); PEN.bcareer=PEN.bcareer||batStat();
  for(const T of [PEN.bss,PEN.bcareer]){ for(const k of B_KEYS) T[k]+=st[k]||0; T.g++; T.gs++; }
  awakeCheck();
}

/* ---- 試合後のひとこと（野手） ---- */
function talkDataBat(){
  const s=G.st, xbh=s.d2+s.d3+s.hr, pinch=!!G.pinch;
  const mine=s.pa?batLineTxt(s):'打席なし';
  let sc = pinch ? 50+(s.h?30:0)+(s.bb+s.hbp?15:0)+s.rbi*10+s.hr*10-(s.k?20:0)-(s.pa&&!s.h&&!(s.bb+s.hbp)?10:0)
    : 45+s.h*12+xbh*6+s.hr*8+s.rbi*6+(s.bb+s.hbp)*5+s.sb*6+s.run*3-s.k*6-(s.ab-s.h)*3-s.cs*6;
  sc=clamp(Math.round(sc+(G.result&&G.result.res==='W'?4:0)),0,100);
  const bad=[], good=[];
  if(s.k>=2) bad.push([s.k*3,`${s.k}つの三振`]); else if(s.k===1) bad.push([2,'三振した場面']);
  if(s.ab>=3&&s.h===0) bad.push([5,'ヒットが出なかったところ']);
  if(s.cs) bad.push([4,'盗塁失敗']);
  if(s.hr) good.push([10,`${s.hr}本のホームラン`]);
  if(s.h>=2) good.push([s.h*3,`${s.h}本のヒット`]); else if(s.h===1) good.push([3,'ヒットを打ったところ']);
  if(s.rbi) good.push([s.rbi*3,`${s.rbi}打点を挙げたところ`]);
  if(s.sb) good.push([s.sb*3,'足でかき回したところ']);
  if(s.bb+s.hbp) good.push([2+(s.bb+s.hbp),'ボールをしっかり見極めたところ']);
  const top=a=>a.sort((x,y)=>y[0]-x[0])[0], b=top(bad), g=top(good);
  return {mine,sc,bad:b?b[1]:'強いて言えば打ち損じた打席',good:g?g[1]:'最後までしっかり振っていったところ'};
}

/* ================= 野手の画面 ================= */
// 打者目線：投手目線のマス(r,c)を左右反転して並べる（表示の列 = 4-c）
const dispIdx=(r,c)=>r*5+(G&&G.bat?4-c:c);
function renderBat(){
  const ab=G.ab||{balls:0,strikes:0,pitches:[]}, pit=curPit(), A=G.babil, me=G.me;
  $('inn').textContent=G.over?'試合終了':`${G.inning}回${G.half==='top'?'表':'裏'}`;
  $('missionBar').style.display=G.mission&&!G.over?'':'none';
  if(G.mission) $('missionBar').innerHTML=`🎯 ミッション：<b>${G.mission.text}</b>`;
  $('skipOut').style.display=(!G.over&&!PB&&!busy&&!G.tw&&(G.meActive||G.meUp))?'':'none';
  lamps('lb',ab.balls,3,'b');lamps('ls',Math.min(ab.strikes,2),2,'s');lamps('lo',Math.min(G.outs,2),2,'o');
  ['b1','b2','b3'].forEach((id,i)=>$(id).classList.toggle('on',!!G.bases[i]));
  // 自分の打席（打者目線なので、右打者は左側に立つ）
  const L=G.bhand==='L';
  $('sideL').classList.toggle('here',!L); $('sideR').classList.toggle('here',L);
  $('sideL').innerHTML=!L?batterSVG(false)+'<span>あなた</span>':'';
  $('sideR').innerHTML=L?batterSVG(true)+'<span>あなた</span>':'';
  // ゾーン（左右反転）
  const T=G.target, max=meetCells(A.meet);
  let h='';
  for(let r=0;r<5;r++)for(let dc=0;dc<5;dc++){
    const c=4-dc, k=K(r,c), inZ=inZoneRC(r,c), on=T.cells.includes(k);
    h+=`<div class="cell${inZ?' in':''}${on?' btg':''}" data-r="${r}" data-c="${c}"></div>`;
  }
  $('zone').innerHTML=h;
  const counts={};
  ab.pitches.forEach((p,i)=>{
    const cell=$('zone').children[dispIdx(p.r,p.c)], k=K(p.r,p.c); counts[k]=counts[k]||0; const off=counts[k]++;
    const m=document.createElement('div'); m.className='mk'; m.innerHTML=pitchShape(p.pt,pitchColor(p),22,i+1);
    m.style.left=(2+(off%3)*16)+'px'; m.style.top=(2+Math.floor(off/3)*16)+'px'; cell.appendChild(m);
  });
  [...$('zone').children].forEach(el=>el.onclick=()=>{
    if(!G.meUp||busy) return;
    const r=+el.dataset.r, c=+el.dataset.c, k=K(r,c);
    if(!inZoneRC(r,c)){ const s=$('selinfo'); s.textContent='狙えるのはストライクゾーンのマスだけです'; s.classList.add('warn'); return; }
    const i=T.cells.indexOf(k);
    if(i>=0) T.cells.splice(i,1); else { T.cells.push(k); if(T.cells.length>max) T.cells.shift(); }
    renderAll();
  });
  // 狙う球速（バーの中で自分の幅を取る。相手投手の持ち球の球速帯がバーに出る）
  if(G.meUp) fixSpd();
  $('selinfo').classList.remove('warn');
  $('selinfo').innerHTML = G.meUp ? selTxt()
    : G.over ? '試合終了' : canSteal() ? `🏃 盗塁できます（成功率 約${Math.round(stealExpect(A.speed,meOnBase()===1)*100)}%・遅い球ほど決まりやすい）` : '打席の結果';
  $('ptypes').style.setProperty('--n',1);
  $('ptypes').innerHTML = G.meUp ? speedBarHTML(pit) : '';
  if(G.meUp) bindSpeedBar();
  // ボタン
  const th=$('throw'), nx=$('next');
  if(G.meUp){ th.style.display=''; th.textContent='この読みで待つ'; th.disabled=busy||!T.cells.length; nx.style.display='none'; }
  else if(G.over){ th.style.display='none'; nx.style.display=''; nx.textContent=G.pen&&G.pen.tryout?'トライアウトの結果へ':'日程に戻る'; }
  else if(!PB){
    nx.style.display=''; nx.textContent='次へ（試合を進める）';
    if(canSteal()){ th.style.display=''; th.disabled=busy; th.textContent=`🏃 ${meOnBase()===0?'二':'三'}盗する`; } else th.style.display='none';
  }
  // チーム・投手・打者
  setTeamBar(G.half);
  $('plP').innerHTML=`<div class="lab">投手 ${pit.num}</div><div class="nm"><span class="nmt">${plink(pit,pit.name)}</span> <span class="hb ${pit.hand}">${pit.hand==='L'?'左投':'右投'}</span></div>${asTag(pit.team)}<div class="sub">${(G.pen&&!G.pen.wbc&&PEN&&PEN.teams&&pit.pid&&csLineP(pit.pid,pit.team||G.pen.opp))||`最速${pit.velo}km/h・${pit.types.length}球種`}</div>${staBarHTML(G.pits?cpuSta(curPitIdx()):null)}`;
  const s=G.st;
  $('plB').innerHTML=`<div class="lab">打者 ${me.num||B_NUM}　${me.order}番${G.myPosK?`・<b style="color:var(--accent)">${G.myPosK}</b>`:''}・${G.pinch?'代打':G.tw?'二刀流':'あなた'}</div><div class="nm"><span class="nmt">${plink({isMe:true},G.pname)}</span> <span class="hb ${G.sw?'S':G.bhand}">${G.sw?'両打・':''}${L?'左打席':'右打席'}</span></div>
    ${asTag(PEN&&PEN.team)}<div class="sub">${G.sw&&G.meUp&&!ab.pitches.length?`<button class="btn swbtn" id="swBtn">⇄ ${L?'右':'左'}打席に変える</button>`:(G.pen&&!G.pen.wbc&&PEN&&PEN.teams&&csLineB('ME',PEN.team)?csLineB('ME',PEN.team)+`<br><small>今日 ${s.ab}打数${s.h}安打${s.rbi?` ${s.rbi}打点`:''}</small>`:`今日 ${s.ab}打数${s.h}安打${s.rbi?` ${s.rbi}打点`:''}　ミート${A.meet}・パワー${A.power}`)}</div>`;
  const pres=p=>({ball:'ボール',hbp:'死球',look:'見逃し',swing:p.text,foul:p.text,foulout:p.text,bip:p.bip?p.bip.big:''}[p.kind]);
  plistChips(ab,pres);   // この打席の投球：横1列の小さな札
  const sb=$('swBtn'); if(sb) sb.onclick=swToggle;
  renderStats(); renderLineup(); renderScout(); renderBoard(); renderGround();
  fitZone();
  drawTargetOutline();
}
// 狙うコースを黄色で縁取る（隣り合ったマスはひとつながりに縁取る）
function drawTargetOutline(){
  const z=$('zone'); if(!z) return;
  const old=z.querySelector('svg.tgo'); if(old) old.remove();
  if(!G||!G.bat||!G.target||!G.target.cells||!G.target.cells.length) return;
  const cs=[...z.children].filter(e=>e.classList.contains('cell'));
  if(cs.length<25||!cs[0].offsetWidth) return;
  const sel=new Set(G.target.cells.map(k=>{ const [r,c]=k.split(',').map(Number); return r*5+(G.bat?4-c:c); }));
  const has=(r,c)=>r>=0&&r<5&&c>=0&&c<5&&sel.has(r*5+c);
  const R=e=>e.offsetLeft+e.offsetWidth, B=e=>e.offsetTop+e.offsetHeight;
  const X=k=>k===0?cs[0].offsetLeft-2:k===5?R(cs[4])+2:(R(cs[k-1])+cs[k].offsetLeft)/2;
  const Y=k=>k===0?cs[0].offsetTop-2:k===5?B(cs[20])+2:(B(cs[(k-1)*5])+cs[k*5].offsetTop)/2;
  const E=[];
  sel.forEach(i=>{ const r=Math.floor(i/5), c=i%5;
    if(!has(r-1,c)) E.push([[r,c],[r,c+1]]);
    if(!has(r,c+1)) E.push([[r,c+1],[r+1,c+1]]);
    if(!has(r+1,c)) E.push([[r+1,c+1],[r+1,c]]);
    if(!has(r,c-1)) E.push([[r+1,c],[r,c]]); });
  const key=p=>p[0]+','+p[1], used=E.map(()=>false), pt=p=>`${X(p[1]).toFixed(1)},${Y(p[0]).toFixed(1)}`;
  let d='';
  for(let s0=0;s0<E.length;s0++){
    if(used[s0]) continue;
    const start=key(E[s0][0]); let e=s0; d+='M'+pt(E[s0][0]);
    for(let g=0;g<40;g++){
      used[e]=true; const end=E[e][1];
      if(key(end)===start){ d+='Z'; break; }
      d+='L'+pt(end);
      const n=E.findIndex((q,j)=>!used[j]&&key(q[0])===key(end)); if(n<0) break; e=n;
    }
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','tgo');
  svg.innerHTML=`<path d="${d}" fill="#5a4712" stroke="#f5c542" stroke-width="3" stroke-linejoin="round"/>`;
  z.appendChild(svg);
}
if(typeof ResizeObserver!=='undefined'&&typeof document!=='undefined'&&document.getElementById('zone')){
  new ResizeObserver(()=>{ try{ if(G&&G.bat) drawTargetOutline(); }catch(_){} }).observe(document.getElementById('zone'));
}
const selTxt=()=>{ const h=meetTol(G.babil.meet), u=meetUp(G.babil.meet), c=G.target.spd; return `狙い <b>${c}km/h</b>（${c-h}〜${c+u}）　コース <b>${G.target.cells.length}</b>/${meetCells(G.babil.meet)}マス <span class="sbq" onclick="const d=document.querySelector('.sbhelp'); if(d) d.open=!d.open;">❔見かた</span>`; };   // ❔＝打ち方・バーの見かたを開く
function speedBarHTML(pit){
  const [lo,hi,cmin,cmax]=barRange(pit), half=meetTol(G.babil.meet), up=meetUp(G.babil.meet), c=G.target.spd, R=hi-lo, P=v=>((v-lo)/R*100).toFixed(2);
  const ty=pit.types.map(t=>({t,s:pitSpeed(pit,t)})).sort((a,b)=>a.s-b.s), mt=mainType(pit,c,half,up);
  const bands=ty.map(x=>`<div class="sbband g-${PGROUP[x.t]}${x.t===mt?' main':''}" data-t="${x.t}" style="left:${P(x.s-3)}%;width:${(6/R*100).toFixed(2)}%"></div>`).join('');
  const labs=ty.map(x=>`<div class="sblab${x.t===mt?' main':''}" data-t="${x.t}" data-x="${P(x.s)}" style="left:${P(x.s)}%"><span class="g-${PGROUP[x.t]}">${x.t}</span> ${Math.round(x.s)}</div>`).join('');   // 球速は整数で表示
  let ticks=''; for(let v=Math.ceil(lo/10)*10; v<=hi; v+=10) ticks+=`<div class="sbtick" style="left:${P(v)}%">${v}</div>`;
  return `<div class="sbwrap"><div></div><div class="sblabs" id="sblabs">${labs}</div><div></div>
    <button class="sbstep" data-sd="-2" aria-label="遅く">◀</button>
    <div class="sbar" id="sbar" data-lo="${lo}" data-hi="${hi}" data-half="${half}" data-up="${up}" data-cmin="${cmin}" data-cmax="${cmax}">
      <div class="sbtrack"><div class="sbpit">${bands}</div><div class="sbme"></div>
        <div class="sbwin" id="sbwin" style="left:${P(c-half)}%;width:${((half+up)/R*100).toFixed(2)}%;background:${heatGrad(half,up)}"><div class="sbmid" style="left:${(half/(half+up)*100).toFixed(1)}%"></div></div></div>
      <div class="sbticks">${ticks}</div></div>
    <button class="sbstep" data-sd="2" aria-label="速く">▶</button></div>
    <details class="sbhelp"><summary>❔ 見かた</summary><div class="sbhint" style="margin-bottom:3px">ゾーンで狙うコース、下のバーで狙う球速を選んで「この読みで待つ」</div><div class="sblegend"><span><i class="lg-sw"></i>芯（−${Math.min(SWEET,half)}〜+${Math.min(SWEET,up)}km）＝ヒットになりやすい</span><span><i class="lg-ed"></i>色が薄い端ほどファウル・打ち損じ</span><span><b class="lg-mn">本命</b>真ん中に一番近い球種＝いちばん打ちやすい</span></div>
    <div class="sbhint">上の帯＝相手の球速／下の枠＝あなたの狙い（なぞって動かす）</div></details>`;
}
// 狙いの枠の色：真ん中±5km（芯）は濃い緑、端へ行くほど薄くなり、端は背景の色のまま
function heatGrad(half,up){
  up=up==null?3:up; const W=half+up, a=(half-Math.min(SWEET,half))/W*100, b=(half+Math.min(SWEET,up))/W*100;   // 芯は狙いの−5〜+up
  if(a<=0&&b>=100) return '#2fbf63';
  return `linear-gradient(90deg,rgba(47,191,99,0) 0%,rgba(47,191,99,.35) ${(a*0.6).toFixed(1)}%,rgba(47,191,99,.75) ${Math.max(0,a-0.01).toFixed(1)}%,#2fbf63 ${a.toFixed(1)}%,#2fbf63 ${b.toFixed(1)}%,rgba(47,191,99,.5) ${Math.min(100,b+0.01).toFixed(1)}%,rgba(47,191,99,0) 100%)`;
}
// 球種ラベルが重ならないよう段を分ける（バーに近い段から詰める）
function layoutSpeedLabels(){
  const box=$('sblabs'); if(!box) return;
  const W=box.clientWidth, els=[...box.children], ends=[]; let rows=1;
  els.forEach(el=>{ el.style.top='0px'; el.style.left='0px'; });
  els.map(el=>({el,w:el.offsetWidth,x:+el.dataset.x/100*W})).sort((p,q)=>p.x-q.x).forEach(o=>{
    let L=Math.round(o.x-o.w/2); L=Math.max(-2,Math.min(W-o.w+2,L));
    let r=0; while(ends[r]!=null&&ends[r]+4>L) r++;
    ends[r]=L+o.w; rows=Math.max(rows,r+1); o.el.dataset.r=r; o.el.style.left=L+'px';
  });
  els.forEach(el=>{ el.style.top=((rows-1-(+el.dataset.r))*17)+'px'; });
  box.style.height=(rows*17+1)+'px';
}
function bindSpeedBar(){
  const bar=$('sbar'); if(!bar) return;
  layoutSpeedLabels();
  const lo=+bar.dataset.lo, hi=+bar.dataset.hi, half=+bar.dataset.half, up=+bar.dataset.up, cmin=+bar.dataset.cmin, cmax=+bar.dataset.cmax; let drag=false;
  const pit=curPit(); let lastMain=mainType(pit,G.target.spd,half,up);
  const upd=()=>{ const w=$('sbwin'); if(w) w.style.left=((G.target.spd-half-lo)/(hi-lo)*100).toFixed(2)+'%'; $('selinfo').innerHTML=selTxt();
    const mt=mainType(pit,G.target.spd,half,up); if(mt===lastMain) return; lastMain=mt;
    document.querySelectorAll('.sblab,.sbband').forEach(el=>el.classList.toggle('main',el.dataset.t===mt)); layoutSpeedLabels(); };
  const setX=x=>{ const r=bar.getBoundingClientRect(); const v=lo+clamp((x-r.left)/r.width,0,1)*(hi-lo); G.target.spd=Math.round(clamp(v,cmin,cmax)); upd(); };
  bar.onpointerdown=e=>{ if(!G.meUp||busy) return; drag=true; try{bar.setPointerCapture(e.pointerId)}catch(_){} setX(e.clientX); e.preventDefault(); };
  bar.onpointermove=e=>{ if(drag) setX(e.clientX); };
  bar.onpointerup=bar.onpointercancel=()=>{ drag=false; };
  document.querySelectorAll('.sbstep').forEach(b=>b.onclick=()=>{ if(!G.meUp||busy) return; G.target.spd=Math.round(clamp(G.target.spd+(+b.dataset.sd),cmin,cmax)); upd(); });
}
function batRows(s){
  return [['打席',s.pa],['打数',s.ab],['安打',s.h],['二塁打',s.d2],['三塁打',s.d3],['本塁打',s.hr,1],['打点',s.rbi],['得点',s.run],['四死球',s.bb+s.hbp],['三振',s.k],['盗塁',s.sb],['盗塁死',s.cs],
    ['打率','<b>'+(s.ab?f3(bAvg(s)):'-')+'</b>',1],['出塁率',s.pa?f3(bObp(s)):'-'],['長打率',s.ab?f3(bSlg(s)):'-'],['OPS',s.pa?f3(bObp(s)+bSlg(s)):'-',1],['代打',`${s.php||0}打席${s.pha?`・打率${f3((s.phh||0)/s.pha)}`:''}`],['代走',s.pr||0],['守備固め',s.ds||0],['守備の好プレー',s.gp||0],['失策',s.err||0]];
}
function renderStatsBat(){
  const g=batRows(G.st), y=batRows(isTW()?(PEN.bss||batStat()):isBat()?PEN.ss:batStat()), c=batRows(isTW()?(PEN.bcareer||batStat()):isBat()?PEN.career:batStat());
  $('stats').innerHTML=`<thead><tr><th></th><th>この試合</th><th>今年</th><th>通算</th></tr></thead><tbody>`+
    g.map((row,i)=>`<tr class="${row[2]?'key':''}"><td>${row[0]}</td><td>${row[1]}</td><td>${y[i][1]}</td><td>${c[i][1]}</td></tr>`).join('')+'</tbody>';
}
function renderLineupBat(){
  const myL=G.myTeam.lineup.map(b=>b.isMe?{...b,avg:isTW()?bAvg(PEN.bss||batStat()):isBat()?bAvg(PEN.ss):0,hrRate:hrRateOf(G.babil.power),type:'あなた',res:G.me.res}:b);
  $('lineup').innerHTML=liveLS(true)+
    `<div class="sh2">相手打線：${LINEUPS[OPP.pattern]?LINEUPS[OPP.pattern].name:''}</div>`+lineupTable(G.lineup,-1)+
    `<div class="sh2">味方打線：${G.myTeam.name}（あなたは${G.pinch?'代打':G.me.order+'番'}）</div>`+lineupTable(myL,G.pinch?-1:G.me.order-1);
}
function renderScoutBat(){
  const pit=curPit(), rr=readsOf(pit).filter(x=>x.spd!=null), n=rr.length;
  const avg=n?Math.round(rr.reduce((t,x)=>t+x.spd,0)/n):0, hh=n?Math.round(rr.reduce((t,x)=>t+(x.half||10),0)/n):0, uu=n?Math.round(rr.reduce((t,x)=>t+(x.up==null?3:x.up),0)/n):0;
  const top=`${avg-hh}〜${avg+uu}km/h あたり`;
  $('scout').innerHTML=`<div class="sh2" style="margin-top:0">いまの相手投手</div>
    <table class="sct"><tr><th>${pit.name}</th><td>${pit.hand==='L'?'左投':'右投'}・最速${pit.velo}km/h・コントロール${pit.control}</td></tr>
    <tr><th>配球の傾向</th><td><b style="color:var(--accent)">${PSTYLE_JP[pit.style]||'全体にバラバラ'}</b>${kimeOf(pit)?'':'　<span style="color:var(--mute)">（決め球なし）</span>'}</td></tr>
    ${pit.types.map(t=>`<tr><th>${ptn(t)}</th><td>平均 約${pitSpeed(pit,t)}km/h・Lv.${pitLv(pit,t)}${t===kimeOf(pit)?' <b style="color:var(--accent)">決め球</b>':''}</td></tr>`).join('')}</table>
    <div class="hint" style="margin-top:6px">あなたが狙える球速の幅：狙いから−${meetTol(G.babil.meet)}〜+${meetUp(G.babil.meet)}km/h（速い球には+${meetUp(G.babil.meet)}までしか対応できない。狙いの−${SWEET}〜+${Math.min(SWEET,meetUp(G.babil.meet))}が芯、真ん中に一番近い球種が本命）／狙えるコース：${meetCells(G.babil.meet)}マス（ミート${(G.babilRaw||G.babil).meet}）</div>
    <div class="sh2">相手バッテリーの読み</div>
    <div class="hint">傾向読みは<b>投手ごと</b>。${pit.name}があなたと対戦した${n}球ぶんの狙い（今までの試合＋この試合）を覚えています。<br>${n>=3?`あなたがよく張っている球速：<b style="color:var(--ink)">${top}</b>。よく張られている球速の球種は投げてこなくなり、よく狙うマスも避けてきます。`:'まだ狙いの傾向は読まれていません。'}</div>`;
}

/* ================= ペナント（野手） ================= */
// 能力から見込んだ評価
function abilityRB(){ const a=perfB(PEN.babil); return clamp(18+a.meet*0.25+a.power*0.2+a.speed*0.08+a.eye*0.12+(a.def??50)*0.04,25,85); }
// 成績の評価（OPS中心。打席が少ないうちは能力の見込みに寄せる）
function ratingB(s){ return mgrRatingB(myMgr(),s); }   // 監督の志向で評価の重みが変わる（manager.js）
const pinchProb=()=>clamp(0.25+(evalR()-40)/40*0.25,0.15,0.5);
const orderFor=r=>r==='代打'?0:(PEN.order||9);   // 打順はスタメン争い（penCompete）で決まる
// スタメン争い：守備位置ごとに能力＋監督の評価で決める（シーズン開始時と10試合ごと）
function penCompete(quiet){
  if(!isBat()) return;
  const st=rebuildTeam(PEN.team), i=st.findIndex(x=>x.me);
  const was=PEN.role, wasSlot=PEN.slot;
  if(i>=0){ PEN.role='スタメン'; PEN.order=i+1; PEN.slot=st[i].slot; } else { PEN.role='代打'; PEN.order=0; PEN.slot=null; }
  const T=myT();
  // 守れるポジションごとのライバル（数字＝能力＋監督の評価）
  PEN.rivals={};
  for(const pos of myPositions()){
    PEN.rivals[pos]={me:abS(posValue(myFielder(pos),pos)),list:T.F.filter(f=>f.pos===pos).map(f=>({id:f.id,n:f.n,v:abS(posValue(f,pos)),age:f.age,rookie:!!f.rookie})).sort((a,b)=>b.v-a.v).slice(0,3)};
  }
  const main=PEN.slot&&PEN.rivals[PEN.slot]?PEN.slot:myPositions()[0];
  PEN.myVal=PEN.rivals[main].me; PEN.rival=PEN.rivals[main].list;
  if(quiet||(was===PEN.role&&wasSlot===PEN.slot)) return;
  if(PEN.role==='スタメン') penNotice(PEN.slot==='DH'?`指名打者でスタメン入り！（${PEN.order}番）`:`${POS_JP[PEN.slot]}でスタメン！（${PEN.order}番）${myPositions().length>1?'　チームの事情でこのポジションに':''}`);
  else penNotice(`スタメン落ち… ${myPositions().map(p=>POS_JP[p]).join('・')}の争いに敗れた。控え（代打）から巻き返しを狙う`);
  PEN.roleApps=0;
}
function makePendingB(kind,oppId){
  const d=PEN.day, p={day:d,opp:oppId||oppOf(d),kind,order:PEN.order,slot:PEN.slot};
  if(kind==='pinch') p.pinchInning=(typeof mySubMgr==='function'&&mySubMgr())?ri(4,7):ri(6,8);   // 代打多用型の監督は早い回から
  return p;
}
const kindTextB=p=>p.kind==='pinch'?`${p.pinchInning}回裏ごろ 代打で出場予定`:`スタメン ${p.order}番・${POS_JP[p.slot]||''}で出場`;
function penPlayB(p){
  const op=PEN.teams[p.opp], me=myT();
  if(isTW()&&!PEN.dhLineup) twCompete(true);
  if(!isTW()&&p.kind!=='pinch'&&!me.lineup.some(b=>b.isMe)) penCompete(true);
  const LU=isTW()?(PEN.dhLineup||me.lineup):me.lineup;   // 二刀流の指名打者の日は、自分の入った打線
  const myIdx=LU.findIndex(b=>b.isMe);
  if(p.kind!=='pinch'&&myIdx<0){ p.kind='pinch'; p.pinchInning=ri(6,8); }   // 念のため：スタメンにいなければ代打で
  const gpO=gamePitchers(p.opp,p.day), gpM=gamePitchers(PEN.team,p.day);
  showScreen('game');
  batNewGame({OPP:{pattern:op.pattern,hand:op.hand}, lineup:op.lineup.map(deB).map(b=>({...b,res:[]})),
    myLineup:LU.map(plainB), myTeam:{name:LINEUPS[me.pattern]?LINEUPS[me.pattern].name:'',hand:HANDS[me.hand]?HANDS[me.hand].name:''},
    pits:[gpO.sp,...gpO.pen], ours:[gpM.sp,...gpM.pen.slice(0,2)], defAdj:clamp(1-((me.fdef||50)-50)*0.003,0.9,1.1)*(me.errUp>PEN.day?1.12:1),
    names:{my:{name:TEAM[PEN.team].short,s:TEAM[PEN.team].s,id:PEN.team},opp:{name:TEAM[p.opp].short,s:TEAM[p.opp].s,id:p.opp}},
    pname:PEN.pname, bhand:PEN.bhand||'R', babil:p.oddBabil||PEN.babil, kind:p.kind, order:myIdx>=0?myIdx+1:9, pinchInning:p.pinchInning, slot:isTW()?'DH':p.slot, ofSide:PEN.ofSide||(PEN.ofSide=pick(['左','中','右'])),
    pen:{day:p.day,year:PEN.year,kind:p.kind,role:PEN.role,team:PEN.team,opp:p.opp,odd:p.odd||null,...(p.ps?{ps:true,psName:p.psName,gameNo:p.gameNo}:{})},
    mission: p.odd?null:(rnd()<(p.ps?EV_MP:0.35) ? genMissionB(p.kind) : null)});   // ポストシーズンは出やすい
  const Q=batProceed();
  // 代打はその回の少し前から見せる（それより前の回はまとめて済ませる）
  const show = p.kind==='pinch' ? Q.filter(e=>e.inning>=G.pinch.inning) : Q;
  renderAll(); save();
  if(typeof showTitle==='function') showTitle();
  const go=()=>playBack(show,batAfterPlay);
  setTimeout(go, G.mission?0:1200);
}
// 試合が終わったとき（野手）
function penGameDoneB(p){
  const st=G.st, res=G.result.res;
  addBatLine(st,p.kind!=='pinch');
  if(G.mission) checkMissionB();
  afterAppearanceB();
  recordMyGame(res,[oppTot(),myTot()],{kind:p.kind,bat:{pa:st.pa,ab:st.ab,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,bb:st.bb+st.hbp},played:true,mission:G.mission?(G.mission.ok?'達成':'失敗'):null});
  PEN.pending=null; tradeCheck();
}
function addBatLine(st,start){
  if(isTW()){ addTwBat(st); return; }   // 二刀流の指名打者の日は打撃成績へ
  if(!start&&!st.ds){ st.php=st.pa; st.pha=st.ab; st.phh=st.h; }   // 代打の成績
  if(start&&PEN.slot&&PEN.slot!=='DH') st.fg=1;   // 守備についた試合（ゴールデン・グラブ賞用）
  for(const T of [PEN.ss,PEN.career]){ for(const k of B_KEYS) T[k]+=st[k]||0; T.g++; if(start) T.gs++; }
  awakeCheck();
  PEN.roleApps++;
}
// スキップ（野手）：能力から打席の結果をおまかせで決める
function penSkipB(){
  const p=PEN.pending, A=effBabil(PEN.babil,p.kind), A2=myT(), B=PEN.teams[p.opp]||A2;
  const npa = p.kind==='pinch' ? 1 : Math.max(2,Math.round((p.order<=2?4.6:p.order<=5?4.3:3.9)+(rnd()-.5)*1.6));
  const st=batStat(); let bases=[0,0,0];
  for(let i=0;i<npa;i++){
    const on=rnd()<0.42?ri(1,2):0, k=autoKind(A,null,on&&rnd()<0.6); st.pa++;
    if(k==='BB') st.bb++; else if(k==='HBP') st.hbp++; else st.ab++;
    if(k==='K') st.k++;
    if(['1B','IFH','2B','3B','HR'].includes(k)){ st.h++; if(k==='2B') st.d2++; if(k==='3B') st.d3++; if(k==='HR') st.hr++; }
    // 打点・得点・盗塁のおおよそ
    if(k==='HR'){ st.rbi+=1+Math.min(on,poisson(0.6)); st.run++; st.tl=(st.tl||0)+1; }
    else if(['1B','IFH','2B','3B'].includes(k)){ if(on&&rnd()<(k==='1B'||k==='IFH'?0.45:0.7)){ st.rbi+=1; st.tl=(st.tl||0)+1; } if(rnd()<0.35+A.speed*0.002) st.run++;
      if((k==='1B'||k==='IFH')&&A.speed>=55&&rnd()<0.1+(A.speed-55)*0.006){ if(rnd()<stealProb(A.speed,false)) st.sb++; else st.cs++; } }
    else if(k==='BB'||k==='HBP'){ if(rnd()<0.3) st.run++; if(A.speed>=55&&rnd()<0.1+(A.speed-55)*0.006){ if(rnd()<stealProb(A.speed,false)) st.sb++; else st.cs++; } }
    else if((k==='FO'||k==='GO')&&on&&rnd()<0.12) st.rbi++;
  }
  let o=poisson(Math.max(1.6,3.85+B.off-A2.def)), m=Math.max(st.rbi,poisson(Math.max(1.6,3.85+A2.off-B.def))+Math.round(st.rbi*0.4));
  const res=teamResult(o,m); if(res==='W'&&m<=o) m=o+1; if(res==='L'&&o<=m) o=m+1;
  addBatLine(st,p.kind!=='pinch');
  afterAppearanceB();
  recordMyGame(res,[o,m],{kind:p.kind,bat:{pa:st.pa,ab:st.ab,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,bb:st.bb+st.hbp},played:false});
  PEN.pending=null; tradeCheck();
}
// 打順・出番の入れ替え
function afterAppearanceB(){ if(PEN.btrial) bTrialStep(); else bOfferCheck(); }   // 打順・守備位置のお試し（10試合）／監督からの打診
/* ---- 監督のミッション（野手） ---- */
function genMissionB(kind){
  const sp=PEN.babil.speed>=40;
  const L = kind==='pinch' ? [
    {id:'bh1',text:'ヒットを打て',rw:{meet:1}}, {id:'bob1',text:'なんとしても出塁しろ',rw:{eye:1}}, {id:'bnok1',text:'三振だけはするな',rw:{meet:1}},
  ] : [
    {id:'bh1',text:'ヒットを1本打て',rw:{meet:1}}, {id:'bmh',text:'2安打以上打て',rw:{meet:2}}, {id:'bxbh',text:'長打を打て（二塁打以上）',rw:{power:2}},
    {id:'brbi',text:'打点を挙げろ',rw:{power:1}}, {id:'bob2',text:'2回以上出塁しろ',rw:{eye:2}}, {id:'bnok',text:'三振するな（3打席以上立って）',rw:{meet:1,eye:1}},
    ...(sp?[{id:'bsb',text:'盗塁を決めろ',rw:{speed:2}}]:[]),
  ];
  return {...pick(L),ok:null};
}
function checkMissionB(){
  const m=G.mission, s=G.st, ob=s.h+s.bb+s.hbp;
  const ok={bh1:s.h>=1,bmh:s.h>=2,bxbh:s.d2+s.d3+s.hr>=1,brbi:s.rbi>=1,bob2:ob>=2,bob1:ob>=1,bnok:s.pa>=3&&s.k===0,bnok1:s.pa>=1&&s.k===0,bsb:s.sb>=1}[m.id];
  m.ok=!!ok;
  if(missionScore(m.ok)) return;   // 評価：シーズン／ポストシーズン（翌年へ）／大会の中だけ（pennant.js）
  const a=PEN.babil, got=[], N={meet:'ミート',power:'パワー',speed:'速度',eye:'選球眼・技術',def:'守備'};
  for(const k in m.rw){ const v=r1(m.rw[k]*MIS_K); a[k]=r1(Math.min(100,a[k]+v)); got.push(`${N[k]}+${v}`); }   // ミッションの上がり幅は1/5
  m.got=got.join('・');
  penNotice(`ミッション達成！「${m.text}」 ${m.got}${missionWhere()}`);
}
/* ---- タイトル（野手）：首位打者・本塁打王・打点王・盗塁王・最高出塁率・最多安打 ---- */
const QUAL_PA=Math.round(SEASON_GAMES*3.1);   // 規定打席 443
const TITLES_B=[
  {id:'avg',name:'首位打者',note:`規定打席${QUAL_PA}以上`},{id:'hr',name:'本塁打王',note:''},{id:'rbi',name:'打点王',note:''},
  {id:'sb',name:'盗塁王',note:''},{id:'obp',name:'最高出塁率',note:`規定打席${QUAL_PA}以上`},{id:'hit',name:'最多安打',note:''},
  {id:'gg',name:'ゴールデン・グラブ賞',note:'守備での出場100試合以上。守備力・好プレー・失策で決まる'},
];
// 守備ポイント：守備力＋好プレー×2−失策×4＋守備で出た試合×0.05
const ggPoints=s=>Math.round(((PEN.babil&&PEN.babil.def)??50)+(s.gp||0)*2-(s.err||0)*4+((s.fg||0)+(s.ds||0))*0.05);
function titleRaceB(s){
  s=s||PEN.ss; const lg=TEAM[PEN.team].lg, rivals=lgTeams(lg).filter(id=>id!==PEN.team), used=new Set();
  const who=()=>({name:randName(used),team:pick(rivals)}), q=s.pa>=QUAL_PA;
  const R={
    avg:{ai:csAI(lg,'avg',x=>x.pa>=QUAL_PA,3)||{...who(),v:+(0.312+rnd()*0.04).toFixed(3)},mine:q?bAvg(s):null,f:f3,unit:'',why:q?'':`規定打席に届かず（${s.pa}打席）`},
    hr:{ai:csAI(lg,'hr')||{...who(),v:ri(28,46)},mine:s.hr,unit:'本'}, rbi:{ai:csAI(lg,'rbi')||{...who(),v:ri(85,115)},mine:s.rbi,unit:'打点'},
    sb:{ai:csAI(lg,'sb')||{...who(),v:ri(25,50)},mine:s.sb,unit:'盗塁'},
    obp:{ai:csAI(lg,'obp',x=>x.pa>=QUAL_PA,3)||{...who(),v:+(0.385+rnd()*0.055).toFixed(3)},mine:q?bObp(s):null,f:f3,unit:'',why:q?'':`規定打席に届かず（${s.pa}打席）`},
    hit:{ai:csAI(lg,'hit')||{...who(),v:ri(162,192)},mine:s.h,unit:'安打'},
    gg:(()=>{ const fg=(s.fg||0)+(s.ds||0), ok=fg>=100&&!isTW(); return {ai:{...who(),v:ri(84,104)},mine:ok?ggPoints(s):null,unit:'pt',why:ok?'':`守備での出場が足りず（${fg}試合・指名打者の試合は数えません）`}; })(),
  };
  return TITLES_B.map(t=>{
    const r=R[t.id], f=r.f||(v=>String(v)); let won=false, shared=false;
    if(r.mine!=null&&r.mine>0){ const m=r.f?+r.mine.toFixed(3):r.mine; won=m>=r.ai.v; shared=m===r.ai.v; }
    return {id:t.id,name:t.name,note:t.note,won,shared,mine:r.mine==null?'-':f(r.mine)+r.unit,why:r.why||'',ai:`${r.ai.name}（${TEAM[r.ai.team].short}）${f(r.ai.v)}${r.unit}`};
  });
}
function salaryChgB(y){ const s=PEN.ss; return (y-52)/45+s.hr*0.004+s.rbi*0.001+s.sb*0.002+s.h*0.0005; }
/* ---- 年俸査定のあとの能力変化（野手） ---- */
function abilityChangeB(s,minPA){
  s=s||PEN.ss; minPA=minPA||100;
  const age=PEN.age, old=age>33, out={meet:0,power:0,speed:0,eye:0,def:0,why:{}};
  const pa=s.pa;
  if(pa>=minPA){
    const avg=bAvg(s), iso=bSlg(s)-avg, bbp=(s.bb+s.hbp)/pa;
    out.meet = avg>=.310?2: avg>=.275?1: avg>=.235?0:-1; out.why.meet=`打率 ${f3(avg)}`;
    out.power= iso>=.220?2: iso>=.160?1: iso>=.090?0:-1; out.why.power=`長打力（長打率−打率）${f3(iso)}・本塁打${s.hr}`;
    out.eye  = bbp>=.12?2: bbp>=.085?1: bbp>=.05?0:-1; out.why.eye=`四死球率 ${Math.round(bbp*1000)/10}%・三振${s.k}`;
  }else{ out.why.meet=out.why.power=out.why.eye=`打席が少なく判断できず（${pa}打席）`; }
  out.speed = s.sb>=30?1: (s.sb+s.d3)>=3?0: pa>=minPA?-1:0; out.why.speed=`盗塁${s.sb}・三塁打${s.d3}`;
  if(age>30) out.speed-=1;   // 足は30歳を超えると落ちやすい
  out.def = s.gs>=120?2 : s.gs>=60?1 : s.gs>=20?0 : -1; out.why.def=`スタメン${s.gs}試合（守った試合が多いほど上手くなる）`;
  if(age>31) out.def-=1;
  if(old){ out.meet-=2; out.power-=1; out.eye-=1; out.speed-=1; }
  out.meet=clamp(out.meet,old?-3:-1,old?1:2); out.power=clamp(out.power,old?-3:-1,old?1:2);
  out.eye=clamp(out.eye,old?-3:-1,old?1:2); out.speed=clamp(out.speed,old?-4:-2,old?1:1); out.def=clamp(out.def,old?-3:-1,old?1:2);
  if(typeof isDevP==='function'&&isDevP()) for(const k of ['meet','power','speed','eye','def']) if(out[k]<0){ out[k]=0; out.why[k]=(out.why[k]||'')+'（育成期間なので成績によるダウンなし）'; }   // 育成期間は成績によるダウンなし
  // 若手の成長：29歳までは、二軍でも一軍でも年齢に応じて毎年伸びる（±40%のばらつき）
  const yg=YOUTH_G(age);
  if(yg>0) for(const k of ['meet','power','speed','eye','def']){ if(k==='def'&&isTW()) continue;
    const g=r1(yg*(0.6+rnd()*0.8)); out[k]=r1(out[k]+g); out.why[k]=(out.why[k]?out.why[k]+'・':'')+`若手の成長 +${g}`; }
  return out;
}
const YOUTH_G=age=>age<=22?4.0:age<=25?3.5:age<=28?2.0:age<=29?1.0:0;   // 18〜22歳4.0／23〜25歳3.5／26〜28歳2.0／29歳1.0
function applyAbilityChangeB(ch){ if(!ch) return; const a=PEN.babil; for(const k of ['meet','power','speed','eye','def']) a[k]=r1(clamp((a[k]??50)+(ch[k]||0),0,100)); }
function abilChangeHTMLB(ch,tw){
  const a=PEN.babil, f=v=>v>0?`<span class="up">+${v}</span>`:v<0?`<span class="dn">${v}</span>`:'±0';
  const rows=[['ミート','meet'],['パワー','power'],['速度','speed'],['選球眼・技術','eye'],...(tw?[]:[['守備','def']])].map(([n,k])=>`<tr><th>${n}</th><td>${a[k]??50} → <b>${r1(clamp((a[k]??50)+(ch[k]||0),0,100))}</b>（${f(r1(ch[k]||0))}）<br><small style="color:var(--mute)">${ch.why[k]||''}</small></td></tr>`).join('');
  return `<div class="sh2">${tw?'打撃の能力の変化':'能力の変化'}（来季に反映${PEN.age>33?'・33歳を超えたので衰えが大きい（マイナスは'+(ch.agingMul||5)+'倍）':''}）</div><div class="pcardx"><table class="stt abch">${rows}</table></div>`;
}
function batLine(s){
  return `${s.g}試合（スタメン${s.gs}）　打率 <b>${s.ab?f3(bAvg(s)):'-'}</b>　${s.hr}本塁打 ${s.rbi}打点 ${s.sb}盗塁<br>${s.h}安打（二塁打${s.d2}・三塁打${s.d3}）　出塁率 ${s.pa?f3(bObp(s)):'-'}　OPS ${s.pa?f3(bObp(s)+bSlg(s)):'-'}`;
}
const babilTxt=a=>`ミート${a.meet}・パワー${a.power}・速度${a.speed}・選球眼${a.eye}・守備${a.def??50}`;
