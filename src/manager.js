
/* ================================================================
   監督：苗字だけの名前（田中監督）、采配レベル1.0〜5.0、評価の志向（投手・野手・全体）、タイプごとの顔
   ・采配レベルが高いほどキャンプの持ち点が0.2〜2.0増える
   ・評価の仕方（あなたの評価＝役割や打順の決め方）が監督で変わる
   ・贔屓起用の監督：ミッション達成でお気に入り度が上がり、能力にかかわらず起用される。急な打診（守備位置・投手起用・打順）がある
   ・チームの成績が悪い（5・6位）うえに活躍した20代が5人以下だと、監督が交代する
   ================================================================ */
const MGR_P=[['std','バランス型','防御率・走者・三振をまんべんなく見る'],['bb','与四死球は気にしない','四死球を出しても評価を下げない'],['k','奪三振至上主義','三振を取れる投手を高く評価する'],['era','防御率至上主義','失点の少なさがすべて']];
const MGR_B=[['std','バランス型','出塁と長打をまんべんなく見る'],['k','三振は気にしない','三振が多くても評価を下げない'],['avg','打率至上主義','打率の高い打者を高く評価する'],['slg','長打至上主義','本塁打・長打を高く評価する'],['spd','俊足至上主義','足の速い選手・盗塁を高く評価する'],['def','守備で勝つチーム','守備のうまい選手を優先して使う']];
const MGR_A=[['merit','実力主義','調子より実力。能力と成績だけで決める'],['young','若手優先','25歳以下を積極的に使う'],['vet','ベテラン優先','30歳以上の経験を信頼する'],['fav','贔屓起用','気に入った選手を能力にかかわらず使う']];
const MGR_O=[['std','スタンダード型','1番は打率の高い打者、クリーンナップは本塁打も率も残せる打者、下位に向けて弱くなる'],['alt','流線型','左右の打者を交互に並べる'],['nuke','核弾道型','1番から強い打者を順に並べる'],['link','つなぎの四番型','4番にもミートの高い選手を置く。本塁打の多さは考えず、とにかく打率'],['sub','代打多用型','スタンダード型の打順だが、早い回から代打・代走・守備固めを多用する']];
// 先発起用：ローテーションの人数
const MGR_R=[['six','少数精鋭','6人ローテ。力のある先発に多く投げさせる'],['seven','標準','7人ローテ。先発を回しながら休ませる'],['eight','休養重視','8人ローテ。先発をしっかり休ませる'],['ten','総動員','10人ローテ。たくさんの先発に機会を与える']];
const ROT_N={six:6,seven:7,eight:8,ten:10}, rotN=m=>ROT_N[m&&m.r]||6;
const genRot=()=>wpick([['six',40],['seven',30],['eight',20],['ten',10]]);
// 志向の名前と説明（種類ごとに引く：'k' や 'std' は投手・野手・打順で意味が違うので混ざらないようにする）
const MGR_LIST={p:MGR_P,b:MGR_B,a:MGR_A,o:MGR_O,r:MGR_R};
const MGR_JP=(k,cat)=>{ const L=MGR_LIST[cat]||MGR_P; return L.find(e=>e[0]===k)||L[0]; };
function genManager(year){
  return {sur:pick(rnd()<0.5?SURN:SURN2), lv:r1(1+Math.round(rnd()*rnd()*40)/10), p:pick(MGR_P)[0], b:pick(MGR_B)[0], a:pick(MGR_A)[0], o:pick(MGR_O)[0], r:genRot(), y:year||1, fav:0, face:ri(0,2)};
}
const mgrOf=id=>{ const T=PEN&&PEN.teams&&PEN.teams[id]; if(!T) return null; if(!T.mgr) T.mgr=genManager(PEN.year); if(!T.mgr.o) T.mgr.o=pick(MGR_O)[0]; if(!T.mgr.r) T.mgr.r=genRot(); return T.mgr; };
const mgrOrder=m=>(m&&m.o)||'std';   // 打順志向
const mySubMgr=()=>{ const m=myMgr(); return !!(m&&m.o==='sub'); };   // 代打多用型の監督か
const myMgr=()=>PEN?mgrOf(PEN.team):null;
const mgrName=m=>m?`${m.sur}監督`:'監督';
const mgrCampBonus=m=>m?r1(0.2+(clamp(m.lv,1,5)-1)/4*1.8):0;   // 采配レベル1.0で+0.2、5.0で+2.0
const isFavMgr=()=>{ const m=myMgr(); return !!(m&&m.a==='fav'); };
// 贔屓起用：お気に入り度（0〜100）。ミッション達成で上がり、失敗・打診を断ると下がる
function favChange(d){ const m=myMgr(); if(!m||m.a!=='fav') return; const was=m.fav||0; m.fav=clamp(r1(was+d),0,100);
  if(was<60&&m.fav>=60) penNotice(`${mgrName(m)}のお気に入りになった！（お気に入り度${m.fav}）能力に関係なく起用されやすくなる`); }
