#!/bin/sh
# src/ のファイルを結合して index.html を生成する
cd "$(dirname "$0")/src"
cat head.html logic.js pennant.js roster.js btype.js batter.js manager.js hall.js allstar.js postseason.js injury.js odd.js wbc.js render.js > ../index.html
echo "built ../index.html"
