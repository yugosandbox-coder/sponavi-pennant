# スポナビ風ペナント

スマホ向けのプロ野球ペナントゲーム（HTML 1ファイル、ライブラリ不要）。

## 遊び方
`index.html` をブラウザで開くだけで動きます。GitHub Pages で公開する場合はリポジトリのルートに `index.html` を置いて Pages を有効にしてください。

## 構成
- `index.html` … ビルド済みのゲーム本体（これだけで動く）
- `src/` … ソース。`build.sh` で結合して `index.html` を生成
  - `head.html` HTML・CSS
  - `logic.js` 投球・打球・試合シミュレーション
  - `pennant.js` ペナント進行・キャンプ・年俸査定
  - `roster.js` 選手生成・CPU成長
  - `btype.js` 打者タイプ
  - `batter.js` 野手モード
  - `manager.js` 監督（性格・お気に入り度）
  - `hall.js` 歴代選手
  - `allstar.js` オールスター
  - `postseason.js` クライマックスシリーズ・日本シリーズ
  - `injury.js` 怪我・疲労・回復力
  - `odd.js` 野手登板・代打投手
  - `wbc.js` WBC
  - `coachsvg.js` コーチのキャラクター
  - `coach.js` 所持金・年俸の上限・オフのコーチ
  - `render.js` 画面描画・ユニフォーム

## ビルド
```
sh build.sh
```
