
/* ================================================================
   ペナントモード（143試合・12球団 2リーグ）
   ・日程を進める画面は試合画面とは別
   ・役割：エース(中5日) / ローテ(中7日) / 裏ローテ(中10日) / 中継ぎ / 抑え(9回)
   ・査定は「今年の成績」を「通算成績」より重く見る
   ・登板ごとに「投げる」か「スキップ」（スキップは今の成績に応じてランダムに結果）
   ・年末に表彰（タイトル）→ 年俸査定（1年目500万円、毎年 -50%〜+50%）。成績が悪すぎると戦力外で終了
   ・成績が悪いと監督からトレードの打診（下位球団へ。最下位なら他リーグの最下位球団へ）
   ================================================================ */
const SEASON_GAMES=143;
const ROLE_NAME={'エース':'エース','ローテ':'ローテーション','裏ローテ':'裏ローテ','中継ぎ':'中継ぎ','抑え':'抑え'};
const REST={'エース':5,'ローテ':7,'裏ローテ':10};   // 中N日
const isStarter=r=>r in REST;
let PEN=null;            // ペナントのデータ（セーブ対象）
let SCREEN='mode';       // 今の画面：mode / setup / game / pennant / prof
let MODE='free';         // 準備画面の用途：free（1試合）/ pennant

/* ---- 12球団（色は各球団のイメージに寄せた近い色。帽子の文字はふつうのアルファベット1文字） ---- */
// s=スコアボード用の1文字、cap=帽子、brim=つば、cl=帽子の文字、jersey=ユニフォームの地、pin=縦じまの色（0＝なし）、chest=胸の文字、chc/chs=胸の文字の色と縁、num/nums=背番号の色と縁、
// sl=袖の線、under=アンダーシャツ、pants=ズボン、panel=脇のパネル（0＝なし）、trim=ユニフォームの線、jk=監督のジャージ、jt=ジャージの線
const NPB=[
  {id:'T', lg:'セ',name:'阪神タイガース',          short:'阪神',      s:'神',ch:'T',cap:'#1b1b1b',brim:'#1b1b1b',cl:'#e6b422',jersey:'#f7f7f7',pin:'#1b1b1b',chest:'Tigers',chc:'#1b1b1b',chs:'',num:'#1b1b1b',nums:'',sl:'#e6b422',under:'#1b1b1b',pants:'#f7f7f7',panel:0,trim:'#1b1b1b',jk:'#1b1b1b',jt:'#ffd400'},
  {id:'G', lg:'セ',name:'読売ジャイアンツ',        short:'巨人',      s:'巨',ch:'G',cap:'#1b1b1b',brim:'#1b1b1b',cl:'#f97709',jersey:'#f7f7f7',pin:0,chest:'GIANTS',chc:'#1b1b1b',chs:'#f97709',num:'#1b1b1b',nums:'#f97709',sl:'#f97709',under:'#1b1b1b',pants:'#f7f7f7',panel:0,trim:'#f97709',jk:'#1b1b1b',jt:'#f97709'},
  {id:'DB',lg:'セ',name:'横浜DeNAベイスターズ',    short:'DeNA',      s:'デ',ch:'Y',cap:'#0f3fa8',brim:'#ffffff',cl:'#ffffff',jersey:'#0f3fa8',pin:0,chest:'YOKOHAMA',chc:'#ffffff',chs:'',num:'#ffffff',nums:'',sl:'#ffffff',under:'#0b2a7a',pants:'#c9ccd3',panel:0,trim:'#0f3fa8',jk:'#0055a5',jt:'#ffffff'},
  {id:'C', lg:'セ',name:'広島東洋カープ',          short:'広島',      s:'広',ch:'C',cap:'#d7002a',brim:'#d7002a',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'Carp',chc:'#d7002a',chs:'',num:'#d7002a',nums:'',sl:'#d7002a',under:'#d7002a',pants:'#f7f7f7',panel:0,trim:'#d7002a',jk:'#d7002a',jt:'#ffffff'},
  {id:'S', lg:'セ',name:'東京ヤクルトスワローズ',  short:'ヤクルト',  s:'ヤ',ch:'S',cap:'#13275a',brim:'#7cc242',cl:'#ffffff',jersey:'#8dd14a',pin:'#6fb634',chest:'TOKYO',chc:'#13275a',chs:'',num:'#13275a',nums:'',sl:'#13275a',under:'#13275a',pants:'#f7f7f7',panel:0,trim:'#13275a',jk:'#13275a',jt:'#7cc242'},
  {id:'D', lg:'セ',name:'中日ドラゴンズ',          short:'中日',      s:'中',ch:'D',cap:'#0b2a6b',brim:'#d7002a',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'Dragons',chc:'#0b2a6b',chs:'#d7002a',num:'#0b2a6b',nums:'#d7002a',sl:'#0b2a6b',under:'#1d4fd0',pants:'#f7f7f7',panel:0,trim:'#0b2a6b',jk:'#003a8c',jt:'#ffffff'},
  {id:'H', lg:'パ',name:'福岡ソフトバンクホークス',short:'ソフトバンク',s:'ソ',ch:'H',cap:'#1b1b1b',brim:'#f6c200',cl:'#f6c200',jersey:'#f7f7f7',pin:0,chest:'HAWKS',chc:'#1b1b1b',chs:'',num:'#1b1b1b',nums:'#f6c200',sl:'#f6c200',under:'#1b1b1b',pants:'#f7f7f7',panel:0,trim:'#1b1b1b',jk:'#1b1b1b',jt:'#f6c200'},
  {id:'L', lg:'パ',name:'埼玉西武ライオンズ',      short:'西武',      s:'西',ch:'L',cap:'#10265e',brim:'#10265e',cl:'#ffffff',jersey:'#10265e',pin:0,chest:'Lions',chc:'#ffffff',chs:'',num:'#ffffff',nums:'',sl:'#3a8fe0',under:'#10265e',pants:'#f7f7f7',panel:0,trim:'#10265e',jk:'#0b2a5b',jt:'#6cc4ee'},
  {id:'F', lg:'パ',name:'北海道日本ハムファイターズ',short:'日本ハム',s:'日',ch:'F',cap:'#1f6fd6',brim:'#1f6fd6',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'FIGHTERS',chc:'#1f6fd6',chs:'',num:'#d9b35a',nums:'',sl:'#1f6fd6',under:'#1f6fd6',pants:'#f7f7f7',panel:'#1f6fd6',trim:'#0c2c56',jk:'#0c2c56',jt:'#c8a75a'},
  {id:'B', lg:'パ',name:'オリックス・バファローズ',short:'オリックス',s:'オ',ch:'B',cap:'#15192b',brim:'#15192b',cl:'#c9a227',jersey:'#f7f7f7',pin:0,chest:'Buffaloes',chc:'#15192b',chs:'#c9a227',num:'#15192b',nums:'',sl:'#c9a227',under:'#15192b',pants:'#f7f7f7',panel:0,trim:'#0b1f3f',jk:'#0b1f3f',jt:'#c9a227'},
  {id:'M', lg:'パ',name:'千葉ロッテマリーンズ',    short:'ロッテ',    s:'ロ',ch:'M',cap:'#1b1b1b',brim:'#1b1b1b',cl:'#ffffff',jersey:'#1b1b1b',pin:0,chest:'M',chc:'#ffffff',chs:'',num:'#ffffff',nums:'',sl:'#ffffff',under:'#1b1b1b',pants:'#d9dbe0',panel:0,trim:'#1b1b1b',jk:'#1b1b1b',jt:'#c0c0c0'},
  {id:'E', lg:'パ',name:'東北楽天ゴールデンイーグルス',short:'楽天',  s:'楽',ch:'E',cap:'#b5122b',brim:'#8a6d3b',cl:'#ffffff',jersey:'#c8102e',pin:'#a80e26',chest:'Rakuten',chc:'#ffffff',chs:'',num:'#ffffff',nums:'',sl:'#f0c419',under:'#c8102e',pants:'#f7f7f7',panel:0,trim:'#860021',jk:'#860021',jt:'#f0c419'},
];
const TEAM=Object.fromEntries(NPB.map(t=>[t.id,t]));
const LG_NAME={'セ':'セ・リーグ','パ':'パ・リーグ'};
const lgTeams=lg=>NPB.filter(t=>t.lg===lg).map(t=>t.id);
const otherLg=lg=>lg==='セ'?'パ':'セ';
const tchip=(id,full)=>{ const t=TEAM[id]; return t?`<span class="tchip" style="background:${t.cap};color:${t.cl}">${full?t.name:t.short}</span>`:''; };

/* ---- 日程：リーグ戦125試合（同リーグの各球団と25試合）＋交流戦18試合（他リーグの各球団と3試合） ---- */
function rrPairs(r){ const P=[[5,r]]; for(let k=1;k<=2;k++) P.push([(r+k)%5,(r-k+5)%5]); return P; }   // 6球団の総当たり（5通り）
function makeSched(){
  const lens=[3,3,3,3,3,3,3,2,2], lg=[];   // 1カードは3連戦（一部2連戦）
  lens.forEach(n=>shuffle([0,1,2,3,4]).forEach(m=>{ for(let i=0;i<n;i++) lg.push(m); }));
  const il=[]; shuffle([0,1,2,3,4,5]).forEach(r=>{ for(let i=0;i<3;i++) il.push(10+r); });
  return [...lg.slice(0,50),...il,...lg.slice(50)];   // 交流戦は51試合目から
}
function dayPairs(code){
  const S=lgTeams('セ'), P=lgTeams('パ');
  if(code<10) return [...rrPairs(code).map(([a,b])=>[S[a],S[b]]), ...rrPairs(code).map(([a,b])=>[P[a],P[b]])];
  const r=code-10; return S.map((s,i)=>[s,P[(i+r)%6]]);
}
function oppOf(day,team){
  team=team||PEN.team; const pr=dayPairs(PEN.sched[Math.min(day,SEASON_GAMES-1)]).find(p=>p.includes(team));
  return pr[0]===team?pr[1]:pr[0];
}
const isInter=day=>PEN.sched[Math.min(day,SEASON_GAMES-1)]>=10;

/* ---- 球団の戦力・打線 ---- */
// 球団：選手（ロースター）から打線と戦力を作る（rebuildTeam）
function genTeamState(){ return {rec:{w:0,l:0,t:0}, off:0, def:0, pattern:'standard', hand:'normal', lineup:[], ...newRoster()}; }
function newTeams(){ const T={}; NPB.forEach(t=>T[t.id]=genTeamState()); return T; }
const rebuildAll=()=>NPB.forEach(t=>rebuildTeam(t.id));
const myT=()=>PEN.teams[PEN.team];
const myRec=()=>myT().rec;
// 味方打線（自分のチームの打者。読みのデータは使わない）
const plainB=b=>({order:b.order,name:b.name,type:b.type,hand:b.hand,avg:b.avg,hrRate:b.hrRate,power:b.power,contact:b.contact,speed:b.speed,eye:b.eye,res:[]});
function recAdd(id,res){ PEN.teams[id].rec[{W:'w',L:'l',T:'t'}[res]]++; }
const flipRes=r=>({W:'L',L:'W',T:'T'}[r]);
const wpct=r=>r.w+r.l?r.w/(r.w+r.l):0;
function standings(lg){
  return lgTeams(lg).map(id=>({id,...PEN.teams[id].rec})).sort((a,b)=>wpct(b)-wpct(a)||b.w-a.w||a.l-b.l);
}
const rankOf=id=>standings(TEAM[id].lg).findIndex(x=>x.id===id)+1;
// 自分のチーム以外の試合（その日の5試合）
function otherGames(day){
  dayPairs(PEN.sched[day]).forEach(([a,b])=>{
    if(a===PEN.team||b===PEN.team) return;
    // 選手1人ずつ1打席ずつ試合を回し、その結果と成績を記録する
    if(!PEN.cs) PEN.cs={};
    const g=simLeagueGame(a,b);
    recAdd(a,g.res); recAdd(b,flipRes(g.res));
  });
}
// 自分のチームの試合を記録して、1日進める
function recordMyGame(res,score,me,simmed){
  const d=PEN.day, op=oppOf(d);
  if(!PEN.cs) csBackfill();
  if(!simmed){ const m=me||{}, mp=!isBat()&&(m.kind==='start'||m.kind==='relief'||m.kind==='close'||m.kind==='hold')?{kind:m.kind==='start'?'start':'relief',outs:m.outs||0,runs:m.runs||0,dec:m.dec||''}:null;
    csTeamGame(PEN.team,score[1],score[0],res,op,mp?{pitch:mp}:null); csTeamGame(op,score[0],score[1],flipRes(res),PEN.team,null); }   // CPU選手の成績（自分の分は除く）
  recAdd(PEN.team,res); recAdd(op,flipRes(res)); otherGames(d);
  PEN.days.push({d:d+1,opp:TEAM[op].short,oid:op,res,score,me});
  if(PEN.days.length>40) PEN.days.splice(0,PEN.days.length-40);
  if(me&&typeof injuryRoll==='function') injuryRoll();   // 出場した試合のあと：怪我
  PEN.day++;
  if(typeof injuryTick==='function') injuryTick();
  if(typeof allstarCheck==='function') allstarCheck();   // 第75試合のあとにオールスター
  favExpire();
  if(PEN.day%10===0){ if(isBat()) penCompete(); else { rebuildTeam(PEN.team); if(isTW()) twCompete(); } }   // 10試合ごとにスタメンを見直す
  if(PEN.day%5===0&&PEN.day<SEASON_GAMES-10){ const pr=favProposal(); if(pr) PEN.prompt=pr; }   // 贔屓監督の打診
  if(PEN.day%30===0) NPB.forEach(t=>{ if(t.id!==PEN.team) rebuildTeam(t.id); });
}

const penStat=()=>({...newStat(),g:0,gs:0,w:0,l:0,sv:0,hld:0,rw:0,byType:{},mBonus:0,mOK:0,mNG:0});
// 球種ごとの成績（投球数・奪三振・空振り・被安打）
function mergeByType(dst,src){ for(const t in src){ const d=dst[t]||(dst[t]={n:0,k:0,wh:0,h:0}), s=src[t]; d.n+=s.n||0; d.k+=s.k||0; d.wh+=s.wh||0; d.h+=s.h||0; } return dst; }
// スキップなど1球ずつのデータが無いときの見込み（ストレート約55%、残りを変化球で等分）
function estByType(line){
  const rep=(PEN&&PEN.rep)||REP, out={}, s=rep.length===1?1:0.55;
  // 変化球はLvが高いほど多く投げる（同じLvなら少しばらつかせる）
  const w=rep.map((t,i)=>i===0?0:(PEN?lvOf(t):2)+1+rnd()*0.5), ws=w.reduce((a,b)=>a+b,0)||1;
  rep.forEach((t,i)=>{ const sh=i===0?s:(1-s)*w[i]/ws;
    out[t]={n:(line.pitches||0)*sh,k:(line.k||0)*sh,wh:(line.pitches||0)*sh*0.08,h:(line.hits||0)*sh}; });   // 端数を切り捨てない（積み重ねで偏らないように）
  return out;
}
// 変化球のレベル（プロ入り後は Lv.1〜7。少し＝Lv.1、普通＝Lv.2、決め球＝Lv.3）
const lvOf=t=>{ const v=(PEN.plev||{})[t]; if(typeof v==='number') return v; if(t==='ストレート') return 3; return v==='少'?1 : v==='決'?3 : 2; };   // ストレートは Lv.3 が標準
const lvTxt=t=>`Lv.${lvOf(t)}`;
const LV_UP_COST=n=>n<=1?1:n+1;   // Lv.n→n+1 に上げるポイント（1→2:1、2→3:3、3→4:4 … 6→7:7）
const lvPts=n=>{ let p=0; for(let i=1;i<n;i++) p+=LV_UP_COST(i); return p+1; };   // そのLvまでの合計（Lv.1=1、Lv.2=2、Lv.3=5 …）
const MAX_BRK=5;   // 変化球は5つまで
function plevToNum(){   // 古いセーブの「少し／普通／決め球」をLvの数字に直す
  const o={}; (PEN.rep||[]).forEach(t=>o[t]=lvOf(t)); PEN.plev=o;
}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=rnd()}while(p>L);return k-1}
const yen=n=>n>=100000000?(n/100000000).toFixed(2).replace(/\.?0+$/,'')+'億円':Math.round(n/10000).toLocaleString()+'万円';

/* ---- ドラフト：持ち点が多いほど上位指名 ---- */
function draftResult(budget){
  const s=clamp((budget-70)/50,0,1);   // 持ち点が多いほど上位になりやすい（弱めの相関）
  const pick1=clamp(Math.round(5-s*3.5+(rnd()-.5)*4),1,7);
  const comp = pick1===1 && rnd()<0.25+s*0.6 ? ri(2,4) : 0;   // 1位は競合して抽選になることも
  return {pick:pick1,comp};
}
function newPennant(startRole,abil,rep,plev,teamId,pos,babil,bhand){
  const team=TEAM[teamId]?teamId:pick(NPB).id, B=pos==='B', W=pos==='W', dr=draftResult(B?(babil?babil.budget:120):(abil?abil.budget:120));
  if(G&&G.pen&&typeof newGame==='function'){ try{ newGame(false); }catch(_){} }   // 前のペナントの試合が残っていれば消す
  PEN={v:2,year:1,day:0,salary:5000000,released:false,review:null,
    pname:PNAME_IN||randName(), hand:PHAND, bhand:['L','S'].includes(bhand)?bhand:'R', age:18, joinY:1,
    abil:abil||{velo:140,control:50,stamina:50,budget:0}, rep:rep||['ストレート'], plev:plev||{}, campY:0,
    team, draft:{team,...dr}, genius:(typeof dGenius!=='undefined'&&dGenius)||false, sched:makeSched(), teams:newTeams(), trades:[], titles:[], tradeY:0,
    role:startRole==='relief'?'中継ぎ':'裏ローテ', roleApps:0, nextStart:ri(0,3), stayUntil:0,
    ss:penStat(), career:penStat(), seasons:[], days:[], pending:null, prompt:null, notices:[], pos:B?'B':W?'W':'P'};
  if(W){   // 二刀流：投手として先発し、先発の日は打席にも立つ
    PEN.babil={meet:babil.meet,power:babil.power,speed:babil.speed,eye:babil.eye,def:50,budget:babil.budget}; PEN.bhand=['L','S'].includes(bhand)?bhand:'R';
    PEN.bss=batStat(); PEN.bcareer=batStat(); PEN.role='裏ローテ';
  }
  if(B){   // 野手：ドラフト上位はスタメン（下位打線）から、それ以外は代打から
    PEN.babil={meet:babil.meet,power:babil.power,speed:babil.speed,eye:babil.eye,def:babil.def??50,budget:babil.budget}; PEN.bhand=['L','S'].includes(bhand)?bhand:'R'; PEN.bpos=babil.pos||'OF'; PEN.bposs=[PEN.bpos];
    PEN.role='代打'; PEN.order=0; PEN.ss=batStat(); PEN.career=batStat(); PEN.rep=['ストレート']; PEN.plev={};
  }else penNotice(`1年目のシーズン開幕！ ${TEAM[team].short}の${W?'二刀流・':''}${ROLE_NAME[PEN.role]}としてスタート（年俸500万円・${PEN.abil.velo}km/h・制球${PEN.abil.control}・スタミナ${PEN.abil.stamina}）`);
  PEN.btype='バランス'; assignTypesAll();
  rebuildAll(); if(typeof oddPlan==='function') oddPlan(); if(W) twCompete(true);
  if(B){ penCompete(true); penNotice(`1年目のシーズン開幕！ ${TEAM[team].short}の${PEN.role==='スタメン'?`${POS_JP[PEN.slot]}・${PEN.order}番`:'控え（代打）'}としてスタート（年俸500万円・${babilTxt(PEN.babil)}）`); }
  penNotice(`ドラフト${dr.pick}位で${TEAM[team].name}に入団（${B?'野手':W?'二刀流':'投手'}・18歳）`);
  penSetAbil0();   // 入団時の能力（伸びの表示用）
}
function penNotice(t){ PEN.notices.unshift({d:PEN.day,y:PEN.year,t}); if(PEN.notices.length>30) PEN.notices.length=30; }