const favBonus=()=>{ const m=myMgr(); return m&&m.a==='fav' ? clamp(((m.fav||0)-40)*0.5,-5,30) : 0; };
// 全体志向による年齢の評価（野手・投手のpfに足す）
function mgrAgeAdj(m,age){
  if(!m||age==null) return 0;
  if(m.a==='young') return age<=25?6:age>=31?-4:0;
  if(m.a==='vet')   return age>=30?6:age<=23?-4:0;
  return 0;
}
// 野手志向による守備位置の価値（チームの選手もあなたも同じ物差し）
function mgrPosValue(m,f,pos){
  if(!m) return posValue(f,pos);
  const pf=(m.a==='merit'?(f.pf||0)*0.3:(f.pf||0))+mgrAgeAdj(m,f.age);
  let hs=f.m*0.35+f.p*0.35+f.s*0.1+f.e*0.2, dw=DEF_W[pos]*0.8;
  switch(m.b){
    case 'avg': hs=f.m*0.55+f.p*0.2+f.s*0.1+f.e*0.15; break;
    case 'slg': hs=f.m*0.25+f.p*0.55+f.s*0.05+f.e*0.15; break;
    case 'spd': hs=f.m*0.3+f.p*0.25+f.s*0.3+f.e*0.15; break;
    case 'def': dw=DEF_W[pos]*1.8+0.1; break;
    case 'k':   hs=f.m*0.3+f.p*0.4+f.s*0.1+f.e*0.2; break;
  }
  return hs+(f.d-50)*dw+pf;
}
// 投手の評価（あなた）：志向で重みが変わる
function mgrRating(m,st){
  if(!st||st.outs<6) return null;
  const ip=st.outs/3, era=st.runs*9/ip, whip=(st.hits+(m&&m.p==='bb'?0:st.bb))/ip, k9=st.k*9/ip;
  let raw;
  switch(m&&m.p){
    case 'k':   raw=100-era*8-(whip-1.2)*15+(k9-7)*6; break;
    case 'era': raw=100-era*18-(whip-1.2)*10+(k9-7)*0.5; break;
    case 'bb':  raw=100-era*12-(whip-0.9)*25+(k9-7)*2; break;
    default:    raw=100-era*12-(whip-1.2)*25+(k9-7)*2;
  }
  const prior=abilityR();
  return prior+(raw-prior)*ip/(ip+15);
}
// 野手の評価（あなた）
function mgrRatingB(m,s){
  if(!s||s.pa<10) return null;
  const ops=bObp(s)+bSlg(s), kTerm=(s.k/s.pa-0.2)*20, hrT=s.hr/s.pa*600-22;   // hrT：本塁打（600打席あたり22本＝リーグの平均的なレギュラーより多いぶん）
  let raw;
  switch(m&&m.b){
    case 'k':   raw=50+(ops-0.775)*90+s.sb*0.15+hrT*0.9; break;   /* 基準はリーグの平均的なレギュラー（OPS.775前後・本塁打22本） */
    case 'avg': raw=50+(bAvg(s)-0.265)*400+(bObp(s)-0.335)*60-kTerm+hrT*0.25; break;
    case 'slg': raw=50+(bSlg(s)-0.445)*180+hrT*1.3-kTerm*0.5; break;
    case 'spd': raw=50+(ops-0.775)*60+s.sb*0.8-s.cs*0.4+(abPerf(PEN.babil.speed)-50)*0.3-kTerm*0.5+hrT*0.4; break;
    case 'def': raw=50+(ops-0.775)*60-kTerm*0.5+(abPerf(PEN.babil.def??70)-50)*0.6+hrT*0.4; break;
    default:    raw=50+(ops-0.775)*90+s.sb*0.15-kTerm+hrT*0.7;   /* 本塁打の評価：バランス型0.7・三振は気にしない0.9・長打至上主義1.3・俊足/守備0.4・打率至上主義0.25（1本あたり） */
  }
  const prior=abilityRB();
  return prior+(raw-prior)*s.pa/(s.pa+60);
}
/* ---- シーズン後の評価（年俸・戦力外）：ノルマの達成度の合計 ----
   野手：打率.270・本塁打20本・OPS.800・15盗塁・三振率18%（三振÷打席）／投手：防御率3.00・WHIP1.25・奪三振率6.0
   達成度＝ノルマちょうどで1。0になるのは 打率.170・OPS.500・0本・0盗塁・三振率30%／防御率5.00・WHIP1.75・奪三振率0（本塁打・盗塁は600打席あたり）
   評価点＝78×（監督の性格で重みをつけた達成度の平均）。ノルマの2/3で52点（年俸±0）
   シーズン中の評価（evalR：スタメン争い・投手の配置の打診・画面の「評価」）も同じノルマ方式。投手陣の順位（総合評価）の成績の部分も、ノルマの達成度で見る（pPerfR） */
