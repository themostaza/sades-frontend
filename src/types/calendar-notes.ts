export interface CalendarNote {
  id: string;
  user_id: string;
  user_name: string;
  note: string;
  note_date: string; // ISO string
  created_by: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarNotesApiResponse {
  data: CalendarNote[];
  pagination: {
    total: number;
    page: number;
    skip: number;
    totalPages: number;
  };
}

export interface CreateCalendarNoteRequest {
  user_id: string;
  note: string;
  note_date: string; // ISO date
}

export interface UpdateCalendarNoteRequest {
  user_id: string;
  note: string;
  note_date: string;
}


