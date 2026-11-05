/* ================================================================
   怪我：出場した試合の終わりに、年齢に応じた確率で起きる
   ・18歳 0.01%、1歳ごとに+0.01%、30歳からは+0.05%ずつ、40歳からは+10%ずつ
   ・キャンプの「ストレッチ」で0.025%ずつ下げられる（累積）
   ・内訳：怪我70%（1週間・全能力−1）、打撲15%（2週間・−2）、骨折10%（1か月・−5）、靭帯損傷5%（今季と来季は出場不可・−15）
   ================================================================ */
const INJ_TYPES=[{name:'怪我',w:0.70,games:7,down:1,txt:'1週間'},{name:'打撲',w:0.15,games:14,down:2,txt:'2週間'},{name:'骨折',w:0.10,games:30,down:5,txt:'1か月'},{name:'靭帯損傷',w:0.05,games:-1,down:15,txt:'今季と来季'}];
const r3=v=>Math.round(v*1000)/1000;
function injRateAt(age,red){ let r=0.01; for(let a=19;a<=(age||22);a++) r+= a>=40?10 : a>=30?0.05 : 0.01; return Math.max(0,r3(r-(red||0))); }   // %
const injRate=()=>PEN?injRateAt(PEN.age,PEN.injRed):0;
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
  let x=rnd(), t=INJ_TYPES[0]; for(const e of INJ_TYPES){ if(x<e.w){ t=e; break; } x-=e.w; }
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