// 古いペナントのセーブを今の形に直す
// 入団時の能力を覚えておく（古いセーブは1年目終了時の記録から）
function penSetAbil0(){
  const P=PEN; if(!P||P.abil0) return;
  const s0=P.seasons&&P.seasons[0];
  if(s0&&s0.abil){ P.abil0={...s0.abil}; P.babil0=s0.babil?{...s0.babil}:(P.babil?{...P.babil}:null); P.plev0={...(s0.plev||{})}; (s0.rep||[]).forEach(t=>{ if(P.plev0[t]==null) P.plev0[t]=t==='ストレート'?3:2; }); P.abil0est=true; }
  else { P.abil0={...P.abil}; P.babil0=P.babil?{...P.babil}:null; P.plev0={}; (P.rep||[]).forEach(t=>P.plev0[t]=lvOf(t)); if(P.campY) P.abil0est=true; }
}
function penMigrate(){
  if(PEN&&!PEN.abil0) penSetAbil0();
  if(!PEN) return;
  if(!PEN.abil){ PEN.abil={velo:146,control:55,stamina:70,budget:0}; PEN.rep=REP.slice(); PEN.plev={...PLEV}; }
  if(!PEN.teams){
    // 5球団の架空リーグ → 12球団へ。今までの試合数ぶん、他球団の成績も進めておく
    const old=PEN.rec||{w:0,l:0,t:0};
    PEN.team=pick(lgTeams('セ').concat(lgTeams('パ'))); PEN.sched=makeSched(); PEN.teams=newTeams(); rebuildAll();
    PEN.trades=[]; PEN.titles=[]; PEN.tradeY=0; PEN.v=2;
    for(let d=0;d<Math.min(PEN.day,SEASON_GAMES);d++){ const op=oppOf(d), A=PEN.teams[PEN.team], B=PEN.teams[op];
      const res=teamResult(poisson(3.85+B.off-A.def),poisson(3.85+A.off-B.def)); recAdd(op,flipRes(res)); otherGames(d); }
    PEN.teams[PEN.team].rec={...old};
    if(PEN.pending) PEN.pending.opp=oppOf(PEN.pending.day);
    delete PEN.opps; delete PEN.myTeam; delete PEN.rec;
    penNotice(`12球団・2リーグ制になりました。所属は${TEAM[PEN.team].name}です`);
  }
  // 選手（ロースター）が無い球団（前の版のセーブ）は、選手を作って打線を組み直す（勝敗はそのまま）
  let rb=false;
  for(const t of NPB){ const s=PEN.teams[t.id];
    if(!s){ PEN.teams[t.id]=genTeamState(); rb=true; continue; }
    if(!Array.isArray(s.F)){ Object.assign(s,newRoster()); if(!s.rec) s.rec={w:0,l:0,t:0}; rb=true; } }
  // 前の版の投手（3段階の変化球レベル・配球パターンなし）を新しい形に
  let up=false;
  for(const t of NPB){ const s=PEN.teams[t.id]; if(s&&Array.isArray(s.P)) s.P.forEach(p=>{ if(p&&!p.isMe&&(!p.plv||!('kime' in p))){ upgradePit(p); p.q=pitQ(p); up=true; } }); }
  if(up&&!rb) rebuildAll();
  if(rb){ rebuildAll(); if(isBat()) penCompete(true); if(isTW()) twCompete(true); }
  if(isTW()&&PEN.dh==null) twCompete(true);
  if(isBat()&&PEN.babil.def==null) PEN.babil.def=50;
  if(isBat()&&!PEN.bposs) PEN.bposs=[PEN.bpos||'OF'];
  if(PEN.pos==='W'){ PEN.bss=PEN.bss||batStat(); PEN.bcareer=PEN.bcareer||batStat(); }
  if(PEN.pending&&PEN.pending.opp==null) PEN.pending.opp=oppOf(PEN.pending.day);
  if(!PEN.titles) PEN.titles=[]; if(!PEN.trades) PEN.trades=[];
  if(!PEN.pos) PEN.pos='P';
  if(Object.values(PEN.plev||{}).some(v=>typeof v!=='number')) plevToNum();
  if(PEN.plev&&PEN.plev['ストレート']==null) PEN.plev['ストレート']=3;   // ストレートのLv（前の版のセーブは標準の3）
  if(PEN.campY==null) PEN.campY = PEN.day>0||PEN.review ? PEN.year : 0;   // 途中のシーズンはキャンプなし
  if(!PEN.btype){ PEN.btype='バランス'; assignTypesAll(); }   // 打者タイプ（前の版のセーブ）
  if(!PEN.oddDays&&typeof oddPlan==='function') oddPlan();
  if(typeof wbcRestoreTeams==='function') wbcRestoreTeams();   // WBCの国チームの色など（セーブには入れない）
  if(PEN.teams&&NPB.some(t=>PEN.teams[t.id]&&PEN.teams[t.id].F&&PEN.teams[t.id].F.some(f=>!f.btype))) assignTypesAll();
  if(!PEN.awake){ PEN.awake={bank:0,done:{},log:[]}; for(const [id,,,,cond] of AWAKE){ try{ if(cond()) PEN.awake.done[id]=true; }catch(_){} } }   // 前の版のセーブ：すでに達成済みの節目は覚醒の対象にしない
}
/* ---- 評価：今年の成績を通算より重く見る ---- */
function rating(st){ return mgrRating(myMgr(),st); }   // 監督の志向で評価の重みが変わる（manager.js）
// 伸び悩み：物足りない成績（評価50未満）で前年から伸びない年が続くと、監督の我慢の限界（性格で2〜5年）を超えたぶんだけ評価が下がる
const stagLimit=()=>{ const m=myMgr(); if(!m) return 4; if(m.a==='fav'){ const f=m.fav||0; return f<30?2:f<50?3:f<70?4:5; } return m.a==='merit'?2 : m.a==='young'?5 : 4; };   // 実力主義2年／若手優先5年／贔屓起用はお気に入り度で2〜5年／ベテラン優先4年
const stagPenalty=()=>{ const s=PEN&&PEN.stag; if(!s||!s.n) return 0; const over=s.n-stagLimit()+1; return over>0?Math.min(12,over*4):0; };
function stagUpdate(yR){   // シーズン終了時に呼ぶ
  const s=PEN.stag||(PEN.stag={n:0,last:null}); const y=yR==null?35:yR;
  const dull = y<50 && (s.last==null || y<s.last+3);   // 物足りなく、前年から3点以上伸びていない
  s.n = dull ? s.n+1 : 0; s.last=y; return s;
}
function evalR(){
  const rt=isBat()?ratingB:rating, y0=rt(PEN.ss), c0=rt(PEN.career), sp=stagPenalty(), y=y0==null?null:y0-sp, c=c0==null?null:c0-sp;
  const mb=Math.min(15,PEN.ss.mBonus||0);
  if(y==null&&c==null) return (isBat()?abilityRB():abilityR())+mb; if(y==null) return c+mb; if(c==null) return y+mb;
  const w=0.55+0.25*Math.min(1,isBat()?PEN.ss.pa/300:PEN.ss.outs/90);   // 今年の重み 55〜80%
  return y*w+c*(1-w)+Math.min(15,PEN.ss.mBonus||0)+favBonus();   // ミッション達成で評価アップ。贔屓監督ならお気に入り度も
}
// スキップ時の防御率の目安：自分の評価と平均（3.80）を混ぜる（スキップだけで極端に良く／悪くならないように）
// 能力から見込んだ評価（成績がまだ無いとき・少ないときに使う）
function abilityR(){
  if(!PEN||!PEN.abil) return 55;
  const a=PEN.abil, bp=(PEN.rep||[]).slice(1).reduce((t,x)=>t+lvPts(lvOf(x)),0);   // 変化球のポイント
  return clamp(28+(a.velo-120)*0.8+a.control*0.16+a.stamina*0.04+Math.min(bp,12)*1.6+Math.max(0,bp-12)*0.5,25,85);
}
const effERA=()=>clamp((100-evalR())/12,1.5,9)*0.45+3.8*0.55;
// 中継ぎは成績が悪いほど登板機会が減る
const relProb=()=>clamp(0.10+(evalR()-35)/40*0.32,0.06,0.42);

/* ---- 日程を進める ---- */
function penNextKind(){
  if(typeof oddKindToday==='function'){ const ok=oddKindToday(); if(ok) return ok; }   // 野手登板・代打投手の日
  if(isBat()){ if(PEN.role!=='代打') return 'bat'; const k=mySubMgr()?1.5:1;   // 代打多用型の監督は控えの出番が増える
    if(rnd()<Math.min(0.7,pinchProb()*k)) return 'pinch'; if(rnd()<Math.min(0.6,runnerProb()*k)) return 'runner'; return rnd()<Math.min(0.6,defsubProb()*k)?'defsub':null; }
  if(isStarter(PEN.role)&&PEN.day>=PEN.nextStart) return 'start';
  if(PEN.role==='中継ぎ'&&rnd()<relProb()) return 'relief';   // 中継ぎの登板（二刀流でも投げる日が優先）
  if(isTW()&&PEN.dh) return 'bat';   // 二刀流：投げない日は指名打者で
  if(isStarter(PEN.role)||PEN.role==='中継ぎ') return null;
  if(PEN.role==='抑え') return rnd()<0.34?'closer':null;
  return null;
}
// 守備固め・代走：控えのとき、守備が高いほど／足が速いほど終盤に出る（すべてオート。試合のあとに出場したことだけ知らせる）
const defsubProb=()=>{ const d=(PEN.babil&&PEN.babil.def)??50; return (PEN.bpos==='DH')?0:clamp((d-50)*0.02,0,0.45); };
const runnerProb=()=>{ const s=(PEN.babil&&PEN.babil.speed)??50; return clamp((s-55)*0.02,0,0.45); };
function subGameBase(){
  const op=oppOf(PEN.day), A=myT(), B=PEN.teams[op];
  let o=poisson(Math.max(1.6,3.85+B.off-A.def)), m=poisson(Math.max(1.6,3.85+A.off-B.def)); const res=teamResult(o,m);
  if(res==='W'&&m<=o) m=o+1; if(res==='L'&&o<=m) o=m+1;
  return {op,B,o,m,res};
}
function subPA(st,a){ const k=autoKind(a); st.pa++; if(k==='BB') st.bb++; else if(k==='HBP') st.hbp++; else st.ab++; if(k==='K') st.k++; if(['1B','IFH','2B','3B','HR'].includes(k)){ st.h++; if(k==='2B') st.d2++; if(k==='3B') st.d3++; if(k==='HR'){ st.hr++; st.rbi++; st.run++; } } return k; }
// 守備固め：自分の守備位置に飛んだ打球を処理（自分の守備・相手の速度・パワーで決まる）
function defsubGame(){
  const g=subGameBase(), a=effBabil(PEN.babil,'defsub'), st=batStat(); st.ds=1;
  if(rnd()<0.4) subPA(st,a);
  const d=a.def??50, t=myBtype(), L=g.B.lineup||[], notes=[]; let n=poisson(0.9);
  while(n-->0){ const b=L.length?pick(L):{speed:50,power:50};
    const tough=rnd()<0.4;   // ヒット性の難しい打球か
    const pOut=clamp((tough?0.35:0.93)+(d-50)*0.006-((b.speed||50)-50)*0.003-((b.power||50)-50)*0.002+btFx(t,'fld')+btFx(t,'dive'),0.05,0.98);
    if(rnd()<pOut){ if(tough){ st.gp++; notes.push(t==='守備職人'||rnd()<0.3?'ダイビングキャッチ':'好捕'); } }
    else if(!tough){ st.err++; notes.push('失策'); } }
  addBatLine(st,false);
  const note=`守備固めで出場${notes.length?`（${notes.join('・')}）`:''}${st.pa?`・${st.pa}打席${st.h?`${st.h}安打`:''}`:''}`;
  recordMyGame(g.res,[g.o,g.m],{kind:'defsub',note,bat:{pa:st.pa,ab:st.ab,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,bb:st.bb+st.hbp},gp:st.gp,played:false});
}
// 代走：盗塁は自分の速度・相手捕手の守備・相手投手の球速で決まる
function runnerGame(){
  const g=subGameBase(), a=effBabil(PEN.babil,'runner'), st=batStat(); st.pr=1;
  const C=(g.B.F||[]).filter(f=>f.pos==='C').sort((x,y)=>y.d-x.d)[0], cdef=C?C.d:50;
  let velo=145; try{ const gp=gamePitchers(g.op,PEN.day); velo=rnd()<0.6?gp.sp.velo:(pick(gp.pen)||gp.sp).velo; }catch(_){}
  const notes=[]; let ran=false;
  if(rnd()<0.75){ const p=clamp(0.42+(a.speed??50)*0.005-(cdef-50)*0.004-(velo-145)*0.006+btFx(myBtype(),'steal'),0.2,0.95);
    if(rnd()<p){ st.sb++; notes.push('盗塁成功'); } else { st.cs++; notes.push('盗塁死'); } }
  if(!st.cs&&rnd()<0.45){ st.run++; notes.push('得点'); ran=true; }
  if(rnd()<0.25) subPA(st,a);
  addBatLine(st,false);
  const note=`代走で出場${notes.length?`（${notes.join('・')}）`:''}${st.pa?`・${st.pa}打席${st.h?`${st.h}安打`:''}`:''}`;
  recordMyGame(g.res,[g.o,g.m],{kind:'runner',note,bat:{pa:st.pa,ab:st.ab,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,bb:st.bb+st.hbp},played:false});
}
function penStep(){   // 1試合進める（自分の登板になったら止まる）。進んだら true
  if(!PEN||PEN.pending||PEN.prompt||PEN.day>=SEASON_GAMES||needCamp()) return false;
  if(typeof wbcStep==='function'&&wbcStep()) return false;   // WBC中（開幕前）
  if(typeof injured==='function'&&injured()){ simTeamDay(); return true; }   // 怪我で離脱中
  if(typeof allstarStep==='function'&&allstarStep()) return false;   // オールスターの出番
  const k=penNextKind();
  if(k==='defsub'){ defsubGame(); return true; }
  if(k==='runner'){ runnerGame(); return true; }
  if(k){ const p=makePending(k); if(p){ PEN.pending=p; return false; } }
  simTeamDay(); return true;
}
function penToMine(){ let n=0; while(n++<200 && penStep()){} }
function teamResult(o,m){
  if(o!==m) return m>o?'W':'L';
  return rnd()<0.3?'T':(rnd()<0.5?'W':'L');
}
// 自分が投げない日：自分のチームの試合も戦力どおりに決める
function simTeamDay(){
  const op=oppOf(PEN.day), A=myT(), B=PEN.teams[op];
  if(!PEN.cs) csBackfill();
  const g=simLeagueGame(PEN.team,op,{errA:A.errUp>PEN.day});   // 自分が出ない日も、選手1人ずつ試合を回す（慣れない起用でエラーが増えている日は守りが弱い）
  recordMyGame(g.res,[g.rb,g.ra],null,true);
}
// 自分の登板機会（中継ぎ・抑えは、登板するまでの回を先に決めておく）
function makePending(kind,oppId){   // oppId：ポストシーズンなど相手を指定するとき
  if(kind==='oddP'||kind==='oddB') return makeOdd(kind);
  if(isBat()) return makePendingB(kind,oppId);
  if(isTW()&&kind==='bat'){ const d=PEN.day; return {day:d,opp:oppId||oppOf(d),kind:'bat',order:PEN.dhOrder,slot:'DH'}; }
  const d=PEN.day, opp=oppId||oppOf(d), op=PEN.teams[opp], p={day:d,opp,kind};
  if(kind==='start') return p;
  // 評価の高い中継ぎほど、リードしている場面（ホールドがつく場面）で使われる
  const wantLead = kind==='relief' && rnd()<clamp(0.40+(evalR()-50)/50,0.25,0.8);
  for(let t=0;t<50;t++){
    const oppL=op.lineup.map(deB).map(b=>({...b,res:[]})), myL=myT().lineup.map(plainB);
    const T={lineup:oppL,order:-1}, M={lineup:myL,order:-1};
    const E = kind==='closer'?9:ri(6,8), sp=genPitcher(), ops=genPitcher();
    const sc={opp:[],my:[]}; let ho=0,hm=0;
    for(let i=1;i<E;i++){
      const a=simHalf(T,0,[0,0,0],sp.q,null); sc.opp.push(a.runs); ho+=a.hits;
      const b=simHalf(M,0,[0,0,0],ops.q,null); sc.my.push(b.runs); hm+=b.hits;
    }
    const lead=sumN(sc.my)-sumN(sc.opp);
    if(kind==='closer' && !(lead>=1&&lead<=3)) continue;   // 抑えはセーブがつく場面だけ
    if(kind==='relief' && Math.abs(lead)>5) continue;
    if(wantLead && t<35 && !(lead>=1&&lead<=3)) continue;
    p.pre={entry:E,score:sc,oppOrder:T.order,myOrder:M.order,hitsOpp:ho,hitsMy:hm,oppLineup:oppL.map(serB),myLineup:myL,lead};
    return p;
  }
  return null;
}
const kindText=(p)=> p.kind==='wbc' ? (p.wbcKind==='bat'?`${isTW()?'指名打者':POS_JP[PEN.bpos]||''}で出場（日本代表）`:p.wbcKind==='start'?'先発登板（日本代表）':'途中の回から中継ぎで登板（日本代表）') : p.odd ? oddKindText(p) : p.kind==='allstar' ? (p.asKind==='bat'?`${isTW()?'指名打者':POS_JP[PEN.bpos]||''}でスタメン出場`:p.asKind==='start'?'先発登板（3回まで）':'途中の回から中継ぎで1イニング') : isBat()||p.kind==='bat' ? kindTextB(p) : p.kind==='start' ? (isTW()?'先発登板（二刀流：DHなしで打席にも立つ。打順は監督が決める）':'先発登板') : p.kind==='closer' ? `9回表から抑えで登板（${p.pre.lead}点リード）` :
  `${p.pre.entry}回表から中継ぎで登板（${p.pre.lead>0?p.pre.lead+'点リード':p.pre.lead<0?(-p.pre.lead)+'点ビハインド':'同点'}）`;

/* ---- 監督のミッション（たまに試合直前に言われる） ---- */
function genMission(kind){
  const brk=(PEN.rep||[]).slice(1);
  const L = kind==='start' ? [
    {id:'noBB',text:'今日は四球を1つも出すな（5回以上投げて）',rw:{control:2}},
    {id:'k7',text:'三振を7つ以上取れ',rw:{velo:1}},
    {id:'ip7',text:'7回まで投げきれ',rw:{stamina:2}},
    {id:'r2',text:'6回以上を2失点以内に抑えろ',rw:{control:1,stamina:1}},
    {id:'strK3',text:'ストレートで三振を3つ取れ',rw:{velo:1}},
    {id:'p100',text:'100球以内で6回まで投げろ',rw:{stamina:1,control:1}},
    ...brk.map(t=>({id:'brkK',t,text:`${t}で三振を2つ取れ`,rw:{brk:t}})),
  ] : [
    {id:'zero',text:'無失点で抑えろ',rw:{control:1}},
    {id:'k1',text:'三振を1つ取れ',rw:{velo:1}},
    {id:'noBBr',text:'四球を出すな（1イニング投げて）',rw:{control:1}},
    {id:'p15',text:'15球以内で無失点に抑えろ',rw:{stamina:1}},
    ...(kind==='closer'?[{id:'save',text:'セーブを挙げろ',rw:{control:1,stamina:1}}]:[]),
  ];
  return {...pick(L),ok:null};
}
function checkMission(){
  const m=G.mission, st=G.st, bt=st.byType||{}, dec=G.result?G.result.dec:'－';
  const ok={
    noBB:st.bb===0&&st.outs>=15, k7:st.k>=7, ip7:st.outs>=21, r2:st.outs>=18&&st.runs<=2,
    strK3:(bt['ストレート']||{k:0}).k>=3, p100:st.outs>=18&&st.pitches<=100, brkK:(bt[m.t]||{k:0}).k>=2,
    zero:st.outs>=3&&st.runs===0, k1:st.k>=1, noBBr:st.outs>=3&&st.bb===0, p15:st.outs>=3&&st.runs===0&&st.pitches<=15, save:dec==='S',
  }[m.id];
  m.ok=!!ok;
  if(!m.ok){ PEN.ss.mNG++; favChange(-2); return; }
  // 達成：評価アップ＋内容に応じて能力が少しだけ上がる（贔屓監督ならお気に入り度も上がる）
  PEN.ss.mOK++; PEN.ss.mBonus=(PEN.ss.mBonus||0)+3; favChange(8);
  const a=PEN.abil, got=[];
  if(m.rw.velo){ const v=r1(m.rw.velo/2); a.velo=r1(Math.min(165,a.velo+v)); got.push(`球速+${v}`); }   // ミッションの上がり幅は半分
  if(m.rw.control){ const v=r1(m.rw.control/2); a.control=r1(Math.min(100,a.control+v)); got.push(`コントロール+${v}`); }
  if(m.rw.stamina){ const v=r1(m.rw.stamina/2); a.stamina=r1(Math.min(100,a.stamina+v)); got.push(`スタミナ+${v}`); }
  if(m.rw.brk){ const t=m.rw.brk; PEN.bexp=PEN.bexp||{}; PEN.bexp[t]=(PEN.bexp[t]||0)+1;
    if(PEN.bexp[t]>=2){ PEN.bexp[t]=0; const cur=lvOf(t); if(cur<LV_MAX){ PEN.plev[t]=cur+1; got.push(`${t}がLv.${cur+1}に`); } }
    else got.push(`${t}の経験値+1`); }
  m.got=got.join('・');
  penNotice(`ミッション達成！「${m.text}」 ${m.got}`);
}

