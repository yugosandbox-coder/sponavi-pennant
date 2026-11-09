/* ================================================================
   怪我：出場した試合の終わりに、年齢に応じた確率で起きる
   ・18歳 0.01%、1歳ごとに+0.01%、30歳からは+0.05%ずつ、40歳からは+10%ずつ
   ・キャンプの「ストレッチ」で0.025%ずつ下げられる（累積）
   ・内訳：怪我70%（1週間・全能力−1）、打撲15%（2週間・−2）、骨折10%（1か月・−5）、靭帯損傷5%（今季と来季は出場不可・−15）
   ================================================================ */
const INJ_TYPES=[{name:'怪我',w:0.70,games:7,down:1,txt:'1週間'},{name:'打撲',w:0.15,games:14,down:2,txt:'2週間'},{name:'骨折',w:0.10,games:30,down:5,txt:'1か月'},{name:'靭帯損傷',w:0.05,games:-1,down:15,txt:'今季と来季'}];
const r3=v=>Math.round(v*1000)/1000;
function injRateAt(age,red){ let r=0.01; for(let a=19;a<=(age||22);a++) r+= a>=40?10 : a>=30?0.05 : 0.01; return Math.max(0,r3(r-(red||0))); }   // %
const injRate=()=>PEN?r3(injRateAt(PEN.age,PEN.injRed)*(typeof cbOn==='function'&&cbOn('yoga')?0.5:1)*(typeof fatInjMul==='function'?fatInjMul():1)):0;   // ヨガ教室：半分。疲労が溜まるほど起きやすい
const injured=()=>!!(PEN&&PEN.injury&&PEN.injury.y===PEN.year&&PEN.day<PEN.injury.untilDay);
const injLeft=()=>injured()?PEN.injury.untilDay-PEN.day:0;
function injApplyDown(n){
  const keys=['velo','control','stamina'], bkeys=['meet','power','speed','eye','def'];
  if(PEN.abil&&!isBat()) for(const k of keys) PEN.abil[k]=r1(Math.max(k==='velo'?110:1,PEN.abil[k]-n));
  if(PEN.babil&&(isBat()||isTW())) for(const k of bkeys) PEN.babil[k]=r1(Math.max(1,(PEN.babil[k]??50)-n));
}
// 出場した試合のあとに呼ぶ
function injuryRoll(){
  if(!PEN||PEN.released||injured()) return false;
  if(rnd()*100>=injRate()) return false;
  const sv=typeof fatInjSev==='function'?fatInjSev():1, TY=INJ_TYPES.map(e=>({...e,w:e.w*(e.games>=30||e.games<0?sv:1)})), sw=TY.reduce((a,e)=>a+e.w,0);   // 疲労が溜まっているほど骨折・靭帯損傷が出やすい
  let x=rnd()*sw, t=TY[0]; for(const e of TY){ if(x<e.w){ t=e; break; } x-=e.w; }
  const lig=t.games<0;
  PEN.injury={name:t.name,y:PEN.year,day:PEN.day,untilDay:lig?SEASON_GAMES:Math.min(SEASON_GAMES,PEN.day+t.games),down:t.down,nextSeasonOut:lig,txt:t.txt};
  injApplyDown(t.down);
  PEN.injLog=PEN.injLog||[]; PEN.injLog.push({y:PEN.year,age:PEN.age,name:t.name,down:t.down});
  penNotice(`🩹 ${t.name}！ ${lig?'今シーズンと来シーズンは出場できません':`${t.txt}（${t.games}試合）出場できません`}。全能力−${t.down}`);
  if(PEN.pending&&!PEN.pending.started) PEN.pending=null;
  return true;
}
// 日付が進んだあと：回復チェック
function injuryTick(){
  const I=PEN&&PEN.injury; if(!I) return;
  if(I.y===PEN.year&&PEN.day>=I.untilDay&&!I.nextSeasonOut){ penNotice(`🩹 ${I.name}から復帰しました`); PEN.injury=null; }
}
// シーズンの切り替わり（seasonRollover の年を進めたあとに呼ぶ）
function injuryRollover(){
  const I=PEN&&PEN.injury; if(!I) return;
  if(I.nextSeasonOut&&I.y===PEN.year-1){ PEN.injury={...I,y:PEN.year,day:0,untilDay:SEASON_GAMES,nextSeasonOut:false,carried:true}; penNotice(`🩹 ${I.name}のため、今シーズンは全休です`); }
  else PEN.injury=null;
}
function injuryHTML(){
  if(!PEN) return '';
  if(injured()){ const I=PEN.injury; return `<div class="pcardx hi" style="border-color:#c0392b"><b>🩹 ${I.name}で離脱中</b>　${I.untilDay>=SEASON_GAMES?(I.carried?'今シーズンは全休':'今シーズンは出場できません'):`あと${injLeft()}試合`}<div class="hint">離脱中も試合は進みます（出場なし）。ケガ率 ${injRate()}%／試合</div></div>`; }
  return '';
}

