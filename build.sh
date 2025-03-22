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

# Supabase Vercel Integration対応：変数が異なる形式で存在する可能性を考慮
# VITE_SUPABASE_URL または SUPABASE_URL のどちらかを使用
if [ -n "$VITE_SUPABASE_URL" ]; then
  echo "VITE_SUPABASE_URL環境変数を使用します"
  SUPABASE_URL_VALUE=$VITE_SUPABASE_URL
elif [ -n "$SUPABASE_URL" ]; then
  echo "SUPABASE_URL環境変数が見つかりました。VITE_SUPABASE_URLとして使用します"
  SUPABASE_URL_VALUE=$SUPABASE_URL
else
  echo "警告: Supabase URL環境変数が設定されていません"
  SUPABASE_URL_VALUE=""
fi

# VITE_SUPABASE_ANON_KEY または SUPABASE_ANON_KEY のどちらかを使用
if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "VITE_SUPABASE_ANON_KEY環境変数を使用します"
  SUPABASE_KEY_VALUE=$VITE_SUPABASE_ANON_KEY
elif [ -n "$SUPABASE_ANON_KEY" ]; then
  echo "SUPABASE_ANON_KEY環境変数が見つかりました。VITE_SUPABASE_ANON_KEYとして使用します"
  SUPABASE_KEY_VALUE=$SUPABASE_ANON_KEY
else
  echo "警告: Supabase Key環境変数が設定されていません"
  SUPABASE_KEY_VALUE=""
fi

# 環境変数を.envファイルに書き出し
echo "VITE_SUPABASE_URL=$SUPABASE_URL_VALUE" > client/.env
echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY_VALUE" >> client/.env
echo "DISABLE_THEME_PLUGIN=true" >> client/.env

# npxを使用してviteとesbuildを実行するスクリプト
echo "Viteでフロントエンドをビルドしています..."
cd client
npx vite build --config ../vite.config.ts
cd ..

echo "esbuildでバックエンドをビルドしています..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "ビルドが完了しました！"