/* ---- 投げる ---- */
// 今の試合が、この登板（pending）の試合かどうか
const gameIsPending=()=>!!(PEN&&PEN.pending&&G&&G.pen&&!G.penDone&&G.pen.day===PEN.pending.day&&(G.pen.year==null||G.pen.year===PEN.year));
const liveForPending=()=>gameIsPending()&&!G.over;
// この登板の試合を閉じる（結果を記録したら、もう続きもやり直しもできない）
function closePenGame(){ if(G&&G.pen){ G.penDone=true; G.over=true; } }
function penPlay(){
  const p=PEN.pending; if(!p) return; penMigrate();
  // 一度始めた試合は「続きから」だけ。最初からやり直しはできない
  if(p.started){ if(liveForPending()){ showScreen('game'); } else if(gameIsPending()&&G.over){ penGameDone(); penBack(); } else { penAbandoned(); } return; }
  p.started=true;
  if(p.kind==='allstar'){ allstarPlay(p); return; }   // オールスター
  if(p.kind==='wbc'){ wbcPlay(p); return; }   // WBC
  if(p.odd==='bat'){ penPlayB(p); return; }   // 投手の代打
  if(p.odd!=='pitch'&&(isBat()||(isTW()&&p.kind==='bat'))){ penPlayB(p); return; }   // 野手・二刀流の指名打者の日
  const op=PEN.teams[p.opp], me=myT();
  const lineup = p.pre ? p.pre.oppLineup.map(deB) : op.lineup.map(deB).map(b=>({...b,res:[]}));
  lineup.forEach(b=>{ if(!b.res) b.res=[]; });
  const tw=isTW()&&p.kind==='start';
  const myL = p.pre ? p.pre.myLineup.map(b=>({...b,res:(b.res||[]).slice()})) : tw ? twLineup() : me.lineup.map(plainB);
  PHAND=PEN.hand; REP=p.odd?p.oddRep.slice():PEN.rep.slice(); PLEV=p.odd?{...p.oddPlev}:{...PEN.plev}; ptype=REP[0];   // ペナントの持ち球（野手登板は固定）
  showScreen('game');
  newGame(true,{OPP:{pattern:op.pattern,hand:op.hand}, lineup,
    myTeam:{name:LINEUPS[me.pattern].name,hand:HANDS[me.hand].name,lineup:myL,order:-1},
    names:{my:{name:TEAM[PEN.team].short,s:TEAM[PEN.team].s,id:PEN.team},opp:{name:TEAM[p.opp].short,s:TEAM[p.opp].s,id:p.opp}},
    pname:PEN.pname, pen:{day:p.day,year:PEN.year,kind:p.kind,role:PEN.role,team:PEN.team,opp:p.opp,odd:p.odd||null,...(p.ps?{ps:true,psName:p.psName,gameNo:p.gameNo}:{})}, pre:p.pre||null, abil:p.odd?p.oddAbil:PEN.abil,
    ...(()=>{ const o=gamePitchers(p.opp,p.day), m=gamePitchers(PEN.team,p.day); return {oppPitcher:{...o.sp},oppPen:o.pen.map(x=>({...x})),bullpen:m.bull.map(x=>({...x}))}; })(),
    mission: p.odd?null:(rnd()<0.35 ? genMission(p.kind) : null)});
  if(tw){ twSetup(myL); if(typeof showTitle==='function') showTitle(); }   // 二刀流：DHなしで打席にも立つ
  renderAll(); save();
}
// 試合が終わったとき（finishGame から呼ばれる）
function penGameDone(){
  if(G&&G.pen&&G.pen.tryout){ if(!G.penDone){ G.penDone=true; tryoutGameDone(); } return; }   // トライアウト（hall.js）
  if(G&&G.pen&&G.pen.wbc){ if(!G.penDone){ G.penDone=true; wbcGameDone(); } return; }   // WBC（シーズン成績に入れない）
  if(G&&G.pen&&G.pen.allstar){ if(!G.penDone){ G.penDone=true; allstarGameDone(); } return; }   // オールスター（シーズン成績に入れない）
  if(G&&G.pen&&G.pen.ps){ if(!G.penDone){ G.penDone=true; psGameDone(); } return; }   // ポストシーズン（別の成績）
  const p=PEN&&PEN.pending; if(!p||G.penDone||!G.pen||G.pen.day!==p.day) return; G.penDone=true;
  if(p.odd){ oddGameDone(p); return; }   // 野手登板・代打投手：評価・成績に入れない
  if(G.bat&&!G.tw){ penGameDoneB(p); return; }
  const st=G.st, res=G.result?G.result.res:(myTot()>oppTot()?'W':myTot()<oppTot()?'L':'T');
  addLine(st,G.result.dec,p.kind==='start');
  mergeByType(PEN.ss.byType||(PEN.ss.byType={}),st.byType||{});
  if(PEN.favTry) favTryRecord(((st.byType||{})[PEN.favTry.t]||{n:0}).n,true);   // 贔屓監督の試し投げ
  const tb=G.tw&&G.bst?G.bst:null; if(tb) addTwBat(tb);   // 二刀流の打撃成績
  if(G.mission) checkMission();
  afterAppearance();
  recordMyGame(res,[oppTot(),myTot()],{kind:p.kind,outs:st.outs,runs:st.runs,k:st.k,dec:G.result.dec,played:true,mission:G.mission?(G.mission.ok?'達成':'失敗'):null,
    tb:tb?{ab:tb.ab,h:tb.h,hr:tb.hr,rbi:tb.rbi}:null});
  PEN.pending=null; tradeCheck();
}
function penBack(){ showScreen('pennant'); save(); }
// 日程画面から、途中の試合の残りをおまかせで終わらせる（結果は試合画面で観戦できる）
function penSkipHere(){
  if(!liveForPending()) { renderPennant(); return; }
  showScreen('game');
  let Q;
  if(G.tw&&G.bat){ G.autoMe=true; const Q0=batProceed(); const Q1=G.bottomOver?(finishGame(true),[]):(skipMyOuting()||[]); Q=Q0.concat(Q1); }   // 二刀流：打席の途中なら、その攻撃もおまかせ
  else if(G.bat) Q=batSkipRest();
  else if(G.pulled && !G.restDone) Q=runRest();   // 降板済みなら残りを進めるだけ
  else Q=skipMyOuting();
  if(!Q){ return; }
  save();
  playBack(Q,()=>{ renderAll(); if(G.over&&G.result&&typeof showFinal==='function') showFinal(G.result.res,G.result.dec); });
}
// 始めた試合が途中で無くなった（別の試合を始めた等）ときは、スキップ扱いで結果を決める
function penAbandoned(){
  if(!PEN||!PEN.pending) return;
  penNotice(`第${PEN.pending.day+1}試合は途中で中断したため、スキップ扱いになりました`);
  penSkip();
}

/* ---- スキップ：今の成績に応じてランダムに結果を残す ---- */
function mkLine(outs,runs){
  const ip=outs/3, hits=Math.max(runs?Math.round(runs*0.9):0,poisson(ip*0.85)), bb=poisson(ip*0.33), k=poisson(ip*0.85), hr=Math.min(runs,poisson(ip*0.1));
  const bf=outs+hits+bb; return {...newStat(),outs,runs,hits,hr,bb,k,bf,pitches:Math.max(bf*4+ri(-5,8),outs)};
}
function penSkip(){
  const p=PEN.pending; if(!p) return;
  if(p.kind==='allstar'){ allstarSkip(); renderPennant(); save(); return; }
  if(p.kind==='wbc'){ wbcSkip(); renderPennant(); save(); return; }
  if(p.ps){ psSkip(); renderPennant(); save(); return; }
  if(p.odd){ oddSkip(p); renderPennant(); save(); return; }
  if(gameIsPending()) closePenGame();   // 途中の試合があれば閉じる（同じ試合を後から続けられないように）
  if(isBat()||(isTW()&&p.kind==='bat')){ penSkipB(); renderPennant(); save(); return; }
  const R=evalR(), era=effERA(), A=myT(), B=PEN.teams[p.opp]||A; let line, dec='－', res, so, sm;
  const oRate=Math.max(2.4,3.6+B.off-A.def*0.5), mRate=Math.max(1.8,3.9+A.off-B.def);   // 味方のリリーフの失点・味方打線の得点
  if(p.kind==='start'){
    const outs=clamp(Math.round(12+PEN.abil.stamina*0.1+(R-55)*0.18+(rnd()-.5)*8),3,27);   // スタミナが多いほど長く投げる
    const runs=poisson(era*outs/27*(0.6+rnd()*0.8)); line=mkLine(outs,runs);
    so=runs+poisson(oRate*(27-outs)/27); sm=poisson(mRate); res=teamResult(so,sm);
    if(res==='W'&&sm<=so) sm=so+1; if(res==='L'&&so<=sm) so=sm+1;
    if(res==='W'&&outs>=15&&runs<sm) dec='勝'; else if(res==='L'&&runs>=Math.max(1,sm)) dec='負';
  }else{
    const L0=p.pre.lead, runs=poisson(era/9*(0.6+rnd()*0.8)); line=mkLine(3,runs);
    const bo=sumN(p.pre.score.opp), bm=sumN(p.pre.score.my);
    if(p.kind==='closer'){
      so=bo+runs; sm=bm;
      if(L0-runs>0){res='W';dec='S';} else { sm+=poisson(0.6); res=teamResult(so,sm); if(res==='W'&&sm<=so)sm=so+1; if(res==='L'&&so<=sm)so=sm+1; if(res==='L')dec='負'; }
    }else{
      const rest=9-p.pre.entry; so=bo+runs+poisson(oRate*rest/9); sm=bm+poisson(mRate*(rest+1)/9); res=teamResult(so,sm);
      if(res==='W'&&sm<=so)sm=so+1; if(res==='L'&&so<=sm)so=sm+1;
      const L1=L0-runs;
      if(L0>0&&L1>0) dec='H'; else if(L1<0&&L0>=0&&res==='L') dec='負'; else if(L0<=0&&res==='W'&&rnd()<0.3) dec='勝';
    }
  }
  addLine(line,dec,p.kind==='start');
  mergeByType(PEN.ss.byType||(PEN.ss.byType={}),estByType(line));
  if(PEN.favTry){ const F=PEN.favTry; favTryRecord((line.pitches||0)>=F.n+8?F.n:Math.min(F.n-1,Math.floor((line.pitches||0)/3)),false); }   // おまかせは指示どおり投げる（短い登板だと届かない）
  const tb=isTW()&&p.kind==='start'?twSkipBat(line.outs):null; if(tb) addTwBat(tb);
  afterAppearance();
  recordMyGame(res,[so,sm],{kind:p.kind,outs:line.outs,runs:line.runs,k:line.k,dec,played:false,tb:tb?{ab:tb.ab,h:tb.h,hr:tb.hr,rbi:tb.rbi}:null});
  PEN.pending=null; tradeCheck();
  renderPennant(); save();
}
function addLine(st,dec,isStart){
  for(const T of [PEN.ss,PEN.career]){
    for(const k of ['pitches','hits','hr','k','bb','bf','outs','runs']) T[k]+=st[k]||0;
    T.g++; if(isStart)T.gs++;
    if(dec==='勝'){ T.w++; if(!isStart) T.rw=(T.rw||0)+1; }   // 救援勝利はホールドポイントに入る
    if(dec==='負')T.l++; if(dec==='S')T.sv++; if(dec==='H')T.hld++;
    if(isStart&&(st.outs||0)>=27&&!(st.runs||0)) T.sho=(T.sho||0)+1;   // 完封
  }
  PEN.roleApps++;
  awakeCheck();
}

/* ---- 覚醒イベント：節目の記録で持ち点がもらえる（次のキャンプで使える） ----
   1pt（50%）プロ初タイムリー・初本塁打・初勝利・初ホールド・初セーブ・初完封
   3pt（33%）初の年間100安打・シーズン10勝・30ホールド・30セーブ
   5pt（25%）通算500安打・50勝・50ホールド・50セーブ
   10pt（必ず）通算1000安打・100勝・100ホールド・100セーブ                                     */
const AWAKE=[
  ['tl1', 1,0.50,'プロ初タイムリー',   ()=>(bC().tl||0)>=1], ['hr1', 1,0.50,'プロ初ホームラン',  ()=>bC().hr>=1],
  ['w1',  1,0.50,'プロ初勝利',         ()=>pC().w>=1],    ['h1',  1,0.50,'プロ初ホールド',    ()=>pC().hld>=1],
  ['sv1', 1,0.50,'プロ初セーブ',       ()=>pC().sv>=1],   ['sho1',1,0.50,'プロ初完封',        ()=>(pC().sho||0)>=1],
  ['h100',3,0.33,'プロ初の年間100安打',()=>bS().h>=100],  ['w10', 3,0.33,'プロ初のシーズン10勝',()=>pS().w>=10],
  ['h30', 3,0.33,'プロ初のシーズン30ホールド',()=>pS().hld>=30], ['sv30',3,0.33,'プロ初のシーズン30セーブ',()=>pS().sv>=30],
  ['h500',5,0.25,'通算500安打',        ()=>bC().h>=500],  ['w50', 5,0.25,'通算50勝',          ()=>pC().w>=50],
  ['hd50',5,0.25,'通算50ホールド',     ()=>pC().hld>=50], ['sv50',5,0.25,'通算50セーブ',      ()=>pC().sv>=50],
  ['h1000',10,1,'通算1000安打',        ()=>bC().h>=1000], ['w100',10,1,'通算100勝',           ()=>pC().w>=100],
  ['hd100',10,1,'通算100ホールド',     ()=>pC().hld>=100],['sv100',10,1,'通算100セーブ',      ()=>pC().sv>=100],
];
// 表彰（タイトル扱い）：タイトル欄に残し、確率で持ち点がつく（次のキャンプに加算）。覚醒とは別に表示
function titleAward(name,pts,prob){
  PEN.titles=PEN.titles||[]; PEN.titles.push({y:PEN.year,name});
  const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]});
  const hit=pts>0&&rnd()<(prob==null?1:prob);
  if(hit){ A.bank=r1((A.bank||0)+pts); A.log.push({y:PEN.year,name,pts,kind:'title'}); penNotice(`🏆 ${name}に選ばれた！ 次のキャンプの持ち点 +${pts}（ためている持ち点 ${A.bank}）`); }
  else { A.log.push({y:PEN.year,name,pts:0,kind:'title'}); penNotice(`🏆 ${name}に選ばれた！${pts>0?`（今回は持ち点はつかなかった・確率${Math.round((prob||0)*100)}%）`:''}`); }
  return hit;
}
const Z0={h:0,hr:0,tl:0,w:0,hld:0,sv:0,sho:0};
const bS=()=>isBat()?PEN.ss:isTW()?(PEN.bss||Z0):Z0, bC=()=>isBat()?PEN.career:isTW()?(PEN.bcareer||Z0):Z0;
const pS=()=>isBat()?Z0:PEN.ss, pC=()=>isBat()?Z0:PEN.career;
function awakeCheck(){
  if(!PEN||PEN.released) return; const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]});
  for(const [id,pts,pr,name,cond] of AWAKE){
    if(A.done[id]) continue; let ok=false; try{ ok=cond(); }catch(_){}
    if(!ok) continue;
    A.done[id]=true;
    if(rnd()<pr+(PEN.team==='M'?0.05:0)){ A.bank=r1((A.bank||0)+pts); A.log.push({y:PEN.year,name,pts});   // ロッテは覚醒の確率+5%
      penNotice(`✨ 覚醒！ ${name}をきっかけに一回り成長。次のキャンプの持ち点 +${pts}（ためている持ち点 ${A.bank}）`); }
    else penNotice(`${name}を達成！（今回は覚醒しなかった）`);
  }
}

// 覚醒の持ち点を入れる（kind省略＝覚醒）
function awakeGive(name,pts,extra){
  const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]});
  A.bank=r1((A.bank||0)+pts); A.log.push({y:PEN.year,name,pts});
  penNotice(`✨ 覚醒！ ${name}${extra?`（${extra}）`:''}。次のキャンプの持ち点 +${pts}（ためている持ち点 ${A.bank}）`);
}
// 移籍したとき：10%で「恩返し」+5
function awakeTransfer(from,to){
  if(!PEN||from===to) return;
  if(rnd()<0.10+(to==='M'?0.05:0)) awakeGive('恩返し',5,`${TEAM[from].short}への恩返しを誓う`);
}
// シーズン終了時の覚醒：25歳のシーズンまで。規定の半分以上で 打率.300／10本塁打／防御率3.00（各25%・一度覚醒したら終わり）
const MR_NAME={H:'ホークス',L:'レオ',F:'ファイターズ',B:'バッファローズ',M:'マリーンズ',E:'イーグルス',T:'タイガース',G:'ジャイアンツ',DB:'ベイスターズ',C:'カープ',S:'スワローズ',D:'ドラゴンズ'};
function awakeSeason(){
  if(!PEN) return; const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]}), pr=0.25+(PEN.team==='M'?0.05:0);
  const b=isBat()?PEN.ss:isTW()?PEN.bss:null, p=isBat()?null:PEN.ss, halfPA=Math.ceil(QUAL_PA/2), halfOuts=Math.ceil(SEASON_GAMES*3/2);
  if((PEN.age||99)<=25){
    if(b&&b.pa>=halfPA){
      if(!A.done.avg300&&bAvg(b)>=0.300){ if(rnd()<pr){ A.done.avg300=true; PEN.babil.meet=r1(Math.min(100,PEN.babil.meet+5)); awakeGive('安打製造機の覚醒',10,'ミート+5'); } else penNotice(`打率${bAvg(b).toFixed(3).replace(/^0/,'')}を達成！（今回は覚醒しなかった）`); }
      if(!A.done.hr10&&b.hr>=10){ if(rnd()<pr){ A.done.hr10=true; PEN.babil.power=r1(Math.min(100,PEN.babil.power+5)); awakeGive('長距離砲の覚醒',10,'パワー+5'); } else penNotice(`${b.hr}本塁打を達成！（今回は覚醒しなかった）`); }
    }
    if(p&&(p.outs||0)>=halfOuts&&!A.done.era300){ const era=p.runs*27/p.outs;
      if(era<=3.0){ if(rnd()<pr){ A.done.era300=true; awakeGive('エースピッチャーへの兆し',20); } else penNotice(`防御率${era.toFixed(2)}を達成！（今回は覚醒しなかった）`); } }
    // 怪童への道：シーズンでストレートの奪三振50以上（33%）→ ストレートLv+1（最大なら持ち点+5）・球速+2〜5
    const sk=p&&p.byType&&p.byType['ストレート']?p.byType['ストレート'].k||0:0;
    if(p&&!A.done.kaido&&sk>=50){ if(rnd()<0.33+(PEN.team==='M'?0.05:0)){ A.done.kaido=true;
        const lv=lvOf('ストレート'), dv=ri(2,5), a=PEN.abil; a.velo=r1(Math.min(165,a.velo+dv)); let ex=`球速+${dv}km/h`, pts=0;
        if(lv<LV_MAX){ PEN.plev['ストレート']=lv+1; ex=`ストレートLv.${lv+1}・`+ex; } else pts=5;
        if(pts) awakeGive('怪童への道',pts,ex); else { A.log.push({y:PEN.year,name:'怪童への道',pts:0}); penNotice(`✨ 覚醒！ 怪童への道（${ex}）`); } }
      else penNotice(`ストレートで${sk}奪三振を達成！（今回は覚醒しなかった）`); }
  }
  // ミスター○○：同じ球団に10年、10年とも毎年スタメン（投手は登板）が1試合以上 → +20（球団ごとに1回）
  const tm=PEN.team, key='mr_'+tm, S=PEN.seasons||[];
  if(!A.done[key]&&MR_NAME[tm]){
    const yrs=[]; for(let y=PEN.year-9;y<=PEN.year;y++) yrs.push(y);
    const ok=yrs.every(y=>{ const s=S.find(x=>x.year===y); if(!s||s.team!==tm) return false;
      const bs=s.pos==='B'?s.ss:s.bss, ps=s.pos==='B'?null:s.ss; return (bs&&(bs.gs||0)>=1)||(ps&&(ps.g||0)>=1); })
      && !(PEN.trades||[]).some(t=>t.y>PEN.year-9||(t.y===PEN.year-9&&t.d!=null));
    if(ok){ A.done[key]=true; awakeGive(`ミスター${MR_NAME[tm]}`,20,`${TEAM[tm].short}一筋10年`); }
  }
}
/* ---- 配置転換 ---- */
function setRole(r,msg){
  const old=PEN.role; PEN.role=r; PEN.roleApps=0; PEN.stayUntil=0;
  if(isBat()) PEN.order=orderFor(r);
  if(isStarter(r)&&!isStarter(old)) PEN.nextStart=PEN.day+3;
  if(isStarter(r)&&isStarter(old)) PEN.nextStart=Math.min(PEN.nextStart,PEN.day+REST[r]+1);
  penNotice(msg||`配置転換：${roleName(old)} → ${roleName(r)}`);
}
function afterAppearance(){
  const d=PEN.day;   // まだ日付を進める前（この試合の番号）
  if(isStarter(PEN.role)) PEN.nextStart=d+REST[PEN.role]+1;
  const R=evalR(), r=PEN.role, n=PEN.roleApps;
  if(isStarter(r)&&n>=3){
    if(r==='裏ローテ'&&R>=58) return setRole('ローテ','好投が評価され、ローテーション入り！（中7日）');
    if(r==='ローテ'&&R>=75) return setRole('エース','エースに昇格！（中5日）');
    if(r==='エース'&&R<62) return setRole('ローテ','成績が落ち、ローテーションに降格');
    if(r==='ローテ'&&R<48) return setRole('裏ローテ','成績が落ち、裏ローテに降格（中10日）');
    if(r==='裏ローテ'&&R<42) return setRole('中継ぎ',`先発で結果が残せず、中継ぎに配置転換${isTW()?'（投げない日の指名打者の争いはそのまま）':''}`);
  }
  if(r==='中継ぎ'&&n>=8&&R>=66&&isTW()){ PEN.prompt={kind:'twBack'}; return; }   // 二刀流は抑えにはならず、監督の話のあと先発に戻る
  if(r==='中継ぎ'&&n>=8&&R>=66&&n>=PEN.stayUntil) PEN.prompt={kind:'up'};   // 先発に戻るか抑えか選べる
  if(r==='抑え'&&n>=6&&R<48) return setRole('中継ぎ','抑えで結果が残せず、中継ぎに配置転換');
}

