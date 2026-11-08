/* ================================================================
   所持金・年俸の上限・オフシーズンのコーチ
   ・査定が終わると来季の年俸を先にもらう（寮生活中は半分が寮費）。入団時は500万の半分
   ・年俸の上限＝ここ5年の実績ポイントで決まる（最高15億）。上限に近いほど上がりにくい
   ・オフ（キャンプ前）に所持金でコーチを3人まで呼ぶ（家も含む）→ オフ3日間、1日ずつコーチが来る
   ・効果は今シーズンの終わりまで（家と合同自主トレの能力アップはずっと）
   ================================================================ */
const SAL_MAX=1500000000;
const AWARD_PTS={'日本シリーズMVP':3,'WBC野手MVP':3,'WBC投手MVP':3,'クライマックスシリーズMVP':1,'オールスターMVP':0.5};
const SAL_CAPS=[[26,1500000000],[21,1000000000],[15,700000000],[10,500000000],[6,350000000],[3,200000000],[1,100000000],[0,50000000]];
const salCap=p=>{ for(const [t,c] of SAL_CAPS) if(p>=t) return c; return 50000000; };
const salMaxUp=s=>s<30000000?1.5:s<100000000?1.0:0.6;   // 1年で上がる幅の最大：3,000万未満+150%・1億未満+100%・1億以上+60%
const streakBonus=n=>n>=2?Math.min(2,0.5*(n-1)):0;      // 連続タイトル：2年+0.5・3年+1・4年+1.5・5年以上+2
const COACH_V={mental:3,analyst:4,trainer:0,agent:0,realtor:2,doctor:10,club:9,legend:7,rehab:10};   // 怪しい医者 案11（案10＋案6の緑のフラスコとシャツ）・球団コーチ 案10・伝説の野球選手 案8・リハビリトレーナー 案11（案9＋カルテボード）   // キャラクター：メンタリスト案4・アナリスト案5（大きいタブレット）・トレーナー案1（ボード）・代理人案1・不動産屋案3
// 規定到達（野手：規定打席、投手：規定投球回か50登板、二刀流：どちらか）
function isRegular(ss,bss){
  const bq=s=>!!(s&&s.pa!=null&&s.pa>=QUAL_PA), pq=s=>!!(s&&s.pa==null&&((s.outs||0)>=SEASON_GAMES*3||(s.g||0)>=50));
  return bq(ss)||pq(ss)||bq(bss);
}
// 実績ポイント（ここ5年）。rv があれば今季のタイトルも入れる
function realPts(rv){
  const cur=PEN.year, tBy={}, regBy={}, plBy={};
  const plPts=a=>Math.round((a||[]).reduce((s,r)=>s+(PLACE_PTS[r]||0),0)*10)/10;   // タイトル争い2〜5位
  (PEN.seasons||[]).forEach(s=>{ tBy[s.year]=(s.titles||[]).length; regBy[s.year]=isRegular(s.ss,s.bss); plBy[s.year]=s.places||[]; });
  tBy[cur]=rv&&rv.titles?rv.titles.filter(t=>t.won).length:(tBy[cur]||0); regBy[cur]=isRegular(PEN.ss,isTW()?PEN.bss:null);
  if(rv&&rv.places) plBy[cur]=rv.places.map(p=>p.rank);
  const aw=y=>(PEN.titles||[]).filter(t=>t.y===y&&AWARD_PTS[t.name]).reduce((a,t)=>a+AWARD_PTS[t.name],0);
  const rows=[]; let tot=0;
  for(let y=Math.max(1,cur-4);y<=cur;y++){
    let st=0; for(let k=y;k>=1&&(tBy[k]||0)>0;k--) st++;
    const t=tBy[y]||0, tp=t>0?2+(t-1):0, sb=t>0?streakBonus(st):0, reg=regBy[y]?1:0, a=aw(y), np=(plBy[y]||[]).length, pl=plPts(plBy[y]), p=Math.round((reg+tp+sb+a+pl)*10)/10;
    rows.push({y,reg,t,tp,sb,st,a,np,pl,p}); tot+=p;
  }
  return {pts:Math.round(tot*10)/10,rows};
}
// 年俸査定の仕上げ（ポストシーズンの表彰が終わってから）：上限に近いほど上がりにくい・マネーマネジメント
function salaryFinalize(rv){
  if(!rv||rv.salFin||!PEN) return; rv.salFin=true;
  const R=realPts(rv); rv.rp=R; rv.cap=salCap(R.pts);
  if(rv.released||rv.ct||rv.faDone) return;   // 契約中・FAで決まった年俸はそのまま
  const s=PEN.salary; let rate=rv.chg; rv.chg0=rv.chg;
  if(rate>0){ const f=s>=rv.cap?0:Math.sqrt(1-s/rv.cap); rv.dim=Math.round(f*100)/100; rate=rate*f; if(s*(1+rate)>Math.max(rv.cap,s)) rate=Math.max(rv.cap,s)/s-1; }
  const mm=cbOn('money'); if(mm){ rv.mm=mm.mm; rate+=mm.mm; }
  rv.chg=Math.round(rate*1000)/1000;
  rv.newSal=Math.min(SAL_MAX,Math.max(1000000,Math.round(s*(1+rate)/100000)*100000));
}
function salHTML(rv){
  if(!rv||!rv.rp||rv.released) return '';
  const R=rv.rp, rowTxt=r=>`${r.y}年目：${[r.reg?'規定到達 1':'',r.t?`タイトル${r.t}つ ${r.tp}`:'',r.sb?`${r.st}年連続 +${r.sb}`:'',r.a?`表彰 +${r.a}`:'',r.np?`タイトル争い上位${r.np}つ +${r.pl}`:''].filter(Boolean).join('・')||'0'}${r.p?`（${r.p}点）`:''}`;
  return `<div class="hint" style="color:var(--ink)">📈 年俸の上限 <b>${yen(rv.cap)}</b>（ここ5年の実績 ${R.pts}点）${rv.dim!=null&&rv.dim<1&&!rv.ct?`<br><small>上限に近いほど上がりにくい：今年の上がり幅 ×${rv.dim}</small>`:''}${rv.mm?`　💼 マネーマネジメント +${Math.round(rv.mm*100)}%`:''}</div>
    <details class="salx" style="margin-top:2px"><summary class="hint" style="display:list-item;cursor:pointer">実績ポイントの内訳</summary><div class="hint">${R.rows.map(rowTxt).join('<br>')}<br>
    <small>規定到達1点／タイトル1つ目2点・2つ目から+1点／タイトル争い（取れなかった部門）2位0.6点・3位0.4点・4位0.3点・5位0.2点／連続タイトル 2年+0.5〜5年以上+2／日本シリーズMVP・WBC MVP 3点・CS MVP 1点・オールスターMVP 0.5点。<br>上限：1点で1億・3点で2億・6点で3.5億・10点で5億・15点で7億・21点で10億・26点で15億（0点は5,000万）</small></div></details>
    <div class="hint">💴 査定が終わると、来季の年俸を先にもらえます（${PEN.house?'持ち家なので満額':'寮生活中は半分が寮費'}）</div>`;
}
// 年俸を受け取る（寮生活中は半分）
function salaryPay(sal,why){
  if(!PEN||!sal) return; const dorm=!PEN.house, net=dorm?Math.round(sal/2):sal;
  PEN.money=(PEN.money||0)+net;
  penNotice(`💴 ${why||'来季の年俸'} ${yen(sal)} を受け取った${dorm?`（寮費として半分の${yen(sal-net)}を引かれ、${yen(net)}）`:''}。所持金 ${yen(PEN.money)}`);
}

