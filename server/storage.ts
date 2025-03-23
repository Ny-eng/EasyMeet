import { nanoid } from "nanoid";
import { Event, InsertEvent, Response, InsertResponse } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import { generateSlug } from "../client/src/lib/supabase";
import type { Database } from "../client/src/types/supabase";

export interface IStorage {
  createEvent(event: InsertEvent): Promise<Event>;
  getEventBySlug(slug: string): Promise<Event | undefined>;
  updateEvent(id: number, update: Partial<Event>): Promise<Event>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByEventId(eventId: number): Promise<Response[]>;
  cleanupExpiredEvents(): Promise<void>;
}

// 環境変数を取得する関数
function getEnvVar(key: string): string {
  // 複数の環境変数名を試す（Vercel Integration対応）
  const keys = key.startsWith('VITE_SUPABASE_') 
    ? [key, key.replace('VITE_', '')] // VITE_SUPABASE_URL → SUPABASE_URL も試す
    : [key];
  
  let value = '';
  
  // 複数の可能な環境変数名を順番に試す
  for (const k of keys) {
    if (typeof process !== 'undefined' && process.env) {
      const v = process.env[k] || '';
      if (v) {
        value = v;
        console.log(`サーバー: 環境変数 ${k} を取得: 設定されています`);
        break;
      }
    }
  }
  
  if (!value) {
    console.log(`警告: 環境変数 ${keys.join(' または ')} が設定されていません`);
  }
  
  return value;
}

