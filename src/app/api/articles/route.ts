import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../config/env';
import { ArticlesApiResponse, CreateArticleRequest, ArticleListItem } from '../../../types/article';

const BASE_URL = config.BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri di query
    const page = searchParams.get('page') || '1';
    const skip = searchParams.get('skip') || '20';
    const query = searchParams.get('query');
    const family_id = searchParams.get('family_id');
    const stock = searchParams.get('stock');
    const place_type_id = searchParams.get('place_type_id');
    const place_id = searchParams.get('place_id');
    const from_order_date = searchParams.get('from_order_date');
    const to_order_date = searchParams.get('to_order_date');
    const warehouse_id = searchParams.get('warehouse_id');
    
    console.log('🔄 Proxying articles request to:', `${BASE_URL}api/articles`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📋 Query params:', { 
      page, 
      skip, 
      query,
      family_id, 
      stock, 
      place_type_id, 
      place_id, 
      from_order_date, 
      to_order_date, 
      warehouse_id 
    });

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Costruisci l'URL con i parametri di query
    const backendUrl = new URL(`${BASE_URL}api/articles`);
    backendUrl.searchParams.append('page', page);
    backendUrl.searchParams.append('skip', skip);
    
    if (query) backendUrl.searchParams.append('query', query);
    if (family_id) backendUrl.searchParams.append('family_id', family_id);
    if (stock) backendUrl.searchParams.append('stock', stock);
    if (place_type_id) backendUrl.searchParams.append('place_type_id', place_type_id);
    if (place_id) backendUrl.searchParams.append('place_id', place_id);
    if (from_order_date) backendUrl.searchParams.append('from_order_date', from_order_date);
    if (to_order_date) backendUrl.searchParams.append('to_order_date', to_order_date);
    if (warehouse_id) backendUrl.searchParams.append('warehouse_id', warehouse_id);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: response.status }
      );
    }

    const data: ArticlesApiResponse = await response.json();
    console.log('✅ Backend success - articles fetched:', data.data?.length || 0, 'articles');
    console.log('📊 Pagination info:', data.meta);

    // Deduplicate by article id, merging inventories and summarizing totals
    type BackendInventoryRow = {
      warehouse_id?: string | number | null;
      warehouse?: string | number | null;
      warehouse_description?: string | null;
      quantity_stock?: number | null;
      quantity_reserved_client?: number | null;
      quantity_ordered?: number | null;
      in_stock?: number | null;
    };

    type BackendArticleItem = {
      id: string | number;
      short_description?: string | null;
      description?: string | null;
      inventory?: BackendInventoryRow[];
      quantity_stock?: number | null;
      quantity_reserved_client?: number | null;
      quantity_ordered?: number | null;
      warehouse_description?: string | null;
      [key: string]: unknown;
    };

    const originalList: BackendArticleItem[] = Array.isArray(data.data)
      ? (data.data as unknown as BackendArticleItem[])
      : [];

    const byId = new Map<string, BackendArticleItem>();

    const mergeInventories = (
      aInv: BackendInventoryRow[] = [],
      bInv: BackendInventoryRow[] = []
    ): BackendInventoryRow[] => {
      const merged = [...aInv, ...bInv];
      const byWarehouse = new Map<string, BackendInventoryRow>();
      for (const row of merged) {
        const wid = String(row?.warehouse_id ?? row?.warehouse ?? '');
        if (!wid) continue;
        const prev = byWarehouse.get(wid);
        if (!prev) {
          byWarehouse.set(wid, row);
        } else {
          // Keep the highest quantities seen for safety
          byWarehouse.set(wid, {
            ...prev,
            quantity_stock: Math.max(Number(prev.quantity_stock || 0), Number(row.quantity_stock || 0)),
            quantity_reserved_client: Math.max(
              Number(prev.quantity_reserved_client || 0),
              Number(row.quantity_reserved_client || 0)
            ),
            quantity_ordered: Math.max(
              Number(prev.quantity_ordered || 0),
              Number(row.quantity_ordered || 0)
            ),
            warehouse_description: String(
              row.warehouse_description ?? prev.warehouse_description ?? ''
            ),
          });
        }
      }
      return Array.from(byWarehouse.values());
    };

    for (const item of originalList) {
      const id = String((item?.id ?? '') as string | number);
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing) {
        // Normalize inventory and totals on first insert
        const inv: BackendInventoryRow[] = Array.isArray(item?.inventory) ? item.inventory! : [];
        const uniqueInv = mergeInventories(inv, []);
        const totalStock = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_stock || 0), 0);
        const totalReserved = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_reserved_client || 0), 0);
        const totalOrdered = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_ordered || 0), 0);
        byId.set(id, {
          ...item,
          inventory: uniqueInv,
          quantity_stock: Number.isFinite(totalStock) ? totalStock : (item.quantity_stock ?? 0),
          quantity_reserved_client: Number.isFinite(totalReserved) ? totalReserved : (item.quantity_reserved_client ?? 0),
          quantity_ordered: Number.isFinite(totalOrdered) ? totalOrdered : (item.quantity_ordered ?? 0),
        });
      } else {
        const invA: BackendInventoryRow[] = Array.isArray(existing?.inventory) ? existing.inventory! : [];
        const invB: BackendInventoryRow[] = Array.isArray(item?.inventory) ? item.inventory! : [];
        const uniqueInv = mergeInventories(invA, invB);
        const totalStock = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_stock || 0), 0);
        const totalReserved = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_reserved_client || 0), 0);
        const totalOrdered = uniqueInv.reduce((s: number, r) => s + Number(r?.quantity_ordered || 0), 0);
        byId.set(id, {
          ...existing,
          // Prefer most informative fields from the current item where meaningful
          short_description: (existing.short_description as string | null | undefined) || (item.short_description as string | null | undefined),
          description: (existing.description as string | null | undefined) || (item.description as string | null | undefined),
          inventory: uniqueInv,
          quantity_stock: totalStock,
          quantity_reserved_client: totalReserved,
          quantity_ordered: totalOrdered,
        } as BackendArticleItem);
      }
    }

    const dedupedList: BackendArticleItem[] = Array.from(byId.values());
    const result = {
      data: dedupedList as unknown as ArticleListItem[],
      meta: {
        ...data.meta,
        total: dedupedList.length,
      },
    } satisfies ArticlesApiResponse;

    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: CreateArticleRequest = await request.json();
    
    console.log('🔄 Proxying article creation to:', `${BASE_URL}api/articles`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📤 Request body:', body);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Article created successfully:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 