/* ---- 今季の効果（PEN.cb={y,on:{id:{...}}}） ---- */
const cbAct=()=>(typeof PEN!=='undefined'&&PEN&&!PEN.released&&PEN.cb&&PEN.cb.y===PEN.year)?PEN.cb.on:null;
const cbOn=id=>{ const o=cbAct(); return o&&o[id]||null; };
const cbG=id=>(typeof G!=='undefined'&&G&&G.pen&&!G.pen.tryout)?cbOn(id):null;   // ペナントの試合中だけ
const cbSpark=()=>{ const m=cbOn('motion'); return m&&m.pitch||null; };
const pinchMe=bs=>inPinch(bs)&&!cbG('yosho');   // 要所の戦い方：得点圏でも能力が下がらない
function cbStaMul(){ let m=1; if(cbG('nebari')) m*=0.8; if(cbG('stamina')) m*=0.65; return m; }   // 疲れの影響（粘り勝つ −20%・体力トレーニング −35%）
// 打撃の能力（シーズン後半+5・研究した球団との試合+5）
function cbBab(a){
  const o=cbAct(); if(!o||!a) return a; let add=0; const dAdd=o.tokushu?5:0;   // 特守：守備+5
  if(o.stamina&&PEN.day>=71) add+=5;
  if(o.scout&&PEN.pending&&PEN.pending.opp===o.scout.team) add+=5;
  if(!add&&!dAdd) return a; const r={...a}; for(const k of ['meet','power','speed','eye','def']) r[k]=Math.min(100,(a[k]??(k==='def'?70:50))+add+(k==='def'?dAdd:0)); return r;
}
// 投手の能力（研究した球団との試合：球速+2・コントロール+5・スタミナ+5）
function cbAbil(a){
  if(!a) return a; const s=cbOn('scout'); let r=a;
  if(s&&PEN.pending&&PEN.pending.opp===s.team) r={...r,velo:Math.min(VELO_MAX,r.velo+2),control:Math.min(100,r.control+5),stamina:Math.min(100,r.stamina+5)};
  if(cbOn('tokushu')) r={...r,control:Math.min(100,r.control+5)};   // 特守：コントロール+5
  return r;
}
// スキップしたときの防御率（コーチの効果ぶん少し良くなる）
function cbEraAdj(opp){
  const o=cbAct(); if(!o) return 0; let d=0;
  if(o.nebari) d+=0.12; if(o.yosho) d+=0.12; if(o.stamina) d+=0.1; if(o.motion&&o.motion.pitch) d+=0.15;
  if(o.scout&&opp&&opp===o.scout.team) d+=0.25;
  if(o.tokushu) d+=0.06; if(o.platoon) d+=0.08; if(o.run) d+=0.03;
  return d;
}
// シーズンが終わったら元に戻す（ヨガで戻した能力・モーショントラッキングのタイプ）
function cbSeasonEnd(){
  const C=PEN&&PEN.cb; if(!C||C.y!==PEN.year||C.ended) return; C.ended=true;
  const y=C.on.yoga; if(y&&y.d){ for(const k in y.d.abil||{}) PEN.abil[k]=r1(Math.max(k==='velo'?110:0,PEN.abil[k]-y.d.abil[k])); for(const k in y.d.babil||{}) PEN.babil[k]=r1(Math.max(0,(PEN.babil[k]??50)-y.d.babil[k])); }
  const m=C.on.motion; if(m&&m.type&&m.was!=null&&PEN.btype===m.type) PEN.btype=m.was;
  const L=C.on.last; if(L&&L.ok){ L.fr=L.fr||0; lastApply(L,0); }   // 最後の輝き：元の能力に戻る
}
/* ---- 最後の輝きを目指して（怪しい医者・35歳以上・全財産） ----
   25%：前半戦（71試合目まで）は、いちばん成績が良かった年の能力に戻る（その年より今が高い能力はそのまま）。後半戦は少しずつ下がり、レギュラーシーズン終了で元に戻る
   75%：全能力−15（球速は−15km/h）・変化球のLvが合計3下がる（Lv0になった球種は投げられなくなる）。ずっと残る */
function bestSeason(){
  const S=(PEN.seasons||[]).filter(s=>s&&(s.abil||s.babil)); if(!S.length) return null;
  const scB=s=>s&&s.pa>=150?normScore(achB(bAvg(s),bObp(s)+bSlg(s),s.hr/s.pa*600,(s.sb||0)/s.pa*600,(s.k||0)/s.pa),NORM_W_B.std):null;
  const scP=s=>s&&s.outs>=120&&s.pa==null?normScore(achP(s.runs*27/s.outs,((s.hits||0)+(s.bb||0))*3/s.outs,(s.k||0)*27/s.outs),NORM_W_P.std):null;
  let best=null, bv=-1e9;
  for(const s of S){ const v=s.pos==='B'?scB(s.ss):s.pos==='W'?[scP(s.ss),scB(s.bss)].filter(x=>x!=null).reduce((t,x,i,a)=>t+x/a.length,0)||null:scP(s.ss); if(v!=null&&v>bv){ bv=v; best=s; } }
  if(!best){ const tot=s=>Object.values(s.babil||{}).reduce((t,x)=>t+(+x||0),0)+((s.abil&&s.abil.control)||0)+((s.abil&&s.abil.stamina)||0); best=S.slice().sort((a,b)=>tot(b)-tot(a))[0]; }
  return best;
}
const LAST_KB=['meet','power','speed','eye','def'], LAST_KP=['velo','control','stamina'];
function lastApply(L,fr){   // 上乗せ（L.d）のうち fr の割合だけ乗った状態にする
  const df=fr-(L.fr||0); if(Math.abs(df)<1e-9) return;
  for(const k in L.d.babil||{}) if(PEN.babil) PEN.babil[k]=r1(Math.max(0,Math.min(100,(PEN.babil[k]??50)+L.d.babil[k]*df)));
  for(const k in L.d.abil||{}) if(PEN.abil) PEN.abil[k]=r1(Math.max(k==='velo'?110:0,Math.min(k==='velo'?VELO_MAX:100,PEN.abil[k]+L.d.abil[k]*df)));
  L.fr=fr;
}
function lastDo(){
  const k=posKind(), B=k!=='P', P=k!=='B';
  if(rnd()<0.25){ const s=bestSeason(), d={abil:{},babil:{}}, T=[];
    if(s&&B&&s.babil&&PEN.babil) for(const kk of LAST_KB){ const v=r1((s.babil[kk]??0)-(PEN.babil[kk]??0)); if(v>0){ d.babil[kk]=v; T.push(`${B_ABK[kk]||kk}+${v}`); } }
    if(s&&P&&s.abil&&PEN.abil) for(const kk of LAST_KP){ const v=r1((s.abil[kk]??0)-(PEN.abil[kk]??0)); if(v>0){ d.abil[kk]=v; T.push(`${kk==='velo'?'球速':kk==='control'?'コントロール':'スタミナ'}+${v}${kk==='velo'?'km/h':''}`); } }
    const L={ok:true,d,fr:0,year:s?s.year:null,age:s?s.age:null,txt:T.length?T.join('・'):'今のほうが高いので変わらず'}; lastApply(L,1); return L; }
  const T=[];
  if(B&&PEN.babil){ for(const kk of LAST_KB) PEN.babil[kk]=r1(Math.max(0,(PEN.babil[kk]??50)-15)); T.push(`${k==='W'?'打撃の':''}全能力−15`); }
  if(P&&PEN.abil){ PEN.abil.velo=r1(Math.max(110,PEN.abil.velo-15)); PEN.abil.control=r1(Math.max(0,PEN.abil.control-15)); PEN.abil.stamina=r1(Math.max(0,PEN.abil.stamina-15)); T.push('球速−15km/h・コントロール−15・スタミナ−15');
    const lost=[]; for(let n=0;n<3;n++){ const L=(PEN.rep||[]).filter(t=>t!=='ストレート'&&(PEN.plev[t]||0)>0); if(!L.length) break; const t=pick(L); PEN.plev[t]=(PEN.plev[t]||1)-1; if(PEN.plev[t]<=0){ PEN.rep=PEN.rep.filter(x=>x!==t); delete PEN.plev[t]; lost.push(t); } }
    T.push(`変化球のLv 合計−3${lost.length?`（${lost.join('・')}は投げられなくなった）`:''}`); }
  return {ok:false,txt:T.join('・')};
}
// 毎日：最後の輝きの上乗せ（前半戦はそのまま、後半戦は少しずつ下がり、レギュラーシーズン終了で0）
function cbDaily(){
  const L=cbOn('last'); if(!L||!L.ok) return;
  const half=Math.ceil(SEASON_GAMES/2), d=PEN.day, fr=d<half?1:Math.max(0,(SEASON_GAMES-d)/(SEASON_GAMES-half));
  lastApply(L,fr);
}
/* ---- 覚醒合宿（伝説の野球選手・29歳までの毎年5%・生涯1回）：すり抜けた覚醒（条件を満たしたのに覚醒しなかったもの）からランダムに3つ ---- */
const AWK_SEASON={avg300:['安打製造機の覚醒',10,'ミート+5'],hr10:['長距離砲の覚醒',10,'パワー+5'],era300:['エースピッチャーへの兆し',20,''],kaido:['怪童への道',0,'']};
function legendPool(){
  const A=PEN.awake||{done:{},log:[]}, got=new Set((A.log||[]).map(l=>l.name)), out=[];
  for(const [id,pts,pr,name] of AWAKE) if(A.done&&A.done[id]&&!got.has(name)) out.push({id,name,pts});   // 条件を満たしたのに覚醒しなかった
  for(const id in (A.miss||{})) if(A.miss[id]&&!(A.done&&A.done[id])&&AWK_SEASON[id]) out.push({id,name:AWK_SEASON[id][0],pts:AWK_SEASON[id][1],season:true});
  return out;
}
function legendDo(){
  const A=PEN.awake||(PEN.awake={bank:0,done:{},log:[]}); A.legendDone=true;
  const R=shuffle(legendPool()).slice(0,3), out=[];
  for(const e of R){
    if(!e.season){ A.bank=r1((A.bank||0)+e.pts); A.log.push({y:PEN.year,name:e.name,pts:e.pts,legend:true}); out.push({name:e.name,pts:e.pts}); continue; }
    A.done[e.id]=true; if(A.miss) delete A.miss[e.id];
    if(e.id==='avg300'&&PEN.babil){ PEN.babil.meet=r1(Math.min(100,PEN.babil.meet+5)); }
    if(e.id==='hr10'&&PEN.babil){ PEN.babil.power=r1(Math.min(100,PEN.babil.power+5)); }
    if(e.id==='kaido'&&PEN.abil){ const lv=lvOf('ストレート'), dv=ri(2,5); PEN.abil.velo=r1(Math.min(VELO_MAX,PEN.abil.velo+dv)); let ex=`球速+${dv}km/h`, pts=0;
      if(lv<LV_MAX){ PEN.plev['ストレート']=lv+1; ex=`ストレートLv.${lv+1}・`+ex; } else pts=5;
      if(pts) A.bank=r1((A.bank||0)+pts); A.log.push({y:PEN.year,name:e.name,pts,legend:true}); out.push({name:e.name,pts,ex}); continue; }
    A.bank=r1((A.bank||0)+e.pts); A.log.push({y:PEN.year,name:e.name,pts:e.pts,legend:true}); out.push({name:e.name,pts:e.pts,ex:AWK_SEASON[e.id][2]});
  }
  return out;
}

