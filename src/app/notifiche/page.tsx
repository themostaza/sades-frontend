'use client';

import React, { useState } from 'react';
import { Check, X, Clock, User, Calendar, Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: 'assignment' | 'cancellation' | 'reminder' | 'absence';
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Dati di esempio basati sull'immagine Figma
const notificationsMock: Notification[] = [
  {
    id: '1',
    type: 'assignment',
    title: 'Roberta De Salvador ti ha assegnato Nome intervento per il 30 Agosto',
    description: 'Nuovo intervento assegnato',
    date: '30 Agosto',
    isRead: false,
    priority: 'high'
  },
  {
    id: '2',
    type: 'cancellation',
    title: 'Nome intervento del 30 Agosto è stato annullato',
    description: 'Intervento cancellato',
    date: '30 Agosto',
    isRead: false,
    priority: 'medium'
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Alle 15.30 di oggi si terrà l\'intervento per Nome Intervento',
    description: 'Promemoria intervento',
    date: 'Oggi',
    isRead: false,
    priority: 'high'
  },
  {
    id: '4',
    type: 'absence',
    title: 'La tua assenza del 3-5 Mag è stata confermata/rifiutata',
    description: 'Aggiornamento richiesta assenza',
    date: '3-5 Maggio',
    isRead: false,
    priority: 'medium'
  }
];

export default function NotifichePage() {
  const [notifications, setNotifications] = useState(notificationsMock);
  const [activeTab, setActiveTab] = useState<'tutte' | 'non-lette'>('tutte');

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

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const filteredNotifications = activeTab === 'non-lette' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifiche</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors flex items-center gap-2"
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
            onClick={() => setActiveTab('tutte')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tutte'
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setActiveTab('non-lette')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'non-lette'
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Non lette
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
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
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${
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
                    <p className={`text-sm ${
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
                      className="text-teal-600 hover:text-teal-700 p-1 rounded transition-colors"
                      title="Segna come letta"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                    title="Elimina notifica"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              {!notification.isRead && (
                <div className="absolute top-4 right-4">
                  <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredNotifications.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {filteredNotifications.length} di {notifications.length} notifiche
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
              Indietro
            </button>
            <button className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700">
              Avanti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
