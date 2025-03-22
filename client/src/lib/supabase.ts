import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Supabaseの設定値を環境変数から取得
// クライアント側で確実に環境変数を取得するための工夫
function getEnvVar(key: string): string {
  // 複数の環境変数名を試す（Vercel Integration対応）
  const keys = key.startsWith('VITE_SUPABASE_') 
    ? [key, key.replace('VITE_', '')] // VITE_SUPABASE_URL → SUPABASE_URL も試す
    : [key];
  
  let value = '';
  
  // 複数の可能な環境変数名を順番に試す
  for (const k of keys) {
    const v = import.meta.env[k] as string || '';
    if (v) {
      value = v;
      console.log(`環境変数 ${k} を取得: 設定されています`);
      break;
    }
  }
  
  if (!value) {
    console.log(`警告: 環境変数 ${keys.join(' または ')} が設定されていません`);
  }
  
  return value;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Supabaseが設定されているかどうかを確認
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// Supabaseクライアントを作成（設定されている場合のみ）
export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseKey)
  : null as any; // TypeScriptエラーを回避するためにnullをanyにキャスト

// APIリクエストを行う関数
export async function supabaseApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Supabaseが設定されていない場合はエラーを返す
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }

  try {
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
    };

    // パスから適切なSupabaseのテーブルとメソッドを特定
    const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const pathParts = path.split('/');
    
    console.log('Supabase request path:', path);
    console.log('Supabase request options:', mergedOptions);
    
    if (pathParts[0] === 'api') {
      // /api/events/{slug} のようなパスを処理
      const resource = pathParts[1]; // 'events'
      const id = pathParts[2]; // スラッグやID

      if (resource === 'events') {
        if (id) {
          // 特定のイベントに関する操作
          if (options.method === 'GET') {
            // イベントとそれに関連するレスポンスを取得
            console.log('Getting event by slug:', id);
            const { data: event, error: eventError } = await supabase
              .from('events')
              .select('*')
              .eq('slug', id)
              .single();
              
            if (eventError) {
              console.error('Error fetching event:', eventError);
              throw new Error(eventError.message);
            }
            if (!event) throw new Error('Event not found');
            
            // クライアント側のコードと整合性を取るため、キー名を変換
            const formattedEvent = {
              id: event.id,
              title: event.title,
              description: event.description,
              organizer: event.organizer,
              slug: event.slug,
              dates: event.dates,
              time: event.time,
              deadline: event.deadline,
              createdAt: event.created_at
            };
            
            console.log('Getting responses for event ID:', event.id);
            const { data: responseData, error: responsesError } = await supabase
              .from('responses')
              .select('*')
              .eq('event_id', event.id);
              
            if (responsesError) {
              console.error('Error fetching responses:', responsesError);
              throw new Error(responsesError.message);
            }
            
            // レスポンスデータも同様に変換
            const formattedResponses = responseData ? responseData.map((r: any) => ({
              id: r.id,
              name: r.name,
              eventId: r.event_id, 
              availability: r.availability,
              createdAt: r.created_at
            })) : [];
            
            console.log('Formatted event:', formattedEvent);
            console.log('Formatted responses:', formattedResponses);
            
            return { event: formattedEvent, responses: formattedResponses } as T;
          } 
          else if (options.method === 'PATCH') {
            // イベントを更新
            const body = JSON.parse(options.body as string);
            console.log('Updating event with slug:', id, 'Body:', body);
            const { data, error } = await supabase
              .from('events')
              .update(body)
              .eq('slug', id)
              .select()
              .single();
              
            if (error) {
              console.error('Error updating event:', error);
              throw new Error(error.message);
            }
            return data as T;
          }
        } else {
          // イベント一覧または新規作成
          if (options.method === 'POST') {
            // 新しいイベントを作成
            const body = JSON.parse(options.body as string);
            console.log('Creating new event. Body:', body);
            
            // スラッグを生成 (もし含まれていない場合)
            if (!body.slug) {
              body.slug = generateSlug(body.title);
            }
            
            console.log('Inserting event with generated slug:', body.slug);
            const { data: event, error } = await supabase
              .from('events')
              .insert(body)
              .select()
              .single();
              
            if (error) {
              console.error('Error creating event:', error);
              throw new Error(error.message);
            }
            
            // クライアント側のコードと整合性を取るため、キー名を変換
            const formattedEvent = event ? {
              id: event.id,
              title: event.title,
              description: event.description,
              organizer: event.organizer,
              slug: event.slug,
              dates: event.dates,
              time: event.time,
              deadline: event.deadline,
              createdAt: event.created_at
            } : null;
            
            console.log('Created and formatted event:', formattedEvent);
            return formattedEvent as T;
          }
        }
      } 
      else if (resource === 'responses') {
        // レスポンスに関する操作
        if (options.method === 'POST') {
          // 新しいレスポンスを作成
          const body = JSON.parse(options.body as string);
          console.log('Creating new response. Body:', body);
          const { data: response, error } = await supabase
            .from('responses')
            .insert(body)
            .select()
            .single();
            
          if (error) {
            console.error('Error creating response:', error);
            throw new Error(error.message);
          }
          
          // クライアント側のコードと整合性を取るため、キー名を変換
          const formattedResponse = response ? {
            id: response.id,
            name: response.name,
            eventId: response.event_id,
            availability: response.availability,
            createdAt: response.created_at
          } : null;
          
          console.log('Created and formatted response:', formattedResponse);
          return formattedResponse as T;
        }
      }
    }
    
    throw new Error(`Unsupported API endpoint: ${endpoint}`);
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

