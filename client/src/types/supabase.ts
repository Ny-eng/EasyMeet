export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: number
          title: string
          description: string | null
          organizer: string
          slug: string
          dates: string[]
          time: string
          deadline: string
          created_at: string | null
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          organizer: string
          slug: string
          dates: string[]
          time: string
          deadline: string
          created_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          organizer?: string
          slug?: string
          dates?: string[]
          time?: string
          deadline?: string
          created_at?: string | null
        }
      }
      responses: {
        Row: {
          id: number
          name: string
          event_id: number
          availability: boolean[]
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          event_id: number
          availability: boolean[]
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          event_id?: number
          availability?: boolean[]
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}