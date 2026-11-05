/* ========= 打者タイプ（自分・CPU共通） =========
   上がる/下がる＝±5%、少し＝±2.5%、とても＝±7.5%（それぞれの確率に足し引き） */
const BTYPES=['フルスイング','ヒットメーカー','スピードスター','バランス','守備職人','代打男','アスリート'];
const BTYPE_INFO={
  'フルスイング':{me:'三振率↑・ファウル率↓・ヒット率↓。ヒットになったときのツーベース率↑・本塁打率↑',cond:'パワーが自分の能力の中で一番高く、三振率が高かった（20%以上）年のキャンプ前に50%',cpu:'ミートが低くパワーの高い打者'},
  'ヒットメーカー':{me:'本塁打率↓・ツーベース率↓・ゴロ率↑・ボール球に手を出しやすい。ファウルとシングルヒットの率↑',cond:'ミートが一番高く、打率.280を超えた年のキャンプ前に50%',cpu:'ミートが高くパワーの低い打者'},
  'スピードスター':{me:'ゴロ率↑↑・本塁打率↓↓。盗塁成功率↑・内野安打率 少し↑・自分の守備位置に飛んだ打球を少しアウトにしやすい',cond:'盗塁10以上かつ本塁打5本以下の年のキャンプ前に50%',cpu:'速度の高い選手'},
  'バランス':{me:'能力の上下なし',cond:'ほかの条件を満たさなかった年のキャンプ前',cpu:'飛び抜けた能力を持たない選手'},
  '守備職人':{me:'守備でダイビングキャッチなどの好プレーでヒット性の打球をアウトにすることがある',cond:'守備が一番高く、守備固めでの出場が10回以上あった年のキャンプ前に50%',cpu:'守備能力が一番高い選手'},
  '代打男':{me:'通常時は全能力−10。代打のときはミート・パワーが元の能力+10',cond:'代打出場10回以上かつ代打打率.280超の年のキャンプ前に50%',cpu:'飛び抜けた能力を持たない控え選手'},
  'アスリート':{me:'本塁打率↑・ヒット率↑・盗塁成功率↑・守備範囲↑',cond:'打率.300・30本・30盗塁を達成した年（球界で4人まで）',cpu:'全能力がハイレベルな選手にたまに（球界で4人まで）'},
};
const BTYPE_FX={
  'フルスイング':{k:.05,foul:-.05,hit:-.05,d2:.05,hr:.05},
  'ヒットメーカー':{hr:-.05,d2:-.05,gb:.05,chase:.05,foul:.05,hit:.05,single:true},
  'スピードスター':{gb:.075,hr:-.075,steal:.05,ifh:.025,fld:.025},
  'バランス':{},
  '守備職人':{dive:.075},
  '代打男':{},
  'アスリート':{hr:.05,hit:.05,steal:.05,fld:.05},
};
const btFx=(t,k)=>(t&&BTYPE_FX[t]&&BTYPE_FX[t][k])||0;
const myBtype=()=>(typeof PEN!=='undefined'&&PEN&&PEN.btype)||'バランス';
const btypeBadge=t=>t&&BTYPE_INFO[t]?`<span class="rbadge bt">${t}</span>`:'';
// CPU：能力からタイプを決める（athleteOK＝アスリートの枠が残っているか）
function cpuTypeOf(f,athleteOK){
  const m=f.m,p=f.p,s=f.s,d=f.d??50;
  if(athleteOK&&m>=60&&p>=60&&s>=60&&(f.e??50)>=50&&rnd()<0.6) return 'アスリート';
  const mx=Math.max(m,p,s,d), mn=Math.min(m,p,s,d);
  if(mx-mn<=15&&mx<=62&&rnd()<0.25) return '代打男';
  if(p===mx&&p>=60&&m<=p-10&&rnd()<0.7) return 'フルスイング';
  if(m===mx&&m>=60&&p<=m-10&&rnd()<0.7) return 'ヒットメーカー';
  if(s===mx&&s>=70&&rnd()<0.7) return 'スピードスター';
  if(d===mx&&d>=60&&rnd()<0.7) return '守備職人';
  return 'バランス';
}
// 全球団の野手にタイプをつけ直す（シーズン開始時）。アスリートは自分を含めて球界で4人まで
function assignTypesAll(){
  if(typeof PEN==='undefined'||!PEN||!PEN.teams) return;
  let cap=4-(myBtype()==='アスリート'?1:0);
  const all=[]; NPB.forEach(t=>{ const T=PEN.teams[t.id]; if(T&&T.F) T.F.forEach(f=>all.push(f)); });
  shuffle(all).forEach(f=>{ const t=cpuTypeOf(f,cap>0); if(t==='アスリート') cap--; f.btype=t; });
}
// 自分：前のシーズンの成績からキャンプ前に決める。複数の条件を満たしたときはランダム
function btypeUpdate(s){
  if(typeof PEN==='undefined'||!PEN||!s||!(isBat()||isTW())) return null;
  const a=PEN.babil||{}, keys=['meet','power','speed','eye','def'], v=k=>a[k]??50, mx=Math.max(...keys.map(v)), top=k=>v(k)>=mx;
  const pa=s.pa||0, ab=s.ab||0, avg=ab?s.h/ab:0, kr=pa?s.k/pa:0, pha=s.pha||0, phavg=pha?(s.phh||0)/pha:0;
  const cands=[];
  if(top('power')&&pa>=50&&kr>=0.20) cands.push('フルスイング');
  if(top('meet')&&ab>=50&&avg>0.280) cands.push('ヒットメーカー');
  if((s.sb||0)>=10&&(s.hr||0)<=5) cands.push('スピードスター');
  if(top('def')&&(s.ds||0)>=10) cands.push('守備職人');
  if((s.php||0)>=10&&phavg>0.280) cands.push('代打男');
  const pass=cands.filter(()=>rnd()<0.5);
  if(avg>=0.300&&(s.hr||0)>=30&&(s.sb||0)>=30&&ab>=100) pass.push('アスリート');
  const t=pass.length?pick(pass):'バランス', was=PEN.btype||'バランス';
  PEN.btype=t; PEN.btypeY=PEN.year;
  return {t,was,cands};
}
// 代打男：通常時は全能力−10、代打のときはミート・パワー+10
function effBabil(a,kind){
  if(!a||myBtype()!=='代打男') return a;
  const o={...a};
  if(kind==='pinch'){ o.meet=Math.min(110,(a.meet??50)+10); o.power=Math.min(110,(a.power??50)+10); }
  else for(const k of ['meet','power','speed','eye','def']) o[k]=Math.max(1,(a[k]??50)-10);
  return o;
}
// 守備：自分の守備位置に飛んだヒット性の打球をアウトにする確率
function myFieldPos(){ if(typeof G==='undefined'||!G||!G.bat||!G.pen||G.pinch||G.tryout||typeof PEN==='undefined'||!PEN) return null; const s=PEN.slot; return s&&s!=='DH'?s:null; }
function myFldP(){ const d=(PEN.babil&&PEN.babil.def)??50, t=myBtype(); return clamp((d-50)*0.002,0,0.1)+btFx(t,'fld')+btFx(t,'dive'); }