const NORM_B={avg:0.270,hr:20,ops:0.800,sb:15,k:0.18}, NORM_P={era:3.00,whip:1.25,k9:6}, NORM_RATE=78;
const NORM_W_B={std:{avg:1,hr:1,ops:1.5,sb:0.5,k:0.35},k:{avg:0.75,hr:1.5,ops:1.5,sb:0.5,k:0},avg:{avg:3,hr:0.5,ops:1,sb:0.5,k:0.75},slg:{avg:0.5,hr:2.5,ops:1.5,sb:0.25,k:0.1},spd:{avg:1,hr:0.5,ops:1,sb:2.5,k:0.35},def:{avg:1,hr:0.75,ops:1,sb:1,k:0.35}};   // 三振は気にしない監督は三振率を見ない
const NORM_W_P={std:{era:1.5,whip:1,k9:1},bb:{era:1.5,whip:1,k9:1},k:{era:1,whip:0.75,k9:2},era:{era:3,whip:0.75,k9:0.25}};
const achB=(avg,ops,hr6,sb6,kr)=>({avg:clamp(1+(avg-NORM_B.avg)/0.10,-0.5,2.5),ops:clamp(1+(ops-NORM_B.ops)/0.30,-0.5,2.5),hr:clamp(hr6/NORM_B.hr,0,2.5),sb:clamp(sb6/NORM_B.sb,0,2.5),k:clamp(1+(NORM_B.k-(kr??NORM_B.k))/0.12,-0.5,2.5)});
const achP=(era,whip,k9)=>({era:clamp(1+(NORM_P.era-era)/2.0,-0.5,2.5),whip:clamp(1+(NORM_P.whip-whip)/0.5,-0.5,2.5),k9:clamp(k9/NORM_P.k9,0,2.5)});
const normScore=(a,W)=>{ let s=0,w=0; for(const k in W){ s+=W[k]*a[k]; w+=W[k]; } return NORM_RATE*s/w; };
const normWB=m=>NORM_W_B[m&&m.b]||NORM_W_B.std, normWP=m=>NORM_W_P[m&&m.p]||NORM_W_P.std;
// 能力から見込んだ評価（成績がまだ無い・少ないとき）
const priorRB=()=>clamp(58+4*(abilityRB()-51.3),5,110);   // 能力→評価の目安（CPUのレギュラーの成績から）
const priorRP=m=>{ const R=abilityR(), e0=eraOfR(R); return normScore(achP(e0,0.8+0.13*e0,k9OfR(R)),normWP(m)); };
// ノルマ方式の評価 → 前の物差し（起用の打診・代打の出番・オールスター・トレードなどの細かい基準に使う。だいたい同じ成績なら前と同じ判断になる）
const toOldB=v=>(v+10.1)/1.583, toOldP=v=>(v+10.4)/1.475;
const evalOld=()=>{ const v=evalR(); return isBat()?toOldB(v):toOldP(v); };
// 投手の成績（ノルマの達成度）→ 投手の力と同じ目盛り（防御率3.30・奪三振率8で75、防御率が1違うと約10）。CPUはWHIPを防御率から見込む
const pPerfRef={};
function pPerfR(s,m){
  const W=normWP(m), key=(m&&m.p)||'std', ip=s.outs/3, era=s.er*9/ip, k9=s.k!=null?s.k*9/ip:8, bbX=key==='bb';
  const whip=s.h!=null?(s.h+(bbX?0:(s.bb||0)))/ip+(bbX?0.35:0):0.8+0.13*era;
  const sc=e=>normScore(achP(e,0.8+0.13*e,8),W), ref=pPerfRef[key]||(pPerfRef[key]={a:sc(3.3),d:sc(3.3)-sc(4.3)});
  return clamp(75+(normScore(achP(era,whip,k9),W)-ref.a)*10/ref.d,25,100);
}
// 野手：打席が少ないうちは能力から見込んだ評価に寄せる（60打席で半々）
function seasonRateB(m,s){
  if(!s||s.pa<10) return null;
  const raw=normScore(achB(bAvg(s),bObp(s)+bSlg(s),s.hr/s.pa*600,(s.sb||0)/s.pa*600,(s.k||0)/s.pa),normWB(m));
  const prior=priorRB();
  return Math.max(0,prior+(raw-prior)*s.pa/(s.pa+60));
}
// 投手：投球回が少ないうちは能力から見込んだ評価に寄せる（15回で半々）。与四死球を気にしない監督はWHIPに四死球を数えない（平均的な四死球のぶん0.35を足す）
function seasonRateP(m,st){
  if(!st||st.outs<6) return null;
  const ip=st.outs/3, bbX=!!(m&&m.p==='bb'), era=st.runs*9/ip, whip=(st.hits+(bbX?0:st.bb))/ip+(bbX?0.35:0), k9=st.k*9/ip, W=normWP(m);
  const raw=normScore(achP(era,whip,k9),W);
  const prior=priorRP(m);
  return Math.max(0,prior+(raw-prior)*ip/(ip+15));
}
/* ---- 贔屓起用の打診 ---- */
function favProposal(){
  const m=myMgr(); if(!m||m.a!=='fav') return null;
  if(PEN.prompt||PEN.pending||PEN.favMod||PEN.favTry) return null;
  if(rnd()>0.3) return null;
  const kinds=[], lo=(m.fav||0)<40;   // お気に入り度40未満は「試し投げ」の指示だけ
  const tryC=isBat()?[]:LEARN_TYPES.filter(t=>!PEN.rep.includes(t));
  if(!lo){
    if(hasBat()){ kinds.push('order'); const np=POSS.filter(p=>!myPositions().includes(p)); if(isBat()&&np.length) kinds.push('pos'); }
    if(!isBat()) kinds.push('pitch');
  }
  if(tryC.length) kinds.push('try');
  const k=pick(kinds); if(!k) return null;
  const pr={kind:'fav',sub:k};
  if(k==='try'){ pr.t=pick(tryC); pr.n=ri(5,10); }
  if(k==='pos') pr.pos=pick(POSS.filter(p=>!myPositions().includes(p)));
  if(k==='order') pr.order=pick([1,2,3,4,5,6,7,8,9].filter(o=>o!==PEN.order));
  if(k==='pitch') pr.role=isStarter(PEN.role)?'中継ぎ':isTW()?'裏ローテ':pick(['裏ローテ','抑え']);
  return pr;
}
function favText(pr){
  const m=myMgr(), n=PEN.pname;
  if(pr.sub==='try') return `${n}、ちょっと<b>${pr.t}</b>を試しに投げてみてくれ。次の5登板、1登板に<b>${pr.n}球</b>は投げてほしい。お前なら投げられると思うんだ。`;
  if(pr.sub==='pos') return `${n}、お前のことは買ってるんだ。次の10試合、<b>${POS_JP[pr.pos]}</b>を守ってみないか。慣れてないのは分かってる。だがお前なら何とかなる。`;
  if(pr.sub==='order') return `${n}、ちょっと打線をいじりたい。次の10試合、お前を<b>${pr.order}番</b>で使う。いつもと違う役割だが、お前に任せたいんだ。`;
  return `${n}、次の10試合は<b>${roleName(pr.role)}</b>でいってくれないか。お前の力をもっと使いたいんだ。`;
}
function favAnswer(ok){
  const pr=PEN.prompt; if(!pr||pr.kind!=='fav') return; PEN.prompt=null;
  if(!ok){ favChange(-5); penNotice(`${mgrName(myMgr())}の打診を断った（お気に入り度 −5）`); renderPennant(); save(); return; }
  if(pr.sub==='try'){   // 試し投げ：5登板のあいだ Lv.1 の球種が増える
    if(PEN.rep.includes(pr.t)){ renderPennant(); save(); return; }
    PEN.favTry={t:pr.t,n:pr.n,left:5,ok:0,ng:0}; PEN.rep.push(pr.t); PEN.plev[pr.t]=1;
    penNotice(`${mgrName(myMgr())}の指示で、5登板のあいだ${pr.t}（Lv.1）を投げることに（1登板${pr.n}球以上）`);
    renderPennant(); save(); return; }
  favChange(3);
  const until=PEN.day+10, mod={until,sub:pr.sub};
  if(pr.sub==='pos'){ mod.pos=pr.pos; myT().errUp=until; penNotice(`${POS_JP[pr.pos]}で出場することになった。慣れない守備で、チームのエラーが増えそうだ`); }
  else if(pr.sub==='pitch'){ mod.role=PEN.role; myT().errUp=until; setRole(pr.role,`${mgrName(myMgr())}の意向で、しばらく${roleName(pr.role)}に。いつもと違う起用でチームの守りも落ち着かない`); }
  else{   // 打順：全能力がそれぞれ±1〜10（10試合のあいだ）
    mod.order=pr.order; mod.add={};
    const keys=isBat()?['meet','power','speed','eye','def']:isTW()?['velo','control','stamina','meet','power','speed','eye']:['velo','control','stamina'];
    keys.forEach(k=>{ const d=ri(1,10)*(rnd()<0.5?-1:1), o=P_ABK.includes(k)?PEN.abil:PEN.babil, cap=k==='velo'?165:100, nv=clamp((o[k]??50)+d,0,cap); mod.add[k]=r1(nv-(o[k]??50)); o[k]=r1(nv); });
    penNotice(`${pr.order}番で起用されることになった。役割が変わって調子にも波が出た：${Object.entries(mod.add).map(([k,v])=>`${AB_LABEL[k]}${v>0?'+':''}${v}`).join('・')}`);
  }
  PEN.favMod=mod;
  if(isBat()) penCompete(true); if(isTW()) twCompete(true);
  renderPennant(); save();
}
// 試し投げ：登板ごとに指定の球数を投げたか（クリア+3／届かない−6）。5登板で終わり
function favTryRecord(cnt,played){
  const F=PEN.favTry; if(!F) return;
  if(!isFavMgr()){ favTryEnd(); return; }
  const ok=cnt>=F.n-1e-6;
  if(ok){ F.ok++; favChange(3); } else { F.ng++; favChange(-6); }
  F.left--;
  penNotice(`試し投げ：${F.t}を${Math.round(cnt)}球${played?'':'（おまかせ）'}／指定${F.n}球 → ${ok?'クリア！ お気に入り度 +3':'届かなかった… お気に入り度 −6'}（あと${F.left}登板）`);
  if(F.left<=0) favTryEnd(true);
}
function favTryEnd(done){
  const F=PEN.favTry; if(!F) return; PEN.favTry=null;
  if(PEN.rep.includes(F.t)){ PEN.rep=PEN.rep.filter(x=>x!==F.t); delete PEN.plev[F.t]; }
  if(done) penNotice(`${F.t}の試し投げが終わった（クリア${F.ok}回・失敗${F.ng}回）`);
}
function favExpire(){
  const mod=PEN.favMod; if(!mod||PEN.day<mod.until) return;
  if(mod.add){ for(const k in mod.add){ const o=P_ABK.includes(k)?PEN.abil:PEN.babil; o[k]=r1((o[k]??50)-mod.add[k]); } penNotice('打順の実験が終わり、調子も元に戻った'); }
  if(mod.role){ setRole(mod.role,`${mgrName(myMgr())}の起用実験が終わり、${roleName(mod.role)}に戻った`); }
  if(mod.pos) penNotice(`${POS_JP[mod.pos]}での起用が終わった`);
  PEN.favMod=null;
  if(isBat()) penCompete(true); if(isTW()) twCompete(true);
}
/* ---- 監督交代：5・6位で、活躍した20代（スタメン＋ローテーション）が5人以下 ---- */
function mgrChangeCheck(fin){
  const out=[];
  for(const t of NPB){
    const T=PEN.teams[t.id], m=mgrOf(t.id), rank=fin?fin[t.lg].findIndex(x=>x.id===t.id)+1:0;
    if(rank<5) continue;
    const st=pickStarters(T,null), rot=staff(T).rot;
    // 活躍した20代＝スタメン・ローテーションのうち、プロの平均（50）をはっきり超えている20代（あなたも評価50以上なら数える）
    const good=f=>hitScore(f)+(f.d-50)*0.2>=56;
    const y20=st.filter(x=>!x.me&&x.f.age>=20&&x.f.age<=29&&good(x.f)).length+rot.filter(p=>!p.isMe&&p.age>=20&&p.age<=29&&pitScore(p)>=56).length+(PEN.team===t.id&&PEN.age>=20&&PEN.age<=29&&evalOld()>=50?1:0);
    if(y20>5) continue;
    const nm=genManager(PEN.year+1); T.mgr=nm; out.push({id:t.id,old:m,nw:nm,rank,y20});
  }
  return out;
}
/* ---- 画面 ---- */
function mgrCard(m,small){
  m=m||myMgr(); if(!m) return '';
  const [,pn,pd]=MGR_JP(m.p,'p'), [,bn,bd]=MGR_JP(m.b,'b'), [,an,ad]=MGR_JP(m.a,'a'), [,on,od]=MGR_JP(m.o||'std','o');
  return `<div class="mcard${small?' sm':''}"><div class="mimg">${svgManager(TEAM[PEN.team],m)}</div><div class="mtxt">
    <div class="mname">${mgrName(m)} <small>采配レベル <b>${m.lv.toFixed(1)}</b>（キャンプ +${mgrCampBonus(m).toFixed(1)}pt）</small></div>
    <div>${mgrBadges(m)}</div>
    <div class="mrow"><i class="mb mb-p">${pn[0]}</i>${pn}<small>投手起用：${pd}</small></div>
    <div class="mrow"><i class="mb mb-b">${bn[0]}</i>${bn}<small>野手起用：${bd}</small></div>
    <div class="mrow"><i class="mb mb-a">${an[0]}</i>${an}<small>全体起用：${ad}${m.a==='fav'?`　お気に入り度 <b>${m.fav||0}</b>`:''}</small></div>
    <div class="mrow"><i class="mb mb-o">${on[0]}</i>${on}<small>打順志向：${od}</small></div>
    <div class="mrow"><i class="mb mb-r">${rotN(m)}</i>${MGR_JP(m.r||'six','r')[1]}<small>先発起用：${MGR_JP(m.r||'six','r')[2]}</small></div>
  </div></div>`;
}
// 監督の見た目は全員同じ。志向は名前の下の四角いアイコン（投手＝赤・野手＝黄・全体＝緑、頭文字）で表す
function svgManager(u,m){ u=u||curUni();   // 見た目は全員同じ（サングラスに球団ジャージ）
  return `<svg viewBox="0 0 100 130" width="92" height="120" aria-hidden="true">
  <ellipse cx="50" cy="126" rx="30" ry="4" fill="#0006"/>
  <path d="M22 128 L25 90 Q50 80 75 90 L78 128 Z" fill="${u.jk}"/>
  <path d="M50 84 L50 128" stroke="${u.jt}" stroke-width="2.5"/>
  <path d="M42 84 L50 94 L58 84" fill="none" stroke="${u.jt}" stroke-width="2.5"/>
  <path d="M25 92 Q14 104 18 120" fill="none" stroke="${u.jk}" stroke-width="10" stroke-linecap="round"/>
  <path d="M75 92 Q86 104 82 120" fill="none" stroke="${u.jk}" stroke-width="10" stroke-linecap="round"/>
  <path d="M21 96 Q13 106 16 118" fill="none" stroke="${u.jt}" stroke-width="2"/>
  <path d="M79 96 Q87 106 84 118" fill="none" stroke="${u.jt}" stroke-width="2"/>
  <circle cx="18" cy="121" r="5" fill="#e0b48c"/><circle cx="82" cy="121" r="5" fill="#e0b48c"/>
  <rect x="44" y="72" width="12" height="12" fill="#e0b48c"/>
  <circle cx="50" cy="56" r="20" fill="#e0b48c"/>
  <path d="M30 56 Q30 50 33 48 L33 58 Z" fill="#8a8a8a"/><path d="M70 56 Q70 50 67 48 L67 58 Z" fill="#8a8a8a"/>
  <path d="M29 52 Q30 32 50 31 Q70 32 71 52 Z" fill="${u.cap}"/>
  <path d="M40 50 Q24 49 18 54 L40 54 Z" fill="${u.brim||u.cap}"/>
  <text x="50" y="48" font-size="${(u.capf||u.chf)==='script'?12:u.capf==='serif'?11:10}" fill="${u.cl}" ${u.cls?`stroke="${u.cls}" stroke-width="0.8" paint-order="stroke"`:''} text-anchor="middle" ${typeof capFont==='function'?capFont(u):'font-family="sans-serif" font-weight="900"'}>${u.ch}</text>
  <rect x="35" y="53" width="13" height="8" rx="3" fill="#111"/><rect x="52" y="53" width="13" height="8" rx="3" fill="#111"/>
  <path d="M48 56 L52 56" stroke="#111" stroke-width="2"/>
  <path d="M43 68 L57 68" stroke="#7a3b22" stroke-width="2.2" stroke-linecap="round"/>
</svg>`; }

// 志向のラベル（赤＝投手起用、黄＝野手起用、緑＝全体起用、白＝打順志向）。小さく、名前は全部書く
const mgrBadges=m=>m?`<span class="mbs"><i class="mb mb-p" title="投手起用：${MGR_JP(m.p,'p')[1]}">${MGR_JP(m.p,'p')[1][0]}</i><i class="mb mb-b" title="野手起用：${MGR_JP(m.b,'b')[1]}">${MGR_JP(m.b,'b')[1][0]}</i><i class="mb mb-a" title="全体起用：${MGR_JP(m.a,'a')[1]}">${MGR_JP(m.a,'a')[1][0]}</i><i class="mb mb-o" title="打順志向：${MGR_JP(m.o||'std','o')[1]}">${MGR_JP(m.o||'std','o')[1][0]}</i><i class="mb mb-r" title="先発起用：${MGR_JP(m.r||'six','r')[1]}（${rotN(m)}人ローテ）">${rotN(m)}</i></span>`:'';