/* ================================================================
   疲労（0〜100）と回復力（0〜100）：プレイヤーもCPUも
   ・試合に出ると溜まる（野手：打席・守備位置。指名打者は×0.85／投手：球数・連投）。二刀流は先発の翌日は指名打者で出ず、指名打者の日は×0.5。年齢で溜まりやすくなる（24歳まで×0.95 → 30歳×1.0 → 35歳×1.12 → 40歳×1.32）
     衰えが始まるとさらに溜まりやすい（1年目×1.06・3年目×1.18・5年目×1.3）
   ・毎日少しずつ回復：(1＋疲労の0.5%)×回復力の倍率（回復力50で×0.9・65で×1.6・80で×2.65・90で×3.5・100で×4.2）。出なかった日は1.5倍
   ・オールスター・ポストシーズン・WBC：出場した日は普通の試合と同じように溜まり、出ない日は休みの日と同じだけ回復（オールスターは4日・ポストシーズンは自分のリーグのCSと日本シリーズの試合の日・WBCは日本の試合の日）。ポストシーズンも疲れすぎていれば先発回避・中継ぎは休み
   ・目安（外野のスタメン級）：回復力50で年70試合前後、80で1年はほぼフル出場（続けると少しずつ減る）、90〜100で毎年フル出場
   ・オフに抜ける量：23＋6.5×回復の速さ（回復力50で29・80で40・100で50。31歳から1歳ごとに−8%、最低3）。残りは翌シーズンに持ち越し
   ・溜まるとスランプ・ケガが起きやすく（重く）なり、投手は試合の始めのスタミナが減る。85以上（限界）は能力も下がる
   ・監督は性格に応じて休ませる（休養日・併用・途中交代・先発回避・中継ぎの連投制限）。自分から休養を申し出ることもできる（評価が少し下がる）
   ================================================================ */
