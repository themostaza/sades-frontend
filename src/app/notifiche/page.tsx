'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Clock, User, Calendar, Bell, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ApiNotification {
  id: string;
  message: string;
  fl_read: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  label: string;
}

interface Notification {
  id: string;
  type: 'assignment' | 'cancellation' | 'reminder' | 'absence';
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Funzione per mappare i dati dall'API al formato del componente
const mapApiNotificationToNotification = (apiNotification: ApiNotification): Notification => {
  // Determina il tipo di notifica in base al messaggio
  const message = apiNotification.message.toLowerCase();
  let type: Notification['type'] = 'reminder';
  
  if (message.includes('assenza') || message.includes('absence')) {
    type = 'absence';
  } else if (message.includes('assegn') || message.includes('assign')) {
    type = 'assignment';
  } else if (message.includes('annull') || message.includes('cancel')) {
    type = 'cancellation';
  }
  
  // Determina la priorità in base al tipo
  let priority: Notification['priority'] = 'medium';
  if (type === 'assignment') priority = 'high';
  else if (type === 'cancellation') priority = 'low';
  
  // Formatta la data
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  return {
    id: apiNotification.id,
    type,
    title: apiNotification.message,
    description: '', // L'API non fornisce descrizione separata
    date: formatDate(apiNotification.created_at),
    isRead: apiNotification.fl_read,
    priority
  };
};

export default function NotifichePage() {
  const auth = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'tutte' | 'non-lette'>('non-lette');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isCreatingNotification, setIsCreatingNotification] = useState(false);

