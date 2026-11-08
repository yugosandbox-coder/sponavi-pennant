
/* ========= 描画 ========= */
// 構えのシルエット（投手目線：右打者は右側に立ち、ホーム方向＝左を向く。左打者は左側）
function batterSVG(flip){
  return `<svg viewBox="0 0 60 130" aria-hidden="true"><g transform="${flip?'translate(60,0) scale(-1,1)':''}" fill="#f5c542" stroke="#f5c542" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="40" x2="6" y2="4" stroke-width="3.5"/>
    <circle cx="34" cy="24" r="8" stroke="none"/>
    <path d="M27 22 Q34 13 42 21 L46 23 L41 24 Z" stroke="none"/>
    <path d="M28 33 L39 34 L37 70 L25 69 Z" stroke-width="2"/>
    <path d="M30 36 L22 41 L27 47" fill="none" stroke-width="5"/>
    <path d="M37 37 L28 44 L23 41" fill="none" stroke-width="4.5"/>
    <path d="M27 68 L19 95 L13 124" fill="none" stroke-width="6.5"/>
    <path d="M35 68 L45 94 L46 124" fill="none" stroke-width="6.5"/>
    <path d="M8 125 L18 125 M44 125 L53 125" stroke-width="4"/>
  </g></svg>`;
}
// 丸の数字：その打者（打席）に投じた何球目か（abPitchNo は logic.js）。0・空なら丸なし
function setResult(cls,big,sub,order){
  const o=order==null?abPitchNo():order;
  $('result').innerHTML=`<div class="rb1">${o?`<span class="ordc">${o}</span>`:''}<span class="big ${cls} pop">${big||'&nbsp;'}</span></div><div class="rb2">${sub||'&nbsp;'}</div>`;
}
function addLog(html){const l=$('log');l.insertAdjacentHTML('beforeend',html);while(l.children.length>160)l.firstElementChild.remove();l.scrollTop=l.scrollHeight}
function lamps(id,n,max,cls){$(id).innerHTML=Array.from({length:max},(_,i)=>`<div class="lamp ${cls} ${i<n?'on':''}"></div>`).join('')}

function renderAll(){
  if(G&&G.bat) return renderBat();   // 野手の打席（打者目線）
  { const bs=$('bsty'); if(bs) bs.style.display='none'; }   // 打ち方の選択は自分の打席だけ
  if(!G.batter&&G.lineup) G.batter=G.lineup[Math.max(0,G.order)]||G.lineup[0];   // 読み込み直後などで打者がいないとき
  const b=G.batter, ab=G.ab;
  $('inn').textContent=G.over?'試合終了':G.inning+'回表';
  $('missionBar').style.display=G.mission&&!G.over?'':'none';
  if(G.mission) $('missionBar').innerHTML=`🎯 ミッション：<b>${G.mission.text}</b>`;
  $('skipOut').style.display=(!G.over&&!G.pulled&&!PB&&!busy)?'':'none';
  if(G.over){ $('next').textContent=G.pen&&G.pen.tryout?'トライアウトの結果へ':G.pen?'日程に戻る':'次の試合へ（同じ持ち球）'; $('next').style.display=''; $('throw').style.display='none'; }
  lamps('lb',ab.balls,3,'b');lamps('ls',Math.min(ab.strikes,2),2,'s');lamps('lo',Math.min(G.outs,2),2,'o');
  ['b1','b2','b3'].forEach((id,i)=>$(id).classList.toggle('on',!!G.bases[i]));
  $('sideL').classList.toggle('here',b.hand==='L');$('sideR').classList.toggle('here',b.hand==='R');
  $('sideL').innerHTML=b.hand==='L'?batterSVG(false)+'<span>左打者</span>':'';
  $('sideR').innerHTML=b.hand==='R'?batterSVG(true)+'<span>右打者</span>':'';

  // ゾーン
  const showT=G.abOver||$('optTgt').checked;
  const rdNow=G.abOver?null:scoutRead(b.hand,sitOf(ab));
  let h='';
  const fr=sel&&!G.abOver&&BREAK[ptype]?[sel[0]-BREAK[ptype][1],sel[1]-breakX(ptype)]:null, frOn=fr&&(fr[0]!==sel[0]||fr[1]!==sel[1]);   // 曲がる前のマス
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const k=K(r,c), inZ=r>=1&&r<=3&&c>=1&&c<=3;
    let cl='cell'+(inZ?' in':'');
    if(b.good.has(k))cl+=' good'; if(b.bad.has(k))cl+=' bad';
    if(sel&&sel[0]===r&&sel[1]===c)cl+=' sel';
    if(frOn&&fr[0]===r&&fr[1]===c)cl+=' from';
    if(showT&&b.target.cells.has(k))cl+=' tgt';
    if($('optTgt').checked&&rdNow&&rdNow.cells.has(k))cl+=' rd';
    const lab=b.good.has(k)?'得意':b.bad.has(k)?'苦手':'';
    h+=`<div class="${cl}" data-r="${r}" data-c="${c}">${lab}</div>`;
  }
  $('zone').innerHTML=h;
  const counts={};
  ab.pitches.forEach((p,i)=>{
    const cell=$('zone').children[p.r*5+p.c];
    const k=K(p.r,p.c);counts[k]=counts[k]||0;
    const off=counts[k]++;
    const m=document.createElement('div');
    m.className='mk';
    m.innerHTML=pitchShape(p.pt,pitchColor(p),22,i+1);
    m.style.left=(2+(off%3)*16)+'px';m.style.top=(2+Math.floor(off/3)*16)+'px';
    cell.appendChild(m);
  });
  [...$('zone').children].forEach(el=>el.onclick=()=>{
    if(G.abOver||busy)return;
    const r=+el.dataset.r,c=+el.dataset.c;
    if(sel&&sel[0]===r&&sel[1]===c){throwPitch();return}   // 同じマスを再タップで投球
    sel=[r,c]; renderAll();
  });
  $('selinfo').innerHTML = G.abOver?'打席終了':(sel?`<b>${courseName(sel[0],sel[1],b.hand)}</b> に <b>${ptype}</b>${frOn?`<small>（${fr[0]<0||fr[0]>4||fr[1]<0||fr[1]>4?'枠の外':courseName(fr[0],fr[1],b.hand)}から曲がる${inZoneRC(fr[0],fr[1])&&!inZoneRC(sel[0],sel[1])?'・ストライク→ボール':!inZoneRC(fr[0],fr[1])&&inZoneRC(sel[0],sel[1])?'・ボール→ストライク':''}）</small>`:''}`:'コースをタップ');
  $('throw').disabled=G.abOver||busy;
  $('selinfo').classList.remove('warn');

  if(!REP.includes(ptype)) ptype=REP[0];   // 念のため：持ち球にない球種が選ばれていたら戻す
  $('ptypes').style.setProperty('--n', REP.length<=4?REP.length:REP.length<=8?Math.ceil(REP.length/2):4);   // 9種以上は4列
  // ペナント（プロ）は Lv.1〜7、1試合モードは 少し／決め球
  const mark=t=>typeof PLEV[t]==='number' ? `<span class="lvm ${PLEV[t]>=3?'k':PLEV[t]<=1?'s':''}">Lv.${PLEV[t]}</span>` :
    lev(t)==='決'?'<span class="lvm k">★決め球</span>':lev(t)==='少'?'<span class="lvm s">少し</span>':'';
  $('ptypes').innerHTML=REP.map(t=>`<button class="btn ${t===ptype?'on':''}" data-t="${t}" >${t==='チェンジアップ'?'チェンジアップ':t}${mark(t)}</button>`).join('');
  [...$('ptypes').children].forEach(el=>el.onclick=()=>{ if(ptype===el.dataset.t){ ptipShow(el,el.dataset.t); return; } ptype=el.dataset.t; renderAll(); });   // 選んでいる球種をもう一度タップすると説明
  if(REP.length===1){   // 1種類だけのときは選ぶボタンを出さず、表示だけにする
    $('ptypes').style.setProperty('--n',1);
    $('ptypes').innerHTML=`<div class="onlyp">球種：<b>${REP[0]}</b>（持ち球1種類）</div>`;
  }

  // チーム名・投手と打者・この打席の投球（写真の並びに合わせる）
  const oppT=G.pen&&G.pen.opp, csOn=typeof PEN!=='undefined'&&PEN&&PEN.teams&&G.pen&&!G.pen.wbc;
  setTeamBar(G.half||'top');   // 投手モードで自分が投げているときは表（相手の攻撃）
  $('plP').innerHTML=`<div class="lab">投手 ${MYNUM}・<b style="color:var(--accent)">投</b>・あなた</div><div class="nm"><span class="nmt">${plink({isMe:true},G.pname||'あなた')}</span> <span class="hb ${PHAND==='L'?'L':'R'}">${PHAND==='L'?'左投':'右投'}</span></div>
    ${asTag(PEN&&PEN.team)}<div class="sub">${(csOn&&csLineP('ME',PEN.team))||`防御率 ${fmtRate(C.runs,C.outs)}`}</div>${staBarHTML(mySta())}`;
  $('plB').innerHTML=`<div class="lab">打者 ${b.num}　${b.order}番・${b.type}${b.appr&&typeof APPR_JP!=='undefined'?`・<b class="appr ${b.appr}">${APPR_JP[b.appr]}</b>`:''}</div><div class="nm"><span class="nmt">${plink(b,b.name)}</span> <span class="hb ${b.hand==='L'?'L':'R'}">${b.hand==='L'?'左打':'右打'}</span></div>
    ${asTag(b.team)}<div class="sub">${(csOn&&b.fid&&csLineB(b.fid,b.team||oppT))||(csOn?`打率 -　本塁打 0　<small>（今季まだ打席なし）</small>`:`打率 ${b.avg.toFixed(3).replace(/^0/,'')}`)}</div>`;
  const pres=p=>({ball:'ボール',hbp:'死球',look:'見逃し',swing:'空振り',foul:'ファウル',foulout:p.text,bip:p.bip?p.bip.big:''}[p.kind]);
  plistChips(ab,pres);   // この打席の投球：横1列の小さな札（まだ投げていなければ隠す）


  renderStats(); renderLineup(); renderScout(); renderRecs(); renderBoard(); renderGround();
  fitZone();   // 打者欄などを描いた後に大きさを合わせる
}

