
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
// 年齢に沿った能力：プロ平均は全能力50（27〜31歳がピーク。若手は低く、ベテランは衰える）
const AGE_ADJ=a=>a<=18?-13:a<=24?-13+(a-18)*2:a<=27?-1+(a-24)*1:a<=31?3-(a-29>0?a-29:0)*0.5:a<=33?1-(a-32):a<=40?-2-(a-34)*2:-14;
// タイプで上下（強打・巧打・俊足・守備型・バランス）。足し引きはだいたいゼロになるようにしてある
const FTYPE_W=[['power',22],['contact',22],['speed',16],['defense',16],['balance',24]];
const FTYPE_ADJ={power:{p:15,m:-4,s:-6,d:-5},contact:{m:15,p:-8,e:5,d:-2},speed:{s:18,d:4,p:-12,m:-2},defense:{d:16,p:-8,m:-4,e:-2},balance:{}};
// 野手を作る（tier＝平均からのずれ。レギュラー級はプラス、控えはマイナス）
function genFielder(pos,age,tier){
  const base=50+AGE_ADJ(age)+(tier||0), r=()=>clamp(Math.round(base+(rnd()-.5)*26),10,100);
  const f={id:'f'+(Date.now()%1e6)+'_'+(FID++),n:randName(),pos,h:rnd()<0.33?'L':'R',m:r()-1,p:r()+3,s:r()-1,e:r(),d:r()-4,age,pf:0,num:ri(0,99)};   // 守備位置の補正ぶんを戻して平均50に
  const ta=FTYPE_ADJ[wpick(FTYPE_W)]; for(const k in ta) f[k]=clamp(f[k]+ta[k],10,100);
  if(pos==='C'){ f.d=clamp(f.d+10,10,100); f.s=clamp(f.s-15,10,100); }
  if(pos==='SS'||pos==='2B'){ f.d=clamp(f.d+8,10,100); f.s=clamp(f.s+6,10,100); f.p=clamp(f.p-8,10,100); }
  if(pos==='1B'){ f.p=clamp(f.p+10,10,100); f.d=clamp(f.d-10,10,100); }
  if(pos==='OF'&&rnd()<0.4) f.s=clamp(f.s+10,10,100);
  return f;
}
// 投手を作る（tier＝平均からのずれ）。コントロール・スタミナの平均は50、球速は年齢と質で上下
function genRosterPitcher(age,tier){
  const p=genPitcher(); p.age=age; const adj=AGE_ADJ(age)+(tier||0);
  p.velo=clamp(Math.round(147+adj*0.35+(rnd()-.5)*16),128,162);
  p.control=clamp(Math.round(50+adj+(rnd()-.5)*36),10,100);
  p.stamina=clamp(Math.round(50+adj*0.5+(rnd()-.5)*40),10,100);
  p.q=pitQ(p); return p;
}
function pitQ(p){
  return clamp(1.18-(p.velo-138)/19*0.16-(p.control-22)/60*0.14-kScore(p)*0.02,0.78,1.25);   // コントロールの平均が50になったぶん基準をずらしてある
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
  const hrRate=typeof myHrRate==='function'?myHrRate(f.p):clamp(HR_MIN*Math.pow(HR_MAX/HR_MIN,(f.p-18)/81),HR_MIN,HR_MAX);   // 本塁打率は自分と同じパワー依存の式
  const sh=shuffle(INNER), nG=ri(1,3), nB=ri(1,2);
  return {name:f.n,num:f.num,type:fType(f),hand:f.h,power:f.p,contact:f.m,speed:f.s,eye:f.e,avg,hrRate,
    good:new Set(sh.slice(0,nG)),bad:new Set(sh.slice(nG,nG+nB)),target:genTarget(f.h),res:[],order,pos:f.pos,fid:f.id};
}
// スタメンを決める（守備位置ごとにいちばん評価の高い選手。指名打者は残りでいちばん打てる選手）
// me：野手のあなた（このチームにいるとき）
function pickStarters(T,me,slots){
  const pool=T.F.map(f=>({f})); if(me) pool.push({f:me,me:true});
  const used=new Set(), out=[], m=T.mgr||null;   // 監督の志向で選手の見方が変わる
  for(const pos of slots||SLOTS){
    let best=null, bv=-1e9;
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
function staff(T){ const s=T.P.slice().sort((a,b)=>a.q-b.q); return {rot:s.slice(0,6),pen:s.slice(6)}; }
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
  const sum=st=>st.reduce((t,x)=>t+x.val,0);
  let best=null;
  for(const pos of myPositions()){ const st=pickStarters(T,myFielder(pos)); if(!best||sum(st)>sum(best)) best=st; }
  return best;
}
function rebuildTeam(id){
  const T=PEN.teams[id]; mgrOf(id);
  T.F.forEach(f=>{ f.pf=Math.round((rnd()-.5)*10); });   // 監督の評価（調子）を少し入れ替える
  const st=battingOrder(bestStarters(T,id),T.mgr);
  if(id===PEN.team&&PEN.favMod&&PEN.favMod.order){ const i=st.findIndex(x=>x.me), j=PEN.favMod.order-1; if(i>=0&&j<st.length&&i!==j){ const t=st[i]; st[i]=st[j]; st[j]=t; } }   // 贔屓監督の打順
  T.lineup=st.map((x,i)=>serB(x.me?{...toBatter(x.f,i+1),isMe:true}:toBatter(x.f,i+1)));
  T.lpos=st.map(x=>x.slot);
  const lp=lineupPattern(T.lineup); T.pattern=lp.pattern; T.hand=lp.hand;
  const hs=st.reduce((t,x)=>t+hitScore(x.f),0)/9, ds=st.filter(x=>x.slot!=='DH').reduce((t,x)=>t+x.f.d,0)/8;
  const ps=staff(T).rot.reduce((t,p)=>t+pitScore(p),0)/6;
  T.off=clamp((hs-50)*0.035,-0.6,0.6); T.def=clamp((ps-50)*0.02+(ds-50)*0.006,-0.6,0.6); T.fdef=ds;
  return st;
}
// 野手のあなた（スタメン争い用）：能力＋監督の評価（成績）
const myPositions=()=>PEN.favMod&&PEN.favMod.pos?[PEN.favMod.pos]:(PEN.bposs&&PEN.bposs.length?PEN.bposs:[PEN.bpos||'OF']);
function myFielder(pos){
  const a=PEN.babil;
  return {id:'me',n:PEN.pname,pos:pos||myPositions()[0],h:PEN.bhand,m:a.meet,p:a.power,s:a.speed,e:a.eye,d:a.def??50,age:PEN.age,pf:Math.round((evalR()-50)*0.6),num:B_NUM,isMe:true};
}

/* ---- 年をまたぐとき：成長・衰え・引退、ドラフト ---- */
// CPU選手の1年の変化：衰え（年齢）＋ 持ち点による成長（自分と同じ仕組み：基本点＋監督ボーナス＋覚醒・タイトル）。持ち点はタイプに応じて即時に割り振る
const CPU_BASE=age=>age<=24?1.4:age<=28?1.1:age<=32?0.8:0.5;   // 年齢で基本点が変わる（若いほど伸びる）
function cpuEvents(age,star){   // 覚醒・タイトル相当の持ち点（確率）。star＝リーグ上位なら多め
  let p=0; if(rnd()<0.35) p+=1; if(rnd()<0.10) p+=3; if(age>=27&&rnd()<0.05) p+=5; if(age>=30&&rnd()<0.015) p+=10;
  if(star===1) p+=3; else if(star===2) p+=1;   // タイトル相当
  return p;
}
const CPU_COST={m:2,p:3,s:1,e:1,d:1};   // 0.1上げるのに必要な持ち点×0.1（ミート0.2・パワー0.3・ほか0.1）
const CPU_WEIGHT={'フルスイング':{p:4,m:2,e:1,s:1,d:1},'ヒットメーカー':{m:4,e:2,s:1,p:1,d:1},'スピードスター':{s:4,d:2,m:1,e:1,p:1},'守備職人':{d:4,s:1,m:1,e:1,p:1},'代打男':{m:3,p:3,e:1,s:1,d:1},'アスリート':{m:2,p:2,s:2,e:1,d:2},'バランス':{m:2,p:2,s:1,e:2,d:2}};
function cpuGrowF(f,pts){
  const W=CPU_WEIGHT[f.btype]||CPU_WEIGHT['バランス']; let left=pts, guard=0;
  while(left>0.0999&&guard++<400){ const k=wpick(Object.entries(W).map(([a,w])=>[a,w])); const c=CPU_COST[k]*0.1; if(c>left+1e-9||f[k]>=100){ if(Object.keys(W).every(x=>CPU_COST[x]*0.1>left+1e-9||f[x]>=100)) break; continue; } f[k]=clamp(Math.round((f[k]+0.1)*10)/10,10,100); left=Math.round((left-c)*1000)/1000; }
}
function cpuGrowP(p,pts){
  let left=pts, guard=0;   // 球速0.1km/h＝0.5pt、制球・スタミナ0.1＝0.1pt、変化球Lvアップは「次のLv」pt（Lv1→2は1、2→3は3、以降 次のLv）
  while(left>0.0999&&guard++<400){ const k=pick(['velo','control','control','stamina','stamina','lv']);
    if(k==='lv'){ const ts=p.types.filter(t=>t!=='ストレート'&&pitLv(p,t)<7); if(!ts.length) continue; const t=pick(ts), nl=pitLv(p,t)+1, c=nl<=2?1:nl===3?3:nl; if(c>left+1e-9) continue; p.plv=p.plv||{}; p.plv[t]=nl; left-=c; continue; }
    const c=k==='velo'?0.5:0.1, cap=k==='velo'?162:100; if(c>left+1e-9||p[k]>=cap){ if(left<0.1) break; continue; } p[k]=Math.round((p[k]+0.1)*10)/10; left=Math.round((left-c)*1000)/1000; }
}
function ageFielder(f,T,star){
  f.age++;
  if(f.age>=30){ const d=f.age<=32?()=>ri(-2,0):()=>ri(-4,0); for(const k of ['m','p','e','d']) f[k]=clamp(f[k]+d(),10,100); f.s=clamp(f.s+ri(-4,0),10,100); }   // 衰え
  const pts=CPU_BASE(f.age)+(T&&T.mgr?mgrCampBonus(T.mgr):0.5)+cpuEvents(f.age,star);
  cpuGrowF(f,pts); f.btype=cpuTypeOf(f,true);
}
function agePitcher(p,T,star){
  p.age++;
  if(p.age>=30){ const d=p.age<=33?()=>ri(-2,0):()=>ri(-3,0); p.velo=clamp(p.velo+d(),125,162); p.control=clamp(p.control+d()*2,10,100); p.stamina=clamp(p.stamina+d(),10,100); }
  const pts=CPU_BASE(p.age)*1.4+(T&&T.mgr?mgrCampBonus(T.mgr):0.5)+cpuEvents(p.age,star);
  cpuGrowP(p,pts); p.q=pitQ(p);
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
  while(T.P.length>15){ const s=T.P.slice().sort((a,b)=>(pitScore(a)-a.age*0.5)-(pitScore(b)-b.age*0.5)); T.P.splice(T.P.indexOf(s[0]),1); }
  for(const pos in need){ let n=T.F.filter(f=>f.pos===pos).length; while(n++<need[pos]) T.F.push(genFielder(pos,ri(22,30),ri(-12,-4))); }
  while(T.P.length<11) T.P.push(genRosterPitcher(ri(22,30),ri(-10,-2)));
}
// ドラフト：4＋順位 の人数（投手1〜5・野手1〜5）。返り値は指名した選手
function draftFor(id,rank){
  const T=PEN.teams[id], N=4+rank, np=ri(Math.max(1,N-5),Math.min(5,N-1)), nf=N-np, got=[];
  for(let i=0;i<np;i++){ const p=genRosterPitcher(ri(18,22),ri(-6,8)); p.rookie=PEN.year; T.P.push(p); got.push({k:'P',n:p.name,v:p.velo,age:p.age}); }
  for(let i=0;i<nf;i++){ const f=genFielder(pick(POSS),ri(18,22),ri(-6,8)); f.rookie=PEN.year; T.F.push(f); got.push({k:'F',n:f.n,pos:f.pos,age:f.age,v:Math.round(posValue(f,f.pos))}); }
  return {np,nf,got};
}
// シーズンの切り替え（年俸査定のあと）
function rosterNewSeason(fin){
  const res={};
  for(const t of NPB){
    const T=PEN.teams[t.id];
    // リーグ上位（タイトル相当）：各リーグの野手上位3人・投手上位3人に+3、次の3人に+1
    const lgF=[],lgP=[]; lgTeams(t.lg).forEach(id=>{ PEN.teams[id].F.forEach(f=>lgF.push(f)); PEN.teams[id].P.forEach(p=>lgP.push(p)); });
    const topF=lgF.sort((a,b)=>hitScore(b)-hitScore(a)), topP=lgP.sort((a,b)=>pitScore(b)-pitScore(a));
    const starOf=(x,arr)=>{ const i=arr.indexOf(x); return i>=0&&i<3?1:i>=0&&i<6?2:0; };
    T.F.forEach(f=>ageFielder(f,T,starOf(f,topF))); T.P.forEach(p=>agePitcher(p,T,starOf(p,topP)));
    retireAndTrim(T);
    const rank=fin?fin[t.lg].findIndex(x=>x.id===t.id)+1:ri(1,6);
    res[t.id]=draftFor(t.id,rank);
    T.F.forEach(f=>{ if(f.rookie&&f.rookie<PEN.year) delete f.rookie; }); T.P.forEach(p=>{ if(p.rookie&&p.rookie<PEN.year) delete p.rookie; });
  }
  return res;
}
// 二刀流：先発の日はDHなし。8人の野手＋自分で、打撃の能力と成績から監督が打順を決める
function twLineup(){
  const T=myT(), a=PEN.babil, perf=Math.round((twBatEval()-50)*0.5);
  const me={id:'me',n:PEN.pname,pos:'P',h:PEN.bhand,m:a.meet+perf,p:a.power+perf,s:a.speed,e:a.eye,d:50,age:PEN.age,isMe:true};
  const st=pickStarters(T,null,SLOTS.slice(0,8)); st.push({f:me,me:true,slot:'P',val:0});
  return battingOrder(st,myMgr()).map((x,i)=>x.me?{...meBatter(),order:i+1}:{...plainB(toBatter(x.f,i+1)),order:i+1});
}
// 試合で使う自分の打者データ（二刀流）
function meBatter(){
  const a=PEN.babil;
  return {isMe:true,name:PEN.pname,hand:PEN.bhand,type:'あなた',num:MYNUM,power:a.power,contact:a.meet,speed:a.speed,eye:a.eye,
    avg:clamp(0.21+a.meet*0.0008+a.speed*0.0002,.2,.33),hrRate:hrRateOf(a.power)*1.2,res:[]};
}
// 自分のチーム（投手のとき）：この試合の味方リリーフ／相手の先発・リリーフ
function gamePitchers(id,day){
  const s=staff(PEN.teams[id]);
  return {sp:s.rot[day%s.rot.length], pen:s.pen.slice(0,3).concat(s.rot.slice(5)).slice(0,3), bull:s.pen.slice(0,5)};
}
// 二刀流：投げない日の指名打者争い（打撃の能力＋打撃成績の評価で、チームの指名打者候補と比べる）
function twCompete(quiet){
  if(!isTW()) return;
  const T=myT(), a=PEN.babil;
  const me={id:'me',n:PEN.pname,pos:'DH',h:PEN.bhand,m:a.meet,p:a.power,s:a.speed,e:a.eye,d:0,age:PEN.age,pf:Math.round((twBatEval()-50)*0.6),isMe:true,num:MYNUM};
  const st=battingOrder(pickStarters(T,me)), i=st.findIndex(x=>x.me);
  const was=!!PEN.dh;
  PEN.dh=i>=0; PEN.dhOrder=i>=0?i+1:0;
  PEN.dhLineup = i>=0 ? st.map((x,k)=>serB(x.me?{...toBatter(x.f,k+1),isMe:true}:toBatter(x.f,k+1))) : null;
  // 比べた相手（指名打者に入った、または入れなかったときの指名打者）
  const st2=pickStarters(T,null), dh=st2.find(x=>x.slot==='DH');
  PEN.dhVal=Math.round(hitScore(me)+me.pf); PEN.dhRival=dh?{n:dh.f.n,v:Math.round(hitScore(dh.f)+(dh.f.pf||0))}:null;
  if(quiet||was===PEN.dh) return;
  penNotice(PEN.dh?`投げない日は指名打者（${PEN.dhOrder}番）で出場することになった！`:'打撃の評価が下がり、投げない日の指名打者から外れた');
}