// Supabase設定（開発環境用のデフォルト値を設定）
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'http://localhost:54321';
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// 環境変数が設定されているかどうかを確認
const isSupabaseConfigured = !!(
  (supabaseUrl && supabaseUrl !== 'http://localhost:54321') && 
  (supabaseKey && supabaseKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')
);

// Supabaseクライアントを作成（設定されている場合のみ）
const supabase = isSupabaseConfigured 
  ? (createClient(supabaseUrl, supabaseKey) as any)
  : null;

export class SupabaseStorage implements IStorage {
  private supabaseClient: ReturnType<typeof createClient> | null;

  constructor() {
    this.supabaseClient = supabase;
    
    if (!this.supabaseClient) {
      console.warn('Supabase storage initialized without client. Using memory storage fallback.');
    } else {
      console.log('Supabase storage initialized successfully.');
    }
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }

    // スラッグを生成
    const slug = generateSlug(insertEvent.title);
    
    // Supabaseの型定義に合わせてデータを整形
    const eventData = {
      title: insertEvent.title,
      description: insertEvent.description || null,
      organizer: insertEvent.organizer,
      slug: slug,
      dates: insertEvent.dates.map(d => new Date(d).toISOString()),
      time: insertEvent.time,
      deadline: new Date(insertEvent.deadline).toISOString(),
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await (this.supabaseClient as any)
      .from('events')
      .insert(eventData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating event in Supabase:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Failed to create event');
    }
    
    // Supabaseのレスポンスをアプリケーションの型に変換
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      organizer: data.organizer,
      slug: data.slug,
      dates: data.dates.map(d => new Date(d)),
      time: data.time,
      deadline: new Date(data.deadline),
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }
    
    const { data, error } = await this.supabaseClient
      .from('events')
      .select()
      .eq('slug', slug)
      .single();
      
    if (error) {
      // データが見つからない場合はundefinedを返す
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching event by slug from Supabase:', error);
      throw error;
    }
    
    if (!data) {
      return undefined;
    }
    
    // Supabaseのレスポンスをアプリケーションの型に変換
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      organizer: data.organizer,
      slug: data.slug,
      dates: data.dates.map(d => new Date(d)),
      time: data.time,
      deadline: new Date(data.deadline),
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async updateEvent(id: number, update: Partial<Event>): Promise<Event> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }
    
    // Supabaseの型定義に合わせてデータを整形
    const updateData: any = {};
    
    if (update.title) updateData.title = update.title;
    if (update.description !== undefined) updateData.description = update.description;
    if (update.organizer) updateData.organizer = update.organizer;
    if (update.slug) updateData.slug = update.slug;
    if (update.dates) updateData.dates = update.dates.map(d => 
      d instanceof Date ? d.toISOString() : d);
    if (update.time) updateData.time = update.time;
    if (update.deadline) updateData.deadline = 
      update.deadline instanceof Date ? update.deadline.toISOString() : update.deadline;
    
    const { data, error } = await this.supabaseClient
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating event in Supabase:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Failed to update event');
    }
    
    // Supabaseのレスポンスをアプリケーションの型に変換
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      organizer: data.organizer,
      slug: data.slug,
      dates: data.dates.map(d => new Date(d)),
      time: data.time,
      deadline: new Date(data.deadline),
      createdAt: data.created_at ? new Date(data.created_at) : null
    };
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }
    
    // 詳細なデバッグログを追加
    console.log('SupabaseStorage.createResponse() - 入力データ:', JSON.stringify(insertResponse));
    
    // Supabaseの型定義に合わせてデータを整形
    const responseData = {
      name: insertResponse.name,
      event_id: insertResponse.eventId,
      availability: insertResponse.availability,
      created_at: new Date().toISOString()
    };
    
    console.log('SupabaseStorage.createResponse() - 整形データ:', JSON.stringify(responseData));
    
    try {
      // まずイベントが存在するか確認
      const { data: event, error: eventError } = await (this.supabaseClient as any)
        .from('events')
        .select('id')
        .eq('id', insertResponse.eventId)
        .single();

      if (eventError) {
        console.error(`イベントID ${insertResponse.eventId} が見つかりません:`, eventError);
        throw new Error(`Event with ID ${insertResponse.eventId} not found: ${eventError.message}`);
      }

      if (!event) {
        console.error(`イベントID ${insertResponse.eventId} が存在しません`);
        throw new Error(`Event with ID ${insertResponse.eventId} does not exist`);
      }

      console.log(`イベントID ${insertResponse.eventId} の存在を確認しました`);
    
      const { data, error } = await (this.supabaseClient as any)
        .from('responses')
        .insert(responseData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating response in Supabase:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to create response');
      }
      
      console.log('SupabaseStorage.createResponse() - Supabase応答:', JSON.stringify(data));
      
      // Supabaseのレスポンスをアプリケーションの型に変換
      const formattedResponse: Response = {
        id: data.id,
        name: data.name,
        eventId: data.event_id,
        availability: data.availability,
        createdAt: data.created_at ? new Date(data.created_at) : null
      };
      
      console.log('SupabaseStorage.createResponse() - 整形済み応答:', JSON.stringify(formattedResponse));
      return formattedResponse;
    } catch (error) {
      console.error('SupabaseStorage.createResponse() - 例外発生:', error);
      throw error;
    }
  }

  async getResponsesByEventId(eventId: number): Promise<Response[]> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }
    
    const { data, error } = await this.supabaseClient
      .from('responses')
      .select()
      .eq('event_id', eventId);
      
    if (error) {
      console.error('Error fetching responses by event ID from Supabase:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Supabaseのレスポンスをアプリケーションの型に変換
    return data.map(item => ({
      id: item.id,
      name: item.name,
      eventId: item.event_id,
      availability: item.availability,
      createdAt: item.created_at ? new Date(item.created_at) : null
    }));
  }

  async cleanupExpiredEvents(): Promise<void> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client is not configured');
    }
    
    // 現在の日時から7日前の日付を計算
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      // 期限切れイベントのIDを取得
      const { data: expiredEvents, error: fetchError } = await this.supabaseClient
        .from('events')
        .select('id, dates')
        .lt('deadline', cutoffDate.toISOString());
        
      if (fetchError) {
        console.error('Error fetching expired events:', fetchError);
        throw fetchError;
      }
      
      if (!expiredEvents || expiredEvents.length === 0) {
        console.log('No expired events to clean up');
        return;
      }
      
      // 期限切れイベントの中で、最後の提案日から7日経過したものだけを削除対象とする
      const deleteTargetIds: number[] = [];
      
      for (const event of expiredEvents) {
        // 最後の提案日を取得
        const lastProposedDate = new Date(Math.max(...event.dates.map(d => new Date(d).getTime())));
        // 最後の提案日から7日後
        const deletionDate = new Date(lastProposedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        if (deletionDate < now) {
          deleteTargetIds.push(event.id);
        }
      }
      
      if (deleteTargetIds.length === 0) {
        console.log('No events to delete after checking last proposed dates');
        return;
      }
      
      console.log(`Deleting ${deleteTargetIds.length} expired events`);
      
      // 関連するレスポンスを削除
      const { error: responseDeleteError } = await this.supabaseClient
        .from('responses')
        .delete()
        .in('event_id', deleteTargetIds);
        
      if (responseDeleteError) {
        console.error('Error deleting responses for expired events:', responseDeleteError);
        throw responseDeleteError;
      }
      
      // イベントを削除
      const { error: eventDeleteError } = await this.supabaseClient
        .from('events')
        .delete()
        .in('id', deleteTargetIds);
        
      if (eventDeleteError) {
        console.error('Error deleting expired events:', eventDeleteError);
        throw eventDeleteError;
      }
      
      console.log(`Successfully deleted ${deleteTargetIds.length} expired events and their responses`);
    } catch (error) {
      console.error('Error during cleanupExpiredEvents:', error);
      throw error;
    }
  }
}