function statRows(s){
  const ab=s.bf-s.bb;
  return [
    ['投球回',fmtIP(s.outs)],
    ['防御率','<b>'+fmtRate(s.runs,s.outs)+'</b>',1],
    ['奪三振率',fmtRate(s.k,s.outs)],
    ['与四死球率',fmtRate(s.bb,s.outs),1],
    ['被本塁打率',fmtRate(s.hr,s.outs),1],
    ['WHIP',s.outs?((s.hits+s.bb)*3/s.outs).toFixed(2):'-.--'],
    ['被打率',ab>0?(s.hits/ab).toFixed(3).replace(/^0/,''):'-'],
    ['失点',s.runs],['被安打',s.hits],['被本塁打',s.hr],['奪三振',s.k],['与四死球',s.bb],['対戦打者',s.bf],['投球数',s.pitches],
    ['打者1人あたり球数',s.bf?(s.pitches/s.bf).toFixed(1):'-',1],
  ];
}
function scoutTable(S){
  let rows='';
  for(const s of SITS){
    const T=S.types[s+'|*']; if(!T) continue;
    const ty=topOf(T).slice(0,3).map(([t,v])=>`${t} ${pct(v)}`).join('、');
    const cs=['R','L'].map(h=>{const Cc=S.cells[s+'|'+h]; if(!Cc||Cc.n<3) return '';
      const[k]=topOf(Cc)[0];const[r,c]=k.split(',').map(Number);
      return `${h==='R'?'右':'左'}：${courseName(r,c,h)}（ボール${pct(Cc.ball)}）`}).filter(Boolean).join('<br>');
    rows+=`<tr><th>${s}<br><small>${T.n}球</small></th><td>${ty}${cs?'<br><span style="color:var(--mute)">'+cs+'</span>':''}</td></tr>`;
  }
  return `<table class="sct">${rows}</table>`;
}
function renderScout(){
  if(G&&G.bat) return renderScoutBat();
  const S=G.scout, b=G.batter, bn=b?b.name:'打者';
  const known=G.lineup.filter(x=>C.vs&&C.vs[vsKey(x)]&&C.vs[vsKey(x)].n>=6);
  const list=`<div class="sh2">相手打線が持っているあなたとの対戦データ</div><div class="hint">${G.lineup.map(x=>`${x.order}.${x.name} ${(C.vs&&C.vs[vsKey(x)]&&C.vs[vsKey(x)].n)||0}球`).join('　')}</div>`;
  if(!S){$('scout').innerHTML=`<div class="hint">傾向読みは<b>打者ごと</b>。それぞれの打者が、あなたから受けた球（今までの試合＋この試合）だけをもとに、初球の入り・カウント別の球種・コース・ボール球の傾向を<b>率</b>で読んできます。<br>いまの打者 <b>${bn}</b> はまだデータが少ない（6球未満）ので読まれていません。</div>`+list;return}
  const rep=scoutReport(S);
  $('scout').innerHTML=`<div class="hint">いまの打者 <b>${bn}</b> があなたから受けた球（${S.n}球・この試合${S.nGame||0}球）からの傾向。打者ごとに読み方が変わります。</div>
    <div class="scout" style="color:#f3dfa0;background:#2a2410;border:1px solid #6b5520;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:13px;line-height:1.7">・${rep.join('<br>・')||'まだ傾向なし'}</div>
    ${scoutTable(S)}
    <div class="hint" style="margin-top:6px">有利＝ストライク先行、平行＝同カウント、不利＝ボール先行、追込＝2ストライク</div>${list}`;
}
function lineupTable(list,cur){
  return `<table class="lu">`+list.map((b,i)=>`
    <tr class="${i===cur?'cur':''}"><td class="no">${b.order}</td>
    <td class="nm"><b>${plink(b,b.name)}</b> <small>${b.hand==='R'?'右':'左'}・${b.type}</small><div class="rs">${b.res.join(' / ')||'&nbsp;'}</div></td>
    <td class="num">打率 <b>${b.avg.toFixed(3).replace(/^0/,'')}</b><br>年${Math.round(b.hrRate*PA_SEASON)}本ペース</td></tr>`).join('')+'</table>';
}
function renderLineup(){
  if(G&&G.bat) return renderLineupBat();
  const L=LINEUPS[OPP.pattern];
  $('lineup').innerHTML=liveLS(true)+
    `<div class="sh2">相手打線：${L.name}／${HANDS[OPP.hand].name}</div>`+lineupTable(G.lineup,G.abOver?-1:G.order)+
    `<div class="sh2">味方打線：${G.myTeam.name}／${G.myTeam.hand}（DHのため投手は打席に立ちません）</div>`+lineupTable(G.myTeam.lineup,-1);
}
// 球団の色（ユニフォームに合わせる）：帽子の色を地に、帽子の文字の色で名前
const teamStyle=n=>{ const t=n&&n.id&&typeof TEAM!=='undefined'&&TEAM[n.id]; return t?` style="background:${t.cap};color:${t.cl}"`:''; };
// チーム名の帯：左＝守っているチーム（投手）、右＝攻めているチーム（打者）。色はユニフォームに合わせる
function setTeamBar(half){
  if(!G||!G.names) return;
  const top=(half||G.half)==='top';   // 表＝相手の攻撃＝味方が守る
  const L=top?G.names.my:G.names.opp, R=top?G.names.opp:G.names.my;
  // 左＝守備側（投手のチーム）、右＝攻撃側（打者のチーム）。色はユニフォーム（地の色・胸の文字・つば）に合わせる
  const put=(id,n)=>{ const el=$(id); if(!el) return; const t=n&&n.id&&typeof TEAM!=='undefined'&&TEAM[n.id]; el.textContent=n.name; el.style.fontSize='';
    if(t){ el.style.background=t.jersey||t.cap; el.style.color=t.chc||t.cl; el.style.borderColor=t.brim||t.cap; }
    else if(n&&n.lg&&typeof AS_LG!=='undefined'&&AS_LG[n.lg]){ el.style.background=AS_LG[n.lg].bg; el.style.color=AS_LG[n.lg].fg; el.style.borderColor=AS_LG[n.lg].bd||AS_LG[n.lg].fg; el.textContent=AS_LG[n.lg].name; el.style.fontSize='12.5px'; }
    else { el.style.background=''; el.style.color=''; el.style.borderColor=''; } };
  put('tmL',L); put('tmR',R);
  const lab=$('tmLab'); if(lab) lab.innerHTML=`<span>守備</span><span>攻撃</span>`;
}
// スコアボード（イニングごとの得点）
// names：チーム名、hits：[相手の安打, 味方の安打]（記録表示では保存したものを使う）
function lineScoreHTML(sc,x,big,names,hits){
  names=names||sc.names||{opp:{s:'相'},my:{s:'味'}}; hits=hits||sc.h||['',''];
  const n=Math.max(9,sc.opp.length,sc.my.length);
  let h=`<table class="ls${big?' big':''}"><tr><th></th>`; for(let i=1;i<=n;i++)h+=`<th>${i}</th>`; h+='<th class="tot">計</th><th class="tot">安</th><th class="tot">失</th></tr>';
  const row=(name,a,isMy,hh)=>{let t=`<tr><th${teamStyle(isMy?names.my:names.opp)}>${name}</th>`;for(let i=0;i<n;i++){let v=a[i];if(isMy&&x&&i===a.length&&v==null)v='X';t+=`<td class="${G&&!isMy&&i===G.inning-1&&!G.over&&a===G.score.opp?'now':''}">${v==null?'':v}</td>`}return t+`<td class="tot">${sumN(a)}</td><td class="tot">${hh}</td><td class="tot">0</td></tr>`};
  return h+row(names.opp.s,sc.opp,false,hits[0])+row(names.my.s,sc.my,true,hits[1])+'</table>';
}
const liveLS=big=>lineScoreHTML(G.score,G.xBottom,big,G.names,[G.bat?G.hitsOpp:G.st.hits+G.hitsOpp,G.hitsMy]);
function renderStats(){
  if(G&&G.bat) return renderStatsBat();
  const g=statRows(G.st), c=statRows(C);
  $('stats').innerHTML=`<thead><tr><th></th><th>この試合</th><th>通算（${C.games}試合 ${C.w}勝${C.l}敗・完投${C.cg}・完封${C.shutouts}）</th></tr></thead><tbody>`+
    g.map((row,i)=>`<tr class="${row[2]?'key':''}"><td>${row[0]}</td><td>${row[1]}</td><td>${c[i][1]}</td></tr>`).join('')+'</tbody>';
}
// 試合記録（終わった試合をあとから見る）
function renderRecs(){
  if(!RECS.length){$('recs').innerHTML='<div class="hint">まだ試合記録はありません。9回まで（または降板後に試合終了まで）進むと、ここに残ります。</div>';return}
  $('recs').innerHTML=`<div class="hint">最近の${RECS.length}試合（最大30試合）。タップで詳細。</div>`+RECS.map((g,i)=>{
    const d=new Date(g.date), ds=`${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    const mark={W:'○',L:'●',T:'△'}[g.res];
    const L=g.line;
    return `<details class="rec"><summary><span class="rm ${g.res}">${mark}</span> <b>${g.final[0]}−${g.final[1]}</b> vs ${g.opp.replace(/（.*/,'')} <small>${ds}</small><br><small>${fmtIP(L.outs)}回 ${L.pitches}球 失点${L.runs} K${L.k} 防御率${g.era}　${g.dec==='勝'?'勝利投手':g.dec==='負'?'敗戦投手':'勝敗なし'}${g.cg?'・完投':''}</small></summary>
      ${lineScoreHTML(g.score,g.score.x,false)}
      <div class="hint">相手：${g.opp}／味方：${g.mine}／${g.hand==='R'?'右投げ':'左投げ'}・持ち球：${g.rep.join('・')}</div>
      ${g.pulled?`<div class="hint" style="color:#ff9b93">降板：${g.pulled}</div>`:''}
      <div class="hint">被安打${L.hits}（本塁打${L.hr}）・奪三振${L.k}・与四死球${L.bb}・対戦打者${L.bf}・打者1人あたり${L.bf?(L.pitches/L.bf).toFixed(1):'-'}球</div>
      <div class="sh2">この試合の配球の傾向</div><div class="scout" style="color:#f3dfa0;background:#2a2410;border:1px solid #6b5520;border-radius:8px;padding:6px 8px;font-size:12.5px;line-height:1.7">・${g.report.join('<br>・')||'データ不足'}</div>
      <div class="sh2">試合終了時点の通算の傾向</div><div class="hint" style="line-height:1.7">・${g.careerReport.join('<br>・')||'データ不足'}</div>
      <div class="sh2">相手打者の結果</div><table class="lu">${g.bat.map(b=>`<tr><td class="no">${b.o}</td><td class="nm"><b>${b.n}</b> <small>${b.h==='R'?'右':'左'}・${b.t}</small><div class="rs">${b.r.join(' / ')}</div></td></tr>`).join('')}</table>
    </details>`}).join('');
}

/* ========= セーブ／ロード ========= */
// アカウントの保存領域（どの端末でも続きから）を優先し、使えないときはこの端末のブラウザに保存
const SAVE_KEY='pvb_save_v1';
const store={ref:null,mode:'local',writing:false,pending:false,timer:null,played:false};
const serB=b=>({...b,good:[...b.good],bad:[...b.bad],target:{label:b.target.label,cells:[...b.target.cells]}});
const deB=b=>({...b,good:new Set(b.good),bad:new Set(b.bad),target:{label:b.target.label,cells:new Set(b.target.cells)}});
function snapshotSave(){
  return JSON.parse(JSON.stringify({v:3,savedAt:Date.now(),REP,ptype,OPP,PHAND,PNAME_IN,TNAME_IN,PLEV,C,RECS,PEN,HALL,MYTEAM,RCV,SCREEN:(SCREEN==='prof'||SCREEN==='setup')?prevScreen:SCREEN,G:G?{...G,batter:null,lineup:G.lineup.map(serB)}:null,log:$('log').innerHTML}));
}
function save(){
  if(typeof QUIET!=='undefined'&&QUIET) return;
  store.played=true;
  const data=snapshotSave();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(e){}
  if(!store.ref)return;
  clearTimeout(store.timer); store.timer=setTimeout(flushCloud,800);   // 連続した投球はまとめて1回書き込む
}
async function flushCloud(){
  if(!store.ref)return;
  if(store.writing){store.pending=true;return}
  store.writing=true;
  try{ await store.ref.set(snapshotSave()); setSaveStatus('cloud'); }
  catch(e){ if(e&&e.code==='unavailable'){store.pending=true} else {store.ref=null;setSaveStatus('local')} }
  store.writing=false;
  if(store.pending){store.pending=false;setTimeout(flushCloud,1500)}
}
function setSaveStatus(m){
  store.mode=m;
  $('saveStatus').innerHTML = m==='cloud'
    ? '💾 自動セーブ：<b style="color:var(--ink)">アカウントに保存</b>（別の端末でも続きから遊べます）'
    : '💾 自動セーブ：<b style="color:var(--ink)">この端末のブラウザに保存</b>（ブラウザのデータを消すと消えます）';
}
function applySave(d){
  // アカウント保存から来たデータは書き換えできない（凍結された）オブジェクトのことがあるので、ふつうのオブジェクトに写してから使う
  try{ if(d) d=JSON.parse(JSON.stringify(d)); }catch(e){ return false; }
  // 途中まで読み込んで中途半端な状態にならないよう、先に形式を確かめ、失敗したら元に戻す
  const okG=!!(d&&d.G&&Array.isArray(d.G.lineup)&&d.G.score&&d.G.myTeam&&d.G.ab);
  if(!d||(!okG&&!(d.PEN&&!d.G)))return false;   // 試合データが無いセーブ（ペナントだけの引っ越しデータ）も読める
  const bak={REP,C,RECS,PHAND,PNAME_IN,TNAME_IN,PLEV,PEN,OPP,G,ptype,sel,log:$('log').innerHTML};
  try{
    REP=(d.REP||[]).filter(t=>PTYPES.includes(t)); if(!REP.length)REP=['ストレート'];
    C={...newCareer(),...d.C}; if(!C.agg||!C.agg.types)C.agg=newAgg();
    RECS=Array.isArray(d.RECS)?d.RECS:[];
    PHAND=d.PHAND==='L'?'L':'R'; PNAME_IN=typeof d.PNAME_IN==='string'?d.PNAME_IN.slice(0,10):''; TNAME_IN=typeof d.TNAME_IN==='string'?d.TNAME_IN.slice(0,12):''; PLEV=(d.PLEV&&typeof d.PLEV==='object')?d.PLEV:{};
    if(d.OPP&&LINEUPS[d.OPP.pattern]&&HANDS[d.OPP.hand])OPP=d.OPP;
    if(okG&&d.G.bat){ G={...d.G,lineup:d.G.lineup.map(deB)}; if(G.tw&&!G.batter) G.batter=G.lineup[G.order]||G.lineup[0]; }   // 野手の試合（二刀流は、あとで投手の画面に戻るので相手の打者も戻す）
    else if(okG){
      const g={...d.G,lineup:d.G.lineup.map(deB)}; g.batter=g.lineup[g.order];
      if(!g.batter) throw new Error('打者データなし');
      g.st={...newStat(),...g.st}; g.hist=g.hist||[]; g.phist=g.phist||[]; g.scout=g.scout||null;
      g.names=g.names||genNames(); g.pname=g.pname||randName(); g.hitsMy=g.hitsMy||0; g.hitsOpp=g.hitsOpp||0;
      G=g;
    }else newGame(false);   // 試合データが無ければ新しく作る
    ptype=REP.includes(d.ptype)?d.ptype:REP[0]; sel=null;
    $('log').innerHTML=d.log||'';
    PEN=(d.PEN&&typeof d.PEN==='object')?d.PEN:null;
    if(PEN) penMigrate();   // 古いペナント（5球団）は12球団に直す
    HALL=Array.isArray(d.HALL)?d.HALL:[]; MYTEAM=(d.MYTEAM&&typeof d.MYTEAM==='object')?d.MYTEAM:{name:'',ids:[]}; RCV=Array.isArray(d.RCV)?d.RCV:[];
    restoreUI();
    const want=d.SCREEN;
    if(want==='game' && G && G.pen && !G.over) showScreen('game');   // 1試合モードは無くなったので、ペナントの試合だけ再開
    else if(want==='pennant' && PEN) showScreen('pennant');
    else if(want==='hall') showScreen('hall');
    else if(G && G.pen && !G.over) showScreen('game');
    else if(G && G.pen && PEN) showScreen('pennant');   // 終わったペナントの試合なら日程へ
    else showScreen('mode');
    return true;
  }catch(e){
    ({REP,C,RECS,PHAND,PNAME_IN,TNAME_IN,PLEV,PEN,OPP,G,ptype,sel}=bak); $('log').innerHTML=bak.log;
    try{ if(G) renderAll(); }catch(_){}
    return false;
  }
}
function restoreUI(){
  const b=G.batter;
  showSetup(false);
  $('reveal').innerHTML='';
  if(G.bat){ setResult('','続きから再開',`${G.inning}回${G.half==='top'?'表':'裏'} ${G.outs}アウト`,0); renderAll(); return; }
  if(G.abOver){
    $('reveal').innerHTML=`<div class="reveal">🔍 この打者の狙い：<b>${b.target.label}</b></div>`;
    $('throw').style.display='none'; $('next').style.display='';
    $('next').textContent=G.over?'次の試合へ（同じ持ち球）':G.outs>=3?'チェンジ → 次の回へ':'次の打者へ';
  }else{ $('throw').style.display=''; $('next').style.display='none'; }
  setResult('','続きから再開',`${G.inning}回 ${G.outs}アウト　打者：${b.order}番 ${b.name}`,0);
  if(G.staAsk) setTimeout(staAskShow,300);   // 続投か降板かを決める途中だった
  renderAll();
}
let resetArmed=false;
$('resetCareer').onclick=()=>{
  if(!resetArmed){resetArmed=true;$('resetCareer').textContent='もう一度押すとリセット（元に戻せません）';$('resetCareer').classList.add('danger');
    setTimeout(()=>{resetArmed=false;$('resetCareer').textContent='通算成績をリセット';$('resetCareer').classList.remove('danger')},4000);return}
  resetArmed=false;$('resetCareer').textContent='通算成績をリセット';$('resetCareer').classList.remove('danger');
  C=newCareer(); renderAll(); save();
};
async function initCloud(){
  if(!(window.claude&&claude.use))return;
  try{
    const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
    const id=user?await user.id():null;
    if(!db||!id)return;
    const ref=db.collection('data/users/'+id).doc('save');
    const snap=await Promise.race([ref.get(),new Promise((_,rej)=>setTimeout(()=>rej('timeout'),10000))]);
    store.ref=ref; setSaveStatus('cloud');
    const d=snap.exists?snap.data():null;
    let local=null; try{local=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){}
    if(d && (!local||d.savedAt>(local.savedAt||0)) && !store.played){ applySave(d); }
    else if(store.played||local){ flushCloud(); }   // こちらの方が新しければアカウント側を更新
  }catch(e){}
}

[...$('tabs').children].forEach(t=>t.onclick=()=>{
  [...$('tabs').children].forEach(x=>{x.classList.toggle('on',x===t);$(x.dataset.p).style.display=x===t?'':'none'});
  try{ if(G){ renderStats(); renderLineup(); renderScout(); renderRecs(); } }catch(e){}   // 開いたタブは最新の内容にする
});
$('throw').onclick=()=>{
  if(G&&G.bat){ if(G.meUp){ if(VIEW==='ground') setView('pitch'); batPitch(); } else batSteal(); return; }
  if(VIEW==='ground'&&!G.abOver) setView('pitch'); throwPitch(); };
function onNext(){ if(PB) { endPB(); return; } if(G&&G.bat){ batNext(); return; } goNext(); }
let skipArmed=false, skipT=null;
const SKIP_TXT='⏩ ここからスキップ（残りは成績に応じておまかせ）';
$('skipOut').onclick=()=>{
  if(!skipArmed){ skipArmed=true; $('skipOut').textContent='もう一度押すと、ここからスキップ'; clearTimeout(skipT); skipT=setTimeout(()=>{skipArmed=false;$('skipOut').textContent=SKIP_TXT},3000); return; }
  skipArmed=false; clearTimeout(skipT); $('skipOut').textContent=SKIP_TXT;
  const Q=G&&G.bat?batSkipRest():skipMyOuting(); if(!Q) return;
  save();
  playBack(Q,()=>{ renderAll(); if(G.over&&G.result&&typeof showFinal==='function') showFinal(G.result.res,G.result.dec); });
};
$('next').onclick=onNext;

// 画面の高さに合わせてゾーンの大きさを調整（下の操作ボタンに隠れないように）
function warnNoCourse(){
  const el=$('selinfo'); el.textContent='先にコースのマスをタップしてください'; el.classList.add('warn');
}
// この打席の投球を横1列の札にする（1画面に収めるため）。まだ1球も無ければ隠す
function plistChips(ab,pres){
  const el=$('plist');
  el.innerHTML = ab.pitches.length ? `<div class="pcs">${ab.pitches.map((p,i)=>`<span class="pc"><i style="background:${pitchColor(p)}">${i+1}</i>${p.speed}<small>km</small> ${ptn(p.pt)} <b>${pres(p)}</b></span>`).join('')}</div>` : '';
  el.classList.toggle('none',!ab.pitches.length);
  const pcs=el.firstElementChild; if(pcs) pcs.scrollLeft=pcs.scrollWidth;
}
function fitZone(){
  // メイン画面の下（チーム名・投手打者・投球一覧・操作）まで1画面に収まるようにゾーンの大きさを決める
  const w=$('zoneWrap'); w.style.maxWidth='';
  const top=w.getBoundingClientRect().top+window.scrollY;
  const avail=window.innerHeight-top-$('below').offsetHeight-8;
  const side=66; // 左右の打席ぶん
  const zw=clamp(avail/1.05,122,380-side);   // 画面が低いときはゾーンを小さめに（最小128px）
  w.style.maxWidth=(zw+side)+'px';
}
window.addEventListener('resize',()=>G&&fitZone());

/* ---- 球の形：ストレート＝丸、チェンジアップ＝四角、それ以外の変化球＝曲がる方向を指す三角形 ---- */
// 画面上の横の曲がり：投手目線ではそのまま、打者目線（野手）では左右反転
function scrBX(pt){ const vx=BRV(pt)[0]; return G&&G.bat ? -vx*(curPit().hand==='R'?1:-1) : vx*(PHAND==='R'?1:-1); }   // 見た目の横の動き
function pitchShape(pt,col,s,num){
  const h=s/2; let shape, tx=h, ty=h;
  if(pt==='ストレート') shape=`<circle cx="${h}" cy="${h}" r="${h-1.5}"/>`;
  else if(pt==='チェンジアップ') shape=`<rect x="2" y="2" width="${s-4}" height="${s-4}" rx="2"/>`;
  else{
    const a=Math.atan2(BRV(pt)[1],scrBX(pt));   // 曲がる向き（画面上）
    shape=`<polygon points="${s-1},${h} 1.5,1.5 1.5,${s-1.5}" transform="rotate(${a*180/Math.PI} ${h} ${h})"/>`;
    const cx=(s+2)/3-h; tx=h+cx*Math.cos(a); ty=h+cx*Math.sin(a);   // 三角形の重心に番号
  }
  const t=num!=null?`<text x="${tx.toFixed(1)}" y="${(ty+3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="900" fill="#111">${num}</text>`:'';
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><g fill="${col}" stroke="#0009" stroke-width="1">${shape}</g>${t}</svg>`;
}

/* ---- 投球アニメーション（シンプル） ----
   変化の向きから選んだマスへスライドして着弾。色はストライク／ボールの2色。
   どんな環境でも必ず進行するように、タイマーで確実に終了させる */
function animatePitch(r,c,pt,done){
  let finished=false;
  const finish=()=>{ if(finished)return; finished=true; try{cleanup()}catch(e){} done(); };
  let cleanup=()=>{};
  const safety=setTimeout(finish,1200);   // アニメーションが止まっても1.2秒後には必ず結果へ
  try{
    const wrap=$('zoneWrap'), zone=$('zone');
    const wb=wrap.getBoundingClientRect();
    const cell=zone.children[dispIdx(r,c)].getBoundingClientRect(), mid=zone.children[12].getBoundingClientRect();
    const ex=cell.left+cell.width/2-wb.left, ey=cell.top+cell.height/2-wb.top;
    const dx=scrBX(pt)*mid.width, dy=BRV(pt)[1]*mid.height;
    const sx=ex-dx, sy=ey-dy;
    const col=inZoneRC(r,c)?COL_STRIKE:COL_BALL, straight=!dx&&!dy;
    const ball=document.createElement('div'); ball.className='ball'; ball.style.setProperty('--bc',col);
    ball.innerHTML=pitchShape(pt,col,26,null);
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg'); svg.setAttribute('class','trail');
    svg.setAttribute('width',wb.width); svg.setAttribute('height',wb.height);
    const line=document.createElementNS(svgNS,'line');
    line.setAttribute('x1',sx);line.setAttribute('y1',sy);line.setAttribute('x2',sx);line.setAttribute('y2',sy);
    line.setAttribute('stroke',col);
    svg.appendChild(line); wrap.appendChild(svg); wrap.appendChild(ball);
    let hit=null;
    cleanup=()=>{ball.remove();svg.remove();if(hit)hit.remove()};
    const dur=straight?260:380, t0=Date.now();
    const step=()=>{
      if(finished)return;
      const t=Math.min(1,(Date.now()-t0)/dur), e=1-(1-t)*(1-t);
      const x=sx+dx*e, y=sy+dy*e, sc=straight?0.3+0.7*t:1;
      ball.style.transform=`translate(${x}px,${y}px) scale(${sc})`;
      line.setAttribute('x2',x);line.setAttribute('y2',y);
      if(t<1){ setTimeout(step,16); return; }   // requestAnimationFrame は止まる環境があるのでタイマーで回す
      hit=document.createElement('div'); hit.className='hit'; hit.style.borderColor=col; hit.style.left=ex+'px'; hit.style.top=ey+'px'; wrap.appendChild(hit);
      svg.classList.add('fade');
      setTimeout(()=>{clearTimeout(safety);finish()},180);
    };
    step();
  }catch(e){ clearTimeout(safety); finish(); }
}

/* ---- 投球画面／グラウンド画面の切り替え ---- */
let VIEW='pitch';
function setView(v){ VIEW=v; $('vGround').classList.toggle('on',v==='ground'); $('vPitch').classList.toggle('on',v==='pitch'); renderGround(); }
$('vGround').onclick=()=>setView('ground'); $('vPitch').onclick=()=>setView('pitch');
function renderBoard(){ $('lscore').innerHTML=liveLS(false); }
// グラウンド（ホームが下。打球の軌道と走者を表示）
const HOME=[150,226];
const polar=(deg,d)=>[HOME[0]+d*Math.sin(deg*Math.PI/180),HOME[1]-d*Math.cos(deg*Math.PI/180)];
const FPOS={P:[0,40],C:[0,-8],'1B':[36,72],'2B':[13,96],SS:[-13,96],'3B':[-36,72],LF:[-27,145],CF:[0,155],RF:[27,145]};
function landingOf(B){
  const rr=(a,b)=>a+(b-a)*B.seed;   // 同じ打球は同じ位置に（再描画で動かない）
  const sideA={left:-28,center:0,right:28}[B.side]||0;
  if(B.res==='FF'){ const f=B.fielder||'C'; return f==='C'?[150+rr(-12,12),240]:polar(f==='1B'?52:-52,rr(60,85)); }
  if(B.fielder&&B.res!=='IFH'){ const[a,d]=FPOS[B.fielder]; return polar(a+rr(-6,6),Math.max(4,d+rr(-10,10))); }
  if(B.res==='IFH'){ const f=B.fielder||'SS'; const[a,d]=FPOS[f]; return polar(a+rr(-6,6),d-rr(5,20)); }
  if(B.res==='HR') return polar(sideA+rr(-12,12),rr(195,215));
  if(B.res==='3B') return polar(sideA+(sideA?Math.sign(sideA)*rr(5,14):rr(-20,20)),rr(160,172));
  if(B.res==='2B') return polar(sideA+(sideA?Math.sign(sideA)*rr(4,16):rr(-25,25)),rr(150,170));
  return polar(sideA+rr(-14,14), B.kind==='ground'?rr(108,125):rr(118,140));   // ヒット
}
function trajectoryPath(B,L){
  const [sx,sy]=[HOME[0],HOME[1]-4], [ex,ey]=L;
  if(B.kind==='ground'&&B.res!=='HR'){
    // ゴロ：小さく弾みながら転がる
    let d=`M${sx},${sy}`; const n=3;
    for(let i=1;i<=n;i++){const t0=(i-1)/n,t1=i/n;const x0=sx+(ex-sx)*t0,y0=sy+(ey-sy)*t0,x1=sx+(ex-sx)*t1,y1=sy+(ey-sy)*t1;
      d+=` Q${((x0+x1)/2).toFixed(1)},${((y0+y1)/2-10/i).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`}
    return d;
  }
  const h = B.res==='HR'?95 : B.kind==='liner'?18 : (B.res==='PO'||B.res==='FF')?70 : 60;
  return `M${sx},${sy} Q${((sx+ex)/2).toFixed(1)},${(Math.min(sy,ey)-h).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
}
// 打球の軌道をホームから伸ばして見せる（リプレイ）
function playTraj(){
  const p=document.getElementById('trajP'); if(!p) return;
  const len=p.getTotalLength(); const dot=p.nextElementSibling;
  p.style.transition='none'; p.style.strokeDasharray=len; p.style.strokeDashoffset=len; if(dot) dot.style.opacity=0;
  p.getBoundingClientRect();
  p.style.transition='stroke-dashoffset .9s ease-out'; p.style.strokeDashoffset=0;
  setTimeout(()=>{ if(dot) dot.style.opacity=1; },900);
}
let lastTrajSeed=null;
function renderGround(){
  const g=$('ground');
  if(VIEW!=='ground'){g.style.display='none';return}
  g.style.display='';
  const fence=(()=>{let d='';for(let a=-45;a<=45;a+=5){const[x,y]=polar(a,178);d+=(a===-45?'M':'L')+x.toFixed(1)+','+y.toFixed(1)}return d})();
  const [lpx,lpy]=polar(-45,178),[rpx,rpy]=polar(45,178);
  const dirt=(()=>{let d=`M${HOME[0]},${HOME[1]+10}`;for(let a=-50;a<=50;a+=5){const[x,y]=polar(a,100);d+=` L${x.toFixed(1)},${y.toFixed(1)}`}return d+' Z'})();
  const b1=polar(45,62),b2=polar(0,88),b3=polar(-45,62),pm=polar(0,44);
  const base=(p,on)=>`<rect x="${p[0]-6}" y="${p[1]-6}" width="12" height="12" transform="rotate(45 ${p[0]} ${p[1]})" fill="${on?'#f5c542':'#fff'}" stroke="${on?'#7a5b00':'#999'}" stroke-width="1"/>`;
  const B = PB ? (PB.bip?{...PB.bip,label:PB.label}:null) : G.lastBIP;
  let traj='', label='', sub='', gcol='var(--accent)';
  if(B){
    const L=landingOf(B);
    const tc=['1B','2B','3B','HR','IFH'].includes(B.res)?COL_HIT:COL_OUT;   // ヒット・本塁打は青、アウトは赤
    traj=`<path id="trajP" d="${trajectoryPath(B,L)}" fill="none" stroke="${tc}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${L[0].toFixed(1)}" cy="${L[1].toFixed(1)}" r="5" fill="#fff" stroke="${tc}" stroke-width="2"/>`;
    gcol=tc;
    label=B.label; sub=PB?`${PB.inning}回裏 味方の攻撃`:(G.abOver?'この打席の打球':'直前の打球');
  }else{ label=''; sub='打球はまだありません（バットに当たるとここに軌道が出ます）'; }
  const on = PB ? (PB.bases||[0,0,0]) : G.bases;
  g.innerHTML=`<svg viewBox="18 30 264 218" preserveAspectRatio="xMidYMid meet">
    <path d="${fence} L${HOME[0]},${HOME[1]+14} Z" fill="#2f8a43"/>
    <path d="${fence}" fill="none" stroke="#f5c542" stroke-width="2"/>
    <path d="${dirt}" fill="#b08a5a"/>
    <path d="M${b3[0]},${b3[1]} L${b2[0]},${b2[1]} L${b1[0]},${b1[1]} L${HOME[0]},${HOME[1]} Z" fill="#3a9a50"/>
    <line x1="${HOME[0]}" y1="${HOME[1]}" x2="${lpx}" y2="${lpy}" stroke="#fff" stroke-width="1.2" opacity=".8"/>
    <line x1="${HOME[0]}" y1="${HOME[1]}" x2="${rpx}" y2="${rpy}" stroke="#fff" stroke-width="1.2" opacity=".8"/>
    <circle cx="${pm[0]}" cy="${pm[1]}" r="7" fill="#b08a5a"/>
    ${base(b1,on[0])}${base(b2,on[1])}${base(b3,on[2])}
    <path d="M${HOME[0]-6},${HOME[1]-4} L${HOME[0]+6},${HOME[1]-4} L${HOME[0]+6},${HOME[1]+2} L${HOME[0]},${HOME[1]+7} L${HOME[0]-6},${HOME[1]+2} Z" fill="#fff"/>
    ${traj}
  </svg>${B?'<button class="replay" id="replay">リプレイ</button>':''}<div class="glabel" style="color:${gcol}">${label}</div><div class="gsub">${sub}　${on.some(Boolean)?'走者：'+['一塁','二塁','三塁'].filter((_,i)=>on[i]).join('・'):'走者なし'}　${PB?(PB.outs||0):(G.outs>=3?'3':G.outs)}アウト</div>`;
  if(B){ $('replay').onclick=playTraj; if(B.seed!==lastTrajSeed){ lastTrajSeed=B.seed; playTraj(); } }
}

/* ---- 味方の攻撃などを1.5秒ごとに見せる ---- */
let PB=null, pbTimer=null, pbDone=null;
function playBackUI(Q,done){
  if(!Q.length){done();return}
  busy=true; pbDone=done; let i=0; $('skipOut').style.display='none';
  $('throw').style.display='none'; $('next').style.display=''; $('next').textContent='スキップ ▶▶'; $('next').onclick=endPB;
  $('result').classList.add('pb');
  const step=()=>{ if(i>=Q.length){ endPB(); return; } showPB(Q[i++]); pbTimer=setTimeout(step,1500); };
  step();
}
function endPB(){
  clearTimeout(pbTimer); PB=null; busy=false; $('next').onclick=onNext; $('result').classList.remove('pb');
  const d=pbDone; pbDone=null; renderAll(); if(d) d();
}
function showPB(ev){
  PB=ev;
  $('lscore').innerHTML=lineScoreHTML(ev.score,false,false,G.names,ev.hits);
  const top=ev.half==='top';
  setTeamBar(ev.half);
  $('inn').textContent=`${ev.inning}回${top?'表':'裏'}`;
  lamps('lb',0,3,'b');lamps('ls',0,2,'s');lamps('lo',Math.min(ev.outs||0,2),2,'o');
  ['b1','b2','b3'].forEach((id,i)=>$(id).classList.toggle('on',!!(ev.bases&&ev.bases[i])));
  // 打者の結果だけを出す（ヒット・本塁打は青、アウトは赤）
  const cls = ev.hit ? (ev.label.startsWith('四球')?'cb':'ch') : 'co';
  // 左の投手欄：守っている側の投手（野手モードの表は味方の投手、投手モードの裏は相手の投手）
  if(!G.bat&&ev.pitcher){ const op=ev.pitcher, tn=top?G.names.my.name:G.names.opp.name;
    $('plP').innerHTML=`<div class="lab">投手 ${op.num||''}　${tn}</div><div class="nm"><span class="nmt">${op.isMe?plink({isMe:true},G.pname||'あなた'):(op.name||'')}</span> <span class="hb ${op.hand==='L'?'L':'R'}">${op.hand==='L'?'左投':'右投'}</span></div>${asTag(op.isMe?PEN.team:op.team)}<div class="sub">${(G.pen&&!G.pen.wbc&&PEN&&PEN.teams&&(op.isMe?csLineP('ME',PEN.team):op.pid?csLineP(op.pid,op.team||(top?PEN.team:G.pen.opp)):null))||(op.isMe?`防御率 ${fmtRate(C.runs,C.outs)}`:`最速${op.velo||'-'}km/h・${op.types?op.types.length:'-'}球種`)}</div>${op.isMe&&typeof mySta==='function'?staBarHTML(mySta()):(G.bat&&G.pits&&!top?staBarHTML(cpuSta(curPitIdx())):'')}`; }
  if(G.bat&&top&&G.ours&&G.ours.length){ const op=G.ours[ev.inning<=6?0:Math.min(G.ours.length-1,ev.inning-6)];
    $('plP').innerHTML=`<div class="lab">投手 ${op.num||''}　${G.names.my.name}</div><div class="nm"><span class="nmt">${op.name}</span> <span class="hb ${op.hand}">${op.hand==='L'?'左投':'右投'}</span></div>${asTag(op.team)}<div class="sub">${(G.pen&&!G.pen.wbc&&PEN&&PEN.teams&&op.pid&&csLineP(op.pid,op.team||PEN.team))||`最速${op.velo}km/h・${op.types?op.types.length:'-'}球種`}</div>`; }
  if(ev.summary){   // 相手の攻撃（1イニングまとめて）
    setResult(ev.hit?'co':'ch', ev.label, `${ev.inning}回表 ${G.names.opp.name}の攻撃${ev.sub?'　'+ev.sub:''}`, 0);
    $('plB').innerHTML=`<div class="lab">${ev.inning}回表</div><div class="nm"><span class="nmt">${G.names.opp.name}の攻撃</span></div><div class="sub">味方の投手が投げています</div>`;
  }else{
  setResult(cls, ev.label, `${top?G.names.opp.name:G.names.my.name}の攻撃　${ev.order}番 ${ev.name}${ev.isMe?'（あなた）':''}`, 0);   // まとめて進む打席は球数が無いので丸なし
  const bobj=ev.isMe?{isMe:true}:(top?G.lineup:G.myTeam.lineup).find(x=>x.name===ev.name)||ev;
  $('plB').innerHTML=`<div class="lab">打者　${ev.order}番</div><div class="nm"><span class="nmt">${plink(bobj,ev.name)}</span> <span class="hb ${ev.hand==='L'?'L':'R'}">${ev.hand==='L'?'左打':'右打'}</span></div>
      ${asTag(ev.isMe?PEN.team:bobj.team)}<div class="sub">${(G.pen&&!G.pen.wbc&&PEN&&PEN.teams&&(ev.isMe?(hasBat()?csLineB('ME',PEN.team):null):bobj.fid?csLineB(bobj.fid,bobj.team||(top?G.pen.opp:PEN.team)):null))||(ev.isMe?'あなた':`打率 ${ev.avg.toFixed(3).replace(/^0/,'')}　本塁打 ${Math.round(ev.hrRate*PA_SEASON)}`)}</div>`;
  }
  if(ev.pitcher){ const p=ev.pitcher;
    $('plP').innerHTML=`<div class="lab">投手 ${p.num}</div><div class="nm"><span class="nmt">${plink(p,p.name)}</span> <span class="hb ${p.hand}">${p.hand==='L'?'左投':'右投'}</span></div>${asTag(p.isMe?PEN.team:p.team)}<div class="sub">最速${p.velo}km/h・${p.types.length}球種</div>`; }
  $('plist').innerHTML=`<div class="empty">${ev.inning}回${top?'表':'裏'}　観戦中（1.5秒ごとに表示・スキップで飛ばせます）</div>`; $('plist').classList.remove('none');
  if(ev.bip) setView('ground'); else renderGround();
}

/* ---- 試合開始時のタイトル演出（相手打線の発表） ---- */
let titleTimer=null;
function showTitle(){
  if(G.pen){
    const p=G.pen;
    $('tin').innerHTML=`<div class="t1">${p.wbc?`🌏 WBC ${{pool:'1次ラウンド',semi:'準決勝',final:'決勝'}[p.stage]}`:p.allstar?`⭐ オールスター 第${p.asDay}戦`:p.ps?`🏆 ${p.psName} 第${p.gameNo}戦`:`${PEN?PEN.year+'年目 ':''}第${p.day+1}試合`}</div>
      ${(()=>{const n=p.wbc?`日本 vs ${TEAM[p.opp]?TEAM[p.opp].name:p.opp}`:p.allstar&&typeof AS_LG!=='undefined'?`${AS_LG[p.lg].name} vs ${AS_LG[p.lg==='セ'?'パ':'セ'].name}`:'vs '+(p.opp&&typeof TEAM!=='undefined'&&TEAM[p.opp]?TEAM[p.opp].name:G.names.opp.name);
        return `<div class="t2" style="font-size:min(26px,${Math.min(6.4,86/n.length).toFixed(1)}vw)">${n}</div>`})()}
      <div class="t3">${G.tw?`先発登板・二刀流（DHなし ${G.me.order}番）`:G.bat?(p.kind==='pinch'?`${G.pinch.inning}回裏ごろ 代打で出場`:`スタメン ${G.me.order}番で出場`):p.kind==='start'?'先発登板':p.kind==='closer'?'9回表 抑えで登板':`${G.inning}回表 中継ぎで登板`}</div>
      <div class="t4">${G.bat?`相手先発：${G.pits[0].name}（${G.pits[0].hand==='L'?'左':'右'}・最速${G.pits[0].velo}km/h・${G.pits[0].types.join('・')}）`:`相手 ${oppTot()} − ${myTot()} 味方　／相手打線：${LINEUPS[OPP.pattern].name}`}</div>
      ${G.mission?`<div class="talk"><div class="bub r" style="animation-delay:.5s">今日のミッションだ。<b>${G.mission.text}</b>。${p.allstar?'達成したら、このオールスターのチームの中での評価を上げてやる。起用も変わるぞ。':p.wbc?'達成したら、代表チームの中での評価を上げてやる。起用も変わるぞ。':p.ps?'達成したら、来季の評価に加えてやる。':'達成したら評価を上げてやる。'}頼むぞ。</div>
        <div class="chars"><div class="ch" style="visibility:hidden">${svgPlayer()}</div><div class="ch" style="animation-delay:.2s">${svgManager()}<span>${(M=>M?mgrName(M):'監督')(typeof evGameMgr==='function'&&evGameMgr())}</span></div></div></div>`:''}
      <button class="tclose" onclick="hideTitle()">閉じる</button>`;
    const t=$('title'); t.classList.remove('hide'); t.style.display=''; t.scrollTop=0;
    clearTimeout(titleTimer); if(!G.mission) titleTimer=setTimeout(hideTitle,3200); return;
  }
  const L=LINEUPS[OPP.pattern];
  $('tin').innerHTML=`<div class="t1">本日の相手打線</div>
    <div class="t2">${L.name}</div>
    <div class="t3">${HANDS[OPP.hand].name}</div>
    <div class="t4">${L.desc}</div>
    <div class="ord">${G.lineup.map(b=>`<span class="${b.type==='フルスイング'||b.type==='アスリート'?'big':''}">${b.order}番 ${b.hand==='R'?'右':'左'}・${b.type}</span>`).join('')}</div>
    <div class="t4">味方打線：${G.myTeam.name}（${G.myTeam.hand}）</div>
    ${(()=>{ const k=G.lineup.filter(x=>C.vs&&C.vs[vsKey(x)]&&C.vs[vsKey(x)].n>=6).length; return k?`<div class="t4" style="color:#f3dfa0">相手打線の${k}人は、あなたとの対戦データを持っている</div>`:''; })()}
    <button class="tclose" onclick="hideTitle()">閉じる</button>`;
  const t=$('title'); t.classList.remove('hide'); t.style.display='';
  clearTimeout(titleTimer); titleTimer=setTimeout(hideTitle,3200);
}
// イニング終了時：相手ベンチの分析を表示
function showScout(lines){
  const lb=G.lastBottom;
  $('tin').innerHTML=`<div class="t1">${G.inning-1}回終了</div>
    <div class="t2" style="font-size:min(30px,7vw)">相手 ${oppTot()} − ${myTot()} 味方</div>
    ${lb?`<div class="bot">⚾ ${lb.inning}回裏 味方の攻撃：<b>${lb.txt}</b>${lb.ev.length?'<br><small>'+lb.ev.join(' / ')+'</small>':''}</div>`:''}
    ${lines.length?`<div class="rep">📋 相手ベンチの分析（傾向を率で計算し直し）<br>・${lines.join('<br>・')}</div>`:''}
    <button class="tclose" onclick="hideTitle()">閉じる</button>`;
  const t=$('title'); t.classList.remove('hide'); t.style.display='';
  clearTimeout(titleTimer);   // イニング終了の表示は「閉じる」を押すまで出しておく
}
// 降板
function showPulled(why){
  const st=G.st;
  $('tin').innerHTML=`<div class="t1">監督がマウンドへ</div>
    <div class="t2" style="color:#ff8a7a">降板</div>
    <div class="t3">${why}</div>
    <div class="t4">${fmtIP(st.outs)}回 ${st.pitches}球 被安打${st.hits} 奪三振${st.k} 与四死球${st.bb} 失点${st.runs}<br>相手 ${oppTot()} − ${myTot()} 味方</div>
    <button class="tclose" onclick="hideTitle()">閉じる</button>`;
  const t=$('title'); t.classList.remove('hide'); t.style.display='';
  clearTimeout(titleTimer);
}
// 試合終了
function showFinal(res,dec){
  const st=G.st;
  $('tin').innerHTML=`<div class="t1">試合終了</div>
    <div class="t2" style="color:${res==='W'?'#ff8a7a':res==='L'?'#8ec5ff':'#ddd'}">${{W:'勝利！',L:'敗戦',T:'引き分け'}[res]}</div>
    <div class="t3">相手 ${oppTot()} − ${myTot()} 味方</div>
    ${liveLS(true)}
    <div class="t4">${G.bat?`${G.pname}：${st.pa?batLineTxt(st):'打席なし'}${st.cs?` 盗塁死${st.cs}`:''}`:`${dec==='勝'?'勝利投手':dec==='負'?'敗戦投手':dec==='S'?'セーブ':dec==='H'?'ホールド':'勝敗つかず'}${G.result.cg?'（完投）':''}　${fmtIP(st.outs)}回 ${st.pitches}球 失点${st.runs}${G.tw&&G.bst?`<br>打撃：${G.bst.pa?batLineTxt(G.bst):'打席なし'}`:''}`}</div>
    ${talkScene()}
    ${G.bat?'':'<div class="tap">記録は「試合記録」タブでいつでも見られます</div>'}<button class="tclose" onclick="hideTitle()">閉じる</button>`;
  const t=$('title'); t.classList.remove('hide'); t.style.display=''; t.scrollTop=0;
  clearTimeout(titleTimer);
}

/* ---- 試合後のひとこと（左下に自分、右下に監督） ---- */
function talkData(){
  const st=G.st, ip=st.outs/3, dec=G.result.dec, relief=!!(G.pen&&G.pen.kind!=='start');
  const decTxt={'勝':'、勝利投手','負':'、敗戦投手','S':'、セーブ','H':'、ホールド'}[dec]||'';
  const mine=`${fmtIP(st.outs)}回${st.pitches}球、被安打${st.hits}、奪三振${st.k}、四死球${st.bb}、失点${st.runs}${decTxt}${G.tw&&G.bst&&G.bst.pa?`、打っては${batLineTxt(G.bst)}`:''}`;
  // 点数（0〜100）
  let sc;
  if(relief) sc=72-st.runs*14-st.bb*5-Math.max(0,st.hits-1)*5+st.k*4+({'S':10,'H':6,'勝':4,'負':-8}[dec]||0)-(st.outs<3?10:0);
  else sc=55+Math.min(st.outs,27)*0.8-st.runs*6-st.bb*3-st.hr*3+st.k*1.5-Math.max(0,st.hits-ip)*2+({'勝':6,'負':-6}[dec]||0)+(G.result.cg?5:0);
  sc=clamp(Math.round(sc),0,100);
  // 悪かったところ・良かったところ（いちばん目立つものを選ぶ）
  const bad=[], good=[], ppi=ip?st.pitches/ip:99;
  if(st.runs>=4) bad.push([st.runs*2,`${st.runs}点取られたところ`]);
  else if(st.runs>=1&&relief) bad.push([st.runs*3,`${st.runs}点を許したところ`]);
  else if(st.runs>=2) bad.push([st.runs,`${st.runs}点取られたところ`]);
  if(st.hr>=1) bad.push([st.hr*3,`${st.hr}本のホームランを打たれたところ`]);
  if(st.bb>=3||(relief&&st.bb>=1)) bad.push([st.bb*2,`${st.bb}つの四死球を出したところ`]);
  if(!relief&&st.outs<15) bad.push([5,`${fmtIP(st.outs)}回で降りたところ`]);
  if(ip>=1&&ppi>=17) bad.push([3,'球数が多かったところ']);
  if(st.hits>=4&&st.hits>=ip*1.2) bad.push([st.hits*0.5,`ヒットを${st.hits}本打たれたところ`]);
  if(st.k===0&&st.bf>=6) bad.push([2,'三振が取れなかったところ']);
  if(st.runs===0&&st.outs>=3) good.push([6,'無失点に抑えたところ']);
  if(st.k>=Math.max(3,ip)) good.push([st.k,`${st.k}個の三振を奪ったところ`]);
  if(st.bb===0&&st.bf>=4) good.push([4,'四死球を出さなかったところ']);
  if(!relief&&st.outs>=21) good.push([st.outs/3,`${fmtIP(st.outs)}回まで投げたところ`]);
  if(ip>=1&&ppi<=14) good.push([3,'少ない球数でテンポよく投げたところ']);
  if(ip>=2&&st.hits<=ip*0.6) good.push([4,'ヒットをほとんど打たれなかったところ']);
  if(dec==='S') good.push([8,'最後を締めてセーブを挙げたところ']);
  if(dec==='H') good.push([6,'リードを守ってつないだところ']);
  if(dec==='勝') good.push([5,'チームに勝ちを呼び込んだところ']);
  const top=a=>a.sort((x,y)=>y[0]-x[0])[0];
  const b=top(bad), g=top(good);
  return {mine, sc, bad:b?b[1]:'強いて言えばボール先行になった場面', good:g?g[1]:'最後まで逃げずに腕を振ったところ'};
}
// ユニフォームの色（ペナントでは所属球団に寄せる。1試合モードは紺）
const DEF_UNI={cap:'#1d2a4a',brim:'#1d2a4a',cl:'#f5c542',ch:'B',jersey:'#f4f4f4',pin:0,chest:'',chc:'#1d2a4a',chs:'',num:'#1d2a4a',nums:'',sl:'#1d2a4a',under:'#1d2a4a',pants:'#f4f4f4',panel:0,trim:'#1d2a4a',jk:'#1f3c7a',jt:'#e8e8e8'};
function curUni(){
  const pen=typeof PEN!=='undefined'&&PEN;
  if(G&&G.pen&&G.pen.allstar&&pen&&typeof asUni==='function') return asUni(G.pen.lg,PEN.team);   // オールスターのユニフォーム（左肩に所属球団のワッペン）
  const id = G&&G.pen ? (G.pen.team||(pen&&PEN.team)) : (SCREEN==='pennant'&&pen ? PEN.team : null);
  return (id&&typeof TEAM!=='undefined'&&TEAM[id])||DEF_UNI;
}
// 自分：シンプルな野球選手のイラスト（球団ごとに帽子・つば・胸の文字・背番号・袖・アンダーシャツの色を変える）
let SVG_UID=0;
const SCRIPT_FONT=`font-family="'Brush Script MT','Segoe Script','Dancing Script',cursive" font-style="italic"`;
const UNI_FONT={cond:`font-family="Impact,'Arial Narrow','Roboto Condensed','sans-serif-condensed',sans-serif-condensed,sans-serif" font-weight="900"`, script:SCRIPT_FONT+' font-weight="700"', serif:`font-family="Georgia,'Times New Roman','Noto Serif',serif" font-weight="900"`, block:'font-family="Arial Black, Arial, sans-serif" font-weight="900"', italic:'font-family="Arial Black, Arial, sans-serif" font-weight="900" font-style="italic"'};
const capFont=u=>{ const f=u.capf||(u.chf==='script'?'script':null); return f?UNI_FONT[f]:'font-family="sans-serif" font-weight="900"'; };
function svgPlayer(u,o){ u=u||curUni(); const bat=o&&o.bat!=null?o.bat:((G&&G.bat)||(typeof isBat==='function'&&isBat()));   // o：ほかの選手を描くとき（背番号・野手か）
  const jersey=u.jersey||'#f4f4f4', pinC=u.pin===1?u.trim:u.pin, under=u.under||u.trim, num=o&&o.num!=null?o.num:(bat?B_NUM:MYNUM);
  const pin=pinC?[28,33,38,43,48,52,57,62,67,72].map((x,i)=>`<path d="M${x} 89 L${x} 128" stroke="${u.pin2&&i%2?u.pin2:pinC}" stroke-width="0.8" opacity=".75"/>`).join(''):'';   // pin2 があれば2色の縦じま（日本代表の紺と赤）
  // 三角の波の模様（zig）：縦に走るジグザグの線
  const zig=u.zig?[27,33,39,45,55,61,67,73].map(x=>{ let d=`M${x} 86`; for(let y=86,k=0;y<128;y+=2.6,k++) d+=` L${x+(k%2?1.7:-1.7)} ${y+2.6}`; return `<path d="${d}" fill="none" stroke="${u.zig}" stroke-width="0.75" stroke-linejoin="miter" opacity=".8"/>`; }).join(''):'';
  // 大きな柄（shapes：[色, 多角形の点]）と細いストライプ（fine：斜めの細線＝ヘリンボーン）。胴の形で切り抜く
  const shapes=(u.shapes||[]).map(([c,pts])=>`<polygon points="${pts}" fill="${c}"/>`).join('');
  const fine=u.fine?Array.from({length:22},(_,k)=>{ const x=24+k*2.5; return `<path d="M${x} 86 L${x+(x<50?-2.2:2.2)} 128" stroke="${u.fine}" stroke-width="0.3" opacity=".22"/>`; }).join(''):'';   // 細いストライプ（中央から外へ少し開く）
  const jid='jc'+(++SVG_UID);   // 模様は胴の形で切り抜く
  const panel=u.panel?`<path d="M62 90 Q70 88 74 92 L76 128 L66 128 Z" fill="${u.panel}"/>`:'';
  // 胸の文字：書体（筆記体・セリフ体・太ゴシック・斜体）とアーチ。球団のロゴ・マークそのものは描かない
  const cf=u.cf||(u.chf==='script'?'script':'block'), L=(u.chest||'').length, chs=u.chs?`stroke="${u.chs}" stroke-width="${cf==='script'?0.8:0.7}" paint-order="stroke"`:'';
  const cfs=cf==='script'?(L<=4?12.5:L<=5?12:L<=6?11:L<=7?10.5:9):(L>=8?6:L>=6?7:9);
  const aid='ar'+(++SVG_UID);
  const chest=!u.chest?'':u.arch
    ? `<path id="${aid}" d="M26 106 Q50 92 74 106" fill="none"/><text font-size="${cfs}" fill="${u.chc||u.trim}" ${chs} ${UNI_FONT[cf]} letter-spacing="0.3"><textPath href="#${aid}" startOffset="50%" text-anchor="middle">${u.chest}</textPath></text>`   // アーチ状の胸文字
    : cf==='script'
    ? `<text x="50" y="102" font-size="${cfs}" fill="${u.chc||u.trim}" ${chs} text-anchor="middle" ${UNI_FONT.script} transform="rotate(-8 50 100)">${u.chest}</text>`   // 筆記体
    : cf==='cond'
    ? `<text x="50" y="103" font-size="9" fill="${u.chc||u.trim}" ${chs} text-anchor="middle" ${UNI_FONT.block} textLength="${Math.min(40,L*4.6)}" lengthAdjust="spacingAndGlyphs">${u.chest}</text>`   // 細長い太字（字の幅を詰める）
    : `<text x="${u.panel?46.5:50}" y="102" font-size="${cfs}" fill="${u.chc||u.trim}" ${chs} text-anchor="middle" ${UNI_FONT[cf]} letter-spacing="0.3">${u.chest}</text>`;   /* 脇のパネルがあるときは少し左へ */
  // 袖のライン（外側から順に。なければ1本）
  const slvL=(u.slv||[u.sl||u.trim]), sw=slvL.length>1?1.5:2.5;
  const sleeves=slvL.map((c,k)=>`<path d="M${19+k*1.4} ${103-k*1.9} L${12+k*1.4} ${107-k*1.9}" stroke="${c}" stroke-width="${sw}"/><path d="M${81-k*1.4} ${103-k*1.9} L${88-k*1.4} ${107-k*1.9}" stroke="${c}" stroke-width="${sw}"/>`).join('');
  const stars=u.stars?`<text x="56" y="106.5" font-size="3.6" text-anchor="middle" transform="rotate(-8 50 100)">${u.stars.map(c=>`<tspan fill="${c}" stroke="#fff" stroke-width="0.15">★</tspan>`).join('')}</text>`:'';
  // 左肩のワッペン：所属球団の2色の1:1ストライプ
  const pid='wp'+(++SVG_UID);
  const patch=u.patch?`<defs><clipPath id="${pid}"><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5"/></clipPath></defs><g transform="translate(80.6 99.4) rotate(36)"><g clip-path="url(#${pid})">${[0,1,2,3].map(i=>`<rect x="${-3.2+i*1.6}" y="-3.2" width="1.6" height="6.4" fill="${u.patch[i%2]}"/>`).join('')}</g><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="none" stroke="#0008" stroke-width="0.45"/></g>`:'';
  const strip=c=>`<path d="M${c} 94 Q${c<50?12:88} 104 ${c<50?16:84} 118" fill="none" stroke="${jersey}" stroke-width="9" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 100 130" width="92" height="120" aria-hidden="true">
  <ellipse cx="50" cy="126" rx="30" ry="4" fill="#0006"/>
  <defs><clipPath id="${jid}"><path d="M24 128 L26 92 Q50 82 74 92 L76 128 Z"/></clipPath></defs>
  <path d="M24 128 L26 92 Q50 82 74 92 L76 128 Z" fill="${jersey}" stroke="${u.trim}" stroke-width="1.5"/>
  <g clip-path="url(#${jid})">${shapes}${fine}${pin}${zig}</g>${panel}
  <path d="M50 88 L50 128" stroke="${u.trim}" stroke-width="1.2" opacity=".8"/>
  <path d="M44 86 Q50 92 56 86" fill="none" stroke="${u.neck||under}" stroke-width="4"/>
  ${chest}${stars}
  ${u.noNum?'':`<text x="50" y="121" font-size="14" font-weight="900" fill="${u.num||u.trim}" ${u.nums?`stroke="${u.nums}" stroke-width="0.9" paint-order="stroke"`:''} text-anchor="middle" font-family="Arial Black, Arial, sans-serif">${num}</text>`}
  <path d="M24 94 Q12 104 16 118" fill="none" stroke="${under}" stroke-width="9" stroke-linecap="round"/>
  <path d="M76 94 Q88 104 84 116" fill="none" stroke="${under}" stroke-width="9" stroke-linecap="round"/>
  <path d="M24 94 Q15 100 15 106" fill="none" stroke="${jersey}" stroke-width="10" stroke-linecap="butt"/>
  <path d="M76 94 Q85 100 85 106" fill="none" stroke="${jersey}" stroke-width="10" stroke-linecap="butt"/>
  ${sleeves}${patch}
  ${bat?`<path d="M84 118 L97 70" stroke="#c99a5b" stroke-width="5" stroke-linecap="round"/><path d="M84 118 L88 104" stroke="#8a5a2b" stroke-width="5.5" stroke-linecap="round"/><circle cx="84" cy="118" r="5" fill="#f2c9a0"/>`:`<ellipse cx="86" cy="118" rx="9" ry="8" fill="#a8652c" stroke="#5b3410" stroke-width="1.5"/>`}
  <circle cx="16" cy="119" r="5" fill="#f2c9a0"/>
  <rect x="44" y="72" width="12" height="12" fill="#f2c9a0"/>
  <circle cx="50" cy="56" r="20" fill="#f2c9a0"/>
  <path d="M29 52 Q30 32 50 31 Q70 32 71 52 Z" fill="${u.cap}"/>
  <path d="M60 50 Q76 49 82 54 L60 54 Z" fill="${u.brim||u.cap}"/>
  <text x="50" y="48" font-size="${(u.capf||u.chf)==='script'?12:u.capf==='serif'?11:10}" fill="${u.cl}" ${u.cls?`stroke="${u.cls}" stroke-width="0.8" paint-order="stroke"`:''} text-anchor="middle" ${capFont(u)}>${u.ch}</text>
  <circle cx="43" cy="60" r="2.2" fill="#222"/><circle cx="57" cy="60" r="2.2" fill="#222"/>
  <path d="M44 67 Q50 71 56 67" fill="none" stroke="#a0522d" stroke-width="2" stroke-linecap="round"/>
</svg>`; }
// 監督：サングラスにジャージ姿（ジャージと帽子は球団の色）
function talkScene(){
  if(!G||!G.result) return '';
  const t=G.bat?talkDataBat():talkData();
  return `<div class="talk">
    <div class="bub l">今日の成績は${t.mine}だった</div>
    <div class="bub r">${typeof oddThanks==='function'&&oddThanks()?oddThanks():`今日のお前は<b>${t.sc}点</b>だな。${t.bad}は反省点だな。でも${t.good}は良かったな。${G.mission?(G.mission.ok?`ミッション「${G.mission.text}」も達成だ、よくやった！（${G.mission.got}）`:`ミッション「${G.mission.text}」は失敗だったな。`):''}このまま頼むぞ。`}</div>
    <div class="chars"><div class="ch">${svgPlayer()}<span>${G.pname||'自分'}</span></div><div class="ch">${svgManager()}<span>${PEN?(M=>mgrName(M)+'<br>'+mgrBadges(M))((typeof evGameMgr==='function'&&evGameMgr())||myMgr()):'監督'}</span></div></div>
  </div>`;
}
// ドラフト会議の結果（入団発表）
function showDraft(){
  const d=PEN.draft, t=TEAM[d.team];
  // 入団のひとこと：投手・野手・二刀流で変える（上位・中位・下位の3パターン）
  const kind=isBat()?'B':isTW()?'W':'P', pos=isBat()?POS_JP[PEN.bpos]:'';
  const MSG={
    P:[ 'ドラフト1位で来てもらったんだ、1年目から思いきり投げてくれ。期待してるぞ！',
        '上位で指名した期待の若手だ。早く一軍のマウンドに慣れてくれよ。',
        '下位指名だろうと関係ない。結果を出せば使う、それがうちのやり方だ。' ],
    B:[ `ドラフト1位で来てもらったんだ、1年目から思いきり振ってくれ。${pos}のレギュラーを獲りにこい！`,
        `上位で指名した期待の若手だ。まずは一軍の球に慣れて、${pos}の争いに割って入ってくれよ。`,
        '下位指名だろうと関係ない。打って結果を出せば使う、代打からでも這い上がってこい。' ],
    W:[ 'ドラフト1位で来てもらったんだ、投げても打っても遠慮はいらない。二刀流で球界を驚かせてくれ！',
        '上位で指名した期待の二刀流だ。マウンドと打席、両方で一軍の球に早く慣れてくれよ。',
        '下位指名だろうと関係ない。腕でも、バットでも、結果を出した方で使う。それがうちのやり方だ。' ],
  }[kind];
  const msg = d.pick===1 ? MSG[0] : d.pick<=3 ? MSG[1] : MSG[2];
  $('tin').innerHTML=`<div class="t1">プロ野球ドラフト会議</div>
    <div class="t2" style="font-size:min(26px,${Math.min(6.4,84/t.name.length).toFixed(1)}vw)">${t.name}</div>
    <div class="t3">ドラフト<b style="font-size:1.4em">${d.pick}</b>位　${PEN.pname}（${isBat()?POS_JP[PEN.bpos]:isTW()?'二刀流':'投手'}・18歳）${PEN.genius?'　<span class="genius">✨ 天才</span>':''}</div>
    ${d.comp?`<div class="t4">${d.comp}球団が1位指名で競合！ 抽選の結果、${t.short}が交渉権を獲得</div>`:''}
    <div class="talk"><div class="bub r" style="animation-delay:.4s">ようこそ${t.short}へ！ ${msg}</div>
      <div class="chars"><div class="ch">${svgPlayer(t)}<span>${PEN.pname}</span></div><div class="ch" style="animation-delay:.2s">${svgManager(t)}<span>監督</span></div></div></div>
    <button class="tclose" onclick="hideTitle()">閉じる</button>`;
  const o=$('title'); o.classList.remove('hide'); o.style.display=''; o.scrollTop=0;
  clearTimeout(titleTimer);
}
let titleHideT=null;
function hideTitle(){
  const t=$('title'); if(t.style.display==='none')return;
  clearTimeout(titleTimer); t.classList.add('hide');
  clearTimeout(titleHideT); titleHideT=setTimeout(()=>{t.style.display='none';t.classList.remove('hide')},450);
}

/* ---- 持ち球選択画面（普通のページとして表示。ゲーム画面は隠す） ---- */
// 画面の切り替え（どれも普通のページとして表示。画面に固定しない）
const SCREENS={mode:'modeScreen',setup:'setup',game:'mainWrap',pennant:'penScreen',prof:'profScreen',hall:'hallScreen'};
let prevScreen='mode';
function showScreen(name){
  if(name!=='prof') prevScreen=name;
  SCREEN=name;
  for(const k in SCREENS) $(SCREENS[k]).style.display = k===name?'':'none';
  if(name!=='game') hideTitle();
  window.scrollTo(0,0);
  if(name==='game'&&G) renderAll();
  if(name==='pennant') renderPennant();
  if(name==='mode') renderMode();
  if(name==='hall'&&typeof renderHall==='function') renderHall();
}
function showSetup(on){ showScreen(on?'setup':'game'); }
function renderMode(){
  // 続きから：通常の試合は途中なら、ペナントの試合は「今の登板の試合」のときだけ
  const inGame = !!(G && !G.over && G.st && G.pen && ((typeof liveForPending==='function' && liveForPending()) || G.pen.tryout));
  const penOn = PEN && (!PEN.released || PEN.tryout);   // 戦力外でもトライアウト中なら続きがある
  $('modeIn').innerHTML=`<h2>⚾ スポナビ風ペナント</h2><p>プロ野球選手（投手か野手）になって、ペナント（143試合）を戦います。</p>
    ${inGame?`<button class="mode-btn hi" id="mResume"><b>▶ 試合の続き</b><small>ペナントの途中の試合（${G.inning}回）に戻ります</small></button>`:''}
    <button class="mode-btn ${!inGame?'hi':''}" id="mPen"><b>🏆 ペナントモード（143試合）</b><small>${penOn?`${PEN.teams&&TEAM[PEN.team]?TEAM[PEN.team].short+'・':''}${PEN.pos==='B'?'野手・':''}${PEN.year}年目・第${PEN.day}試合の続きから。役割：${roleName(PEN.role)}`:'投手か野手を選び、12球団の希望球団に18歳で入団。成績で配置転換・スタメン争い・トレード・タイトル・年俸が決まります'}</small></button>
    ${penOn?`<button class="btn" id="mPenNew" style="width:100%">ペナントを最初からやり直す</button>`:''}
    <button class="mode-btn" id="mHall"><b>🏛 歴代選手・マイチーム</b><small>引退した選手（${HALL.length}人）。キャリアハイの年の選手でマイチームを作り、リンクで送り合ってオート対戦</small></button>`;
  const on=(id,f)=>{const e=document.getElementById(id); if(e) e.onclick=f;};
  on('mResume',()=>showScreen('game'));
  on('mHall',()=>showScreen('hall'));
  on('mPen',()=>{ if(PEN&&(!PEN.released||PEN.tryout)) showScreen('pennant'); else openSetup('pennant'); });
  let armed=false;
  on('mPenNew',function(){ if(!armed){armed=true;this.textContent='もう一度押すと、今のペナントを消して最初から';return} openSetup('pennant'); });
}
// 選手データ画面（名前をタップ）
const PROF={}, PLINK_N={}; let PROFN=0;
function plinkKey(obj){ if(PROFN>600){ for(const k in PROF) delete PROF[k]; for(const k in PLINK_N) delete PLINK_N[k]; PROFN=0; } const k='p'+(PROFN++); PROF[k]=obj; if(obj&&obj.name&&!obj.isMe) PLINK_N[obj.name]=obj; return k; }
const plink=(obj,label)=>`<span class="plink" data-pk="${plinkKey(obj)}">${label}</span>`;
document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('.plink'); if(t&&PROF[t.dataset.pk]) showProfile(PROF[t.dataset.pk]); });
function bar10(v){ return `<span style="display:inline-block;width:110px;height:7px;background:#2b3d33;border-radius:9px;vertical-align:middle;overflow:hidden"><i style="display:block;height:100%;width:${v}%;background:linear-gradient(90deg,#3fb96b,#f5c542)"></i></span> ${v}`; }
function showProfile(o){
  let h='';
  const cellNames=(set,hand)=>[...(set||[])].map(k=>{const[r,c]=String(k).split(',').map(Number);return courseName(r,c,hand)}).join('、')||'-';
  if(o.isMe&&typeof meProfileHTML==='function'&&typeof PEN!=='undefined'&&PEN&&PEN.teams&&(SCREEN==='pennant'||(G&&G.pen))){ h=meProfileHTML(); }   // ペナント：起用方法・年俸・契約・評価・能力・成績をまとめて
  else if(o.isMe&&typeof isBat==='function'&&isBat()){
    const a=PEN.babil;
    h=`<h2>${PEN.pname}</h2><div class="prow"><span class="hb ${PEN.bhand}">${bhandJP(PEN.bhand)}</span><span class="rbadge">${roleName(PEN.role)}${PEN.order?`・${PEN.order}番`:''}</span>${btypeBadge(PEN.btype)}${tchip(PEN.team)}<span class="hint">${PEN.age}歳・${POS_JP[PEN.bpos]}${PEN.draft?`・ドラフト${PEN.draft.pick}位`:''}</span></div>
      <table><tr><th>ミート</th><td>${bar10(a.meet)}<br><small>狙えるコース${meetCells(abPerf(a.meet))}マス・球速 −${meetTol(abPerf(a.meet))}〜+${meetUp(abPerf(a.meet))}km/h</small></td></tr><tr><th>パワー</th><td>${bar10(a.power)}</td></tr><tr><th>走力</th><td>${bar10(a.speed)}</td></tr><tr><th>選球眼・技術</th><td>${bar10(a.eye)}</td></tr><tr><th>守備</th><td>${bar10(a.def??50)}</td></tr>
      <tr><th>今年</th><td style="font-size:13px">${batLine(PEN.ss)}</td></tr><tr><th>通算</th><td style="font-size:13px">${batLine(PEN.career)}</td></tr><tr><th>年俸</th><td>${yen(PEN.salary)}</td></tr><tr><th>所持金</th><td>${yen(PEN.money||0)}${PEN.house?'　🏠':''}</td></tr>${typeof cbList==='function'&&cbList().length?`<tr><th>コーチ</th><td style="font-size:12px">${cbList().map(x=>`<b>${x.name}</b><br>${x.t}`).join('<br>')}</td></tr>`:''}
      ${PEN.titles&&PEN.titles.length?`<tr><th>タイトル</th><td style="font-size:13px">${titleList()}</td></tr>`:''}</table>`;
  }else if(o.isMe){
    const pen=PEN&&(G&&G.pen||SCREEN==='pennant');
    h=`<h2>${pen?PEN.pname:(G&&G.pname||'あなた')}</h2><div class="prow"><span class="hb ${PHAND}">${PHAND==='L'?'左投':'右投'}</span>${pen?`<span class="rbadge">${roleName(PEN.role)}</span>${PEN.team?tchip(PEN.team):''}<span class="hint">${PEN.age}歳${PEN.draft?`・ドラフト${PEN.draft.pick}位`:''}</span>`:''}</div>
      <table>${pen&&PEN.abil?`<tr><th>球速</th><td>${PEN.abil.velo}km/h</td></tr><tr><th>コントロール</th><td>${bar10(PEN.abil.control)}</td></tr><tr><th>スタミナ</th><td>${bar10(PEN.abil.stamina)}</td></tr>`:`<tr><th>ストレート平均</th><td>${PVELO}km/h</td></tr>`}
      <tr><th>持ち球</th><td>${(pen&&PEN.rep?PEN.rep:REP).map((t,i)=>{ if(pen&&PEN.plev) return `${ptn(t)}　Lv.${lvOf(t)}`; const L=lev(t); return `${ptn(t)}${L==='決'?'（決め球）':L==='少'?'（少し）':''}`}).join('<br>')}</td></tr>
      ${pen?`<tr><th>今年</th><td style="font-size:13px">${statLine(PEN.ss)}</td></tr><tr><th>通算（ペナント）</th><td style="font-size:13px">${statLine(PEN.career)}</td></tr><tr><th>年俸</th><td>${yen(PEN.salary)}</td></tr><tr><th>所持金</th><td>${yen(PEN.money||0)}${PEN.house?'　🏠':''}</td></tr>${typeof cbList==='function'&&cbList().length?`<tr><th>コーチ</th><td style="font-size:12px">${cbList().map(x=>`<b>${x.name}</b><br>${x.t}`).join('<br>')}</td></tr>`:''}${isTW()?`<tr><th>打撃（二刀流）</th><td style="font-size:13px">${bhandJP(PEN.bhand)}・ミート${PEN.babil.meet}・パワー${PEN.babil.power}・走力${PEN.babil.speed}・選球眼${PEN.babil.eye}<br>今年：${batLine(PEN.bss||batStat())}</td></tr>`:''}${PEN.titles&&PEN.titles.length?`<tr><th>タイトル</th><td style="font-size:13px">${titleList()}</td></tr>`:''}${PEN.trades&&PEN.trades.length?`<tr><th>移籍</th><td style="font-size:13px">${PEN.trades.map(t=>`${t.y}年目 ${TEAM[t.from].short}→${TEAM[t.to].short}`).join('<br>')}</td></tr>`:''}`
        :`<tr><th>通算</th><td>防御率 ${fmtRate(C.runs,C.outs)}・${C.w}勝${C.l}敗・奪三振${C.k}</td></tr>`}</table>`;
  }else if(o.isP){
    h=`<h2>${o.name}</h2><div class="prow"><span class="hb ${o.hand}">${o.hand==='L'?'左投':'右投'}</span><span class="hint">背番号 ${o.num}</span></div>
      <table><tr><th>最速</th><td>${o.velo}km/h</td></tr>
      <tr><th>変化球・持ち球</th><td>${o.types.map(t=>t==='ストレート'?`${ptn(t)}　Lv.${pitLv(o,t)}`:`${ptn(t)}　Lv.${pitLv(o,t)}${t===kimeOf(o)?'（決め球）':''}`).join('<br>')}</td></tr>
      ${o.style?`<tr><th>配球の傾向</th><td>${PSTYLE_JP[o.style]}</td></tr>`:''}
      ${o.plv?`<tr><th>決め球</th><td>${kimeOf(o)||'なし'}</td></tr>`:''}
      <tr><th>コントロール</th><td>${bar10(o.control)}</td></tr><tr><th>スタミナ</th><td>${bar10(o.stamina)}</td></tr>
      <tr><th>総合</th><td>${o.q<0.92?'好投手':o.q<1.05?'標準':'打ちやすい'}</td></tr>
      ${o.cpuP?`<tr><th>球団・年齢</th><td>${o.team?tchip(o.team):''} ${o.age||'-'}歳</td></tr>`:''}
      ${o.cs?`<tr><th>今季成績</th><td style="font-size:13px">${o.cs.g}登板（先発${o.cs.gs}） ${o.cs.w}勝${o.cs.l}敗${o.cs.sv?` ${o.cs.sv}S`:''}<br>防御率 <b>${o.cs.outs?(o.cs.er*27/o.cs.outs).toFixed(2):'-.--'}</b>　${fmtIP(o.cs.outs)}回　奪三振${o.cs.k}</td></tr>`:''}</table>`;
  }else{
    h=`<h2>${o.name}</h2><div class="prow"><span class="hb ${o.hand}">${o.hand==='L'?'左打':'右打'}</span>${o.type?`<span class="rbadge">${o.type}</span>`:''}${o.order?`<span class="hint">${o.order}番</span>`:''}</div>
      <table><tr><th>${o.cpuF?"打率（能力の目安）":"打率"}</th><td>${o.avg!=null?o.avg.toFixed(3).replace(/^0/,''):'-'}</td></tr>
      <tr><th>${o.cpuF?"本塁打（能力の目安・年間）":"本塁打（年間ペース）"}</th><td>${o.hrRate!=null?Math.round(o.hrRate*PA_SEASON):'-'}本</td></tr>
      ${o.power!=null?`<tr><th>パワー</th><td>${bar10(abS(o.power))}</td></tr><tr><th>ミート</th><td>${bar10(abS(o.contact))}</td></tr><tr><th>走力</th><td>${bar10(abS(o.speed))}</td></tr><tr><th>選球眼</th><td>${bar10(abS(o.eye))}</td></tr>`:''}
      ${o.good?`<tr><th>得意コース</th><td>${cellNames(o.good,o.hand)}</td></tr><tr><th>苦手コース</th><td>${cellNames(o.bad,o.hand)}</td></tr>`:''}
      ${o.cpuF?`<tr><th>守備</th><td>${bar10(abS(o.cpuF.d))}<br><small>${POS_JP[o.cpuF.pos]||o.cpuF.pos||''}</small></td></tr><tr><th>球団・年齢</th><td>${o.team?tchip(o.team):''} ${o.cpuF.age||'-'}歳</td></tr>`:''}
      ${o.cs?`<tr><th>今季成績</th><td style="font-size:13px">${o.cs.g}試合　打率 <b>${o.cs.ab?f3(o.cs.h/o.cs.ab):'-'}</b>　${o.cs.hr}本塁打 ${o.cs.rbi}打点 ${o.cs.sb}盗塁<br>${o.cs.h}安打（二塁打${o.cs.d2}・三塁打${o.cs.d3}）　四球${o.cs.bb}　三振${o.cs.k}　出塁率 ${o.cs.pa?f3((o.cs.h+o.cs.bb)/o.cs.pa):'-'}</td></tr>`:''}
      ${o.res&&o.res.length?`<tr><th>今日の結果</th><td>${o.res.join(' / ')}</td></tr>`:''}</table>`;
  }
  $('profIn').innerHTML=`<div class="prof">${h}</div><button class="btn main" id="profBack">戻る</button>`;
  $('profBack').onclick=()=>showScreen(prevScreen);
  showScreen('prof');
}
$('toMode').onclick=()=>showScreen('mode');
let draft=new Set(REP), dHand=PHAND, dLev={...PLEV};
function renderSetup(){
  const PB_=MODE==='pennant'&&dPos==='B', PW_=MODE==='pennant'&&dPos==='W';
  if(MODE==='pennant'){
    $('poscards').innerHTML=[['P','投手'],['B','野手'],['W','二刀流']].map(([k,n])=>`<button class="btn ${dPos===k?'on':''}" data-pos="${k}">${n}</button>`).join('');
    [...$('poscards').children].forEach(el=>el.onclick=()=>{ const was=dPos; dPos=el.dataset.pos; if(was!==dPos){ setBudget(); abAuto(false); babAuto(false); if(dPos==='W') wAuto(false); } renderSetup(); });   // 持ち点は投手・野手・二刀流で違うので、変えたら割り振りはおまかせに戻す
    $('wNote').style.display=dPos==='W'?'':'none';
    $('bhandSec').style.display='';
    $('bhcards').innerHTML=[['R','右打ち'],['L','左打ち'],['S','両打ち']].map(([k,n])=>`<button class="btn ${dBhand===k?'on':''}" data-bh="${k}">${n}</button>`).join('');
    [...$('bhcards').children].forEach(el=>el.onclick=()=>{ const old={meet:bBase('meet'),speed:bBase('speed'),power:bBase('power')}; dBhand=el.dataset.bh;
      for(const k of ['meet','speed','power']) BAB[k]=r1(clamp(BAB[k]-old[k]+bBase(k),bBase(k),100));   // 下限の差ぶんだけ動かす
      renderSetup(); });
    $('bhandNote').textContent=dBhand==='L'?'左打ち：右ピッチャーに少し三振しづらい':dBhand==='R'?'右打ち：左ピッチャーに少し三振しづらい':'両打ち：打席ごとに左右を選べる（相手投手と逆の打席に自動で入り、変えることもできる）';
    $('bposcards').innerHTML=POSS.map(k=>`<button class="btn ${dBpos===k?'on':''}" data-bp="${k}">${POS_JP[k]}</button>`).join('');
    [...$('bposcards').children].forEach(el=>el.onclick=()=>{dBpos=el.dataset.bp;renderSetup()});
    ['セ','パ'].forEach(lg=>{ const box=$(lg==='セ'?'tcardsC':'tcardsP');
      box.innerHTML=NPB.filter(t=>t.lg===lg).map(t=>`<button class="tbtn ${dTeam===t.id?'on':''}" data-tm="${t.id}" style="--tc:${t.cap};--tl:${t.cl}"><i></i>${t.name}</button>`).join('');
      box.querySelectorAll('.tbtn').forEach(el=>el.onclick=()=>{dTeam=el.dataset.tm;renderSetup()}); });
    $('teamTrait').innerHTML=dTeam?`🏟 ${TEAM[dTeam].short}の特色：<b>${TRAIT_JP[dTeam]}</b>`:'球団ごとに「育ちやすい能力」の特色があります（選ぶとここに出ます）';
  }
  $('rcards').innerHTML=[['start','先発'],['relief','中継ぎ']].map(([k,n])=>`<button class="btn ${dRole===k?'on':''}" data-r="${k}">${n}</button>`).join('');
  [...$('rcards').children].forEach(el=>el.onclick=()=>{dRole=el.dataset.r;renderSetup()});
  $('handLab').textContent='利き腕（投げ）';
  $('handNote').textContent=MODE==='pennant'?(dHand==='L'?'左投げ：キャンプで外野手・一塁手へのコンバートが0.2ポイント安い':'右投げ：キャンプで二塁手・遊撃手・三塁手・捕手へのコンバートが0.2ポイント安い'):'';
  $('roleSec').style.display=MODE==='pennant'&&!PB_&&!PW_?'':'none';
  $('hcards').innerHTML=[['R','右投げ'],['L','左投げ']].map(([k,n])=>`<button class="btn ${dHand===k?'on':''}" data-k="${k}">${n}</button>`).join('');
  [...$('hcards').children].forEach(el=>el.onclick=()=>{store.played=true;dHand=el.dataset.k;renderSetup()});
  const nK=Object.entries(dLev).filter(([t,l])=>l==='決'&&draft.has(t)).length;
  $('pcards').innerHTML=PTYPES.filter(t=>t!=='スイーパー').map(t=>{const on=draft.has(t), L=dLev[t]||'普';
    return `<div class="pcard ${on?'on':''}"><button class="pck" data-t="${t}"><span class="chk">${on?'✓':''}</span><span><b>${t}</b><small>${PDESC[t]}</small></span></button>
      ${on?`<div class="lv">${['少','普','決'].map(l=>`<button class="lvb ${L===l?'on':''} ${l==='決'&&L!=='決'&&nK>=2?'dis':''}" data-t="${t}" data-l="${l}">${LEVN[l]}</button>`).join('')}</div>`:''}</div>`}).join('');
  $('pcards').querySelectorAll('.pck').forEach(el=>el.onclick=()=>{store.played=true;const t=el.dataset.t;draft.has(t)?draft.delete(t):draft.add(t);renderSetup()});
  $('pcards').querySelectorAll('.lvb').forEach(el=>el.onclick=()=>{store.played=true;const t=el.dataset.t,l=el.dataset.l;
    if(l==='決'&&dLev[t]!=='決'&&nK>=2){ $('lvwarn').textContent='決め球は2つまでです'; return; }
    $('lvwarn').textContent=''; dLev[t]=l; renderSetup()});
  $('repSec').style.display=MODE==='pennant'?'none':'';
  $('abilSec').style.display=MODE==='pennant'&&!PB_?'':'none';
  $('bAbilSec').style.display=PB_||PW_?'':'none';
  if(PW_){ renderAbil(); renderBAbil(); return; }
  if(PB_){ renderBAbil(); return; }
  if(MODE==='pennant'){ renderAbil(); return; }
  $('startGame').disabled=draft.size===0;
  $('startGame').textContent=!draft.size?'球種を1つ以上選んでください':`プレイボール（持ち球${draft.size}種）`;
}
/* ---- ペナント：持ち点（100〜200）で能力を決める ---- */
const BRK_TYPES=LEARN_TYPES;   // 最初はスイーパー以外の全部の変化球から選べる（スイーパーはスライダーからの進化のみ）
// 入団時の球種のLv（ストレートの伸びも同じ）：1段ごとに1・2・3・4・5点（Lv.1＝1点・Lv.2＝3点・Lv.3＝6点・Lv.4＝10点・Lv.5＝15点）。入団時はLv.5まで
const LV0_MAX=5, lvCost0=l=>{ l=+l||0; return l*(l+1)/2; };
let AB={budget:85,velo:130,control:20,stamina:20,brk:{},slv:3};
const V0=130, VCOST=5;   // 球速は130km/hが基礎。1km/hで5pt（0.1km/hで0.5pt）
const STA_COST=1;   // スタミナも1上げるのに1pt
const P_MAX0=50;   // 入団時のコントロール・スタミナの上限（球速は160km/hまで）
function abCost(a){ return r1((a.velo-V0)*VCOST+a.control+a.stamina*STA_COST+lvCost0(a.slv||3)+Object.values(a.brk).reduce((t,l)=>t+lvCost0(l),0)); }
// 二刀流は投手と野手の持ち点を足して0.75倍した点数を投打で分け合う
const W_MUL=1, isW=()=>MODE==='pennant'&&dPos==='W';
const wTotal=()=>r1(AB.budget*W_MUL);
// 打撃能力の下限：どれも0から
const bBase=k=>0;
const bat4Cost=b=>r1(['meet','power','speed','eye'].reduce((t,k)=>t+b[k]-bBase(k),0));
const pBudget=()=>r1(isW()?wTotal()-bat4Cost(BAB):AB.budget);   // 投手の能力に使えるポイント
const bBudget=()=>r1(isW()?wTotal()-abCost(AB):AB.budget);     // 打撃の能力に使えるポイント
function wStartBtn(){
  const left=r1(wTotal()-abCost(AB)-bat4Cost(BAB));
  $('startGame').disabled=left<-1e-6||!dTeam;
  $('startGame').textContent=!dTeam?'希望球団を選んでください':`入団（${TEAM[dTeam].short}・二刀流・残り${left}pt）`;
  return left;
}
function wAuto(random){   // 二刀流：投手6割・打撃4割で振り分け
  const T=wTotal(), keep=AB.budget; BAB_K.forEach(k=>BAB[k]=bBase(k));   // 先に打撃を0に戻してから投手6割
  AB.budget=Math.round(T*0.6); abAuto(random); AB.budget=keep;
  const left=T-abCost(AB); BAB.def=bBase('def'); babAuto(random,left,['meet','power','speed','eye']);
}
function abAuto(random){
  const B0=isW()?Math.min(AB.budget,pBudget()):AB.budget; AB.brk={}; if(!AB.slv) AB.slv=3;
  if(random) AB.slv=wpick([[1,2],[2,3],[3,4],[4,2],[5,1]]);
  let left=B0-lvCost0(AB.slv);
  if(random){
    // ランダムに変化球を0〜2つ、残りを球速・コントロール・スタミナへ
    const n=ri(0,2), types=shuffle(BRK_TYPES).slice(0,n);
    types.forEach(t=>{ const l=wpick([[1,3],[2,4],[3,3],[4,1],[5,1]]); if(lvCost0(l)<=left-10){ AB.brk[t]=l; left-=lvCost0(l); } });
    const wv=rnd(), wc=rnd(), ws=rnd(), sum=wv+wc+ws;
    AB.velo=Math.min(160,V0+Math.floor(left*wv/sum/VCOST)); left-=(AB.velo-V0)*VCOST;
    AB.control=Math.min(P_MAX0,Math.floor(left*wc/(wc+ws))); left-=AB.control;
  }else{
    AB.velo=Math.min(160,V0+Math.floor(left*0.4/VCOST)); left-=(AB.velo-V0)*VCOST;
    AB.control=Math.min(P_MAX0,Math.floor(left*0.5)); left-=AB.control;
  }
  AB.stamina=r1(Math.min(P_MAX0,left/STA_COST)); left=r1(left-AB.stamina*STA_COST);
  if(left>0){ const c=Math.min(P_MAX0-AB.control,left); AB.control=r1(AB.control+c); left=r1(left-c); }   // 上限で余ったぶん
  if(left>0) AB.velo=r1(Math.min(160,AB.velo+Math.floor(left/VCOST*10)/10));
}
function renderAbil(){
  const left=r1(pBudget()-abCost(AB));
  $('abBudget').innerHTML=(dGenius?'<span class="genius">✨ 天才</span> ':'')+(isW()?`${wTotal()}ポイント（二刀流：投手と打撃で分け合う）`:AB.budget+'ポイント');
  $('abReroll').innerHTML=rerollHTML(); $('bReroll').innerHTML=''; rerollBind(); $('abRange').textContent=rangeTxt();   // 振り直しのボタン（二刀流は投手の欄だけに出す）
  $('abLeft').textContent=`残り ${left.toFixed(1)} ポイント`+(left<-1e-6?'（使いすぎ）':'');
  $('abLeft').classList.toggle('over',left<-1e-6);
  $('abVelo').value=AB.velo; $('abVeloV').textContent=AB.velo.toFixed(1);
  $('abCtl').value=AB.control; $('abCtlV').textContent=AB.control.toFixed(1);
  $('abSta').value=AB.stamina; $('abStaV').textContent=AB.stamina.toFixed(1);
  const nB=Object.keys(AB.brk).length;
  const LVS=[1,2,3,4,5].slice(0,LV0_MAX);
  const stRow=`<div class="abbr"><span>${ptn('ストレート')}<small>伸び</small></span>${LVS.map(l=>`<button class="lvb ${(AB.slv||3)===l?'on':''}" data-slv="${l}">Lv.${l}<small>${lvCost0(l)}pt</small></button>`).join('')}</div>`;
  $('abBreak').innerHTML=stRow+BRK_TYPES.map(t=>{const cur=+AB.brk[t]||0;
    return `<div class="abbr"><span>${ptn(t)}</span>${[0,...LVS].map(l=>{
      const dis = l && !cur && nB>=2;   // 2つまで
      return `<button class="lvb ${cur===l?'on':''} ${dis?'dis':''}" data-t="${t}" data-l="${l}">${l?`Lv.${l}<small>${lvCost0(l)}pt</small>`:'なし'}</button>`}).join('')}</div>`}).join('');
  $('abBreak').querySelectorAll('[data-slv]').forEach(el=>el.onclick=()=>{ const l=+el.dataset.slv; if(abCost({...AB,slv:l})>pBudget()+1e-6){ $('abLeft').textContent='ポイントが足りません'; $('abLeft').classList.add('over'); return; } AB.slv=l; renderAbil(); });
  $('abBreak').querySelectorAll('.lvb[data-t]').forEach(el=>el.onclick=()=>{
    const t=el.dataset.t, l=+el.dataset.l, nb={...AB.brk};
    if(!l) delete nb[t]; else { if(!nb[t]&&Object.keys(nb).length>=2) return; nb[t]=l; }
    if(abCost({...AB,brk:nb})>pBudget()+1e-6){ $('abLeft').textContent='ポイントが足りません'; $('abLeft').classList.add('over'); return; }
    AB.brk=nb; renderAbil();
  });
  if(isW()){ wStartBtn(); return; }
  $('startGame').disabled=left<-1e-6||!dTeam;
  $('startGame').textContent=!dTeam?'希望球団を選んでください':`入団（${TEAM[dTeam].short}・${AB.velo}km/h・制球${AB.control}・スタミナ${AB.stamina}・変化球${nB}つ）`;
}
// スライダー：持ち点を超えない範囲で動かす
[['abVelo','velo'],['abCtl','control'],['abSta','stamina']].forEach(([id,k])=>{
  $(id).oninput=()=>{
    let v=+$(id).value; const other={...AB,[k]:k==='velo'?V0:0};
    const room=r1(pBudget()-abCost(other)), max=k==='velo'?r1(V0+Math.floor(room/VCOST*10)/10):k==='stamina'?r1(room/STA_COST):room;   // 球速は0.1km/hで0.5pt・スタミナは0.1で0.05pt
    AB[k]=r1(clamp(v,k==='velo'?V0:0,Math.min(k==='velo'?160:P_MAX0,max))); renderAbil();
  };
});
$('abAuto').onclick=()=>{ if(isW()){ wAuto(true); renderSetup(); } else { abAuto(true); renderAbil(); } };
let dRole='start', dTeam='', dPos='P', dBpos='SS', dBhand='L', dGenius=false;
// 最初の持ち点：野手90〜145・投手75〜130の中でランダム（1%で天才：野手200・投手150）。二刀流は投手と野手の持ち点をそれぞれ出して足し、0.75倍（天才は350）
let dU=0.5, dU2=0.5;
const budgetOf=pos=>{ pos=pos||dPos; if(dGenius) return pos==='B'?200:pos==='W'?350:150; const b=90+Math.round(dU*55), p=75+Math.round(dU2*55); return pos==='B'?b:pos==='W'?Math.round((b+p)*0.75):p; };
const setBudget=()=>{ AB.budget=budgetOf(); };
const rangeTxt=()=>dPos==='B'?'（90〜145の中でランダム。1%で「天才」の200）':dPos==='W'?'（投手75〜130と野手90〜145をそれぞれランダムに出して足し、0.75倍。1%で「天才」の350）':'（75〜130の中でランダム。1%で「天才」の150）';
// 持ち点の振り直し：ペナントの準備のときに3回まで（同じ決め方）。振り直すと能力の割り振りはおまかせに戻る
const ROLL_MAX=3; let ROLL_LEFT=ROLL_MAX;
function rollBudget(){ dGenius=rnd()<0.01; dU=rnd(); dU2=rnd(); setBudget(); }
function rerollHTML(){ return MODE!=='pennant'?'':`<div class="reroll"><button class="btn" id="rerollBtn" ${ROLL_LEFT>0?'':'disabled'}>🎲 持ち点を振り直す（あと${ROLL_LEFT}回）</button><small>${ROLL_LEFT>0?'振り直すと、能力の割り振りはおまかせに戻ります':'振り直しは3回までです'}</small></div>`; }
function rerollBind(){ const b=document.getElementById('rerollBtn'); if(b) b.onclick=()=>{ if(ROLL_LEFT<=0) return; ROLL_LEFT--; rollBudget(); abAuto(false); babAuto(false); if(dPos==='W') wAuto(false); renderSetup(); }; }
/* ---- 野手の能力（どれも0から。1上げるごとに1ポイント） ---- */
let BAB={meet:40,power:40,speed:40,eye:40,def:40};
const BAB_K=['meet','power','speed','eye','def'], BAB_ID={meet:'bMeet',power:'bPow',speed:'bSpd',eye:'bEye',def:'bDef'};
const babCost=b=>r1(BAB_K.reduce((t,k)=>t+b[k]-bBase(k),0));
const BAB_MAX=()=>MODE==='pennant'?50:100;   // ペナントの入団時は各能力50まで（プロのスタメンは平均60前後）
function babAuto(random,budget,keys){
  keys=keys||BAB_K; const B=budget??AB.budget; let left=B; keys.forEach(k=>BAB[k]=bBase(k));
  const w=keys.map(()=>random?0.4+rnd():1), sw=w.reduce((a,b)=>a+b,0);
  keys.forEach((k,i)=>{ const add=Math.min(BAB_MAX()-bBase(k),Math.floor(B*w[i]/sw)); BAB[k]+=add; left-=add; });
  for(const k of keys){ if(left<=1e-6) break; const add=r1(Math.min(left,BAB_MAX()-BAB[k])); BAB[k]=r1(BAB[k]+add); left=r1(left-add); }
}
function renderBAbil(){
  const W=isW(); if(W) BAB.def=bBase('def');
  BAB_K.forEach(k=>{ if(BAB[k]<bBase(k)) BAB[k]=bBase(k); if(BAB[k]>BAB_MAX()) BAB[k]=BAB_MAX(); $(BAB_ID[k]).max=BAB_MAX(); });
  const left=r1(W?bBudget()-bat4Cost(BAB):AB.budget-babCost(BAB));
  $('bBudget').innerHTML=(dGenius?'<span class="genius">✨ 天才</span> ':'')+(W?`投打あわせて${wTotal()}ポイント`:AB.budget+'ポイント');
  if(!W){ $('bReroll').innerHTML=rerollHTML(); $('abReroll').innerHTML=''; rerollBind(); } $('bRange').textContent=rangeTxt();
  $('bposWrap').style.display=W?'none':''; $('bDefRow').style.display=W?'none':'';
  $('bLeft').textContent=`残り ${left.toFixed(1)} ポイント`+(left<-1e-6?'（使いすぎ）':''); $('bLeft').classList.toggle('over',left<-1e-6);
  BAB_K.forEach(k=>{ $(BAB_ID[k]).value=BAB[k]; $(BAB_ID[k]+'V').textContent=BAB[k].toFixed(1); });
  $('bMeetH').textContent=`狙えるコース ${meetCells(abPerf(BAB.meet))}マス・狙える球速の幅 −${meetTol(abPerf(BAB.meet))}〜+${meetUp(abPerf(BAB.meet))}km/h（遅い球への対応はミートで広がる。速い球は+1〜+3まで）`;
  if(W){ wStartBtn(); return; }
  $('startGame').disabled=left<-1e-6||!dTeam;
  $('startGame').textContent=!dTeam?'希望球団を選んでください':`入団（${TEAM[dTeam].short}・野手・${POS_JP[dBpos]}）`;
}
BAB_K.forEach(k=>{ $(BAB_ID[k]).oninput=()=>{
  const v=+$(BAB_ID[k]).value, b0=bBase(k), room=r1(isW()?bBudget()-bat4Cost({...BAB,[k]:b0}):AB.budget-babCost({...BAB,[k]:b0}));
  BAB[k]=r1(clamp(v,b0,Math.min(BAB_MAX(),r1(b0+room)))); renderBAbil(); }; });
// スライダーの横の −／＋ で0.1ずつ動かす
['abVelo','abCtl','abSta','bMeet','bPow','bSpd','bEye','bDef'].forEach(id=>{
  const sl=$(id); if(!sl) return; const val=$(id+'V');
  const mk=(d,t,sm)=>{ const b=document.createElement('button'); b.type='button'; b.className='fb'+(sm?' sm':''); b.textContent=t;
    b.onclick=()=>{ sl.value = d==='all' ? sl.min : r1(+sl.value+d*0.1); sl.oninput(); }; return b; };
  val.after(mk('all','−ALL',true),mk(-1,'−'),mk(1,'＋'),mk(5,'+.5',true));   // −ALL＝振る前（最低値）に戻す、+.5＝能力が0.5上がる分
});
$('bAuto').onclick=()=>{ if(isW()){ wAuto(true); renderSetup(); } else { babAuto(true); renderBAbil(); } };
function openSetup(mode){MODE=mode||'free';
  draft=new Set(REP); dHand=PHAND; dLev={...PLEV};
  if(MODE==='pennant'){ ROLL_LEFT=ROLL_MAX; AB={budget:85,velo:130,control:0,stamina:0,brk:{}}; rollBudget(); abAuto(false); babAuto(false); if(dPos==='W') wAuto(false); dTeam=''; }   // 持ち点は野手100〜150・投手85〜135・二刀流は（投手＋野手）×0.75。1%で「天才」
  $('posSec').style.display=MODE==='pennant'?'':'none';
  $('roleSec').style.display=MODE==='pennant'?'':'none';
  $('teamSec').style.display=MODE==='pennant'?'':'none';
  $('tnameSec').style.display=MODE==='pennant'?'none':'';
  $('setupTitle').textContent=MODE==='pennant'?'🏆 ペナントモードの準備':'⚾ 試合の準備';
  $('setupNote').textContent=MODE==='pennant'?'希望球団を選ぶと、ドラフトで入団します（18歳スタート）。持ち点が多いほど上位指名になりやすいです。名前は空欄ならランダムです。':'相手打線は試合ごとにランダムで決まります（試合開始時に発表）。';$('pname').value=PNAME_IN; $('tname').value=TNAME_IN;renderSetup();showSetup(true);}
$('selAll').onclick=()=>{draft=new Set(PTYPES.filter(t=>t!=='スイーパー'));renderSetup()};
$('selStd').onclick=()=>{draft=new Set(['ストレート','カーブ','スライダー']);renderSetup()};
$('selNone').onclick=()=>{draft=new Set();renderSetup()};
$('startGame').onclick=()=>{
  if(MODE==='pennant'&&dPos==='W'){   // 二刀流：投手として先発、先発の日は打席にも
    if(abCost(AB)+bat4Cost(BAB)>wTotal()+1e-6||!dTeam) return;
    PHAND=dHand; PNAME_IN=($('pname').value||'').trim().slice(0,10); store.played=true;
    const rep=['ストレート',...BRK_TYPES.filter(t=>AB.brk[t])], plev={'ストレート':AB.slv||3}; rep.forEach(t=>{ if(AB.brk[t]) plev[t]=+AB.brk[t]; });
    newPennant('start',{velo:AB.velo,control:AB.control,stamina:AB.stamina,budget:wTotal()},rep,plev,dTeam,'W',{...BAB,budget:wTotal()},dBhand);
    showScreen('pennant'); save(); showDraft(); return;
  }
  if(MODE==='pennant'&&dPos==='B'){
    if(babCost(BAB)>AB.budget+1e-6||!dTeam) return;
    PHAND=dHand; PNAME_IN=($('pname').value||'').trim().slice(0,10); store.played=true;
    newPennant(null,null,null,null,dTeam,'B',{...BAB,budget:AB.budget,pos:dBpos},dBhand);
    showScreen('pennant'); save(); showDraft(); return;
  }
  if(MODE==='pennant'){
    if(abCost(AB)>AB.budget+1e-6||!dTeam) return;
    PHAND=dHand;
    PNAME_IN=($('pname').value||'').trim().slice(0,10);
    store.played=true;
    const rep=['ストレート',...BRK_TYPES.filter(t=>AB.brk[t])], plev={'ストレート':AB.slv||3}; rep.forEach(t=>{ if(AB.brk[t]) plev[t]=+AB.brk[t]; });   // 入団時はLv.1〜5、プロ入り後は Lv.7まで
    newPennant(dRole,{velo:AB.velo,control:AB.control,stamina:AB.stamina,budget:AB.budget},rep,plev,dTeam,undefined,undefined,dBhand);
    showScreen('pennant'); save(); showDraft(); return;
  }
  if(!draft.size)return;
  REP=PTYPES.filter(t=>draft.has(t)); ptype=REP[0]; PHAND=dHand;
  PLEV={}; REP.forEach(t=>{ if(dLev[t]&&dLev[t]!=='普') PLEV[t]=dLev[t]; });
  PNAME_IN=($('pname').value||'').trim().slice(0,10); TNAME_IN=($('tname').value||'').trim().slice(0,12);
  store.played=true;
  showSetup(false);
  store.played=true;
  newGame(true);
  save();
};
$('optTgt').onchange=()=>renderAll();
// 予期しないエラーはログに出す（スマホでも原因がわかるように）
window.addEventListener('error',e=>{ try{ addLog(`<div class="pull">⚠ エラー：${String(e.message).slice(0,120)}</div>`) }catch(_){} });
setSaveStatus('local');
let loaded=false;
try{loaded=applySave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}catch(e){}
if(!loaded){ newGame(); showScreen('mode'); }
initCloud();
/* ---- 球種名をタップしたときの説明（どの画面でも） ---- */
let ptipEl=null, ptipT=null;
function ptipHide(){ if(ptipEl){ ptipEl.remove(); ptipEl=null; } clearTimeout(ptipT); }
function ptipShow(anchor,t){
  ptipHide(); if(!PDESC[t]) return;
  const d=document.createElement('div'); d.className='ptip';
  d.innerHTML=`<b>${t}</b><small>${PFAM_JP[PFAM[t]]||''}</small><div>${PDESC[t]}</div>`;
  document.body.appendChild(d); ptipEl=d;
  const r=anchor.getBoundingClientRect(), w=Math.min(300,window.innerWidth-20);
  d.style.width=w+'px';
  let x=r.left+r.width/2-w/2; x=Math.max(10,Math.min(window.innerWidth-w-10,x));
  const h=d.offsetHeight; let y=r.bottom+6; if(y+h>window.innerHeight-8) y=r.top-h-6;
  d.style.left=x+'px'; d.style.top=Math.max(8,y)+'px';
  ptipT=setTimeout(ptipHide,6000);
}
document.addEventListener('click',e=>{
  const el=e.target.closest&&e.target.closest('.ptn');
  if(el){ e.stopPropagation(); e.preventDefault(); if(ptipEl&&ptipEl.dataset.for===el.dataset.pt){ ptipHide(); return; } ptipShow(el,el.dataset.pt); if(ptipEl) ptipEl.dataset.for=el.dataset.pt; return; }
  if(ptipEl&&!(e.target.closest&&e.target.closest('.ptip'))) ptipHide();
},true);
window.addEventListener('scroll',()=>ptipHide(),{passive:true});


/* ================================================================
   選手名を押すと、その選手の能力と成績を見られる（すべての画面）
   画面に出た文字の中から、今いる選手（12球団の選手・自分・試合中の相手）の名前を見つけて押せるようにする
   （引退した選手や過去の記録だけに出てくる名前は対象外）
   ================================================================ */
let PN_IDX=null, PN_KEY='', PN_RE=null, PN_Q=new Set(), PN_T=0;
function pnIndex(){
  if(typeof PEN==='undefined'||!PEN||!PEN.teams) return null;
  const g=(typeof G!=='undefined'&&G)?G:null, gl=g&&g.lineup&&g.lineup[0]?g.lineup[0].name:'';
  const key=PEN.year+'|'+PEN.day+'|'+(PEN.pname||'')+'|'+NPB.map(t=>{ const T=PEN.teams[t.id]; return T?(T.F||[]).length+'.'+(T.P||[]).length:'0'; }).join(',')+'|'+gl+'|'+(g&&g.pits?g.pits.length:0);
  if(key===PN_KEY&&PN_IDX) return PN_IDX;
  const M=new Map(), add=(n,e)=>{ if(!n||n.length<2) return; if(!M.has(n)) M.set(n,[]); M.get(n).push(e); };
  for(const t of NPB){ const T=PEN.teams[t.id]; if(!T) continue; (T.F||[]).forEach(f=>add(f.n,{k:'F',team:t.id,o:f})); (T.P||[]).forEach(p=>add(p.name,{k:'P',team:t.id,o:p})); }
  if(PEN.pname) add(PEN.pname,{k:'ME'});
  if(g){ const known=new Set(M.keys());   // 試合中だけの相手（WBCの他国の選手など）
    [...(g.lineup||[]),...((g.myTeam&&g.myTeam.lineup)||[])].forEach(b=>{ if(b&&b.name&&!b.isMe&&!known.has(b.name)) add(b.name,{k:'GB',o:b}); });
    [...(g.pits||[]),...(g.ours||[])].forEach(p=>{ if(p&&p.name&&!p.isMe&&!known.has(p.name)) add(p.name,{k:'GP',o:p}); }); }
  PN_IDX=M; PN_KEY=key;
  const L=[...M.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  PN_RE=L.length?new RegExp(L.join('|'),'g'):null;
  return M;
}
const PN_SKIP='button,textarea,input,select,option,script,style,svg,.pnm,[data-nopn],#pnPop,#mainWrap .plink,#profScreen';   // 試合中の選手名（.plink）は前と同じ細かいプロフィール
function pnScan(root){
  if(!root||!pnIndex()||!PN_RE) return;
  if(root.nodeType===1&&root.closest&&root.closest(PN_SKIP)) return;
  const W=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){ const p=n.parentNode; if(!p||!n.nodeValue||n.nodeValue.length<2) return NodeFilter.FILTER_REJECT; return p.closest&&p.closest(PN_SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT; }});
  const list=[]; let n; while((n=W.nextNode())) list.push(n);
  for(const t of list){ const s=t.nodeValue; PN_RE.lastIndex=0; if(!PN_RE.test(s)) continue; PN_RE.lastIndex=0;
    const fr=document.createDocumentFragment(); let last=0, m;
    while((m=PN_RE.exec(s))){ if(m.index>last) fr.appendChild(document.createTextNode(s.slice(last,m.index))); const sp=document.createElement('span'); sp.className='pnm'; sp.textContent=m[0]; fr.appendChild(sp); last=m.index+m[0].length; }
    if(last<s.length) fr.appendChild(document.createTextNode(s.slice(last)));
    t.parentNode.replaceChild(fr,t); }
}
function pnFlush(){ PN_T=0; const Q=[...PN_Q]; PN_Q.clear(); for(const el of Q) if(el.isConnected) pnScan(el); }
function pnInit(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||!document.body) return;
  const ob=new MutationObserver(ms=>{ for(const m of ms){ if(m.type==='characterData'){ if(m.target.parentNode) PN_Q.add(m.target.parentNode); } else m.addedNodes.forEach(x=>{ if(x.nodeType===1) PN_Q.add(x); else if(x.nodeType===3&&x.parentNode) PN_Q.add(x.parentNode); }); }
    if(!PN_T) PN_T=requestAnimationFrame(pnFlush); });
  ob.observe(document.body,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{ const s=e.target&&e.target.closest&&e.target.closest('.pnm'); if(!s) return; e.preventDefault(); e.stopPropagation();
    const go=s.closest('#mainWrap')&&pnGameObj(s.textContent); if(go){ showProfile(go); return; }   // 試合中は前と同じ細かいプロフィール
    if(typeof PEN!=='undefined'&&PEN&&PEN.pname===s.textContent&&typeof meProfileHTML==='function'){ const pp=document.getElementById('pnPop'); if(pp) pp.remove(); showProfile({isMe:true}); return; }   // 自分の名前：まとめのプロフィール
    pnShow(s.textContent); },true);
  pnScan(document.body);
}
// 試合中の選手（名前から試合のデータを探す）：見つかれば前と同じ細かいプロフィール（showProfile）を出す
function pnGameObj(name){
  if(typeof G==='undefined'||!G||!name) return null;
  if(name===(G.pname||'')||(typeof PEN!=='undefined'&&PEN&&name===PEN.pname)) return {isMe:true};
  const L=[...(G.lineup||[]),...((G.myTeam&&G.myTeam.lineup)||[]),...(G.pits||[]),...(G.ours||[])]; if(G.oppPitcher) L.push(G.oppPitcher);
  return L.find(x=>x&&x.name===name&&!x.isMe)||PLINK_N[name]||null;
}
// ---- 選手カード
const pnCol=v=>v>=90?'#e2b33a':v>=80?'#e74c3c':v>=70?'#e67e22':v>=60?'#f1c40f':v>=50?'#2ecc71':v>=40?'#3498db':'#7f8c8d';
const pnBar=(l,v,txt)=>{ const w=Math.max(0,Math.min(100,v)); return `<div class="pnb"><span>${l}</span><i><b style="width:${w}%;background:${pnCol(v)}"></b></i><em>${txt??Math.round(v)}</em></div>`; };
const pnF3=(h,ab)=>ab?f3(h/ab):'-';
function pnBatTbl(rows){
  const r=rows.filter(x=>x[1]&&(x[1].pa||x[1].ab)); if(!r.length) return '<div class="hint" style="margin:4px 0">まだ成績はありません</div>';
  return `<table class="pnt"><tr><th></th><th>打席</th><th>打率</th><th>本塁打</th><th>打点</th><th>盗塁</th><th>OPS</th></tr>${r.map(([l,s])=>{ const ab=s.ab||0, obp=s.pa?((s.h||0)+(s.bb||0)+(s.hbp||0))/s.pa:0, slg=ab?((s.h||0)+(s.d2||0)+2*(s.d3||0)+3*(s.hr||0))/ab:0;
    return `<tr><th>${l}</th><td>${s.pa||0}</td><td>${pnF3(s.h||0,ab)}</td><td>${s.hr||0}</td><td>${s.rbi!=null?s.rbi:'-'}</td><td>${s.sb||0}</td><td>${s.pa?f3(obp+slg):'-'}</td></tr>`; }).join('')}</table>`;
}
function pnPitTbl(rows){
  const r=rows.filter(x=>x[1]&&x[1].outs); if(!r.length) return '<div class="hint" style="margin:4px 0">まだ成績はありません</div>';
  return `<table class="pnt"><tr><th></th><th>登板</th><th>勝-敗</th><th>S</th><th>H</th><th>投球回</th><th>防御率</th><th>奪三振</th></tr>${r.map(([l,s])=>{ const er=s.er!=null?s.er:(s.runs||0);
    return `<tr><th>${l}</th><td>${s.g!=null?s.g:'-'}</td><td>${s.w!=null?`${s.w}-${s.l||0}`:'-'}</td><td>${s.sv!=null?s.sv:'-'}</td><td>${s.hld!=null?s.hld:'-'}</td><td>${fmtIP(s.outs)}</td><td>${(er*27/s.outs).toFixed(2)}</td><td>${s.k!=null?s.k:'-'}</td></tr>`; }).join('')}</table>`;
}
const pnHand=h=>h==='L'?'左':h==='S'?'両':'右';
function pnCard(e){
  const tm=e.team&&TEAM[e.team]?TEAM[e.team].short:'';
  if(e.k==='F'){ const f=e.o, cs=PEN.cs&&PEN.cs[f.id];
    return `<div class="pnc"><div class="pnh"><b>${f.n}</b> <small>${tm}・#${f.num??'-'}・${POS_JP[f.pos]||f.pos}・${f.age}歳・${pnHand(f.h)}打${f.btype?`・${f.btype}`:''}</small></div>
      ${[['ミート',f.m],['パワー',f.p],['走力',f.s],['選球眼・技術',f.e],['守備',f.d]].map(([l,v])=>pnBar(l,abShow(v))).join('')}
      ${pnBatTbl([['今季',cs],['昨季',f.ly],['通算',f.car]])}</div>`; }
  if(e.k==='P'){ const p=e.o, cs=PEN.cs&&p.pid&&PEN.cs[p.pid];
    return `<div class="pnc"><div class="pnh"><b>${p.name}</b> <small>${tm}・#${p.num??'-'}・投手（${p.prole==='sp'?'先発':'中継ぎ'}）・${p.age}歳・${pnHand(p.hand)}投</small></div>
      ${pnBar('球速',(p.velo-120)*2.5,`${Math.round(p.velo)}km/h`)}${pnBar('コントロール',p.control)}${pnBar('スタミナ',p.stamina)}
      <div class="pnk">${(p.types||[]).map(t=>`<span>${t} Lv.${(p.plv&&p.plv[t])||'-'}</span>`).join('')}</div>
      ${pnPitTbl([['今季',cs],['昨季',p.ly],['通算',p.car]])}</div>`; }
  if(e.k==='ME'){ const B=hasBat(), P=!isBat(), a=PEN.abil||{}, b=PEN.babil||{};
    const role=isBat()?(PEN.role==='スタメン'?`${PEN.order}番・${POS_JP[PEN.slot]||''}`:PEN.role||''):(typeof pitRoleLabel==='function'?pitRoleLabel():PEN.role||'');
    const info=typeof meContractTxt==='function'?`<div class="hint" style="margin:2px 0 6px;line-height:1.6">年俸 <b style="color:var(--ink)">${yen(PEN.salary)}</b>　${meContractTxt()}<br>起用の評価 <b style="color:var(--ink)">${Math.round(evalR())}点</b></div>`:'';
    return `<div class="pnc"><div class="pnh"><b>${PEN.pname}</b> <small>（あなた）${TEAM[PEN.team]?TEAM[PEN.team].short:''}・${role}・${PEN.age}歳</small></div>${info}
      ${B?[['ミート','meet'],['パワー','power'],['走力','speed'],['選球眼・技術','eye'],['守備','def']].filter(([l,k])=>k!=='def'||isBat()).map(([l,k])=>pnBar(l,b[k]??0)).join(''):''}
      ${P?`${pnBar('球速',((a.velo||130)-120)*2.5,`${Math.round(a.velo||0)}km/h`)}${pnBar('コントロール',a.control||0)}${pnBar('スタミナ',a.stamina||0)}<div class="pnk">${(PEN.rep||[]).map(t=>`<span>${t} Lv.${(PEN.plev&&PEN.plev[t])||'-'}</span>`).join('')}</div>`:''}
      ${B?pnBatTbl([['今季',isTW()?PEN.bss:PEN.ss],['通算',isTW()?PEN.bcareer:PEN.career]]):''}${P?pnPitTbl([['今季',PEN.ss],['通算',PEN.career]]):''}</div>`; }
  if(e.k==='GB'){ const x=e.o;
    return `<div class="pnc"><div class="pnh"><b>${x.name}</b> <small>${x.team&&TEAM[x.team]?TEAM[x.team].short+'・':''}${x.type||''}${x.hand?`・${pnHand(x.hand)}打`:''}</small></div>
      ${[['ミート',x.contact],['パワー',x.power],['走力',x.speed],['選球眼・技術',x.eye]].filter(r=>r[1]!=null).map(([l,v])=>pnBar(l,abShow(v))).join('')}
      ${x.avg!=null?`<div class="hint" style="margin:4px 0">打率 ${f3(x.avg)}</div>`:''}</div>`; }
  if(e.k==='GP'){ const p=e.o, lv=p.plv||{};
    return `<div class="pnc"><div class="pnh"><b>${p.name}</b> <small>投手${p.hand?`・${pnHand(p.hand)}投`:''}</small></div>
      ${p.velo?pnBar('球速',(p.velo-120)*2.5,`${Math.round(p.velo)}km/h`):''}${p.control!=null?pnBar('コントロール',p.control):''}${p.stamina!=null?pnBar('スタミナ',p.stamina):''}
      <div class="pnk">${(p.types||[]).map(t=>`<span>${t}${lv[t]?` Lv.${lv[t]}`:''}</span>`).join('')}</div></div>`; }
  return '';
}
function pnShow(name){
  const L=(pnIndex()&&PN_IDX.get(name))||[]; if(!L.length) return;
  let el=document.getElementById('pnPop');
  if(!el){ el=document.createElement('div'); el.id='pnPop'; el.setAttribute('data-nopn',''); document.body.appendChild(el); pnPopBind(el); }
  const back=el.dataset.team||''; el.dataset.team='';   // チームの選手一覧から開いたときは「一覧に戻る」
  el.innerHTML=`<div class="pnbox">${L.length>1?`<div class="hint" style="margin:0 0 6px">同じ名前の選手が${L.length}人います</div>`:''}${L.map(pnCard).join('')}${back?`<button class="btn pnback" data-back="${back}" style="width:100%;margin-top:10px">← 選手一覧に戻る</button>`:''}<button class="btn pnx" style="width:100%;margin-top:8px">閉じる</button></div>`;
  el.scrollTop=0;
}
// ---- チームの選手一覧（日程画面のチームの成績のカードを押すと開く）。名前を押すとその選手の能力と成績
const PN_POS={C:'捕','1B':'一','2B':'二','3B':'三',SS:'遊',LF:'左',CF:'中',RF:'右',OF:'外',DH:'指'}, PN_PORD=['C','1B','2B','3B','SS','LF','CF','RF','OF','DH'];
function pnTeam(id){
  if(typeof PEN==='undefined'||!PEN||!PEN.teams||!PEN.teams[id]) return;
  const T=PEN.teams[id], cs=PEN.cs||{}, mine=id===PEN.team, byF={}; (T.F||[]).forEach(f=>byF[f.id]=f);
  const nm=(n,isMe)=>`<span class="pnm">${n}</span>${isMe?' <small style="color:var(--accent)">あなた</small>':''}`;
  const meB=()=>{ const b=PEN.babil||{}, s=isTW()?(PEN.bss||{}):PEN.ss||{}; return `<td>${isTW()?'-':PEN.age}</td><td>${['meet','power','speed','eye','def'].map(k=>b[k]!=null?Math.round(b[k]):'-').join('/')}</td><td>${s.ab?f3(s.h/s.ab):'-'}</td><td>${s.hr||0}</td>`; };
  const fCells=f=>{ const c=cs[f.id]||{}; return `<td>${f.age}</td><td>${[f.m,f.p,f.s,f.e,f.d].map(v=>Math.round(abShow(v))).join('/')}</td><td>${c.ab?f3(c.h/c.ab):'-'}</td><td>${c.hr||0}</td>`; };
  const L=(T.lineup||[]).map((b,i)=>({b,i,pos:(T.lpos||[])[i]||b.pos,f:b.fid?byF[b.fid]:null})), inL=new Set(L.map(x=>x.f&&x.f.id).filter(Boolean));
  const meInL=L.some(x=>x.b.isMe);
  let rows=L.map(x=>`<tr><td>${x.i+1}</td><td>${PN_POS[x.pos]||x.pos||''}</td><td class="l">${x.b.isMe?nm(PEN.pname,true):x.f?nm(x.f.n):x.b.name}</td>${x.b.isMe?meB():x.f?fCells(x.f):'<td></td><td></td><td></td><td></td>'}</tr>`).join('');
  const bench=(T.F||[]).filter(f=>!inL.has(f.id)).sort((a,b)=>PN_PORD.indexOf(a.pos)-PN_PORD.indexOf(b.pos));
  let rowsB=bench.map(f=>`<tr><td></td><td>${PN_POS[f.pos]||f.pos}</td><td class="l">${nm(f.n)}</td>${fCells(f)}</tr>`).join('');
  if(mine&&isBat()&&!meInL) rowsB=`<tr><td></td><td>${PN_POS[(PEN.bposs||[])[0]]||''}</td><td class="l">${nm(PEN.pname,true)}</td>${meB()}</tr>`+rowsB;
  const S=typeof staff==='function'?staff(T):{rot:[],pen:[]};
  const pCells=p=>{ const c=(p.pid&&cs[p.pid])||{}; return `<td>${p.age}</td><td>${Math.round(p.velo)}/${Math.round(p.control)}/${Math.round(p.stamina)}</td><td>${c.outs?(c.er*27/c.outs).toFixed(2):'-'}</td><td>${c.g?`${c.w||0}-${c.l||0}${c.sv?` ${c.sv}S`:''}${c.hld?` ${c.hld}H`:''}`:'-'}</td>`; };
  const meP=()=>{ const a=PEN.abil||{}, s=PEN.ss||{}; return `<td>${PEN.age}</td><td>${Math.round(a.velo||0)}/${Math.round(a.control||0)}/${Math.round(a.stamina||0)}</td><td>${s.outs?(s.runs*27/s.outs).toFixed(2):'-'}</td><td>${s.g?`${s.w||0}-${s.l||0}${s.sv?` ${s.sv}S`:''}${s.hld?` ${s.hld}H`:''}`:'-'}</td>`; };
  const pRow=(lab,p)=>`<tr><td>${lab}</td><td class="l">${nm(p.name)}</td>${pCells(p)}</tr>`;
  let rowsP=S.rot.map((p,i)=>pRow(`先${i+1}`,p)).join('')+S.pen.map((p,i)=>pRow(i===0?'抑':i===1?'SU':'中',p)).join('');
  if(mine&&!isBat()) rowsP=`<tr><td>${typeof isStarter==='function'&&isStarter(PEN.role)?'先':'中'}</td><td class="l">${nm(PEN.pname,true)}</td>${meP()}</tr>`+rowsP;
  let el=document.getElementById('pnPop');
  if(!el){ el=document.createElement('div'); el.id='pnPop'; el.setAttribute('data-nopn',''); document.body.appendChild(el); pnPopBind(el); }
  el.dataset.team=id;
  el.innerHTML=`<div class="pnbox"><div class="pnh"><b>${TEAM[id].name}</b> <small>選手一覧（名前を押すと能力と成績）</small></div>
    <div class="sh2" style="margin:6px 0 2px">野手 <small style="color:#9ab;font-weight:400">能力＝ミート/パワー/走力/選球眼・技術/守備</small></div>
    <table class="pnt pnr"><tr><th></th><th>守</th><th class="l">名前</th><th>年齢</th><th>能力</th><th>打率</th><th>本</th></tr>${rows}${rowsB?`<tr><th colspan="7" class="l" style="padding-top:6px">控え</th></tr>${rowsB}`:''}</table>
    <div class="sh2" style="margin:10px 0 2px">投手 <small style="color:#9ab;font-weight:400">能力＝球速/コントロール/スタミナ</small></div>
    <table class="pnt pnr"><tr><th></th><th class="l">名前</th><th>年齢</th><th>能力</th><th>防御率</th><th>勝敗</th></tr>${rowsP}</table>
    <button class="btn pnx" style="width:100%;margin-top:10px">閉じる</button></div>`;
  el.scrollTop=0;
}
function pnPopBind(el){ el.addEventListener('click',e=>{ const bk=e.target.closest&&e.target.closest('.pnback'); if(bk){ pnTeam(bk.dataset.back); return; } if(e.target===el||(e.target.closest&&e.target.closest('.pnx'))) el.remove(); }); }
if(typeof document!=='undefined'){ if(document.body) pnInit(); else document.addEventListener('DOMContentLoaded',pnInit); }

</script>
</body>
</html>
