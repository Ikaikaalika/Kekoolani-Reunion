export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: string;
          hero_title: string;
          hero_subtitle: string | null;
          event_dates: string | null;
          location: string | null;
          about_html: string | null;
          schedule_json: Json | null;
          gallery_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hero_title: string;
          hero_subtitle?: string | null;
          event_dates?: string | null;
          location?: string | null;
          about_html?: string | null;
          schedule_json?: Json | null;
          gallery_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['site_settings']['Insert'];
      };
      registration_questions: {
        Row: {
          id: string;
          prompt: string;
          field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
          options: Json | null;
          required: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prompt: string;
          field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
          options?: Json | null;
          required?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['registration_questions']['Insert'];
      };
      ticket_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          inventory: number | null;
          active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          inventory?: number | null;
          active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['ticket_types']['Insert'];
      };
      orders: {
        Row: {
          id: string;
          stripe_session_id: string | null;
          purchaser_email: string;
          purchaser_name: string;
          status: 'pending' | 'paid' | 'canceled';
          total_cents: number;
          form_answers: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stripe_session_id?: string | null;
          purchaser_email: string;
          purchaser_name: string;
          status?: 'pending' | 'paid' | 'canceled';
          total_cents: number;
          form_answers?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['orders']['Insert'];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          ticket_type_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          ticket_type_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: Database['public']['Tables']['order_items']['Insert'];
      };
      attendees: {
        Row: {
          id: string;
          order_id: string;
          answers: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          answers: Json;
          created_at?: string;
        };
        Update: Database['public']['Tables']['attendees']['Insert'];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