const FAT_STAGE=[[85,'限界','#e5534b'],[70,'疲労','#ff8c42'],[50,'疲れ気味','#f5c542'],[30,'普通','#9ad48a'],[0,'元気','#3fb96b']];
const fatStage=F=>FAT_STAGE.find(x=>(F||0)>=x[0]);
const FAT_AGE=a=>a<=24?0.95:a<=30?0.95+(a-24)*0.05/6:a<=35?1+(a-30)*0.024:1.12+(a-35)*0.04;   // 年齢で溜まりやすくなる（24歳まで×0.95 → 30歳×1.0 → 35歳×1.12 → 40歳×1.32）
const REC_K=[[0,0.15],[25,0.45],[50,0.9],[65,1.6],[80,2.65],[90,3.5],[100,4.2]];   // 回復力 → 回復の速さの倍率（この間はなめらかにつなぐ）
const recK=r=>{ r=clamp(r??40,0,100); let i=1; while(i<REC_K.length-1&&r>REC_K[i][0]) i++; const [x0,y0]=REC_K[i-1],[x1,y1]=REC_K[i]; return y0+(y1-y0)*(r-x0)/(x1-x0); };
const fatDecl=(age,decl)=>decl?1+0.06*Math.max(1,(age||22)-decl+1):1;   // 衰えが始まると溜まりやすい（1年目×1.06 → 3年目×1.18 → 5年目×1.3）
const FAT_FLD={C:1.6,SS:1.0,'2B':1.0,'3B':0.8,LF:0.7,CF:0.7,RF:0.7,OF:0.7,'1B':0.6,DH:0};   // 守備の負担
const FAT_GB=1.3, FAT_GP=1.4;   // 溜まり方の強さ（野手・投手）
const FAT_DH=0.85, FAT_DH_TW=0.5;   // 指名打者は守備がない分少し軽い（×0.85）。二刀流の指名打者はさらに軽く半分（×0.5）
const fatBat=(pa,pos,part)=>(1.4+pa*0.3+(FAT_FLD[pos]??0.7)*(part??1))*FAT_GB*(pos==='DH'?FAT_DH:1);   // 野手のスタメン（打席・守備）
const fatTwDH=pa=>fatBat(pa,'DH',1)*FAT_DH_TW/FAT_DH;   // 二刀流の指名打者の日
const fatSub=(pa,fld)=>(0.4+pa*0.3+(fld||0)*0.3)*FAT_GB;                           // 途中出場・代打・代走
const fatPit=(pitches,streak)=>(pitches*0.2+1+(streak>=2?6:streak===1?3:0))*FAT_GP;   // 投手（球数。連投：2日目+3・3日目から+6）
const fatRecDay=F=>1+0.005*(F||0);   // 1日の回復（回復力の倍率をかける。出なかった日は1.5倍）
const fatOffCut=(age,rec)=>Math.max(3,(23+6.5*recK(rec))*(1-0.08*Math.max(0,(age||22)-30)));   // オフに抜ける量（値。疲労65で前の割合とほぼ同じ）   // オフのあとに残る割合（抜ける割合：回復力50で4割強・80で6割・100で8割弱。31歳から1歳ごとに−8%）
// 監督が休ませる目安（性格で変わる）：休養重視・総力戦は早め、少数精鋭・実力主義は遅め。若手優先はベテランを早めに、ベテラン優先は遅めに
function fatThr(m,age){ let t=({six:72,seven:65,eight:58,ten:56})[m&&m.r]??65; if(m&&m.a==='merit') t+=3; if(m&&m.a==='young'&&age>=30) t-=5; if(m&&m.a==='vet'&&age>=30) t+=5; return t; }
const relCap=m=>({six:4,seven:3,eight:2,ten:2})[m&&m.r]??3;   // 中継ぎの連投の上限
const FAT_SUB=10, FAT_SUB_LO=5, FAT_SP=12;   // 目安−5から途中交代（半分くらい）・目安＋12で先発回避
// ---- 自分
const myFat=()=>PEN?(PEN.fat||0):0;
const myRecov=()=>PEN?(PEN.recov??40):40;
const myFatThr=()=>fatThr(myMgr(),PEN.age||22);
const fatGainMul=()=>FAT_AGE(PEN.age||22)*fatDecl(PEN.age,PEN.declAge)*(typeof cbOn==='function'&&cbOn('cond')?0.8:1);   // コンディショニング中は溜まり方−20%
function fatMigrate(){
  if(!PEN) return;
  if(PEN.recov==null){ PEN.recov=r1(clamp(25+((PEN.age||18)-18)*2,25,50)); PEN.recov0=PEN.recov; }
  if(PEN.fat==null) PEN.fat=0;
  const re=PEN.recV!==5; PEN.recV=5;   // v195：CPUの回復力の決め方を変えたので作り直す
  if(PEN.teams) for(const id in PEN.teams){ const T=PEN.teams[id]; (T.F||[]).forEach(f=>{ if(f.rec==null||re) f.rec=cpuRecGen(f.age); if(f.fat==null) f.fat=0; }); (T.P||[]).forEach(p=>{ if(p&&!p.isMe){ if(p.rec==null||re) p.rec=cpuRecGen(p.age,true); if(p.fat==null) p.fat=0; } }); }
}
// 試合のあと（recordMyGame から）：出場した分の疲労。成績の増えた分（球数・打席）から決める。出場したら true
function fatAfterGame(me){
  if(!PEN||PEN.released) return false; const ss=PEN.ss||{}, bs=isBat()?ss:isTW()?(PEN.bss||{}):null;
  const pNow=ss.pitches||0, aNow=bs?bs.pa||0:0, mid=PEN.day>2&&!PEN.fatSnap;   // 前のセーブ（シーズン途中）は今の成績から数える
  const S=PEN.fatSnap&&PEN.fatSnap.y===PEN.year?PEN.fatSnap:(PEN.fatSnap={y:PEN.year,pitches:mid?pNow:0,pa:mid?aNow:0});
  const dP=Math.max(0,pNow-S.pitches), dA=Math.max(0,aNow-S.pa); S.pitches=pNow; S.pa=aNow;
  if(!me) return false;
  const k=me.kind, pos=PEN.slot||PEN.bpos||'OF'; let g=0, played=false;
  const pitched=!isBat()&&(dP>0||(me.outs!=null&&(me.outs>0||me.runs>0)))&&k!=='oddB'&&k!=='bat'&&k!=='pinch';
  if(pitched){ const st=PEN.lastPDay===PEN.day-1?(PEN.pStreak||1):0; PEN.pStreak=st+1; PEN.lastPDay=PEN.day; if(k==='start') PEN.twStartDay=PEN.day; /* 二刀流：先発の翌日は指名打者で出ない */ g+=fatPit(dP||Math.round((me.outs||0)*5.3+6),st); played=true; }
  if(isBat()){
    if(k==='start'||k==='bat'){ g+=fatBat(dA,pos,/守備固めと交代|疲労で交代/.test(me.note||'')?0.75:1); played=true; }
    else if(dA>0||k==='pinch'||k==='runner'||k==='defsub'||k==='oddP'){ g+=fatSub(dA,k==='defsub'?(FAT_FLD[pos]??0.7):0); played=true; }
  }else if(isTW()&&dA>0){ g+=pitched?dA*0.3:fatTwDH(dA); played=true; }   // 二刀流：先発の日は打席の分だけ足す・指名打者の日は半分
  if(g>0) PEN.fat=r1(clamp((PEN.fat||0)+g*fatGainMul(),0,100));
  return played;
}
// 毎日（日付が進んだあと）：回復。出なかった日は1.5倍。温泉旅行中は1.2倍。オールスター休み（第75試合のあと）で−15
function fatDaily(played){
  if(!PEN) return; const F=PEN.fat||0;
  let r=fatRecDay(F)*recK(myRecov())*(played?1:1.5)*(typeof cbOn==='function'&&cbOn('onsen')?1.2:1);
  PEN.fat=r1(Math.max(0,F-r));
}
// 大会（オールスター・ポストシーズン・WBC）の1日：出場したら普通の試合と同じように溜まり（出た日の回復）、出なければ休みの日と同じだけ回復
//   kind：出番（start・relief・closer・bat・pinch…）、st：その試合の自分の成績（球数・打席。スキップした試合はなし＝目安）
function fatEventGain(kind,st,opt){
  if(!PEN||!kind) return 0; const bat=kind==='bat'||kind==='pinch'||kind==='runner'||kind==='defsub', pos=(opt&&opt.slot)||PEN.slot||PEN.bpos||'OF';
  if(!bat){ const pc=st&&st.pitches!=null?st.pitches:kind==='start'?(opt&&opt.as?45:95):18; return fatPit(pc,0); }
  if(kind==='bat'){ const pa=st&&st.pa!=null?st.pa:4; return isTW()?fatTwDH(pa):fatBat(pa,pos,1); }
  return fatSub(st&&st.pa!=null?st.pa:1,0);
}
function fatEventDay(g){ if(!PEN||PEN.released) return; if(g>0) PEN.fat=r1(clamp((PEN.fat||0)+g*fatGainMul(),0,100)); fatDaily(g>0); }
const fatEventGameG=kind=>{ if(typeof G==='undefined'||!G||!G.st) return fatEventGain(kind,null); const b=G.bat&&!G.tw; return fatEventGain(b?(kind==='pinch'?'pinch':'bat'):kind,b?{pa:G.st.pa}:{pitches:G.st.pitches},{as:!!(G.pen&&G.pen.allstar),slot:G.slot}); };   // 実際に出た大会の試合
// オフ（年俸査定のあと・年齢が上がる前）：抜けきらなかった分は持ち越し
function fatOffseason(){ if(!PEN) return; const F=PEN.fat||0; PEN.fatEnd=F; PEN.fat=r1(Math.max(0,F-fatOffCut(PEN.age,myRecov()))); PEN.fatNext=PEN.fat; PEN.fatSnap=null; PEN.pStreak=0; PEN.lastPDay=-9; }
// 影響
const fatSlumpMul=()=>1+myFat()/40;                               // スランプの起きやすさ
const fatSlumpLen=()=>Math.min(10,5+Math.floor(myFat()/20));      // スランプの長さ（試合）
const fatInjMul=()=>1+Math.pow(myFat()/60,2);                     // ケガの起きやすさ
const fatInjSev=()=>myFat()>=80?2:myFat()>=60?1.5:1;              // 骨折・靭帯損傷の出やすさ
const fatStaMul=F=>Math.max(0.5,1-Math.max(0,(F??myFat())-30)*0.004);   // 試合の始めのスタミナ（30から減る。50で−8%・70で−16%・85で−22%）
const FAT_LIM=85, FAT_LIM_DOWN=3;                                 // 限界：能力ダウン
function fatAbil(a){ if(!a||!PEN) return a; const F=myFat(); let r={...a,stamina:Math.max(1,r1(a.stamina*fatStaMul(F)))};
  if(F>=FAT_LIM) r={...r,velo:Math.max(110,r.velo-2),control:Math.max(0,r.control-FAT_LIM_DOWN),stamina:Math.max(1,r.stamina-FAT_LIM_DOWN)};
  return r; }
