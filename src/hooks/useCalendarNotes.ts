import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type {
  CalendarNote,
  CalendarNotesApiResponse,
  CreateCalendarNoteRequest,
  UpdateCalendarNoteRequest,
} from '../types/calendar-notes';

interface UseCalendarNotesState {
  notes: CalendarNote[];
  loading: boolean;
  error: string | null;
  pagination: CalendarNotesApiResponse['pagination'] | null;
}

export function useCalendarNotes() {
  const { token } = useAuth();
  const [state, setState] = useState<UseCalendarNotesState>({
    notes: [],
    loading: false,
    error: null,
    pagination: null,
  });

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchNotes = useCallback(async (params: {
    user_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const search = new URLSearchParams();
      if (params.user_id) search.append('user_id', params.user_id);
      if (params.start_date) search.append('start_date', params.start_date);
      if (params.end_date) search.append('end_date', params.end_date);
      search.append('page', String(params.page ?? 1));
      // Backend may reject large limits - keep it small and safe
      const safeLimit = Math.min(params.limit ?? 20, 100);
      search.append('limit', String(safeLimit));

      const response = await fetch(`/api/calendar-notes?${search.toString()}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: CalendarNotesApiResponse = await response.json();
      setState(prev => ({ ...prev, notes: data.data, pagination: data.pagination }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Errore sconosciuto' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [getHeaders]);

  const createNote = useCallback(async (body: CreateCalendarNoteRequest) => {
    const response = await fetch(`/api/calendar-notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: CalendarNote = await response.json();
    return data;
  }, [getHeaders]);

  const updateNote = useCallback(async (id: string, body: UpdateCalendarNoteRequest) => {
    const response = await fetch(`/api/calendar-notes/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: CalendarNote = await response.json();
    return data;
  }, [getHeaders]);

  const deleteNote = useCallback(async (id: string) => {
    const response = await fetch(`/api/calendar-notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }, [getHeaders]);

  return {
    ...state,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}


