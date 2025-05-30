import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config/env';
import { Article, UpdateArticleRequest } from '../../../../types/article';

const BASE_URL = config.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id: articleId } = await params;
    
    console.log('🔄 Proxying article details request to:', `${BASE_URL}api/articles/${articleId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('🆔 Article ID:', articleId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/articles/${articleId}`, {
      method: 'GET',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch article details' },
        { status: response.status }
      );
    }

    const data: Article = await response.json();
    console.log('✅ Backend success - article details fetched for ID:', articleId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const body: UpdateArticleRequest = await request.json();
    const { id: articleId } = await params;
    
    console.log('🔄 Proxying article update to:', `${BASE_URL}api/articles/${articleId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('📤 Request body:', body);
    console.log('🆔 Article ID:', articleId);

    // Set the ID in the body to match the URL parameter
    body.id = articleId;

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/articles/${articleId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend success - article updated for ID:', articleId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { id: articleId } = await params;
    
    console.log('🔄 Proxying article deletion to:', `${BASE_URL}api/articles/${articleId}`);
    console.log('🔑 Auth header:', authHeader);
    console.log('🆔 Article ID:', articleId);

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${BASE_URL}api/articles/${articleId}`, {
      method: 'DELETE',
      headers,
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: response.status }
      );
    }

    // Per DELETE, il backend potrebbe restituire 204 No Content o un messaggio di conferma
    let data = {};
    if (response.status !== 204) {
      data = await response.json();
    }
    
    console.log('✅ Backend success - article deleted for ID:', articleId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 