  const fetchNotifications = async (page: number = 1, tab: 'tutte' | 'non-lette') => {
    console.log('[Notifiche][fetchNotifications] STARTED - token:', !!auth.token, 'page:', page, 'tab:', tab);
    if (!auth.token) {
      console.log('[Notifiche][fetchNotifications] ABORT - No token');
      return;
    }
    
    setIsLoadingNotifications(true);
    try {
      // Determina se filtrare solo le non lette
      const unreadOnly = tab === 'non-lette' ? 'true' : 'false';
      const url = `/api/notifications?page=${page}&limit=20&unread_only=${unreadOnly}`;
      console.log('[Notifiche][fetchNotifications] GET url:', url);
      
      const headers: Record<string, string> = {};
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      
      const response = await fetch(url, { credentials: 'include', headers });
      console.log('[Notifiche] Response status:', response.status);
      
      if (!response.ok) throw new Error('Errore nel recupero delle notifiche');
      
      const data = await response.json();
      console.log('[Notifiche] Response data:', data);
      
      // Mappa i dati dall'API al formato del componente
      const apiNotifications: ApiNotification[] = data.data || [];
      const mappedNotifications = apiNotifications.map(mapApiNotificationToNotification);
      
      setNotifications(mappedNotifications);
      setTotalPages(data.pagination?.total_pages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error('[Notifiche] Errore fetch:', err);
      setNotifications([]);
      setTotalPages(1);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    console.log('[Notifiche][useEffect] TRIGGERED - token:', !!auth.token, 'isLoading:', auth.isLoading, 'activeTab:', activeTab);
    if (auth.isLoading) {
      console.log('[Notifiche][useEffect] SKIP - Still loading auth');
      return;
    }
    if (!auth.token) {
      console.log('[Notifiche][useEffect] SKIP - No token available');
      return;
    }
    console.log('[Notifiche][useEffect] CALLING fetchNotifications');
    fetchNotifications(1, activeTab);
  }, [auth.token, auth.isLoading, activeTab]);

  const handleTabChange = (tab: 'tutte' | 'non-lette') => {
    setActiveTab(tab);
    setCurrentPage(1);
    // fetchNotifications sarà chiamata automaticamente dal useEffect quando activeTab cambia
  };

  const markAsRead = async (id: string) => {
    if (!auth.token) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Errore nel marcare la notifica come letta');
      }
      
      // Se siamo nel tab "non-lette", rimuovi la notifica dalla lista
      if (activeTab === 'non-lette') {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
      } else {
        // Se siamo nel tab "tutte", aggiorna solo lo stato isRead
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (err) {
      console.error('[Notifiche] Errore mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!auth.token) return;
    
    try {
      // Marca tutte le notifiche non lette come lette
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const promises = unreadNotifications.map(notification => 
        fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
      );
      
      await Promise.all(promises);
      
      // Aggiorna lo stato locale senza refresh
      if (activeTab === 'non-lette') {
        // Nel tab "non-lette", rimuovi tutte le notifiche
        setNotifications([]);
      } else {
        // Nel tab "tutte", marca tutte come lette
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
      }
    } catch (err) {
      console.error('[Notifiche] Errore mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!auth.token) return;
    
    try {
      // Rimuovi immediatamente dalla UI per feedback rapido
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      
      // Chiama API per eliminare dal server (se disponibile)
      // Per ora assumiamo che l'API per eliminare non sia ancora implementata
      // const response = await fetch(`/api/notifications/${id}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${auth.token}`,
      //   },
      //   credentials: 'include',
      // });
      
      // if (!response.ok) {
      //   throw new Error('Errore nell\'eliminazione della notifica');
      // }
      
    } catch (err) {
      console.error('[Notifiche] Errore delete:', err);
      // In caso di errore, ricarica i dati per ripristinare lo stato
      fetchNotifications(currentPage, activeTab);
    }
  };

  const fetchRoles = async () => {
    if (!auth.token) return;
    
    setIsLoadingRoles(true);
    try {
      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Errore nel recupero dei ruoli');
      }
      
      const data: Role[] = await response.json();
      setRoles(data);
    } catch (err) {
      console.error('[Notifiche] Errore fetch roles:', err);
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const createNotification = async () => {
    if (!auth.token || !selectedRole || !notificationMessage.trim()) return;
    
    setIsCreatingNotification(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          role: selectedRole,
          message: notificationMessage.trim(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nella creazione della notifica');
      }
      
      // Chiudi il dialog e resetta il form
      setIsCreateDialogOpen(false);
      setSelectedRole('');
      setNotificationMessage('');
      
      // Ricarica le notifiche per vedere quella appena creata
      fetchNotifications(currentPage, activeTab);
    } catch (err) {
      console.error('[Notifiche] Errore create notification:', err);
      alert('Errore nella creazione della notifica');
    } finally {
      setIsCreatingNotification(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
    if (roles.length === 0) {
      fetchRoles();
    }
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setSelectedRole('');
    setNotificationMessage('');
  };

  if (auth.isLoading) {
    console.log('[Notifiche][render] isLoading true, mostro caricamento');
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  console.log('[Notifiche][render] token:', auth.token, 'isLoading:', auth.isLoading);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return <User className="text-blue-600" size={20} />;
      case 'cancellation':
        return <X className="text-red-600" size={20} />;
      case 'reminder':
        return <Clock className="text-orange-600" size={20} />;
      case 'absence':
        return <Calendar className="text-green-600" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifiche</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateDialog}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Crea notifica
          </button>
          <button
            onClick={markAllAsRead}
            disabled={isLoadingNotifications || unreadCount === 0}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Check size={16} />
            Segna tutte come lette
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('tutte')}
            disabled={isLoadingNotifications}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 ${
              activeTab === 'tutte'
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => handleTabChange('non-lette')}
            disabled={isLoadingNotifications}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 disabled:opacity-50 ${
              activeTab === 'non-lette'
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Non lette
            {activeTab === 'non-lette' && notifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingNotifications && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Caricamento notifiche...</p>
        </div>
      )}

      {/* Notifications List */}
      {!isLoadingNotifications && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna notifica
              </h3>
              <p className="text-gray-500">
                {activeTab === 'non-lette' 
                  ? 'Non hai notifiche non lette' 
                  : 'Non hai ancora ricevuto notifiche'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md relative ${
                  notification.isRead 
                    ? 'bg-white border-l-gray-300' 
                    : getPriorityColor(notification.priority)
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm whitespace-pre-line ${
                        notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.date}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5"
                        title="Segna come letta"
                      >
                        <Check size={16} />
                        <span className="text-sm font-semibold">Letta</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-md transition-all duration-200"
                      title="Elimina notifica"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoadingNotifications && notifications.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {notifications.length} notifiche
            {totalPages > 1 && ` (pagina ${currentPage} di ${totalPages})`}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              onClick={() => fetchNotifications(Math.max(1, currentPage - 1), activeTab)}
              disabled={currentPage === 1 || isLoadingNotifications}
            >
              Indietro
            </button>
            <button
              className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50"
              onClick={() => fetchNotifications(Math.min(totalPages, currentPage + 1), activeTab)}
              disabled={currentPage === totalPages || isLoadingNotifications}
            >
              Avanti
            </button>
          </div>
        </div>
      )}

      {/* Dialog per creare notifica */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Crea nuova notifica
            </h2>
            
            <div className="space-y-4">
              {/* Select ruolo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo destinatario
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isLoadingRoles}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 text-gray-700"
                >
                  <option value="">
                    {isLoadingRoles ? 'Caricamento ruoli...' : 'Seleziona un ruolo'}
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.label}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input messaggio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messaggio
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Scrivi il messaggio della notifica..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-gray-700"
                />
              </div>
            </div>

            {/* Bottoni */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeCreateDialog}
                disabled={isCreatingNotification}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={createNotification}
                disabled={isCreatingNotification || !selectedRole || !notificationMessage.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingNotification && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Crea notifica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
