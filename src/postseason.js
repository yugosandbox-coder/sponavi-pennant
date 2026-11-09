/* ================================================================
   ポストシーズン（プレイ可能）：クライマックスシリーズ → 日本シリーズ
   ・CS 1stステージ：2位 vs 3位（2勝先取）、ファイナル：1位（アドバンテージ1勝）vs 1st勝者（4勝先取）、日本シリーズ：4勝先取
   ・自分のチームの試合は、役割に応じて出番が来る（スタメン＝毎試合、控え＝代打、先発＝ローテーション順、中継ぎ・抑え＝確率）
   ・成績はシーズン成績とは別（ポストシーズン成績）
   ================================================================ */
const PS_ORDER=['セ1','パ1','セF','パF','JS'];
function psInit(fin){
  const S={done:false,idx:0,series:{},myStat:isBat()?batStat():penStat(),myGames:[],fin};
  for(const lg of ['セ','パ']){ const [t1,t2,t3]=fin[lg].slice(0,3).map(x=>x.id);
    S.series[lg+'1']={key:lg+'1',name:`${LG_NAME[lg]} CSファーストステージ`,a:t2,b:t3,wa:0,wb:0,need:2,adv:0,games:[],t1,lg}; }
  return S;
}
const psCur=S=>S.series[PS_ORDER[S.idx]];
const psWinner=s=>s.wa>=s.need?s.a:s.wb>=s.need?s.b:null;
const psMine=s=>!!(s&&PEN&&!PEN.released&&(s.a===PEN.team||s.b===PEN.team));
// 疲労：自分のリーグのCSと日本シリーズの試合の日を1日と数える（もう片方のリーグのCSは同じ日程なので数えない）。出なければ休みの日と同じ回復
const psFatDay=(s,g)=>{ if(typeof fatEventDay!=='function'||!PEN||PEN.released) return; if(s.lg&&TEAM[PEN.team]&&s.lg!==TEAM[PEN.team].lg) return; fatEventDay(g||0); };
// 次のシリーズを用意する（終わっていれば）
function psAdvance(S){
  while(S.idx<PS_ORDER.length){
    const key=PS_ORDER[S.idx], s=S.series[key];
    if(!s){   // 作る
      if(key==='セF'||key==='パF'){ const lg=key[0], f=S.series[lg+'1']; const w=psWinner(f); if(!w) return;
        S.series[key]={key,name:`${LG_NAME[lg]} CSファイナルステージ`,a:f.t1,b:w,wa:1,wb:0,need:4,adv:1,games:[],lg}; }
      else if(key==='JS'){ const c=psWinner(S.series['セF']), p=psWinner(S.series['パF']); if(!c||!p) return;
        S.series.JS={key,name:'日本シリーズ',a:c,b:p,wa:0,wb:0,need:4,adv:0,games:[]}; }
      continue;
    }
    if(psWinner(s)){ S.idx++; continue; }
    return;
  }
  S.done=true;
}
const psPw=id=>{ const T=PEN.teams[id]; return 1+(T.off||0)*0.8-(T.def||0)*0.6; };
// 自分の出番（試合番号で決める）
function psMyKind(s,gameNo){
  if(!psMine(s)||(typeof injured==='function'&&injured())) return null;
  if(isBat()) return PEN.role==='スタメン'?'bat':(rnd()<Math.min(0.6,pinchProb()*1.3)?'pinch':null);
  const slot={'エース':0,'ローテ':1,'裏ローテ':2}[PEN.role];
  const tired=typeof myFat==='function'?myFat():0, thr=typeof myFatThr==='function'?myFatThr():99;   // 疲労：レギュラーシーズンと同じく、疲れすぎていれば先発を回避・中継ぎは休ませる
  if(slot!=null) return (gameNo-1)%4===slot&&tired<thr+FAT_SP?'start':(isTW()&&PEN.dh&&(gameNo-2)%4!==slot?'bat':null);   // 二刀流：先発の翌日は指名打者で出ない
  if(PEN.role==='中継ぎ') return tired<thr&&rnd()<Math.min(0.6,relProb()*1.4)?'relief':null;
  if(PEN.role==='抑え') return tired<thr&&rnd()<0.45?'closer':null;
  return null;
}
// チームを「選手の集まり」に（asGame 用）。自分は実際の成績を使うので入れない
function psSide(id){ const T=PEN.teams[id], st=staff(T); return {F:T.F.map(f=>({f,id})),P:[...st.rot.slice(0,4),...st.pen.slice(0,5)].map(p=>({p,id}))}; }
const psScoreB=t=>mvpScore(t), psScoreP=t=>mvpScore(t);   // 査定は投手・野手で同じ式（mvpScore）
function psAddStats(s,players){
  s.pstats=s.pstats||{};
  players.forEach(p=>{ const k=p.name+'@'+p.team+'#'+p.kind; const t=s.pstats[k]||(s.pstats[k]={name:p.name,team:p.team,me:!!p.me,kind:p.kind,score:0,st:p.kind==='B'?{pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}:{outs:0,runs:0,k:0,h:0}});
    t.score+=p.score; for(const kk in p.st){ if(Array.isArray(p.st[kk])) t.st[kk]=t.st[kk].concat(p.st[kk]); else t.st[kk]+=(p.st[kk]||0); } });
}
// 1試合を選手レベルでシミュレーション（自分の出番がない試合・スキップした試合）。全選手の成績を残す
function psSimGame(s,me){
  const gameNo=s.games.length+1, g=asGame(gameNo,psSide(s.a),psSide(s.b),{nStart:4,sub:0.3,odd:0.05,startInn:6});
  let sa=sumN(g.sc.A), sb=sumN(g.sc.B);
  if(sa===sb){ if(rnd()<psPw(s.a)/(psPw(s.a)+psPw(s.b))) sa++; else sb++; }
  if(sa>sb) s.wa++; else s.wb++;
  psAddStats(s,g.players);
  s.games.push({a:sa,b:sb,w:sa>sb?s.a:s.b,me:me||null});
}
// 次の試合へ。自分の出番があれば pending を作って true を返す（試合はペナントの画面で）
function psNext(){
  const rv=PEN.review, S=rv&&rv.ps; if(!S||S.done) return false;
  psAdvance(S); if(S.done){ psFinish(); return false; }
  const s=psCur(S), gameNo=s.games.length+1, kind=psMyKind(s,gameNo);
  if(kind){
    const opp=s.a===PEN.team?s.b:s.a;
    const p=makePending(kind,opp); if(p){ p.ps=true; p.psKey=s.key; p.psName=s.name; p.gameNo=gameNo; PEN.pending=p; return true; }
  }
  psSimGame(s,null); psFatDay(s,0); psAdvance(S); psAwards(S); if(S.done) psFinish();
  return false;
}
// 自分の試合が終わった（penGameDone から）
function psGameDone(){
  const p=PEN.pending, rv=PEN.review, S=rv&&rv.ps; if(!p||!S) return;
  const s=S.series[p.psKey]; if(!s){ PEN.pending=null; return; }
  const st=G.st, res=G.result?G.result.res:(myTot()>oppTot()?'W':myTot()<oppTot()?'L':'T');
  const myA=s.a===PEN.team, my=myTot(), op=oppTot();
  if(res==='T'){ PEN.pending=null; return; }   // 引き分けはやり直し（ポストシーズンに引き分けはない扱い）
  psFatDay(s,typeof fatEventGameG==='function'?fatEventGameG(p.kind):0);   // 出場した日：普通の試合と同じように疲労
  if(G.mission){ if(G.bat&&!G.tw) checkMissionB(); else checkMission(); }   // 監督のミッション（達成は翌年の評価に持ち越し）
  // 自分の成績（ポストシーズン用）
  const M=S.myStat;
  if(G.bat&&!G.tw){ for(const k of B_KEYS) M[k]=(M[k]||0)+(st[k]||0); M.g++; if(p.kind!=='pinch') M.gs++; }
  else { for(const k of ['pitches','hits','hr','k','bb','bf','outs','runs']) M[k]=(M[k]||0)+(st[k]||0); M.g++; if(p.kind==='start') M.gs++;
    const dec=G.result?G.result.dec:'－'; if(dec==='勝') M.w++; if(dec==='負') M.l++; if(dec==='S') M.sv++; if(dec==='H') M.hld++; }
  const line=G.bat&&!G.tw?batLineTxt(st):`${fmtIP(st.outs)}回${st.runs}失点${G.result&&G.result.dec!=='－'?'・'+G.result.dec:''}`;
  if(res==='W'){ if(myA) s.wa++; else s.wb++; } else { if(myA) s.wb++; else s.wa++; }
  s.games.push({a:myA?my:op,b:myA?op:my,w:res==='W'?PEN.team:(myA?s.b:s.a),me:{kind:p.kind,line,played:true}});
  // ほかの選手の成績：この試合を選手レベルでシミュレーションして残す。自分は実際の成績
  try{ const sh=asGame(p.gameNo,psSide(s.a),psSide(s.b),{nStart:4,sub:0.3,odd:0.05,startInn:6}); psAddStats(s,sh.players.filter(x=>!x.me)); }catch(e){}
  const myK=G.bat&&!G.tw?'B':'P', myS=myK==='B'?{pa:st.pa,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,run:st.run,app:[]}:{outs:st.outs,runs:st.runs,k:st.k,h:st.hits,dec:G.result?G.result.dec:'－'};
  psAddStats(s,[{name:PEN.pname,team:PEN.team,me:true,kind:myK,st:myS,score:myK==='B'?psScoreB(myS):psScoreP(myS)}]);
  S.myGames.push({key:s.key,name:s.name,gameNo:p.gameNo,line,res,st:G.bat&&!G.tw?{pa:st.pa,ab:st.ab,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb}:{outs:st.outs,runs:st.runs,k:st.k,dec:G.result?G.result.dec:'－'}});
  PEN.pending=null;
  psAdvance(S); psAwards(S);
  if(S.done) psFinish();
}
// 出番をスキップ（結果だけ）
function psSkip(){
  const p=PEN.pending, rv=PEN.review, S=rv&&rv.ps; if(!p||!S) return;
  if(gameIsPending()) closePenGame();
  const s=S.series[p.psKey]; PEN.pending=null; if(!s) return;
  psSimGame(s,{kind:p.kind,line:'出場（スキップ）',played:false}); psFatDay(s,typeof fatEventGain==='function'?fatEventGain(p.kind,null):0);
  psAdvance(S); psAwards(S); if(S.done) psFinish();
}
// 残りをまとめて（自分の出番もスキップ）。untilKey＝'JS' なら日本シリーズの前で止める
function psRunAll(untilKey){
  const rv=PEN.review, S=rv&&rv.ps; if(!S) return;
  let n=0; while(!S.done&&n++<200){ if(PEN.pending&&PEN.pending.ps) psSkip(); if(untilKey&&!S.done&&PS_ORDER[S.idx]===untilKey&&!(PEN.pending&&PEN.pending.ps)) break; if(S.done) break; if(psNext()) { if(untilKey&&PS_ORDER[S.idx]===untilKey) break; psSkip(); } }
  if(S.done) psFinish();
}
function psFinish(){
  const rv=PEN.review, S=rv&&rv.ps; if(!S||S.fin2) return;
  S.fin2=true; const js=S.series.JS; S.champ=js?psWinner(js):null;
  if(S.champ) PEN.jsChamp={y:PEN.year,team:S.champ};   // 翌年のWBC日本代表監督は日本一の球団の監督
  if(S.champ===PEN.team){ PEN.titles=PEN.titles||[]; PEN.titles.push({y:PEN.year,name:'日本一'}); penNotice(`🏆 ${TEAM[PEN.team].name}が日本一！`); }
  // CSのMVP・日本シリーズMVP（自分のチームが勝ったシリーズで、実際に出て活躍していれば）：持ち点+2
  psAwards(S);
  rv.stage='award'; rv.psStage=2;
}
// シリーズが終わったら表彰：MVP＝勝ったチームで最も活躍した選手、敢闘賞＝負けたチームで最も活躍した選手（出場した全選手の成績から）
// 表彰（すべて確定）：CS MVP＝各リーグのファイナルを勝ったチームで最も活躍した選手（+3）、CS敢闘賞＝CSで負けた4チームの中で最も活躍した選手（+0.5）
// 日本シリーズMVP＝勝ったチームで最も活躍（+3）、日本シリーズ敢闘賞＝負けたチームで最も活躍（+0.5）
const psLine=p=>!p?'':p.kind==='B'?`${p.st.pa}打席${p.st.h}安打${p.st.hr?` ${p.st.hr}本`:''}${p.st.rbi?` ${p.st.rbi}打点`:''}`:`${fmtIP(p.st.outs)}回${p.st.runs}失点${p.st.k?` ${p.st.k}奪三振`:''}`;
const psTop=(s,team)=>Object.values(s.pstats||{}).filter(x=>x.team===team).sort((a,b)=>b.score-a.score)[0];
const psPack=p=>p?{name:p.name,team:p.team,me:p.me,line:psLine(p)}:null;
function psAwards(S){
  const give=(name,pts)=>{ titleAward(name,pts,1); S.awards=S.awards||[]; S.awards.push(`${name}（持ち点+${pts}）`); };
  const cpu=(p,pts)=>{ if(p&&!p.me) cpuAward(p.name,p.team,p.kind,pts); };   // CPUの選手にも持ち点
  for(const key of ['セF','パF']){ const s=S.series[key]; if(!s||s.awarded) continue; const w=psWinner(s); if(!w) continue;
    s.awarded=true; const mvp=psTop(s,w); s.mvp=psPack(mvp); if(mvp&&mvp.me) give('クライマックスシリーズMVP',3); cpu(mvp,3); }
  // CS敢闘賞：両リーグのファイナルが終わったら、負けた4チーム（1st敗者2＋ファイナル敗者2）の中から
  if(!S.csFsDone&&['セF','パF'].every(k=>S.series[k]&&psWinner(S.series[k]))){
    S.csFsDone=true; const cands=[];
    for(const k of ['セ1','パ1','セF','パF']){ const s=S.series[k]; const w=psWinner(s); const loser=w===s.a?s.b:s.a; const t=psTop(s,loser); if(t) cands.push(t); }
    const fs=cands.sort((a,b)=>b.score-a.score)[0]; S.csFs=psPack(fs); if(fs&&fs.me) give('CSの敢闘賞',0.5); cpu(fs,0.5);
  }
  const js=S.series.JS; if(js&&!js.awarded&&psWinner(js)){ js.awarded=true; const w=psWinner(js), l=w===js.a?js.b:js.a;
    const mvp=psTop(js,w), fs=psTop(js,l); js.mvp=psPack(mvp); js.fs=psPack(fs);
    if(mvp&&mvp.me) give('日本シリーズMVP',3); if(fs&&fs.me) give('日本シリーズ敢闘賞',0.5); cpu(mvp,3); cpu(fs,0.5); }
}
const psMyTeamIn=S=>Object.values(S.series).some(psMine)||['セ','パ'].some(lg=>S.fin[lg].slice(0,3).some(x=>x.id===PEN.team));
function psHTML(rv){
  const S=rv.ps; if(!S) return '';
  const chip=id=>tchip(id);
  const serLine=s=>{ if(!s) return ''; const w=psWinner(s); const gl=s.games.map((g,i)=>`<span class="psg${g.w===PEN.team?' win':''}">${i+1}:${g.a}-${g.b}${g.me?`<small>${g.me.played?'●':'○'}</small>`:''}</span>`).join(' ');
    return `<div class="psrow"><b>${s.name}</b>${s.adv?`<small>（${TEAM[s.a].short}にアドバンテージ1勝）</small>`:''}<br>${chip(s.a)} <b>${s.wa}</b> − <b>${s.wb}</b> ${chip(s.b)}${w?` → <b>${TEAM[w].short}</b>${s.key==='JS'?' 🏆 日本一':''}`:'<small>（進行中）</small>'}<div class="hint" style="margin:2px 0 0">${gl||'これから'}</div>${s.mvp?`<div class="hint">🏆 MVP：${s.mvp.name}（${TEAM[s.mvp.team].short}）${s.mvp.line}${s.mvp.me?' <b style="color:var(--accent)">あなた</b>':''}${s.fs?`　🎖 敢闘賞：${s.fs.name}（${TEAM[s.fs.team].short}）${s.fs.line}${s.fs.me?' <b style="color:var(--accent)">あなた</b>':''}`:''}</div>`:''}</div>`; };
  const cur=S.done?null:psCur(S);
  const my=S.myStat, myLine=(my.g||my.pa)?`<div class="hint">あなたのポストシーズン成績：${isBat()?batLine(my):statLine(my)}</div>`:'';
  const mg=S.myGames.length?`<div class="hint">${S.myGames.map(g=>`${g.name.replace(/.*CS/,'CS')}第${g.gameNo}戦 ${g.line}（${g.res==='W'?'○':'●'}）`).join('／')}</div>`:'';
  return `<div class="sh2">🏆 ポストシーズン${S.done?'（終了）':''}</div><div class="pcardx" style="font-size:13px;line-height:1.6">
    ${PS_ORDER.map(k=>serLine(S.series[k])).join('')}
    ${S.csFs?`<div class="hint">🎖 CSの敢闘賞（負けた4チームから）：${S.csFs.name}（${TEAM[S.csFs.team].short}）${S.csFs.line}${S.csFs.me?' <b style="color:var(--accent)">あなた</b>':''}</div>`:''}
    ${myLine}${mg}
    ${S.done?`${S.champ?`<div style="margin-top:4px">🏆 <b>${TEAM[S.champ].name}</b> が日本一${S.champ===PEN.team?'　<span style="color:var(--accent)">（あなたの球団！）</span>':''}</div>`:''}${S.awards&&S.awards.length?`<div style="color:var(--accent)">🏆 あなたが ${S.awards.join('・')} に選出！</div>`:''}`
      :`<div class="row" style="margin-top:8px"><button class="btn main" id="psNext" style="margin:0">▶ 次の試合へ${cur&&psMine(cur)?'（出番があれば出場できます）':''}</button><button class="btn" id="psAll">まとめて進める</button></div>
       <div class="hint">自分のチームの試合は、スタメンなら毎試合、控えは代打、先発はローテーション順、中継ぎ・抑えは試合展開しだいで出番が来ます。成績はシーズン成績とは別に記録します</div>`}
  </div>`;
}
function psBind(el){
  const a=el.querySelector('#psNext'), b=el.querySelector('#psAll');
  if(a) a.onclick=()=>{ psNext(); renderPennant(); save(); window.scrollTo(0,0); };
  if(b) b.onclick=()=>{ psRunAll(); renderPennant(); save(); window.scrollTo(0,0); };
}

/* ---- 33歳を超えてからの衰え：年々大きくなる（衰え1年目5倍、1年ごとに+1.5倍、最大20倍。マイナスの変化だけ）。下がらないための成績の基準も1年ごとに厳しくなる（declK） ---- */
function agingAmplify(ab){
  if(!PEN||!ab||!PEN.declAge) return ab; const y=PEN.age-PEN.declAge+1;   // 衰えが始まってからの年数
  const m=clamp(3.5+1.5*y,5,20)/(typeof cbOn==='function'&&cbOn('anti')?2:1);   // アンチエイジング：倍率が半分
  const amp=o=>{ if(!o) return; for(const k of ['velo','control','stamina','meet','power','speed','eye','def']) if(typeof o[k]==='number'&&o[k]<0) o[k]=o[k]*m; o.agingMul=m; };
  amp(ab); if(ab.bat) amp(ab.bat);
  return ab;
}