// ランダムなスラッグを生成する関数
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${base}-${randomStr}`;
}

// Supabaseテーブルのレスポンスの型定義
type SupabaseEventRow = {
  id: number;
  title: string;
  description: string | null;
  organizer: string;
  slug: string;
  dates: string[];
  time: string;
  deadline: string;
  created_at: string | null;
};

type SupabaseResponseRow = {
  id: number;
  name: string;
  event_id: number;
  availability: boolean[];
  created_at: string | null;
};

// Supabaseから直接イベントを取得する関数
// イベントを直接Supabaseに作成する関数
export async function createEventDirectlyWithSupabase(eventData: {
  title: string;
  description: string | null;
  organizer: string;
  slug: string;
  dates: string[];
  time: string;
  deadline: string;
}) {
  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured');
    throw new Error('Supabase is not configured');
  }

  try {
    console.log('直接Supabaseを使用してイベントを作成します:', eventData);
    
    // イベントをSupabaseに挿入
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([{
        title: eventData.title,
        description: eventData.description,
        organizer: eventData.organizer,
        slug: eventData.slug,
        dates: eventData.dates,
        time: eventData.time,
        deadline: eventData.deadline,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (eventError) {
      console.error('Error creating event in Supabase:', eventError);
      throw new Error(eventError.message);
    }
    
    if (!event) throw new Error('Failed to create event');
    
    // クライアント側のコードと整合性を取るため、キー名を変換
    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      organizer: event.organizer,
      slug: event.slug,
      dates: event.dates,
      time: event.time,
      deadline: event.deadline,
      createdAt: event.created_at
    };
    
    console.log('イベントが正常に作成されました:', formattedEvent);
    return formattedEvent;
  } catch (error) {
    console.error('直接Supabaseを使用したイベント作成に失敗:', error);
    throw error;
  }
}

// レスポンスを直接Supabaseに作成する関数
export async function createResponseDirectlyWithSupabase(responseData: {
  name: string;
  eventId: number;
  availability: boolean[];
}) {
  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured');
    throw new Error('Supabase is not configured');
  }

  try {
    console.log('直接Supabaseを使用してレスポンスを作成します:', responseData);
    
    // レスポンスをSupabaseに挿入
    const { data: response, error: responseError } = await supabase
      .from('responses')
      .insert([{
        name: responseData.name,
        event_id: responseData.eventId,
        availability: responseData.availability,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (responseError) {
      console.error('Error creating response in Supabase:', responseError);
      throw new Error(responseError.message);
    }
    
    if (!response) throw new Error('Failed to create response');
    
    // クライアント側のコードと整合性を取るため、キー名を変換
    const formattedResponse = {
      id: response.id,
      name: response.name,
      eventId: response.event_id,
      availability: response.availability,
      createdAt: response.created_at
    };
    
    console.log('レスポンスが正常に作成されました:', formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error('直接Supabaseを使用したレスポンス作成に失敗:', error);
    throw error;
  }
}

export async function getEventDirectlyFromSupabase(slug: string) {
  if (!isSupabaseConfigured || !slug) {
    throw new Error(slug ? 'Supabase is not configured' : 'Event slug is undefined');
  }

  try {
    console.log('Getting event directly from Supabase by slug:', slug);
    // イベントを取得
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (eventError) {
      console.error('Error fetching event directly from Supabase:', eventError);
      throw eventError;
    }

    if (!event) {
      throw new Error('Event not found in Supabase');
    }

    const typedEvent = event as SupabaseEventRow;

    // 関連する回答を取得
    console.log('Getting responses directly for event ID:', typedEvent.id);
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('event_id', typedEvent.id);

    if (responsesError) {
      console.error('Error fetching responses directly from Supabase:', responsesError);
      throw responsesError;
    }

    const typedResponses = responses as SupabaseResponseRow[];

    // スキーマの形式に合わせてデータを整形
    const formattedEvent = {
      id: typedEvent.id,
      title: typedEvent.title,
      description: typedEvent.description,
      organizer: typedEvent.organizer,
      slug: typedEvent.slug,
      dates: typedEvent.dates,
      time: typedEvent.time,
      deadline: typedEvent.deadline,
      createdAt: typedEvent.created_at
    };

    const formattedResponses = typedResponses ? typedResponses.map(response => ({
      id: response.id,
      name: response.name,
      eventId: response.event_id,
      availability: response.availability,
      createdAt: response.created_at
    })) : [];

    console.log('Retrieved directly - formatted event:', formattedEvent);
    console.log('Retrieved directly - formatted responses:', formattedResponses);

    return { 
      event: formattedEvent, 
      responses: formattedResponses 
    };
  } catch (error) {
    console.error('Error in getEventDirectlyFromSupabase:', error);
    throw error;
  }
}

// イベントを直接Supabaseで更新する関数
export async function updateEventDirectlyWithSupabase(slug: string, updateData: {
  title?: string;
  description?: string | null;
  deadline?: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  try {
    console.log(`直接Supabaseを使用してイベント(slug: ${slug})を更新します:`, updateData);
    
    // まずイベントIDを取得するために該当イベントを検索
    const { data: event, error: findError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (findError) {
      console.error('Error finding event to update:', findError);
      throw findError;
    }
    
    if (!event) {
      throw new Error(`Event with slug '${slug}' not found`);
    }
    
    // イベントを更新
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', event.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating event in Supabase:', updateError);
      throw updateError;
    }
    
    if (!updatedEvent) {
      throw new Error('Failed to update event');
    }
    
    // クライアント側のコードと整合性を取るため、キー名を変換
    const formattedEvent = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      organizer: updatedEvent.organizer,
      slug: updatedEvent.slug,
      dates: updatedEvent.dates,
      time: updatedEvent.time,
      deadline: updatedEvent.deadline,
      createdAt: updatedEvent.created_at
    };
    
    console.log('イベントが正常に更新されました:', formattedEvent);
    return formattedEvent;
  } catch (error) {
    console.error('直接Supabaseを使用したイベント更新に失敗:', error);
    throw error;
  }
}