// Supabase Edge Function: cleanup-expired-events
// 期限切れのイベントとそれに関連する回答を削除する関数

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5';

// For local testing only
// const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
// const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Supabaseクライアントを作成
// 注意: Edge Functionsではサービスキーが自動的に利用可能
// const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase Edge Functions用のクライアント作成
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  try {
    // リクエストが適切なメソッドかチェック
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    
    // 期限切れイベントを検索
    // 現在の日付より14日以上経過したイベントを取得
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, dates')
      .order('id');

    if (eventsError) {
      throw new Error(`Error fetching events: ${eventsError.message}`);
    }

    // 期限切れイベントのIDを収集
    const expiredEventIds: number[] = [];
    for (const event of events) {
      // すべての日付を正しくDateオブジェクトに変換
      const dates = event.dates.map(d => new Date(d));
      
      // 最新の日付を取得（日付をミリ秒に変換して最大値を取得）
      const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // 最新の日付から7日後に削除期限を設定
      const expiryDate = new Date(latestDate);
      expiryDate.setDate(expiryDate.getDate() + 7);
      
      console.log(`Event ${event.id}: Latest date: ${latestDate.toISOString()}, Expiry date: ${expiryDate.toISOString()}, Now: ${now.toISOString()}`);
      
      if (now > expiryDate) {
        console.log(`Event ${event.id} is expired and will be deleted`);
        expiredEventIds.push(event.id);
      }
    }

    console.log(`Found ${expiredEventIds.length} expired events to clean up`);

    if (expiredEventIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired events to clean up' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 関連する回答をまず削除（外部キー制約のため）
    const { error: responsesDeleteError } = await supabase
      .from('responses')
      .delete()
      .in('event_id', expiredEventIds);

    if (responsesDeleteError) {
      throw new Error(`Error deleting responses: ${responsesDeleteError.message}`);
    }

    // 期限切れイベントを削除
    const { error: eventsDeleteError } = await supabase
      .from('events')
      .delete()
      .in('id', expiredEventIds);

    if (eventsDeleteError) {
      throw new Error(`Error deleting events: ${eventsDeleteError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully cleaned up ${expiredEventIds.length} expired events and their responses` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cleaning up expired events:', error);
    
    return new Response(
      JSON.stringify({ error: `Failed to clean up expired events: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});