/* ---- トレードの打診（成績が良くないとき。1シーズンに1回まで） ---- */
function tradeTarget(){
  const lg=TEAM[PEN.team].lg, st=standings(lg), i=st.findIndex(x=>x.id===PEN.team);
  if(i<st.length-1) return pick(st.slice(i+1)).id;   // 今のチームより下位の球団
  const o=standings(otherLg(lg)); return o[o.length-1].id;   // 最下位なら他リーグの最下位球団
}
function tradeCheck(){
  if(!PEN||PEN.prompt||PEN.released||PEN.tradeY===PEN.year) return;
  const d=PEN.day; if(d<25||d>120||PEN.ss.outs<24) return;   // 開幕直後と終盤は無し・ある程度投げてから
  const R=evalR(); if(R>=45) return;
  if(rnd()>0.25+(45-R)*0.03) return;
  PEN.tradeY=PEN.year; PEN.prompt={kind:'trade',to:tradeTarget(),from:PEN.team};
}
function penTrade(c){
  const pr=PEN.prompt; if(!pr) return;
  if(pr.kind==='trade'){
    if(c==='stay'){ PEN.prompt=null; penNotice(`${TEAM[pr.to].short}へのトレードを断り、${TEAM[PEN.team].short}に残ることにした`); }
    else if(isBat()){   // 野手は新しいチームでスタメン争い
      const from=PEN.team, to=pr.to; PEN.prompt=null; PEN.team=to; PEN.joinY=PEN.year+1; PEN.trades.push({y:PEN.year,d:PEN.day,from,to}); awakeTransfer(from,to);
      penNotice(`トレードで${TEAM[from].short}から${TEAM[to].name}へ移籍！ ${POS_JP[PEN.bpos]}のポジション争いから再出発`);
      rebuildTeam(from); PEN.role=null; penCompete();
    }
    else if(isTW()){   // 二刀流は先発のまま移籍。投げない日の指名打者は新しいチームで争う
      const from=PEN.team, to=pr.to; PEN.prompt=null; PEN.team=to; PEN.joinY=PEN.year+1; PEN.trades.push({y:PEN.year,d:PEN.day,from,to}); awakeTransfer(from,to);
      rebuildTeam(from); rebuildTeam(to);
      const st=isStarter(PEN.role);
      setRole(st?PEN.role:'中継ぎ',`トレードで${TEAM[from].short}から${TEAM[to].name}へ移籍！ 二刀流（${st?'先発':'中継ぎ'}）として再出発`);
      if(st) PEN.nextStart=PEN.day+ri(1,3); twCompete(true);
    }
    else PEN.prompt={kind:'tradeRole',to:pr.to,from:PEN.team};
  }else if(pr.kind==='tradeRole'){
    const from=PEN.team, to=pr.to; PEN.prompt=null;
    PEN.team=to; PEN.joinY=PEN.year+1; PEN.trades.push({y:PEN.year,d:PEN.day,from,to}); awakeTransfer(from,to);
    const B=isBat(), nr=c==='start'?(B?'下位':'ローテ'):(B?'代打':'中継ぎ');
    setRole(nr,`トレードで${TEAM[from].short}から${TEAM[to].name}へ移籍！ ${B?(c==='start'?'スタメン（下位打線）':'代打'):(c==='start'?'先発（ローテーション）':'中継ぎ')}として再出発`);
    if(c==='start'&&!B) PEN.nextStart=PEN.day+ri(1,3);
  }
  renderPennant(); save();
}
function penChoose(c){
  if(PEN.prompt&&PEN.prompt.kind==='twBack'){ PEN.prompt=null; setRole('裏ローテ','監督の判断で、二刀流として先発（裏ローテ）に戻った'); renderPennant(); save(); return; }
  PEN.prompt=null;
  if(c==='裏ローテ') setRole('裏ローテ','中継ぎでの好投が評価され、先発（裏ローテ）に復帰');
  else if(c==='抑え') setRole('抑え','中継ぎでの好投が評価され、抑えに抜擢！');
  else { PEN.stayUntil=PEN.roleApps+10; penNotice('中継ぎのまま投げることにした'); }
  renderPennant(); save();
}
function penToStarter(){ setRole('ローテ','抑えから先発（ローテーション）に復帰'); renderPennant(); save(); }

/* ---- 年末の表彰（タイトル）：同じリーグの他の投手のトップと比べる ---- */
const TITLES=[
  {id:'era',name:'最優秀防御率',note:'規定投球回143回以上'},
  {id:'win',name:'最多勝利',note:''},
  {id:'pct',name:'勝率第一位投手',note:'13勝以上'},
  {id:'k',name:'最多奪三振',note:''},
  {id:'sv',name:'最多セーブ',note:''},
  {id:'hp',name:'最優秀中継ぎ',note:'ホールドポイント＝ホールド＋救援勝利'},
];
function titleRace(){
  const s=PEN.ss, ip=s.outs/3, lg=TEAM[PEN.team].lg, rivals=lgTeams(lg).filter(id=>id!==PEN.team), used=new Set();
  const who=()=>({name:randName(used),team:pick(rivals)});
  const hp=s.hld+(s.rw||0);
  const aw=ri(13,16), al=ri(2,6);
  const R={
    era:{ai:csAI(lg,'era',x=>x.outs>=429,2)||{...who(),v:+(1.35+rnd()*0.95).toFixed(2)}, mine:ip>=143?s.runs*9/ip:null, low:true, fmt:v=>v.toFixed(2), unit:'', why:ip>=143?'':`規定投球回に届かず（${fmtIP(s.outs)}回）`},
    win:{ai:csAI(lg,'win')||{...who(),v:ri(12,17)}, mine:s.w, unit:'勝'},
    pct:{ai:rnd()<0.85?{...who(),v:aw/(aw+al),wl:`${aw}勝${al}敗`}:null, mine:s.w>=13?s.w/(s.w+s.l):null, fmt:v=>v.toFixed(3).replace(/^0/,''), unit:'', why:s.w>=13?'':`13勝に届かず（${s.w}勝）`},
    k:{ai:csAI(lg,'k')||{...who(),v:ri(140,195)}, mine:s.k, unit:'個'},
    sv:{ai:csAI(lg,'sv')||{...who(),v:ri(28,44)}, mine:s.sv, unit:'S'},
    hp:{ai:{...who(),v:ri(28,42)}, mine:hp, unit:'HP'},
  };
  return TITLES.map(t=>{
    const r=R[t.id], f=r.fmt||(v=>String(v)); let won=false, shared=false;
    if(r.mine!=null&&r.mine>0||t.id==='era'&&r.mine!=null){
      if(!r.ai) won=true;
      else if(r.low){ const m=+r.mine.toFixed(2); won=m<=r.ai.v; shared=m===r.ai.v; }
      else { const m=t.id==='pct'?+r.mine.toFixed(3):r.mine, a=t.id==='pct'?+r.ai.v.toFixed(3):r.ai.v; won=m>=a; shared=m===a; }
    }
    return {id:t.id,name:t.name,note:t.note,won,shared,
      mine:r.mine==null?'-':f(r.mine)+r.unit, why:r.why||'',
      ai:r.ai?`${r.ai.name}（${TEAM[r.ai.team].short}）${f(r.ai.v)}${r.unit}${r.ai.wl?'・'+r.ai.wl:''}`:'該当者なし'};
  });
}

/* ---- 年末の年俸査定 ---- */
const TITLE_BONUS=0.06;   // タイトル1つにつき +6%
/* ---- まとめて日にちを飛ばす ---- */
const MILESTONES=[['inter',50,'交流戦開始まで'],['allstar',75,'オールスターまで'],['final',SEASON_GAMES-1,'レギュラーシーズン最終戦まで'],['cs',SEASON_GAMES,'クライマックスシリーズ開始まで'],['js',SEASON_GAMES,'日本シリーズ開始まで'],['award',SEASON_GAMES,'タイトル表彰日まで']];
let QUIET=false;
// スキップで止まる条件（チェックボックス）。初期値はすべて止まる
const skipStop=()=>PEN.skipStop||(PEN.skipStop={wbc:true,allstar:true,cs:true,js:true});
function penSkipTo(key){
  if(key==='wbcend'){ if(typeof wbcRunAll==='function'&&PEN.wbc&&!PEN.wbc.done){ if(PEN.pending&&PEN.pending.kind==='wbc') wbcSkip(); wbcRunAll(); } renderPennant(); save(); window.scrollTo(0,0); return; }
  const m=MILESTONES.find(x=>x[0]===key); if(!m||!PEN||PEN.released||needCamp()) return;
  const target=m[1]; let n=0, stopped=null; const ST=skipStop();
  QUIET=true;
  try{
    while(PEN.day<target&&n++<400){
      if(PEN.prompt) break;                          // 打診が来たら止まる
      if(PEN.pending){ if(gameIsPending()&&!G.over) break;
        if(PEN.pending.kind==='allstar'&&ST.allstar){ stopped='オールスターに選ばれたので止まりました'; break; }   // チェックで止める
        if(PEN.pending.kind==='wbc'&&ST.wbc){ stopped='WBCの出番なので止まりました'; break; }
        penSkip(); continue; }   // 途中の試合があれば止まる
      if(!penStep()&&!PEN.pending) break;
    }
  }finally{ QUIET=false; }
  if(key==='allstar'&&PEN.day>=75&&!PEN.prompt&&!PEN.pending) penNotice('⭐ オールスター休み。後半戦へ');
  if(!stopped&&PEN.day>=SEASON_GAMES&&!PEN.pending){ if(!PEN.review) PEN.review=yearReview(); const rv=PEN.review, S=rv.ps;
    if((key==='js'||key==='award')&&S&&!S.done){
      const inCS=psMyTeamIn(S);
      if(ST.cs&&inCS){ stopped='クライマックスシリーズに進出したので止まりました'; }
      else { psRunAll('JS'); const js=S.series.JS; if(key==='award'&&!S.done){ if(ST.js&&js&&psMine(js)) stopped='日本シリーズに進出したので止まりました'; else psRunAll(); } }
    } }
  if(stopped) penNotice(`⏩ ${stopped}`);
  renderPennant(); save(); window.scrollTo(0,0);
}
// ポストシーズン（結果だけ）：各リーグ上位3チームでクライマックスシリーズ → 日本シリーズ
function postSeason(fin){
  const pw=id=>{ const T=PEN.teams[id]; return 1+(T.off||0)*0.8-(T.def||0)*0.6; };
  const series=(a,b,adv)=>{ let wa=0,wb=adv||0; while(wa<4&&wb<4){ if(rnd()<pw(a)/(pw(a)+pw(b))) wa++; else wb++; } return {w:wa>wb?a:b,s:`${wa}-${wb}`}; };
  const cs=lg=>{ const [t1,t2,t3]=fin[lg].slice(0,3).map(x=>x.id); const f1=series(t2,t3); const fin2=series(t1,f1.w,1); return {t1,t2,t3,first:f1,final:fin2,champ:fin2.w}; };
  const C=cs('セ'), P=cs('パ'); const js=series(C.champ,P.champ);
  return {cs:{'セ':C,'パ':P},js:{a:C.champ,b:P.champ,...js}};
}
/* ---- FA制度：7年目（取得後は4年ごと）の終わりに監督から聞かれる ---- */
const faEligible=()=>!!(PEN&&PEN.year-(PEN.faY||0)>=(PEN.faY?4:7));
function faOffers(rv){
  const y=rv.yR, base=Math.max(10000000,rv.newSal), round=v=>Math.max(10000000,Math.round(v/1000000)*1000000);
  // 元の球団：年俸は元の1.5倍が最低ライン。評価が見合わないと思われると残留要請がないこともある（評価42以下で0%〜60以上で100%）
  const list=[], ownP=clamp((y-42)/18,0,1);
  if(rnd()<ownP) list.push({team:PEN.team,salary:round(Math.max(PEN.salary*1.5,base*1.03)),years:ri(1,3),own:true});
  rv.ownNo=!list.length;
  const cands=[];
  for(const t of NPB){ if(t.id===PEN.team) continue; const T=PEN.teams[t.id];
    const need=isBat()?teamNeedB(T):isTW()?Math.max(teamNeedP(T),teamNeedB(T)):teamNeedP(T);
    const interest=(y-45)*1.5+need*0.8+rnd()*20; if(interest>=22) cands.push({team:t.id,interest,need}); }
  cands.sort((a,b)=>b.interest-a.interest).slice(0,3).forEach(c=>list.push({team:c.team,salary:round(base*(1.08+c.interest/150)),years:2+(y>=60?ri(1,2):ri(0,1)),need:c.need}));
  return list;
}
function faAnswer(use){ const rv=PEN.review; if(!rv) return; rv.faAns=use?'use':'no';
  if(use){ rv.offers=faOffers(rv);
    if(!rv.offers.length){ rv.faNone=true; rv.released=true; rv.newSal=0; rv.abil=null; rv.ct=false; PEN.contract=null; PEN.faY=PEN.year; } }   // どこからも声がかからない → その場でトライアウト行き
  renderPennant(); save(); window.scrollTo(0,0); }
