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
      articulos: {
        Row: {
          categoria: string
          fotografia: string
          id: number
          nombre: string
          precio_base: number
          sobre_pedido: boolean
        }
        Insert: {
          categoria: string
          fotografia?: string
          id?: never
          nombre: string
          precio_base: number
          sobre_pedido?: boolean
        }
        Update: {
          categoria?: string
          fotografia?: string
          id?: never
          nombre?: string
          precio_base?: number
          sobre_pedido?: boolean
        }
        Relationships: []
      }
      carritos: {
        Row: {
          cerrado: boolean
          cliente_id: number | null
          correo_cliente: string | null
          id: number
        }
        Insert: {
          cerrado?: boolean
          cliente_id?: number | null
          correo_cliente?: string | null
          id?: never
        }
        Update: {
          cerrado?: boolean
          cliente_id?: number | null
          correo_cliente?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "carritos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          id: number
          nombre: string
          telefono: string
        }
        Insert: {
          id?: never
          nombre: string
          telefono: string
        }
        Update: {
          id?: never
          nombre?: string
          telefono?: string
        }
        Relationships: []
      }
      items_carrito: {
        Row: {
          cantidad: number
          carrito_id: number
          precio_unitario: number
          subtotal: number
          variante_id: number
        }
        Insert: {
          cantidad: number
          carrito_id: number
          precio_unitario: number
          subtotal?: number
          variante_id: number
        }
        Update: {
          cantidad?: number
          carrito_id?: number
          precio_unitario?: number
          subtotal?: number
          variante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_carrito_carrito_id_fkey"
            columns: ["carrito_id"]
            isOneToOne: false
            referencedRelation: "carritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carrito_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      items_pedido: {
        Row: {
          cantidad: number
          pedido_id: number
          precio_unitario: number
          subtotal: number
          variante_id: number
        }
        Insert: {
          cantidad: number
          pedido_id: number
          precio_unitario: number
          subtotal?: number
          variante_id: number
        }
        Update: {
          cantidad?: number
          pedido_id?: number
          precio_unitario?: number
          subtotal?: number
          variante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "variantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          carrito_id: number
          clave_solicitud: string | null
          cliente_id: number | null
          correo_cliente: string | null
          creado_por: string | null
          estado: Database["public"]["Enums"]["estado_pedido"]
          fecha_creacion: string
          id: number
          origen: string
          resumen_publico: Json | null
          vence_en: string | null
        }
        Insert: {
          carrito_id: number
          clave_solicitud?: string | null
          cliente_id?: number | null
          correo_cliente?: string | null
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          fecha_creacion?: string
          id?: never
          origen?: string
          resumen_publico?: Json | null
          vence_en?: string | null
        }
        Update: {
          carrito_id?: number
          clave_solicitud?: string | null
          cliente_id?: number | null
          correo_cliente?: string | null
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          fecha_creacion?: string
          id?: never
          origen?: string
          resumen_publico?: Json | null
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_carrito_id_cliente_id_fkey"
            columns: ["carrito_id", "cliente_id"]
            isOneToOne: false
            referencedRelation: "carritos"
            referencedColumns: ["id", "cliente_id"]
          },
          {
            foreignKeyName: "pedidos_carrito_id_fkey"
            columns: ["carrito_id"]
            isOneToOne: true
            referencedRelation: "carritos"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes: {
        Row: {
          articulo_id: number
          existencia: number
          id: number
          talla_medida: string
        }
        Insert: {
          articulo_id: number
          existencia?: number
          id?: never
          talla_medida: string
        }
        Update: {
          articulo_id?: number
          existencia?: number
          id?: never
          talla_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "variantes_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_carrito:
        | { Args: { p_cliente_id: number }; Returns: number }
        | {
            Args: { p_cliente_id: number; p_correo_cliente: string }
            Returns: number
          }
      actualizar_personal: {
        Args: {
          p_activo: boolean
          p_id: string
          p_nombre: string
          p_rol: string
        }
        Returns: undefined
      }
      ajustar_existencia: {
        Args: { p_cambio: number; p_variante_id: number }
        Returns: {
          articulo_id: number
          existencia: number
          id: number
          talla_medida: string
        }[]
        SetofOptions: {
          from: "*"
          to: "variantes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      confirmar_pedido: {
        Args: { p_confirmaciones?: number[]; p_id: number }
        Returns: number
      }
      crear_articulo: {
        Args: {
          p_categoria: string
          p_fotografia?: string
          p_nombre: string
          p_precio_base: number
          p_sobre_pedido?: boolean
          p_variantes?: Json
        }
        Returns: number
      }
      crear_pedido_desde_carrito: {
        Args: { p_carrito_id: number }
        Returns: number
      }
      es_admin: { Args: never; Returns: boolean }
      es_personal: { Args: never; Returns: boolean }
      guardar_item_carrito: {
        Args: {
          p_cantidad: number
          p_carrito_id: number
          p_precio_unitario?: number
          p_variante_id: number
        }
        Returns: undefined
      }
      guardar_pedido:
        | {
            Args: {
              p_carrito_id: number
              p_cliente_id: number
              p_correo_cliente: string
              p_estado?: Database["public"]["Enums"]["estado_pedido"]
              p_items: Json
            }
            Returns: number
          }
        | {
            Args: {
              p_carrito_id: number
              p_cliente_id: number
              p_estado?: Database["public"]["Enums"]["estado_pedido"]
              p_items: Json
            }
            Returns: number
          }
      listar_personal: { Args: { p_desde?: number }; Returns: Json }
      obtener_catalogo: {
        Args: { p_articulo_id?: number; p_desde?: number; p_limite?: number }
        Returns: {
          articulo_id: number
          categoria: string
          fotografia: string
          nombre: string
          precio_base: number
          sobre_pedido: boolean
          variantes: Json
        }[]
      }
      registrar_pedido_publico: {
        Args: { p_clave: string; p_items: Json }
        Returns: Json
      }
    }
    Enums: {
      estado_pedido:
        | "PENDIENTE"
        | "ENVIADO"
        | "ENTREGADO"
        | "CANCELADO"
        | "CONFIRMADO"
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
      estado_pedido: [
        "PENDIENTE",
        "ENVIADO",
        "ENTREGADO",
        "CANCELADO",
        "CONFIRMADO",
      ],
    },
  },
} as const

