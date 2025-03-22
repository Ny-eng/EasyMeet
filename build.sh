#!/bin/bash

# 環境変数の確認
echo "環境変数を確認しています..."
if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "Supabase環境変数が設定されています"
else
  echo "警告: Supabase環境変数が設定されていません"
fi

# テーマファイルをクライアントディレクトリにコピー、もしくはダミーファイルを作成
echo "テーマファイルをコピーしています..."
if [ -f "theme.json" ]; then
  cp theme.json client/
else
  # ダミーのテーマファイルを作成
  echo '{"variant":"professional","primary":"hsl(220, 10%, 20%)","appearance":"light","radius":0.75}' > client/theme.json
  echo "ダミーのテーマファイルを作成しました"
fi

# 環境変数を.envファイルとして保存
echo "環境変数を.envファイルに書き出しています..."
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > client/.env
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> client/.env
echo "DISABLE_THEME_PLUGIN=true" >> client/.env

# npxを使用してviteとesbuildを実行するスクリプト
echo "Viteでフロントエンドをビルドしています..."
cd client
npx vite build --config ../vite.config.ts
cd ..

echo "esbuildでバックエンドをビルドしています..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "ビルドが完了しました！"