function faSign(i){
  const rv=PEN.review, o=rv&&rv.offers&&rv.offers[i]; if(!o) return;
  const from=PEN.team;
  if(o.team!==from){ PEN.team=o.team; PEN.joinY=PEN.year+1; PEN.trades.push({y:PEN.year+1,from,to:o.team,fa:true}); awakeTransfer(from,o.team); try{ rebuildTeam(from); rebuildTeam(o.team); }catch(e){}
    if(isBat()) PEN.role='代打'; else if(PEN.role==='抑え') PEN.role='中継ぎ'; }
  PEN.contract={team:o.team,salary:o.salary,years:o.years,until:PEN.year+1+o.years};
  PEN.faY=PEN.year; rv.newSal=o.salary; rv.faDone=o; rv.ct=o.years>1;
  penNotice(o.team===from?`FA宣言のあと${TEAM[from].short}と${o.years}年契約（年俸${yen(o.salary)}）で残留`:`FAで${TEAM[from].short}から${TEAM[o.team].name}へ移籍！ ${o.years}年契約・年俸${yen(o.salary)}`);
  renderPennant(); save(); window.scrollTo(0,0);
}
function faHTML(rv){
  const m=myMgr(), T=TEAM[PEN.team];
  if(rv.faAns==null) return `<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">📝 FA権を取得</div>
    ${managerSay(`${PEN.pname}、${PEN.year}年目おつかれさん。お前はFA権を手にした。使うか？ 使えば他球団からの条件も聞ける。もちろんうちも引き止めるつもりだが、決めるのはお前だ。`)}
    <div class="row" style="margin-top:8px"><button class="btn main" data-fa="use" style="margin:0">FA権を使う</button><button class="btn" data-fa="no">使わない（${T.short}に残る）</button></div>
    <div class="hint">使わなくても権利は残り、来年また聞かれます。移籍しても使ったことになり、次のFA権は4年後です。</div></div>`;
  if(rv.faAns==='no') return `<div class="pcardx">FA権は使わず、${T.short}に残ることにした（来年また選べます）</div>`;
  if(rv.faNone) return `<div class="pcardx bad"><div class="sh2" style="margin-top:0">📞 FA交渉</div>FA宣言したが、${TEAM[PEN.team].short}からの残留要請も、他球団からの声もなかった……。<b>トライアウトを受けることに</b>なりました。</div>`;
  if(rv.faDone){ const o=rv.faDone; return `<div class="pcardx hi">${o.team===PEN.team&&o.own?`${T.short}と再契約`:`${TEAM[o.team].name}へ移籍`}：${o.years}年契約・年俸${yen(o.salary)}（契約中は年俸が固定で、戦力外もありません）</div>`; }
  const cards=rv.offers.map((o,i)=>{ const tm=TEAM[o.team], mg=mgrOf(o.team);
    return `<div class="pcardx ${o.own?'':'hi'}"><div class="row" style="align-items:center;gap:8px">${tchip(o.team,true)}<small>${o.own?'元の球団':`${LG_NAME[tm.lg]}${rankOf(o.team)}位`}</small></div>
      <div class="msay sm"><div class="mimg">${svgManager(tm,mg)}<div class="mlab">${mgrName(mg)}<br>${mgrBadges(mg)}</div></div><div class="bub r">${o.own?`${PEN.pname}、うちに残ってくれ。${o.years}年・${yen(o.salary)}で頼む。`:`${PEN.pname}、うちに来てくれ。${o.need>8?'お前の力がどうしても必要なんだ。':'お前が加われば戦力がぐっと上がる。'}${o.years}年契約、年俸${yen(o.salary)}でどうだ。`}</div></div>
      <div style="font-size:15px;margin:4px 0"><b>${o.years}年契約</b>　年俸 <b style="color:var(--accent)">${yen(o.salary)}</b>　<small>（総額 ${yen(o.salary*o.years)}）</small></div>
      <button class="btn ${o.own?'':'main'}" data-fasign="${i}" style="width:100%;margin:0">${o.own?`${tm.short}に残る`:`${tm.short}に入団する`}</button></div>`; }).join('');
  const nOther=rv.offers.filter(o=>!o.own).length;
  return `<div class="sh2">📞 FA交渉：${nOther?`${nOther}球団が獲得に名乗り`:'他球団からの声はなかった'}</div>${rv.ownNo?`<div class="pcardx bad">${TEAM[PEN.team].short}からの残留要請はなかった（元の年俸の1.5倍に見合わないと判断された）</div>`:''}${cards}`;
}
// 査定の上乗せ：ポジション（投手は投手陣）の中での順位、スタメン・先発の出場数、チームに必要かどうか
function salaryExtra(){
  const why=[]; let pct=0; const T=myT(), s=PEN.ss;
  if(isBat()){
    // ポジションの順位（同じ位置の選手＋自分を能力＋評価で並べる）
    const pos=PEN.slot&&PEN.slot!=='DH'?PEN.slot:myPositions()[0], mine=posValue(myFielder(pos),pos);
    const list=T.F.filter(f=>f.pos===pos).map(f=>posValue(f,pos)); const n=list.length+1, rank=1+list.filter(v=>v>mine).length;
    const rp = rank===1?0.03 : rank===2?0 : rank>=n?-0.08 : -0.03; pct+=rp; why.push(`${POS_JP[pos]}で${n}人中${rank}位（${rp>=0?'+':''}${Math.round(rp*100)}%${rank>=n?'・最下位':''}）`);
    const gs=s.gs||0, sp = gs>=100?0.03 : gs>=50?0.01 : gs>=20?0 : -0.03; pct+=sp; why.push(`スタメン${gs}試合（${sp>=0?'+':''}${Math.round(sp*100)}%）`);
    const need=teamNeedB(T), np = need>=8?0.03 : need>=0?0.01 : need>=-10?0 : -0.02; pct+=np; why.push(`チームの必要度${need>=8?'高':need>=0?'中':need>=-10?'低':'余り'}（${np>=0?'+':''}${Math.round(np*100)}%）`);
  }else{
    const st=staff(T), P=[...st.rot,...st.pen].map(pitScore), mine=evalR(); const n=P.length+1, rank=1+P.filter(v=>v>mine).length;
    const rp = rank<=2?0.03 : rank<=6?0.01 : rank>=n?-0.08 : rank>n*0.7?-0.03 : 0; pct+=rp; why.push(`投手陣${n}人中${rank}位（${rp>=0?'+':''}${Math.round(rp*100)}%${rank>=n?'・最下位':''}）`);
    const g=s.g||0, gs=s.gs||0, sp = (gs>=20||g>=45)?0.03 : (gs>=12||g>=30)?0.01 : (gs>=5||g>=12)?0 : -0.03; pct+=sp; why.push(`${gs?`先発${gs}試合`:`${g}登板`}（${sp>=0?'+':''}${Math.round(sp*100)}%）`);
    const need=teamNeedP(T), np = need>=8?0.03 : need>=0?0.01 : need>=-10?0 : -0.02; pct+=np; why.push(`チームの必要度${need>=8?'高':need>=0?'中':need>=-10?'低':'余り'}（${np>=0?'+':''}${Math.round(np*100)}%）`);
  }
  return {pct:Math.round(pct*1000)/1000,why};
}
function yearReview(){
  if(PEN.favTry){ penNotice(`シーズンが終わったので${PEN.favTry.t}の試し投げは終わり`); favTryEnd(false); }
  const rt=isBat()?ratingB:rating, sp=stagPenalty(), yR0=rt(PEN.ss), yR=yR0==null?null:yR0-sp, cR0=rt(PEN.career), cR=cR0==null?null:cR0-sp, y=yR==null?35:yR, vol=PEN.ss.outs;
  const B=isBat(), W=isTW(), titles=B?titleRaceB():W?titleRace().concat(titleRaceB(PEN.bss)):titleRace(), nT=titles.filter(t=>t.won).length;
  let chg=B?salaryChgB(y):(y-52)/45 + PEN.ss.w*0.01 - PEN.ss.l*0.005 + PEN.ss.sv*0.006 + PEN.ss.hld*0.003;
  if(B?PEN.ss.pa<60:vol<45) chg=Math.min(chg,0)-0.15;   // ほとんど出ていなければ減額
  if(W&&PEN.bss&&PEN.bss.pa){ const b=PEN.bss; chg+=clamp((bObp(b)+bSlg(b)-0.650)*0.5,-0.1,0.15)*Math.min(1,b.pa/60)+b.hr*0.01; }   // 二刀流：打撃も少し評価
  const ex=salaryExtra(); chg+=ex.pct;   // ポジションの順位・スタメン（先発）出場数・チームに必要か
  chg=clamp(chg+nT*TITLE_BONUS,-0.5,0.5);   // タイトルを取ると少し上がる
  let released = !nT && PEN.year>=2 && y<38 && (cR==null?y:cR)<42;   // 2年目以降、今年も通算も悪すぎると戦力外
  let newSal = released?0:Math.max(1000000,Math.round(PEN.salary*(1+chg)/100000)*100000);
  const ct=PEN.contract&&PEN.contract.until>PEN.year+1?PEN.contract:null;   // 複数年契約の途中：年俸は固定・戦力外なし
  if(ct){ released=false; newSal=ct.salary; chg=0; }
  const fin={'セ':standings('セ').map(x=>({id:x.id,w:x.w,l:x.l,t:x.t})),'パ':standings('パ').map(x=>({id:x.id,w:x.w,l:x.l,t:x.t}))};
  const ab=released?null:(B?abilityChangeB():abilityChange()); if(ab&&W) ab.bat=abilityChangeB(PEN.bss,40);
  var salaryEx=ex;
  if(ab) agingAmplify(ab);   // 33歳を超えると衰えが年々大きくなる
  return {stage:'ps',yR:y,cR,chg,nT,titles,fin,released,newSal,abil:ab,ct:!!ct,fa:!released&&faEligible(),ps:psInit(fin),ex:salaryEx};
}
/* ---- 年俸査定のあとの能力変化（成績しだい。33歳を超えると下がりやすい） ---- */
function abilityChange(){
  const ss=PEN.ss, old=PEN.age>33, starter=ss.gs>=Math.max(1,ss.g/2), bt=ss.byType||{}, ip=ss.outs/3;
  const tot=Object.values(bt).reduce((t,e)=>t+e.n,0)||ss.pitches||0, st=bt['ストレート']||{n:0,k:0};
  const out={velo:0,control:0,stamina:0,brk:{},why:{}};
  // 球速：先発はストレートが全投球の50%以上かつ1000球以上、中継ぎは400球以上投げた年だけ。ストレートの奪三振率で判断
  const enough = starter ? (st.n>=1000 && tot>0 && st.n/tot>=0.5) : st.n>=400;
  if(enough&&ip>0){
    const sk9=st.k*9/ip; let v = sk9>=7?2 : sk9>=5?1 : sk9>=3.5?0 : -1;
    if(old) v-=1; out.velo=clamp(v,old?-2:-1,old?1:2);
    out.why.velo=`ストレートの奪三振率 ${sk9.toFixed(2)}（ストレート${st.n}球）`;
  }else{ out.velo=old?-1:0; out.why.velo=`ストレートの投球数が基準に届かず（${st.n}球${starter&&tot?`・割合${Math.round(st.n/tot*100)}%`:''}）`; }
  // コントロール：与四球率（平均2.5）
  if(ip>=10){
    const bb9=ss.bb*9/ip; let c = bb9<=1.0?3 : bb9<=1.8?2 : bb9<=2.5?1 : bb9<=3.5?0 : -1;
    if(old) c-=2; out.control=clamp(c,old?-3:-1,old?1:3); out.why.control=`与四球率 ${bb9.toFixed(2)}`;
  }else{ out.control=old?-1:0; out.why.control='投球回が少なく判断できず'; }
  // スタミナ：先発は1登板あたりの投球回（8回以上が目安）、中継ぎは登板数（50登板が目安）
  let s;
  if(starter){ const ipg=ss.gs?ss.outs/3/ss.gs:0; s= ipg>=8.5?3 : ipg>=8?2 : ipg>=7?1 : ipg>=6?0 : ipg>=5?-1 : -2; out.why.stamina=`1登板あたり ${ipg.toFixed(1)}回`; }
  else { s= ss.g>=60?3 : ss.g>=50?2 : ss.g>=40?1 : ss.g>=30?0 : ss.g>=20?-1 : -2; out.why.stamina=`${ss.g}登板`; }
  if(old) s-=2; out.stamina=clamp(s,old?-4:-2,old?1:3);
  // 変化球：成績で球種ごとに1段階ダウン〜1段階アップ
  const rep=(PEN.rep||[]).filter(t=>!(PEN.favTry&&PEN.favTry.t===t));
  rep.slice(1).forEach(t=>{
    const e=bt[t]||{n:0,k:0,wh:0,h:0}, need=starter?150:60; let d;
    if(e.n<need) d=0; else { const sc=(e.k+e.wh*0.25-e.h*0.7)/(e.n/20); d= sc>=1.2?1 : sc<=0.2?-1 : 0; }
    out.brk[t]=d;
  });
  // 衰え：30代は全球種（ストレート含む）から1つが Lv0〜1 ダウン、40代は 1〜3 ダウン
  const age=PEN.age||22;
  if(age>=30){ const t=pick(rep), d=age>=40?ri(1,3):ri(0,1);
    if(d){ out.brk[t]=(out.brk[t]||0)-d; out.aging={t,d}; } }
  // 最低限：ストレートは Lv.1、変化球は少なくとも1つ Lv.1 で残る。Lv.1 を切った変化球は投げられなくなる
  const nl=t=>lvOf(t)+(out.brk[t]||0);
  if('ストレート' in out.brk) out.brk['ストレート']=Math.max(out.brk['ストレート'],1-lvOf('ストレート'));
  const brks=rep.slice(1);
  if(brks.length&&brks.every(t=>nl(t)<=0)){ const keep=brks.slice().sort((a,b)=>lvOf(b)-lvOf(a))[0]; out.brk[keep]=1-lvOf(keep); }
  for(const t in out.brk) out.brk[t]=clamp(out.brk[t],-lvOf(t),LV_MAX-lvOf(t));
  return out;
}
function applyAbilityChange(ch){
  if(!ch) return;
  const a=PEN.abil;
  a.velo=r1(clamp(a.velo+ch.velo,110,165)); a.control=r1(clamp(a.control+ch.control,0,100)); a.stamina=r1(clamp(a.stamina+ch.stamina,0,100));
  for(const t in ch.brk){
    if(!PEN.rep.includes(t)) continue;
    const nx=clamp(lvOf(t)+ch.brk[t],0,LV_MAX);
    if(t==='ストレート'){ PEN.plev[t]=Math.max(1,nx); continue; }
    if(nx===0){ PEN.rep=PEN.rep.filter(x=>x!==t); delete PEN.plev[t]; penNotice(`${t}が投げられなくなった`); }
    else PEN.plev[t]=nx;
  }
}
function penNextSeason(){
  const rv=PEN.review;
  const won=(rv.titles||[]).filter(t=>t.won).map(t=>t.name);
  stagUpdate(rv.yR==null?null:rv.yR+stagPenalty());   // 来年に向けて伸び悩みを数える（ペナルティ前の素の評価で）
  PEN.seasons.push({year:PEN.year,age:PEN.age,role:PEN.role,team:PEN.team,pos:PEN.pos,ss:PEN.ss,bss:isTW()?PEN.bss:undefined,rec:{...myRec()},rank:rankOf(PEN.team),salary:PEN.salary,newSal:rv.newSal,chg:rv.chg,titles:won,feats:seasonFeats(),
    abil:{...PEN.abil},babil:PEN.babil?{...PEN.babil}:null,rep:PEN.rep.slice(),plev:{...PEN.plev},bposs:PEN.bposs?PEN.bposs.slice():null,hand:PEN.hand,bhand:PEN.bhand});   // その年の能力も残す（歴代選手・マイチーム用）
  won.forEach(n=>PEN.titles.push({y:PEN.year,name:n}));
  awakeSeason();   // シーズンの節目の覚醒（打率.300・10本塁打・防御率3.00／ミスター○○）
  if(rv.released){ PEN.released=true; PEN.review=null; PEN.relFin=rv.fin||null; renderPennant(); save(); return; }
  if(isBat()) applyAbilityChangeB(rv.abil); else { applyAbilityChange(rv.abil); if(isTW()&&rv.abil&&rv.abil.bat) applyAbilityChangeB(rv.abil.bat); }
  PEN.salary=rv.newSal;
  seasonRollover(rv.fin);
}
// 年をまたぐ（年齢・年数・成績のリセット・選手の成長とドラフト・監督交代・日程）。トライアウトからの復帰でも使う
function seasonRollover(fin){
  const prevB = isBat()?PEN.ss : isTW()?PEN.bss : null;   // 去年の打撃成績（タイプの判定用）
  PEN.age=(PEN.age||22)+1;
  const lastCS=PEN.cs||null;   // 去年のCPU選手の成績（成長に使う）
  PEN.year++; PEN.day=0; PEN.ss=isBat()?batStat():penStat(); PEN.days=[]; PEN.review=null; PEN.cs={};
  if(typeof injuryRollover==='function') injuryRollover();
  if(typeof oddPlan==='function') oddPlan();   // 今年の変則出場（野手登板・代打投手）の予定
  if(isTW()) PEN.bss=batStat();
  if(isBat()) PEN.order=orderFor(PEN.role);
  const rv={fin};
  // 選手の成長・衰え・引退とドラフト（4＋順位 の人数）
  const dr=rosterNewSeason(rv.fin,lastCS);
  // 打者タイプ：去年の成績でキャンプ前に決まる。そのあと全球団の野手にも付け直す（アスリートは自分を含めて4人まで）
  if(prevB){ const bt=btypeUpdate(prevB); if(bt){ penNotice(bt.t===bt.was ? `今年のタイプは引き続き「${bt.t}」（${BTYPE_INFO[bt.t].me}）` : `タイプが「${bt.was}」→「${bt.t}」に！ ${BTYPE_INFO[bt.t].me}${bt.cands.length>1?`（候補：${bt.cands.join('・')}）`:''}`); } }
  assignTypesAll();
  // 監督交代（5・6位で、活躍した20代が5人以下）
  const mc=mgrChangeCheck(rv.fin); PEN.favMod=null;
  mc.forEach(x=>{ if(x.id===PEN.team) penNotice(`${LG_NAME[TEAM[x.id].lg]}${x.rank}位に沈み、活躍した20代も${x.y20}人。${mgrName(x.old)}が退任し、新監督は${mgrName(x.nw)}（采配レベル${x.nw.lv.toFixed(1)}）`); });
  PEN.mgrNews=mc.filter(x=>x.id!==PEN.team).map(x=>`${TEAM[x.id].short}：${mgrName(x.old)}→${mgrName(x.nw)}`);
  NPB.forEach(t=>{ PEN.teams[t.id].rec={w:0,l:0,t:0}; });
  rebuildAll(); if(isBat()) penCompete(true); if(isTW()) twCompete(true);
  const md=dr[PEN.team];
  PEN.draftNews={y:PEN.year-1,np:md.np,nf:md.nf,got:md.got,all:Object.fromEntries(NPB.map(t=>[t.id,dr[t.id].np+dr[t.id].nf]))};
  PEN.sched=makeSched();
  PEN.nextStart=ri(0,3);
  penNotice(`${PEN.year}年目のシーズン開幕！ ${TEAM[PEN.team].short}の${roleName(PEN.role)}・年俸${yen(PEN.salary)}`);
  renderPennant(); save();
}


/* ---- 春季キャンプ：開幕前に持ち点で能力を上げる（野手0.5・投手と二刀流0.7 ＋ 覚醒でためた持ち点）／変化球を覚える・守備位置を増やす（持ち点全部） ---- */

const campBase=()=>isBat()?2.0:2.8;   // 野手2.0・投手と二刀流2.8
const campPts=()=>r1(campBase()+mgrCampBonus(myMgr())+((PEN&&PEN.awake&&PEN.awake.bank)||0)+((PEN&&PEN.carry)||0));   // 使い残した点数は翌年に繰り越し
const COST_K=1;
// 球団の特色：育ちやすい能力は必要点数が安い
const TRAIT_JP={T:'パワーが育ちやすい（必要点数20%カット）',G:'オールラウンドに育ちやすい（全能力5%カット）',DB:'ミートが育ちやすい（20%カット）',C:'速度が育ちやすい（20%カット）',S:'コントロールが育ちやすい（20%カット）',D:'守備が育ちやすい（20%カット）',
  H:'パワーが育ちやすい（10%カット）。初めて入団してから2年間は全能力30%カット（出戻りには付かない）',L:'球速が育ちやすい（20%カット）',F:'ミートとパワーが少しずつ育ちやすい（各10%カット）',B:'投手がオールラウンドに育ちやすい（投手能力10%カット）',M:'覚醒の確率が5%アップ',E:'新人が20歳まで育ちやすい（20歳まで全能力10%カット）'};