function fatBab(a){ if(!a||!PEN||myFat()<FAT_LIM) return a; const r={...a}; for(const k of ['meet','power','speed','eye','def']) if(r[k]!=null) r[k]=Math.max(0,r[k]-FAT_LIM_DOWN); return r; }
// ---- 監督の休養起用（自分）
function fatSay(key,text,head){ PEN.fatSaid=PEN.fatSaid||{}; if(PEN.fatSaid[key]===PEN.day) return; PEN.fatSaid[key]=PEN.day; if(typeof mgrSay==='function') mgrSay(text,head||'休養'); }
// 野手のスタメン・二刀流の指名打者：今日は休ませるか（申し出・疲労・34歳からの併用）
//   監督が疲労で休ませるときは、休むか強行出場するかを選べる（PEN.prompt＝fatRest）
function fatRestToday(){
  if(!PEN) return false; const F=myFat(), t=myFatThr(), A=PEN.fatAsk;
  if(A&&A.y===PEN.year&&A.day===PEN.day){ if(A.go) return false; PEN.fatRestDay=PEN.day; return true; }   // 今日はもう決めた（強行出場／休養）
  if(PEN.restReq){ PEN.restReq=false; fatSay('req','わかった。今日は休んでいい。しっかり体を休めておけ。'); PEN.fatRestDay=PEN.day; return true; }
  const why=F>=t?'rest':(PEN.age||22)>=34&&F>=t-10&&rnd()<0.35?'platoon':null; if(!why) return false;
  PEN.fatAsk={y:PEN.year,day:PEN.day,why,F:Math.round(F),go:false}; PEN.fatRestDay=PEN.day;
  if(!PEN.prompt) PEN.prompt={kind:'fatRest'};
  return true;
}
const fatRestText=A=>A&&A.why==='platoon'?`今日はほかの選手を使う。${PEN.age}歳だ、疲れを溜めないように併用でいくぞ。`:`疲れが溜まっているな（疲労${A?A.F:Math.round(myFat())}）。今日はスタメンから外す。休め。`;
function fatRestAnswer(go){
  if(!PEN||!PEN.prompt||PEN.prompt.kind!=='fatRest') return; PEN.prompt=null; const A=PEN.fatAsk;
  if(A&&A.y===PEN.year&&A.day===PEN.day) A.go=!!go;
  if(go){ PEN.fatRestDay=-1; PEN.fatForce=(PEN.fatForce||0)+1; penNotice(`💪 監督に直訴して強行出場（疲労${Math.round(myFat())}）`); }
  else penNotice(A&&A.why==='platoon'?'🛌 今日は併用でベンチスタート':'🛌 監督の判断で、今日は休養');
  if(typeof renderPennant==='function') renderPennant(); if(typeof save==='function') save();
}
const fatSubToday=()=>myFat()>=myFatThr()-FAT_SUB_LO&&rnd()<0.35;   // 疲れてきたら（休ませる目安の5手前から）半分くらいの試合で途中交代（代打・代走・守備固め）
// 中継ぎ：今日はベンチに入れない（申し出・疲労・連投の上限）
function fatRelBlock(){
  if(!PEN) return false;
  if(PEN.restReq){ PEN.restReq=false; fatSay('req','わかった。今日はブルペンに入らなくていい。'); return true; }
  if(myFat()>=myFatThr()) return true;
  if(PEN.lastPDay===PEN.day-1&&(PEN.pStreak||0)>=relCap(myMgr())) return true;
  return false;
}
// ローテーション：先発を回避する投手（自分：申し出・疲労。CPU：疲労・限界で離脱中）
function fatSpSkip(T,id){
  if(id==='ME'){ const sk=!!PEN.restReq||myFat()>=myFatThr()+FAT_SP; if(sk) T.meSkip=PEN.day; return sk; }
  const p=(T.P||[]).find(x=>x.pid===id); if(!p) return false;
  return (p.out||0)>PEN.day||(p.fat||0)>=fatThr(T.mgr,p.age)+FAT_SP;
}
// 自分から休養を申し出る（評価が少し下がる）
function fatRequest(){
  if(!PEN||PEN.restReq) return; PEN.restReq=true; PEN.ss.tPen=r1((PEN.ss.tPen||0)+0.5);
  penNotice(`🛌 監督に休養を申し出た（次の${isBat()?'試合はスタメンを外れる':isStarter(PEN.role)?'先発は回避':'試合はブルペンに入らない'}。評価が少し下がる）`);
  if(typeof renderPennant==='function') renderPennant(); if(typeof save==='function') save();
}
// ---- CPU選手
// CPUの回復力：プロのレギュラーが年120〜135試合（先発22〜25回）出られるくらい。18歳36 → 26歳68 → 30歳76（±12。投手は+8）、衰えると下がる
const CPU_REC=a=>a<=26?36+(Math.max(18,a)-18)*4:a<=30?68+(a-26)*2:76-Math.max(0,a-32)*3;
function cpuRecGen(age,isP){ return Math.round(clamp(CPU_REC(age)+(isP?8:0)+(rnd()-.5)*24,5,100)*10)/10; }   // 投手は+8
function cpuRecAge(x){ const a=x.age; if(x.decl) x.rec=r1(Math.max(1,(x.rec??40)-(1.5+0.5*(a-x.decl))*(0.5+rnd()))); else if(a<=26) x.rec=r1(Math.min(100,(x.rec??40)+3+rnd()*2)); else if(a<=30) x.rec=r1(Math.min(100,(x.rec??40)+1+rnd()*2)); }
// CPU：疲労で成績が少し落ちる（70から。打者はヒットの確率、投手は試合の始めのスタミナ）
const cpuFatPen=F=>F>=FAT_LIM?0.04:0;   // 限界だけ少し打てなくなる（ふだんは休養で調整）
// 中継ぎ：今日は使わない（疲労・連投・離脱中）
const cpuPTired=(p,T)=>!!p&&!p.isMe&&((p.out||0)>PEN.day||(p.fat||0)>=fatThr(T&&T.mgr,p.age)||(p.lastPDay===PEN.day-1&&(p.pStreak||0)>=relCap(T&&T.mgr)));
// 毎日（日付が進んだあと）：試合で増えた成績から疲労を足し、回復させ、明日の休養（スタメンの入れ替え）を決める
function cpuFatDaily(){
  if(!PEN||!PEN.teams||!PEN.cs) return; const C=PEN.cs, d=PEN.day, Y=PEN.year, AS=d===(typeof AS_DAY!=='undefined'?AS_DAY:75);
  const asRest=(F,rec)=>{ for(let i=0;i<4;i++) F=Math.max(0,F-fatRecDay(F)*recK(rec)*1.5); return F; };   // オールスター休み：4日（出ない日と同じ回復）
  for(const t of NPB){ const T=PEN.teams[t.id]; if(!T) continue;
    if(T.lineupBase){ T.lineup=T.lineupBase; delete T.lineupBase; }   // きのうの入れ替えを戻す
    const L=T.lineup||[], slot={}; L.forEach((b,i)=>{ if(b&&b.fid) slot[b.fid]=(T.lpos||[])[i]; });
    for(const f of T.F||[]){ const c=C[f.id]||{pa:0}, s=f.fs&&f.fs.y===Y?f.fs:(f.fs={y:Y,pa:c.pa||0});
      const dA=Math.max(0,(c.pa||0)-s.pa); s.pa=c.pa||0; let F=f.fat||0;
      if(dA>0) F+=(dA>=3?fatBat(dA,slot[f.id]||f.pos,1):fatSub(dA,0))*FAT_AGE(f.age)*fatDecl(f.age,f.decl);
      F=Math.max(0,F-fatRecDay(F)*recK(f.rec)*(dA>0?1:1.5)); if(AS) F=asRest(F,f.rec); f.fat=r1(Math.min(100,F));
      if(f.fat>=FAT_LIM&&!((f.out||0)>d)&&rnd()<0.5) f.out=d+ri(3,7);   // 限界：数試合いなくなる
    }
    for(const p of T.P||[]){ if(!p||p.isMe||!p.pid) continue; const c=C[p.pid]||{g:0,outs:0}, s=p.fs&&p.fs.y===Y?p.fs:(p.fs={y:Y,g:c.g||0,outs:c.outs||0});
      const dG=Math.max(0,(c.g||0)-s.g), dO=Math.max(0,(c.outs||0)-s.outs); s.g=c.g||0; s.outs=c.outs||0; let F=p.fat||0;
      if(dG>0){ const st=p.lastPDay===d-2?(p.pStreak||1):0; p.pStreak=st+1; p.lastPDay=d-1; F+=fatPit(Math.round(dO*5.3+6),st)*FAT_AGE(p.age)*fatDecl(p.age,p.decl); }
      F=Math.max(0,F-fatRecDay(F)*recK(p.rec)*(dG>0?1:1.5)); if(AS) F=asRest(F,p.rec); p.fat=r1(Math.min(100,F));
      if(p.fat>=FAT_LIM&&!((p.out||0)>d)&&rnd()<0.5) p.out=d+ri(3,7);
    }
    // 明日のスタメン：疲れた選手（目安以上・34歳からは目安−10で35%）・離脱中の選手を控えと入れ替える（自分は入れ替えない）
    const inL=new Set(L.map(b=>b&&b.fid).filter(Boolean)), m=T.mgr, by={}; (T.F||[]).forEach(f=>by[f.id]=f);
    let NL=null;
    L.forEach((b,i)=>{ if(!b||b.isMe||!b.fid) return; const f=by[b.fid]; if(!f) return; const th=fatThr(m,f.age);
      b.fp=cpuFatPen(f.fat||0);
      const rest=(f.out||0)>d||(f.fat||0)>=th||(f.age>=34&&(f.fat||0)>=th-10&&rnd()<0.35); if(!rest) return;
      const pos=(T.lpos||[])[i]||f.pos, cand=(T.F||[]).filter(x=>!inL.has(x.id)&&!((x.out||0)>d)&&(x.fat||0)<fatThr(m,x.age)).sort((a,b2)=>((b2.pos===pos?15:0)+hitScore(b2))-((a.pos===pos?15:0)+hitScore(a)))[0];
      if(!cand) return; inL.add(cand.id); NL=NL||L.slice(); NL[i]=serB(toBatter(cand,i+1)); NL[i].fp=cpuFatPen(cand.fat||0); });
    if(NL){ T.lineupBase=L; T.lineup=NL; }
  }
}
// CPUのオフ：抜けきらなかった分は持ち越し（rosterNewSeason で年齢が上がる前に）
function cpuFatOffseason(){ if(!PEN||!PEN.teams) return; for(const id in PEN.teams){ const T=PEN.teams[id]; if(T.lineupBase){ T.lineup=T.lineupBase; delete T.lineupBase; }
  (T.F||[]).forEach(f=>{ f.fat=r1(Math.max(0,(f.fat||0)-fatOffCut(f.age,f.rec))); f.fs=null; f.out=0; }); (T.P||[]).forEach(p=>{ if(p&&!p.isMe){ p.fat=r1(Math.max(0,(p.fat||0)-fatOffCut(p.age,p.rec))); p.fs=null; p.out=0; p.pStreak=0; } }); } }
// ---- 表示
function fatBarHTML(F,small){ const s=fatStage(F); return `<span class="fatb${small?' sm':''}"><i><b style="width:${Math.min(100,F||0)}%;background:${s[2]}"></b></i><em style="color:${s[2]}">${Math.round(F||0)}</em><small>${s[1]}</small></span>`; }
