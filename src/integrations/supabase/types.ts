export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          shop_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          shop_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          shop_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      app_secrets: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          shop_id: string | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          shop_id?: string | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          shop_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          shop_id: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          shop_id?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          shop_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_ledger: {
        Row: {
          created_at: string
          customer_id: string
          delta: number
          due_date: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          reason: string
          ref_id: string | null
          shop_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          delta: number
          due_date?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          reason: string
          ref_id?: string | null
          shop_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          delta?: number
          due_date?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          reason?: string
          ref_id?: string | null
          shop_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          credit_limit: number
          deleted_at: string | null
          email: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          doc_type: string
          last_number: number
          updated_at: string
          year: number
        }
        Insert: {
          doc_type: string
          last_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          doc_type?: string
          last_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      document_registry: {
        Row: {
          code: string
          created_at: string
          customer_name: string | null
          doc_number: number
          doc_type: string
          generated_by: string | null
          id: string
          sale_id: string | null
          shop_id: string | null
          total_usd: number
        }
        Insert: {
          code: string
          created_at?: string
          customer_name?: string | null
          doc_number: number
          doc_type: string
          generated_by?: string | null
          id?: string
          sale_id?: string | null
          shop_id?: string | null
          total_usd?: number
        }
        Update: {
          code?: string
          created_at?: string
          customer_name?: string | null
          doc_number?: number
          doc_type?: string
          generated_by?: string | null
          id?: string
          sale_id?: string | null
          shop_id?: string | null
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_registry_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_registry_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_settings: {
        Row: {
          accent_color: string | null
          content: string | null
          created_at: string
          document_type: string
          id: string
          logo_url: string | null
          shop_id: string | null
          signature_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          content?: string | null
          created_at?: string
          document_type: string
          id?: string
          logo_url?: string | null
          shop_id?: string | null
          signature_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          content?: string | null
          created_at?: string
          document_type?: string
          id?: string
          logo_url?: string | null
          shop_id?: string | null
          signature_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          hired_at: string | null
          id: string
          is_terminated: boolean
          monthly_salary_usd: number
          phone: string | null
          photo_url: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          shop_id: string | null
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          hired_at?: string | null
          id?: string
          is_terminated?: boolean
          monthly_salary_usd?: number
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          shop_id?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          hired_at?: string | null
          id?: string
          is_terminated?: boolean
          monthly_salary_usd?: number
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          shop_id?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          shop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_usd: number
          category_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          proof_url: string | null
          shop_id: string | null
          spent_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          amount_usd: number
          category_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          proof_url?: string | null
          shop_id?: string | null
          spent_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number
          category_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          proof_url?: string | null
          shop_id?: string | null
          spent_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          code: string
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          id: string
          labor_usd: number
          materials_usd: number
          quote_id: string | null
          report: string | null
          scheduled_at: string | null
          service_type: string
          shop_id: string | null
          status: Database["public"]["Enums"]["intervention_status"]
          technician_id: string | null
          total_usd: number
          travel_usd: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          labor_usd?: number
          materials_usd?: number
          quote_id?: string | null
          report?: string | null
          scheduled_at?: string | null
          service_type: string
          shop_id?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          technician_id?: string | null
          total_usd?: number
          travel_usd?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          labor_usd?: number
          materials_usd?: number
          quote_id?: string | null
          report?: string | null
          scheduled_at?: string | null
          service_type?: string
          shop_id?: string | null
          status?: Database["public"]["Enums"]["intervention_status"]
          technician_id?: string | null
          total_usd?: number
          travel_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          id: string
          phone: string | null
          role: string
          shop_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          phone?: string | null
          role?: string
          shop_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          phone?: string | null
          role?: string
          shop_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      message_replies: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          quote_request_id: string
          shop_id: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          quote_request_id: string
          shop_id?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          quote_request_id?: string
          shop_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_replies_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_replies_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          shop_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          shop_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          shop_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          code: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee_usd: number
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          id: string
          note: string | null
          paid: boolean
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider: string | null
          payment_ref: string | null
          payment_status: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_applied: boolean
          subtotal_usd: number
          total_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee_usd?: number
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          note?: string | null
          paid?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_applied?: boolean
          subtotal_usd?: number
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee_usd?: number
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          note?: string | null
          paid?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_status?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_applied?: boolean
          subtotal_usd?: number
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_usd: number
          order_id: string
          product_id: string | null
          product_name: string
          qty: number
          shop_id: string | null
          unit_price_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_usd: number
          order_id: string
          product_id?: string | null
          product_name: string
          qty: number
          shop_id?: string | null
          unit_price_usd: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total_usd?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          shop_id?: string | null
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          extras: Json
          merchant_id: string | null
          merchant_key: string | null
          provider: string
          sandbox: boolean
          updated_at: string
        }
        Insert: {
          extras?: Json
          merchant_id?: string | null
          merchant_key?: string | null
          provider: string
          sandbox?: boolean
          updated_at?: string
        }
        Update: {
          extras?: Json
          merchant_id?: string | null
          merchant_key?: string | null
          provider?: string
          sandbox?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_usd: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          reference: string | null
          sale_id: string
          shop_id: string | null
        }
        Insert: {
          amount: number
          amount_usd: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          sale_id: string
          shop_id?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          sale_id?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          shop_id: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          shop_id?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          shop_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          author_name: string
          comment: string | null
          created_at: string
          id: string
          is_published: boolean
          product_id: string
          rating: number
          shop_id: string | null
        }
        Insert: {
          author_name: string
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          product_id: string
          rating?: number
          shop_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          product_id?: string
          rating?: number
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          id: string
          preferred: boolean
          product_id: string
          shop_id: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred?: boolean
          product_id: string
          shop_id?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred?: boolean
          product_id?: string
          shop_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          images: string[]
          low_stock_threshold: number | null
          name: string
          sale_price: number
          shop_id: string | null
          show_stock_public: boolean
          sku: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          low_stock_threshold?: number | null
          name: string
          sale_price?: number
          shop_id?: string | null
          show_stock_public?: boolean
          sku?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          low_stock_threshold?: number | null
          name?: string
          sale_price?: number
          shop_id?: string | null
          show_stock_public?: boolean
          sku?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          line_total_usd: number
          product_id: string | null
          product_name: string
          purchase_id: string
          qty: number
          shop_id: string | null
          unit_cost_usd: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_usd: number
          product_id?: string | null
          product_name: string
          purchase_id: string
          qty: number
          shop_id?: string | null
          unit_cost_usd: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total_usd?: number
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          qty?: number
          shop_id?: string | null
          unit_cost_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          code: string
          created_at: string
          delivered_at: string | null
          expected_delivery_at: string | null
          id: string
          note: string | null
          received_at: string | null
          shipping_usd: number
          shop_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          subtotal_usd: number
          supplier_id: string | null
          total_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          delivered_at?: string | null
          expected_delivery_at?: string | null
          id?: string
          note?: string | null
          received_at?: string | null
          shipping_usd?: number
          shop_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          subtotal_usd?: number
          supplier_id?: string | null
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          delivered_at?: string | null
          expected_delivery_at?: string | null
          id?: string
          note?: string | null
          received_at?: string | null
          shipping_usd?: number
          shop_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          subtotal_usd?: number
          supplier_id?: string | null
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          attachment_url: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          service: string
          shop_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          service: string
          shop_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          service?: string
          shop_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          note: string | null
          paid: boolean
          paid_at: string | null
          period_end: string
          period_start: string
          proof_url: string | null
          shop_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          period_end: string
          period_start: string
          proof_url?: string | null
          shop_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          period_end?: string
          period_start?: string
          proof_url?: string | null
          shop_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          advance: boolean
          amount_usd: number
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          employee_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          note: string | null
          paid_at: string
          period_end: string
          period_month: string | null
          period_start: string
          shop_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          advance?: boolean
          amount_usd: number
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string
          period_end: string
          period_month?: string | null
          period_start: string
          shop_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          advance?: boolean
          amount_usd?: number
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string
          period_end?: string
          period_month?: string | null
          period_start?: string
          shop_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount_usd: number
          id: string
          line_total_usd: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          shop_id: string | null
          unit_price_usd: number
        }
        Insert: {
          discount_usd?: number
          id?: string
          line_total_usd: number
          product_id: string
          product_name: string
          qty: number
          sale_id: string
          shop_id?: string | null
          unit_price_usd: number
        }
        Update: {
          discount_usd?: number
          id?: string
          line_total_usd?: number
          product_id?: string
          product_name?: string
          qty?: number
          sale_id?: string
          shop_id?: string | null
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: Database["public"]["Enums"]["sale_channel"]
          code: string
          created_at: string
          credit_usd: number
          customer_id: string | null
          discount_usd: number
          due_date: string | null
          id: string
          note: string | null
          paid_usd: number
          session_id: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal_usd: number
          total_usd: number
          user_id: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          code: string
          created_at?: string
          credit_usd?: number
          customer_id?: string | null
          discount_usd?: number
          due_date?: string | null
          id?: string
          note?: string | null
          paid_usd?: number
          session_id?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_usd?: number
          total_usd?: number
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          code?: string
          created_at?: string
          credit_usd?: number
          customer_id?: string | null
          discount_usd?: number
          due_date?: string | null
          id?: string
          note?: string | null
          paid_usd?: number
          session_id?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal_usd?: number
          total_usd?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          document_theme_color: string | null
          email: string | null
          extras: Json
          id: number
          invoice_prefix: string
          legal_mentions: string | null
          logo_url: string | null
          low_stock_threshold: number
          map_lat: number | null
          map_lng: number | null
          payment_gateways: Json | null
          phone: string | null
          primary_currency: Database["public"]["Enums"]["currency_code"]
          services_gallery: Json | null
          shop_name: string
          trash_retention_days: number
          updated_at: string
          usd_to_cdf_rate: number
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          document_theme_color?: string | null
          email?: string | null
          extras?: Json
          id?: number
          invoice_prefix?: string
          legal_mentions?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          map_lat?: number | null
          map_lng?: number | null
          payment_gateways?: Json | null
          phone?: string | null
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          services_gallery?: Json | null
          shop_name?: string
          trash_retention_days?: number
          updated_at?: string
          usd_to_cdf_rate?: number
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          document_theme_color?: string | null
          email?: string | null
          extras?: Json
          id?: number
          invoice_prefix?: string
          legal_mentions?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          map_lat?: number | null
          map_lng?: number | null
          payment_gateways?: Json | null
          phone?: string | null
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          services_gallery?: Json | null
          shop_name?: string
          trash_retention_days?: number
          updated_at?: string
          usd_to_cdf_rate?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      shop_document_counters: {
        Row: {
          doc_type: string
          last_number: number
          shop_id: string
          year: number
        }
        Insert: {
          doc_type: string
          last_number?: number
          shop_id?: string
          year: number
        }
        Update: {
          doc_type?: string
          last_number?: number
          shop_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_document_counters_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_memberships: {
        Row: {
          created_at: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          address: string | null
          document_theme_color: string | null
          email: string | null
          extras: Json
          invoice_prefix: string
          legal_mentions: string | null
          logo_url: string | null
          low_stock_threshold: number
          phone: string | null
          primary_currency: Database["public"]["Enums"]["currency_code"]
          shop_id: string
          shop_name: string
          updated_at: string
          usd_to_cdf_rate: number
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          document_theme_color?: string | null
          email?: string | null
          extras?: Json
          invoice_prefix?: string
          legal_mentions?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          phone?: string | null
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          shop_id: string
          shop_name: string
          updated_at?: string
          usd_to_cdf_rate?: number
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          document_theme_color?: string | null
          email?: string | null
          extras?: Json
          invoice_prefix?: string
          legal_mentions?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          phone?: string | null
          primary_currency?: Database["public"]["Enums"]["currency_code"]
          shop_id?: string
          shop_name?: string
          updated_at?: string
          usd_to_cdf_rate?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          note: string | null
          product_id: string
          reason: Database["public"]["Enums"]["movement_reason"]
          ref_id: string | null
          ref_type: string | null
          shop_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          product_id: string
          reason: Database["public"]["Enums"]["movement_reason"]
          ref_id?: string | null
          ref_type?: string | null
          shop_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          product_id?: string
          reason?: Database["public"]["Enums"]["movement_reason"]
          ref_id?: string | null
          ref_type?: string | null
          shop_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance_usd: number
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance_usd?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance_usd?: number
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_operations: {
        Row: {
          client_op_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          result: Json | null
          shop_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_op_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          result?: Json | null
          shop_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_op_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          result?: Json | null
          shop_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_operations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          cv_url: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_published: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          photo_url: string | null
          role: string
          shop_id: string | null
          sort_order: number
          updated_at: string
          website_url: string | null
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean
          linkedin_url?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          shop_id?: string | null
          sort_order?: number
          updated_at?: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          shop_id?: string | null
          sort_order?: number
          updated_at?: string
          website_url?: string | null
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _delta: number
          _note?: string
          _product_id: string
          _reason: Database["public"]["Enums"]["movement_reason"]
        }
        Returns: undefined
      }
      cancel_sale: { Args: { _sale_id: string }; Returns: undefined }
      check_invitation: { Args: { _token: string }; Returns: Json }
      claim_my_orders: { Args: never; Returns: number }
      claim_order_by_code: {
        Args: { _code: string; _contact?: string }
        Returns: Json
      }
      create_online_order: {
        Args: {
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _delivery_address: string
          _delivery_fee_usd: number
          _delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          _items: Json
          _note: string
        }
        Returns: string
      }
      create_pos_sale: {
        Args: {
          _customer_id: string
          _discount_usd?: number
          _items: Json
          _note?: string
          _payments: Json
          _session_id?: string
        }
        Returns: string
      }
      current_shop_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_shop: {
        Args: {
          _address?: string
          _email?: string
          _logo?: string
          _name: string
          _phone?: string
          _theme?: string
        }
        Returns: string
      }
      issue_document_number: {
        Args: {
          _customer_name?: string
          _doc_type: string
          _sale_id?: string
          _total_usd?: number
        }
        Returns: Json
      }
      list_trash_items: {
        Args: never
        Returns: {
          deleted_at: string
          entity_name: string
          id: string
          table_name: string
        }[]
      }
      log_auth_event: {
        Args: { _action: string; _metadata?: Json }
        Returns: undefined
      }
      next_intervention_code: { Args: never; Returns: string }
      next_order_code: { Args: never; Returns: string }
      next_purchase_code: { Args: never; Returns: string }
      next_sale_code: { Args: never; Returns: string }
      purge_trash_item: { Args: { _id: string }; Returns: undefined }
      receive_purchase: { Args: { _purchase_id: string }; Returns: undefined }
      record_customer_payment:
        | {
            Args: { _amount: number; _customer_id: string; _note?: string }
            Returns: string
          }
        | {
            Args: {
              _amount: number
              _customer_id: string
              _method?: Database["public"]["Enums"]["payment_method"]
              _note?: string
            }
            Returns: string
          }
      restore_trash_item: { Args: { _id: string }; Returns: undefined }
      shwary_apply_status: {
        Args: {
          _order_id: string
          _reason?: string
          _ref: string
          _secret: string
          _status: string
        }
        Returns: Json
      }
      shwary_check_secret: { Args: { _secret: string }; Returns: boolean }
      shwary_get_creds: { Args: { _secret: string }; Returns: Json }
      shwary_get_order: {
        Args: { _order_id: string; _secret: string }
        Returns: Json
      }
      shwary_get_order_by_code: {
        Args: { _code: string; _secret: string }
        Returns: Json
      }
      shwary_save_creds: {
        Args: {
          _merchant_id: string
          _merchant_key: string
          _sandbox: boolean
          _secret: string
        }
        Returns: undefined
      }
      shwary_set_ref: {
        Args: {
          _order_id: string
          _ref: string
          _secret: string
          _status: string
        }
        Returns: undefined
      }
      slugify: { Args: { "": string }; Returns: string }
      sync_apply_operation: {
        Args: { _client_op_id: string; _kind: string; _payload: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "caissier"
        | "vendeur"
        | "comptable"
        | "technicien"
        | "livreur"
        | "client"
      currency_code: "USD" | "CDF"
      delivery_mode: "delivery" | "pickup"
      intervention_status:
        | "pending"
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
      movement_reason:
        | "sale"
        | "sale_cancel"
        | "purchase"
        | "manual_in"
        | "manual_out"
        | "correction"
        | "return"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "shipping"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_method:
        | "cash"
        | "mobile_money"
        | "card"
        | "bank_transfer"
        | "credit"
        | "mixed"
      product_status: "active" | "inactive" | "on_order"
      purchase_status: "draft" | "ordered" | "received" | "cancelled"
      quote_status: "new" | "read" | "replied" | "closed"
      sale_channel: "pos" | "online"
      sale_status: "completed" | "cancelled" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "caissier",
        "vendeur",
        "comptable",
        "technicien",
        "livreur",
        "client",
      ],
      currency_code: ["USD", "CDF"],
      delivery_mode: ["delivery", "pickup"],
      intervention_status: [
        "pending",
        "planned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      movement_reason: [
        "sale",
        "sale_cancel",
        "purchase",
        "manual_in",
        "manual_out",
        "correction",
        "return",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "shipping",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_method: [
        "cash",
        "mobile_money",
        "card",
        "bank_transfer",
        "credit",
        "mixed",
      ],
      product_status: ["active", "inactive", "on_order"],
      purchase_status: ["draft", "ordered", "received", "cancelled"],
      quote_status: ["new", "read", "replied", "closed"],
      sale_channel: ["pos", "online"],
      sale_status: ["completed", "cancelled", "refunded"],
    },
  },
} as const