function teamMult(k){
  if(!PEN) return 1; const t=PEN.team, isP=['velo','control','stamina','lv'].includes(k); let m=1;
  switch(t){
    case 'T': if(k==='power') m*=0.8; break;
    case 'G': m*=0.95; break;
    case 'DB': if(k==='meet') m*=0.8; break;
    case 'C': if(k==='speed') m*=0.8; break;
    case 'S': if(k==='control') m*=0.8; break;
    case 'D': if(k==='def') m*=0.8; break;
    case 'H': if(k==='power') m*=0.9; if(PEN.hFirstY==null) PEN.hFirstY=PEN.joinY||1; /* 初めてソフトバンクに入った年（ドラフト・トレード・FA・トライアウトどれでも）を記録 */ if(PEN.year<=PEN.hFirstY+1) m*=0.7; break;   // 初入団から2年間
    case 'L': if(k==='velo') m*=0.8; break;
    case 'F': if(k==='meet'||k==='power') m*=0.9; break;
    case 'B': if(isP) m*=0.9; break;
    case 'E': if((PEN.age||18)<=20) m*=0.9; break;
  }
  return m;
}
const unitCost=k=>(k==='velo'?5:k==='power'?3:k==='meet'?2:1)*COST_K*teamMult(k);   // 能力1あたり：0.1上げるごとに0.1pt、ミートは0.2pt、パワーは0.3pt、球速は0.1km/hごとに0.5pt
// キャンプでLvを1つ上げるポイント：変化球は Lv.1→2 が1点で、1つ上がるごとに0.5点ずつ増える（6→7は3.5点）。スライダー→スイーパーは1点。ストレートは今までどおり
const lvStepCost=(n,t)=>t==='ストレート'?LV_UP_COST(n) : n>=LV_MAX ? 1 : r1(1+0.5*(n-1));
const lvCost=(n,t)=>lvStepCost(n,t)*COST_K*teamMult('lv');
const lvMaxOf=t=>LV_MAX+(t==='スライダー'&&!PEN.rep.includes('スイーパー')?1:0);   // スライダーはLv.7からもう1段上げるとスイーパーになる
const fmtPt=v=>(+v).toFixed(2).replace(/\.?0+$/,'');
const PDIR={'高速スライダー':'glove','スライダー':'glove','スロースライダー':'glove','スイーパー':'glove','カットボール':'glove','ツーシーム':'arm','シュート':'arm','高速シュート':'arm','シンカー':'arm','高速シンカー':'arm','カーブ':'curve','ドロップカーブ':'curve','スローカーブ':'curve','パワーカーブ':'curve','チェンジアップ':'drop','フォーク':'drop','SFF':'drop'};
const DIR_NAME={glove:'横（スライダー方向）',arm:'シュート方向（腕側）',curve:'カーブ方向（斜めに落ちる）',down:'縦に落ちる',fast:'ストレート系（変化球が少なかったため）'};
const DIR_TYPES=d=>d==='fast'?['ツーシーム','カットボール']:Object.keys(PDIR).filter(t=>PDIR[t]===d);
const needCamp=()=>!!(PEN&&!PEN.released&&!PEN.pending&&PEN.day===0&&!PEN.review&&PEN.campY!==PEN.year);
const B_ABK={meet:'ミート',power:'パワー',speed:'速度',eye:'選球眼・技術',def:'守備'};
const P_ABK=['velo','control','stamina'], BAT4=['meet','power','speed','eye'];
const AB_LABEL={velo:'球速',control:'コントロール',stamina:'スタミナ',...B_ABK};
function campNew(){
  const add = isBat() ? {meet:0,power:0,speed:0,eye:0,def:0} : isTW() ? {velo:0,control:0,stamina:0,meet:0,power:0,speed:0,eye:0} : {velo:0,control:0,stamina:0};
  return {y:PEN.year,add,lv:{},learn:null};
}
// コンバートの割引：左投げは外野・一塁、右投げは二塁・遊撃・三塁・捕手が0.2ポイント安い
const posDisc=pos=>((PEN.hand==='L'&&(pos==='OF'||pos==='1B'))||(PEN.hand!=='L'&&['2B','SS','3B','C'].includes(pos)))?0.2:0;
const learnDisc=c=>c&&c.learn&&c.learn.kind==='pos'?posDisc(c.learn.pos):0;
// 変化球を覚えるポイント（系統ごと）
const LEARN_COST={fast:1.0,slider:1.1,shoot:1.1,curve:1.3,sinker:1.5,fork:1.5};
const LEARN_COST_T={'SFF':1.2,'スローカーブ':1.0,'スロースライダー':0.9,'高速シュート':0.9};   // 系統の中で強さが劣る球は安く
// 持っている変化球1つにつき+0.2（入れ替えのときは外す球を数えない）
const learnN=swap=>Math.max(0,ownBrk().length-(swap?1:0));
const learnCost=(t,swap)=>r1(((LEARN_COST_T[t]??LEARN_COST[PFAM[t]]??1.2)+0.2*learnN(swap))*COST_K*teamMult('lv'));
const isPLearn=c=>!!(c&&c.learn&&c.learn.kind!=='pos');                 // 変化球を覚える（決まったポイント）
const fullLearn=c=>!!(c&&c.learn&&c.learn.kind==='pos'&&!learnDisc(c));  // 守備位置を覚える（持ち点全部）
function campCost(c){
  const bc=(c.bconv?0.1:0)+(c.stretch?stretchCost():0);   // 打席のコンバートは0.1ポイント（ミートが5下がる）、ストレッチは持ち点の1/3
  if(fullLearn(c)) return r1(campPts()+bc);   // 守備位置を覚えるときは持ち点全部
  let p=bc; if(isPLearn(c)) p+=learnCost(c.learn.t,!!c.learn.base); else if(c.learn) p+=campPts()-learnDisc(c);   // 変化球は系統ごとのポイント／守備位置の割引ぶんは能力に使える
  for(const k in c.add) p+=unitCost(k)*c.add[k];     // 能力0.1上げるごとに0.1pt（球速は0.5pt）。球団の特色で安くなる
  for(const t in c.lv){ const b=lvOf(t); for(let i=0;i<c.lv[t];i++) p+=lvCost(b+i,t); }
  return r1(p);
}
// 去年いちばん投げた変化の方向（ストレート以外）
function campDir(){
  const last=PEN.seasons[PEN.seasons.length-1]; if(!last) return null;
  const bt=(last.ss&&last.ss.byType)||{}, cnt={};
  for(const t in bt){ const d=PDIR[t]; if(d) cnt[d]=(cnt[d]||0)+(bt[t].n||0); }
  const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  if(!best||best[1]<30) return {dir:'fast',n:Math.round((bt['ストレート']||{n:0}).n),bt};
  return {dir:best[0],n:Math.round(best[1]),bt};
}
// 変化球を覚える：全球種から1つ（1キャンプに1球種まで）。変化球は5つまで、5つあるときは入れ替えだけ
const ownBrk=()=>PEN.rep.slice(1).filter(t=>!(PEN.favTry&&PEN.favTry.t===t));   // 監督に試し投げを頼まれている球種は数えない
function campLearnOpts(){
  if(isBat()||PEN.year<2) return null;   // 変化球を増やせるのは2年目のキャンプから
  const own=ownBrk();
  const cands=LEARN_TYPES.filter(t=>!own.includes(t)&&!(t==='スライダー'&&own.includes('スイーパー')));
  return {cands,own,canAdd:own.length<MAX_BRK};
}
// 1段階（0.1 または Lv.1）動かす。できたら true
function campStep1(k,d){
  const c=PEN.camp; if(!c||fullLearn(c)) return false;
  if(isPLearn(c)&&k==='lv:'+c.learn.base) return false;   // 入れ替えで外す球種は上げられない
  if(k.startsWith('lv:')){
    const t=k.slice(3), nv=(c.lv[t]||0)+d; if(nv<0||lvOf(t)+nv>lvMaxOf(t)) return false;
    if(campCost({...c,lv:{...c.lv,[t]:nv}})>campPts()+1e-6) return false;
    if(nv) c.lv[t]=nv; else delete c.lv[t];
  }else{
    const base=P_ABK.includes(k)?PEN.abil:PEN.babil, cap=k==='velo'?165:100, nv=r1((c.add[k]||0)+d*0.1);   // 0.1刻み
    if(nv<-1e-6||(base[k]??50)+nv>cap+1e-6) return false;
    if(campCost({...c,add:{...c.add,[k]:nv}})>campPts()+1e-6) return false;
    c.add[k]=nv;
  }
  return true;
}
// d：-1／1＝0.1刻み、5＝能力+0.5、'all'＝この能力に振ったぶんを戻す
function campStep(k,d){
  if(d==='all'){ const c=PEN.camp; if(c){ if(k.startsWith('lv:')) delete c.lv[k.slice(3)]; else c.add[k]=0; } }
  else { const steps=Math.abs(+d), sg=+d<0?-1:1; for(let i=0;i<steps;i++){ if(!campStep1(k,sg)) break; } }
  renderPennant(); save();
}
// バーで直接：目標の値まで0.1ずつ動かす（持ち点が足りないところで止まる）
function campSetAdd(k,target){
  const c=PEN.camp; if(!c) return; const cur=c.add[k]||0; let n=0;
  if(target<cur){ c.add[k]=r1(Math.max(0,target)); }
  else while(n++<2000&&(c.add[k]||0)<target-1e-6){ if(!campStep1(k,1)) break; }
  renderPennant(); save();
}
// バーの右端は能力の上限まで（持ち点に応じて変えない：ほかのバーの位置が動かないように。足りない分は動かしたときに止まる）
function campMaxAdd(k){
  const base=P_ABK.includes(k)?PEN.abil:PEN.babil, cap=k==='velo'?165:100;
  return r1(Math.max(0,cap-(base[k]??50)));
}
function campReset(c){ for(const k in c.add) c.add[k]=0; c.lv={}; }
// 打席のコンバート（右⇄左⇄両）：0.1ポイント、ミートが5下がる
const stretchCost=()=>r1(campPts()/3);
function campStretch(){ const c=PEN.camp; if(!c) return; c.stretch=!c.stretch; if(campCost(c)>campPts()+1e-6){ campReset(c); if(campCost(c)>campPts()+1e-6) c.stretch=false; } renderPennant(); save(); }
function campBconv(h){ const c=PEN.camp; if(!c) return; c.bconv = c.bconv===h ? null : h; if(campCost(c)>campPts()+1e-6){ campReset(c); if(campCost(c)>campPts()+1e-6) c.bconv=null; } renderPennant(); save(); }
function campLearn(t,mode,base){
  const c=PEN.camp; if(!c) return;
  if(mode==='pick'){ c.pick=c.pick===t?null:t; if(c.learn&&c.learn.t!==t) c.learn=null; renderPennant(); save(); return; }   // 5つあるとき：まず覚える球種を選び、次に入れ替える球種を選ぶ
  const nx = c.learn&&c.learn.t===t&&c.learn.mode===mode&&(c.learn.base||null)===(base||null) ? null : {t,mode,base:base||null};
  if(nx){ const c2={...c,learn:nx,lv:{...c.lv}}; if(nx.base) delete c2.lv[nx.base];
    if(campCost(c2)>campPts()+1e-6){ penNotice(`${t}を覚えるには${learnCost(t,!!nx.base)}ポイント必要です（ほかに振ったポイントを減らしてください）`); renderPennant(); return; }
    if(nx.base) delete c.lv[nx.base]; }
  c.learn=nx;
  renderPennant(); save();
}
// 野手：守れる位置を増やす／変える（持ち点5ポイント全部）
function campPos(pos,mode,from){
  const c=PEN.camp; if(!c) return;
  const same=c.learn&&c.learn.kind==='pos'&&c.learn.pos===pos&&c.learn.mode===mode&&c.learn.from===from;
  c.learn = same ? null : {kind:'pos',pos,mode,from};
  if(c.learn) campReset(c);
  renderPennant(); save();
}
function campFinish(){
  const c=PEN.camp&&PEN.camp.y===PEN.year?PEN.camp:campNew(), a=PEN.abil, got=[];
  if(c.stretch){ PEN.injRed=r3((PEN.injRed||0)+0.025); got.push(`ストレッチでケガ率が${injRate()}%に`); }
  if(c.learn&&c.learn.kind==='pos'){
    const L=c.learn, have=myPositions().slice();
    if(L.mode==='add'&&have.length<2&&!have.includes(L.pos)){ have.push(L.pos); got.push(`${POS_JP[L.pos]}も守れるようになった`); }
    else if(L.mode==='swap'&&have.includes(L.from)){ have[have.indexOf(L.from)]=L.pos; got.push(`${POS_JP[L.from]}から${POS_JP[L.pos]}にコンバート`); }
    PEN.bposs=have; PEN.bpos=have[0];
  }else if(c.learn){
    const o=campLearnOpts(), t=c.learn.t, b=c.learn.base;
    if(o&&o.cands.includes(t)){
      if(c.learn.mode==='swap'&&b&&o.own.includes(b)){ PEN.rep=PEN.rep.map(x=>x===b?t:x); delete PEN.plev[b]; got.push(`${b}を${t}に変えた`); }
      else if(o.canAdd){ PEN.rep.push(t); got.push(`${t}を覚えた`); }
      PEN.rep=PTYPES.filter(x=>PEN.rep.includes(x)); PEN.plev[t]=1;   // 新しく覚えた変化球は Lv.1
    }
  }
  if(c.bconv&&hasBat()){ const was=PEN.bhand; PEN.bhand=c.bconv; PEN.babil.meet=r1(clamp((PEN.babil.meet??50)-5,0,100)); got.push(`${bhandJP(was)}→${bhandJP(c.bconv)}にコンバート（ミート−5）`); }
  const leftPts=r1(Math.max(0,campPts()-campCost(c)));   // 使い残し（来年に繰り越し）
  if(!fullLearn(c)){   // 能力アップ（コンバートの割引ぶん・変化球を覚えた残りも）
    for(const k in c.add) if(c.add[k]){
      if(P_ABK.includes(k)) a[k]=r1(a[k]+c.add[k]); else PEN.babil[k]=r1((PEN.babil[k]??50)+c.add[k]);
      got.push(`${AB_LABEL[k]}+${c.add[k]}`); }
    for(const t in c.lv){ if(!PEN.rep.includes(t)||!c.lv[t]) continue; const nl=lvOf(t)+c.lv[t];
      if(t==='スライダー'&&nl>LV_MAX&&PEN.rep.includes(t)){ PEN.rep=PEN.rep.map(x=>x===t?'スイーパー':x); delete PEN.plev[t]; PEN.plev['スイーパー']=1; got.push('スライダーがスイーパーに進化（Lv.1から）'); continue; }   // スライダーLv.7からさらに上げるとスイーパー
      PEN.plev[t]=Math.min(LV_MAX,nl); got.push(`${t} Lv.${PEN.plev[t]}`); }
  }
  if(isBat()) penCompete(true);
  if(PEN.awake) PEN.awake.bank=0;   // 覚醒・タイトルでためた持ち点はこのキャンプの持ち点に入れた
  PEN.carry=fullLearn(c)?0:leftPts; if(PEN.carry) got.push(`${PEN.carry}ポイントを来年に繰り越し`);
  PEN.campY=PEN.year; PEN.camp=null;
  if(typeof wbcYear==='function'&&wbcYear(PEN.year)&&!(PEN.wbc&&PEN.wbc.y===PEN.year)) wbcInit();   // 4年ごとのWBC（開幕前）
  penNotice(`春季キャンプ終了：${got.length?got.join('・'):'ポイントを使わなかった'}`);
  renderPennant(); save(); window.scrollTo(0,0);
}
function renderCamp(el){
  const P=PEN; if(!P.camp||P.camp.y!==P.year) P.camp=campNew();
  if(!P.camp.learn&&campCost(P.camp)>campPts()+1e-6) campReset(P.camp);   // 以前のポイント制で振った途中データは振り直し
  const c=P.camp, CP=campPts(), left=r1(CP-campCost(c)), a=P.abil, L=fullLearn(c), bank=(P.awake&&P.awake.bank)||0;
  // 1行：能力名（必要点数）｜数値｜−ALL｜−0.1｜+0.1｜+0.5（能力が0.5上がる分）、2行目：バー（振れる範囲まで）
  const row=(k,name,cur,add,unit,cost,full)=>{ const can=!(L||full||cost>left+1e-6), isLv=k.startsWith('lv:'), cap=k==='velo'?165:100; /* バーは「いまの能力〜上限」の目盛り（ほかの行を動かしても位置が変わらない） */ return `<div class="crow"><span class="cn">${name}<small>${full?'MAX':fmtPt(cost)+'pt'}${!full&&teamMult(isLv?'lv':k)<1?'・特色':''}</small></span>
    <span class="cv">${add?`${cur}→<b>${typeof cur==='number'?r1(cur+add):(lvOf(k.slice(3))+add>LV_MAX?'スイーパー':'Lv.'+(lvOf(k.slice(3))+add))}</b>`:cur}<small>${unit}</small></span>
    <button class="cbtn sm" data-ck="${k}" data-d="all" ${!add||L?'disabled':''}>−ALL</button><button class="cbtn" data-ck="${k}" data-d="-1" ${!add||L?'disabled':''}>−</button><button class="cbtn" data-ck="${k}" data-d="1" ${can?'':'disabled'}>＋</button>${isLv?'<span></span>':`<button class="cbtn sm" data-ck="${k}" data-d="5" ${can?'':'disabled'}>+.5</button>`}
    ${isLv?'':(()=>{ const mn=k==='velo'?110:0, pb=((cur-mn)/(cap-mn)*100).toFixed(1), pc=((cur+(add||0)-mn)/(cap-mn)*100).toFixed(1); return `<input type="range" class="cbar" data-cb="${k}" data-base="${cur}" min="${mn}" max="${cap}" step="0.1" value="${r1(cur+(add||0))}" style="background:linear-gradient(90deg,#8d9a90 0 ${pb}%,#f5c542 ${pb}% ${pc}%,#243329 ${pc}% 100%)" ${L?'disabled':''}>`; })()}</div>`; };   // バー＝能力の棒グラフ（0〜100、球速は110〜165）。元の能力より下には戻せない
  const brk=P.rep.map(t=>{ const add=c.lv[t]||0, nl=lvOf(t)+add; return row('lv:'+t,t==='ストレート'?ptn(t,'ストレート（伸び）'):t==='スライダー'&&lvOf(t)>=LV_MAX?ptn(t,'スライダー（＋1点でスイーパーに進化）'):ptn(t),'Lv.'+lvOf(t),add,'',lvCost(nl,t),nl>=lvMaxOf(t)); }).join('');
  const o=campLearnOpts();
  let learn;
  if(!o) learn=`<div class="hint">新しい変化球は2年目のキャンプから覚えられます。</div>`;
  else{
    const on=t=>c.learn&&c.learn.t===t||c.pick===t;
    const chip=t=>`<button class="btn ${on(t)?'on':''}" style="margin:3px 4px 3px 0;padding:6px 10px;width:auto" data-lt="${t}" data-lm="${o.canAdd?'add':'pick'}">${t}<small style="opacity:.75"> ${learnCost(t,!o.canAdd)}</small></button>`;
    const sel=c.learn?c.learn.t:c.pick;
    learn=`<div class="hint" style="margin-bottom:6px">持っている変化球：${o.own.map(t=>`${ptn(t)} Lv.${lvOf(t)}`).join('・')||'なし'}（${o.own.length}／${MAX_BRK}）</div>`+
      (o.cands.length?Object.keys(PFAM_JP).map(f=>{ const ts=o.cands.filter(t=>PFAM[t]===f); return ts.length?`<div style="margin:2px 0"><small style="color:var(--mute);display:block;margin:4px 0 0">${PFAM_JP[f]}</small>${ts.map(chip).join('')}</div>`:''; }).join(''):`<div class="hint">覚えられる球種はもうありません。</div>`)+
      (sel?`<div class="lrn" style="margin-top:6px"><b>${sel}</b> <small>${PDESC[sel]||''}</small>${o.canAdd?`<div class="hint">${c.learn?'このキャンプで覚えます（もう一度押すと取り消し）':''}</div>`:
        `<div class="hint" style="margin-top:4px">変化球は${MAX_BRK}つまでなので、入れ替える球種を選んでください</div><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${o.own.map(b=>`<button class="btn ${c.learn&&c.learn.t===sel&&c.learn.base===b?'on':''}" style="flex:0 0 auto;margin:0;padding:6px 10px;white-space:nowrap;width:auto" data-lt="${sel}" data-lm="swap" data-lb="${b}">${b}と入れ替え</button>`).join('')}</div>`}</div>`:'')+
      `<div class="hint">1キャンプで覚えられるのは1球種まで（ストレート系1.0・スライダー系1.1・シュート系1.1・カーブ系1.3・シンカー系1.5・フォーク系1.5ポイント。SFF1.2・スローカーブ1.0・スロースライダー0.9・高速シュート0.9。持っている変化球1つにつき+0.2、入れ替えは外す球を数えない）。新しく覚えた変化球は Lv.1 から。入れ替えると元の変化球は投げられなくなります。</div>`;
  }
  const B=isBat(), W=isTW(), ba=P.babil, LP=c.learn&&c.learn.kind==='pos';
  const bRow=k=>row(k,B_ABK[k],ba[k]??50,c.add[k]||0,'',unitCost(k)*0.1,(ba[k]??50)+(c.add[k]||0)>=100-1e-6);
  const pRows=`${row('velo','球速',a.velo,c.add.velo,'km/h',unitCost('velo')*0.1,a.velo+c.add.velo>=165-1e-6)}
      ${row('control','コントロール',a.control,c.add.control,'',unitCost('control')*0.1,a.control+c.add.control>=100-1e-6)}
      ${row('stamina','スタミナ',a.stamina,c.add.stamina,'',unitCost('stamina')*0.1,a.stamina+c.add.stamina>=100-1e-6)}
      ${brk||'<div class="hint">変化球はまだありません</div>'}`;
  const trait=`<div class="hint" style="color:#f3dfa0">🏟 ${TEAM[P.team].short}の特色：${TRAIT_JP[P.team]}</div>`;
  const abRows = B ? Object.keys(B_ABK).map(bRow).join('')+`<div class="hint">0.1上げるごとに0.1pt（ミートは0.2pt・パワーは0.3pt、最大100）。「特色」のついた能力は球団の特色で安くなっています</div>`+trait
    : W ? pRows+`<div class="hint" style="margin-top:8px;color:var(--ink)">⚾ 打撃</div>`+BAT4.map(bRow).join('')+
      `<div class="hint">球速0.1km/h＝0.5pt・ほかの能力は0.1で0.1pt・変化球のLvアップ＝Lv.1→2は1pt、1つ上がるごとに+0.5pt（6→7は3.5pt）・スライダーLv.7→スイーパー（Lv.1から）は1pt・ストレートのLvアップ＝Lv.1→2は1pt、2→3は3pt、それ以降は「次のLv」pt（最大Lv.${LV_MAX}）</div>`+trait
    : pRows+`<div class="hint">球速0.1km/h＝0.5pt・コントロール0.1＝0.1pt・スタミナ0.1＝0.1pt・変化球のLvアップ＝Lv.1→2は1pt、1つ上がるごとに+0.5pt（6→7は3.5pt）・スライダーLv.7→スイーパー（Lv.1から）は1pt・ストレートのLvアップ＝Lv.1→2は1pt、2→3は3pt、それ以降は「次のLv」pt（最大Lv.${LV_MAX}）</div>`+trait;
  // 野手：守れる位置を増やす・変える
  let posSec='';
  if(B){
    const have=myPositions(), T=myT();
    const pb=(pos,m,from,label)=>`<button class="btn ${LP&&c.learn.pos===pos&&c.learn.mode===m&&c.learn.from===from?'on':''}" data-pp="${pos}" data-pm="${m}" data-pf="${from||''}">${label}</button>`;
    posSec=`<details class="cdet" ${LP?'open':''}><summary class="sh2">守れる位置を増やす・変える（${CP}ポイント全部）</summary><div class="pcardx">
      <div class="hint" style="margin-bottom:6px">いま守れる位置：<b style="color:var(--ink)">${have.map(p=>POS_JP[p]).join('・')}</b>（2つまで）</div>
      ${POSS.filter(p=>!have.includes(p)).map(p=>{ const top=T.F.filter(f=>f.pos===p).map(f=>posValue(f,p)).sort((x,y)=>y-x)[0];
        return `<div class="lrn"><b>${POS_JP[p]}</b> <small>必要 ${r1(CP-posDisc(p))}pt${posDisc(p)?`（${P.hand==='L'?'左投げ':'右投げ'}の割引）`:''}・あなたなら ${Math.round(posValue(myFielder(p),p))}・チームのいちばん手強い相手 ${top!=null?Math.round(top):'なし'}</small>
        <div class="row" style="margin-top:6px">${have.length<2?pb(p,'add','','＋ 追加する'):''}${have.map(h=>pb(p,'swap',h,`${POS_JP[h]}から変える`)).join('')}</div></div>`; }).join('')}
      <div class="hint">守備の能力はそのまま。守れる位置が2つあると、スタメン争いでチームにいちばん必要な位置で出場します。</div></div></details>`;
  }
  el.innerHTML=`<div class="pen">
    <h2>⛺ 春季キャンプ　${P.year}年目</h2>
    ${draftNewsHTML()}
    ${managerSay(P.year===1?`ようこそ${TEAM[P.team].short}へ。監督の${myMgr().sur}だ。開幕までのキャンプで何を鍛えるか、自分で決めてみろ。`:myMgr().y===P.year?`今年から監督になった${myMgr().sur}だ。${P.age}歳のシーズン、何を伸ばす？ 俺の見方は下に書いてある。`:`今年のキャンプだ。${P.age}歳のシーズン、何を伸ばす？`,true)}
    ${P.mgrNews&&P.mgrNews.length?`<div class="hint" style="margin:-2px 0 6px">他球団の監督交代：${P.mgrNews.join('／')}</div>`:''}
    ${mgrCard()}
    <div class="pcardx"><div class="camppt">持ち点 <b>${CP.toFixed(1)}</b><small style="color:var(--mute)">（基本${campBase().toFixed(1)}＋監督${mgrCampBonus(myMgr()).toFixed(1)}${(()=>{ const L=(P.awake&&P.awake.log||[]).filter(x=>x.y===P.year-1); const aw=r1(L.filter(x=>x.kind!=='title').reduce((t,x)=>t+(x.pts||0),0)), tt=r1(L.filter(x=>x.kind==='title').reduce((t,x)=>t+(x.pts||0),0)); return `${aw?`＋覚醒${aw}`:''}${tt?`＋タイトル${tt}`:''}${bank&&!aw&&!tt?`＋持ち越し${bank}`:''}${P.carry?`＋去年からの繰り越し${P.carry}`:''}`; })()}）</small>　残り <b class="${left?'':'zero'}">${left.toFixed(1)}</b> ポイント</div>
      ${(()=>{ const L=(P.awake&&P.awake.log||[]).filter(x=>x.y===P.year-1); return L.length?`<div class="hint" style="color:#f3dfa0">去年の実績：${L.map(x=>`<div>${x.kind==='title'?'🏆':'✨'} ${x.name}${x.pts?`　+${x.pts}`:''}</div>`).join('')}</div>`:''; })()}
      ${c.learn?`<div class="hint" style="color:#f3dfa0">「${LP?POS_JP[c.learn.pos]:c.learn.t}」を${LP?(c.learn.mode==='add'?'守れるようにする':'新しい守備位置にする'):'覚える'}ので、${isPLearn(c)?`${learnCost(c.learn.t,!!c.learn.base)}ポイントを使います（残りは能力・Lvに使えます）`:learnDisc(c)?`${r1(CP-learnDisc(c))}ポイントを使います（${P.hand==='L'?'左投げ':'右投げ'}の割引で0.2ポイント安く、残りは能力に使えます）`:`${CP}ポイントすべてを使います`}</div>`:''}
      ${abRows}</div>
    <div class="sh2">🧘 ストレッチ（${stretchCost()}ポイント＝持ち点の1/3）</div><div class="pcardx">
      <div class="hint" style="margin-bottom:6px">来年のケガ率：<b style="color:var(--ink)">${injRateAt(P.age,P.injRed)}%</b>／出場試合${c.stretch?`　→ ストレッチ後 <b style="color:#9ad48a">${injRateAt(P.age,(P.injRed||0)+0.025)}%</b>`:`（ストレッチをすると ${injRateAt(P.age,(P.injRed||0)+0.025)}%）`}${P.injRed?`　<small>これまでの軽減 −${P.injRed}%</small>`:''}</div>
      <div class="row"><button class="btn ${c.stretch?'on':''}" id="campStretch" ${!c.stretch&&stretchCost()>left+1e-6?'disabled':''}>${c.stretch?'✓ ストレッチをする':'ストレッチをする'}</button></div>
      <div class="hint">ケガ率は18歳0.01%から1歳ごとに+0.01%、30歳からは+0.05%ずつ、40歳からは+10%ずつ上がります。ストレッチは1回につき0.025%下げ、効果はずっと続きます</div></div>
    ${hasBat()?`<details class="cdet" ${c.bconv?'open':''}><summary class="sh2">打席をコンバートする（0.1ポイント・ミートが5下がる）</summary><div class="pcardx"><div class="hint" style="margin-bottom:6px">いまは <b style="color:var(--ink)">${bhandJP(P.bhand)}</b>${P.bhand==='S'?'（打席ごとに左右を選べる）':''}</div>
      <div class="row">${['R','L','S'].filter(h=>h!==P.bhand).map(h=>`<button class="btn ${c.bconv===h?'on':''}" data-bc="${h}">${bhandJP(h)}にする</button>`).join('')}</div>
      <div class="hint">左打ちは右投手、右打ちは左投手に少し三振しづらい。両打ちは相手投手と逆の打席に入れる。</div></div></details>`:''}
    ${B?posSec:`<details class="cdet" ${c.learn||c.pick?"open":""}><summary class="sh2">新しい変化球を覚える・変える（0.9〜2.3ポイント）</summary>
    <div class="pcardx">${learn}</div></details>`}
    <button class="btn main" id="campEnd">キャンプを終えて開幕へ${left>1e-6&&!L?`（残り${left}ptは来年に繰り越し）`:''}</button>
  </div>`;
  el.querySelectorAll('[data-ck]').forEach(b=>b.onclick=()=>campStep(b.dataset.ck,b.dataset.d==='all'?'all':+b.dataset.d));
  el.querySelectorAll('[data-cb]').forEach(s=>{ s.oninput=()=>{ if(+s.value<+s.dataset.base) s.value=s.dataset.base; }; s.onchange=()=>campSetAdd(s.dataset.cb,r1(Math.max(0,+s.value-(+s.dataset.base)))); });
  el.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>campLearn(b.dataset.lt,b.dataset.lm,b.dataset.lb));
  el.querySelectorAll('[data-pp]').forEach(b=>b.onclick=()=>campPos(b.dataset.pp,b.dataset.pm,b.dataset.pf||null));
  el.querySelectorAll('[data-bc]').forEach(b=>b.onclick=()=>campBconv(b.dataset.bc));
  const sb=$('campStretch'); if(sb) sb.onclick=campStretch;
  $('campEnd').onclick=campFinish;
}

