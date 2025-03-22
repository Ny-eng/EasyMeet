# EasyMeet アプリケーションの Supabase 移行ガイド

このディレクトリには、EasyMeetアプリケーションをFirebaseからSupabaseに移行するために必要なファイルとスクリプトが含まれています。

## ディレクトリ構造

```
supabase/
├── config.toml            # Supabaseプロジェクト設定
├── migrations/            # データベースマイグレーションスクリプト
│   └── 20240322_initial_schema.sql  # 初期スキーマ設定
└── functions/             # Supabase Edge Functions
    ├── cleanup-expired-events.ts   # 期限切れイベントクリーンアップ関数
    └── README.md          # Edge Functions の使用方法
```

## 移行手順

### 1. Supabase プロジェクトの作成

1. [Supabase ダッシュボード](https://app.supabase.io)にアクセスし、新しいプロジェクトを作成します。
2. プロジェクト名を設定し、リージョンを選択します。
3. 安全なパスワードを設定し、プロジェクトを作成します。

### 2. データベーススキーマの設定

Supabase ダッシュボードから以下の手順でデータベーススキーマを設定します：

1. SQLエディタを開く
2. `migrations/20240322_initial_schema.sql` ファイルの内容をコピーしてSQLエディタに貼り付ける
3. 実行ボタンをクリックしてスキーマを作成

### 3. 環境変数の設定

アプリケーションで以下の環境変数を設定します：

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

これらの値は、Supabaseダッシュボードの「Settings > API」セクションで確認できます。

### 4. Edge Functions のデプロイ

Supabase CLI を使用して Edge Functions をデプロイします：

```bash
# Supabase CLI のインストール
npm install -g supabase

# ログイン
supabase login

# 関数のデプロイ
cd supabase/functions
supabase functions deploy cleanup-expired-events --project-ref your-project-ref
```

### 5. 自動クリーンアップのスケジュール設定

SQLエディタで以下のコマンドを実行して、期限切れイベントの自動クリーンアップをスケジュールします：

```sql
select cron.schedule(
  'cleanup-expired-events-daily',  -- ジョブの一意な名前
  '0 0 * * *',                     -- Cron式: 毎日午前0時に実行
  $$
  select
    net.http_post(
      url:='https://your-project-ref.functions.supabase.co/cleanup-expired-events',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-service-role-key"}'::jsonb
    ) as request_id;
  $$
);
```

`your-project-ref`と`your-service-role-key`を、実際のプロジェクト参照IDとサービスロールキーに置き換えてください。サービスロールキーはダッシュボードの「Settings > API」セクションで確認できます。

### 6. Firebase から Supabase へのデータ移行（オプション）

既存のデータをFirebaseからSupabaseに移行する必要がある場合は、以下の手順に従います：

1. Firebaseからデータをエクスポート
2. データをSupabaseのスキーマに合わせて変換
3. SQLエディタまたはSupabase APIを使用してデータをインポート

詳細な移行スクリプトについては、必要に応じて追加のスクリプトを作成してください。

## 注意事項

- Supabaseの本番環境では、適切なセキュリティポリシーを設定してデータを保護してください。
- 自動クリーンアップスケジュールを設定する際は、サービスロールキーの機密性に注意してください。
- アプリケーションをデプロイする前に、すべての機能が正しく動作することを確認してください。