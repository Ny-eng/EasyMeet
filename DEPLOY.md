# Easy Meet - デプロイ手順

このドキュメントでは、Easy Meetアプリケーションを実際の環境にデプロイするための詳細な手順を説明します。

## クイックスタートガイド（簡易デプロイ）

短時間でデプロイしたい場合は、以下の簡易手順に従ってください：

1. **Supabase設定**:
   - [Supabase](https://app.supabase.io/)でプロジェクトを作成
   - 「SQL Editor」で`supabase/migrations/20240322_initial_schema.sql`の内容を実行
   - プロジェクトのURLとAPIキーを取得

2. **Supabase Edge Functionsのデプロイ**:
   ```bash
   npm install -g supabase
   supabase login
   cd supabase/functions
   supabase functions deploy cleanup-expired-events --project-ref your-project-ref
   ```

3. **自動クリーンアップのスケジュール設定**:
   - SQLエディタで以下のコマンドを実行:
   ```sql
   select cron.schedule(
     'cleanup-expired-events-daily',
     '0 0 * * *',
     $$
     select
       net.http_post(
         url:='https://your-project-ref.functions.supabase.co/cleanup-expired-events',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-service-role-key"}'::jsonb
       ) as request_id;
     $$
   );
   ```

4. **Vercelへのデプロイ**:
   - Vercelにログイン
   - GitHubリポジトリをインポート
   - 環境変数にSupabase設定を追加（VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY）
   - Framework Presetで「Vite」を選択して「Deploy」をクリック

詳細は以下のセクションを参照してください。

## 目次

1. [必要条件](#必要条件)
2. [Supabase設定](#supabase設定)
3. [Vercelデプロイ](#vercelデプロイ)
4. [カスタムドメイン設定](#カスタムドメイン設定)
5. [期限切れイベントの自動削除設定](#期限切れイベントの自動削除設定)
6. [メンテナンスと監視](#メンテナンスと監視)

## 必要条件

デプロイを始める前に、以下のことを確認してください：

- GitHubアカウント（Vercel連携およびSupabase連携用）
- カスタムドメイン（オプション）

## Supabase設定

Supabaseは、PostgreSQLを使用したFirebaseの代替サービスで、よりシンプルなバックエンド構成を実現できます。

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://app.supabase.io/)にアクセスし、GitHubアカウントなどでログインします。
2. 「New Project」ボタンをクリックします。
3. 組織を選択または作成します。
4. プロジェクト名を入力します（例：「easymeet」）。
5. データベースのパスワードを設定します（安全なパスワードを使用してください）。
6. リージョンを選択します（ユーザーの多いエリアに近いリージョンを選びましょう）。
7. 「Create new project」ボタンをクリックして、プロジェクトの作成を待ちます。

### 2. データベーススキーマの設定

1. プロジェクトが作成されたら、左側メニューから「SQL Editor」を選択します。
2. 「New Query」ボタンをクリックして新しいSQLエディタを開きます。
3. プロジェクトの `supabase/migrations/20240322_initial_schema.sql` ファイルの内容をコピーしてSQLエディタに貼り付けます。
4. 「Run」ボタンをクリックして、SQLを実行します。

これにより、必要なテーブルとインデックス、トリガーなどが作成されます。

### 3. API認証情報の取得

1. 左側メニューから「Project Settings」を選択します。
2. 「API」タブをクリックします。
3. 以下の情報をメモしておきます：
   - Project URL（例：`https://abcdefghijklm.supabase.co`）
   - API Key（`anon`キーと`service_role`キーの両方）

これらの情報は、フロントエンドとバックエンドの接続に必要です。

### 4. Edge Functionsのデプロイ

Supabase Edge Functionsは、期限切れのイベントを自動的に削除するために使用します。

#### Supabase CLIのインストールと設定

```bash
# Supabase CLIのインストール
npm install -g supabase

# Supabaseにログイン
supabase login

# アクセストークンの入力を求められます
# トークンは、Supabaseダッシュボードの「Account」>「Access Tokens」で生成できます
```

#### Edge Functionsのデプロイ

```bash
# Edge Functionsディレクトリに移動
cd supabase/functions

# 関数のデプロイ
supabase functions deploy cleanup-expired-events --project-ref your-project-ref
```

`your-project-ref` は、Supabaseプロジェクトの参照IDに置き換えてください。これは、プロジェクト設定の「General」タブで確認できます。

### 5. 定期的なクリーンアップの設定

Supabaseには、PostgreSQLの`pg_cron`拡張機能を使用した定期タスク実行機能があります。

1. SQL Editorで新しいクエリを作成します。
2. 以下のSQLを実行して、定期的なクリーンアップを設定します：

```sql
-- Cronジョブの作成
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

`your-project-ref` はプロジェクトの参照IDに、`your-service-role-key` はサービスロールAPIキーに置き換えてください。

## Vercelデプロイ

### 1. Vercelアカウントの作成

1. [Vercel](https://vercel.com/) にアクセスし、GitHubアカウントでサインアップまたはログインします。

### 2. GitHubリポジトリの準備

1. プロジェクトをGitHubリポジトリにアップロードします。
2. リポジトリがプライベートの場合は、Vercelがアクセスできるようにしておきます。

### 3. Vercelへのプロジェクトのインポート

1. Vercelダッシュボードで「New Project」ボタンをクリックします。
2. GitHubリポジトリをインポートするオプションを選択します。
3. プロジェクトリポジトリを選択します。

### 4. 環境変数の設定

環境変数を設定するには、2つの方法があります：

#### 方法1: Supabase Vercel Integration（推奨）

この方法では、SupabaseとVercelの連携が自動的に行われ、環境変数も自動的に設定されます。

1. Vercelダッシュボードでプロジェクトを選択します。
2. 「Integrations」タブを選択します。
3. 「Browse Marketplace」をクリックします。
4. 「Supabase」を検索して選択します。
5. 「Add Integration」をクリックします。
6. Supabaseプロジェクトとリンクするプロジェクトを選択します。
7. 「Link」ボタンをクリックします。

これにより、以下の環境変数が自動的に設定されます：
- `SUPABASE_URL`（`VITE_SUPABASE_URL`として利用されます）
- `SUPABASE_ANON_KEY`（`VITE_SUPABASE_ANON_KEY`として利用されます）
- その他のSupabaseに関連する変数

#### 方法2: 手動設定

Integrationを使わない場合は、以下の環境変数を手動で設定します：

| 変数名 | 値 | 説明 |
|--------|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project URL | Supabaseプロジェクトの URL (例: `https://abcdefghijklm.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabaseの匿名（公開）APIキー |

> **重要**: これらの環境変数は必ず設定してください。アプリケーションはこれらの変数がないと正常に動作しません。Vercelダッシュボードの「Settings」→「Environment Variables」セクションに上記の変数を追加します。

> **注意**: 本番環境にデプロイした後に環境変数を変更した場合は、プロジェクトを再デプロイする必要があります。

### 5. ビルド設定

1. Framework Preset: `Vite`
2. Build Command: 既存のvercel.jsonで設定済み（変更不要）
3. Output Directory: 既存のvercel.jsonで設定済み（変更不要）
4. Install Command: `npm install`

### 6. デプロイの開始

「Deploy」ボタンをクリックしてデプロイを開始します。デプロイには数分かかることがあります。

完了すると、Vercelはプロジェクトのデプロイの概要ページを表示します。「Visit」ボタンをクリックして、デプロイされたアプリケーションを確認できます。

## カスタムドメイン設定

### 1. Vercelにカスタムドメインを追加

1. Vercelダッシュボードからプロジェクトを選択します。
2. 「Settings」タブに移動し、「Domains」セクションを選択します。
3. 使用したいドメイン（例：`easymeet.example.com`）を入力し、「Add」ボタンをクリックします。
4. Vercelが提供するDNS設定手順に従ってドメインを設定します。

### 2. Supabase用にカスタムドメインを設定（オプション）

Supabaseの無料プランではカスタムドメインを設定できませんが、有料プランではカスタムドメインの設定が可能です。

1. Supabaseダッシュボードで、プロジェクトを選択します。
2. 「Settings」>「General」を選択します。
3. 「Custom Domains」セクションで「Enable Custom Domain」をクリックします。
4. ドメイン名を入力し、指示に従ってDNS設定を行います。

## 期限切れイベントの自動削除設定

Supabase Edge Functionsには、期限切れのイベントを自動的に削除する機能が含まれています。この機能を定期的に実行するようにSupabaseのpg_cron拡張機能を使用して設定します。

### Supabase pg_cronの設定

この設定は既に「Supabase設定」セクションの「5. 定期的なクリーンアップの設定」で説明しています。

1. SQL Editorで以下のSQLを実行して、定期的なクリーンアップを設定します：

```sql
-- Cronジョブの作成
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

これで、毎日午前0時に期限切れのイベントを自動的に削除する処理が実行されます。

## メンテナンスと監視

### 1. Supabaseダッシュボードの確認

Supabaseダッシュボードで定期的に以下を確認してください：

- データベースの使用状況（「Database」>「Usage」）
- Edge Functionsのログ（「Edge Functions」>「Logs」）
- セキュリティ設定の定期的な見直し（「Authentication」>「Policies」）

### 2. Vercelの監視

Vercelダッシュボードで以下を確認してください：

- デプロイの履歴とステータス
- Analyticsタブによるパフォーマンス指標
- エラーログ

### 3. 定期的なバックアップ（推奨）

Supabaseデータの定期的なバックアップを取ることをお勧めします。Supabaseの有料プランでは自動バックアップが含まれていますが、追加のバックアップを設定することもできます。

1. Supabaseダッシュボードの「Database」>「Backups」にアクセスします。
2. 手動バックアップを作成するには「Create a backup」ボタンをクリックします。
3. プログラムでバックアップを自動化するには、Supabase CLIを使用します：

```bash
# バックアップの作成
supabase db dump -f backup.sql --db-url postgres://postgres:your-password@your-project-ref.supabase.co:5432/postgres
```

---

以上がEasy Meetアプリケーションのデプロイ手順です。何か問題が発生した場合は、各サービスのドキュメントを参照するか、サポートに連絡してください。