/* ---- 日程画面 ---- */
function statLine(s){
  if(isBat()) return batLine(s);
  const hp=(s.hld||0)+(s.rw||0);
  return `${s.g}登板（先発${s.gs}）　${s.w}勝${s.l}敗 ${s.sv}S ${s.hld}H${hp?`（${hp}HP）`:''}<br>防御率 <b>${fmtRate(s.runs,s.outs)}</b>　${fmtIP(s.outs)}回　奪三振${s.k}　WHIP ${s.outs?((s.hits+s.bb)*3/s.outs).toFixed(2):'-.--'}`;
}
// 順位表（勝率＝勝÷(勝+敗)。ゲーム差は1位との差）
function standingsHTML(lg,rows){
  const st=rows||standings(lg), top=st[0];
  return `<table class="stt stand"><thead><tr><th></th><th style="text-align:left">${LG_NAME[lg]}</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr></thead><tbody>`+
    st.map((x,i)=>{ const gb=((top.w-top.l)-(x.w-x.l))/2;
      return `<tr class="${x.id===PEN.team?'mine':''}"><td>${i+1}</td><td style="text-align:left">${tchip(x.id)}</td><td>${x.w}</td><td>${x.l}</td><td>${x.t}</td><td>${wpct(x).toFixed(3).replace(/^0/,'')}</td><td>${i?gb.toFixed(1).replace(/\.0$/,''):'-'}</td></tr>`}).join('')+'</tbody></table>';
}
function managerSay(text,small){
  return `<div class="msay ${small?'sm':''}"><div class="mimg">${svgManager(TEAM[PEN.team])}<div class="mlab">${mgrName(myMgr())}<br>${mgrBadges(myMgr())}</div></div><div class="bub r">${text}</div></div>`;
}
function renderPennant(){
  if(QUIET) return;
  const el=$('penScreen'); if(!PEN){ el.innerHTML=''; return; }
  penMigrate();
  if(PEN.pending&&!PEN.pending.started&&gameIsPending()) PEN.pending.started=true;   // 古いセーブ：始めた試合には印をつける
  // 終わったのに記録されていない試合は記録する／途中で無くなった試合はスキップ扱い
  if(PEN.pending&&PEN.pending.started&&gameIsPending()&&G.over){ penGameDone(); }
  if(PEN.pending&&PEN.pending.started&&!liveForPending()){ penAbandoned(); return; }
  const P=PEN, R=evalR(), T=TEAM[P.team], rec=myRec();
  el.style.setProperty('--team',T.cap);
  if(P.released){ renderReleased(el); return; }
  if(false){
    el.innerHTML=`<div class="pen"><h2>戦力外通告</h2>
      <div class="pcardx bad">${P.year}年目の成績と通算成績が評価されず、<b>戦力外（年俸0円）</b>となりました。ペナントモードは終了です。</div>
      ${P.titles.length?`<div class="sh2">獲得タイトル</div><div class="pcardx">${titleList()}</div>`:''}
      ${seasonTable()}
      <button class="btn main" id="penNew">新しいペナントを始める</button>
      <button class="btn" id="penMode" style="width:100%;margin-top:8px">メニューへ</button></div>`;
    $('penNew').onclick=()=>{ PEN=null; openSetup('pennant'); };
    $('penMode').onclick=()=>showScreen('mode');
    return;
  }
  if(needCamp()){ renderCamp(el); return; }   // 開幕前はキャンプ
  if(P.day>=SEASON_GAMES && !P.pending){
    if(!P.review) P.review=yearReview();
    const rv=P.review; if(!rv.titles){ rv.titles=[]; rv.nT=0; rv.stage='salary'; }
    const fin=rv.fin||{'セ':standings('セ'),'パ':standings('パ')}, myLg=T.lg;
    const champ=lg=>fin[lg][0].id, rank=fin[myLg].findIndex(x=>x.id===P.team)+1;
    const head=`<h2>${P.year}年目 シーズン終了</h2>
      <div class="pcardx">${tchip(P.team,true)}　${rec.w}勝${rec.l}敗${rec.t}分　<b>${LG_NAME[myLg]}${rank}位</b>${champ(myLg)===P.team?'　🏆 リーグ優勝！':''}<br>${roleName(P.role)}　${statLine(P.ss)}</div>`;
    if(rv.stage==='ps'&&rv.ps&&!psMyTeamIn(rv.ps)) psRunAll();   // 自分のチームが出ないポストシーズンは結果だけ
    if(rv.stage==='ps'){
      el.innerHTML=`<div class="pen">${head}
        <div class="sh2">最終順位</div>${standingsHTML(myLg,fin[myLg])}${standingsHTML(otherLg(myLg),fin[otherLg(myLg)])}
        ${psHTML(rv)}</div>`;
      psBind(el); return;
    }
    if(rv.stage==='award'){
      const won=rv.titles.filter(t=>t.won);
      el.innerHTML=`<div class="pen">${head}
        <div class="sh2">最終順位</div>${standingsHTML(myLg,fin[myLg])}${standingsHTML(otherLg(myLg),fin[otherLg(myLg)])}
        <div class="hint">優勝：${LG_NAME['セ']} ${TEAM[champ('セ')].name}／${LG_NAME['パ']} ${TEAM[champ('パ')].name}</div>
        <div class="sh2">🏅 ${LG_NAME[myLg]} 表彰</div>
        ${won.length?`<div class="pcardx hi award">${won.map(t=>`<div class="tw">🏅 <b>${t.name}</b>${t.shared?'（同数で共同受賞）':''}　${t.mine}</div>`).join('')}
          ${managerSay(`${won.map(t=>t.name).join('・')}、おめでとう！ 年俸にも上乗せしてもらうよう話しておくぞ。`,true)}</div>`
          :`<div class="pcardx">今年はタイトルに届きませんでした。</div>`}
        <div class="pcardx"><table class="stt ttl"><thead><tr><th>タイトル</th><th>自分</th><th>リーグ他${isBat()?'選手':'投手'}のトップ</th></tr></thead><tbody>
          ${rv.titles.map(t=>`<tr class="${t.won?'won':''}"><th>${t.name}${t.note?`<br><small>${t.note}</small>`:''}</th><td>${t.won?'🏅 ':''}${t.mine}${t.why?`<br><small>${t.why}</small>`:''}</td><td>${t.ai}</td></tr>`).join('')}
        </tbody></table></div>
        ${psHTML(rv)}
        <button class="btn main" id="penAward">年俸査定へ</button></div>`;
      $('penAward').onclick=()=>{ rv.stage='salary'; rv.psStage=2; renderPennant(); save(); window.scrollTo(0,0); };
      return;
    }
    const faBlock=rv.fa?faHTML(rv):'';
    const faOpen=rv.fa&&!rv.faNone&&(rv.faAns==null||(rv.faAns==='use'&&!rv.faDone));
    el.innerHTML=`<div class="pen">${head}
      ${faBlock}
      ${faOpen?'':`<div class="sh2">年俸査定</div>
      <div class="pcardx ${rv.released?'bad':''}">${rv.faNone?`FAで行き先が見つからず、<b>自由契約</b>になりました（年俸0円）`:rv.released?`今年も通算も成績が悪く、<b>戦力外通告</b>を受けました（年俸0円）`:
        `年俸 ${yen(P.salary)} → <b>${yen(rv.newSal)}</b>（${rv.ct?'複数年契約のため固定':`${rv.chg>=0?'+':''}${Math.round(rv.chg*100)}%`}）`}
        <div class="hint">今年の評価 ${Math.round(rv.yR)}点／通算の評価 ${rv.cR==null?'-':Math.round(rv.cR)+'点'}${P.ss.mOK?`／ミッション達成 ${P.ss.mOK}回`:''}${rv.nT?`／タイトル${rv.nT}つで+${Math.round(rv.nT*TITLE_BONUS*100)}%${rv.chg>=0.5?'（上限+50%）':''}`:''}</div>${rv.ex&&rv.ex.why&&rv.ex.why.length?`<div class="hint">${rv.ex.why.join('／')}</div>`:''}${stagPenalty()?`<div class="hint" style="color:#f0a0a0">伸び悩み${PEN.stag.n}年目（${mgrName(myMgr())}はもう待てないと言っている）：評価 −${stagPenalty()}点</div>`:PEN.stag&&PEN.stag.n?`<div class="hint">伸び悩み${PEN.stag.n}年目（${mgrName(myMgr())}はあと${Math.max(0,stagLimit()-PEN.stag.n)}年までは待つと言っている）</div>`:''}</div>
      ${rv.abil?(isBat()?abilChangeHTMLB(rv.abil):abilChangeHTML(rv.abil)+(rv.abil.bat?abilChangeHTMLB(rv.abil.bat,true):'')):''}
      <button class="btn main" id="penNext">${rv.faNone?'トライアウトへ':rv.released?'結果を受け入れる':`${P.year+1}年目へ`}</button>`}</div>`;
    const on2=(id,f)=>{const e=document.getElementById(id); if(e) e.onclick=f;};
    on2('penNext',penNextSeason);
    el.querySelectorAll('[data-fa]').forEach(b=>b.onclick=()=>faAnswer(b.dataset.fa==='use'));
    el.querySelectorAll('[data-fasign]').forEach(b=>b.onclick=()=>faSign(+b.dataset.fasign));
    return;
  }
  const B=isBat();
  const nextTxt = P.pending ? '' : B ? (P.role==='代打' ? `代打の出番：1試合あたり約${Math.round(pinchProb()*100)}%（成績が良いほどスタメンに近づきます）${runnerProb()>0?`／代走：約${Math.round(Math.min(0.6,runnerProb()*(mySubMgr()?1.5:1))*100)}%`:''}${defsubProb()>0?`／守備固め：約${Math.round(Math.min(0.6,defsubProb()*(mySubMgr()?1.5:1))*100)}%`:''}${mySubMgr()?'（代打多用型の監督）':''}` : `スタメン ${P.order}番（毎試合出場）`) : isStarter(P.role) ? `次の先発：第${P.nextStart+1}試合（あと${Math.max(0,P.nextStart-P.day)}試合）` :
    P.role==='中継ぎ' ? `登板機会：1試合あたり約${Math.round(relProb()*100)}%（成績が悪いほど減ります）` : `セーブ機会：1試合あたり約34%`;
  const pend=P.pending, vs=pend?(pend.kind==='wbc'?`🌏 WBC ${{pool:'1次ラウンド',semi:'準決勝',final:'決勝'}[pend.stage]}　<span class="tchip" style="background:#0b1f4a;color:#fff">日本</span> vs ${tchip(pend.opp)}`:pend.ps?`🏆 ${pend.psName} 第${pend.gameNo}戦 vs ${tchip(pend.opp)}`:pend.kind==='allstar'?`⭐ オールスター第${pend.asDay}戦　<span class="tchip" style="background:#c8102e;color:#fff">オール・セントラル</span> vs <span class="tchip" style="background:#0f3fa8;color:#fff">オール・パシフィック</span>`:`第${pend.day+1}試合 vs ${tchip(pend.opp)}${isInter(pend.day)?'<small>（交流戦）</small>':''}`):'';
  const card = !pend ? '' : pend.started ?
      `<div class="pcardx hi"><div class="sh2" style="margin-top:0">${vs}（試合中）</div>
      <b>この試合は途中です（${G.inning}回${G.pulled?'・降板済み':''}）</b>
      <div class="row" style="margin-top:10px"><button class="btn main" id="penPlay" style="margin:0">▶ 試合に戻る</button><button class="btn" id="penSkipHere">ここからスキップ</button></div>
      <div class="hint">「ここからスキップ」は、残りを今の成績に応じておまかせで進めて試合を終わらせます</div></div>` :
      `<div class="pcardx hi"><div class="sh2" style="margin-top:0">${vs}</div>
      <b>${kindText(pend)}</b>
      <div class="row" style="margin-top:10px"><button class="btn main" id="penPlay" style="margin:0">${B?'🏏 打席に立つ':'⚾ 投げる'}</button><button class="btn" id="penSkip">スキップ</button></div>
      <div class="hint">スキップすると、今の成績に応じてランダムに結果が決まります</div></div>`;
  let prompt='';
  if(P.prompt&&P.prompt.kind==='trade'){
    const to=TEAM[P.prompt.to];
    prompt=`<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">📞 トレードの打診</div>
      ${managerSay(`${P.pname}、ちょっといいか。<b>${to.name}</b>（${LG_NAME[to.lg]}${rankOf(to.id)}位）がお前を欲しいと言ってきている。環境を変えてみるのも手だと思うが、どうする？`)}
      <div class="row" style="margin-top:8px"><button class="btn main" data-tr="go" style="margin:0">${to.short}へ移籍する</button><button class="btn" data-tr="stay">${T.short}に残る</button></div></div>`;
  }else if(P.prompt&&P.prompt.kind==='tradeRole'){
    const to=TEAM[P.prompt.to];
    prompt=`<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">${tchip(to.id,true)} での役割</div>
      新しいチームでは、どちらで再出発しますか？
      <div class="row" style="margin-top:8px"><button class="btn main" data-tr="start" style="margin:0">${B?'スタメン（下位打線）':'先発（ローテーション）'}</button><button class="btn" data-tr="relief">${B?'代打':'中継ぎ'}</button></div></div>`;
  }else if(P.prompt&&P.prompt.kind==='twBack'){   // 二刀流：監督の判断で先発に戻る（選べない）
    prompt=`<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">🧢 監督から話がある</div>
      ${managerSay(`${P.pname}、中継ぎでのピッチングはしっかり見せてもらった。だがお前は二刀流だ。先発で投げて、打席にも立ってこそだろう。次から先発に戻ってもらうぞ。`)}
      <button class="btn main" data-c="twBack" style="width:100%;margin:8px 0 0">はい（先発・裏ローテに戻る）</button></div>`;
  }else if(P.prompt&&P.prompt.kind==='fav'){
    prompt=`<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">🧢 ${mgrName(myMgr())}からの打診</div>
      ${managerSay(favText(P.prompt))}
      ${P.prompt.sub==='try'?`<div class="row" style="margin-top:8px"><button class="btn main" data-fav="ok" style="margin:0">わかった</button></div>
      <div class="hint">5登板のあいだLv.1の${P.prompt.t}が使えます。1登板で${P.prompt.n}球以上投げるとお気に入り度+3、届かないと−6（大幅ダウン）。終わると投げられなくなります</div></div>`:`
      <div class="row" style="margin-top:8px"><button class="btn main" data-fav="ok" style="margin:0">引き受ける</button><button class="btn" data-fav="no">断る（お気に入り度 −5）</button></div>
      <div class="hint">${P.prompt.sub==='order'?'引き受けると10試合のあいだ、全能力がそれぞれ±1〜10変わります':'引き受けると10試合のあいだ、チーム全体のエラーが増えます'}</div></div>`}`;
  }else if(P.prompt){
    prompt=`<div class="pcardx hi"><b>中継ぎでの好投が評価されています。</b>どうしますか？
      <div class="row" style="margin-top:8px"><button class="btn" data-c="裏ローテ">先発（裏ローテ）へ</button><button class="btn" data-c="抑え">抑えへ</button><button class="btn" data-c="stay">中継ぎのまま</button></div></div>`;
  }
  const recent=P.days.slice(-10).reverse().map(g=>{
    const m={W:'○',L:'●',T:'△'}[g.res];
    const me=g.me&&g.me.note?`<span class="me">${g.me.note}</span>` : g.me&&g.me.bat?`<span class="me">${g.me.kind==='pinch'?'代打':g.me.kind==='defsub'?'守備固め':'スタメン'}${g.me.gp?' 🧤好プレー':''} ${g.me.bat.pa?`${g.me.bat.ab}打数${g.me.bat.h}安打${g.me.bat.hr?` ${g.me.bat.hr}本`:''}${g.me.bat.rbi?` ${g.me.bat.rbi}打点`:''}${g.me.bat.sb?` ${g.me.bat.sb}盗塁`:''}${g.me.bat.bb?` ${g.me.bat.bb}四死球`:''}`:'打席なし'}${g.me.played?'':'（スキップ）'}${g.me.mission?`（ミッション${g.me.mission}）`:''}</span>`
      : g.me?`<span class="me">${{start:'先発',relief:'中継ぎ',closer:'抑え'}[g.me.kind]} ${fmtIP(g.me.outs)}回${g.me.runs}失点${g.me.dec!=='－'?' '+({勝:'勝',負:'負',S:'S',H:'H'}[g.me.dec]):''}${g.me.tb?`／${g.me.tb.ab}打数${g.me.tb.h}安打${g.me.tb.hr?` ${g.me.tb.hr}本`:''}${g.me.tb.rbi?` ${g.me.tb.rbi}打点`:''}`:''}${g.me.played?'':'（スキップ）'}${g.me.mission?`（ミッション${g.me.mission}）`:''}</span>`:'';
    return `<div class="dayr"><span class="rm ${g.res}">${m}</span> ${gameMD(g.d-1)} 第${g.d}試合 vs ${g.oid?tchip(g.oid):g.opp} ${g.score[1]}-${g.score[0]} ${me}</div>`}).join('')||'<div class="hint">まだ試合はありません</div>';
  const rk=rankOf(P.team), st=standings(T.lg), gb=rk>1?((st[0].w-st[0].l)-(rec.w-rec.l))/2:0;
  el.innerHTML=`<div class="pen">
    <h2>🏆 ペナントモード　${P.year}年目</h2>
    <div class="sh2">お知らせ</div><div class="notes">${P.notices.slice(0,6).map(n=>`<div>${n.y}年目 第${n.d}試合：${n.t}</div>`).join('')}</div>
    <div class="pcardx teamc" style="border-left:6px solid ${T.cap}">${tchip(P.team,true)}　${rec.w}勝${rec.l}敗${rec.t}分　${P.day?`<b>${LG_NAME[T.lg]}${rk}位</b>${rk>1&&gb>0?`<small>（首位と${gb.toFixed(1).replace(/\.0$/,'')}差）</small>`:''}`:`<b>${LG_NAME[T.lg]}</b>`}
      <div class="hint">第${P.day}／${SEASON_GAMES}試合${P.day<SEASON_GAMES?`　📅 ${P.day?'次の試合':'開幕'} <b style="color:var(--ink)">${gameMD(P.day)}</b>`:''}${P.day<SEASON_GAMES&&isInter(P.day)?'・交流戦中':''}</div>
      <div class="pbar"><i style="width:${P.day/SEASON_GAMES*100}%"></i></div></div>
    ${P.talk&&P.talk.y===P.year&&P.day<=P.talk.untilDay?`<div class="pcardx hi">${managerSay(P.talk.text)}<div class="row" style="margin-top:6px"><button class="btn" id="talkClose" style="margin:0">わかった</button></div></div>`:''}
    ${typeof wbcHTML==='function'&&P.wbc&&P.wbc.y===P.year&&!P.wbc.done?wbcHTML():''}
    ${prompt}${card}
    ${!P.pending&&!P.prompt?`<div class="row"><button class="btn main" id="penStep" style="margin:0">次の試合へ</button><button class="btn" id="penToMine">${B?'出番まで進める':'登板日まで進める'}</button></div>
    <details class="skipbox"><summary>⏩ まとめて飛ばす（出番は全部おまかせ）</summary><div class="hint" style="margin:6px 0 2px">ここで止める：${[['wbc','WBC選出'],['allstar','オールスター選出'],['cs','CS進出'],['js','日本シリーズ進出']].map(([k,n])=>`<label style="margin-right:8px;white-space:nowrap"><input type="checkbox" data-stop="${k}" ${skipStop()[k]?'checked':''}> ${n}</label>`).join('')}</div><div class="row" style="margin-top:6px">${P.wbc&&!P.wbc.done?`<button class="btn" data-skipto="wbcend">レギュラーシーズン開始まで（WBCをまとめて）</button>`:''}${MILESTONES.filter(m=>m[1]>P.day||m[1]>=SEASON_GAMES).map(m=>`<button class="btn" data-skipto="${m[0]}">${m[2]}</button>`).join('')}</div><div class="hint">トレードや監督の打診が来たら、そこで止まります</div></details>`:''}
    ${P.contract&&P.contract.until>P.year?`<div class="hint">📝 ${P.contract.years}年契約（あと${P.contract.until-P.year}年・年俸固定）</div>`:''}
    ${P.role==='抑え'&&!P.prompt?`<button class="btn" id="penToSt" style="width:100%;margin-top:8px">先発（ローテーション）に戻る</button>`:''}
    <div class="pcardx"><div class="prow"><span class="plink" data-pk="${plinkKey({isMe:true})}"><b style="font-size:17px">${P.pname}</b></span>${P.genius?' <span class="genius">✨ 天才</span>':''} ${B?`<span class="hb ${P.bhand}">${bhandJP(P.bhand)}</span> <span class="rbadge">${roleName(P.role)}${P.order?`・${P.order}番`:''}</span>${btypeBadge(P.btype)}`:`<span class="hb ${P.hand}">${P.hand==='L'?'左投':'右投'}</span> <span class="rbadge">${ROLE_NAME[P.role]}</span>`}</div>
      <div class="hint" style="margin:4px 0">${P.age||22}歳　年俸 ${yen(P.salary)}　評価 ${Math.round(R)}点${P.ss.mOK||P.ss.mNG?`　ミッション ${P.ss.mOK||0}勝${P.ss.mNG||0}敗`:''}${P.draft?`　ドラフト${P.draft.pick}位入団`:''}</div>
      ${typeof injuryHTML==='function'?injuryHTML():''}
      ${isFavMgr()?`<div class="pcardx" style="border-color:#2a9d4f"><b>💚 ${mgrName(myMgr())}のお気に入り度：${myMgr().fav||0}／100</b>　<small style="color:var(--mute)">評価 ${favBonus()>=0?'+':''}${Math.round(favBonus())}点</small><div class="hint">贔屓起用の監督だけの仕組み。ミッション達成で+8、失敗で−2、打診を断ると下がる。60以上で能力にかかわらず起用されやすく、伸び悩みを待ってくれる年数もお気に入り度で${stagLimit()}年（30未満2年・50未満3年・70未満4年・70以上5年）</div></div>`:''}
      ${(B||isTW())&&P.btype?`<div class="sh3">タイプ</div><div class="hint" style="margin:0 0 4px"><b style="color:var(--ink)">${P.btype}</b>　${BTYPE_INFO[P.btype]?BTYPE_INFO[P.btype].me:''}<details style="margin-top:2px"><summary>タイプ一覧と条件（毎年キャンプ前に去年の成績で決まる）</summary>${BTYPES.map(t=>`<div style="margin:3px 0"><b style="color:var(--ink)">${t}</b>：${BTYPE_INFO[t].cond}<br>→ ${BTYPE_INFO[t].me}</div>`).join('')}<div>複数の条件を満たしたときはランダムに1つ。上がる/下がる＝±5%、少し＝±2.5%、とても＝±7.5%</div></details></div>`:''}
      <div class="sh3">能力 <small>（かっこ内は入団時からの伸び）</small></div>${myAbilHTML()}
      <div class="sh3">成績</div>${myStatsHTML()}
      ${isTW()?`<div class="hint">投げない日：${P.dh?`<b style="color:var(--ink)">指名打者（${P.dhOrder}番）で出場</b>`:'出場なし（指名打者の争いに負けている）'}　DH争い：あなた ${P.dhVal??'-'}${P.dhRival?` vs ${P.dhRival.n} ${P.dhRival.v}`:''}（10試合ごとに見直し）</div>`:''}
      ${P.titles.length?`<div class="hint" style="margin-top:4px">🏅 ${titleList()}</div>`:''}
      <div class="hint" style="margin-top:6px">${nextTxt}</div></div>
    <div class="sh2">監督</div>${mgrCard()}
    ${B?depthHTML():''}
    <div class="sh2">順位表</div>${standingsHTML(T.lg)}${standingsHTML(otherLg(T.lg))}
    ${titleRaceHTML(T.lg)}
    ${eventsHTML()}
    <div class="sh2">最近の試合</div>${recent}
    ${P.seasons.length?'<div class="sh2">過去のシーズン</div>'+seasonTable():''}
    <div class="hint" style="margin-top:12px">${B?'役割：スタメン（守備位置の争いに勝つか、指名打者）／控え（ときどき終盤に代打で1打席）。打順は能力で決まります。':'役割：エース＝中5日／ローテーション＝中7日／裏ローテ＝中10日／中継ぎ＝先発が降りたあと／抑え＝9回。'}評価は今年の成績を通算より重く見ます。成績が良くないと、トレードを打診されることがあります。</div>
    <button class="btn" id="penMode" style="width:100%;margin-top:10px">メニューへ</button>
  </div>`;
  const on=(id,f)=>{const e=document.getElementById(id); if(e) e.onclick=f;};
  on('penPlay',penPlay); on('penSkip',penSkip); on('penSkipHere',penSkipHere);
  if(typeof wbcBind==='function') wbcBind(el);
  { const tc=el.querySelector('#talkClose'); if(tc) tc.onclick=()=>{ PEN.talk=null; renderPennant(); save(); }; }
  on('penStep',()=>{penStep();renderPennant();save();});
  on('penToMine',()=>{penToMine();renderPennant();save();});
  on('penToSt',penToStarter); on('penMode',()=>showScreen('mode'));
  el.querySelectorAll('[data-skipto]').forEach(b=>b.onclick=()=>penSkipTo(b.dataset.skipto));
  el.querySelectorAll('[data-stop]').forEach(c=>c.onchange=()=>{ skipStop()[c.dataset.stop]=c.checked; save(); });
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>penChoose(b.dataset.c));
  el.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>favAnswer(b.dataset.fav==='ok'));
  el.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>penTrade(b.dataset.tr));
}
// ポジション争い（野手）
function depthHTML(){
  const P=PEN; if(!P.rivals) penCompete(true);
  const tbl=pos=>{ const R=P.rivals[pos]; if(!R) return '';
    const rows=[{n:'あなた',v:R.me,age:P.age,me:true},...R.list].sort((a,b)=>b.v-a.v);
    return `<div class="hint" style="margin-top:4px;color:var(--ink)"><b>${POS_JP[pos]}</b>${P.slot===pos?'（いまここで出場）':''}</div>
    <table class="depth">${rows.map((r,i)=>`<tr class="${r.me?'me':''}"><td>${i+1}</td><td>${r.n}${r.rookie?' <small>新人</small>':''}</td><td>${r.age}歳</td><td class="v">${r.v}</td></tr>`).join('')}</table>`; };
  return `<div class="pcardx"><div class="sh2" style="margin-top:0">ポジション争い（守れる位置：${myPositions().map(p=>POS_JP[p]).join('・')}）</div>
    ${myPositions().map(tbl).join('')}
    <div class="hint" style="margin-top:4px">数字＝能力（打撃＋守備）＋監督の評価（成績・調子）。10試合ごとにスタメンを見直します。守れる位置が2つあるときは、チームにいちばん必要な位置で出場します。いまは<b style="color:var(--ink)">${P.role==='スタメン'?`${P.slot==='DH'?'指名打者':POS_JP[P.slot]}・${P.order}番`:'控え（代打）'}</b>${P.role!=='スタメン'?'。指名打者の枠でスタメンになることもあります':''}</div></div>`;
}
// 去年のオフのドラフト（自分のチーム）
// 試合の日付（m/d）：3/28開幕・月曜は休み（休みの日は均等に入る）・交流戦は5/30〜6/19・オールスター休みは7月上旬・9/30最終戦
let GAME_MD=null;
function gameMD(day){
  if(!GAME_MD){ GAME_MD=[];
    const span=(m1,d1,m2,d2,n)=>{ const ds=[], d=new Date(2026,m1-1,d1), e=new Date(2026,m2-1,d2); while(d<=e){ if(d.getDay()!==1) ds.push(`${d.getMonth()+1}/${d.getDate()}`); d.setDate(d.getDate()+1); }
      for(let i=0;i<n;i++) GAME_MD.push(ds[Math.round(i*(ds.length-1)/Math.max(1,n-1))]); };
    span(3,28,5,29,50); span(5,30,6,19,18); span(6,23,7,6,7); span(7,11,9,30,SEASON_GAMES-75); }   // 交流戦（51〜68試合目）は5/30〜6/19、オールスターは7月上旬
  return GAME_MD[clamp(day|0,0,GAME_MD.length-1)];
}
// 今年のイベント（終わったものをまとめる。タイトルを押すと結果が開く）
function eventsHTML(){
  const P=PEN, ev=[];
  if(P.wbc&&P.wbc.y===P.year&&P.wbc.done&&typeof wbcHTML==='function') ev.push(['🌏 WBC',wbcHTML()]);
  if(typeof allstarHTML==='function'&&P.allstar&&P.allstar.y===P.year){ const h=allstarHTML(); if(h) ev.push(['⭐ オールスター',h]); }
  if(P.draftNews&&P.draftNews.y===P.year-1){ const h=draftNewsHTML(); if(h) ev.push(['📝 ドラフト会議',h]); }
  if(!ev.length) return '';
  return `<details class="cdet evbox"><summary class="sh2">今年のイベント（${ev.length}）</summary><div class="pcardx">
    ${ev.map(([t,h])=>`<details class="evone"><summary><b>${t}</b></summary>${h}</details>`).join('')}</div></details>`;
}
// タイトル争い：各タイトルの1〜5位（名前を押すと詳しい成績・能力）
const TR_LIST=[['avg','首位打者','打率',v=>f3(v)],['hr','本塁打王','本塁打',v=>v+'本'],['rbi','打点王','打点',v=>v+''],['sb','盗塁王','盗塁',v=>v+''],['hit','最多安打','安打',v=>v+''],['obp','最高出塁率','出塁率',v=>f3(v)],
  ['era','最優秀防御率','防御率',v=>v.toFixed(2)],['win','最多勝','勝利',v=>v+'勝'],['k','最多奪三振','奪三振',v=>v+''],['sv','最多セーブ','セーブ',v=>v+'S']];
