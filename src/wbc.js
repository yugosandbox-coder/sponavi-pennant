/* ================================================================
   国際大会（WBC）：4年ごと、開幕前に開催（プレイ可能）
   ・日本代表：両リーグから投手15・捕手3・一二三遊 各2・外野（左中右）各2＝32人。通算と去年の成績（能力＋実績）で選ぶ
   ・監督は前年日本一の球団の監督。代表はJAPANのユニフォーム
   ・相手国は日本の0.5〜1.5倍の強さ。監督・性格・選手タイプの偏りはランダム。名前は架空の外国人名
   ・1次ラウンド（4か国総当たり・3試合）→ 準決勝 → 決勝
   ・野手MVP（10打席以上）・投手MVP（10投球回以上）を全出場選手から。自分なら持ち点+3
   ================================================================ */
const WBC_EVERY=4, WBC_FIRST=2;   // 2年目・6年目・10年目…
const wbcYear=y=>y>=WBC_FIRST&&(y-WBC_FIRST)%WBC_EVERY===0;
const WBC_COUNTRIES=[
  {id:'USA',name:'アメリカ',short:'USA',s:'米',cap:'#0a2d6b',brim:'#b22234',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'USA',chc:'#0a2d6b',chs:'#b22234',num:'#0a2d6b',nums:'#b22234',sl:'#b22234',under:'#0a2d6b',pants:'#c9ccd3',panel:0,trim:'#0a2d6b',jk:'#0a2d6b',jt:'#b22234',names:'en'},
  {id:'KOR',name:'韓国',short:'韓国',s:'韓',cap:'#0b2a5b',brim:'#0b2a5b',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'KOREA',chc:'#0b2a5b',chs:'#c8102e',num:'#0b2a5b',nums:'',sl:'#c8102e',under:'#0b2a5b',pants:'#f7f7f7',panel:0,trim:'#0b2a5b',jk:'#0b2a5b',jt:'#c8102e',names:'kr'},
  {id:'TWN',name:'チャイニーズ・タイペイ',short:'台湾',s:'台',cap:'#0f3fa8',brim:'#0f3fa8',cl:'#ffffff',jersey:'#0f3fa8',pin:0,chest:'TAIPEI',chc:'#ffffff',chs:'#d7002a',num:'#ffffff',nums:'',sl:'#d7002a',under:'#0f3fa8',pants:'#f7f7f7',panel:0,trim:'#0f3fa8',jk:'#0f3fa8',jt:'#d7002a',names:'tw'},
  {id:'DOM',name:'ドミニカ共和国',short:'ドミニカ',s:'ド',cap:'#c8102e',brim:'#002d62',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'DOMINICANA',chc:'#c8102e',chs:'#002d62',num:'#c8102e',nums:'',sl:'#002d62',under:'#c8102e',pants:'#f7f7f7',panel:0,trim:'#c8102e',jk:'#c8102e',jt:'#002d62',names:'es'},
  {id:'VEN',name:'ベネズエラ',short:'ベネズエラ',s:'ベ',cap:'#7a1b2e',brim:'#7a1b2e',cl:'#f5c542',jersey:'#7a1b2e',pin:0,chest:'VENEZUELA',chc:'#f5c542',chs:'',num:'#f5c542',nums:'',sl:'#f5c542',under:'#7a1b2e',pants:'#f7f7f7',panel:0,trim:'#7a1b2e',jk:'#7a1b2e',jt:'#f5c542',names:'es'},
  {id:'MEX',name:'メキシコ',short:'メキシコ',s:'メ',cap:'#006847',brim:'#006847',cl:'#ffffff',jersey:'#006847',pin:0,chest:'MEXICO',chc:'#ffffff',chs:'#ce1126',num:'#ffffff',nums:'',sl:'#ce1126',under:'#006847',pants:'#f7f7f7',panel:0,trim:'#006847',jk:'#006847',jt:'#ce1126',names:'es'},
  {id:'CUB',name:'キューバ',short:'キューバ',s:'キ',cap:'#002a8f',brim:'#cf142b',cl:'#ffffff',jersey:'#cf142b',pin:0,chest:'CUBA',chc:'#ffffff',chs:'#002a8f',num:'#ffffff',nums:'',sl:'#002a8f',under:'#002a8f',pants:'#f7f7f7',panel:0,trim:'#002a8f',jk:'#cf142b',jt:'#002a8f',names:'es'},
  {id:'AUS',name:'オーストラリア',short:'豪州',s:'豪',cap:'#004b2d',brim:'#f5c542',cl:'#f5c542',jersey:'#004b2d',pin:0,chest:'AUSTRALIA',chc:'#f5c542',chs:'',num:'#f5c542',nums:'',sl:'#f5c542',under:'#004b2d',pants:'#f7f7f7',panel:0,trim:'#004b2d',jk:'#004b2d',jt:'#f5c542',names:'en'},
  {id:'NED',name:'オランダ',short:'オランダ',s:'蘭',cap:'#f36c21',brim:'#f36c21',cl:'#ffffff',jersey:'#f36c21',pin:0,chest:'NEDERLAND',chc:'#ffffff',chs:'#1a3a8f',num:'#ffffff',nums:'',sl:'#1a3a8f',under:'#1a3a8f',pants:'#f7f7f7',panel:0,trim:'#f36c21',jk:'#f36c21',jt:'#1a3a8f',names:'en'},
  {id:'PUR',name:'プエルトリコ',short:'プエルトリコ',s:'プ',cap:'#c8102e',brim:'#1a3a8f',cl:'#ffffff',jersey:'#f7f7f7',pin:0,chest:'PUERTO RICO',chc:'#c8102e',chs:'#1a3a8f',num:'#1a3a8f',nums:'',sl:'#c8102e',under:'#1a3a8f',pants:'#f7f7f7',panel:0,trim:'#c8102e',jk:'#c8102e',jt:'#1a3a8f',names:'es'},
];
// 日本代表：白地に紺と赤の細い縦じま、紺の帽子に赤い「J」、紺の「JAPAN」と背番号（縁は暗めの金）、紺のアンダーシャツ
const WBC_JPN={id:'JPN',lg:'',name:'日本代表',short:'日本',s:'日',ch:'J',cap:'#0b1f4a',brim:'#0b1f4a',cl:'#d7002a',cls:'#9a7b2f',jersey:'#f7f7f7',pin:'#0b1f4a',pin2:'#c8102e',chest:'JAPAN',chc:'#0b1f4a',chs:'#9a7b2f',num:'#0b1f4a',nums:'#9a7b2f',sl:'#0b1f4a',under:'#0b1f4a',pants:'#f7f7f7',panel:0,trim:'#0b1f4a',jk:'#0b1f4a',jt:'#c8102e'};
// 架空の外国人名
const FN_EN=['Mike','Chris','Jake','Tyler','Brandon','Cody','Austin','Logan','Kyle','Ryan','Matt','Josh','Dylan','Trevor','Zack','Hunter','Cole','Nolan','Blake','Jordan','Ethan','Luke','Mason','Owen','Shane'];
const LN_EN=['Johnson','Miller','Davis','Anderson','Thompson','Harris','Walker','Young','Hall','Allen','Wright','Hill','Baker','Carter','Mitchell','Turner','Phillips','Parker','Evans','Collins','Stewart','Morris','Rogers','Reed','Cook'];
const FN_ES=['Juan','Carlos','Luis','José','Miguel','Pedro','Rafael','Alberto','Manuel','Francisco','Ramón','Víctor','Andrés','Jorge','Julio','Wilson','Yadiel','Ronny','Eduardo','Cristian','Javier','Alexis','Félix','Héctor','Nelson'];
const LN_ES=['Rodríguez','Martínez','García','Hernández','Pérez','Sánchez','Ramírez','Torres','Rivera','Díaz','Reyes','Cruz','Ortiz','Morales','Castillo','Jiménez','Vargas','Mendoza','Guzmán','Rojas','Peña','Núñez','Santana','Acosta','Polanco'];
const FN_KR=['민수','준호','지훈','현우','성민','동현','재원','태양','승우','우진','영수','정호','상현','도윤','시우'];
const LN_KR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권'];
const FN_TW=['建宏','俊傑','志豪','承翰','冠宇','家豪','宗翰','柏翰','泰山','智勝','承恩','宇軒','冠霖','立傑','祐銘'];
const LN_TW=['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','郭','洪'];
function wbcName(kind,used){
  let n='', g=0;
  do{ n = kind==='es'?`${pick(FN_ES)} ${pick(LN_ES)}` : kind==='kr'?`${pick(LN_KR)}${pick(FN_KR)}` : kind==='tw'?`${pick(LN_TW)}${pick(FN_TW)}` : `${pick(FN_EN)} ${pick(LN_EN)}`; }while(used&&used.has(n)&&g++<50);
  if(used) used.add(n); return n;
}
// 日本代表の選出
function wbcSelectJapan(){
  const F=[],P=[]; NPB.forEach(t=>{ const T=PEN.teams[t.id]; T.F.forEach(f=>F.push({f,id:t.id,sc:hitScore(f)+(f.d-50)*0.25+(f.pf||0)*0.5+rnd()*6})); T.P.forEach(p=>P.push({p,id:t.id,sc:pitScore(p)+rnd()*8})); });
  const used=new Set(), take=(pos,n)=>F.filter(x=>!used.has(x)&&x.f.pos===pos).sort((a,b)=>b.sc-a.sc).slice(0,n).map(x=>{ used.add(x); return x; });
  let sel=[...take('C',3),...take('1B',2),...take('2B',2),...take('3B',2),...take('SS',2),...take('OF',6)];
  const pit=P.sort((a,b)=>b.sc-a.sc).slice(0,15);
  let me=null;
  if(wbcMeOK()){
    if(isBat()||isTW()){ const mf=myFielder(PEN.bpos||'OF'); mf.btype=PEN.btype||'バランス'; const i=sel.map((x,k)=>x.f.pos===mf.pos?k:-1).filter(k=>k>=0).pop(); const ent={f:mf,id:PEN.team,sc:999,me:true}; if(i>=0) sel[i]=ent; else sel.push(ent); me=ent; }
    if(!isBat()){ const mp={isMe:true,name:PEN.pname,num:MYNUM,hand:PEN.hand,velo:PEN.abil.velo,control:PEN.abil.control,stamina:PEN.abil.stamina,types:PEN.rep.slice(),plv:{...PEN.plev}}; mp.q=pitQ(mp); const ent={p:mp,id:PEN.team,sc:999,me:true}; pit[pit.length-1]=ent; pit.sort((a,b)=>b.sc-a.sc); me=me||ent; }
  }
  return {F:sel.map(x=>({f:x.f,id:x.id,me:!!x.me})),P:pit.map(x=>({p:x.p,id:x.id,me:!!x.me})),me:!!me};
}
// 自分が選ばれる条件：2年目以降で、通算（去年まで）の評価が高い
function wbcMeOK(){
  if(!PEN||PEN.released||PEN.year<2||(typeof injured==='function'&&injured())) return false;
  const last=PEN.seasons[PEN.seasons.length-1]; if(!last) return false;
  const rt=isBat()?ratingB:rating, y=rt(last.ss), c=rt(PEN.career);
  const v=Math.max(y==null?0:y,c==null?0:c)*0.6+(y==null?0:y)*0.4;
  return v>=56;
}
// 相手国：日本の0.5〜1.5倍の強さ。タイプの偏りと監督はランダム
function wbcGenCountry(c,J){
  const m=0.5+rnd(), hj=J.F.reduce((t,x)=>t+hitScore(x.f),0)/J.F.length, pj=J.P.reduce((t,x)=>t+pitScore(x.p),0)/J.P.length;
  const bias=pick(['power','contact','speed','defense','balance']), used=new Set();
  const F=[],P=[];
  for(const pos of ['C','C','C','1B','1B','2B','2B','3B','3B','SS','SS','OF','OF','OF','OF','OF','OF']){
    const f=genFielder(pos,ri(23,33),Math.round((hj-50)*m)); f.n=wbcName(c.names,used); f.id='w'+c.id+F.length; f.btype=cpuTypeOf(f,true);
    const ta={power:{p:10,m:-3},contact:{m:10,p:-4},speed:{s:12,p:-4},defense:{d:12,p:-4},balance:{}}[bias]; for(const k in ta) f[k]=clamp(f[k]+ta[k],10,100);
    F.push({f,id:c.id});
  }
  for(let i=0;i<15;i++){ const p=genRosterPitcher(ri(23,33),Math.round((pj-50)*m)); p.name=wbcName(c.names,used); P.push({p,id:c.id}); }
  const mgr=genManager(PEN.year); mgr.sur=wbcName(c.names).split(' ').pop();
  return {id:c.id,F,P,mgr,mult:m,bias,w:0,l:0,rs:0,ra:0};
}
function wbcInit(){
  const J=wbcSelectJapan();
  const champ=PEN.jsChamp&&PEN.jsChamp.y===PEN.year-1?PEN.jsChamp.team:pick(NPB).id;
  const jmgr={...mgrOf(champ)};
  const cs=shuffle(WBC_COUNTRIES.slice()).slice(0,7);
  cs.forEach(c=>{ TEAM[c.id]={...c,lg:''}; }); TEAM.JPN={...WBC_JPN};
  const teams={JPN:{id:'JPN',F:J.F,P:J.P,mgr:jmgr,mult:1,w:0,l:0,rs:0,ra:0}};
  cs.forEach(c=>{ teams[c.id]=wbcGenCountry(c,J); });
  const ids=['JPN',...cs.map(c=>c.id)]; const pool=[ids.slice(0,4),ids.slice(4,8)];
  // 1次ラウンドの日程（各プールで総当たり3節）
  const sched=[[],[],[]]; for(const g of pool){ const [a,b,c,d]=g; sched[0].push([a,b],[c,d]); sched[1].push([a,c],[b,d]); sched[2].push([a,d],[b,c]); }
  PEN.wbc={y:PEN.year,teams,pool,sched,round:0,stage:'pool',results:[],myGames:[],sel:J.me,mgrTeam:champ,jmgr,pstats:{},done:false,gameNo:0};
  const pi=J.P.findIndex(x=>x.me); PEN.wbc.role=!J.me?null:(isBat()||isTW())?{kind:'bat'}:pi<0?null:pi<3?{kind:'start',day:pi+1}:{kind:'relief'};
  penNotice(`🌏 WBC開幕！ 日本代表監督は${TEAM[champ].short}の${jmgr.sur}監督。${J.me?`あなたは${isBat()?'野手':isTW()?'二刀流（指名打者）':'投手'}として代表入り！`:'あなたは選外（2年目以降で通算・去年の評価が高いと選ばれます）'}`);
  if(J.me){ const r=PEN.wbc.role; PEN.talk={y:PEN.year,untilDay:0,text:`${PEN.pname}、日本代表から連絡があった。お前がWBCの代表に選ばれたぞ。代表監督は${TEAM[champ].short}の${jmgr.sur}監督だ。${r&&r.kind==='start'?`先発ローテの${r.day}番手として期待されている。`:r&&r.kind==='relief'?'中継ぎでの起用だそうだ。':'打線の軸として期待されている。'}日の丸を背負って、思いきりやってこい。開幕はそのあとだ。`}; }
}
const wbcSide=id=>{ const T=PEN.wbc.teams[id]; return {F:T.F,P:T.P,mgr:T.mgr}; };
function wbcRecord(a,b,sa,sb,players,my){
  const W=PEN.wbc, TA=W.teams[a], TB=W.teams[b];
  if(sa>sb){ TA.w++; TB.l++; } else { TB.w++; TA.l++; }
  TA.rs+=sa; TA.ra+=sb; TB.rs+=sb; TB.ra+=sa;
  W.results.push({stage:W.stage,a,b,sa,sb,my:my||null});
  if(players) players.forEach(p=>{ const k=p.name+'@'+p.team+'#'+p.kind; const t=W.pstats[k]||(W.pstats[k]={name:p.name,team:p.team,me:!!p.me,kind:p.kind,st:p.kind==='B'?{pa:0,h:0,hr:0,rbi:0,sb:0,run:0}:{outs:0,runs:0,k:0,h:0}}); for(const kk in p.st){ if(!Array.isArray(p.st[kk])) t.st[kk]=(t.st[kk]||0)+(p.st[kk]||0); } });
}
function wbcSimGame(a,b,my){
  const W=PEN.wbc; W.gameNo++;
  const g=asGame(W.gameNo,wbcSide(a),wbcSide(b),{nStart:3,sub:0.3,odd:0,startInn:6});
  let sa=sumN(g.sc.A), sb=sumN(g.sc.B); if(sa===sb){ if(rnd()<0.5) sa++; else sb++; }
  wbcRecord(a,b,sa,sb,g.players.filter(p=>!(p.me&&my)),my);
  return {sa,sb};
}
// 進行：次の試合。自分の出番があれば pending を作る
function wbcNext(){
  const W=PEN.wbc; if(!W||W.done) return false;
  if(PEN.pending) return !!(PEN.pending.kind==='wbc');   // 自分の出番が残っているうちは大会を進めない（日本の試合が飛ばされないように）
  const ids=['JPN'];
  const pairs=wbcPairs(); if(!pairs){ wbcFinish(); return false; }
  for(const [a,b] of pairs){
    if(W.played&&W.played.includes(a+'-'+b)) continue;
    W.played=W.played||[]; W.played.push(a+'-'+b);
    if((a==='JPN'||b==='JPN')&&W.sel&&W.role){
      const opp=a==='JPN'?b:a, gameNo=W.jpnGames=(W.jpnGames||0)+1;
      const kind=W.role.kind==='bat'?'bat':W.role.kind==='start'?((gameNo-1)%3===(W.role.day-1)?'start':null):(rnd()<0.45?'relief':null);
      if(kind){ PEN.pending={day:PEN.day,opp,kind:'wbc',wbcKind:kind,wbcGame:gameNo,wbcPair:[a,b],stage:W.stage,started:false}; return true; }
    }
    wbcSimGame(a,b,null);
  }
  wbcAdvance();
  return false;
}
function wbcPairs(){
  const W=PEN.wbc;
  if(W.stage==='pool'){ if(W.round>=3) return null; const r=W.sched[W.round]; return r; }
  if(W.stage==='semi'){ const [t1,t2]=W.semi; return [[t1[0],t2[1]],[t2[0],t1[1]]]; }
  if(W.stage==='final') return [W.final];
  return null;
}
const wbcRank=g=>g.slice().sort((x,y)=>(PEN.wbc.teams[y].w-PEN.wbc.teams[x].w)||((PEN.wbc.teams[y].rs-PEN.wbc.teams[y].ra)-(PEN.wbc.teams[x].rs-PEN.wbc.teams[x].ra)));
function wbcAdvance(){
  const W=PEN.wbc, done=(W.played||[]).length;
  if(W.stage==='pool'){ const need=(W.round+1)*4; if(done>=need){ W.round++; if(W.round>=3){ W.stage='semi'; W.semi=[wbcRank(W.pool[0]).slice(0,2),wbcRank(W.pool[1]).slice(0,2)]; W.played=[]; } } return; }
  if(W.stage==='semi'){ if(done>=2){ const r=W.results.filter(x=>x.stage==='semi'); W.final=r.map(x=>x.sa>x.sb?x.a:x.b); W.stage='final'; W.played=[]; } return; }
  if(W.stage==='final'){ if(done>=1){ const r=W.results.filter(x=>x.stage==='final')[0]; W.champ=r.sa>r.sb?r.a:r.b; wbcFinish(); } }
}
// 自分の試合を始める（penPlay から）
function wbcPlay(p){
  const W=PEN.wbc, [a,b]=p.wbcPair, opp=p.opp, J=wbcSide('JPN'), O=wbcSide(opp);
  const names={my:{name:'日本',s:'日',id:'JPN'},opp:{name:TEAM[opp].short,s:TEAM[opp].s,id:opp}};
  const jL=asLineup(J), oL=asLineup(O), gp=asPit(O,W.jpnGames,3), gm=asPit(J,W.jpnGames,3);
  const myIdx=jL.findIndex(x=>x.isMe);
  const pen={day:p.day,year:PEN.year,kind:p.wbcKind,role:PEN.role,team:'JPN',opp,wbc:true,wbcGame:p.wbcGame,stage:p.stage};
  showScreen('game');
  if(p.wbcKind==='bat'){
    const myL=jL.map(x=>x.isMe?{...meBatter(),order:x.order,team:PEN.team}:{...plainB(x),team:x.team});
    batNewGame({OPP:{pattern:'standard',hand:'normal'}, lineup:oL.map(x=>({...x,res:[]})), myLineup:myL, myTeam:{name:'日本代表',hand:''},
      pits:[gp.sp,...gp.pen], ours:[gm.sp,...gm.pen.slice(0,2)], defAdj:1, names, pname:PEN.pname, bhand:PEN.bhand||'R', babil:PEN.babil, kind:myIdx>=0?'bat':'pinch', order:myIdx>=0?myIdx+1:9, pinchInning:ri(6,8),
      slot:myIdx>=0?jL[myIdx].slot:'DH', ofSide:PEN.ofSide||(PEN.ofSide=pick(['左','中','右'])), pen, mission:null});
    const Q=batProceed(); renderAll(); save(); if(typeof showTitle==='function') showTitle(); setTimeout(()=>playBack(Q,batAfterPlay),1200); return;
  }
  const myL=jL.map(x=>({...plainB(x),team:x.team}));
  PHAND=PEN.hand; REP=PEN.rep.slice(); PLEV={...PEN.plev}; ptype=REP[0];
  let pre=null;
  if(p.wbcKind==='relief'){
    const T={lineup:oL.map(x=>({...x,res:[]})),order:-1}, M={lineup:myL.map(x=>({...x,res:[]})),order:-1}, E=ri(5,8), sc={opp:[],my:[]}; let ho=0,hm=0;
    for(let i=1;i<E;i++){ const x=simHalf(T,0,[0,0,0],i<=5?gm.sp.q:(gm.pen[(i-6)%gm.pen.length]||gm.sp).q,null); sc.opp.push(x.runs); ho+=x.hits; const y=simHalf(M,0,[0,0,0],i<=5?gp.sp.q:(gp.pen[(i-6)%gp.pen.length]||gp.sp).q,null); sc.my.push(y.runs); hm+=y.hits; }
    pre={entry:E,score:sc,oppOrder:T.order,myOrder:M.order,hitsOpp:ho,hitsMy:hm,oppLineup:T.lineup.map(serB),myLineup:M.lineup,lead:sumN(sc.my)-sumN(sc.opp)}; p.pre=pre;
  }
  newGame(true,{OPP:{pattern:'standard',hand:'normal'}, lineup:pre?pre.oppLineup.map(deB):oL.map(x=>({...x,res:[]})),
    myTeam:{name:'日本代表',hand:'',lineup:pre?pre.myLineup.map(b=>({...b,res:(b.res||[]).slice()})):myL,order:-1},
    names, pname:PEN.pname, pen, pre, abil:PEN.abil, oppPitcher:{...gp.sp}, oppPen:gp.pen.map(x=>({...x})), bullpen:gm.pen.map(x=>({...x})), mission:null});
  renderAll(); save();
}
function wbcGameDone(){
  const W=PEN.wbc, p=PEN.pending; if(!W||!p||p.kind!=='wbc') return;
  const st=G.st, [a,b]=p.wbcPair; let my=myTot(), op=oppTot(); if(my===op){ if(rnd()<0.5) my++; else op++; }
  const sa=a==='JPN'?my:op, sb=a==='JPN'?op:my;
  const bat=G.bat&&!G.tw, myS=bat?{pa:st.pa,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,run:st.run}:{outs:st.outs,runs:st.runs,k:st.k,h:st.hits};
  W.gameNo++; let others=[]; try{ const sh=asGame(W.gameNo,wbcSide(a),wbcSide(b),{nStart:3,sub:0.3,odd:0,startInn:6}); others=sh.players.filter(x=>!x.me); }catch(e){}
  others.push({name:PEN.pname,team:PEN.team,me:true,kind:bat?'B':'P',st:myS});
  const line=bat?batLineTxt(st):`${fmtIP(st.outs)}回${st.runs}失点${G.result&&G.result.dec!=='－'?'・'+G.result.dec:''}`;
  wbcRecord(a,b,sa,sb,others,{kind:p.wbcKind,line,played:true});
  W.myGames.push({stage:p.stage,opp:p.opp,line,res:my>op?'W':'L'});
  PEN.pending=null; wbcAdvance();
}
function wbcSkip(){
  const W=PEN.wbc, p=PEN.pending; if(!W||!p||p.kind!=='wbc') return;
  if(gameIsPending()) closePenGame();
  const [a,b]=p.wbcPair; const r=wbcSimGame(a,b,{kind:p.wbcKind,line:'出場（スキップ）',played:false});
  W.myGames.push({stage:p.stage,opp:p.opp,line:'出場（スキップ）',res:(a==='JPN'?r.sa>r.sb:r.sb>r.sa)?'W':'L'});
  PEN.pending=null; wbcAdvance();
}
function wbcRunAll(){ const W=PEN.wbc; let n=0; while(W&&!W.done&&n++<60){ if(PEN.pending&&PEN.pending.kind==='wbc') wbcSkip(); else if(wbcNext()) wbcSkip(); } }
function wbcFinish(){
  const W=PEN.wbc; if(!W||W.done) return; W.done=true;
  const all=Object.values(W.pstats);
  const bat=all.filter(p=>p.kind==='B'&&p.st.pa>=10).map(p=>({...p,score:mvpScore(p.st)})).sort((x,y)=>y.score-x.score)[0];
  const pit=all.filter(p=>p.kind==='P'&&p.st.outs>=30).map(p=>({...p,score:mvpScore(p.st)})).sort((x,y)=>y.score-x.score)[0];
  const lineB=p=>p?`${p.st.pa}打席${p.st.h}安打${p.st.hr?` ${p.st.hr}本`:''}${p.st.rbi?` ${p.st.rbi}打点`:''}`:'', lineP=p=>p?`${fmtIP(p.st.outs)}回${p.st.runs}失点${p.st.k?` ${p.st.k}奪三振`:''}`:'';
  W.mvpB=bat?{name:bat.name,team:bat.team,me:bat.me,line:lineB(bat)}:null; W.mvpP=pit?{name:pit.name,team:pit.team,me:pit.me,line:lineP(pit)}:null;
  const give=name=>titleAward(name,3,1);   // WBCのMVP：持ち点+3（確定）
  if(bat&&bat.me) give('WBC野手MVP'); if(pit&&pit.me) give('WBC投手MVP');
  if(W.sel){ const bank=PEN.awake||(PEN.awake={bank:0,done:{},log:[]}); bank.log.push({y:PEN.year,name:'WBC日本代表',pts:0,kind:'title'}); }
  if(W.champ==='JPN'){ PEN.titles=PEN.titles||[]; if(W.sel) PEN.titles.push({y:PEN.year,name:'WBC優勝'}); }
  penNotice(`🌏 WBC閉幕：優勝は${TEAM[W.champ].name}${W.champ==='JPN'?'！ 日本が世界一！':''}。野手MVP ${W.mvpB?`${W.mvpB.name}（${TEAM[W.mvpB.team].short}）`:'-'}／投手MVP ${W.mvpP?`${W.mvpP.name}（${TEAM[W.mvpP.team].short}）`:'-'}`);
  PEN.wbcHist=PEN.wbcHist||[]; PEN.wbcHist.push({y:W.y,champ:W.champ,sel:W.sel,mvpB:W.mvpB,mvpP:W.mvpP,my:W.myGames});
  // 各国の選手データはセーブに残さない（勝敗などの表示用だけ残す）
  for(const id in W.teams){ const t=W.teams[id]; W.teams[id]={id,w:t.w,l:t.l,rs:t.rs,ra:t.ra,mult:t.mult}; } W.pstats={};
  PEN.pending=null;
}
// penStep から：WBC中はここで進める
function wbcStep(){
  const W=PEN&&PEN.wbc; if(!W||W.done||PEN.pending) return false;
  if(!W.sel){ wbcRunAll(); return false; }
  wbcNext(); return !W.done;   // 「次の試合へ」でもWBCが1試合ずつ進む（出番があれば pending）
}
function wbcHTML(){
  const W=PEN&&PEN.wbc; if(!W) return '';
  const T=id=>TEAM[id]?tchip(id):id, tm=id=>W.teams[id];
  const poolHTML=W.pool.map((g,i)=>`<div class="wbcpool"><b>${'AB'[i]}</b>${wbcRank(g).map(id=>`<div class="wbct">${T(id)}<small>${tm(id).w}勝${tm(id).l}敗</small></div>`).join('')}</div>`).join('');
  const res=W.results.slice(-8).map(r=>`<div class="hint">${{pool:'1次',semi:'準決勝',final:'決勝'}[r.stage]}：${T(r.a)} ${r.sa}−${r.sb} ${T(r.b)}${r.my?`　<span style="color:var(--accent)">あなた ${r.my.line}</span>`:''}</div>`).join('');
  const stage={pool:`1次ラウンド 第${Math.min(3,W.round+1)}節`,semi:'準決勝',final:'決勝'}[W.stage];
  const my=W.sel?`<div class="hint">あなた：${isBat()?'野手':isTW()?'二刀流':'投手'}で代表入り${W.role&&W.role.kind==='start'?`（先発ローテ${W.role.day}番手）`:W.role&&W.role.kind==='relief'?'（中継ぎ）':''}${W.myGames.length?`　${W.myGames.map(g=>`vs${TEAM[g.opp].short} ${g.line}`).join('／')}`:''}</div>`:'<div class="hint">あなたは選外</div>';
  const mvp=W.done?`<div>🏆 優勝：<b>${TEAM[W.champ].name}</b>　野手MVP：${W.mvpB?`${W.mvpB.name}（${TEAM[W.mvpB.team].short}）${W.mvpB.line}${W.mvpB.me?' <b style="color:var(--accent)">あなた</b>':''}`:'-'}　投手MVP：${W.mvpP?`${W.mvpP.name}（${TEAM[W.mvpP.team].short}）${W.mvpP.line}${W.mvpP.me?' <b style="color:var(--accent)">あなた</b>':''}`:'-'}</div>`:'';
  return `<div class="sh2">🌏 WBC（${W.y}年目）${W.done?'　閉幕':`　${stage}`}</div><div class="pcardx" style="font-size:13px;line-height:1.6">
    <div class="hint">日本代表監督：${TEAM[W.mgrTeam].short}の${W.jmgr.sur}監督（前年日本一）　相手国の強さは日本の0.5〜1.5倍</div>
    ${poolHTML}${res}${my}${mvp}
    ${!W.done&&W.sel?`<div class="row" style="margin-top:8px"><button class="btn main" id="wbcNext" style="margin:0">▶ 次の試合へ</button><button class="btn" id="wbcAll">まとめて進める</button></div>`:''}
  </div>`;
}
function wbcBind(el){
  const a=el.querySelector('#wbcNext'), b=el.querySelector('#wbcAll');
  if(a) a.onclick=()=>{ if(PEN.pending&&PEN.pending.kind==='wbc'){ const c=document.querySelector('.pcardx.hi'); if(c) c.scrollIntoView(); return; } wbcNext(); renderPennant(); save(); window.scrollTo(0,0); };
  if(b) b.onclick=()=>{ wbcRunAll(); renderPennant(); save(); window.scrollTo(0,0); };
}

// セーブから開いたとき：国チームの色・名前をTEAMに戻す
function wbcRestoreTeams(){
  if(!PEN) return; TEAM.JPN=TEAM.JPN||{...WBC_JPN};
  const ids=new Set(); if(PEN.wbc) Object.keys(PEN.wbc.teams).forEach(id=>ids.add(id)); (PEN.wbcHist||[]).forEach(h=>{ ids.add(h.champ); if(h.mvpB) ids.add(h.mvpB.team); if(h.mvpP) ids.add(h.mvpP.team); });
  ids.forEach(id=>{ if(!TEAM[id]){ const c=WBC_COUNTRIES.find(x=>x.id===id); if(c) TEAM[id]={...c,lg:''}; } });
}
