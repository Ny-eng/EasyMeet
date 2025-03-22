# Supabase Edge Functions

このディレクトリには、EasyMeetアプリケーション用のSupabase Edge Functionsが含まれています。

## 注意事項

Edge Functionsは、Supabaseのサーバー環境で実行される関数で、Deno環境で動作します。そのため、通常のNode.js環境とは異なる実行コンテキストを持ちます。

### 開発環境での型エラーについて

Replit環境など、一般的なNode.js開発環境では、Denoの型定義が利用できないため、以下のようなエラーが表示されることがあります：

```
Cannot find name 'Deno'.
Cannot find module 'https://esm.sh/@supabase/supabase-js@2.38.5' or its corresponding type declarations.
```

これらのエラーは無視して構いません。実際のSupabase環境にデプロイすると正常に動作します。

## 含まれる関数

### cleanup-expired-events.ts

期限切れのイベントとそれに関連する回答を自動的に削除するためのEdge Functionです。

#### 機能概要

- イベントの最後の提案日付から14日経過したイベントを「期限切れ」と判断
- 期限切れのイベントとそれに関連する回答データを削除
- Cron機能を使用して定期的に実行可能

#### デプロイ方法

```bash
supabase functions deploy cleanup-expired-events --project-ref your-project-ref
```

#### Cron設定 (SQLエディタで実行)

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

`your-project-ref`と`your-service-role-key`を、実際のプロジェクト参照IDとサービスロールキーに置き換えてください。

## ローカルテスト

Edge Functionsをローカルでテストするには、Supabase CLIが必要です：

```bash
# Supabase CLIのインストール
npm install -g supabase

# ローカルでの実行
supabase functions serve --no-verify-jwt
```

別のターミナルから以下のコマンドを実行してテストできます：

```bash
curl -X POST http://localhost:54321/functions/v1/cleanup-expired-events
```