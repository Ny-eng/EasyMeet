#!/bin/bash

# テーマファイルをクライアントディレクトリにコピー、もしくはダミーファイルを作成
echo "テーマファイルをコピーしています..."
if [ -f "theme.json" ]; then
  cp theme.json client/
else
  # ダミーのテーマファイルを作成
  echo '{"variant":"professional","primary":"hsl(220, 10%, 20%)","appearance":"light","radius":0.75}' > client/theme.json
  echo "ダミーのテーマファイルを作成しました"
fi

# npxを使用してviteとesbuildを実行するスクリプト
echo "Viteでフロントエンドをビルドしています..."
cd client
npx vite build --config ../vite.config.ts
cd ..

echo "esbuildでバックエンドをビルドしています..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "ビルドが完了しました！"