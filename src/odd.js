/* ================================================================
   変則出場（レギュラーシーズンに年0〜3回・監督の性格で平均が変わる）
   ・野手（二刀流でない）：点差が大きい終盤に「野手登板」。投手能力は球速120km/h・制球20・スタミナ20、持ち球はストレートLv1とスローカーブLv1
   ・投手（二刀流でない）：控えが尽きた終盤に「代打（投手）」。打撃は全能力10
   ・打っても打たれても監督の評価は変わらない（成績にも入れない）。試合後に監督から「無理を言ったが、ありがとう」
   ================================================================ */
const ODD_ABIL={velo:120,control:20,stamina:20}, ODD_REP=['ストレート','スローカーブ'], ODD_PLEV={'ストレート':1,'スローカーブ':1};
const ODD_BABIL={meet:10,power:10,speed:10,eye:10,def:10};
function oddPlan(){
  if(!PEN) return; const m=myMgr(); let mean=0.8;
  if(m){ if(m.o==='sub') mean+=0.8; if(m.a==='fav') mean+=0.4; if(m.a==='merit') mean-=0.3; if(m.p==='era'||m.b==='def') mean-=0.2; }
  const n=Math.min(3,poisson(clamp(mean,0.2,2.2))); const days=new Set(); let g=0; while(days.size<n&&g++<50) days.add(ri(8,SEASON_GAMES-6));
  PEN.oddDays=[...days].sort((a,b)=>a-b);
}
// 今日は変則出場の日か（二刀流はなし）
function oddKindToday(){
  if(!PEN||isTW()||!PEN.oddDays||!PEN.oddDays.includes(PEN.day)) return null;
  if(isBat()) return 'oddP';
  if(isStarter(PEN.role)&&PEN.day>=PEN.nextStart){ PEN.oddDays=PEN.oddDays.map(d=>d===PEN.day?d+1:d); return null; }   // 先発の日はずらす
  return 'oddB';
}
function makeOdd(kind){
  PEN.oddDays=PEN.oddDays.filter(d=>d!==PEN.day);
  const d=PEN.day, opp=oppOf(d), op=PEN.teams[opp];
  if(kind==='oddB'){ const p=makePendingB('pinch'); p.pinchInning=ri(7,9); p.odd='bat'; p.oddBabil={...ODD_BABIL}; return p; }
  // 野手登板：点差が6点以上ついた7〜9回から
  for(let t=0;t<60;t++){
    const oppL=op.lineup.map(deB).map(b=>({...b,res:[]})), myL=myT().lineup.map(plainB);
    const T={lineup:oppL,order:-1}, M={lineup:myL,order:-1};
    const E=ri(7,9), sp=genPitcher(), ops=genPitcher(); const sc={opp:[],my:[]}; let ho=0,hm=0;
    for(let i=1;i<E;i++){ const a=simHalf(T,0,[0,0,0],sp.q*(t>30?1.3:1),null); sc.opp.push(a.runs); ho+=a.hits; const b=simHalf(M,0,[0,0,0],ops.q*(t>30?1.3:1),null); sc.my.push(b.runs); hm+=b.hits; }
    const lead=sumN(sc.my)-sumN(sc.opp);
    if(Math.abs(lead)<6&&t<59) continue;
    return {day:d,opp,kind:'relief',odd:'pitch',oddAbil:{...ODD_ABIL},oddRep:ODD_REP.slice(),oddPlev:{...ODD_PLEV},
      pre:{entry:E,score:sc,oppOrder:T.order,myOrder:M.order,hitsOpp:ho,hitsMy:hm,oppLineup:oppL.map(serB),myLineup:myL,lead}};
  }
  return null;
}
// 代打のあと、そのまま中継ぎで1イニング（通常の登板として成績に入る）
function oddStayRelief(){ const era=effERA(), runs=poisson(era/9*(0.6+rnd()*0.8)), l=mkLine(3,runs); addLine(l,'－',false); mergeByType(PEN.ss.byType||(PEN.ss.byType={}),estByType(l)); PEN.roleApps++; return l; }
// 野手登板のあと、そのまま守れる位置の守備に（打席が回れば通常の打席として成績に入る）
function oddStayField(){ const pos=myPositions()[0]||'OF'; let t=`／そのまま${POS_JP[pos]}の守備に`; if(rnd()<0.4){ const st=batStat(); const k=autoKind(effBabil(PEN.babil,'bat')); st.pa++; if(k==='BB') st.bb++; else if(k==='HBP') st.hbp++; else st.ab++; if(k==='K') st.k++; if(['1B','IFH','2B','3B','HR'].includes(k)){ st.h++; if(k==='2B') st.d2++; if(k==='3B') st.d3++; if(k==='HR'){ st.hr++; st.rbi++; st.run++; } } addBatLine(st,false); t+=`（打席：${batLineTxt(st)}）`; } return t; }
const oddKindText=p=>p.odd==='pitch'?`${p.pre.entry}回表から野手登板（${p.pre.lead>0?p.pre.lead+'点リード':(-p.pre.lead)+'点ビハインド'}・監督の無理なお願い）`:`${p.pinchInning}回裏ごろ 代打（投手）で出場（打ったあとは控え野手が守備に。そのまま中継ぎに入ることも）`;
const oddThanks=()=>G&&G.pen&&G.pen.odd?`${G.pen.odd==='pitch'?'野手なのに投げてもらって':'投手なのに打席に立ってもらって'}すまなかった。無理を言ったが、やってくれてありがとう。今日の結果は評価には響かせない。`:'';
// 試合が終わった：成績には入れず、記録だけ残す
function oddGameDone(p){
  const st=G.st, res=G.result?G.result.res:(myTot()>oppTot()?'W':myTot()<oppTot()?'L':'T');
  const line=p.odd==='pitch'?`野手登板 ${fmtIP(st.outs)}回${st.runs}失点${st.k?` ${st.k}奪三振`:''}`:`代打（投手） ${batLineTxt(st)}`;
  let extra='';
  if(p.odd==='bat'&&rnd()<0.4){ const l=oddStayRelief(); extra=`／そのまま中継ぎで${fmtIP(l.outs)}回${l.runs}失点`; }   // 代打のあと、そのまま中継ぎに入ることもある（これは通常の登板として成績に入る）
  if(p.odd==='pitch'&&rnd()<0.2) extra=oddStayField();   // 野手登板のあと、そのまま守備につくことも（低確率）
  PEN.oddLog=PEN.oddLog||[]; PEN.oddLog.push({y:PEN.year,d:p.day,line:line+extra});
  recordMyGame(res,[oppTot(),myTot()],{kind:p.odd==='pitch'?'oddP':'oddB',note:line+extra,played:true});
  penNotice(`${mgrName(myMgr())}「${p.odd==='pitch'?'野手なのに投げてもらって':'投手なのに打席に立ってもらって'}すまなかった。無理を言ったが、やってくれてありがとう」（${line}・評価には影響なし）`);
  PEN.pending=null;
}
function oddSkip(p){
  if(gameIsPending()) closePenGame();
  const A=myT(), B=PEN.teams[p.opp]||A;
  let o=poisson(Math.max(1.6,3.85+B.off-A.def)), m=poisson(Math.max(1.6,3.85+A.off-B.def)); const res=teamResult(o,m);
  if(res==='W'&&m<=o) m=o+1; if(res==='L'&&o<=m) o=m+1;
  let line=p.odd==='pitch'?`野手登板 1回${ri(0,3)}失点（スキップ）`:`代打（投手） 1打数${rnd()<0.12?'1':'0'}安打（スキップ）`;
  if(p.odd==='bat'&&rnd()<0.4){ const l=oddStayRelief(); line+=`／そのまま中継ぎで${fmtIP(l.outs)}回${l.runs}失点`; }
  if(p.odd==='pitch'&&rnd()<0.2) line+=oddStayField();
  PEN.oddLog=PEN.oddLog||[]; PEN.oddLog.push({y:PEN.year,d:p.day,line});
  recordMyGame(res,[o,m],{kind:p.odd==='pitch'?'oddP':'oddB',note:line,played:false});
  penNotice(`${mgrName(myMgr())}「無理を言ったが、やってくれてありがとう」（${line}・評価には影響なし）`);
  PEN.pending=null;
}
