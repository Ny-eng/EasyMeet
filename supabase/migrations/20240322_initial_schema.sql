-- Supabase用マイグレーションスクリプト
-- 初期スキーマ作成

-- イベントテーブル
CREATE TABLE IF NOT EXISTS public.events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organizer TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  dates TEXT[] NOT NULL,
  time TEXT NOT NULL,
  deadline TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events (slug);

-- 回答テーブル
CREATE TABLE IF NOT EXISTS public.responses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  availability BOOLEAN[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS responses_event_id_idx ON public.responses (event_id);

-- RLS (Row Level Security) ポリシーを設定
-- すべてのユーザーがデータを読み書きできるようにする（認証不要のアプリケーション向け）

-- RLSを有効化
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーがデータを読み書きできるようにするポリシーを作成
CREATE POLICY "Anyone can read events" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert events" ON public.events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update events" ON public.events
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can read responses" ON public.responses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert responses" ON public.responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update responses" ON public.responses
  FOR UPDATE USING (true);

-- イベントのスラッグを生成する関数
CREATE OR REPLACE FUNCTION generate_slug(length INTEGER DEFAULT 10)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- イベント作成時に自動的にスラッグを生成するトリガー
CREATE OR REPLACE FUNCTION set_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- すでにスラッグが設定されている場合はそのまま
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug();
    
    -- スラッグが既に存在する場合は、ユニークなスラッグが生成されるまで試行
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = NEW.slug) LOOP
      NEW.slug := generate_slug(12);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_event
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_slug();