/* ---- コーチの一覧 ---- */
const CB_ITEMS=[
  {id:'scout', tier:'お手頃',  coach:'analyst',name:'相手球団の研究',price:6000000},
  {id:'yoga',  tier:'お手頃',  coach:'rehab',  name:'ヨガ教室',price:7000000},
  {id:'yosho', tier:'お手頃',  coach:'mental', name:'メンタリズム講座〜要所の戦い方編〜',price:8000000},
  {id:'antei', tier:'お手頃',  coach:'mental', name:'メンタリズム講座〜安定した戦い方編〜',price:9000000},
  {id:'run',   tier:'お手頃',  coach:'club',   name:'走塁・盗塁講習',price:15000000},
  {id:'nebari',tier:'標準',    coach:'mental', name:'メンタリズム教室〜粘り勝つメンタル編〜',price:20000000},
  {id:'tokushu',tier:'標準',   coach:'club',   name:'特守',price:20000000},
  {id:'stamina',tier:'標準',   coach:'trainer',name:'体力トレーニング',price:30000000},
  {id:'platoon',tier:'標準',   coach:'club',   name:'左右苦手克服',price:40000000},
  {id:'legend',tier:'標準',    coach:'legend', name:'覚醒合宿',price:50000000},
  {id:'joint', tier:'標準',    coach:'player', name:'他選手との合同自主トレーニング',price:60000000},
  {id:'motion',tier:'高級',    coach:'analyst',name:'モーショントラッキング',price:200000000},
  {id:'cond',  tier:'高級',    coach:'rehab',  name:'コンディショニング',price:200000000},
  {id:'anti',  tier:'高級',    coach:'rehab',  name:'アンチエイジング',price:300000000},
  {id:'data',  tier:'最高級',  coach:'analyst',name:'データ解析',price:500000000},
  {id:'last',  tier:'特別',    coach:'doctor', name:'最後の輝きを目指して',price:0},
  {id:'money', tier:'特別',    coach:'agent',  name:'マネーマネジメント',price:0},
  {id:'house', tier:'特別',    coach:'realtor',name:'家を買う',price:100000000},
];
const cbItem=id=>CB_ITEMS.find(x=>x.id===id);
const cbPrice=id=>id==='money'?Math.max(9000000,Math.round((PEN.salary||0)*0.08/100000)*100000):id==='last'?Math.max(0,PEN.money||0):cbItem(id).price;   // 最後の輝き：全財産
// 一覧に出ないもの：最後の輝き（35歳から）・覚醒合宿（29歳までの毎年5%で現れる・生涯1回）
const cbHidden=id=>id==='last'?(PEN.age||0)<35:id==='legend'?!(PEN.off&&PEN.off.legend):false;
const jointYear=y=>typeof wbcYear==='function'&&wbcYear(y-1);   // WBCのあった年のオフ（＝次の年のキャンプ前）
function cbLock(id){
  if(id==='joint'&&!jointYear(PEN.year)){ let y=PEN.year+1; while(!jointYear(y)&&y<PEN.year+8) y++; return `🔒 WBCのあった年のオフだけ（次は${y}年目のキャンプ前）`; }
  if(id==='house'&&PEN.house) return '購入済み（持ち家）';
  if(id==='last'&&!(PEN.money>0)) return '所持金がないと受けられない';
  return null;
}
const posKind=()=>isBat()?'B':isTW()?'W':'P';
// 説明（簡潔に・数字つき）
function cbDesc(id){
  const k=posKind(), B=k!=='P', P=k!=='B', L=[];
  switch(id){
    case 'scout': L.push('球団を1つ選ぶと、その球団との試合だけ能力が少し上がる'); if(B) L.push(`${k==='W'?'打撃：':'野手：'}全能力+5`); if(P) L.push(`${k==='W'?'投球：':'投手：'}球速+2km/h・コントロール+5・スタミナ+5`); break;
    case 'yoga': L.push('過去にケガで下がった能力の1/3を回復（今季だけ）'); L.push('ケガの確率が半分'); break;
    case 'yosho': if(B) L.push(`${k==='W'?'打撃':'野手'}：得点圏（ランナー二塁・三塁）で打撃が少し上がる（空振り−10%・打球の質アップ）`); if(P) L.push(`${k==='W'?'投球':'投手'}：得点圏にランナーがいるときの能力ダウンがなくなる`); break;
    case 'antei': L.push('スランプの発生確率が1/5になる'); break;
    case 'nebari': if(B) L.push(`${k==='W'?'打撃':'野手'}：三振が少し減り、追い込まれてからのヒット性の当たり・カットが少し増える（2ストライク後の空振り−15%・カット+8%）`); if(P) L.push(`${k==='W'?'投球':'投手'}：体力が切れたときの能力ダウンを20%緩和・勝ち投手の権利が取れる回（勝っている5回以降）は全球種の球威が少し増す`); break;
    case 'stamina': if(B) L.push(`${k==='W'?'打撃':'野手'}：シーズン後半（72試合目から）の試合は全能力+5`); if(P) L.push(`${k==='W'?'投球':'投手'}：スタミナが減ったときの能力低下を35%緩和`); break;
    case 'data': L.push('相手からの研究（警戒度）が半分'); L.push(B&&!P?'相手投手の配球の読み（よく狙うマスを避ける）が半分':!B?'相手ベンチの配球分析が4割の確率で外れる':'配球の読み・分析が効きにくい'); break;
    case 'joint': L.push('チームメイト（その年のオールスター・WBCの仲間も）から3人呼んで自主トレ。3人の平均で一番高い能力が、自分も相手も+2.5〜5（球速は+1〜2km/h。成績が良い選手ほど伸びる）。上がった能力はずっと残る'); break;
    case 'anti': L.push('33歳を超えてからの大きな衰え（マイナスの倍率）が半分'); if(P) L.push('変化球が年齢の衰えで下がらない'); if((PEN.age||22)<=33) L.push(`<small>（今${PEN.age}歳。衰えの倍率がかかるのは34歳から）</small>`); break;
    case 'motion': if(B) L.push(`${k==='W'?'打撃':'野手'}：打者タイプを好きなものに変えられる（今季だけ）`); if(P) L.push(`${k==='W'?'投球':'投手'}：変化球を1つ選ぶと名前の前に✨がつき、打たれにくくなる`); break;
    case 'run': if(B) L.push(`${k==='W'?'打撃':'野手'}：盗塁の成功率+10%・おまかせでも走る回数が増える（足が少し遅くても走る）`); if(P) L.push(`${k==='W'?'投球':'投手'}：クイック・牽制が上手くなり、走られにくい（盗塁を試みられるのが半分・成功率−15%）`); break;
    case 'tokushu': if(B) L.push(`${k==='W'?'打撃':'野手'}：守備+5・エラー半分`); if(P) L.push(`${k==='W'?'投球':'投手'}：コントロール+5・ピッチャーゴロ／ピッチャーライナーが少しだけ増える（ヒット性の当たりの一部がアウトに）`); break;
    case 'platoon': if(B) L.push(`${k==='W'?'打撃':'野手'}：今は「左打ちは右投手、右打ちは左投手に三振しにくい（空振り−12%）」。今季は同じ利き腕の投手にもこの有利がつく（どの投手にも両打ちのように打てる）`); if(P) L.push(`${k==='W'?'投球':'投手'}：今は「同じ利き腕の打者に有利」。今季は反対の打席の打者にも同じ有利がつく`); break;
    case 'legend': { const n=legendPool().length; L.push('これまでの覚醒イベントで、条件を満たしたのに覚醒しなかったもの（すり抜けた覚醒）から、ランダムに3つを発動'); L.push('もらった持ち点は、このあとの春季キャンプですぐ振り分けられる'); L.push(`<small>すり抜けた覚醒：今 ${n}個${n<3?'（3つ未満のときは、あるぶんだけ）':''}／29歳までの毎年5%で現れる・生涯1回だけ</small>`); break; }
    case 'cond': L.push('衰えの始まりを2年遅らせる（33歳50%・34歳75%・35歳100% → 35歳・36歳・37歳）'); L.push('36歳以上のシーズン後半のスランプの起きやすさを、ふつうの確率に戻す'); if(PEN.declAge) L.push(`<small>（もう${PEN.declAge}歳で衰えが始まっているので、衰えの始まりには効かない）</small>`); break;
    case 'last': { const bs=bestSeason(); L.push(`<b>25%</b>：今シーズンの前半戦は、いちばん成績が良かった年${bs?`（${bs.year}年目・${bs.age}歳）`:''}の能力に戻る。後半戦は少しずつ下がり、レギュラーシーズン終了とともに元に戻る`); L.push(`<b>75%</b>：全能力−15${P?'（球速は−15km/h）':''}${P?'・変化球のLvが合計で3下がる（投げられなくなる球種もある）':''}。ずっと残る`); L.push('<small>35歳以上だけ・値段は全財産</small>'); break; }
    case 'money': L.push('次の年俸査定が+5〜10%（15億まで）'); L.push('FAになったら提示額+10%・契約年数が伸びやすい'); L.push(`<small>値段は今の年俸の8%（最低900万）</small>`); break;
    case 'house': L.push('買い切り・効果はずっと'); L.push('次の査定から寮費が引かれず、年俸をそのまま受け取れる'); break;
  }
  return L.join('<br>');
}
/* ---- オフシーズン（キャンプ前）の画面 ---- */
let OFF_OPEN=null, OFF_ARM=false, OFF_JT=null;
const needOff=()=>!!(typeof PEN!=='undefined'&&PEN&&PEN.off&&PEN.off.y===PEN.year&&!PEN.off.done&&!PEN.released&&PEN.campY!==PEN.year&&PEN.day===0&&!PEN.pending&&!PEN.review);
function offInit(){ if(PEN.year>=2&&!PEN.retired){
  const lg=(PEN.age||99)<=29&&!(PEN.awake&&PEN.awake.legendDone)&&legendPool().length>0&&rnd()<(+((typeof process!=='undefined'&&process.env&&process.env.LEGP)||0.05));   // 覚醒合宿が現れる（29歳まで・毎年5%・生涯1回）
  PEN.off={y:PEN.year,stage:'pick',sel:[],legend:lg}; if(lg) penNotice('✨ オフに「伝説の野球選手」が来てくれるらしい（覚醒合宿）'); if(typeof window!=='undefined'&&window.scrollTo) window.scrollTo(0,0); } }
