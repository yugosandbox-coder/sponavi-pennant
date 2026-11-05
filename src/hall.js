
/* ================================================================
   戦力外のあと：トライアウト → 監督からの電話で復帰 or 引退 → 歴代選手 → マイチーム → リンクで送り合ってオート対戦
   ・トライアウト：投手は1イニング、野手は10打席。二刀流は両方か、片方に絞る（絞った方だけで登録）。1年に1回、人生で2回まで
   ・相手は全球団のトライアウト選手。ここだけの成績＋通算成績＋チーム事情で、欲しい球団の監督から電話が来る
   ・電話が来なければ引退するか、1年待って（年齢を重ねて）もう一度だけ受けられる
   ・引退した選手は歴代選手として登録できる（年度別成績、キャリアハイの年を選べる）
   ・キャリアハイ時点の選手でマイチームを作り、テキストのリンク（コード）で送り合い、オールオートで対戦
   ================================================================ */
let HALL=[], MYTEAM={name:'',ids:[]}, RCV=[];
const TRYOUT_MAX=2, TRYOUT_PA=10;

/* ---- トライアウトの相手（各球団から外れた選手たち） ---- */
function tryoutFielders(){ return ['C','1B','2B','3B','SS','OF','OF','OF','1B'].map(pos=>genFielder(pos,ri(24,33),ri(-12,-3))); }
function tryoutPitchers(n){ const a=[]; for(let i=0;i<n;i++) a.push(genRosterPitcher(ri(24,33),ri(-12,-2))); return a; }
function tryoutStart(mode){   // mode: 'P' 投手だけ／'B' 野手だけ／'W' 両方
  if(!PEN||!PEN.released||(PEN.tryoutN||0)>=TRYOUT_MAX) return;
  if(PEN.tryout&&PEN.tryout.stage==='result'){ tryoutNextYear(); }   // 去年受けていれば1年たつ
  PEN.tryoutN=(PEN.tryoutN||0)+1;
  PEN.tryout={n:PEN.tryoutN,mode,pitch:null,bat:null,offer:null,stage:'go',hist:PEN.tryout&&PEN.tryout.hist||[]};
  renderPennant(); save();
}
const tryoutNeedP=()=>PEN.tryout&&(PEN.tryout.mode==='P'||PEN.tryout.mode==='W')&&!PEN.tryout.pitch;
const tryoutNeedB=()=>PEN.tryout&&(PEN.tryout.mode==='B'||PEN.tryout.mode==='W')&&!PEN.tryout.bat;
// 投手：9回（同点）の1イニングを投げる
function tryoutPlayP(){
  if(!tryoutNeedP()) return;
  const lineup=tryoutFielders().map((f,i)=>toBatter(f,i+1));
  const sc={opp:[],my:[]}; let ho=0,hm=0; for(let i=1;i<9;i++){ const r=ri(0,2); sc.opp.push(r); sc.my.push(r); ho+=ri(0,2); hm+=ri(0,2); }
  PHAND=PEN.hand; REP=PEN.rep.slice(); PLEV={...PEN.plev}; ptype=REP[0];
  showScreen('game');
  newGame(true,{OPP:{pattern:'standard',hand:'normal'}, lineup, myTeam:genTeam(),
    names:{my:{name:'トライアウト',s:'ト'},opp:{name:'選抜',s:'選'}},
    pname:PEN.pname, pen:{day:-1,year:PEN.year,kind:'closer',role:'抑え',team:PEN.team,opp:null,tryout:true},
    pre:{entry:9,score:sc,oppOrder:ri(0,8),myOrder:ri(0,8),hitsOpp:ho,hitsMy:hm,lead:0}, abil:PEN.abil,
    oppPitcher:genPitcher(), oppPen:tryoutPitchers(3), bullpen:tryoutPitchers(5), mission:null});
  addLog(`<div class="chg">🧢 12球団合同トライアウト：9回の1イニングを投げる（相手はトライアウト選抜打線）</div>`);
  renderAll(); save();
}
// 野手：1番で10打席
function tryoutPlayB(){
  if(!tryoutNeedB()) return;
  const opp=tryoutFielders().map((f,i)=>toBatter(f,i+1)).map(b=>({...b,res:[]}));
  const mine=genTeam().lineup;
  const pits=tryoutPitchers(4), ours=tryoutPitchers(3);
  showScreen('game');
  batNewGame({OPP:{pattern:'standard',hand:'normal'}, lineup:opp, myLineup:mine, myTeam:{name:'トライアウト選抜',hand:''},
    pits, ours, defAdj:1, names:{my:{name:'トライアウト',s:'ト'},opp:{name:'選抜',s:'選'}},
    pname:PEN.pname, bhand:PEN.bhand, babil:PEN.babil, kind:'bat', order:1,
    pen:{day:-1,year:PEN.year,kind:'bat',role:'スタメン',team:PEN.team,opp:null,tryout:true}, mission:null});
  G.tryout=true;
  addLog(`<div class="chg">🧢 12球団合同トライアウト：1番で10打席（相手はトライアウト選抜投手）</div>`);
  const Q=batProceed(); renderAll(); save();
  if(typeof showTitle==='function') showTitle();
  setTimeout(()=>playBack(Q,batAfterPlay),1200);
}
// 試合が終わったら成績を残す
function tryoutGameDone(){
  const t=PEN.tryout; if(!t) return;
  if(G.bat){ const s=G.st; t.bat={pa:s.pa,ab:s.ab,h:s.h,d2:s.d2,d3:s.d3,hr:s.hr,bb:s.bb+s.hbp,k:s.k,rbi:s.rbi}; }
  else { const s=G.st; t.pitch={outs:s.outs,runs:s.runs,hits:s.hits,k:s.k,bb:s.bb,pitches:s.pitches}; }
  tryoutAdvance();
}
// スキップ：おまかせで結果だけ
function tryoutSkip(){
  const t=PEN.tryout; if(!t) return;
  if(tryoutNeedP()){
    const q=pitQ({velo:PEN.abil.velo,control:PEN.abil.control,types:PEN.rep,plv:PEN.plev,levs:{}});
    const T={lineup:tryoutFielders().map((f,i)=>toBatter(f,i+1)),order:-1};
    const r=simHalf(T,0,[0,0,0],q,null);
    t.pitch={outs:3,runs:r.runs,hits:r.hits,k:r.pas.filter(p=>/三振/.test(p.label)).length,bb:r.pas.filter(p=>p.label==='四球').length,pitches:ri(12,22),pulled:false,auto:true};
  }
  if(tryoutNeedB()){
    const A=PEN.babil, s={pa:0,ab:0,h:0,d2:0,d3:0,hr:0,bb:0,k:0,rbi:0,auto:true};
    for(let i=0;i<TRYOUT_PA;i++){ const k=autoKind(A); s.pa++; if(k==='BB'||k==='HBP') s.bb++; else s.ab++; if(k==='K') s.k++;
      if(['1B','IFH','2B','3B','HR'].includes(k)){ s.h++; if(k==='2B') s.d2++; if(k==='3B') s.d3++; if(k==='HR'){ s.hr++; s.rbi++; } } }
    t.bat=s;
  }
  tryoutAdvance();
}
function tryoutAdvance(){
  const t=PEN.tryout;
  if(tryoutNeedP()||tryoutNeedB()){ renderPennant(); save(); return; }
  t.offer=tryoutOffer(t); t.stage='result';
  t.hist.push({n:t.n,mode:t.mode,pitch:t.pitch,bat:t.bat,offer:t.offer?{team:t.offer.team,pos:t.offer.pos}:null});
  renderPennant(); save();
}
/* ---- 評価：トライアウトの成績＋通算成績＋チーム事情 ---- */
function tryoutScores(t){
  const age=PEN.age||30, agePen=age>32?(age-32)*2.5:0;
  let sP=null, sB=null;
  if(t.pitch){ const p=t.pitch; const ts=clamp(52+p.k*7-p.runs*14-p.hits*5-p.bb*4-(p.outs<3?18:0),0,100);
    const cr=mgrRating(null,PEN.career); const career=cr==null?abilityR():cr; sP=r1(ts*0.55+career*0.45-agePen); }
  if(t.bat){ const b=t.bat; const ts=clamp(28+b.h*9+b.hr*8+(b.d2+b.d3)*3+b.bb*3-b.k*4,0,100);   // 10打席で3安打なら55くらい
    const cb=mgrRatingB(null,isBat()?PEN.career:(PEN.bcareer||batStat())); const career=cb==null?abilityRB():cb; sB=r1(ts*0.55+career*0.45-agePen); }
  return {sP,sB};
}
// 球団ごとの「足りなさ」。投手：ローテーション6人目／野手：守れる位置のいちばん強い選手
function teamNeedP(T){ const rot=staff(T).rot; return 60-Math.min(...rot.map(pitScore)); }
function teamNeedB(T){ const ps=myPositions(); let best=0; ps.forEach(pos=>{ T.F.filter(f=>f.pos===pos).forEach(f=>{ best=Math.max(best,posValue(f,pos)); }); }); return 60-best; }
function tryoutOffer(t){
  const {sP,sB}=tryoutScores(t), TH=50, cands=[];
  for(const tm of NPB){ const T=PEN.teams[tm.id];
    if(sP!=null){ const need=teamNeedP(T), v=sP+need*0.6; if(v>=TH) cands.push({team:tm.id,pos:'P',v,need,score:sP}); }
    if(sB!=null){ const need=teamNeedB(T), v=sB+need*0.6; if(v>=TH) cands.push({team:tm.id,pos:'B',v,need,score:sB}); }
  }
  if(!cands.length) return null;
  cands.sort((a,b)=>b.v-a.v);
  const best=cands[0];
  // 二刀流で両方受けて、同じ球団が投打どちらも欲しがっていれば二刀流のまま
  if(t.mode==='W'){ const other=cands.find(c=>c.team===best.team&&c.pos!==best.pos); if(other) return {...best,pos:'W',both:true}; }
  return best;
}
/* ---- 復帰 ---- */
function tryoutAccept(){
  const t=PEN.tryout, o=t&&t.offer; if(!o) return;
  const from=PEN.team, oldPos=PEN.pos;
  PEN.team=o.team; PEN.released=false; PEN.retired=false; PEN.joinY=PEN.year+1;
  const newPos = o.pos==='W' ? 'W' : (t.mode==='W' ? o.pos : PEN.pos);   // 片方に絞ったら、その方だけで登録
  if(newPos!==oldPos){
    PEN.pos=newPos;
    if(newPos==='B'){ PEN.bposs=PEN.bposs&&PEN.bposs.length?PEN.bposs:['OF']; PEN.bpos=PEN.bposs[0]; if(!PEN.babil.def) PEN.babil.def=45;
      PEN.ss=PEN.bss||batStat(); PEN.career=PEN.bcareer||batStat(); PEN.role='代打'; }
    else if(newPos==='P'){ PEN.ss=penStat(); PEN.career=PEN.pcareer||PEN.career; PEN.role='中継ぎ'; }
  }
  if(PEN.pos==='B'){ PEN.role='代打'; } else { PEN.role=isStarter(PEN.role)?'裏ローテ':'中継ぎ'; }
  PEN.salary=Math.max(10000000,Math.round(PEN.salary*0.6/1000000)*1000000);
  PEN.trades=PEN.trades||[]; PEN.trades.push({y:PEN.year+1,from,to:o.team,tryout:true});
  { const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]}); A.bank=r1((A.bank||0)+5); A.log.push({y:PEN.year,name:'トライアウト合格',pts:5}); }   // トライアウト成功で持ち点+5（次のキャンプ）
  awakeTransfer(from,o.team);
  t.stage='done'; PEN.tryoutDone=(PEN.tryoutDone||[]).concat(t.hist); PEN.tryout=null;
  seasonRollover(PEN.relFin||null);
  PEN.notices.unshift({d:0,y:PEN.year,t:`トライアウトを経て${TEAM[o.team].name}に入団（${roleName(PEN.role)}・年俸${yen(PEN.salary)}）`});
  renderPennant(); save();
}
function tryoutDecline(){ const t=PEN.tryout; if(!t) return; t.offer=null; t.declined=true; renderPennant(); save(); }
// 1年たつ（戦力外のまま）：年齢と年数が進み、他球団の選手も入れ替わる
function tryoutNextYear(){
  PEN.age=(PEN.age||22)+1; PEN.year++;
  try{ rosterNewSeason(PEN.relFin||null); mgrChangeCheck(PEN.relFin||null); NPB.forEach(t=>{ PEN.teams[t.id].rec={w:0,l:0,t:0}; }); rebuildAll(); }catch(e){}
  PEN.relFin=null;
}
function tryoutRetire(){ PEN.retired=true; PEN.tryout=null; PEN.hallAsk=true; renderPennant(); save(); }
/* ---- 歴代選手 ---- */
function autoBest(seasons,pos){
  let bi=0,bv=-1e9;
  seasons.forEach((s,i)=>{ const ss=s.ss||{}; let v;
    if(pos==='B'||(ss.pa!=null)){ v=(ss.pa||0)>=100?(bObp(ss)+bSlg(ss))*100+(ss.hr||0)*0.3+(ss.h||0)*0.05:(ss.pa||0)*0.01; }
    else { v=(ss.outs||0)>=60?80-(ss.runs||0)*27/Math.max(1,ss.outs)*8+(ss.w||0)*1.5+(ss.sv||0)*0.8+(ss.hld||0)*0.5+(ss.k||0)*0.05:(ss.outs||0)*0.01; }
    if(s.titles&&s.titles.length) v+=10*s.titles.length;
    if(v>bv){ bv=v; bi=i; } });
  return bi;
}
function makeHallEntry(){
  const seasons=PEN.seasons.map(s=>({year:s.year,age:s.age??(18+s.year-1),team:s.team,role:s.role,pos:s.pos||PEN.pos,ss:s.ss,bss:s.bss,rank:s.rank,salary:s.salary,titles:s.titles||[],feats:s.feats||[],
    abil:s.abil||{...PEN.abil},babil:s.babil||(PEN.babil?{...PEN.babil}:null),rep:s.rep||PEN.rep.slice(),plev:s.plev||{...PEN.plev},bposs:s.bposs||PEN.bposs||null,hand:s.hand||PEN.hand,bhand:s.bhand||PEN.bhand}));
  const e={id:'h'+Date.now().toString(36)+Math.floor(rnd()*1e6).toString(36),name:PEN.pname,genius:!!PEN.genius,pos:PEN.pos,hand:PEN.hand,bhand:PEN.bhand,draft:PEN.draft||null,
    teams:[...new Set(seasons.map(s=>s.team))],years:seasons.length,age:PEN.age,seasons,titles:PEN.titles||[],career:PEN.career,bcareer:PEN.bcareer||null,
    tryouts:PEN.tryoutDone||[],awake:(PEN.awake&&PEN.awake.log)||[],at:Date.now()};
  e.best=autoBest(seasons,PEN.pos==='B'?'B':'P');
  return e;
}
function hallRegister(yes){
  if(yes&&PEN.seasons&&PEN.seasons.length){ HALL.push(makeHallEntry()); }
  PEN.hallAsk=false; PEN.hallDone=yes?'yes':'no';
  renderPennant(); save();
}
const hallSeasonLine=s=>{ const ss=s.ss||{}; return ss.pa!=null ? `${ss.g}試合 打率${ss.ab?f3(bAvg(ss)):'-'} ${ss.hr}本 ${ss.rbi}打点 ${ss.sb}盗塁 OPS${ss.pa?f3(bObp(ss)+bSlg(ss)):'-'}` : `${ss.g}登板 ${ss.w}勝${ss.l}敗${ss.sv}S${ss.hld}H 防${fmtRate(ss.runs,ss.outs)} ${fmtIP(ss.outs)}回 K${ss.k}`; };
const hallAbilTxt=s=>{ const a=s.abil||{}, b=s.babil; const P=(s.pos==='P'||s.pos==='W')&&a.velo?`${a.velo}km/h・制球${a.control}・スタミナ${a.stamina}${s.rep&&s.rep.length>1?'・'+s.rep.slice(1).map(t=>`${ptn(t)}${s.plev&&s.plev[t]?'Lv'+s.plev[t]:''}`).join('/'):''}`:''; const B=(s.pos==='B'||s.pos==='W')&&b?`ミート${b.meet}・パワー${b.power}・速度${b.speed}・選球眼${b.eye}${s.pos==='B'?'・守備'+(b.def??50):''}`:''; return [P,B].filter(Boolean).join('<br>'); };
/* ---- 戦力外のあとの画面 ---- */
function renderReleased(el){
  const P=PEN, t=P.tryout, left=TRYOUT_MAX-(P.tryoutN||0), W=P.pos==='W', B=P.pos==='B';
  const careerLine = B ? batLine(P.career) : statLine(P.career)+(W&&P.bcareer?'<br>打撃：'+batLine(P.bcareer):'');
  let body='';
  if(P.retired){
    body=`<h2>引退</h2><div class="pcardx">${P.pname}（${P.age}歳）は現役を引退しました。${P.seasons.length}年間、おつかれさまでした。</div>
      ${P.hallAsk?`<div class="pcardx hi"><div class="sh2" style="margin-top:0">🏛 歴代選手として登録しますか？</div>
        <div class="hint">登録すると、年度別の成績と能力が残り、キャリアハイの年の姿でマイチームに入れられます。</div>
        <div class="row" style="margin-top:8px"><button class="btn main" id="hallYes" style="margin:0">登録する</button><button class="btn" id="hallNo">登録しない</button></div></div>`
      : P.hallDone==='yes'?`<div class="pcardx">🏛 歴代選手に登録しました（メニューの「歴代選手・マイチーム」から見られます）</div>`:''}
      ${P.titles.length?`<div class="sh2">獲得タイトル</div><div class="pcardx">${titleList()}</div>`:''}
      <div class="sh2">通算</div><div class="pcardx" style="font-size:13px">${careerLine}</div>
      ${seasonTable()}
      ${P.hallAsk?'':`<button class="btn main" id="penNew">新しいペナントを始める</button><button class="btn" id="penMode" style="width:100%;margin-top:8px">メニューへ</button>`}`;
  }else if(t&&t.stage==='go'){
    const need=[tryoutNeedP()?'投手（1イニング）':null,tryoutNeedB()?`野手（${TRYOUT_PA}打席）`:null].filter(Boolean);
    body=`<h2>🧢 12球団合同トライアウト（${t.n}回目・${P.age}歳）</h2>
      <div class="pcardx">全球団から外れた選手が集まるトライアウト（1年に1回、人生で${TRYOUT_MAX}回まで）。相手はその選抜チームです。<br>ここでの成績と通算成績、そして各球団の台所事情で、欲しがる球団があれば監督から電話が来ます。</div>
      ${t.pitch?`<div class="pcardx">投手：${tryoutPitchLine(t.pitch)}</div>`:''}${t.bat?`<div class="pcardx">野手：${tryoutBatLine(t.bat)}</div>`:''}
      <div class="sh2">残り：${need.join('・')}</div>
      ${G&&G.pen&&G.pen.tryout&&!G.over&&!G.penDone?`<button class="btn main" id="toCont">▶ トライアウトの試合の続きへ</button>`:`${tryoutNeedP()?`<button class="btn main" id="toP">⚾ 1イニング投げる</button>`:''}
      ${tryoutNeedB()?`<button class="btn main" id="toB">🏏 ${TRYOUT_PA}打席に立つ</button>`:''}`}
      <button class="btn" id="toSkip" style="width:100%;margin-top:8px">⏩ おまかせで結果だけ見る</button>`;
  }else if(t&&t.stage==='result'){
    const o=t.offer, {sP,sB}=tryoutScores(t);
    const lines=`${t.pitch?`<div>投手：${tryoutPitchLine(t.pitch)}　<small>評価 ${sP}</small></div>`:''}${t.bat?`<div>野手：${tryoutBatLine(t.bat)}　<small>評価 ${sB}</small></div>`:''}`;
    body=`<h2>🧢 トライアウト結果（${t.n}回目）</h2><div class="pcardx">${lines}<div class="hint">評価＝トライアウトの成績55%＋通算成績45%（33歳を超えると下がる）。球団の足りない所と合わせて、欲しがるかどうかが決まります。</div></div>`;
    if(o){ const m=mgrOf(o.team), tm=TEAM[o.team];
      body+=`<div class="pcardx hi trade"><div class="sh2" style="margin-top:0">📞 ${tm.name}の${mgrName(m)}から電話</div>
        <div class="msay"><div class="mimg">${svgManager(tm,m)}<div class="mlab">${mgrName(m)}<br>${mgrBadges(m)}</div></div><div class="bub r">${P.pname}か。トライアウト、見させてもらった。うちは${o.pos==='P'?'投手':o.pos==='B'?'野手':'投打とも'}が足りなくてな。${o.pos==='W'?'二刀流のまま':o.pos==='P'?'投手として':'野手として'}、うちで${PEN.age>=33?'もうひと花咲かせて':'やり直して'}みないか。年俸は${yen(Math.max(10000000,Math.round(P.salary*0.6/1000000)*1000000))}からだ。</div></div>
        <div class="row" style="margin-top:8px"><button class="btn main" id="toYes" style="margin:0">入団する</button><button class="btn" id="toNo">断る</button></div></div>`;
    }else{
      body+=`<div class="pcardx bad">電話は鳴らなかった…。${t.declined?'':'どの球団も獲得には動かなかった。'}</div>
        ${left>0?`<button class="btn main" id="toAgain">1年待って、もう一度トライアウトを受ける（${P.age+1}歳・人生であと${left}回）</button>`:`<div class="hint">トライアウトは人生で${TRYOUT_MAX}回まで。これ以上は受けられません。</div>`}
        <button class="btn ${left>0?'':'main'}" id="toRetire" style="width:100%;margin-top:8px">引退する</button>`;
    }
  }else{
    body=`<h2>戦力外通告</h2>
      <div class="pcardx bad">${P.year}年目の成績と通算成績が評価されず、<b>戦力外（年俸0円）</b>となりました。</div>
      <div class="pcardx" style="font-size:13px">${careerLine}</div>
      ${P.tryout&&P.tryout.hist&&P.tryout.hist.length?'':''}
      ${left>0?`<div class="sh2">12球団合同トライアウト（1年に1回・人生であと${left}回）</div>
        ${W?`<button class="btn main" data-to="W">投打の両方で受ける（二刀流のまま）</button>
             <button class="btn main" data-to="P" style="margin-top:8px">投手に絞って受ける（投手だけで登録）</button>
             <button class="btn main" data-to="B" style="margin-top:8px">野手に絞って受ける（野手だけで登録）</button>`
          :`<button class="btn main" data-to="${B?'B':'P'}">トライアウトを受ける（${B?TRYOUT_PA+'打席':'1イニング'}）</button>`}`
        :`<div class="hint">トライアウトはもう受けられません。</div>`}
      <button class="btn" id="toRetire" style="width:100%;margin-top:8px">引退する</button>
      ${P.titles.length?`<div class="sh2">獲得タイトル</div><div class="pcardx">${titleList()}</div>`:''}
      ${seasonTable()}`;
  }
  el.innerHTML=`<div class="pen">${body}</div>`;
  const on=(id,f)=>{ const e=document.getElementById(id); if(e) e.onclick=f; };
  el.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>tryoutStart(b.dataset.to));
  on('toP',tryoutPlayP); on('toB',tryoutPlayB); on('toSkip',tryoutSkip); on('toCont',()=>showScreen('game'));
  on('toYes',tryoutAccept); on('toNo',tryoutDecline); on('toAgain',()=>tryoutStart(PEN.tryout.mode)); on('toRetire',tryoutRetire);
  on('hallYes',()=>hallRegister(true)); on('hallNo',()=>hallRegister(false));
  on('penNew',()=>{ PEN=null; openSetup('pennant'); }); on('penMode',()=>showScreen('mode'));
}
const tryoutPitchLine=p=>`${fmtIP(p.outs)}回 ${p.runs}失点 被安打${p.hits} 奪三振${p.k} 四球${p.bb}${p.outs<3?'（途中で打ち切り）':''}${p.auto?'（おまかせ）':''}`;
const tryoutBatLine=b=>`${b.ab}打数${b.h}安打${b.hr?` ${b.hr}本塁打`:''}${b.bb?` ${b.bb}四死球`:''}${b.k?` ${b.k}三振`:''}${b.auto?'（おまかせ）':''}`;