function csProfObj(x){
  if(x.me) return {isMe:true};
  const T=PEN.teams[x.team]; if(!T) return {name:x.name};
  const f=(T.F||[]).find(y=>y.id===x.key); if(f) return {...toBatter(f,0),name:f.n,cpuF:f,team:x.team,cs:PEN.cs[x.key]};
  const p=(T.P||[]).find(y=>y.pid===x.key); if(p) return {...p,cpuP:true,team:x.team,cs:PEN.cs[x.key]};
  return {name:x.name};
}
function titleRaceLg(lg){
  return TR_LIST.map(([k,name,lab,fmt])=>{ const L=csSorted(lg,k).slice(0,5);
    const rows=L.map((x,i)=>{ const rk=L.findIndex(y=>y.v===x.v)+1;
      return `<div class="trrow${x.me?' me':''}">${crownBadge(rk)}<span class="trn">${plink(csProfObj(x),x.me?`${x.name}（あなた）`:x.name)}</span>${tchip(x.team)}<b>${fmt(x.v)}</b></div>`; }).join('');
    return `<div class="trbox"><div class="trh">${name}<small>${lab}${k==='avg'||k==='obp'?'・規定打席以上':k==='era'?'・規定投球回以上':''}</small></div>${rows||'<div class="hint">該当者なし</div>'}</div>`; }).join('');
}
function titleRaceHTML(lg){
  if(!PEN||!PEN.teams||!PEN.day) return '';
  return `<details class="cdet"><summary class="sh2">タイトル争い</summary>
    <div class="pcardx"><div class="hint" style="margin:0 0 6px">${LG_NAME[lg]}（第${PEN.day}試合まで）。名前を押すと詳しい成績と能力</div>${titleRaceLg(lg)}
    <details class="evone"><summary><b>${LG_NAME[otherLg(lg)]}</b></summary>${titleRaceLg(otherLg(lg))}</details></div></details>`;
}
// 自分の能力（入団時からの伸びを+nで）と成績（今季｜通算）
function growTxt(now,base,unit){ const d=r1((now||0)-(base??now??0)); return `${now}${unit||''}${d?` <small class="${d>0?'up':'dn'}">(${d>0?'+':''}${d})</small>`:''}`; }
function myAbilHTML(){
  const P=PEN, rows=[];
  if(!isBat()){ const a=P.abil, a0=P.abil0||{};
    rows.push(['球速',growTxt(a.velo,a0.velo,'km/h')],['コントロール',growTxt(a.control,a0.control)],['スタミナ',growTxt(a.stamina,a0.stamina)]);
    rows.push(['持ち球',P.rep.map(t=>{ const l0=(P.plev0||{})[t], d=l0==null?null:lvOf(t)-l0; return `${ptn(t)} Lv.${lvOf(t)}${l0==null?' <small class="up">(新)</small>':d?` <small class="${d>0?'up':'dn'}">(${d>0?'+':''}${d})</small>`:''}`; }).join('<br>')]); }
  if(hasBat()){ const b=P.babil, b0=P.babil0||{};
    [['meet','ミート'],['power','パワー'],['speed','速度'],['eye','選球眼'],...(isBat()?[['def','守備']]:[])].forEach(([k,n])=>rows.push([n,growTxt(b[k]??50,b0[k])])); }
  return `<table class="stt abtbl">${rows.map(([n,v])=>`<tr><th>${n}</th><td>${v}</td></tr>`).join('')}</table>${P.abil0est?'<div class="hint">（入団時の記録がない前のセーブなので、記録を始めた時点からの伸び）</div>':''}`;
}
function myStatsHTML(){
  const P=PEN, f2=(n,o)=>o?(n*27/o).toFixed(2):'-.--';
  const rowsP=s=>[['登板',s.g],['先発',s.gs],['勝利',s.w],['敗戦',s.l],['セーブ',s.sv],['ホールド',s.hld||0],['投球回',fmtIP(s.outs)],['奪三振',s.k],['四球',s.bb],['防御率',f2(s.runs,s.outs)],['WHIP',s.outs?((s.hits+s.bb)*3/s.outs).toFixed(2):'-.--']];
  const rowsB=s=>[['試合',s.g],['打席',s.pa],['打率',s.ab?f3(bAvg(s)):'-'],['安打',s.h],['本塁打',s.hr],['打点',s.rbi],['盗塁',s.sb],['四死球',(s.bb||0)+(s.hbp||0)],['三振',s.k],['出塁率',s.pa?f3(bObp(s)):'-'],['OPS',s.pa?f3(bObp(s)+bSlg(s)):'-']];
  const tbl=(title,a,b)=>`<table class="stt sctbl"><thead><tr><th>${title}</th><th>今季</th><th>通算</th></tr></thead><tbody>${a.map((r,i)=>`<tr><th>${r[0]}</th><td>${r[1]}</td><td>${b[i][1]}</td></tr>`).join('')}</tbody></table>`;
  if(isBat()) return tbl('打撃',rowsB(P.ss),rowsB(P.career));
  let h=tbl('投手',rowsP(P.ss),rowsP(P.career));
  if(isTW()) h+=tbl('打撃',rowsB(P.bss||batStat()),rowsB(P.bcareer||batStat()));
  return h;
}
function draftNewsHTML(){
  const d=PEN.draftNews; if(!d||d.y!==PEN.year-1) return '';
  const T=TEAM[PEN.team], mine=isBat()?PEN.bpos:null;
  return `<div class="pcardx"><div class="sh2" style="margin-top:0">📝 ドラフト会議（${d.y}年目のオフ）</div>
    ${T.short}は<b>${d.np+d.nf}人</b>を指名（投手${d.np}人・野手${d.nf}人）
    <div class="hint" style="line-height:1.7;margin-top:4px">${d.got.map(g=>g.k==='P'?`投手 ${g.n}（${g.age}歳・${g.v}km/h）`:`<span style="${g.pos===mine?'color:#ffb35c;font-weight:700':''}">${POS_JP[g.pos]} ${g.n}（${g.age}歳）${g.pos===mine?' ← 同じポジション！':''}</span>`).join('<br>')}</div>
    <div class="hint">指名人数は「4＋チームの順位」人（下位のチームほど多く指名）</div></div>`;
}
function titleList(){
  const m={}; PEN.titles.forEach(t=>{ (m[t.name]=m[t.name]||[]).push(t.y); });
  return Object.entries(m).map(([n,ys])=>`${n}${ys.length>1?'×'+ys.length:''}（${ys.join('・')}年目）`).join('　');
}
function abilChangeHTML(ch){
  const a=PEN.abil, f=v=>v>0?`<span class="up">+${v}</span>`:v<0?`<span class="dn">${v}</span>`:'±0';
  const rows=[['球速',a.velo,ch.velo,'km/h',ch.why.velo],['コントロール',a.control,ch.control,'',ch.why.control],['スタミナ',a.stamina,ch.stamina,'',ch.why.stamina]]
    .map(([n,v,d,u,w])=>`<tr><th>${n}</th><td>${v}${u} → <b>${clamp(v+d,0,n==='球速'?165:100)}${u}</b>（${f(d)}）<br><small style="color:var(--mute)">${w}</small></td></tr>`).join('');
  const br=Object.entries(ch.brk).filter(([t])=>PEN.rep.includes(t)).map(([t,d])=>{const cur=lvOf(t), nx=clamp(cur+d,0,LV_MAX);
    return `<tr><th>${ptn(t)}</th><td>Lv.${cur} → <b>${nx===0?'投げられなくなる':'Lv.'+nx}</b>（${f(d)}）${ch.aging&&ch.aging.t===t?`<br><small style="color:var(--mute)">衰えで −${ch.aging.d}</small>`:''}</td></tr>`}).join('');
  return `<div class="sh2">能力の変化（来季に反映${(PEN.age||22)>33?'・33歳を超えたので衰えが大きい（マイナスは'+(ch.agingMul||5)+'倍）':''}）</div><div class="pcardx"><table class="stt abch">${rows}${br}</table></div>`;
}
function seasonTable(){
  return `<table class="stt"><thead><tr><th>年</th><th>所属・役割</th><th>成績</th><th>年俸</th></tr></thead><tbody>`+
    PEN.seasons.map(s=>`<tr><td>${s.year}</td><td>${s.team?tchip(s.team)+'<br>':''}${roleName(s.role)}</td><td style="text-align:left;font-size:11.5px">${s.ss.pa!=null?`${s.ss.g}試合 打率${s.ss.ab?f3(bAvg(s.ss)):'-'} ${s.ss.hr}本 ${s.ss.rbi}打点 ${s.ss.sb}盗塁`:`${s.ss.g}登板 ${s.ss.w}勝${s.ss.l}敗${s.ss.sv}S 防${fmtRate(s.ss.runs,s.ss.outs)}`}${s.rank?`<br>チーム${s.rank}位`:''}${s.titles&&s.titles.length?`<br>🏅${s.titles.join('・')}`:''}${s.feats&&s.feats.length?`<br><span style="color:#f3dfa0">✨${s.feats.join('・')}</span>`:''}</td><td>${yen(s.salary)}→${yen(s.newSal)}</td></tr>`).join('')+'</tbody></table>';
}

// その年の実績（覚醒・オールスター・CS/日本シリーズの表彰・日本一）
function seasonFeats(){
  const L=((PEN.awake&&PEN.awake.log)||[]).filter(x=>x.y===PEN.year).map(x=>x.pts?`${x.name}(+${x.pts})`:x.name);
  if(PEN.allstar&&PEN.allstar.y===PEN.year&&PEN.allstar.me&&PEN.allstar.me.sel) L.unshift('オールスター出場');
  return L;
}
