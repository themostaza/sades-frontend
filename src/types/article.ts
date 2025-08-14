// Tipi per gli articoli

// Tipo per l'inventory di un articolo
export interface ArticleInventory {
  // Legacy/base fields
  warehouse: string;
  disponible: number;
  riservata_cliente: number;
  in_stock: number;
  ordinata: number;
  data_primo_ordine: string | null;

  // Optional normalized fields coming from API consolidation
  warehouse_id?: string | number | null;
  warehouse_description?: string | null;
  quantity_stock?: number | null;
  quantity_reserved_client?: number | null;
  quantity_ordered?: number | null;
}

// Tipo per i fornitori di un articolo
export interface ArticleSupplier {
  id: number;
  name: string;
  description?: string;
  contact_info?: string;
  phone?: string;
  email?: string;
}

export interface Article {
  id: string;
  short_description: string;
  description: string;
  model: string | null;
  order_date: string | null;
  estimate_arrival_date: string | null;
  pnc_code: string | null;
  alternative_pnc_code: string | null;
  place_type_id: number | null;
  place_id: number | null;
  created_at: string;
  updated_at: string;
  brand_id: number;
  family_id: string;
  subfamily_id: string | null;
  family_label: string;
  subfamily_label: string | null;
  brand_label: string;
  inventory: ArticleInventory[];
}

// Tipi per gli articoli nella lista (con informazioni aggiuntive di stock)
export interface ArticleListItem extends Article {
  quantity_stock: number | null;
  quantity_reserved_client: number | null;
  quantity_ordered: number | null;
  warehouse_description: string | null;
  suppliers: ArticleSupplier[] | null;
}

// Tipo per i metadati di paginazione
export interface ApiMeta {
  total: number;
  page: number;
  skip: number;
  totalPages: number;
}

// Tipo per la risposta API della lista di articoli
export interface ArticlesApiResponse {
  data: ArticleListItem[];
  meta: ApiMeta;
}

// Tipo per la richiesta di creazione di un articolo
export interface CreateArticleRequest {
  id: string;
  short_description: string;
  description?: string;
  model?: string;
  order_date?: string;
  estimate_arrival_date?: string;
  pnc_code?: string;
  alternative_pnc_code?: string;
  place_type_id?: number;
  place_id?: number;
  brand_id: number;
  family_id: string;
  subfamily_id?: string;
}

// Tipo per la richiesta di aggiornamento di un articolo
export interface UpdateArticleRequest extends CreateArticleRequest {
  created_at?: string;
  updated_at?: string;
}

// Tipo per i tipi di posto
export interface PlaceType {
  id: number;
  label: string;
  name: string;
  description?: string;
}

// Tipo per i posti degli articoli
export interface ArticlePlace {
  id: number;
  name: string;
  description?: string;
  place_type_id: number;
  property_1: string;
  property_2: string;
}

// Tipo per i magazzini
export interface Warehouse {
  id: string;
  description: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

// Tipo per i filtri della ricerca articoli
export interface ArticleFilters {
  page?: number;
  skip?: number;
  query?: string;
  stock?: number; // 1 for in stock, -1 for out of stock
  place_type_id?: number;
  place_id?: number;
  from_order_date?: string;
  to_order_date?: string;
  warehouse_id?: string;
} 