/* ================================================================
   オールスターゲーム（第75試合のあと、セ vs パ の2試合）
   ・野手は各ポジション3人ずつ（外野は9人）＋指名打者3人、投手は先発・中継ぎに関係なく10人が今年の活躍で選ばれる
   ・投手は上位2人が1日目・2日目の先発、残りは中継ぎ（先発は3回まで、中継ぎは1回ずつ）
   ・4回以降は代打・代走・守備固めを多用する
   ・成績はシーズンの成績に入らない。いちばん活躍した選手がMVP（持ち点+1）、2番目が敢闘賞（+0.5）→ 次のキャンプの持ち点に加算
   ================================================================ */
const AS_DAY=75;
// 活躍度（MVP・敢闘賞の査定）：投手・野手・二刀流に関係なく同じ式。打点・本塁打・（圧倒的に高い）打率・投球回（控えめ）・奪三振・防御率の総合点
function mvpScore(st){
  st=st||{}; let s=(st.rbi||0)*1.5+(st.hr||0)*4;
  const pa=st.pa||0, ab=st.ab||pa, h=st.h||0; if(pa>=8&&ab>0){ const avg=h/ab; if(avg>=0.5) s+=8; else if(avg>=0.4) s+=4; }
  const outs=st.outs||0, k=st.k||0, runs=st.runs||0;
  s+=outs*0.3+k*0.7; if(outs>=6){ const era=runs*27/outs; s+=Math.max(-3,Math.min(4,(4.5-era)))*0.8; }
  return Math.round(s*10)/10;
}
// オールスターの試合では名前の下に所属球団を出す
const asTag=id=>(typeof G!=='undefined'&&G&&G.pen&&(G.pen.allstar||G.pen.wbc)&&id&&typeof TEAM!=='undefined'&&TEAM[id])?`<div class="asteam" style="background:${TEAM[id].jersey||TEAM[id].cap};color:${TEAM[id].chc||TEAM[id].cl};border-color:${TEAM[id].brim||TEAM[id].cap}">${TEAM[id].name}</div>`:'';
const AS_POS=[['C',3],['1B',3],['2B',3],['3B',3],['SS',3],['OF',9]];
function asMeOK(){   // 自分が選ばれる条件：今年の評価が高く、出場も十分
  if(!PEN||PEN.released||(typeof injured==='function'&&injured())) return false;
  const s=PEN.ss, ev=evalR();
  if(isBat()) return ev>=54&&s.pa>=120;
  if(isTW()) return ev>=54&&(s.outs>=60||(PEN.bss&&PEN.bss.pa>=100));
  return ev>=54&&(s.outs>=60||(s.sv||0)+(s.hld||0)>=8);
}
function asSelect(lg){
  const F=[],P=[];
  lgTeams(lg).forEach(id=>{ const T=PEN.teams[id];
    T.F.forEach(f=>F.push({f,id,sc:hitScore(f)+(f.d-50)*0.2+(f.pf||0)+rnd()*8}));
    T.P.forEach(p=>P.push({p,id,sc:pitScore(p)+rnd()*10})); });
  const used=new Set();
  const take=(pos,n)=>F.filter(x=>!used.has(x)&&x.f.pos===pos).sort((a,b)=>b.sc-a.sc).slice(0,n).map(x=>{ used.add(x); return x; });
  let sel=[]; AS_POS.forEach(([pos,n])=>sel=sel.concat(take(pos,n)));
  const dh=F.filter(x=>!used.has(x)).sort((a,b)=>b.sc-a.sc).slice(0,3); dh.forEach(x=>used.add(x)); sel=sel.concat(dh);
  const pit=P.sort((a,b)=>b.sc-a.sc).slice(0,10);
  // 自分（条件を満たせば、同じポジションの3人目／投手の10人目と入れ替わる）
  let me=null;
  if(TEAM[PEN.team].lg===lg&&asMeOK()){
    if(isBat()||isTW()){ const mf=myFielder(PEN.bpos||'OF'); mf.btype=PEN.btype||'バランス'; const i=sel.map((x,k)=>x.f.pos===mf.pos?k:-1).filter(k=>k>=0).pop();
      const ent={f:mf,id:PEN.team,sc:999,me:true}; if(i>=0) sel[i]=ent; else sel.push(ent); me=ent; }
    if(!isBat()){ const mp={isMe:true,name:PEN.pname,num:MYNUM,hand:PEN.hand,velo:PEN.abil.velo,control:PEN.abil.control,stamina:PEN.abil.stamina,types:PEN.rep.slice(),plv:{...PEN.plev}};
      mp.q=pitQ(mp); const ent={p:mp,id:PEN.team,sc:999,me:true}; pit[pit.length-1]=ent; pit.sort((a,b)=>b.sc-a.sc); me=me||ent; }
  }
  return {F:sel,P:pit,me};
}
// 1試合（9回）。sub＝代打・代走・守備固めの記録
function asGame(day,A,B,opts){   // A＝セ（先攻）、B＝パ（後攻）。opts：nStart＝先発の人数（オールスター2・ポストシーズン4）、sub＝交代の多さ（1＝オールスター並み）
  opts=opts||{}; const NS=opts.nStart||2, SUB=opts.sub==null?1:opts.sub, ODD=opts.odd==null?1:opts.odd, SI=opts.startInn||3;   // SI＝先発が投げる回数   // ODD＝野手登板・代打投手の起きやすさ（オールスター1・ポストシーズン0.15）
  const side=(S)=>{ const T={F:S.F.map(x=>x.f)}; const st=battingOrder(pickStarters(T,null),S.mgr||null); const bench=S.F.filter(x=>!st.some(s=>s.f===x.f));
    const lineup=st.map((x,i)=>{ const b=toBatter(x.f,i+1); const ent=S.F.find(e=>e.f===x.f); b.me=!!(ent&&ent.me); b.team=ent?ent.id:null; b.slot=x.slot; b.st={pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}; return b; });
    const pit=S.P.map(x=>({...x,st:{outs:0,runs:0,k:0,h:0}}));
    return {lineup,bench:bench.map(e=>({...e,st:{pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}})),pit,order:-1,subs:[]}; };
  const H=side(A), V=side(B), sc={A:[],B:[]}; const ev=[];
  const starter=(S,d)=>S.pit[(d-1)%Math.min(NS,S.pit.length)], relief=(S,inn)=>{ const R=S.pit.slice(Math.min(NS,Math.max(0,S.pit.length-1))); return R.length?R[((inn-SI-1)+(day-1)*3)%R.length]:S.pit[S.pit.length-1]; };
  const batEnt=(S,b)=>{ const s=S.bench.find(e=>e.f===b.f); return s; };
  const pitcherNow=(S,inn)=>{ if(S.nextPit){ const p=S.nextPit; S.nextPit=null; S.subs.push(`${inn}回 代打からそのまま登板 ${p.p.name}`); return p; } return inn<=SI?starter(S,day):relief(S,inn); };
  const pitchQ=P=>P.me?pitQ(P.p):(P.p.q||1);
  // 野手登板：終盤に点差が大きいとき、控え野手（なければスタメン）が投げる（q＝打たれやすい）
  const fielderPitcher=(S)=>{ if(S.fpit) return S.fpit; const src=S.bench.length?S.bench[ri(0,S.bench.length-1)]:S.lineup[ri(0,8)]; const f=src.f||src; const p={name:src.name||f.n,num:f.num,hand:f.h||'R',velo:120,types:['ストレート','スローカーブ'],plv:{'ストレート':1,'スローカーブ':1},q:1.4,fielder:true};
    S.fpit={p,id:src.team||src.id,me:!!src.me,st:{outs:0,runs:0,k:0,h:0,fp:true}}; S.pit.push(S.fpit); S.subs.push(`野手登板 ${p.name}`); return S.fpit; };
  // 代打投手：控え野手が尽きたとき、投手が代打に立つ（打撃は全能力10）
  const pitcherPinch=(S,order)=>{ const cand=S.pit.filter(x=>!x.fielder&&!x.used); const src=cand.length?cand[ri(0,cand.length-1)]:null; if(!src) return null; src.used=true;
    const f={n:src.p.name,num:src.p.num,h:src.p.hand||'R',m:10,p:10,s:10,e:10,d:10,pos:'P',btype:'バランス'}; const b=toBatter(f,order); b.me=!!src.me; b.team=src.id; b.slot='DH'; b.st={pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:['代打（投手）']}; b.pitcherBat=true; S.pinchP=S.pinchP||[]; S.pinchP.push(b); S.subs.push(`代打（投手） ${b.name}`); return b; };
  for(let inn=1;inn<=9;inn++){
    for(const [att,def,key] of [[H,V,'A'],[V,H,'B']]){
      if(inn===9&&key==='B'&&sumN(sc.B)>sumN(sc.A)) break;   // サヨナラ不要
      let P=pitcherNow(def,inn); let outs=0, bases=[0,0,0], runs=0;
      const diff=Math.abs(sumN(sc.A)-sumN(sc.B));
      if(inn>=8&&diff>=5&&rnd()<0.6*ODD) P=fielderPitcher(def);
      while(outs<3){
        att.order=(att.order+1)%9; let b=att.lineup[att.order];
        // 代打：4回以降、控えが残っていれば高確率で（自分は代えられない）
        // 代打（投手）：ベンチに守備につける野手が残っているときに起きる（投手を守備にはつけられないので、そのあと控え野手が守る）。ポストシーズンでは控えが尽きたときだけ
        if(inn>=7&&!b.me&&!b.pitcherBat&&b.slot!=='DH'&&(ODD>=1?(att.bench.length>=1&&rnd()<0.015):(att.bench.length===0&&rnd()<0.5))){ const nb=pitcherPinch(att,b.order); if(nb){ att.lineup[att.order]=nb; b=nb; b.ppSrc=att.pit.find(x=>x.p.name===nb.name);
            if(att.bench.length){ const fb=att.bench.shift(); const fbb=toBatter(fb.f,b.order); fbb.me=!!fb.me; fbb.team=fb.id; fbb.slot=b.slot; fbb.st=fb.st; fbb.st.app.push('守備'); att.after=fbb; } } }   // 控えが尽きたとき（オールスターでは余裕があるときも）投手が代打
        else if(inn>=4&&!b.me&&att.bench.length&&rnd()<0.22*SUB){ const nb=att.bench.shift(); const nbb=toBatter(nb.f,b.order); nbb.me=!!nb.me; nbb.team=nb.id; nbb.slot=b.slot; nbb.st=nb.st; nbb.st.app.push('代打'); att.subs.push(`${inn}回 代打 ${nbb.name}（${b.name}に代わり）`); att.lineup[att.order]=nbb; b=nbb; }
        let r;
        if(b.me&&(isBat()||isTW())){ r={BB:'BB',HBP:'BB',K:'K',HR:'HR','1B':'1B',IFH:'1B','2B':'2B','3B':'3B',GO:'GO',FO:'FO',LO:'FO'}[autoKind(effBabil(PEN.babil,'bat'))]||'FO'; }
        else r=simPA(b,pitchQ(P));
        b.st.pa++; let s=0;
        if(r==='BB'){ if(bases[0]){ if(bases[1]){ if(bases[2]) s++; bases[2]=bases[1]; } bases[1]=bases[0]; } bases[0]=b; }
        else if(r==='HR'){ s=bases.filter(Boolean).length+1; bases.forEach(x=>x&&x.st.run++); b.st.run++; b.st.h++; b.st.hr++; bases=[0,0,0]; }
        else if(r==='3B'){ s=bases.filter(Boolean).length; bases.forEach(x=>x&&x.st.run++); bases=[0,0,b]; b.st.h++; }
        else if(r==='2B'){ if(bases[2]){s++;bases[2].st.run++;} if(bases[1]){s++;bases[1].st.run++;} const r1=bases[0]; bases=[0,b,0]; if(r1){ if(rnd()<.4){s++;r1.st.run++;} else bases[2]=r1; } b.st.h++; }
        else if(r==='1B'){ if(bases[2]){s++;bases[2].st.run++;} const nb=[b,0,0]; if(bases[1]){ if(rnd()<.6){s++;bases[1].st.run++;} else nb[2]=bases[1]; } if(bases[0]){ if(!nb[2]&&rnd()<.3) nb[2]=bases[0]; else nb[1]=bases[0]; } bases=nb; b.st.h++; }
        else if(r==='K'){ outs++; P.st.k++; }
        else if(r==='GO'){ if(bases[0]&&outs<2&&rnd()<.35){ outs+=2; bases[0]=0; } else { outs++; if(outs<3&&bases[2]&&rnd()<.4){ s++; bases[2].st.run++; bases[2]=0; } } }
        else { outs++; if(outs<3&&bases[2]&&rnd()<.5){ s++; bases[2].st.run++; bases[2]=0; } }
        if(['1B','2B','3B','HR'].includes(r)) P.st.h++;
        b.st.rbi+=s; runs+=s; P.st.runs+=s;
        if(b.pitcherBat){ if(b.ppSrc&&rnd()<0.4){ att.nextPit=b.ppSrc; att.subs.push(`${inn}回 代打（投手）${b.name}はそのまま次の回に登板`); } if(att.after){ att.lineup[att.order]=att.after; att.after=null; } }
        if(s>=1||r==='HR') ev.push(`${day}日目 ${inn}回${key==='A'?'表':'裏'} ${b.name}${b.me?'（あなた）':''} ${r==='HR'?'本塁打':r==='3B'?'三塁打':r==='2B'?'二塁打':r==='1B'?'適時打':r==='BB'?'押し出し':'犠打・内野ゴロ'}（${s}点）`);
        // 代走：出塁した走者を、足の速い控えに代える（4回以降）
        if(inn>=4&&bases[0]===b&&!b.me&&att.bench.length&&rnd()<0.3*SUB){ const i=att.bench.reduce((bi,e,k,arr)=>e.f.s>arr[bi].f.s?k:bi,0); const nb=att.bench.splice(i,1)[0]; const nbb=toBatter(nb.f,b.order); nbb.me=!!nb.me; nbb.team=nb.id; nbb.slot=b.slot; nbb.st=nb.st; nbb.st.app.push('代走'); att.subs.push(`${inn}回 代走 ${nbb.name}`); att.lineup[att.order]=nbb; bases[0]=nbb;
          if(rnd()<0.5){ if(rnd()<0.42+nb.f.s*0.005){ nbb.st.sb++; bases[0]=0; bases[1]=nbb; ev.push(`${day}日目 ${inn}回 代走${nbb.name} 盗塁成功`); } else { outs++; bases[0]=0; } } }
        if(outs>=3) break;
      }
      sc[key][inn-1]=runs;
      if(P.st) P.st.outs+=3;
      // 野手登板のあと、低確率でそのまま守れる守備につく（控えから投げた選手は打線に入る）
      if(P.fielder===undefined&&P.p&&P.p.fielder&&!P.back&&rnd()<0.2){ P.back=true; const src=def.bench.find(e=>(e.f.n||e.name)===P.p.name);
        if(src){ const tgt=def.lineup.findIndex(b=>!b.me&&b.slot!=='DH'&&b.slot===src.f.pos); if(tgt>=0){ def.bench.splice(def.bench.indexOf(src),1); const old=def.lineup[tgt]; const nbb=toBatter(src.f,old.order); nbb.me=!!src.me; nbb.team=src.id; nbb.slot=old.slot; nbb.st=src.st; nbb.st.app.push('登板後に守備'); def.lineup[tgt]=nbb; def.subs.push(`${inn}回 野手登板の${nbb.name}はそのまま${POS1[src.f.pos==='OF'?'CF':src.f.pos]||''}の守備に`); } }
        else def.subs.push(`${inn}回 野手登板の${P.p.name}はそのまま守備に戻る`); }
      // 守備固め（6回以降、守る側）
      if(inn>=6&&def.bench.length&&rnd()<0.4*SUB){ const i=def.bench.reduce((bi,e,k,arr)=>e.f.d>arr[bi].f.d?k:bi,0); const nb=def.bench[i]; const tgt=def.lineup.findIndex(b=>!b.me&&b.slot!=='DH'&&b.slot===nb.f.pos); if(tgt>=0){ def.bench.splice(i,1); const old=def.lineup[tgt]; const nbb=toBatter(nb.f,old.order); nbb.me=!!nb.me; nbb.team=nb.id; nbb.slot=old.slot; nbb.st=nb.st; nbb.st.app.push('守備固め'); def.subs.push(`${inn}回 守備固め ${nbb.name}（${POS1[nb.f.pos==='OF'?'CF':nb.f.pos]||''}）`); def.lineup[tgt]=nbb; } }
    }
  }
  const all=[...H.lineup,...H.bench,...(H.pinchP||[]),...V.lineup,...V.bench,...(V.pinchP||[])].filter(b=>b.st&&b.st.pa>0).map(b=>({name:b.name||b.f.n,team:b.team||b.id,me:!!b.me,kind:'B',st:b.st,
    score:mvpScore(b.st)}));
  const pits=[...H.pit,...V.pit].filter(p=>p.st.outs>0).map(p=>({name:p.p.name,team:p.id,me:!!p.me,kind:'P',st:p.st,score:mvpScore(p.st)}));
  return {day,sc,ev,subs:[...H.subs.map(s=>'セ '+s),...V.subs.map(s=>'パ '+s)],players:all.concat(pits)};
}
const AS_LG={'セ':{name:'オール・セントラル',short:'全セ',s:'セ',bg:'#c8102e',fg:'#ffffff'},'パ':{name:'オール・パシフィック',short:'全パ',s:'パ',bg:'#0f3fa8',fg:'#ffffff'}};
// 選出されたチームからスタメン（打者オブジェクト）を作る。所属球団を team に持つ
function asLineup(S){
  const T={F:S.F.map(x=>x.f)}; const st=battingOrder(pickStarters(T,null),S.mgr||null);   // 監督の打順志向（オールスターは1位チームの監督、WBCは代表監督）
  return st.map((x,i)=>{ const ent=S.F.find(e=>e.f===x.f)||{}; const b=toBatter(x.f,i+1); b.team=ent.id; b.isMe=!!ent.me; b.slot=x.slot; b.res=[]; return b; });
}
const asPit=(S,day,nStart)=>{ const P=S.P.map(x=>({...x.p,team:x.id,isMe:!!x.me})), NS=Math.min(nStart||2,P.length), si=(day-1)%NS; const sp=P[si], rest=P.filter((_,i)=>i>=NS); return {sp,pen:(rest.length?rest:P.filter((_,i)=>i!==si)).slice(0,6)}; };
// 自分の役割：野手・二刀流は打者、投手は上位2人なら先発（1日目／2日目）、それ以外は両日とも中継ぎ
function asMyRole(S){
  if(isBat()||isTW()) return {kind:'bat'};
  const i=S.P.findIndex(x=>x.me); if(i<0) return null;
  return i<=1 ? {kind:'start',day:i+1} : {kind:'relief'};
}
function allstarCheck(){
  if(!PEN||PEN.released||PEN.allstarY===PEN.year||PEN.day!==AS_DAY) return;
  PEN.allstarY=PEN.year;
  const A=asSelect('セ'), B=asSelect('パ');
  // 監督はそのリーグでオールスター時点で1位のチームの監督
  const mgrA=mgrOf(standings('セ')[0].id), mgrB=mgrOf(standings('パ')[0].id), teamA=standings('セ')[0].id, teamB=standings('パ')[0].id;
  const strip=(S,m,t)=>({F:S.F.map(x=>({f:x.f,id:x.id,me:!!x.me})),P:S.P.map(x=>({p:x.p,id:x.id,me:!!x.me})),mgr:{...m},mgrTeam:t});
  PEN.asState={y:PEN.year,A:strip(A,mgrA,teamA),B:strip(B,mgrB,teamB),mine:TEAM[PEN.team].lg,sel:!!(A.me||B.me),games:{}};
  penNotice(`⭐ オールスターの監督：全セ＝${TEAM[teamA].short}の${mgrA.sur}監督、全パ＝${TEAM[teamB].short}の${mgrB.sur}監督（各リーグ1位）`);
  if(!PEN.asState.sel){ allstarFinalize(); return; }
  const role=asMyRole(TEAM[PEN.team].lg==='セ'?PEN.asState.A:PEN.asState.B);
  PEN.asState.role=role; PEN.asState.nextDay=1;   // 出番は penStep が作る（試合の後処理で pending が消されないように）
  penNotice(`⭐ オールスターに${isBat()?'野手':isTW()?'二刀流（指名打者で出場）':'投手'}として選出！ ${role.kind==='start'?`${role.day}日目の先発（3回まで）`:role.kind==='relief'?'両日とも中継ぎで1イニング':'スタメンで出場'}`);
  PEN.talk={y:PEN.year,untilDay:PEN.day+2,text:`${PEN.pname}、オールスターにファン投票と監督推薦で選ばれたぞ。${role.kind==='start'?`${role.day}日目の先発だ。3回まで思いきり腕を振ってこい。`:role.kind==='relief'?'中継ぎで両日とも出番がある。1イニング、全力でいけ。':'スタメンだ。全国のファンの前で思いきり振ってこい。'}球団の誇りだ、楽しんでこい。`};
}
// 日程を進める前に：オールスターの出番が残っていれば pending にする（penStep から）
function allstarStep(){
  const S=PEN&&PEN.asState; if(!S||!S.sel||PEN.pending) return false;
  asNextPending(S.nextDay||1); return !!PEN.pending;   // 出番がなければ（2試合とも終わっていれば）そのまま日程を進める
}
function asNextPending(day){
  const S=PEN.asState, role=S.role; if(!S||!role) return;
  for(let d=day; d<=2; d++){
    if(role.kind==='start'&&role.day!==d) continue;   // 先発の日以外は出番なし
    S.nextDay=d; PEN.pending={day:PEN.day,opp:null,kind:'allstar',asDay:d,asKind:role.kind,started:false};
    return;
  }
  allstarFinalize();
}
// オールスターの試合を始める（penPlay から）
function allstarPlay(p){
  const S=PEN.asState, mineLg=S.mine, MY=mineLg==='セ'?S.A:S.B, OP=mineLg==='セ'?S.B:S.A, opLg=mineLg==='セ'?'パ':'セ';
  const names={my:{name:AS_LG[mineLg].short,s:AS_LG[mineLg].s,lg:mineLg},opp:{name:AS_LG[opLg].short,s:AS_LG[opLg].s,lg:opLg}};
  const oppL=asLineup(OP), myL0=asLineup(MY), gp=asPit(OP,p.asDay), gm=asPit(MY,p.asDay);
  const myIdx=myL0.findIndex(b=>b.isMe);
  const pen={day:p.day,year:PEN.year,kind:p.asKind==='bat'?'bat':p.asKind,role:PEN.role,team:PEN.team,opp:null,allstar:true,asDay:p.asDay,lg:mineLg};
  showScreen('game');
  if(p.asKind==='bat'){
    const myL=myL0.map(b=>b.isMe?{...meBatter(),order:b.order,team:PEN.team}:{...plainB(b),team:b.team});
    const mySlot=myIdx>=0?myL0[myIdx].slot:'DH';
    batNewGame({OPP:{pattern:'standard',hand:'normal'}, lineup:oppL.map(b=>({...b,res:[]})), myLineup:myL, myTeam:{name:AS_LG[mineLg].name,hand:''},
      pits:[gp.sp,...gp.pen], ours:[gm.sp,...gm.pen.slice(0,2)], defAdj:1, names, pname:PEN.pname, bhand:PEN.bhand, babil:PEN.babil, kind:'bat', order:myIdx>=0?myIdx+1:9,
      slot:mySlot, ofSide:PEN.ofSide||(PEN.ofSide=pick(['左','中','右'])), pen, mission:null});
    const Q=batProceed(); renderAll(); save(); if(typeof showTitle==='function') showTitle();
    setTimeout(()=>playBack(Q,batAfterPlay),1200);
    return;
  }
  // 投手：先発（3回まで）または中継ぎ（途中の回から1イニング）
  const myL=myL0.map(b=>({...plainB(b),team:b.team}));
  PHAND=PEN.hand; REP=PEN.rep.slice(); PLEV={...PEN.plev}; ptype=REP[0];
  let pre=null;
  if(p.asKind==='relief'){
    const T={lineup:oppL.map(b=>({...b,res:[]})),order:-1}, M={lineup:myL.map(b=>({...b,res:[]})),order:-1}, E=ri(4,8), sc={opp:[],my:[]}; let ho=0,hm=0;
    for(let i=1;i<E;i++){ const a=simHalf(T,0,[0,0,0],i<=3?gm.sp.q:(gm.pen[(i-4)%gm.pen.length]||gm.sp).q,null); sc.opp.push(a.runs); ho+=a.hits;
      const b=simHalf(M,0,[0,0,0],i<=3?gp.sp.q:(gp.pen[(i-4)%gp.pen.length]||gp.sp).q,null); sc.my.push(b.runs); hm+=b.hits; }
    pre={entry:E,score:sc,oppOrder:T.order,myOrder:M.order,hitsOpp:ho,hitsMy:hm,oppLineup:T.lineup.map(serB),myLineup:M.lineup,lead:sumN(sc.my)-sumN(sc.opp)};
    p.pre=pre;
  }
  newGame(true,{OPP:{pattern:'standard',hand:'normal'}, lineup:pre?pre.oppLineup.map(deB):oppL.map(b=>({...b,res:[]})),
    myTeam:{name:AS_LG[mineLg].name,hand:'',lineup:pre?pre.myLineup.map(b=>({...b,res:(b.res||[]).slice()})):myL,order:-1},
    names, pname:PEN.pname, pen, pre, abil:PEN.abil, oppPitcher:{...gp.sp}, oppPen:gp.pen.map(x=>({...x})), bullpen:gm.pen.map(x=>({...x})), mission:null});
  renderAll(); save();
}
// 試合が終わった（penGameDone から）。シーズン成績には入れず、オールスターの記録だけ残す
function allstarGameDone(){
  const S=PEN.asState, p=PEN.pending; if(!S||!p||p.kind!=='allstar') return;
  const st=G.st, res=G.result?G.result.res:'T';
  const bat=G.bat&&!G.tw;
  S.games[p.asDay]=bat?{kind:'B',st:{pa:st.pa,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,run:st.run,app:[]},score:[oppTot(),myTot()],res}
                     :{kind:'P',st:{outs:st.outs,runs:st.runs,k:st.k,h:st.hits},score:[oppTot(),myTot()],res,dec:G.result?G.result.dec:'－'};
  PEN.pending=null; S.nextDay=p.asDay+1;
}
// スキップ：その試合の自分の成績はシミュレーションに任せる
function allstarSkip(){
  const S=PEN.asState, p=PEN.pending; if(!S||!p||p.kind!=='allstar') return;
  if(gameIsPending()) closePenGame();
  S.games[p.asDay]='sim';
  PEN.pending=null; S.nextDay=p.asDay+1;
}
// 2試合が終わったら：ほかの選手はシミュレーション、自分は実際の成績で表彰を決める
function allstarFinalize(){
  const S=PEN.asState; if(!S) return;
  const games=[asGame(1,S.A,S.B),asGame(2,S.A,S.B)];
  const tot={};
  games.forEach(g=>g.players.forEach(p=>{ if(p.me&&S.games[g.day]&&S.games[g.day]!=='sim') return;   // 自分が実際に出た試合はシミュレーションを使わない
    const k=p.name+'@'+p.team+(p.me?'':'')+'#'+p.kind; const t=tot[k]||(tot[k]={name:p.name,team:p.team,me:p.me,kind:p.kind,score:0,st:p.kind==='B'?{pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}:{outs:0,runs:0,k:0,h:0}});
    t.score+=p.score; for(const kk in p.st){ if(Array.isArray(p.st[kk])) t.st[kk]=t.st[kk].concat(p.st[kk]); else t.st[kk]+=p.st[kk]; } }));
  // 自分が実際に出た試合
  for(const d of [1,2]){ const g=S.games[d]; if(!g||g==='sim') continue;
    const k=PEN.pname+'@'+PEN.team+'#'+g.kind; const t=tot[k]||(tot[k]={name:PEN.pname,team:PEN.team,me:true,kind:g.kind,score:0,st:g.kind==='B'?{pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}:{outs:0,runs:0,k:0,h:0}});
    for(const kk in g.st){ if(Array.isArray(g.st[kk])) t.st[kk]=t.st[kk].concat(g.st[kk]); else t.st[kk]+=g.st[kk]; }
    t.score+=mvpScore(g.st);
    if(games[d-1]){ games[d-1].sc=games[d-1].sc; games[d-1].mySc=g.score; } }
  const rank=Object.values(tot).sort((a,b)=>b.score-a.score);
  const line=p=>p.kind==='B'?`${p.st.pa}打席${p.st.h}安打${p.st.hr?` ${p.st.hr}本`:''}${p.st.rbi?` ${p.st.rbi}打点`:''}${p.st.sb?` ${p.st.sb}盗塁`:''}${p.st.app&&p.st.app.length?`（${[...new Set(p.st.app)].join('・')}）`:''}`:`${fmtIP(p.st.outs)}回${p.st.runs}失点${p.st.k?` ${p.st.k}奪三振`:''}`;
  // 勝ったリーグ：2試合の勝ち数（1勝1敗なら総得点、同じならランダム）。敢闘賞は負けたリーグで最も活躍した選手
  const scA=games.map(g=>{ const my=S.games[g.day]; return my&&my!=='sim'&&my.score?(S.mine==='セ'?[my.score[1],my.score[0]]:[my.score[0],my.score[1]]):[sumN(g.sc.A),sumN(g.sc.B)]; });
  let wA=scA.filter(s=>s[0]>s[1]).length, wB=scA.filter(s=>s[1]>s[0]).length; if(wA===wB){ const ra=scA.reduce((t,s)=>t+s[0],0), rb=scA.reduce((t,s)=>t+s[1],0); wA=ra>rb?1:ra<rb?0:(rnd()<0.5?1:0); wB=1-wA; }
  const loseLg=wA>wB?'パ':'セ', inLg=p=>(TEAM[p.team]&&TEAM[p.team].lg)===loseLg;
  const mvp=rank.find(p=>!inLg(p))||rank[0], fs=rank.find(p=>inLg(p)), meT=rank.find(p=>p.me);   // MVP＝勝ったリーグで最も活躍、敢闘賞＝負けたリーグで最も活躍
  const res={y:PEN.year,games:games.map(g=>{ const my=S.games[g.day]; const sc=my&&my!=='sim'&&my.score?(S.mine==='セ'?[my.score[1],my.score[0]]:[my.score[0],my.score[1]]):[sumN(g.sc.A),sumN(g.sc.B)]; return {day:g.day,sc,ev:g.ev.slice(0,8),subs:g.subs.length,played:!!(my&&my!=='sim')}; }),
    mvp:mvp?{name:mvp.name,team:mvp.team,me:mvp.me,line:line(mvp)}:null, fs:fs?{name:fs.name,team:fs.team,me:fs.me,line:line(fs)}:null,
    me:S.sel?{sel:true,role:isBat()?'野手':isTW()?'二刀流':'投手',line:meT?line(meT):'出場なし',rank:meT?rank.indexOf(meT)+1:null}:{sel:false}};
  if(mvp&&mvp.me){ titleAward('オールスターMVP',1,1); res.me.award='MVP（持ち点+1）'; }
  else if(fs&&fs.me){ titleAward('オールスター敢闘賞',0.5,1); res.me.award='敢闘賞（持ち点+0.5）'; }
  PEN.allstar=res; PEN.asState=null; PEN.pending=null;
  const g1=res.games[0], g2=res.games[1];
  penNotice(`⭐ オールスター：第1戦 セ${g1.sc[0]}−${g1.sc[1]}パ、第2戦 セ${g2.sc[0]}−${g2.sc[1]}パ。MVP ${res.mvp?`${res.mvp.name}（${TEAM[res.mvp.team].short}）${res.mvp.line}`:'-'}／敢闘賞 ${res.fs?`${res.fs.name}（${TEAM[res.fs.team].short}）`:'-'}`);
  if(res.me.sel) penNotice(`⭐ オールスターでのあなた：${res.me.line}${res.me.rank?`（活躍度${res.me.rank}位）`:''}${res.me.award?`　🏆 ${res.me.award}。次のキャンプの持ち点に加算（ためている持ち点 ${PEN.awake.bank}）`:''}`);
  else penNotice('⭐ オールスターには選ばれなかった（今年の評価54以上と十分な出場が条件）');
  if(typeof renderPennant==='function'&&!QUIET) renderPennant();
}
function allstarHTML(){
  const r=PEN&&PEN.allstar; if(!r||r.y!==PEN.year) return '';
  return `<div class="sh2">⭐ オールスター（${r.y}年目）</div><div class="pcardx">
    ${r.games.map(g=>`<div><b>第${g.day}戦</b> セ ${g.sc[0]}−${g.sc[1]} パ <small style="color:var(--mute)">（代打・代走・守備固め ${g.subs}回）</small></div>`).join('')}
    <div style="margin-top:4px">🏆 MVP：<b>${r.mvp?`${r.mvp.name}（${TEAM[r.mvp.team].short}）`:'-'}</b> <small>${r.mvp?r.mvp.line:''}</small></div>
    <div>🎖 敢闘賞：<b>${r.fs?`${r.fs.name}（${TEAM[r.fs.team].short}）`:'-'}</b> <small>${r.fs?r.fs.line:''}</small></div>
    <div style="margin-top:4px">${r.me.sel?`あなた：${r.me.role}で選出　${r.me.line}${r.me.award?`　<b style="color:var(--accent)">${r.me.award}</b>`:''}`:'あなたは選外'}</div>
    <div class="hint">各ポジション3人（外野9人）＋指名打者3人、投手10人を今年の活躍で選出。成績はシーズンの成績には入りません</div></div>`;
}