const meSay=t=>`<div class="msay me"><div class="mimg">${svgPlayer(TEAM[PEN.team])}<div class="mlab">${PEN.pname}</div></div><div class="bub r">${t}</div></div>`;
const coachSay=(kind,name,t)=>`<div class="msay"><div class="mimg">${svgCoach(kind,COACH_V[kind]||0)}<div class="mlab">${COACH_KIND_JP[kind]}<br>${name}</div></div><div class="bub l">${t}</div></div>`;
const mateSay=(m,t)=>`<div class="msay"><div class="mimg">${svgPlayer(TEAM[m.team],{num:m.num,bat:m.kind==='F'})}<div class="mlab">${m.name}<br>${TEAM[m.team].short}</div></div><div class="bub l">${t}</div></div>`;
function renderOff(el){
  const O=PEN.off; if(O.stage==='days') return renderOffDay(el);
  const sel=O.sel.filter(id=>cbItem(id)), sum=sel.reduce((t,id)=>t+cbPrice(id),0), money=PEN.money||0, left=money-sum;
  const tiers=['お手頃','標準','高級','最高級','特別'];
  const row=it=>{ const id=it.id, on=sel.includes(id), lock=cbLock(id), pr=cbPrice(id), can=!lock&&(on||(sel.length<3&&pr<=left));
    return `<div class="cbrow ${on?'on':''} ${lock?'lock':!can?'dis':''}">
      <button class="cbchk" data-cbs="${id}" ${(!can&&!on)?'disabled':''} aria-label="選ぶ">${on?'✔':lock?'🔒':''}</button>
      <button class="cbt" data-cbt="${id}">${it.name}<small>${COACH_KIND_JP[it.coach]||'他選手'}　ⓘ</small></button>
      <span class="cbp ${!lock&&!on&&pr>left?'ng':''}">${id==='last'?`全財産<br><small>${yen(pr)}</small>`:yen(pr)}</span></div>
      ${OFF_OPEN===id?`<div class="cbd">${cbDesc(id)}${lock?`<br><b style="color:#f0a0a0">${lock}</b>`:!on&&pr>left?`<br><b style="color:#f0a0a0">所持金が足りません（あと${yen(pr-left)}）</b>`:''}</div>`:''}`; };
  const lines=['オフの間に専門家を呼んで、トレーニングやマネジメントをしてみようかな。','せっかくのオフだ。お金を使って、専門家に見てもらおうかな。','今年のオフは誰を呼ぼう？ 専門家の力を借りてみようかな。'];
  el.innerHTML=`<div class="pen"><h2>🏝 オフシーズン <small>（${PEN.year}年目のキャンプ前・${PEN.age}歳）</small></h2>
    ${meSay(lines[PEN.year%lines.length])}
    <div class="pcardx offm">💰 所持金 <b>${yen(money)}</b>　<small>${PEN.house?'🏠 持ち家（年俸は満額）':'🏢 寮生活（年俸の半分が寮費）'}</small>
      <div class="hint" style="margin:4px 0 0">□をタップで選択、名前をタップで説明。選べるのは<b>3つまで</b>（家も含む）。効果は今シーズンの終わりまで（家と合同自主トレの能力アップはずっと）</div></div>
    <div class="cbl">${tiers.map(t=>{ const L=CB_ITEMS.filter(x=>x.tier===t&&!cbHidden(x.id)); return L.length?`<div class="cbtier">${t}</div>${L.map(row).join('')}`:''; }).join('')}</div>
    <div class="pcardx" style="margin-top:8px">選択中 <b>${sel.length}</b>／3　合計 <b>${yen(sum)}</b>　→ 残り <b>${yen(left)}</b>${sel.length?`<div class="hint" style="margin:2px 0 0">${sel.map(id=>cbItem(id).name).join('・')}</div>`:''}</div>
    <button class="btn main" id="offGo" style="width:100%">${OFF_ARM?'もう一度押すと決定（お金を払います）':sel.length?`${sel.length}人呼ぶ（${yen(sum)}）→ オフ3日間へ`:'今年は誰も呼ばない → オフ3日間へ'}</button>
    <div class="hint">決定すると、オフの日にちが3日進み、1日ずつコーチが来ます（来ない日もあります）。</div></div>`;
  el.querySelectorAll('[data-cbt]').forEach(b=>b.onclick=()=>{ OFF_OPEN=OFF_OPEN===b.dataset.cbt?null:b.dataset.cbt; OFF_ARM=false; renderOff(el); });
  el.querySelectorAll('[data-cbs]').forEach(b=>b.onclick=()=>{ const id=b.dataset.cbs, i=O.sel.indexOf(id); if(i>=0) O.sel.splice(i,1); else if(O.sel.length<3&&!cbLock(id)) O.sel.push(id); OFF_ARM=false; renderOff(el); save(); });
  $('offGo').onclick=()=>{ if(!OFF_ARM){ OFF_ARM=true; renderOff(el); return; } OFF_ARM=false; offDecide(); renderPennant(); save(); window.scrollTo(0,0); };
}
function offDecide(){
  const O=PEN.off, sel=O.sel.filter(id=>cbItem(id)&&!cbLock(id)&&!cbHidden(id)).slice(0,3); let sum=0; const paid={};
  sel.forEach(id=>{ paid[id]=cbPrice(id); sum+=paid[id]; });
  if(sum>(PEN.money||0)) return;
  PEN.money=(PEN.money||0)-sum;
  const slots=shuffle([0,1,2]).slice(0,sel.length).sort((a,b)=>a-b), days=[null,null,null];
  sel.forEach((id,i)=>{ days[slots[i]]={id,name:id==='joint'?'':randName()}; });
  Object.assign(O,{stage:'days',days,d:0,st:{},paid,sum});
  PEN.cb={y:PEN.year,on:{}};
  if(sum) penNotice(`🏝 オフにコーチを呼んだ：${sel.map(id=>`${cbItem(id).name}（${yen(paid[id])}）`).join('・')}。残りの所持金 ${yen(PEN.money)}`);
}
// ---- 1日ずつ
function renderOffDay(el){
  const O=PEN.off, d=O.d, D=O.days[d], st=O.st[d]||(O.st[d]={}), last=d>=2;
  let body='';
  if(!D){
    const t=['今日はコーチングを頼んでいない。自主練でもしておこう。','今日は誰も来ない日。しっかり体を休めておこう。','今日はコーチングを頼んでいない。キャンプに向けて素振り（シャドーピッチング）だ。'];
    body=`${meSay(t[(d+PEN.year)%3])}<div class="pcardx">今日はコーチングを頼んでいない</div>`;
  }else{
    if(!st.done&&!cbNeedsChoice(D.id)) cbDo(D,st,null);
    body=cbTalk(D,st);
  }
  el.innerHTML=`<div class="pen"><h2>🏝 オフ ${d+1}日目 <small>／3日・${PEN.age}歳</small></h2>
    <div class="offdays">${[0,1,2].map(i=>`<span class="${i===d?'on':i<d?'done':''}">${i+1}日目${O.days[i]?`<br><small>${cbItem(O.days[i].id).name.replace(/〜.*〜/,'')}</small>`:'<br><small>－</small>'}</span>`).join('')}</div>
    ${body}
    ${(!D||st.done)?`<button class="btn main" id="offNext" style="width:100%">${last?'オフ終了 → 春季キャンプへ ▶':'次の日へ ▶'}</button>`:''}</div>`;
  const nx=el.querySelector('#offNext'); if(nx) nx.onclick=()=>{ if(last){ O.done=true; penNotice('🏝 オフシーズン終了。春季キャンプへ'); } else O.d++; renderPennant(); save(); window.scrollTo(0,0); };
  cbBind(el,D,st);
}
const cbNeedsChoice=id=>id==='scout'||id==='motion'||id==='joint';
const cbTag=t=>`<div class="pcardx hi cbeff">✅ ${t}</div>`;
// 会話（コーチごと・自分の立場に合わせて）
function cbTalk(D,st){
  const id=D.id, it=cbItem(id), k=posKind(), B=k==='B', P=k==='P', nm=D.name, me=PEN.pname, age=PEN.age||22;
  const C=t=>coachSay(it.coach,nm,t), M=meSay;
  let h='';
  switch(id){
    case 'scout':{
      h+=C(`スポーツアナリストの${nm}です。今日は相手球団を1つ、徹底的に研究しましょう。どこを丸裸にしますか？`);
      if(!st.done){ const L=NPB.filter(t=>t.id!==PEN.team); h+=`<div class="cbch">${['セ','パ'].map(lg=>`<div class="hint" style="margin:4px 0 2px">${LG_NAME[lg]}</div>${L.filter(t=>t.lg===lg).map(t=>`<button class="btn sm" data-cbteam="${t.id}">${tchip(t.id)}</button>`).join('')}`).join('')}</div>`; break; }
      const T=TEAM[st.team].short;
      h+=M(`${T}でお願いします。`)+C(B?`${T}の投手陣は、カウントごとの球種にはっきり偏りがあります。全部まとめておきましたよ。`:P?`${T}の打線は、打者ごとに弱いコースがはっきりしています。全部まとめておきましたよ。`:`${T}の投手の配球も、打者の弱点も、全部まとめておきましたよ。`)+M(`これで${T}戦は一歩先を読めそうだ。`); break; }
    case 'yoga': h+=C(`リハビリトレーナーの${nm}です。今日はヨガでじっくり体をほぐしていきましょう。`)+M(st.loss?'昔のケガ、まだ少し体に残っている気がするんです。':'ケガだけはしたくないんです。')+C('呼吸に合わせて、ゆっくり伸ばして……そう。体の奥が目を覚ましてきましたね。'); break;
    case 'yosho': h+=C(`メンタリストの${nm}です。ランナーが二塁にいる場面、あなたは何を考えていますか？`)+M(B?'「打たなきゃ」って、力が入ってしまいます。':'「打たれたらどうしよう」って、腕が縮こまってしまいます。')+C('その気持ちを消そうとしなくていい。ひと呼吸おいて、いつも通りの1球を。ピンチもチャンスも、同じ1球です。'); break;
    case 'antei': h+=C(`メンタリストの${nm}です。好不調の波、気になっていませんか？`)+M('1度崩れると、なかなか戻らなくて……。')+C('崩れたときに戻る「型」を作りましょう。毎朝同じ順番で、同じことを。心の振れ幅が小さくなりますよ。'); break;
    case 'nebari': h+=C(`メンタリストの${nm}です。今日は「粘り」の話をしましょう。`)+M(B?'追い込まれると、つい焦ってしまって。':P?'疲れてくると、気持ちまで切れてしまうんです。':'追い込まれたときも、疲れてきたときも、つい焦ってしまって。')+C(B?'2ストライクからが本当の勝負です。当てにいくのではなく、仕留めるまで粘る。':'勝ちが見えた5回から、もう一段ギアを上げる。体が重いときほど、腕は振れます。'); break;
    case 'stamina': h+=C(`パーソナルトレーナーの${nm}です！ 今日は体力づくり。走って、跳んで、また走りますよ！`)+M('き、きつい……！')+C(B?'夏場に落ちない体が、シーズン後半のあなたを救います！':'スタミナが切れてからの一踏ん張りが変わりますよ！'); break;
    case 'data': { const kv=Math.max(isBat()?0:keikai(false),hasBat()?keikai(true):0);
      h+=C(`スポーツアナリストの${nm}です。去年のあなたのデータ、相手からはこう見えています。`)+M(kv>=0.05?'ここまで丸裸にされているのか……。':'思ったより、クセが出ているんだな……。')+C('だからこそ、傾向を少しずつずらしていきましょう。今季は読まれにくくなりますよ。'); break; }
    case 'anti': h+=C(`リハビリトレーナーの${nm}です。アンチエイジングのプログラムを組みました。食事・睡眠・リカバリー、全部見直しますよ。`)+M(age>33?`${age}歳、まだまだやれるところを見せたいんです。`:'まだ若いけど、今から備えておきたいんです。')+C(age>33?'年齢は数字にすぎません。体の時計を、ゆっくり進めていきましょう。':'いい心がけです。若いうちからの積み重ねが、10年後のあなたを支えますよ。'); break;
    case 'motion':{
      h+=C(`スポーツアナリストの${nm}です。モーショントラッキングで、あなたの動きを全身から解析します。`)+M('よろしくお願いします。');
      if(!st.done){
        h+=C(B?'スイングの軌道を見ると、別のタイプの打者にもなれそうです。どれを目指しますか？':P?'球の回転と腕の振りから、1球種を磨き上げましょう。どの変化球にしますか？':'打撃のタイプと、磨き上げる変化球を1つずつ選んでください。');
        if(hasBat()) h+=`<div class="cbch"><div class="hint" style="margin:2px 0">打者タイプ（今：${PEN.btype||'バランス'}）</div>${BTYPES.map(t=>`<button class="btn sm ${st.type===t?'on':''}" data-cbtype="${t}">${t}</button>`).join('')}${st.type?`<div class="hint">${BTYPE_INFO[st.type].me}</div>`:''}</div>`;
        if(!isBat()){ const L=(PEN.rep||[]).filter(t=>t!=='ストレート'); h+=`<div class="cbch"><div class="hint" style="margin:2px 0">磨き上げる変化球</div>${L.length?L.map(t=>`<button class="btn sm ${st.pitch===t?'on':''}" data-cbpitch="${t}">${t} Lv.${lvOf(t)}</button>`).join(''):'<span class="hint">変化球がありません</span>'}</div>`; }
        const ok=(!hasBat()||st.type)&&(isBat()||st.pitch||!(PEN.rep||[]).some(t=>t!=='ストレート'));
        h+=`<button class="btn main" data-cbgo="1" style="width:100%" ${ok?'':'disabled'}>これでお願いします</button>`; break; }
      h+=M(`${[st.type&&`「${st.type}」`,st.pitch].filter(Boolean).join('と、')}でお願いします。`)+C(`……解析完了。${st.type?`今季は「${st.type}」として打席に立ちましょう。`:''}${st.pitch?`${st.pitch}の名前の前に✨が付きます。打たれにくい特別な1球になりましたよ。`:''}`); break; }
    case 'joint': return cbJointTalk(D,st);
    case 'run': h+=C(`${TEAM[PEN.team].short}の走塁コーチ、${nm}だ。`)+(B?C('盗塁の半分は、スタートの一歩目で決まる。投手のクセの盗み方から叩き込むぞ。'):'')+(P?C(`${B?'投げるほうも見るぞ。':''}クイックと牽制を鍛える。走者に好き勝手はさせるな。`):'')+M('よろしくお願いします！'); break;
    case 'tokushu': h+=C(`${TEAM[PEN.team].short}の守備コーチ、${nm}だ。今日は特守。泥だらけになってもらうぞ！`)+M('は、はい……！')+C(B?'グラブさばきは嘘をつかない。今季のエラーは半分になるはずだ。':'投手も9人目の野手だ。フィールディングと、狙ったところに投げきる制球を徹底的に鍛える。'); break;
    case 'platoon': h+=C(`${TEAM[PEN.team].short}の打撃コーチ、${nm}だ。左右の苦手を消しに来た。`)+M(B?'同じ利き腕のピッチャー、どうも球の出どころが見づらくて……。':'反対の打席の打者が、どうも怖くて……。')+C(B?'目が慣れるまで打ち込むぞ。今季はどの投手にも、両打ちのつもりで立てばいい。':'内角の使い方を変えれば、反対の打席の打者も怖くない。'); break;
    case 'legend':{ h+=C(`……伝説の野球選手、${nm}だ。噂を聞いて来てみたが、いい目をしているな。`)+M('ほ、本物だ……！');
      const R=st.res||[]; h+=C(R.length?'お前がこれまで取りこぼしてきた覚醒を、わしが引き出してやろう。……フンッ！':'……ふむ。お前には、取りこぼした覚醒が見当たらんな。');
      if(R.length) h+=`<div class="pcardx">${R.map(r=>`✨ ${r.name}${r.ex?`（${r.ex}）`:''}${r.pts?` 持ち点+${r.pts}`:''}`).join('<br>')}</div>`+C('持ち点は、このあとのキャンプで振り分けるといい。若いの、期待しているぞ。'); break; }
    case 'cond': h+=C(`リハビリトレーナーの${nm}です。体の“衰え”は、手入れしだいで先送りできますよ。`)+M(age>=33?`${age}歳。まだまだ衰えたくないんです。`:'今のうちから準備しておきたいんです。')+C('関節の動きと、疲れの抜き方を作り直しましょう。それに、後半戦に崩れない体の使い方もね。'); break;
    case 'last':{ h+=C(`……ふふ、来たか。わしは${nm}。表の世界じゃ名乗れん医者だよ。`)+M('本当に、昔の体に戻れるんですか……？')+C('保証はせん。うまくいけば、全盛期の体がひと夏だけ戻る。しくじれば……まあ、覚悟はしておけ。');
      if(st.done) h+=st.ok?C(`……成功だ。${st.yr?`${st.yr}年目（${st.ag}歳）の`:''}全盛期の体だよ。夏が過ぎれば少しずつ元に戻るがな。`)+M('体が、軽い……！'):C('……ふむ。しくじったな。')+M('体が、重い……。')+C('だから言ったろう。全財産、確かに受け取ったよ。'); break; }
    case 'money': h+=C(`代理人の${nm}です。あなたの価値を、数字できちんと示しましょう。`)+M('お金の話は、どうも苦手で……。')+C(`だから私がいるんです。今の年俸は${yen(PEN.salary)}。次の契約更改、楽しみにしていてください。`); break;
    case 'house': h+=C(`不動産屋の${nm}です！ ご希望の条件で、いい物件が見つかりましたよ。`)+M('ついに寮を出るときが来たか……。')+C('こちらが鍵です。おめでとうございます！ 今日からここがあなたの城ですよ。'); break;
  }
  if(st.done&&st.eff) h+=id==='last'&&st.ok===false?`<div class="pcardx bad cbeff">💀 ${st.eff}</div>`:cbTag(st.eff);
  return h;
}
function cbBind(el,D,st){
  if(!D) return; const re=()=>{ renderPennant(); save(); };
  el.querySelectorAll('[data-cbteam]').forEach(b=>b.onclick=()=>{ cbDo(D,st,{team:b.dataset.cbteam}); re(); });
  el.querySelectorAll('[data-cbtype]').forEach(b=>b.onclick=()=>{ st.type=b.dataset.cbtype; re(); });
  el.querySelectorAll('[data-cbpitch]').forEach(b=>b.onclick=()=>{ st.pitch=b.dataset.cbpitch; re(); });
  el.querySelectorAll('[data-cbgo]').forEach(b=>b.onclick=()=>{ cbDo(D,st,{type:st.type,pitch:st.pitch}); re(); });
  el.querySelectorAll('[data-jt]').forEach(b=>b.onclick=()=>{ const id=b.dataset.jt, S=st.pick||(st.pick=[]), i=S.indexOf(id); if(i>=0) S.splice(i,1); else if(S.length<3){ const c=jtCands().find(x=>x.id===id); if(st.kind&&c&&c.kind!==st.kind) return; S.push(id); } if(!S.length) st.kind=null; else st.kind=jtCands().find(x=>x.id===S[0]).kind; re(); });
  el.querySelectorAll('[data-jtk]').forEach(b=>b.onclick=()=>{ st.view=b.dataset.jtk; re(); });
  el.querySelectorAll('[data-jtgo]').forEach(b=>b.onclick=()=>{ cbDo(D,st,{pick:(st.pick||[]).slice()}); re(); });
}
// 効果をつける
function cbDo(D,st,arg){
  if(st.done) return; const id=D.id, on=(PEN.cb&&PEN.cb.y===PEN.year?PEN.cb:(PEN.cb={y:PEN.year,on:{}})).on, k=posKind(), B=k!=='P', P=k!=='B';
  let eff='';
  switch(id){
    case 'scout': st.team=arg.team; on.scout={team:arg.team};
      eff=`${TEAM[arg.team].short}との試合だけ ${[B&&`${k==='W'?'打撃の':''}全能力+5`,P&&'球速+2km/h・コントロール+5・スタミナ+5'].filter(Boolean).join('・')}（今シーズン）`; break;
    case 'yoga':{
      const loss=(PEN.injLog||[]).reduce((t,x)=>t+(x.down||0),0), rec=PEN.injRec||0, rest=Math.max(0,loss-rec), amt=r1(rest/3);
      st.loss=rest; const d={abil:{},babil:{}};
      if(amt>0){
        if(PEN.abil&&!isBat()) for(const kk of ['velo','control','stamina']){ const cap=kk==='velo'?VELO_MAX:100, nv=r1(Math.min(cap,PEN.abil[kk]+amt)); d.abil[kk]=r1(nv-PEN.abil[kk]); PEN.abil[kk]=nv; }
        if(PEN.babil&&hasBat()) for(const kk of ['meet','power','speed','eye','def']){ const v=PEN.babil[kk]??50, nv=r1(Math.min(100,v+amt)); d.babil[kk]=r1(nv-v); PEN.babil[kk]=nv; }
      }
      on.yoga={amt,d};
      eff=amt>0?`ケガで下がった能力（合計−${r1(rest)}）の1/3を回復：全能力+${amt}（今シーズンだけ）・ケガの確率 半分（今シーズン）`:'ケガの確率 半分（今シーズン）<br><small>ケガで下がった能力はないので、回復するものはなかった</small>'; break; }
    case 'yosho': on.yosho={}; eff=[B&&`${k==='W'?'打撃：':''}得点圏で打撃アップ（空振り−10%・打球の質+0.05）`,P&&`${k==='W'?'投球：':''}得点圏にランナーがいても能力が下がらない`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'antei': on.antei={}; eff='スランプの発生確率 1/5（今シーズン）'; break;
    case 'nebari': on.nebari={}; eff=[B&&`${k==='W'?'打撃：':''}2ストライク後の空振り−15%・打球の質+0.04・カット成功+8%`,P&&`${k==='W'?'投球：':''}疲れの影響−20%・勝っている5回以降は球威アップ`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'stamina': on.stamina={}; eff=[B&&`${k==='W'?'打撃：':''}シーズン後半（72試合目から）全能力+5`,P&&`${k==='W'?'投球：':''}スタミナが減ったときの能力低下を35%緩和`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'data': on.data={}; eff=`相手からの研究（警戒度）が半分・${B&&!P?'配球の読みが半分':'配球の分析が効きにくい'}（今シーズン）`; break;
    case 'anti': on.anti={}; eff=`33歳を超えてからの衰えの倍率が半分${P?'・変化球が年齢で下がらない':''}（今シーズン終わりの査定）${(PEN.age||22)<=33?`<br><small>${PEN.age}歳の今は、まだ衰えの倍率はかかりません</small>`:''}`; break;
    case 'motion':{
      const m={}; if(arg.type&&hasBat()){ m.was=PEN.btype||'バランス'; m.type=arg.type; PEN.btype=arg.type; }
      if(arg.pitch&&!isBat()) m.pitch=arg.pitch;
      st.type=m.type; st.pitch=m.pitch; on.motion=m;
      eff=[m.type&&`打者タイプ「${m.type}」（${BTYPE_INFO[m.type].me}）`,m.pitch&&`✨${m.pitch}：打たれにくい（空振り+5%・打球の質−0.06）`].filter(Boolean).join('／')+'（今シーズン）'; break; }
    case 'joint': eff=cbJointApply(st,arg.pick); if(!eff) return; break;
    case 'run': on.run={}; eff=[B&&`${k==='W'?'打撃：':''}盗塁の成功率+10%・おまかせでも走る回数が増える`,P&&`${k==='W'?'投球：':''}盗塁を試みられるのが半分・成功率−15%`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'tokushu': on.tokushu={}; eff=[B&&`${k==='W'?'打撃：':''}守備+5・エラー半分`,P&&`${k==='W'?'投球：':''}コントロール+5・ピッチャーゴロ／ライナーが少し増える`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'platoon': on.platoon={}; eff=[B&&`${k==='W'?'打撃：':''}同じ利き腕の投手にも左右の有利（空振り−12%）`,P&&`${k==='W'?'投球：':''}反対の打席の打者にも左右の有利`].filter(Boolean).join('／')+'（今シーズン）'; break;
    case 'legend':{ const R=legendDo(); st.res=R; const pts=R.reduce((t,r)=>t+(r.pts||0),0); eff=R.length?`すり抜けた覚醒を発動：${R.map(r=>r.name).join('・')}${pts?`（キャンプの持ち点 +${pts}）`:''}`:'すり抜けた覚醒がなかった'; break; }
    case 'cond': on.cond={}; eff=`衰えの始まりを2年遅らせる（35歳・36歳・37歳）・36歳以上の後半戦のスランプがふつうの確率に（今シーズン）${PEN.declAge?`<br><small>もう${PEN.declAge}歳で衰えが始まっているので、衰えの始まりには効かない</small>`:''}`; break;
    case 'last':{ const r=lastDo(); on.last=r; st.ok=r.ok; st.yr=r.year; st.ag=r.age;
      eff=r.ok?`成功：前半戦は${r.year?`${r.year}年目（${r.age}歳）`:'全盛期'}の能力（${r.txt}）。後半戦は少しずつ下がり、レギュラーシーズン終了で元に戻る`:`失敗：${r.txt}（ずっと残る）`; break; }
    case 'money':{ const mm=Math.round((0.05+rnd()*0.05)*100)/100; on.money={mm}; eff=`次の年俸査定 +${Math.round(mm*100)}%（15億まで）・FAなら提示額+10%・契約年数が伸びやすい（今シーズン終わりの査定）`; break; }
    case 'house': PEN.house={y:PEN.year}; on.house={}; eff='持ち家：次の査定から寮費が引かれず、年俸を満額受け取れる（ずっと）'; break;
  }
  st.done=true; st.eff=eff;
  penNotice(`🏝 ${cbItem(id).name}：${eff.replace(/<[^>]+>/g,'')}`);
}
/* ---- 合同自主トレ ---- */
function jtFind(id){ for(const t of NPB){ const T=PEN.teams[t.id]; if(!T) continue; const f=(T.F||[]).find(x=>x.id===id); if(f) return {kind:'F',o:f,team:t.id}; const p=(T.P||[]).find(x=>x.pid===id); if(p) return {kind:'P',o:p,team:t.id}; } return null; }
function jtCands(){
  if(OFF_JT&&OFF_JT.pen===PEN&&OFF_JT.y===PEN.year&&OFF_JT.n===(PEN.jtLog||[]).length) return OFF_JT.list;
  const map=new Map(), add=(id,src)=>{ if(!id) return; const r=jtFind(id); if(!r) return; const e=map.get(id)||{id,kind:r.kind,team:r.team,src:[]}; if(!e.src.includes(src)) e.src.push(src); map.set(id,e); };
  const T=myT(); (T.F||[]).forEach(f=>add(f.id,'チーム')); (T.P||[]).forEach(p=>add(p.pid,'チーム'));
  const A=PEN.asMates; if(A&&A.y===PEN.year-1){ A.F.forEach(x=>add(x.id,'オールスター')); A.P.forEach(x=>add(x.id,'オールスター')); }
  const W=PEN.wbcMates; if(W&&W.y===PEN.year-1){ W.F.forEach(x=>add(x.id,'WBC')); W.P.forEach(x=>add(x.id,'WBC')); }
  const okK=k=>isTW()||(isBat()?k==='F':k==='P');
  const list=[...map.values()].filter(e=>okK(e.kind)).map(e=>{ const r=jtFind(e.id), o=r.o; const sc=(PEN.jtPerf&&PEN.jtPerf[e.id])||0;
    return {...e,name:e.kind==='F'?o.n:o.name,age:o.age,num:o.num,pos:e.kind==='F'?POS_JP[o.pos]||o.pos:'投手',sc,
      ab:e.kind==='F'?`ミ${Math.round(o.m)} パ${Math.round(o.p)} 速${Math.round(o.s)} 眼${Math.round(o.e)} 守${Math.round(o.d)}`:`${Math.round(o.velo)}km/h 制${Math.round(o.control)} ス${Math.round(o.stamina)}`}; })
    .sort((a,b)=>(b.src.length>1||b.src[0]!=='チーム')-(a.src.length>1||a.src[0]!=='チーム')||b.sc-a.sc);
  OFF_JT={pen:PEN,y:PEN.year,n:(PEN.jtLog||[]).length,list}; return list;
}
const JT_F={m:['meet','ミート'],p:['power','パワー'],s:['speed','走力'],e:['eye','選球眼'],d:['def','守備']};
const JT_P={velo:['velo','球速',147,6],control:['control','コントロール',50,12],stamina:['stamina','スタミナ',86,12]};
function cbJointTalk(D,st){
  let h='';
  if(!st.done){
    const L=jtCands(), view=isTW()?(st.kind||st.view||'P'):(isBat()?'F':'P'), S=st.pick||[];
    h+=meSay(`今年は一緒に自主トレをする選手を3人誘おう。${PEN.wbcMates&&PEN.wbcMates.y===PEN.year-1?'WBCで一緒だった仲間にも声をかけられるな。':''}`);
    h+=`<div class="pcardx"><div class="hint" style="margin:0 0 4px">3人選んでください（${S.length}／3）。★＝去年の成績（良いほど伸びる）</div>
      ${isTW()?`<div class="row" style="margin-bottom:4px">${[['P','投手と'],['F','野手と']].map(([k,l])=>`<button class="btn sm ${view===k?'on':''}" data-jtk="${k}" ${st.kind&&st.kind!==k?'disabled':''}>${l}</button>`).join('')}</div>`:''}
      <div class="jtl">${L.filter(c=>c.kind===view).map(c=>`<button class="jtc ${S.includes(c.id)?'on':''}" data-jt="${c.id}">${tchip(c.team)} <b>${c.name}</b> <small>${c.age}歳・${c.pos}　${'★'.repeat(1+Math.round(c.sc*4))}${c.src.filter(s=>s!=='チーム').map(s=>`<i class="jts">${s}</i>`).join('')}</small><br><small style="color:var(--mute)">${c.ab}</small></button>`).join('')}</div></div>
      <button class="btn main" data-jtgo="1" style="width:100%" ${S.length===3||(S.length&&S.length===L.filter(c=>c.kind===view).length)?'':'disabled'}>この3人と自主トレする</button>`;
    return h;
  }
  const ms=st.mates||[];
  if(ms[0]) h+=mateSay(ms[0],`${PEN.pname}、誘ってくれてありがとう！ 一緒にやろう。`);
  h+=meSay(`今年はみんなの${st.lab}を盗ませてもらうよ。よろしく！`);
  if(ms[1]) h+=mateSay(ms[1],`${st.lab}なら任せてくれ。コツを全部教えるよ。`);
  if(ms[2]) h+=mateSay(ms[2],`お互い、いいシーズンにしよう。こっちも勉強させてもらうよ！`);
  if(st.eff) h+=cbTag(st.eff);
  return h;
}
function cbJointApply(st,pick){
  const L=(pick||[]).map(jtFind).filter(Boolean); if(!L.length) return '';
  const kind=L[0].kind; let key, lab, g;
  const avgSc=L.reduce((t,r)=>t+((PEN.jtPerf&&PEN.jtPerf[kind==='F'?r.o.id:r.o.pid])||0),0)/L.length;
  g=r1((5+avgSc*5)/2);   // +2.5〜5（成績が良いほど大きい）
  if(kind==='F'){ let best=-1; for(const k in JT_F){ const v=L.reduce((t,r)=>t+(r.o[k]||0),0)/L.length; if(v>best){ best=v; key=k; } } lab=JT_F[key][1];
    const mk=JT_F[key][0], b0=PEN.babil[mk]??50; PEN.babil[mk]=r1(Math.min(100,b0+g)); st.mine=r1(PEN.babil[mk]-b0); L.forEach(r=>{ r.o[key]=Math.min(100,(r.o[key]||50)+g); }); }
  else { let best=-1e9; for(const k in JT_P){ const [,,m,sd]=JT_P[k]; const v=L.reduce((t,r)=>t+((r.o[k]||m)-m)/sd,0)/L.length; if(v>best){ best=v; key=k; } } lab=JT_P[key][1];
    const add=key==='velo'?Math.max(1,Math.round(g*0.4)):g; g=add;   /* 球速は +1〜2km/h */ const a0=PEN.abil[key]; PEN.abil[key]=r1(Math.min(key==='velo'?VELO_MAX:100,a0+add)); st.mine=r1(PEN.abil[key]-a0); L.forEach(r=>{ r.o[key]=Math.min(key==='velo'?VELO_MAX:100,(r.o[key]||0)+add); r.o.q=pitQ(r.o); }); }
  const names=L.map(r=>kind==='F'?r.o.n:r.o.name);
  st.mates=L.map(r=>({name:kind==='F'?r.o.n:r.o.name,team:r.team,num:r.o.num,kind}));
  st.lab=lab; st.kind=kind;
  [...new Set(L.map(r=>r.team))].forEach(t=>{ try{ rebuildTeam(t); }catch(e){} });
  PEN.jtLog=PEN.jtLog||[]; PEN.jtLog.push({y:PEN.year,lab,g,unit:kind==='P'&&key==='velo'?'km/h':'',names});
  PEN.cb.on.joint={lab,g,names};
  return `${lab} +${g}${kind==='P'&&key==='velo'?'km/h':''}（自分と${names.join('・')}）・ずっと残る${st.mine<g?`<br><small>自分は上限に近いため +${st.mine}</small>`:''}`;
}
// 去年の成績から合同自主トレの伸び（0〜1）
function jtPerfMap(cs){
  const m={}; for(const id in cs){ const s=cs[id]; if(!s) continue; let v=0;
    if(s.pa!=null||s.ab!=null){ const ab=s.ab||0; if(ab>=30) v=clamp(((s.h/ab-0.23)/0.09)*0.6+((s.hr||0)/30)*0.4,0,1)*Math.min(1,ab/300); }
    else { const o=s.outs||0; if(o>=30) v=clamp((4.3-s.er*27/o)/2.3+((s.sv||0)+(s.hld||0))/80,0,1)*Math.min(1,o/240+((s.g||0)>=40?0.4:0)); }
    if(v>0) m[id]=Math.round(v*100)/100; }
  return m;
}
/* ---- 自分の情報：所持金と今季の効果 ---- */
function cbList(){
  const o=cbAct(), L=[]; if(!o) return L;
  for(const id in o){ if(id==='house') continue; const it=cbItem(id); if(!it) continue; const v=o[id]; let t='';
    switch(id){
      case 'scout': t=`${TEAM[v.team].short}との試合だけ ${hasBat()?`${isTW()?'打撃の':''}全能力+5`:''}${hasBat()&&!isBat()?'・':''}${!isBat()?'球速+2km/h・コントロール+5・スタミナ+5':''}`; break;
      case 'yoga': t=`${v.amt?`ケガで下がった能力を回復：全能力+${v.amt}（シーズン終了で元に戻る）・`:''}ケガの確率 ${r3(injRate()).toFixed(3)}%（半分）`; break;
      case 'yosho': t=[hasBat()&&'得点圏で打撃アップ（空振り−10%・打球の質+0.05）',!isBat()&&'得点圏でも能力ダウンなし'].filter(Boolean).join('／'); break;
      case 'antei': t=`スランプの発生確率 ${Math.round(slumpP()*1000)/10}%（1/5）`; break;
      case 'nebari': t=[hasBat()&&'2ストライク後の空振り−15%・打球の質+0.04・カット+8%',!isBat()&&'疲れの影響−20%・勝っている5回以降は球威アップ'].filter(Boolean).join('／'); break;
      case 'stamina': t=[hasBat()&&`後半戦（72試合目から）全能力+5${PEN.day>=71?'（発動中）':''}`,!isBat()&&'スタミナが減ったときの能力低下−35%'].filter(Boolean).join('／'); break;
      case 'data': { const kv=Math.max(isBat()?0:keikai(false),hasBat()?keikai(true):0); t=`警戒度が半分（今：${keikLabel(kv)}）・配球の読み・分析が効きにくい`; break; }
      case 'anti': t=`33歳を超えてからの衰えの倍率が半分${!isBat()?'・変化球が年齢で下がらない':''}（今季終わりの査定）`; break;
      case 'motion': t=[v.type&&`打者タイプ「${v.type}」`,v.pitch&&`✨${v.pitch}が打たれにくい（空振り+5%・打球の質−0.06）`].filter(Boolean).join('／'); break;
      case 'joint': t=`${v.lab} +${v.g}（${v.names.join('・')}と）※ずっと残る`; break;
      case 'money': t=`次の年俸査定 +${Math.round(v.mm*100)}%・FAなら提示額+10%`; break;
    }
    L.push({name:it.name,coach:COACH_KIND_JP[it.coach]||'他選手',t});
  }
  return L;
}
function cbCardHTML(){
  if(!PEN) return ''; const L=cbList(), J=(PEN.jtLog||[]);
  return `<div class="sh3">💰 所持金・コーチの効果</div><div class="hint" style="margin:0 0 4px;color:var(--ink)">所持金 <b>${yen(PEN.money||0)}</b>　<small style="color:var(--mute)">${PEN.house?'🏠 持ち家（年俸は満額）':'🏢 寮生活（年俸の半分が寮費）'}</small></div>
    ${L.length?`<div class="cbbuf">${L.map(x=>`<div><b>${x.name}</b> <small>（${x.coach}）</small><br>${x.t}</div>`).join('')}<div class="hint" style="margin:2px 0 0">効果は今シーズンの終わりまで（合同自主トレの能力アップはずっと）</div></div>`:`<div class="hint" style="margin:0 0 4px">今シーズンのコーチの効果はありません</div>`}
    ${J.length?`<div class="hint" style="margin:0 0 4px">🤝 合同自主トレ：${J.map(x=>`${x.y}年目 ${x.lab}+${x.g}${x.unit||''}`).join('・')}</div>`:''}`;
}
