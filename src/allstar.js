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
  const s=PEN.ss, ev=evalOld();
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
    if(!isBat()&&!isTW()){ const mp={isMe:true,name:PEN.pname,num:MYNUM,hand:PEN.hand,velo:PEN.abil.velo,control:PEN.abil.control,stamina:PEN.abil.stamina,types:PEN.rep.slice(),plv:{...PEN.plev}};
      mp.q=pitQ(mp); const ent={p:mp,id:PEN.team,sc:0,me:true}; pit[pit.length-1]=ent; me=me||ent; }   // 起用の順番はチーム内の評価で決める（evPitRank）
  }
  return {F:sel,P:pit,me};
}
// 1試合（9回）。sub＝代打・代走・守備固めの記録
function asGame(day,A,B,opts){   // A＝セ（先攻）、B＝パ（後攻）。opts：nStart＝先発の人数（オールスター2・ポストシーズン4）、sub＝交代の多さ（1＝オールスター並み）
  opts=opts||{}; const NS=opts.nStart||2, SUB=opts.sub==null?1:opts.sub, ODD=opts.odd==null?1:opts.odd, SI=opts.startInn||3;   // SI＝先発が投げる回数   // ODD＝野手登板・代打投手の起きやすさ（オールスター1・ポストシーズン0.15）
  const side=(S)=>{ const T={F:S.F.map(x=>x.f)}; const st=battingOrder(S.starters?S.starters.slice():pickStarters(T,null),S.mgr||null);   /* starters＝大会の評価で決めたスタメン */ const bench=S.F.filter(x=>!st.some(s=>s.f===x.f));
    const lineup=st.map((x,i)=>{ const b=toBatter(x.f,i+1); const ent=S.F.find(e=>e.f===x.f); b.me=!!(ent&&ent.me); b.team=ent?ent.id:null; b.slot=x.slot; b.st={pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}; return b; });
    const pit=S.P.map(x=>({...x,st:{outs:0,runs:0,k:0,h:0}}));
    return {lineup,bench:bench.map(e=>({...e,st:{pa:0,h:0,hr:0,rbi:0,sb:0,run:0,app:[]}})),pit,order:-1,subs:[],ns:S.ns||0}; };
  const H=side(A), V=side(B), sc={A:[],B:[]}; const ev=[];
  const nsOf=S=>S.ns||NS;   // ns＝1：その日の先発が先頭（大会の評価で決めた並び）
  const starter=(S,d)=>S.pit[S.ns?0:(d-1)%Math.min(NS,S.pit.length)], relief=(S,inn)=>{ const R=S.pit.slice(Math.min(nsOf(S),Math.max(0,S.pit.length-1))); return R.length?R[((inn-SI-1)+(day-1)*3)%R.length]:S.pit[S.pit.length-1]; };
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
const AS_LG={'セ':{name:'オール・セントラル',short:'全セ',s:'セ',bg:'#005097',fg:'#ffffff',bd:'#319441'},'パ':{name:'オール・パシフィック',short:'全パ',s:'パ',bg:'#04192a',fg:'#ffffff',bd:'#01aae5'}};
// オールスターのユニフォーム：全セ＝青地に白の筆記体「Central」・緑の線と背番号、全パ＝紺地に白の筆記体「Pacific」・水色の線と背番号。胸の文字の下に各球団の色の星。左肩には所属球団の2色のストライプのワッペン
const AS_UNI={
  'セ':{cap:'#005097',brim:'#005097',cl:'#ffffff',ch:'C',chf:'script',jersey:'#005097',pin:0,chest:'Central',chc:'#ffffff',chs:'',num:'#319441',nums:'',noNum:1,sl:'#319441',under:'#003f78',neck:'#319441',pants:'#f4f4f4',panel:0,trim:'#00396c',jk:'#005097',jt:'#319441'},
  'パ':{cap:'#04192a',brim:'#04192a',cl:'#ffffff',ch:'P',chf:'script',jersey:'#04192a',pin:0,chest:'Pacific',chc:'#ffffff',chs:'',num:'#01aae5',nums:'',noNum:1,sl:'#01aae5',under:'#04192a',neck:'#01aae5',pants:'#f4f4f4',panel:0,trim:'#123a55',jk:'#04192a',jt:'#01aae5'},
};
const isWhiteC=c=>/^#(fff|ffffff|f7f7f7|f4f4f4)$/i.test(c||'');
function asUni(lg,team){
  const u={...(AS_UNI[lg]||AS_UNI['セ'])}, t=typeof TEAM!=='undefined'&&TEAM[team];
  if(t) u.patch=[t.jk||t.cap,t.jt||t.cl];   // 所属球団の2色（1:1のストライプ）
  u.stars=lgTeams(lg).map(id=>{ const x=TEAM[id]; return isWhiteC(x.jt)?x.jk:x.jt; });
  return u;
}

/* ---- 大会チーム（オールスターの全セ・全パ、WBCの日本代表）の中の評価 ----
   最初の順位は「前年の成績＋通算の成績」から出した評価順（成績が少ないうちは能力で見る）。大会中の成績とミッション（+3）で上下する
   この評価はその大会の中だけ（シーズンの評価・お気に入り度には入らない）
   投手：オールスターは評価の上位から1日目・2日目の先発、WBCは上位3人のローテーション。残りはブルペン（WBCはブルペン1番手が抑え）
   野手：ポジションごとに評価のいちばん高い選手がスタメン、指名打者は残りでいちばん高い選手。ほかは控え（代打で出番） */
const EV_MP=0.5;   // 大会・ポストシーズンでミッションが出る確率
const EV_B=s=>{ if(!s||!(s.pa>=10)) return null; const pa=s.pa, ab=Math.max(1,s.ab||pa), bb=(s.bb||0)+(s.hbp||0), obp=(s.h+bb)/pa, slg=(s.h+(s.d2||0)+2*(s.d3||0)+3*(s.hr||0))/ab, kT=s.k!=null?(s.k/pa-0.2)*20:0;
  return 50+(obp+slg-0.775)*90+(s.sb||0)/pa*60-kT; };
const evPriorF=f=>clamp(18+f.m*0.25+f.p*0.2+f.s*0.08+f.e*0.12+(f.d??50)*0.04,25,85);
function evBlendB(prior,ly,car){ const a=EV_B(ly), c=EV_B(car), ws=a==null?0:Math.min(1,ly.pa/400)*0.5, wc=c==null?0:Math.min(1,car.pa/1500)*0.25;
  return prior*(1-ws-wc)+(ws?a*ws:0)+(wc?c*wc:0); }
const evAddSt=(a,b)=>{ if(!a&&!b) return null; const o={...(a||{})}; if(b) for(const k in b) if(typeof b[k]==='number') o[k]=(o[k]||0)+b[k]; return o; };
function evBaseOfF(x){
  if(x.me){ const last=PEN.seasons[PEN.seasons.length-1], tw=isTW(); return evBlendB(abilityRB(),last?(tw?last.bss:last.ss):null,tw?PEN.bcareer:PEN.career); }
  const f=x.f; return evBlendB(evPriorF(f),f.ly||null,evAddSt(f.car,PEN.cs&&PEN.cs[f.id]));
}
function evBaseOfP(x,m){
  if(x.me){ const last=PEN.seasons[PEN.seasons.length-1], ls=last&&last.ss, c=PEN.career;
    return pEval({me:true,rn:abilityR(),s:ls&&ls.outs?{outs:ls.outs,er:ls.runs*0.9,k:ls.k,h:ls.hits,bb:ls.bb}:null,c:c&&c.outs?{outs:c.outs,er:c.runs*0.9,k:c.k,h:c.hits,bb:c.bb}:null,age:PEN.age,pf:0},m); }
  const p=x.p; if(p.rn==null) p.q=pitQ(p);
  const cs=PEN.cs&&p.pid&&PEN.cs[p.pid];
  return pEval({rn:p.rn,s:p.ly||null,c:evAddSt(p.car,cs?{outs:cs.outs,er:cs.er,k:cs.k}:null),age:p.age,pf:0},m);
}
const evKF=x=>x.me?'ME':String(x.f.id!=null?x.f.id:x.f.n);
const evKP=x=>x.me?'ME':String(x.p.pid!=null?x.p.pid:x.p.name);
function evEnsure(X){
  if(X.ev) return X.ev;
  const ev=X.ev={b:{},p:{},d:{b:{},p:{}},mb:0,mok:0,mng:0};
  X.F.forEach(x=>{ ev.b[evKF(x)]=r1(evBaseOfF(x)); });
  X.P.forEach(x=>{ ev.p[evKP(x)]=r1(evBaseOfP(x,X.mgr)); });
  return ev;
}
const evSc=(X,k,key)=>{ const ev=evEnsure(X); return (ev[k][key]||0)+(ev.d[k][key]||0)+(key==='ME'?ev.mb:0); };
const evScF=(X,x)=>evSc(X,'b',evKF(x)), evScP=(X,x)=>evSc(X,'p',evKP(x));
const evPitRank=X=>X.P.slice().sort((a,b)=>evScP(X,b)-evScP(X,a));
const evCanPlay=(x,pos)=>x.me?(isTW()?pos==='DH':(pos==='DH'||myPosAll().includes(pos))):(pos==='DH'||x.f.pos===pos);
// スタメン：ポジションごとに評価の高い順（守備の重みを少しだけ足す）
function evStarters(X){
  const used=new Set(), out=[];
  for(const pos of SLOTS){
    let best=null, bv=-1e9;
    for(const x of X.F){ if(used.has(x)||!evCanPlay(x,pos)) continue; const v=evScF(X,x)+(pos==='DH'?0:((x.f.d??50)-50)*DEF_W[pos]*0.3); if(v>bv){ bv=v; best=x; } }
    if(!best) for(const x of X.F){ if(used.has(x)||(x.me&&isTW())) continue; const v=evScF(X,x)-20; if(v>bv){ bv=v; best=x; } }
    if(best){ used.add(best); out.push({f:best.f,me:!!best.me,slot:pos,val:bv}); }
  }
  return out;
}
// 大会中の成績で評価を上下させる（1試合ぶん）
const evPerfB=st=>(st.h||0)*1.8+(st.hr||0)*2+(st.rbi||0)*0.8+(st.sb||0)*0.5-(st.pa||0)*0.6;
const evPerfP=st=>(st.outs||0)*0.19-(st.runs||0)*2+(st.k||0)*0.3;
function evApply(X,players,skipMe){
  if(!X||!X.F) return; const ev=evEnsure(X), byN={};
  X.F.forEach(x=>{ byN['B'+(x.me?'ME':x.f.n+'@'+x.id)]=evKF(x); }); X.P.forEach(x=>{ byN['P'+(x.me?'ME':x.p.name+'@'+x.id)]=evKP(x); });
  (players||[]).forEach(p=>{ if(p.me&&skipMe) return; const k=byN[p.kind+(p.me?'ME':p.name+'@'+p.team)]; if(k==null||!p.st) return; const t=p.kind==='B'?'b':'p';
    ev.d[t][k]=r1((ev.d[t][k]||0)+(p.kind==='B'?evPerfB(p.st):evPerfP(p.st))); });
}
function evApplyMe(X,kind,st){ if(!X||!X.F) return; const ev=evEnsure(X), t=kind==='B'?'b':'p'; ev.d[t].ME=r1((ev.d[t].ME||0)+(kind==='B'?evPerfB(st):evPerfP(st))); }
// 今の試合が大会の試合なら、その大会のチーム（ミッションの評価はここに入る）
function evMissionTeam(){
  if(typeof G==='undefined'||!G||!G.pen||!PEN) return null;
  if(G.pen.allstar&&PEN.asState){ const S=PEN.asState; return S.mine==='セ'?S.A:S.B; }
  if(G.pen.wbc&&PEN.wbc&&PEN.wbc.teams&&PEN.wbc.teams.JPN&&PEN.wbc.teams.JPN.F) return PEN.wbc.teams.JPN;
  return null;
}
// 今の試合の監督（大会なら大会の監督）
function evGameMgr(){
  if(typeof G==='undefined'||!G||!G.pen||!PEN) return null;
  if(G.pen.allstar&&PEN.asState){ const S=PEN.asState; return (S.mine==='セ'?S.A:S.B).mgr; }
  if(G.pen.wbc&&PEN.wbc) return PEN.wbc.jmgr;
  return null;
}
// 自分の順位（投手：投手陣の中、野手：自分のポジションの争い）
function evMyRank(X){
  if(!X||!X.F) return null;
  if(!isBat()&&!isTW()){ const rk=evPitRank(X), i=rk.findIndex(x=>x.me); return i<0?null:{pit:true,i:i+1,n:rk.length,rk}; }
  const st=evStarters(X), mine=st.find(x=>x.me), pos=mine?mine.slot:(isTW()?'DH':myPosAll()[0]);
  const fixed=new Set(st.filter(x=>x.slot!=='DH').map(x=>x.f));
  const comp=X.F.filter(x=>pos==='DH'?(x.me||!fixed.has(x.f)):evCanPlay(x,pos)).sort((a,b)=>evScF(X,b)-evScF(X,a));
  const i=comp.findIndex(x=>x.me);
  return {pit:false,i:i+1,n:comp.length,pos,start:!!mine,comp,st};
}
function evRoleText(X,ctx){
  const r=evMyRank(X); if(!r) return '';
  if(r.pit){
    if(ctx==='wbc') return r.i<=3?`先発ローテーション${r.i}番手（投手陣の評価${r.i}位）`:`ブルペン${r.i-3}番手${r.i===4?'（抑え）':''}（投手陣の評価${r.i}位）`;
    const spd=(X.ev&&X.ev.spd)||{}, d=Object.keys(spd).find(k=>spd[k]==='ME');
    return `投手陣の評価${r.i}位／${r.n}人${d?`・${d}日目の先発`:r.i<=2?'・先発候補':'・中継ぎ'}`;
  }
  return r.start?`${POS_JP[r.pos]||r.pos}でスタメン（${POS_JP[r.pos]||r.pos}の評価${r.i}位）`:`控え（${POS_JP[r.pos]||r.pos}の争い ${r.i}番手）・代打で出番`;
}
// 大会チーム内の評価の一覧（大会の画面・出番のカードに出す）
function evPanelHTML(X,ctx){
  if(!X||!X.F||!PEN) return ''; const ev=evEnsure(X), r=evMyRank(X); if(!r) return '';
  const tm=x=>TEAM[x.id]?`<small style="color:var(--mute)">${TEAM[x.id].short}</small>`:'';
  const row=(x,i,sc,lab)=>`<div class="evr${x.me?' me':''}"><span>${i}.</span><b>${x.me?PEN.pname:(x.f?x.f.n:x.p.name)}</b>${tm(x)}<span class="evs">${sc.toFixed(1)}</span><small>${lab}</small></div>`;
  let list='', head='';
  if(r.pit){
    const spd=ev.spd||{}, startedK=Object.values(spd), nxt=r.rk.find(y=>!startedK.includes(evKP(y)));
    const lab=(x,i)=>{ if(ctx==='wbc') return i<3?`先発${i+1}番手`:`ブルペン${i-2}番手${i===3?'（抑え）':''}`;
      const k=evKP(x), d=Object.keys(spd).find(dd=>spd[dd]===k); return d?`${d}日目の先発`:(!spd[2]&&x===nxt?'2日目の先発候補':'中継ぎ'); };
    const show=r.rk.map((x,i)=>({x,i})).filter(o=>o.i<6||o.x.me);
    list=show.map(o=>row(o.x,o.i+1,evScP(X,o.x),lab(o.x,o.i))).join('');
    head=`投手陣の評価順（${r.rk.length}人）`;
  } else {
    const slot=x=>{ const s=r.st.find(y=>y.f===x.f); return s?(s.slot===r.pos?'スタメン':`スタメン（${POS_JP[s.slot]||s.slot}）`):'控え'; };
    list=r.comp.map((x,i)=>({x,i})).filter(o=>o.i<6||o.x.me).map(o=>row(o.x,o.i+1,evScF(X,o.x),slot(o.x))).join('');
    head=`${POS_JP[r.pos]||r.pos}の争い（${r.comp.length}人）`;
  }
  return `<div class="evrank"><div class="evh">📋 ${ctx==='wbc'?'日本代表':'チーム'}内の${head}</div>${list}
    <div class="hint">評価＝前年と通算の成績（少ないうちは能力）＋この大会の成績＋ミッション達成（+3）。大会の中だけの評価です${ev.mok+ev.mng?`　ミッション ${ev.mok}/${ev.mok+ev.mng} 達成`:''}</div></div>`;
}
// 選出されたチームからスタメン（打者オブジェクト）を作る。所属球団を team に持つ
function asLineup(S){
  const T={F:S.F.map(x=>x.f)}; const st=battingOrder(S.starters?S.starters.slice():pickStarters(T,null),S.mgr||null);   // 監督の打順志向（オールスターは1位チームの監督、WBCは代表監督）
  return st.map((x,i)=>{ const ent=S.F.find(e=>e.f===x.f)||{}; const b=toBatter(x.f,i+1); b.team=ent.id; b.isMe=!!ent.me; b.slot=x.slot; b.res=[]; return b; });
}
const asPit=(S,day,nStart)=>{ const P=S.P.map(x=>({...x.p,team:x.id,isMe:!!x.me})); if(S.ns) return {sp:P[0],pen:P.slice(1,7)};   // 大会の評価の並び（先頭がその日の先発）
  const NS=Math.min(nStart||2,P.length), si=(day-1)%NS; const sp=P[si], rest=P.filter((_,i)=>i>=NS); return {sp,pen:(rest.length?rest:P.filter((_,i)=>i!==si)).slice(0,6)}; };
// その日の並び：先発＝評価の上位でまだ先発していない投手（1日目は、2日目の先発候補は投げない）。先発した投手はもう投げない。スタメンはポジション争い
function asSide(X,d){
  const ev=evEnsure(X); ev.spd=ev.spd||{};
  const rk=evPitRank(X), used=Object.keys(ev.spd).filter(k=>+k<d).map(k=>ev.spd[k]);
  if(ev.spd[d]==null){ const sp=rk.find(x=>!used.includes(evKP(x)))||rk[0]; ev.spd[d]=evKP(sp); }
  const sp=rk.find(x=>evKP(x)===ev.spd[d])||rk[0];
  let rest=rk.filter(x=>x!==sp&&!used.includes(evKP(x)));
  if(d===1&&rest.length>4) rest=rest.slice(1);   // 2日目の先発候補は1日目は投げない
  return {F:X.F,P:[sp,...rest],ns:1,mgr:X.mgr,starters:evStarters(X)};
}
const asMine=S=>S.mine==='セ'?S.A:S.B;
// 自分のその日の出番：野手はスタメン（ポジション争いに勝っていれば）か代打、投手は先発・中継ぎ（評価順で決まる）・出番なし
function asRoleDay(S,d){
  const X=asMine(S), s=asSide(X,d);
  if(isBat()||isTW()){ const m=s.starters.find(x=>x.me); return m?{kind:'bat',slot:m.slot}:{kind:'pinch'}; }
  if(s.P[0]&&s.P[0].me) return {kind:'start'};
  return s.P.some(x=>x.me)?{kind:'relief'}:null;
}
// その日の試合（自分の出番がない日・スキップ・自分が出た日のほかの選手）をシミュレーションして、両チームの評価に反映
function asSimDay(S,d,skipMe){
  S.sims=S.sims||{};
  const g=asGame(d,asSide(S.A,d),asSide(S.B,d));
  S.sims[d]={day:d,sc:g.sc,ev:g.ev,subs:g.subs,players:g.players.map(p=>({name:p.name,team:p.team,me:p.me,kind:p.kind,st:p.st,score:p.score}))};
  evApply(S.A,g.players,skipMe); evApply(S.B,g.players,skipMe);
  return S.sims[d];
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
  const S=PEN.asState, X=asMine(S); evEnsure(S.A); evEnsure(S.B); asSide(X,1);
  const role={kind:'ev'}; S.role=role; S.nextDay=1;   // 出番は penStep が作る（試合の後処理で pending が消されないように）。出番の中身はその日の評価で決まる
  const rt=evRoleText(X,'as');
  penNotice(`⭐ オールスターに${isBat()?'野手':isTW()?'二刀流（指名打者で出場）':'投手'}として選出！ チーム内の評価：${rt}（前年と通算の成績の評価順。大会中の成績とミッションで変わる）`);
  mgrSay(`${PEN.pname}、オールスターにファン投票と監督推薦で選ばれたぞ。向こうでの起用は、全${S.mine}の${X.mgr.sur}監督がチームの中の評価で決める。今のところ「${rt}」だそうだ。結果とミッションで評価は変わるぞ。球団の誇りだ、楽しんでこい。`);
}
// 日程を進める前に：オールスターの出番が残っていれば pending にする（penStep から）
function allstarStep(){
  const S=PEN&&PEN.asState; if(!S||!S.sel||PEN.pending) return false;
  asNextPending(S.nextDay||1); return !!PEN.pending;   // 出番がなければ（2試合とも終わっていれば）そのまま日程を進める
}
function asNextPending(day){
  const S=PEN.asState; if(!S||!S.role) return;
  for(let d=day; d<=2; d++){
    if(S.sims&&S.sims[d]) continue;
    const r=(typeof injured==='function'&&injured())?null:asRoleDay(S,d);
    if(r){ S.nextDay=d; PEN.pending={day:PEN.day,opp:null,kind:'allstar',asDay:d,asKind:r.kind,slot:r.slot||null,started:false}; return; }
    asSimDay(S,d,false);   // 出番なし（先発した翌日・2日目の先発候補の1日目）：その日の試合はシミュレーション
  }
  allstarFinalize();
}
// オールスターの試合を始める（penPlay から）
function allstarPlay(p){
  const S=PEN.asState, mineLg=S.mine, MY0=mineLg==='セ'?S.A:S.B, OP0=mineLg==='セ'?S.B:S.A, opLg=mineLg==='セ'?'パ':'セ';
  const MY=asSide(MY0,p.asDay), OP=asSide(OP0,p.asDay);   // その日の並び（大会の評価）
  const names={my:{name:AS_LG[mineLg].short,s:AS_LG[mineLg].s,lg:mineLg},opp:{name:AS_LG[opLg].short,s:AS_LG[opLg].s,lg:opLg}};
  const oppL=asLineup(OP), myL0=asLineup(MY), gp=asPit(OP,p.asDay), gm=asPit(MY,p.asDay); gm.pen=gm.pen.filter(x=>!x.isMe);
  const myIdx=myL0.findIndex(b=>b.isMe), bk=myIdx>=0?'bat':'pinch';
  const pen={day:p.day,year:PEN.year,kind:p.asKind==='bat'||p.asKind==='pinch'?bk:p.asKind,role:PEN.role,team:PEN.team,opp:null,allstar:true,asDay:p.asDay,lg:mineLg};
  const mission=rnd()<EV_MP?((p.asKind==='bat'||p.asKind==='pinch')?genMissionB(bk):genMission(p.asKind,'as')):null;   // 大会の監督のミッション（評価は大会の中だけ）
  showScreen('game');
  if(p.asKind==='bat'||p.asKind==='pinch'){
    const myL=myL0.map(b=>b.isMe?{...meBatter(),order:b.order,team:PEN.team}:{...plainB(b),team:b.team});
    const mySlot=myIdx>=0?myL0[myIdx].slot:'DH';
    batNewGame({OPP:{pattern:'standard',hand:'normal'}, lineup:oppL.map(b=>({...b,res:[]})), myLineup:myL, myTeam:{name:AS_LG[mineLg].name,hand:''},
      pits:[gp.sp,...gp.pen], ours:[gm.sp,...gm.pen.slice(0,2)], defAdj:1, names, pname:PEN.pname, bhand:PEN.bhand, babil:PEN.babil, kind:bk, order:myIdx>=0?myIdx+1:9, pinchInning:ri(5,7),
      slot:mySlot, ofSide:PEN.ofSide||(PEN.ofSide=pick(['左','中','右'])), pen, mission});
    const Q=batProceed(); renderAll(); save(); if(typeof showTitle==='function') showTitle();
    const show=bk==='pinch'&&G.pinch?Q.filter(e=>e.inning>=G.pinch.inning):Q;
    setTimeout(()=>playBack(show,batAfterPlay),G.mission?0:1200);
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
    names, pname:PEN.pname, pen, pre, abil:PEN.abil, oppPitcher:{...gp.sp}, oppPen:gp.pen.map(x=>({...x})), bullpen:gm.pen.map(x=>({...x})), mission});
  renderAll(); save();
}
// 試合が終わった（penGameDone から）。シーズン成績には入れず、オールスターの記録だけ残す
function allstarGameDone(){
  const S=PEN.asState, p=PEN.pending; if(!S||!p||p.kind!=='allstar') return;
  const st=G.st, res=G.result?G.result.res:'T';
  const bat=G.bat&&!G.tw;
  S.games[p.asDay]=bat?{kind:'B',st:{pa:st.pa,h:st.h,hr:st.hr,rbi:st.rbi,sb:st.sb,run:st.run,app:p.asKind==='pinch'?['代打']:[]},score:[oppTot(),myTot()],res}
                     :{kind:'P',st:{outs:st.outs,runs:st.runs,k:st.k,h:st.hits},score:[oppTot(),myTot()],res,dec:G.result?G.result.dec:'－'};
  if(G.mission){ if(bat) checkMissionB(); else checkMission(); }   // 評価はオールスターの中だけ
  try{ asSimDay(S,p.asDay,true); }catch(e){}   // ほかの選手の成績（自分は実際の成績）
  evApplyMe(asMine(S),bat?'B':'P',S.games[p.asDay].st);
  PEN.pending=null; S.nextDay=p.asDay+1;
}
// スキップ：その試合の自分の成績はシミュレーションに任せる
function allstarSkip(){
  const S=PEN.asState, p=PEN.pending; if(!S||!p||p.kind!=='allstar') return;
  if(gameIsPending()) closePenGame();
  S.games[p.asDay]='sim'; asSimDay(S,p.asDay,false);
  PEN.pending=null; S.nextDay=p.asDay+1;
}
// 2試合が終わったら：ほかの選手はシミュレーション、自分は実際の成績で表彰を決める
function allstarFinalize(){
  const S=PEN.asState; if(!S) return;
  S.sims=S.sims||{}; for(const d of [1,2]) if(!S.sims[d]) asSimDay(S,d,false);   // 試合はその日ごとにシミュレーション済み
  const games=[S.sims[1],S.sims[2]], myRole=S.sel?evRoleText(asMine(S),'as'):'', myEv=S.sel?evEnsure(asMine(S)):null;
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
    me:S.sel?{sel:true,role:isBat()?'野手':isTW()?'二刀流':'投手',line:meT?line(meT):'出場なし',rank:meT?rank.indexOf(meT)+1:null,ev:myRole,mis:myEv&&myEv.mok+myEv.mng?`${myEv.mok}/${myEv.mok+myEv.mng}`:''}:{sel:false}};
  if(mvp&&mvp.me){ titleAward('オールスターMVP',1,1); res.me.award='MVP（持ち点+1）'; }
  else if(fs&&fs.me){ titleAward('オールスター敢闘賞',0.5,1); res.me.award='敢闘賞（持ち点+0.5）'; }
  if(mvp&&!mvp.me) cpuAward(mvp.name,mvp.team,mvp.kind,1); if(fs&&!fs.me) cpuAward(fs.name,fs.team,fs.kind,0.5);   // CPUの選手にも持ち点
  { const X=asMine(S); PEN.asMates={y:PEN.year,F:X.F.filter(x=>!x.me&&x.f).map(x=>({id:x.f.id,team:x.id})),P:X.P.filter(x=>!x.me&&x.p).map(x=>({id:x.p.pid,team:x.id}))}; if(!S.sel) PEN.asMates=null; }   // 合同自主トレで呼べる仲間
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
    <div style="margin-top:4px">${r.me.sel?`あなた：${r.me.role}で選出　${r.me.line}${r.me.award?`　<b style="color:var(--accent)">${r.me.award}</b>`:''}${r.me.ev?`<div class="hint">大会を終えたチーム内の評価：${r.me.ev}${r.me.mis?`　ミッション ${r.me.mis} 達成`:''}</div>`:''}`:'あなたは選外'}</div>
    <div class="hint">各ポジション3人（外野9人）＋指名打者3人、投手10人を今年の活躍で選出。成績はシーズンの成績には入りません</div></div>`;
}