/* ================= マイチーム・リンク・オート対戦 ================= */
// 歴代選手 → チームの選手データ（キャリアハイの年の能力）
function hallPlayer(e){
  const s=e.seasons[Math.min(e.best||0,e.seasons.length-1)]||e.seasons[0]; if(!s) return null;
  const out={id:e.id,name:e.name,pos:s.pos||e.pos,year:s.year,age:s.age,team:s.team,line:hallSeasonLine(s),titles:s.titles||[]};
  if(out.pos!=='B'&&s.abil){ out.P={isP:true,name:e.name,num:MYNUM,hand:s.hand||'R',age:s.age,velo:Math.round(s.abil.velo),control:Math.round(s.abil.control),stamina:Math.round(s.abil.stamina),types:s.rep.slice(),plv:{...s.plev}}; out.P.kime=null; { let bl=0; for(const t in out.P.plv) if(out.P.plv[t]>bl){ bl=out.P.plv[t]; out.P.kime=t; } if(bl<3) out.P.kime=null; } out.P.levs=levsFrom(out.P); out.P.style='mix'; out.P.q=pitQ(out.P); }
  if(out.pos!=='P'&&s.babil){ const b=s.babil; out.F={id:e.id,n:e.name,pos:(s.bposs&&s.bposs[0])||'OF',h:s.bhand||'R',m:Math.round(b.meet),p:Math.round(b.power),s:Math.round(b.speed),e:Math.round(b.eye),d:Math.round(b.def??45),age:s.age,pf:0,num:B_NUM}; }
  return out;
}
// マイチームの中身（送る形）
function teamPack(ids,name){
  const ps=ids.map(id=>HALL.find(e=>e.id===id)).filter(Boolean).map(hallPlayer).filter(Boolean);
  return {v:1,n:name||'マイチーム',p:ps.map(x=>({n:x.name,pos:x.pos,y:x.year,age:x.age,t:x.team,line:x.line,ti:x.titles,P:x.P?{h:x.P.hand,v:x.P.velo,c:x.P.control,s:x.P.stamina,r:x.P.types,l:x.P.plv}:null,F:x.F?{pos:x.F.pos,h:x.F.h,m:x.F.m,p:x.F.p,s:x.F.s,e:x.F.e,d:x.F.d}:null}))};
}
function packToText(pack){ return 'BBTEAM1.'+btoa(unescape(encodeURIComponent(JSON.stringify(pack)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function textToPack(txt){
  try{ const m=String(txt||'').replace(/\s+/g,'').match(/BBTEAM1\.([A-Za-z0-9_-]+)/); if(!m) return null;
    let b=m[1].replace(/-/g,'+').replace(/_/g,'/'); while(b.length%4) b+='=';
    const o=JSON.parse(decodeURIComponent(escape(atob(b)))); if(!o||!Array.isArray(o.p)) return null;
    o.n=String(o.n||'相手チーム').slice(0,16); o.p=o.p.slice(0,30).map(x=>({...x,n:String(x.n||'選手').slice(0,12)})); return o;
  }catch(e){ return null; }
}
// 送る形 → 試合で使うチーム（足りない所は平均的な選手で埋める）
function packToTeam(pack){
  const F=[], P=[];
  pack.p.forEach((x,i)=>{
    if(x.P){ const p={isP:true,name:x.n,num:ri(11,69),hand:x.P.h==='L'?'L':'R',age:x.age||28,velo:clamp(+x.P.v||140,110,165),control:clamp(+x.P.c||50,0,100),stamina:clamp(+x.P.s||50,0,100),types:PTYPES.filter(t=>t==='ストレート'||(x.P.r||[]).includes(t)),plv:{},style:'mix',hall:true};
      for(const t of p.types) p.plv[t]=clamp(Math.round(+(x.P.l||{})[t]||(t==='ストレート'?3:1)),1,7);
      let bl=0,k=null; for(const t in p.plv) if(p.plv[t]>bl){ bl=p.plv[t]; k=t; } p.kime=bl>=3?k:null; p.levs=levsFrom(p); p.q=pitQ(p); P.push(p); }
    if(x.F){ const f=x.F; F.push({id:'x'+i,n:x.n,pos:POSS.includes(f.pos)?f.pos:'OF',h:f.h==='L'?'L':'R',m:clamp(+f.m||50,0,100),p:clamp(+f.p||50,0,100),s:clamp(+f.s||50,0,100),e:clamp(+f.e||50,0,100),d:clamp(+f.d||50,0,100),age:x.age||28,pf:0,num:ri(0,99),hall:true}); }
  });
  const need={C:1,'1B':1,'2B':1,'3B':1,SS:1,OF:3};
  for(const pos in need){ let n=F.filter(f=>f.pos===pos).length; while(n++<need[pos]){ const f=genFielder(pos,27,0); f.fill=true; F.push(f); } }
  while(F.length<10){ const f=genFielder(pick(POSS),27,0); f.fill=true; F.push(f); }
  while(P.length<8){ const p=genRosterPitcher(27,0); p.fill=true; P.push(p); }
  return {name:pack.n,F,P};
}
// オールオートの1試合
function simTeamGame(A,B,gi){
  const lu=T=>{ const st=battingOrder(pickStarters(T,null)); return {lineup:st.map((x,i)=>toBatter(x.f,i+1)),order:-1,fdef:st.filter(x=>x.slot!=='DH').reduce((t,x)=>t+x.f.d,0)/8}; };
  const LA=lu(A), LB=lu(B), rA=staff(A), rB=staff(B), g=gi||0;
  const spA=rA.rot[g%Math.max(1,rA.rot.length)], spB=rB.rot[g%Math.max(1,rB.rot.length)];
  const penA=rA.pen.length?rA.pen:rA.rot, penB=rB.pen.length?rB.pen:rB.rot;
  const pq=(sp,pen,inn)=>inn<=6?sp.q:pen[(inn-7)%pen.length].q;
  const dq=f=>clamp(1-(f-50)*0.003,0.9,1.1);
  const sc={a:[],b:[]}, ev=[]; let ha=0,hb=0;
  for(let inn=1;inn<=12;inn++){
    const t=simHalf(LB,0,[0,0,0],pq(spA,penA,inn)*dq(LA.fdef),null); sc.b.push(t.runs); hb+=t.hits; if(t.ev.length) ev.push(`${inn}回表 ${B.name}：${t.ev.join(' / ')}`);
    const totA=sumN(sc.a), totB=sumN(sc.b);
    if(inn>=9&&totA>totB){ sc.a.push('x'); break; }
    const need=inn>=9?totB-totA+1:null;
    const u=simHalf(LA,0,[0,0,0],pq(spB,penB,inn)*dq(LB.fdef),need); sc.a.push(u.runs); ha+=u.hits; if(u.ev.length) ev.push(`${inn}回裏 ${A.name}：${u.ev.join(' / ')}${u.walkoff?'（サヨナラ）':''}`);
    if(inn>=9&&sumN(sc.a)!==sumN(sc.b)) break;
  }
  const a=sumN(sc.a), b=sumN(sc.b);
  return {sc,a,b,ha,hb,ev,res:a>b?'W':a<b?'L':'T',spA:spA.name,spB:spB.name,luA:LA.lineup,luB:LB.lineup};
}
let HV={tab:'team',sel:null,res:null,code:''};
function hallMemberHTML(e,inTeam){
  const hp=hallPlayer(e); if(!hp) return '';
  return `<div class="lrn"><b>${e.name}</b>${e.genius?' <span class="genius">✨ 天才</span>':''} <small>${hp.pos==='P'?'投手':hp.pos==='B'?POS_JP[(hp.F&&hp.F.pos)||'OF']:'二刀流'}・${hp.year}年目（${hp.age}歳）${hp.team?tchip(hp.team):''}</small>
    <div class="hint">${hp.line}${hp.titles.length?'　🏅'+hp.titles.join('・'):''}</div>
    <div class="row" style="margin-top:6px"><button class="btn" data-hsel="${e.id}">年度別・キャリアハイを選ぶ</button><button class="btn ${inTeam?'':'main'}" data-htm="${e.id}" style="margin:0">${inTeam?'マイチームから外す':'＋ マイチームに入れる'}</button></div></div>`;
}
function renderHall(){
  const el=$('hallScreen'); if(!el) return;
  MYTEAM.ids=(MYTEAM.ids||[]).filter(id=>HALL.some(e=>e.id===id));
  const tabs=[['team','マイチーム'],['vs','対戦'],['hall',`歴代選手（${HALL.length}）`]];
  let body='';
  if(HV.sel){ const e=HALL.find(x=>x.id===HV.sel); if(e) body=hallDetailHTML(e); else HV.sel=null; }
  if(!body&&HV.tab==='team'){
    const members=MYTEAM.ids.map(id=>HALL.find(e=>e.id===id)).filter(Boolean);
    const pack=teamPack(MYTEAM.ids,MYTEAM.name), nP=pack.p.filter(x=>x.P).length, nF=pack.p.filter(x=>x.F).length;
    body=`<div class="sh2" style="margin-top:0">マイチーム</div>
      <div class="pcardx"><input class="pname" id="mtName" placeholder="チーム名（空欄なら「マイチーム」）" value="${(MYTEAM.name||'').replace(/"/g,'&quot;')}" maxlength="16">
        <div class="hint" style="margin-top:6px">歴代選手をキャリアハイの年の姿で入れます。投手${nP}人・野手${nF}人。足りない守備位置や投手は、対戦のとき平均的な選手で自動的に埋まります。</div></div>
      ${members.length?members.map(e=>hallMemberHTML(e,true)).join(''):'<div class="pcardx hint">まだ誰もいません。「歴代選手」タブから入れてください。</div>'}
      <div class="sh2">リンク（コード）で送る</div>
      <div class="pcardx"><div class="hint">下のコードをコピーして、LINEやメールで相手に送ります。相手は「対戦」タブで貼り付けると、あなたのチームと対戦できます。</div>
        <textarea class="pname" id="mtCode" readonly style="height:72px;font-size:11px;margin-top:6px">${members.length?packToText(pack):''}</textarea>
        <button class="btn main" id="mtCopy" ${members.length?'':'disabled'}>📋 コードをコピー</button></div>`;
  }else if(!body&&HV.tab==='vs'){
    const mine=MYTEAM.ids.length?packToTeam(teamPack(MYTEAM.ids,MYTEAM.name)):null;
    body=`<div class="sh2" style="margin-top:0">受け取ったチーム</div>
      <div class="pcardx"><div class="hint">相手から送られてきたコードを貼り付けて「取り込む」</div>
        <textarea class="pname" id="rcvCode" placeholder="BBTEAM1.…" style="height:60px;font-size:11px;margin-top:6px"></textarea>
        <button class="btn main" id="rcvAdd">取り込む</button><div class="hint" id="rcvMsg"></div></div>
      ${RCV.length?RCV.map((r,i)=>`<div class="lrn"><b>${r.n}</b> <small>${r.p.length}人（投手${r.p.filter(x=>x.P).length}・野手${r.p.filter(x=>x.F).length}）</small>
        <div class="hint">${r.p.slice(0,6).map(x=>x.n).join('・')}${r.p.length>6?'…':''}</div>
        <div class="row" style="margin-top:6px"><button class="btn main" data-vs="${i}" data-n="1" style="margin:0" ${mine?'':'disabled'}>⚾ 1試合</button><button class="btn" data-vs="${i}" data-n="10" ${mine?'':'disabled'}>10試合</button><button class="btn" data-rdel="${i}">削除</button></div></div>`).join('')
        :'<div class="pcardx hint">まだありません。</div>'}
      ${mine?'':'<div class="pcardx hint">対戦するには、先にマイチームに選手を入れてください。</div>'}
      <div id="vsResult">${HV.res||''}</div>`;
  }else if(!body){
    body=`<div class="sh2" style="margin-top:0">歴代選手</div>
      ${HALL.length?HALL.slice().reverse().map(e=>hallMemberHTML(e,MYTEAM.ids.includes(e.id))).join(''):'<div class="pcardx hint">まだいません。ペナントで引退したとき「歴代選手として登録する」を選ぶと、ここに残ります。</div>'}`;
  }
  el.innerHTML=`<div class="pen"><h2>🏛 歴代選手・マイチーム</h2>
    <div class="row" style="margin-bottom:8px">${tabs.map(([k,n])=>`<button class="btn ${HV.tab===k&&!HV.sel?'on':''}" data-htab="${k}">${n}</button>`).join('')}</div>
    ${body}
    <button class="btn" id="hallBack" style="width:100%;margin-top:10px">メニューへ</button></div>`;
  el.querySelectorAll('[data-htab]').forEach(b=>b.onclick=()=>{ HV.tab=b.dataset.htab; HV.sel=null; renderHall(); });
  el.querySelectorAll('[data-hsel]').forEach(b=>b.onclick=()=>{ HV.sel=b.dataset.hsel; renderHall(); window.scrollTo(0,0); });
  el.querySelectorAll('[data-htm]').forEach(b=>b.onclick=()=>{ const id=b.dataset.htm; const i=MYTEAM.ids.indexOf(id); if(i>=0) MYTEAM.ids.splice(i,1); else MYTEAM.ids.push(id); save(); renderHall(); });
  el.querySelectorAll('[data-hbest]').forEach(b=>b.onclick=()=>{ const e=HALL.find(x=>x.id===HV.sel); if(e){ e.best=+b.dataset.hbest; save(); renderHall(); } });
  el.querySelectorAll('[data-hdel]').forEach(b=>b.onclick=function(){ if(!this.dataset.armed){ this.dataset.armed='1'; this.textContent='もう一度押すと消します'; return; } const i=HALL.findIndex(x=>x.id===this.dataset.hdel); if(i>=0) HALL.splice(i,1); HV.sel=null; save(); renderHall(); });
  el.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{ RCV.splice(+b.dataset.rdel,1); save(); renderHall(); });
  el.querySelectorAll('[data-vs]').forEach(b=>b.onclick=()=>runVs(+b.dataset.vs,+b.dataset.n));
  const on=(id,f)=>{ const e=document.getElementById(id); if(e) e.onclick=f; };
  const nm=$('mtName'); if(nm) nm.oninput=()=>{ MYTEAM.name=nm.value.slice(0,16); const c=$('mtCode'); if(c&&MYTEAM.ids.length) c.value=packToText(teamPack(MYTEAM.ids,MYTEAM.name)); save(); };
  on('mtCopy',async()=>{ const c=$('mtCode'); if(!c||!c.value) return; let ok=false; try{ await navigator.clipboard.writeText(c.value); ok=true; }catch(e){} if(!ok){ try{ c.select(); c.setSelectionRange(0,99999); ok=document.execCommand('copy'); }catch(e){} } $('mtCopy').textContent=ok?'✅ コピーしました':'コピーできませんでした。長押しで選択してコピーしてください'; });
  on('rcvAdd',()=>{ const p=textToPack($('rcvCode').value); const m=$('rcvMsg'); if(!p){ m.textContent='コードが読めませんでした。BBTEAM1. から始まる文字列をそのまま貼り付けてください。'; return; } RCV.unshift(p); if(RCV.length>12) RCV.length=12; save(); renderHall(); });
  on('hallBack',()=>showScreen('mode'));
}
function hallDetailHTML(e){
  const rows=e.seasons.map((s,i)=>`<tr class="${i===e.best?'key':''}"><td>${s.year}年目<br><small>${s.age}歳</small></td><td>${s.team?tchip(s.team):''}<br><small>${roleName(s.role)}</small></td><td style="text-align:left;font-size:11.5px">${hallSeasonLine(s)}${s.titles&&s.titles.length?`<br>🏅${s.titles.join('・')}`:''}${s.feats&&s.feats.length?`<br><span style="color:#f3dfa0">✨${s.feats.join('・')}</span>`:''}<br><small style="color:var(--mute)">${hallAbilTxt(s)}</small></td><td><button class="btn ${i===e.best?'on':''}" data-hbest="${i}" style="padding:6px 8px;font-size:12px">${i===e.best?'★キャリアハイ':'ここにする'}</button></td></tr>`).join('');
  const inTeam=MYTEAM.ids.includes(e.id);
  return `<div class="pcardx"><div style="font-size:18px;font-weight:900">${e.name} <small style="font-weight:400;color:var(--mute)">${e.pos==='P'?'投手':e.pos==='B'?'野手':'二刀流'}・${e.years}年・${e.teams.map(t=>tchip(t)).join('')}</small></div>
    <div class="hint" style="margin-top:4px">通算：${e.pos==='B'?batLine(e.career):statLine(e.career)}${e.bcareer&&e.pos==='W'?'<br>打撃：'+batLine(e.bcareer):''}</div>
    ${e.titles&&e.titles.length?`<div class="hint">🏅 ${e.titles.map(t=>`${t.y}年目 ${t.name}`).join('・')}</div>`:''}
    <div class="row" style="margin-top:8px"><button class="btn ${inTeam?'':'main'}" data-htm="${e.id}" style="margin:0">${inTeam?'マイチームから外す':'＋ マイチームに入れる'}</button><button class="btn" data-hdel="${e.id}">この選手を消す</button></div></div>
    <div class="sh2">年度別成績（★の年の能力でマイチームに入ります）</div>
    <table class="stt"><thead><tr><th>年</th><th>所属</th><th>成績・能力</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function runVs(i,n){
  const pack=RCV[i]; if(!pack||!MYTEAM.ids.length) return;
  const A=packToTeam(teamPack(MYTEAM.ids,MYTEAM.name)), B=packToTeam(pack);
  if(A.name===B.name){ A.name='自分の'+A.name; B.name='相手の'+B.name; }
  let h='';
  if(n===1){
    const r=simTeamGame(A,B,ri(0,5));
    const row=(nm,arr,tot,hits)=>`<tr><th style="white-space:nowrap;text-align:left;padding-right:4px">${nm}</th>${arr.map(v=>`<td>${v}</td>`).join('')}${'<td></td>'.repeat(Math.max(0,12-arr.length))}<td><b>${tot}</b></td><td>${hits}</td></tr>`;
    h=`<div class="sh2">${A.name} ${r.a} − ${r.b} ${B.name}　${r.res==='W'?'🎉 勝ち':r.res==='L'?'負け':'引き分け'}</div>
      <div class="pcardx" style="overflow-x:auto"><table class="ls" style="font-size:12px"><tr><th></th>${Array.from({length:12},(_,k)=>`<th>${k+1}</th>`).join('')}<th>計</th><th>安</th></tr>${row(B.name,r.sc.b,r.b,r.hb)}${row(A.name,r.sc.a,r.a,r.ha)}</table>
        <div class="hint">先発：${A.name} ${r.spA}／${B.name} ${r.spB}</div></div>
      <div class="pcardx" style="font-size:12px">${r.ev.length?r.ev.map(x=>`<div>${x}</div>`).join(''):'両チームとも安打なし'}</div>
      <div class="pcardx" style="font-size:12px"><b>${A.name}</b>：${r.luA.map(b=>`${b.order}.${b.name}`).join(' ')}<br><b>${B.name}</b>：${r.luB.map(b=>`${b.order}.${b.name}`).join(' ')}</div>`;
  }else{
    let w=0,l=0,t=0,ra=0,rb=0; const lines=[];
    for(let g=0;g<n;g++){ const r=simTeamGame(A,B,g); if(r.res==='W')w++; else if(r.res==='L')l++; else t++; ra+=r.a; rb+=r.b; lines.push(`第${g+1}戦 ${r.a}−${r.b} ${r.res==='W'?'○':r.res==='L'?'●':'△'}`); }
    h=`<div class="sh2">${n}試合：${A.name} ${w}勝${l}敗${t?t+'分':''}（得点${ra}・失点${rb}）</div><div class="pcardx" style="font-size:12px">${lines.join('　')}</div>`;
  }
  HV.res=h; renderHall(); const v=$('vsResult'); if(v) v.scrollIntoView({behavior:'smooth'});
}
