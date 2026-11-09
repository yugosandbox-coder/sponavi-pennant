/* ========= コーチのキャラクター（メンタリスト・スポーツアナリスト・パーソナルトレーナー・代理人・不動産屋） =========
   各5案。COACH_LOOK[kind][i] の見た目の設定から svgCoach(kind,i) で描く（自分・監督と同じ大きさ 100×130） */
const CSK=['#f6d2b4','#ecc19c','#d9a77d','#b9825a','#8a5a3a'];
const COACH_LOOK={
  mental:[
    {lab:'振り子の催眠術師',skin:1,outfit:'suit',top:'#1b1b22',shirt:'#6b3fa0',tie:'#111',hair:'slick',hc:'#1a1a1a',face:'calm',acc:['mustache','pendulum']},
    {lab:'トランプの心理学者',skin:0,outfit:'turtle',top:'#16161a',inner:'#f4f4f4',hair:'pony',hc:'#2b1d14',face:'smirk',acc:['roundglass','cards']},
    {lab:'やさしいカウンセラー',skin:0,outfit:'cardigan',top:'#b9a3d9',shirt:'#ffffff',hair:'long',hc:'#3a2418',face:'smile',acc:['earring','notebook']},
    {lab:'座禅の老師',skin:2,outfit:'samue',top:'#26324f',hair:'bald',hc:'#cfcfcf',face:'closed',acc:['beard','beads']},
    {lab:'セミナー講師',skin:1,outfit:'hoodie',top:'#2b2b33',hair:'mash',hc:'#3b2a1e',face:'grin',acc:['headset']},
  ],
  analyst:[
    {lab:'タブレット片手の分析官',skin:1,outfit:'polo',top:'#1f3c7a',hair:'short',hc:'#1a1a1a',face:'smile',acc:['glass','tablet']},
    {lab:'ノートPCの女性アナリスト',skin:0,outfit:'vest',top:'#24365e',shirt:'#ffffff',hair:'bob',hc:'#2a1a12',face:'smile',acc:['laptop']},
    {lab:'ヘッドセットのデータ班',skin:2,outfit:'track',top:'#5f6670',stripe:'#e8e8e8',hair:'capback',hc:'#1a1a1a',cap:'#1f3c7a',face:'grin',acc:['headset','clip']},
    {lab:'白衣の研究者',skin:0,outfit:'labcoat',top:'#f6f6f6',shirt:'#9ec3e6',tie:'#24365e',hair:'messy',hc:'#4a3a2a',face:'calm',acc:['roundglass','papers']},
    {lab:'スマートなデータ参謀',skin:1,outfit:'suit',top:'#3a3f4a',shirt:'#e9eef6',tie:null,hair:'side',hc:'#1a1a1a',face:'smirk',acc:['glass','bigtab']},
  ],
  trainer:[
    {lab:'筋肉自慢のトレーナー',skin:3,outfit:'tank',top:'#111111',hair:'buzz',hc:'#1a1a1a',face:'grin',acc:['whistle','muscle','clipboard']},
    {lab:'ヨガのインストラクター',skin:0,outfit:'track',top:'#2aa198',stripe:'#ffffff',hair:'pony',hc:'#2b1d14',face:'smile',acc:['hairband','yogamat']},
    {lab:'赤ジャージの鬼コーチ',skin:2,outfit:'track',top:'#c0392b',stripe:'#ffffff',hair:'buzz',hc:'#1a1a1a',face:'shout',acc:['towel','stopwatch']},
    {lab:'日焼けのフィジカル担当',skin:4,outfit:'polo',top:'#f2f2f2',hair:'short',hc:'#1a1a1a',face:'grin',acc:['sunglassup','dumbbell']},
    {lab:'ベテラントレーナー',skin:1,outfit:'track',top:'#22344f',stripe:'#f5c542',hair:'short',hc:'#9a9a9a',face:'smile',acc:['mustache','clipboard']},
  ],
  agent:[
    {lab:'サングラスのやり手代理人',skin:1,outfit:'suit',top:'#111111',shirt:'#ffffff',tie:'#c0392b',hair:'slick',hc:'#1a1a1a',face:'smirk',acc:['sunglass','briefcase']},
    {lab:'スマホ片手の女性代理人',skin:0,outfit:'suit',top:'#5a5f6a',shirt:'#f4f4f4',tie:null,hair:'bob',hc:'#1a1a1a',face:'smile',acc:['phone']},
    {lab:'金髪の敏腕エージェント',skin:0,outfit:'suit',top:'#1d2e57',shirt:'#ffffff',tie:'#d4a52a',hair:'side',hc:'#e2c26a',face:'grin',acc:['contract']},
    {lab:'金時計の大物代理人',skin:2,outfit:'suit',top:'#2f2f3a',shirt:'#ffffff',tie:'#7a1f2b',hair:'bald',hc:'#555',face:'smile',acc:['mustache','pinstripe','watch','calc']},
    {lab:'若手のインテリ代理人',skin:1,outfit:'suit',top:'#2c3e50',shirt:'#dfe8f2',tie:'#2a7ab8',hair:'mash',hc:'#2b1d14',face:'calm',acc:['glass','tablet']},
  ],
  // ---- 怪しい医者（最後の輝きを目指して）
  doctor:[
    {lab:'額帯鏡（がくたいきょう）の闇医者',skin:1,outfit:'labcoat',top:'#e9e6df',shirt:'#3a3a3a',tie:'#6b1e2e',hair:'messy',hc:'#6b6b6b',face:'smirk',acc:['headmirror','stetho']},
    {lab:'フラスコのマッドドクター',skin:0,outfit:'labcoat',top:'#f2f2f2',shirt:'#7fd36b',tie:null,hair:'messy',hc:'#f0f0f0',face:'grin',acc:['roundglass','flask']},
    {lab:'黒コートの闇医者',skin:2,outfit:'suit',top:'#141418',shirt:'#5a1222',tie:null,hair:'slick',hc:'#111',face:'smirk',acc:['sunglass','stetho','syringe']},
    {lab:'マスクの謎の医師',skin:1,outfit:'scrubs',top:'#2f6f5a',hair:'none',hc:'#222',face:'calm',acc:['scrubcap','mask','stetho']},
    {lab:'片眼鏡の老医師',skin:0,outfit:'labcoat',top:'#efefe8',shirt:'#c9b48a',tie:'#3a2a1a',hair:'bald',hc:'#dcdcdc',face:'calm',acc:['monocle','beard','pill']},
    // 案6〜10：案2（フラスコのマッドドクター）と案5（片眼鏡の老医師）をもとに
    {lab:'片眼鏡のマッドドクター',skin:0,outfit:'labcoat',top:'#f2f2f2',shirt:'#7fd36b',tie:null,hair:'messy',hc:'#f0f0f0',face:'grin',acc:['monocle','flask','wrinkle']},
    {lab:'丸メガネの狂気の老博士',skin:0,outfit:'labcoat',top:'#efefe8',shirt:'#c9b48a',tie:'#3a2a1a',hair:'bald',hc:'#e6e6e6',face:'grin',acc:['roundglass','beard','flask','wrinkle']},
    {lab:'白ひげの薬売り博士',skin:1,outfit:'labcoat',top:'#f2f2f2',shirt:'#7a5aa0',tie:null,hair:'messy',hc:'#ececec',face:'smirk',acc:['roundglass','beard','pill','wrinkle']},
    {lab:'口ひげの錬金術師',skin:0,outfit:'labcoat',top:'#e9e6df',shirt:'#3a3a3a',tie:'#6b1e2e',hair:'bald',hc:'#d0d0d0',face:'calm',acc:['monocle','mustache','flask','browbig','wrinkle']},
    {lab:'ボサボサ白髪の老医師',skin:0,outfit:'labcoat',top:'#f2f2f2',shirt:'#c9b48a',tie:'#3a2a1a',hair:'messy',hc:'#f4f4f4',face:'smirk',acc:['monocle','beard','pill','browbig','wrinkle']},
    // 案11（決定）：案10に、案6の緑のフラスコとシャツ
    {lab:'緑のフラスコの老医師',skin:0,outfit:'labcoat',top:'#f2f2f2',shirt:'#7fd36b',tie:null,hair:'messy',hc:'#f4f4f4',face:'smirk',acc:['monocle','beard','flask','browbig','wrinkle']},
  ],
  // ---- 球団コーチ（走塁・盗塁講習／特守／左右苦手克服）：服は所属球団のユニフォーム。顔・髪・小物で描き分け
  club:[
    {lab:'ノックバットの守備コーチ',skin:2,outfit:'uniform',hc:'#1a1a1a',face:'grin',acc:['fungo']},
    {lab:'ストップウォッチの走塁コーチ',skin:1,outfit:'uniform',hc:'#2b1d14',face:'smile',acc:['stopwatch']},
    {lab:'メガネのバッテリーコーチ',skin:0,outfit:'uniform',hc:'#555',face:'calm',acc:['glass','mitt']},
    {lab:'ひげの打撃コーチ',skin:3,outfit:'uniform',hc:'#2a2a2a',face:'smirk',acc:['mustache','bat']},
    {lab:'笛の熱血コーチ',skin:1,outfit:'uniform',hc:'#9a9a9a',face:'shout',acc:['whistle','towel']},
    // 案6〜10：案1（ノックバット）と案4（ひげの打撃コーチ）をもとに、年を取らせて
    {lab:'白髪まじりのノック職人',skin:2,outfit:'uniform',hc:'#9a9a9a',face:'grin',acc:['fungo','wrinkle']},
    {lab:'白ひげの打撃コーチ',skin:3,outfit:'uniform',hc:'#d6d6d6',face:'smirk',acc:['mustache','bat','wrinkle']},
    {lab:'口ひげの老守備コーチ',skin:2,outfit:'uniform',hc:'#bdbdbd',face:'smile',acc:['mustache','fungo','browbig','wrinkle']},
    {lab:'あごひげの名打撃コーチ',skin:3,outfit:'uniform',hc:'#e4e4e4',face:'calm',acc:['beard','bat','browbig','wrinkle']},
    {lab:'メガネのベテランノッカー',skin:2,outfit:'uniform',hc:'#aaaaaa',face:'grin',acc:['glass','fungo','wrinkle']},
  ],
  // ---- 伝説の野球選手（覚醒合宿）
  legend:[
    {lab:'永久欠番の大打者',skin:1,outfit:'oldjersey',top:'#f3ecd8',stripe:'#1f3c7a',num:'1',hair:'short',hc:'#e6e6e6',face:'smile',acc:['bat']},
    {lab:'着物の剣豪スラッガー',skin:2,outfit:'kimono',top:'#2b2f3a',shirt:'#d9d2bf',hair:'bald',hc:'#ececec',face:'closed',acc:['beard','bat']},
    {lab:'金ブレザーの殿堂入り投手',skin:0,outfit:'suit',top:'#b88a2a',shirt:'#ffffff',tie:'#1f3c7a',hair:'slick',hc:'#bdbdbd',face:'smile',acc:['ball']},
    {lab:'トロフィーを抱えた鉄人',skin:3,outfit:'track',top:'#8e1b1b',stripe:'#f5c542',hair:'buzz',hc:'#cfcfcf',face:'grin',acc:['trophy']},
    {lab:'サングラスの元メジャーリーガー',skin:1,outfit:'polo',top:'#13294b',collar:'#c8102e',hair:'capback',cap:'#c8102e',hc:'#8a8a8a',face:'smirk',acc:['sunglass','bat']},
    // 案6〜8：案1（永久欠番の大打者）をもとに、若いころ・年を取ったころ
    {lab:'若き日の大打者',skin:1,outfit:'oldjersey',top:'#f3ecd8',stripe:'#1f3c7a',num:'1',hair:'short',hc:'#1a1a1a',face:'grin',acc:['bat','brow']},
    {lab:'晩年の大打者（白髪まじり）',skin:1,outfit:'oldjersey',top:'#f3ecd8',stripe:'#1f3c7a',num:'1',hair:'short',hc:'#8c8c8c',face:'smile',acc:['bat','brow','wrinkle']},
    {lab:'老いた大打者（白髪・太い眉）',skin:1,outfit:'oldjersey',top:'#f3ecd8',stripe:'#1f3c7a',num:'1',hair:'short',hc:'#f2f2f2',face:'calm',acc:['bat','browbig','wrinkle']},
  ],
  // ---- 女将さん（温泉旅行・湯治）
  okami:[
    {lab:'藤色の着物の若女将',skin:0,outfit:'kimono',top:'#8e6bb0',shirt:'#f3ecd8',hair:'bun',hc:'#1a1a1a',face:'smile',acc:[]},
    {lab:'紺の着物の女将',skin:1,outfit:'kimono',top:'#22325a',shirt:'#f3ecd8',hair:'bun',hc:'#2a1a12',face:'calm',acc:['towel']},
    {lab:'白髪の大女将',skin:1,outfit:'kimono',top:'#7a2e3a',shirt:'#f3ecd8',hair:'bun',hc:'#d9d9d9',face:'smile',acc:['wrinkle']},
    // 案4〜8（提案）
    {lab:'桜色の着物にかんざしの若女将',skin:0,outfit:'kimono',top:'#e8a7b8',shirt:'#fff8ef',obi:'#c9a227',pat:'sakura',hair:'bun',hc:'#1a1a1a',face:'smile',acc:['kanzashi','sensu']},
    {lab:'割烹着のおかみさん',skin:1,outfit:'kappogi',top:'#4a6b5a',hair:'bun',hc:'#3a2418',face:'grin',acc:['tray']},
    {lab:'羽織と提灯の老舗の女将',skin:1,outfit:'kimono',top:'#1f2a44',shirt:'#f3ecd8',obi:'#8a6d3b',pat:'dots',haori:'#4a2a33',hair:'bun',hc:'#2a1a12',face:'calm',acc:['lantern']},
    {lab:'日本髪の大女将',skin:0,outfit:'kimono',top:'#2b2b2b',shirt:'#f3ecd8',obi:'#c9a227',hair:'nihongami',hc:'#1a1a1a',face:'calm',acc:['kanzashi','wrinkle','teacup']},
    {lab:'手ぬぐいを頭にのせた湯守り',skin:2,outfit:'kimono',top:'#f2f2f2',shirt:'#2a5b9a',obi:'#2a5b9a',pat:'kasuri',hair:'pony',hc:'#2b1d14',face:'grin',acc:['tenugui','yumoita']},
    // 案9〜11：案1（藤色の着物の若女将）と案6（羽織と提灯の老舗の女将）を混ぜたもの。案9で決定
    {lab:'藤色の着物に羽織と提灯の若女将',skin:0,outfit:'kimono',top:'#8e6bb0',shirt:'#f3ecd8',obi:'#8a6d3b',pat:'dots',haori:'#4a2a33',hair:'bun',hc:'#1a1a1a',face:'smile',acc:['lantern']},
    {lab:'藤色の着物に紺の羽織の若女将',skin:0,outfit:'kimono',top:'#8e6bb0',shirt:'#f3ecd8',obi:'#c9a227',pat:'dots',haori:'#22325a',hair:'bun',hc:'#1a1a1a',face:'smile',acc:['lantern']},
    {lab:'紺の着物に藤色の羽織の若女将',skin:0,outfit:'kimono',top:'#1f2a44',shirt:'#f3ecd8',obi:'#8a6d3b',pat:'dots',haori:'#8e6bb0',hair:'bun',hc:'#1a1a1a',face:'smile',acc:['lantern']},
  ],
  // ---- リハビリトレーナー（ヨガ教室・アンチエイジング・コンディショニング）
  rehab:[
    {lab:'白ポロのリハビリ担当',skin:1,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'short',hc:'#1a1a1a',face:'smile',acc:['clipboard']},
    {lab:'スクラブの女性トレーナー',skin:0,outfit:'scrubs',top:'#5aa9d6',hair:'pony',hc:'#3a2418',face:'smile',acc:['band']},
    {lab:'テーピングの達人',skin:2,outfit:'track',top:'#22344f',stripe:'#ffffff',hair:'buzz',hc:'#1a1a1a',face:'grin',acc:['tape']},
    {lab:'白衣の理学療法士',skin:0,outfit:'labcoat',top:'#f6f6f6',shirt:'#b9d8c2',tie:null,hair:'side',hc:'#2b1d14',face:'calm',acc:['glass','tablet']},
    {lab:'バランスボールのトレーナー',skin:1,outfit:'polo',top:'#2aa198',collar:'#ffffff',hair:'bob',hc:'#1a1a1a',face:'grin',acc:['bigball']},
    // 案6〜10：案1（白ポロのリハビリ担当）をもとに、一緒に体を動かしてくれそうな男性
    {lab:'タオルを首にかけた爽やかトレーナー',skin:1,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'short',hc:'#1a1a1a',face:'grin',acc:['short','towel','bottle']},
    {lab:'ヘッドバンドの熱血トレーナー',skin:2,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'short',hc:'#1a1a1a',face:'grin',acc:['short','muscle','sweatband','dumbbell']},
    {lab:'メディシンボールの兄貴',skin:3,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'buzz',hc:'#1a1a1a',face:'grin',acc:['short','muscle','medball']},
    {lab:'笛と水筒の伴走トレーナー',skin:1,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'side',hc:'#2b1d14',face:'smile',acc:['short','whistle','bottle']},
    {lab:'ゴムバンドで一緒にストレッチ',skin:2,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'mash',hc:'#1a1a1a',face:'grin',acc:['short','band','sweat']},
    // 案11（決定）：案9の水筒をカルテボード（片手）に
    {lab:'カルテボードの伴走トレーナー',skin:1,outfit:'polo',top:'#f4f4f4',collar:'#1f3c7a',hair:'side',hc:'#2b1d14',face:'smile',acc:['short','whistle','chart']},
  ],
  realtor:[
    {lab:'鍵を持った笑顔の営業',skin:1,outfit:'suit',top:'#b49a6c',shirt:'#ffffff',tie:'#2a7ab8',hair:'side',hc:'#1a1a1a',face:'smile',acc:['nametag','key']},
    {lab:'間取り図の女性スタッフ',skin:0,outfit:'suit',top:'#22325a',shirt:'#ffffff',tie:null,hair:'bun',hc:'#2a1a12',face:'smile',acc:['nametag','file']},
    {lab:'法被（はっぴ）の店長',skin:2,outfit:'happi',top:'#d35400',hair:'buzz',hc:'#1a1a1a',face:'grin',acc:['hachimaki','house']},
    {lab:'メガネの老舗の社長',skin:1,outfit:'vest',top:'#6b4f2a',shirt:'#ffffff',tie:'#8b1e1e',hair:'bald',hc:'#aaaaaa',face:'smile',acc:['glass','plan']},
    {lab:'青スーツの新人営業',skin:0,outfit:'suit',top:'#1f6fd6',shirt:'#ffffff',tie:'#f5c542',hair:'short',hc:'#2b1d14',face:'grin',acc:['nametag','house']},
  ],
};
const COACH_KIND_JP={mental:'メンタリスト',analyst:'スポーツアナリスト',trainer:'パーソナルトレーナー',agent:'代理人',realtor:'不動産屋',doctor:'怪しい医者',club:'球団コーチ',legend:'伝説の野球選手',rehab:'リハビリトレーナー',okami:'女将さん'};
// 着物の柄（桜・水玉・かすり）
const kimonoPat=(p,top)=>p==='sakura'?[[32,98],[64,96],[38,122],[66,122],[28,112],[70,108]].map(([x,y])=>`<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(a=>`<circle cx="${(1.6*Math.cos(a*Math.PI/180)).toFixed(1)}" cy="${(1.6*Math.sin(a*Math.PI/180)).toFixed(1)}" r="1.3" fill="#fff3f6"/>`).join('')}</g>`).join('')
  :p==='dots'?[[30,96],[40,104],[62,100],[70,94],[34,122],[64,122],[44,124],[56,120]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.5" fill="#ffffff55"/>`).join('')
  :p==='kasuri'?[[30,96],[38,104],[62,98],[70,106],[32,122],[44,124],[58,122],[68,120],[50,92]].map(([x,y])=>`<path d="M${x-2} ${y} L${x+2} ${y} M${x} ${y-2} L${x} ${y+2}" stroke="#2a5b9a" stroke-width="1.1" opacity=".8"/>`).join(''):'';
let CSVG_N=0;
function svgCoach(kind,i){
  const L=(COACH_LOOK[kind]||COACH_LOOK.mental)[i||0]||COACH_LOOK.mental[0];
  const sk=CSK[L.skin||0], has=a=>(L.acc||[]).includes(a), dark=c=>c;
  const top=L.top, hc=L.hc;
  const raise=has('pendulum')||has('cards')||has('tablet')||has('phone')||has('key')||has('contract')||has('papers')||has('notebook')||has('calc')||has('plan')||has('file')||has('flask')||has('syringe')||has('pill')||has('ball')||has('tape')||has('bottle')||has('chart')||has('lantern')||has('sensu')||has('teacup')||has('stopwatch')&&false;
  const both=has('laptop')||has('house')||has('clipboard')||has('bigtab')||has('trophy')||has('band')||has('bigball')||has('medball')||has('tray')||has('yumoita');
  const U=L.outfit==='uniform'?(typeof curUni==='function'?curUni():{jk:'#1f3c7a',jt:'#ffffff',cap:'#1f3c7a',cl:'#ffffff',s:'C'}):null;   // 球団コーチは所属球団のユニフォーム
  let back='', body='', arms='', hands='', head='', hair='', face='', front='', held='';
  // ---- 後ろ髪（頭より先に描く）
  if(L.hair==='long') back+=`<path d="M29 54 Q27 80 34 88 L66 88 Q73 80 71 54 Z" fill="${hc}"/>`;
  if(L.hair==='bob') back+=`<path d="M29 54 Q28 74 34 76 L66 76 Q72 74 71 54 Z" fill="${hc}"/>`;
  if(L.hair==='pony') back+=`<path d="M66 44 Q84 50 78 76 Q74 64 66 56 Z" fill="${hc}"/>`;
  if(L.outfit==='hoodie') back+=`<path d="M28 84 Q30 66 50 66 Q70 66 72 84 Z" fill="${top}"/>`;
  // ---- 胴
  const torso=`M24 128 L26 92 Q50 82 74 92 L76 128 Z`;
  if(L.outfit==='uniform'){
    body+=`<path d="M22 128 L25 90 Q50 80 75 90 L78 128 Z" fill="${U.jk}"/><path d="M50 84 L50 128" stroke="${U.jt}" stroke-width="2.5"/><path d="M42 84 L50 94 L58 84" fill="none" stroke="${U.jt}" stroke-width="2.5"/>`;
  }else if(L.outfit==='oldjersey'){
    body+=`<path d="${'M24 128 L26 92 Q50 82 74 92 L76 128 Z'}" fill="${top}"/>${[32,40,60,68].map(x=>`<path d="M${x} 90 L${x} 128" stroke="${L.stripe}" stroke-width=".8" opacity=".55"/>`).join('')}<path d="M42 84 L50 96 L58 84" fill="none" stroke="${L.stripe}" stroke-width="2"/><text x="50" y="118" font-size="16" font-weight="900" text-anchor="middle" fill="${L.stripe}" font-family="serif">${L.num||'1'}</text>`;
  }else if(L.outfit==='kimono'){
    body+=`<path d="M20 128 L24 90 Q50 82 76 90 L80 128 Z" fill="${top}"/>${kimonoPat(L.pat,top)}<path d="M40 84 L56 118 M60 84 L46 106" stroke="${L.shirt||'#ddd'}" stroke-width="3"/><path d="M24 110 L76 110 L76 116 L24 116 Z" fill="${L.obi||'#6b4f2a'}"/>${L.obi?`<path d="M24 113 L76 113" stroke="#0003" stroke-width=".8"/><rect x="46" y="110.5" width="8" height="5" rx="1" fill="#0002"/>`:''}`;
    if(L.haori) body+=`<path d="M20 128 L24 90 Q32 86 40 85 L47 128 Z" fill="${L.haori}"/><path d="M80 128 L76 90 Q68 86 60 85 L53 128 Z" fill="${L.haori}"/><path d="M44 100 Q50 104 56 100" stroke="#f3ecd8" stroke-width="1.4" fill="none"/><circle cx="50" cy="103" r="1.6" fill="#f3ecd8"/>`;   // 羽織と羽織紐
  }else if(L.outfit==='kappogi'){   // 割烹着（白い上っ張り。襟元から着物が見える）
    body+=`<path d="M20 128 L24 90 Q50 82 76 90 L80 128 Z" fill="${top}"/><path d="M22 128 L25 92 Q36 86 42 85 L50 99 L58 85 Q64 86 75 92 L78 128 Z" fill="#f7f5ef"/><path d="M40 84 L50 99 L60 84" fill="none" stroke="#f3ecd8" stroke-width="2"/><path d="M33 118 L67 118" stroke="#0001" stroke-width="1"/><rect x="58" y="104" width="9" height="8" rx="1" fill="none" stroke="#0002"/>`;
  }else if(L.outfit==='scrubs'){
    body+=`<path d="M24 128 L26 92 Q50 82 74 92 L76 128 Z" fill="${top}"/><path d="M42 84 L50 98 L58 84" fill="none" stroke="#0003" stroke-width="2"/><rect x="56" y="104" width="10" height="8" rx="1" fill="#0002"/>`;
  }else if(L.outfit==='tank'){
    body+=`<path d="M30 128 L31 90 Q50 84 69 90 L70 128 Z" fill="${top}"/><path d="M40 86 Q50 96 60 86" fill="${sk}"/>`;
  }else if(L.outfit==='happi'){
    body+=`<path d="M20 128 L24 90 Q50 82 76 90 L80 128 Z" fill="${top}"/><path d="M38 86 L50 128 M62 86 L50 128" stroke="#1a1a1a" stroke-width="5"/>
      <path d="M44 86 L50 100 L56 86 Z" fill="#f4f4f4"/><text x="38" y="112" font-size="7" fill="#fff" font-weight="900" font-family="sans-serif" transform="rotate(-62 38 112)">不動産</text>
      <path d="M20 122 L80 122" stroke="#fff" stroke-width="2" opacity=".8"/>`;
  }else{
    body+=`<path d="${torso}" fill="${top}"/>`;
    if(has('pinstripe')) body+=[30,36,42,58,64,70].map(x=>`<path d="M${x} 90 L${x} 128" stroke="#ffffff" stroke-width=".5" opacity=".35"/>`).join('');
  }
  if(L.outfit==='suit'||L.outfit==='labcoat'){
    body+=`<path d="M41 85 L50 104 L59 85 Z" fill="${L.shirt||'#fff'}"/>`;
    if(L.tie) body+=`<path d="M48.6 88 L51.4 88 L53.4 106 L50 111 L46.6 106 Z" fill="${L.tie}"/><path d="M48 86 L52 86 L51.4 89 L48.6 89 Z" fill="${L.tie}"/>`;
    else body+=`<path d="M45 86 L50 92 L55 86" fill="none" stroke="#0003" stroke-width="1"/>`;
    body+=`<path d="M41 85 L47 106 L44 92 Z" fill="#0005"/><path d="M59 85 L53 106 L56 92 Z" fill="#0005"/>`;
    if(L.outfit==='labcoat') body+=`<path d="M50 106 L50 128" stroke="#cfd6dd" stroke-width="1.2"/><rect x="58" y="108" width="10" height="7" rx="1" fill="none" stroke="#cfd6dd"/><path d="M60 106 L60 112" stroke="#2a7ab8" stroke-width="1.4"/>`;
    else body+=`<circle cx="50" cy="114" r="1.2" fill="#0007"/><circle cx="50" cy="121" r="1.2" fill="#0007"/>`;
  }
  if(L.outfit==='vest'){
    body=`<path d="${torso}" fill="${L.shirt||'#fff'}"/><path d="M30 128 L31 92 Q42 86 44 86 L50 104 L56 86 Q58 86 69 92 L70 128 Z" fill="${top}"/>`;
    if(L.tie) body+=`<path d="M48.6 88 L51.4 88 L53 102 L50 106 L47 102 Z" fill="${L.tie}"/>`;
    body+=`<circle cx="50" cy="112" r="1.2" fill="#0007"/><circle cx="50" cy="119" r="1.2" fill="#0007"/>`;
  }
  if(L.outfit==='turtle') body+=`<path d="M41 82 Q50 86 59 82 L59 88 Q50 92 41 88 Z" fill="${L.inner||top}"/><path d="M38 88 L44 128 M62 88 L56 128" stroke="#ffffff22" stroke-width="2"/>`;
  if(L.outfit==='cardigan') body+=`<path d="M42 85 L50 100 L58 85 L58 128 L42 128 Z" fill="${L.shirt||'#fff'}"/><path d="M42 85 L44 128 M58 85 L56 128" stroke="#0003" stroke-width="1.5"/>${[96,106,116].map(y=>`<circle cx="45" cy="${y}" r="1.1" fill="#fff"/>`).join('')}`;
  if(L.outfit==='polo') body+=`<path d="M42 84 L50 92 L58 84 L56 82 L50 86 L44 82 Z" fill="${L.collar||'#ffffff'}" opacity=".9"/><path d="M50 88 L50 100" stroke="#0004" stroke-width="1.2"/><circle cx="50" cy="94" r=".9" fill="#0006"/><circle cx="50" cy="98" r=".9" fill="#0006"/>`;
  if(L.outfit==='track') body+=`<path d="M50 84 L50 128" stroke="#ddd" stroke-width="1.4"/><path d="M42 83 L50 90 L58 83 L58 80 L42 80 Z" fill="${top}" stroke="#0003"/>`;
  if(L.outfit==='samue') body+=`<path d="M40 84 L58 112 M60 84 L46 104" stroke="#e8e0cc" stroke-width="2.4"/><path d="M26 112 L74 112" stroke="#1a2238" stroke-width="3"/>`;
  if(L.outfit==='hoodie') body+=`<path d="M44 86 L45 100 M56 86 L55 100" stroke="#ddd" stroke-width="1.2"/><path d="M36 112 L64 112 L62 124 L38 124 Z" fill="#0003"/>`;
  // ---- 腕（右手に物を持つと腕を上げる）
  const armC=L.outfit==='tank'||has('short')?sk:L.outfit==='vest'?(L.shirt||'#fff'):L.outfit==='uniform'?U.jk:L.outfit==='kappogi'?'#f7f5ef':L.haori||top, aw=L.outfit==='tank'||has('short')?(has('muscle')?13:10):10;
  const lArm=both?`M26 94 Q18 104 34 110`:`M26 94 Q14 104 17 119`, rArm=(raise||both)?`M74 94 Q86 102 ${both?'66 110':'82 106'}`:`M74 94 Q86 104 83 119`;
  arms+=`<path d="${lArm}" fill="none" stroke="${armC}" stroke-width="${aw}" stroke-linecap="round"/><path d="${rArm}" fill="none" stroke="${armC}" stroke-width="${aw}" stroke-linecap="round"/>`;
  if(L.outfit==='track') arms+=`<path d="${lArm}" fill="none" stroke="${L.stripe}" stroke-width="1.2" transform="translate(-3 0)"/><path d="${rArm}" fill="none" stroke="${L.stripe}" stroke-width="1.2" transform="translate(3 0)"/>`;
  if(has('short')) arms+=`<ellipse cx="25" cy="96" rx="8" ry="7" fill="${top}"/><ellipse cx="75" cy="96" rx="8" ry="7" fill="${top}"/>`;   // 半袖
  if(L.outfit==='uniform') arms+=`<path d="${lArm}" fill="none" stroke="${U.jt}" stroke-width="2" transform="translate(-4 0)"/><path d="${rArm}" fill="none" stroke="${U.jt}" stroke-width="2" transform="translate(4 0)"/>`;
  if(L.outfit==='happi') arms+=`<path d="M24 92 L10 112 L22 116 L30 100 Z" fill="${top}"/><path d="M76 92 L90 112 L78 116 L70 100 Z" fill="${top}"/>`;
  const lh=both?[34,110]:[17,120], rh=both?[66,110]:raise?[82,106]:[83,120];
  if(has('muscle')) arms+=`<path d="M18 102 Q22 98 26 102" fill="none" stroke="#0003" stroke-width="1.5"/><path d="M82 102 Q78 98 74 102" fill="none" stroke="#0003" stroke-width="1.5"/>`;
  hands+=`<circle cx="${lh[0]}" cy="${lh[1]}" r="5" fill="${sk}"/><circle cx="${rh[0]}" cy="${rh[1]}" r="5" fill="${sk}"/>`;
  if(has('watch')) hands+=`<rect x="${lh[0]-4}" y="${lh[1]-8}" width="8" height="3" rx="1" fill="#e2b33a"/>`;
  // ---- 首と頭
  head+=`<rect x="44" y="72" width="12" height="12" fill="${sk}"/><circle cx="30.5" cy="58" r="3.5" fill="${sk}"/><circle cx="69.5" cy="58" r="3.5" fill="${sk}"/><circle cx="50" cy="56" r="20" fill="${sk}"/>`;
  if(has('earring')) head+=`<circle cx="30" cy="63" r="1.6" fill="#e2b33a"/><circle cx="70" cy="63" r="1.6" fill="#e2b33a"/>`;
  // ---- 髪
  const H={
    slick:`<path d="M30 52 Q30 33 50 32 Q70 33 70 52 Q67 41 50 40 Q33 41 30 52 Z" fill="${hc}"/><path d="M38 36 Q50 39 62 36 M36 40 Q50 42 64 40" stroke="#ffffff33" stroke-width="1" fill="none"/>`,
    short:`<path d="M30 52 Q30 33 50 32 Q70 33 70 52 Q66 42 58 42 Q50 38 42 42 Q34 42 30 52 Z" fill="${hc}"/>`,
    side:`<path d="M30 54 Q29 33 50 32 Q71 33 70 52 Q60 44 46 44 Q36 46 30 54 Z" fill="${hc}"/><path d="M46 33 Q42 38 46 44" stroke="#0004" stroke-width="1" fill="none"/>`,
    long:`<path d="M29 56 Q28 33 50 32 Q72 33 71 56 Q66 42 54 40 Q46 46 34 46 Q30 50 29 56 Z" fill="${hc}"/>`,
    bob:`<path d="M29 58 Q28 33 50 32 Q72 33 71 58 Q68 46 62 44 L38 44 Q32 46 29 58 Z" fill="${hc}"/><path d="M36 44 L64 44 L64 47 L36 47 Z" fill="${hc}"/>`,
    pony:`<path d="M30 52 Q30 33 50 32 Q70 33 70 52 Q66 41 50 41 Q34 41 30 52 Z" fill="${hc}"/>`,
    nihongami:`<ellipse cx="50" cy="28" rx="13" ry="7" fill="${hc}"/><path d="M44 28 Q50 24 56 28" stroke="#0004" stroke-width="1" fill="none"/><ellipse cx="29.5" cy="50" rx="5" ry="8" fill="${hc}"/><ellipse cx="70.5" cy="50" rx="5" ry="8" fill="${hc}"/><path d="M30 54 Q29 33 50 33 Q71 33 70 54 Q66 41 50 41 Q34 41 30 54 Z" fill="${hc}"/>`,   // 日本髪（大きな髷と横の張り）
    bun:`<circle cx="50" cy="30" r="7" fill="${hc}"/><path d="M30 54 Q30 33 50 33 Q70 33 70 54 Q66 42 50 42 Q34 42 30 54 Z" fill="${hc}"/>`,
    bald:`<path d="M30 58 Q30 50 32 48 L33 60 Z" fill="${hc}"/><path d="M70 58 Q70 50 68 48 L67 60 Z" fill="${hc}"/><path d="M42 38 Q50 35 56 37" stroke="#ffffff55" stroke-width="2" fill="none"/>`,
    buzz:`<path d="M30 52 Q30 34 50 33 Q70 34 70 52 Q66 44 50 43 Q34 44 30 52 Z" fill="${hc}" opacity=".75"/>`,
    mash:`<path d="M29 56 Q28 32 50 31 Q72 32 71 56 Q70 50 66 50 L34 50 Q30 50 29 56 Z" fill="${hc}"/>`,
    messy:`<path d="M30 54 L28 44 L34 46 L33 36 L40 40 L42 31 L48 37 L52 29 L56 37 L62 31 L63 40 L70 37 L67 46 L72 45 L70 54 Q60 44 50 44 Q40 44 30 54 Z" fill="${hc}"/>`,
    capback:`<path d="M30 52 Q30 33 50 32 Q70 33 70 52 Z" fill="${L.cap||'#1f3c7a'}"/><path d="M30 50 Q22 50 18 46 L20 42 Q26 46 31 45 Z" fill="${L.cap||'#1f3c7a'}"/><path d="M30 52 L70 52" stroke="#0004" stroke-width="1.5"/>`,
  };
  if(L.outfit==='uniform'){   // 球団の帽子（横の髪だけ見える）
    hair+=`<path d="M30 56 Q30 50 33 48 L33 58 Z" fill="${hc}"/><path d="M70 56 Q70 50 67 48 L67 58 Z" fill="${hc}"/><path d="M29 52 Q30 32 50 31 Q70 32 71 52 Z" fill="${U.cap}"/><path d="M40 50 Q24 49 18 54 L40 54 Z" fill="${U.brim||U.cap}"/>
      <text x="50" y="48" font-size="${(U.capf||U.chf)==='script'?12:U.capf==='serif'?11:10}" fill="${U.cl||'#fff'}" ${U.cls?`stroke="${U.cls}" stroke-width="0.8" paint-order="stroke"`:''} text-anchor="middle" ${typeof capFont==='function'?capFont(U):'font-family="sans-serif" font-weight="900"'}>${U.ch||''}</text>`;
  }else hair+=H[L.hair]||'';
  if(has('sweatband')) hair+=`<path d="M29.5 47 Q50 40 70.5 47 L70.5 53 Q50 46 29.5 53 Z" fill="#ffffff"/><path d="M30 50 Q50 43.5 70 50" stroke="#e74c3c" stroke-width="1.6" fill="none"/>`;
  if(has('scrubcap')) hair+=`<path d="M29 52 Q29 31 50 31 Q71 31 71 52 Q60 46 50 46 Q40 46 29 52 Z" fill="${L.top||'#2f6f5a'}"/><path d="M30 50 Q50 44 70 50" stroke="#0003" stroke-width="1.2" fill="none"/>`;
  if(has('headmirror')) hair+=`<path d="M30 47 Q50 38 70 47" fill="none" stroke="#333" stroke-width="2.2"/><circle cx="50" cy="40" r="6.5" fill="#dfe6ee" stroke="#777" stroke-width="1.4"/><circle cx="50" cy="40" r="2" fill="#333"/>`;
  if(has('hairband')) hair+=`<path d="M30 49 Q50 36 70 49" fill="none" stroke="#f5c542" stroke-width="3"/>`;
  if(has('kanzashi')) hair+=`<path d="M58 33 L68 24" stroke="#c9a227" stroke-width="1.4"/><g transform="translate(${L.hair==='nihongami'?63:60} ${L.hair==='nihongami'?24:28})">${[0,72,144,216,288].map(a=>`<circle cx="${(3*Math.cos(a*Math.PI/180)).toFixed(1)}" cy="${(3*Math.sin(a*Math.PI/180)).toFixed(1)}" r="2.2" fill="#e0566e"/>`).join('')}<circle r="1.5" fill="#f5c542"/></g><path d="M66 27 L67 33 M68 26 L70 32" stroke="#c9a227" stroke-width=".8"/><circle cx="67" cy="34" r="1" fill="#c9a227"/><circle cx="70" cy="33" r="1" fill="#c9a227"/>`;   // かんざし（花とびら）
  if(has('tenugui')) hair+=`<path d="M35 38 Q50 30 65 38 L64 33 Q50 25.5 36 33 Z" fill="#ffffff" stroke="#0002"/><path d="M36.5 35.5 Q50 28 63.5 35.5" stroke="#2a5b9a" stroke-width="1" fill="none"/><path d="M38 37.5 Q50 31 62 37.5" stroke="#2a5b9a" stroke-width=".7" fill="none"/>`;   // 頭にのせた手ぬぐい
  if(has('hachimaki')) hair+=`<path d="M29 48 Q50 42 71 48 L71 52 Q50 46 29 52 Z" fill="#ffffff"/><path d="M70 49 L78 44 M70 50 L79 52" stroke="#fff" stroke-width="2"/>`;
  if(has('headset')) hair+=`<path d="M29 56 Q29 30 50 30 Q71 30 71 56" fill="none" stroke="#222" stroke-width="2.4"/><rect x="26" y="53" width="6" height="10" rx="2" fill="#222"/><path d="M29 62 Q32 70 42 69" fill="none" stroke="#222" stroke-width="1.6"/><circle cx="43" cy="69" r="1.8" fill="#222"/>`;
  if(has('sunglassup')) hair+=`<rect x="36" y="40" width="12" height="5" rx="2" fill="#111"/><rect x="52" y="40" width="12" height="5" rx="2" fill="#111"/><path d="M48 42 L52 42" stroke="#111" stroke-width="1.5"/>`;
  // ---- 顔
  const eyes={calm:`<path d="M39 59 Q43 56 47 59 M53 59 Q57 56 61 59" stroke="#222" stroke-width="1.8" fill="none"/>`,
    closed:`<path d="M39 59 Q43 62 47 59 M53 59 Q57 62 61 59" stroke="#222" stroke-width="1.8" fill="none"/>`,
    smile:`<circle cx="43" cy="59" r="2.1" fill="#222"/><circle cx="57" cy="59" r="2.1" fill="#222"/>`,
    grin:`<circle cx="43" cy="59" r="2.1" fill="#222"/><circle cx="57" cy="59" r="2.1" fill="#222"/>`,
    smirk:`<circle cx="43" cy="59" r="2.1" fill="#222"/><circle cx="57" cy="59" r="2.1" fill="#222"/><path d="M39 54 L46 55 M54 55 L61 53" stroke="#222" stroke-width="1.4"/>`,
    shout:`<path d="M39 55 L47 58 M53 58 L61 55" stroke="#222" stroke-width="1.8"/><circle cx="43" cy="60" r="2" fill="#222"/><circle cx="57" cy="60" r="2" fill="#222"/>`}[L.face]||'';
  const mouth={calm:`<path d="M45 68 Q50 70 55 68" stroke="#7a3b22" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    closed:`<path d="M46 68 Q50 70 54 68" stroke="#7a3b22" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    smile:`<path d="M44 66 Q50 71 56 66" stroke="#a0522d" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    grin:`<path d="M43 65 Q50 74 57 65 Z" fill="#7a2a1a"/><path d="M44 65.5 L56 65.5" stroke="#fff" stroke-width="1.6"/>`,
    smirk:`<path d="M45 68 Q52 69 56 65" stroke="#7a3b22" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    shout:`<ellipse cx="50" cy="68" rx="5" ry="4" fill="#7a2a1a"/>`}[L.face]||'';
  face+=eyes+mouth;
  if(has('glass')) face+=`<rect x="36.5" y="54.5" width="12" height="9" rx="2" fill="#ffffff22" stroke="#222" stroke-width="1.6"/><rect x="51.5" y="54.5" width="12" height="9" rx="2" fill="#ffffff22" stroke="#222" stroke-width="1.6"/><path d="M48.5 58 L51.5 58" stroke="#222" stroke-width="1.4"/>`;
  if(has('roundglass')) face+=`<circle cx="43" cy="59" r="5.2" fill="#ffffff22" stroke="#7a5a2a" stroke-width="1.5"/><circle cx="57" cy="59" r="5.2" fill="#ffffff22" stroke="#7a5a2a" stroke-width="1.5"/><path d="M48 58 L52 58" stroke="#7a5a2a" stroke-width="1.3"/>`;
  if(has('sunglass')) face+=`<rect x="35" y="54" width="13" height="8" rx="3" fill="#111"/><rect x="52" y="54" width="13" height="8" rx="3" fill="#111"/><path d="M48 57 L52 57" stroke="#111" stroke-width="2"/>`;
  if(has('mustache')) face+=`<path d="M42 65 Q46 62 50 64 Q54 62 58 65 Q54 66 50 65 Q46 66 42 65 Z" fill="${L.hair==='bald'?'#666':hc}"/>`;
  if((has('brow')||has('browbig'))&&L.face!=='smirk'&&L.face!=='shout'){ const bw=has('browbig')?2.8:1.6, bc=L.bc||hc; face+=`<path d="M38 53.5 Q43 51 48 53" stroke="${bc}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="M52 53 Q57 51 62 53.5" stroke="${bc}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`; }
  if(has('wrinkle')) face+=`<path d="M34.5 58 L32 56.5 M34.5 60 L32 60 M65.5 58 L68 56.5 M65.5 60 L68 60" stroke="#0004" stroke-width=".9"/><path d="M42 64 Q40 67 42 70 M58 64 Q60 67 58 70" stroke="#0003" stroke-width="1" fill="none"/>${L.hair==='bald'||L.hair==='short'||L.hair==='messy'?'<path d="M41 47 Q50 45 59 47 M43 49.5 Q50 48 57 49.5" stroke="#0003" stroke-width=".9" fill="none"/>':''}`;
  if(has('sweat')) face+=`<path d="M68 46 Q70 50 68 52 Q66 50 68 46 Z" fill="#9fd3ff"/><path d="M32 50 Q33.5 53 32 55 Q30.5 53 32 50 Z" fill="#9fd3ff"/>`;
  if(has('monocle')) face+=`<circle cx="57" cy="59" r="5.4" fill="#ffffff33" stroke="#d4a52a" stroke-width="1.6"/><path d="M62 61 Q66 70 62 78" fill="none" stroke="#d4a52a" stroke-width=".8"/>`;
  if(has('mask')) face+=`<path d="M36 62 Q50 60 64 62 L62 72 Q50 77 38 72 Z" fill="#e8f3f0" stroke="#9fb9b2" stroke-width="1"/><path d="M38 65 L62 65 M39 68 L61 68" stroke="#c9dcd7" stroke-width=".8"/><path d="M36 63 L31 58 M64 63 L69 58" stroke="#e8f3f0" stroke-width="1.2"/>`;
  if(has('beard')) face+=`<path d="M34 62 Q36 80 50 82 Q64 80 66 62 Q62 72 50 73 Q38 72 34 62 Z" fill="${hc}"/><path d="M44 66 Q50 69 56 66" stroke="#7a3b22" stroke-width="1.6" fill="none"/>`;
  // ---- 首まわり・胸の小物
  if(has('whistle')) front+=`<path d="M44 84 L50 100 L56 84" fill="none" stroke="#e74c3c" stroke-width="1.2"/><rect x="47" y="99" width="7" height="4" rx="2" fill="#bdc3c7"/>`;
  if(has('stopwatch')) front+=`<path d="M44 84 L48 100 M56 84 L52 100" stroke="#333" stroke-width="1"/><circle cx="50" cy="104" r="5" fill="#eee" stroke="#333" stroke-width="1.4"/><path d="M50 104 L50 101" stroke="#c0392b" stroke-width="1.2"/>`;
  if(has('towel')) front+=`<path d="M40 82 Q50 90 60 82 L62 86 L58 104 L54 104 L56 88 Q50 92 44 88 L46 104 L42 104 L38 86 Z" fill="${L.towel||(/^#f/i.test(top||'')?'#5b9bd5':'#f4f4f4')}"/>`;   // 白い服のときは青いタオル
  if(has('beads')) front+=`${Array.from({length:9},(_,k)=>{ const a=Math.PI*(0.1+k*0.1); return `<circle cx="${(50-14*Math.cos(a)).toFixed(1)}" cy="${(86+12*Math.sin(a)).toFixed(1)}" r="1.8" fill="#6b3a1e"/>`; }).join('')}`;
  if(has('stetho')) front+=`<path d="M42 84 Q38 100 46 106 Q50 108 54 106 Q62 100 58 84" fill="none" stroke="#2b2b2b" stroke-width="1.6"/><circle cx="50" cy="108" r="3.2" fill="#c0c6cc" stroke="#555"/>`;
  if(has('nametag')) front+=`<rect x="56" y="96" width="12" height="6" rx="1" fill="#fff" stroke="#0003"/><path d="M58 99 L66 99" stroke="#2a7ab8" stroke-width="1.2"/>`;
  if(has('clip')) front+=`<rect x="57" y="96" width="9" height="6" rx="1" fill="#eaeaea"/>`;
  // ---- 手に持つ物
  const [hx,hy]=rh;
  if(has('pendulum')) held+=`<path d="M${hx} ${hy+2} L${hx-1} ${hy+18}" stroke="#d9c27a" stroke-width=".8"/><circle cx="${hx-1}" cy="${hy+21}" r="3.6" fill="#d4a52a" stroke="#9a7a1a"/><circle cx="${hx-1}" cy="${hy+21}" r="1.1" fill="${top}"/>`;
  if(has('cards')) held+=`<g transform="translate(${hx-6} ${hy-14})"><rect x="0" y="2" width="8" height="11" rx="1" fill="#fff" stroke="#999" transform="rotate(-15 4 12)"/><rect x="3" y="0" width="8" height="11" rx="1" fill="#fff" stroke="#999"/><rect x="6" y="2" width="8" height="11" rx="1" fill="#fff" stroke="#999" transform="rotate(15 10 12)"/><text x="7" y="9" font-size="6" fill="#c0392b" text-anchor="middle">♥</text></g>`;
  if(has('notebook')) held+=`<rect x="${hx-8}" y="${hy-12}" width="12" height="15" rx="1" fill="#8e6bbf" stroke="#5b3f86"/>`;
  if(has('tablet')) held+=`<rect x="${hx-9}" y="${hy-16}" width="15" height="21" rx="2" fill="#222"/><rect x="${hx-7.5}" y="${hy-14}" width="12" height="16" fill="#4ea1ff"/><path d="M${hx-6} ${hy-2} L${hx-3} ${hy-6} L${hx} ${hy-4} L${hx+3} ${hy-10}" stroke="#fff" stroke-width="1" fill="none"/>`;
  if(has('phone')) held+=`<rect x="${hx-4}" y="${hy-14}" width="7" height="12" rx="1.5" fill="#222"/><rect x="${hx-3}" y="${hy-12.5}" width="5" height="8.5" fill="#7fe0a2"/>`;
  if(has('key')) held+=`<circle cx="${hx}" cy="${hy-10}" r="3.2" fill="none" stroke="#e2b33a" stroke-width="1.8"/><path d="M${hx} ${hy-7} L${hx} ${hy+2} M${hx} ${hy-1} L${hx+3} ${hy-1} M${hx} ${hy+1.5} L${hx+2.4} ${hy+1.5}" stroke="#e2b33a" stroke-width="1.6"/>`;
  if(has('contract')) held+=`<rect x="${hx-10}" y="${hy-14}" width="12" height="16" fill="#fff" stroke="#bbb"/><path d="M${hx-8} ${hy-10} L${hx-1} ${hy-10} M${hx-8} ${hy-7} L${hx} ${hy-7} M${hx-8} ${hy-4} L${hx-2} ${hy-4}" stroke="#999" stroke-width=".8"/><path d="M${hx-3} ${hy-1} L${hx+6} ${hy-12}" stroke="#d4a52a" stroke-width="1.6"/>`;
  if(has('papers')) held+=`<rect x="${hx-10}" y="${hy-14}" width="13" height="16" fill="#fff" stroke="#bbb" transform="rotate(-8 ${hx} ${hy})"/><path d="M${hx-8} ${hy-6} L${hx-5} ${hy-9} L${hx-2} ${hy-7} L${hx+1} ${hy-11}" stroke="#2a7ab8" stroke-width="1" fill="none"/>`;
  if(has('calc')) held+=`<rect x="${hx-8}" y="${hy-14}" width="11" height="15" rx="1.5" fill="#333"/><rect x="${hx-6.5}" y="${hy-12.5}" width="8" height="3.5" fill="#bfe6a8"/>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${hx-6.5+c*2.8}" y="${hy-7.5+r*2.6}" width="2" height="1.8" fill="#aaa"/>`).join('')).join('')}`;
  if(has('plan')||has('file')) held+=`<rect x="${hx-11}" y="${hy-15}" width="15" height="17" fill="${has('file')?'#2a7ab8':'#fff'}" stroke="#999"/>${has('plan')?`<path d="M${hx-9} ${hy-13} L${hx+2} ${hy-13} L${hx+2} ${hy} L${hx-9} ${hy} Z M${hx-9} ${hy-7} L${hx-3} ${hy-7} L${hx-3} ${hy}" fill="none" stroke="#2a7ab8" stroke-width=".9"/>`:`<rect x="${hx-9}" y="${hy-12}" width="11" height="3" fill="#fff"/>`}`;
  if(has('flask')) held+=`<path d="M${hx-3} ${hy-18} L${hx+1} ${hy-18} L${hx+1} ${hy-12} L${hx+7} ${hy+1} Q${hx+8} ${hy+4} ${hx+4} ${hy+4} L${hx-6} ${hy+4} Q${hx-10} ${hy+4} ${hx-9} ${hy+1} L${hx-3} ${hy-12} Z" fill="#7fd36b" stroke="#3d6b33" stroke-width="1"/><circle cx="${hx-2}" cy="${hy-1}" r="1.4" fill="#d9ffcc"/><circle cx="${hx+2}" cy="${hy-5}" r="1" fill="#d9ffcc"/>`;
  if(has('syringe')) held+=`<g transform="rotate(-35 ${hx} ${hy})"><rect x="${hx-2.5}" y="${hy-20}" width="5" height="16" rx="1" fill="#e9f4ff" stroke="#7a8a99"/><rect x="${hx-2}" y="${hy-12}" width="4" height="7" fill="#c0392b" opacity=".7"/><path d="M${hx} ${hy-4} L${hx} ${hy+3}" stroke="#999" stroke-width="1"/><path d="M${hx-4} ${hy-20} L${hx+4} ${hy-20} M${hx} ${hy-20} L${hx} ${hy-24}" stroke="#7a8a99" stroke-width="1.6"/></g>`;
  if(has('pill')) held+=`<rect x="${hx-5}" y="${hy-15}" width="10" height="14" rx="2" fill="#d98c2b" opacity=".9"/><rect x="${hx-6}" y="${hy-18}" width="12" height="4" rx="1" fill="#f4f4f4"/><rect x="${hx-4}" y="${hy-10}" width="8" height="4" fill="#fff"/>`;
  if(has('ball')) held+=`<circle cx="${hx}" cy="${hy-8}" r="5.5" fill="#fafafa" stroke="#aaa"/><path d="M${hx-3} ${hy-12} Q${hx-1} ${hy-8} ${hx-3} ${hy-4} M${hx+3} ${hy-12} Q${hx+1} ${hy-8} ${hx+3} ${hy-4}" stroke="#d33" stroke-width=".9" fill="none"/>`;
  if(has('tape')) held+=`<circle cx="${hx}" cy="${hy-8}" r="6" fill="#f2efe6" stroke="#b9b29c" stroke-width="1.2"/><circle cx="${hx}" cy="${hy-8}" r="2.6" fill="${top}"/><path d="M${hx+5} ${hy-6} L${hx+10} ${hy+4}" stroke="#f2efe6" stroke-width="3"/>`;
  if(has('bat')) held+=`<path d="M${rh[0]-2} ${rh[1]+2} L${rh[0]+8} ${rh[1]-44}" stroke="#b07a3c" stroke-width="5" stroke-linecap="round"/><path d="M${rh[0]+5} ${rh[1]-30} L${rh[0]+8} ${rh[1]-44}" stroke="#c48d4b" stroke-width="7" stroke-linecap="round"/>`;
  if(has('fungo')) held+=`<path d="M${rh[0]-2} ${rh[1]+2} L${rh[0]+10} ${rh[1]-48}" stroke="#2b2b2b" stroke-width="3.6" stroke-linecap="round"/><path d="M${rh[0]+7} ${rh[1]-34} L${rh[0]+10} ${rh[1]-48}" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round"/><circle cx="${rh[0]+16}" cy="${rh[1]-52}" r="3.4" fill="#fafafa" stroke="#aaa"/>`;
  if(has('mitt')) held+=`<ellipse cx="${lh[0]}" cy="${lh[1]-3}" rx="9" ry="8" fill="#8a4b1f" stroke="#5a2f12" stroke-width="1.2"/><path d="M${lh[0]-5} ${lh[1]-5} Q${lh[0]} ${lh[1]-9} ${lh[0]+5} ${lh[1]-5}" stroke="#c98a4b" stroke-width="1" fill="none"/>`;
  if(has('chart')) held+=`<g transform="rotate(-8 ${hx} ${hy})"><rect x="${hx-11}" y="${hy-20}" width="16" height="21" rx="1.5" fill="#8a5a2b"/><rect x="${hx-9}" y="${hy-17}" width="12" height="16" fill="#fff"/><rect x="${hx-6}" y="${hy-22}" width="6" height="3.5" rx="1" fill="#bbb"/><path d="M${hx-7} ${hy-13} L${hx+1} ${hy-13} M${hx-7} ${hy-10} L${hx+1} ${hy-10} M${hx-7} ${hy-7} L${hx-1} ${hy-7}" stroke="#9aa" stroke-width="1"/><path d="M${hx-7} ${hy-4} L${hx-5} ${hy-2} L${hx-1} ${hy-6}" stroke="#2a7ab8" stroke-width="1.2" fill="none"/></g>`;   // カルテボード（片手）
  if(has('bottle')) held+=`<rect x="${hx-4}" y="${hy-17}" width="8" height="17" rx="2.5" fill="#2a7ab8"/><rect x="${hx-3}" y="${hy-21}" width="6" height="4" rx="1" fill="#e8e8e8"/><rect x="${hx-4}" y="${hy-11}" width="8" height="3" fill="#ffffff88"/>`;
  if(has('medball')) held=`<circle cx="50" cy="108" r="11" fill="#3b3b3b"/><path d="M39 108 L61 108 M50 97 Q56 108 50 119 M50 97 Q44 108 50 119" stroke="#e2b33a" stroke-width="1.2" fill="none"/>`+held;
  if(has('trophy')) held+=`<path d="M40 100 L60 100 L58 112 Q50 118 42 112 Z" fill="#e2b33a" stroke="#9a7a1a"/><path d="M40 102 Q33 102 35 108 Q37 112 42 111 M60 102 Q67 102 65 108 Q63 112 58 111" fill="none" stroke="#e2b33a" stroke-width="2"/><rect x="47" y="116" width="6" height="5" fill="#9a7a1a"/><rect x="42" y="121" width="16" height="4" rx="1" fill="#6b4f2a"/>`;
  if(has('band')) held+=`<path d="M34 110 Q50 100 66 110" fill="none" stroke="#e74c3c" stroke-width="3"/><path d="M34 112 Q50 104 66 112" fill="none" stroke="#c0392b" stroke-width="1"/>`;
  if(has('bigball')) held=`<circle cx="50" cy="114" r="15" fill="#e67e22"/><path d="M37 107 Q50 112 63 107" stroke="#f5b041" stroke-width="2" fill="none"/>`+held;
  if(has('briefcase')) held+=`<rect x="76" y="114" width="20" height="14" rx="2" fill="#3b2412"/><path d="M82 114 L82 111 L90 111 L90 114" fill="none" stroke="#3b2412" stroke-width="1.8"/><path d="M76 120 L96 120" stroke="#e2b33a" stroke-width="1"/>`;
  if(has('dumbbell')) held+=`<path d="M${hx-9} ${hy} L${hx+9} ${hy}" stroke="#555" stroke-width="2.4"/><rect x="${hx-12}" y="${hy-5}" width="4" height="10" rx="1" fill="#333"/><rect x="${hx+8}" y="${hy-5}" width="4" height="10" rx="1" fill="#333"/>`;
  if(has('yogamat')) held=`<rect x="6" y="96" width="9" height="30" rx="4.5" fill="#9b59b6"/><ellipse cx="10.5" cy="96" rx="4.5" ry="2" fill="#b07cc6"/>`+held;
  if(has('laptop')) held+=`<path d="M34 114 L66 114 L70 122 L30 122 Z" fill="#9aa3ad"/><rect x="36" y="98" width="28" height="16" rx="1.5" fill="#2b2f36"/><rect x="38" y="100" width="24" height="12" fill="#4ea1ff"/><path d="M40 110 L45 105 L50 108 L56 102 L60 104" stroke="#fff" stroke-width="1" fill="none"/>`;
  if(has('clipboard')) held+=`<rect x="38" y="98" width="24" height="28" rx="2" fill="#8a5a2b"/><rect x="41" y="102" width="18" height="22" fill="#fff"/><rect x="45" y="96" width="10" height="4" rx="1" fill="#bbb"/><path d="M43 107 L57 107 M43 111 L57 111 M43 115 L53 115" stroke="#999" stroke-width="1"/>`;
  if(has('bigtab')) held+=`<rect x="33" y="92" width="34" height="34" rx="3" fill="#1d1f24"/><rect x="36" y="95" width="28" height="27" fill="#4ea1ff"/><path d="M38 118 L44 110 L50 113 L56 104 L62 100" stroke="#fff" stroke-width="1.4" fill="none"/><rect x="39" y="98" width="10" height="3" fill="#ffffffaa"/><circle cx="50" cy="124" r="1" fill="#666"/>`;
  if(has('house')) held+=`<path d="M38 112 L50 100 L62 112 L62 126 L38 126 Z" fill="#f4e3c1" stroke="#8a5a2b" stroke-width="1"/><path d="M35 113 L50 98 L65 113" fill="none" stroke="#c0392b" stroke-width="3" stroke-linejoin="round"/><rect x="47" y="116" width="6" height="10" fill="#8a5a2b"/><rect x="40" y="114" width="5" height="5" fill="#9ec3e6"/><rect x="55" y="114" width="5" height="5" fill="#9ec3e6"/>`;
  if(has('lantern')) held+=`<path d="M${hx} ${hy-2} L${hx} ${hy-10}" stroke="#3b2412" stroke-width="1.4"/><rect x="${hx-4}" y="${hy-13}" width="8" height="2.5" fill="#222"/><ellipse cx="${hx}" cy="${hy-22}" rx="7" ry="9.5" fill="#f4e3c1" stroke="#c0392b" stroke-width="1.2"/>${[-5,0,5].map(d=>`<path d="M${hx-6.5} ${hy-22+d} Q${hx} ${hy-20+d} ${hx+6.5} ${hy-22+d}" stroke="#c0392b55" stroke-width=".7" fill="none"/>`).join('')}<rect x="${hx-4}" y="${hy-33}" width="8" height="2.5" fill="#222"/><text x="${hx}" y="${hy-19.5}" font-size="7" font-weight="900" text-anchor="middle" fill="#c0392b" font-family="serif">湯</text>`;   // 提灯
  if(has('sensu')) held+=`<path d="M${hx} ${hy-1} L${hx-12} ${hy-17} A16 16 0 0 1 ${hx+8} ${hy-20} Z" fill="#f4efe2" stroke="#8a6d3b" stroke-width=".9"/>${[0.2,0.4,0.6,0.8].map(t=>{ const x=hx-12+20*t, y=hy-17-3*Math.sin(t*Math.PI); return `<path d="M${hx} ${hy-1} L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#8a6d3b88" stroke-width=".6"/>`; }).join('')}<circle cx="${hx-3}" cy="${hy-13}" r="2.6" fill="#e0566e"/>`;   // 扇子
  if(has('teacup')) held+=`<path d="M${hx-5} ${hy-12} L${hx+5} ${hy-12} L${hx+4} ${hy-3} Q${hx} ${hy-1} ${hx-4} ${hy-3} Z" fill="#5a7d6a" stroke="#2f4a3b" stroke-width=".8"/><path d="M${hx-2} ${hy-16} Q${hx} ${hy-18} ${hx-1} ${hy-20} M${hx+2} ${hy-15} Q${hx+4} ${hy-17} ${hx+3} ${hy-20}" stroke="#ffffffaa" stroke-width=".8" fill="none"/>`;   // 湯呑み（湯気）
  if(has('tray')) held+=`<ellipse cx="50" cy="110" rx="19" ry="5" fill="#7a1f1f" stroke="#4a1010" stroke-width="1"/><path d="M40 102 L46 102 L45.5 108 Q43 109.5 40.5 108 Z M54 102 L60 102 L59.5 108 Q57 109.5 54.5 108 Z" fill="#5a7d6a" stroke="#2f4a3b" stroke-width=".7"/><path d="M43 99 Q44 97 43 95 M57 99 Q58 97 57 95" stroke="#ffffffaa" stroke-width=".8" fill="none"/>`;   // お盆と湯呑み
  if(has('yumoita')) held+=`<rect x="22" y="104" width="56" height="7" rx="1.5" fill="#c8a26a" stroke="#8a6a3a" stroke-width="1"/><path d="M26 107.5 L74 107.5" stroke="#8a6a3a66" stroke-width=".8"/>`;   // 湯もみ板
  const handsTop=both||raise;   // 物を持っている手は物の上に描く
  return `<svg viewBox="0 0 100 130" width="92" height="120" aria-hidden="true">
  <ellipse cx="50" cy="126" rx="30" ry="4" fill="#0006"/>${back}${body}${front}${arms}${handsTop?held+hands:hands+held}${head}${hair}${face}</svg>`;
}
