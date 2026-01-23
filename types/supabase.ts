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
          show_schedule: boolean;
          show_gallery: boolean;
          show_purpose: boolean;
          show_costs: boolean;
          show_logistics: boolean;
          show_committees: boolean;
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
          show_schedule?: boolean;
          show_gallery?: boolean;
          show_purpose?: boolean;
          show_costs?: boolean;
          show_logistics?: boolean;
          show_committees?: boolean;
        };
        Update: Database['public']['Tables']['site_settings']['Insert'];
      };
      content_sections: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          content: Json;
          position: number;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title?: string | null;
          content?: Json;
          position?: number;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['content_sections']['Insert'];
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
      registration_question_tickets: {
        Row: {
          question_id: string;
          ticket_type_id: string;
          created_at: string;
        };
        Insert: {
          question_id: string;
          ticket_type_id: string;
          created_at?: string;
        };
        Update: Database['public']['Tables']['registration_question_tickets']['Insert'];
      };
      registration_fields: {
        Row: {
          id: string;
          field_key: string;
          label: string;
          field_type: string;
          options: Json | null;
          required: boolean;
          position: number;
          scope: string;
          enabled: boolean;
          help_text: string | null;
          placeholder: string | null;
          locked: boolean;
          section: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          field_key: string;
          label: string;
          field_type: string;
          options?: Json | null;
          required?: boolean;
          position?: number;
          scope?: string;
          enabled?: boolean;
          help_text?: string | null;
          placeholder?: string | null;
          locked?: boolean;
          section?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Database['public']['Tables']['registration_fields']['Insert'];
      };
      ticket_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          inventory: number | null;
          age_min: number | null;
          age_max: number | null;
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
          age_min?: number | null;
          age_max?: number | null;
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
          payment_method: string | null;
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
          payment_method?: string | null;
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
