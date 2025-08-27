'use client';

import React from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

interface NotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  showCloseButton?: boolean;
}

export default function NotificationDialog({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  confirmText = 'Chiudi',
  showCloseButton = true
}: NotificationDialogProps) {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: <Check className="w-6 h-6 text-green-600" />,
          bgClass: 'bg-green-100',
          iconBg: 'bg-green-100'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600" />,
          bgClass: 'bg-red-100',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-yellow-600" />,
          bgClass: 'bg-yellow-100',
          iconBg: 'bg-yellow-100'
        };
      case 'info':
        return {
          icon: (
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgClass: 'bg-blue-100',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          icon: <AlertCircle className="w-6 h-6 text-gray-600" />,
          bgClass: 'bg-gray-100',
          iconBg: 'bg-gray-100'
        };
    }
  };

  const { icon, iconBg } = getIconAndColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with icon */}
        <div className="flex items-center mb-4">
          <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-full flex items-center justify-center`}>
            {icon}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            {message}
          </p>
          
          {/* Details list */}
          {details && details.length > 0 && (
            <div className="mt-3 space-y-1">
              {details.map((detail, index) => (
                <p key={index} className="text-xs text-gray-400">
                  • {detail}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