export class MemStorage implements IStorage {
  private events: Map<number, Event>;
  private responses: Map<number, Response>;
  private currentEventId: number;
  private currentResponseId: number;

  constructor() {
    this.events = new Map();
    this.responses = new Map();
    this.currentEventId = 1;
    this.currentResponseId = 1;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const slug = nanoid(10);
    const event: Event = {
      ...insertEvent,
      id,
      slug,
      description: insertEvent.description || null,
      createdAt: new Date()
    };
    this.events.set(id, event);
    return event;
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.slug === slug
    );
  }

  async updateEvent(id: number, update: Partial<Event>): Promise<Event> {
    const event = this.events.get(id);
    if (!event) {
      throw new Error("Event not found");
    }

    const updatedEvent = {
      ...event,
      ...update,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = this.currentResponseId++;
    const response: Response = {
      ...insertResponse,
      id,
      createdAt: new Date(),
    };
    this.responses.set(id, response);
    return response;
  }

  async getResponsesByEventId(eventId: number): Promise<Response[]> {
    return Array.from(this.responses.values()).filter(
      (response) => response.eventId === eventId
    );
  }

  async cleanupExpiredEvents(): Promise<void> {
    const now = new Date();
    const expiredEventIds: number[] = [];

    // Find expired events
    for (const [id, event] of this.events.entries()) {
      // Get the latest date from event.dates
      const latestDate = new Date(Math.max(...event.dates.map(d => d instanceof Date ? d.getTime() : new Date(d).getTime())));
      // Add 7 days to the latest date
      const deletionDate = new Date(latestDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (deletionDate < now) {
        expiredEventIds.push(id);
      }
    }

    // Delete expired events and their responses
    for (const eventId of expiredEventIds) {
      // Delete event
      this.events.delete(eventId);

      // Delete associated responses
      for (const [responseId, response] of this.responses.entries()) {
        if (response.eventId === eventId) {
          this.responses.delete(responseId);
        }
      }
    }
    
    if (expiredEventIds.length > 0) {
      console.log(`[MemStorage] Cleaned up ${expiredEventIds.length} expired events and their responses`);
    }
  }
}

// Supabaseが設定されている場合はSupabaseStorageを使用し、そうでない場合はMemStorageを使用する
export const storage = isSupabaseConfigured && supabase 
  ? new SupabaseStorage() 
  : new MemStorage();