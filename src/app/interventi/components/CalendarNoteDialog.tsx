'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCalendarNotes } from '../../../hooks/useCalendarNotes';
import type { CalendarNote } from '../../../types/calendar-notes';
import { X } from 'lucide-react';

interface CalendarNoteDialogProps {
  open: boolean;
  onClose: () => void;
  technicianName: string;
  technicianId?: string; // if known, pass to avoid lookup outside
  dateISO: string; // YYYY-MM-DD for the day
  existingNote?: CalendarNote | null;
}

export default function CalendarNoteDialog({ open, onClose, technicianName, technicianId, dateISO, existingNote }: CalendarNoteDialogProps) {
  const { createNote, updateNote, deleteNote } = useCalendarNotes();
  const [noteText, setNoteText] = useState(existingNote?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNoteText(existingNote?.note || '');
  }, [existingNote]);

  const dateIsoFull = useMemo(() => `${dateISO}T00:00:00.000Z`, [dateISO]);

  if (!open) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      if (existingNote) {
        await updateNote(existingNote.id, {
          user_id: existingNote.user_id,
          note: noteText,
          note_date: existingNote.note_date || dateIsoFull,
        });
      } else if (technicianId) {
        await createNote({
          user_id: technicianId,
          note: noteText,
          note_date: dateIsoFull,
        });
      } else {
        throw new Error('Missing technician id');
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingNote) return;
    try {
      setLoading(true);
      await deleteNote(existingNote.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg text-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="text-sm text-gray-600">Nota calendario</div>
            <div className="text-base font-semibold text-gray-700">{technicianName} · {dateISO}</div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <textarea
            className="w-full min-h-[140px] border rounded p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 placeholder-gray-400"
            placeholder="Scrivi la nota..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && (existingNote || technicianId)) {
                  handleSave();
                }
              }
            }}
          />
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between">
          {existingNote ? (
            <button
              className="text-red-600 text-sm hover:underline disabled:opacity-50"
              onClick={handleDelete}
              disabled={loading}
            >
              Elimina nota
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
            <button
              className="px-3 py-2 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={loading || (!existingNote && !technicianId)}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


