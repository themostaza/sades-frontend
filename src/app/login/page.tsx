'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Forgot password dialog states
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const authContext = useAuth();
  const { login, isAuthenticated } = authContext;
  const router = useRouter();

  // Redirect se già autenticato
  useEffect(() => {
    if (isAuthenticated) {
      setIsRedirecting(true);
      router.push('/interventi');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Il redirect a /interventi sarà gestito automaticamente dall'useEffect
        // quando isAuthenticated diventa true
      } else {
        setError(result.error || 'Credenziali non valide. Verifica email e password e riprova.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Errore durante il login. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    setError(''); // Reset eventuali errori precedenti
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetEmailSent(true);
      } else {
        // Mostra l'errore specifico dall'API
        setError(data.error || 'Errore durante l\'invio della richiesta di recupero password');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Errore di connessione. Verifica la tua connessione internet e riprova.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const closeForgotPasswordDialog = () => {
    setShowForgotPasswordDialog(false);
    setForgotPasswordEmail('');
    setResetEmailSent(false);
    setError(''); // Reset degli errori quando si chiude il dialog
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-gray-100 opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Accedi al tuo account
            </h2>
            <p className="text-sm text-gray-600">
              Accedi alla piattaforma per i tecnici
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-gray-400 text-gray-900"
                  placeholder="Inserisci la tua email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-gray-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordDialog(true)}
                  className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
                >
                  Password dimenticata
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || isRedirecting}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRedirecting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Reindirizzamento...
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Accesso in corso...
                  </div>
                ) : (
                  'Accedi'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-between">
            <span>© Sades Impianti srl - 2025</span>
            <a 
              href="mailto:sades@sades.it" 
              className="text-teal-600 hover:text-teal-500 transition-colors flex items-center gap-1"
            >
              <Mail size={12} />
              sades@sades.it
            </a>
          </p>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {showForgotPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Richiedi una nuova password
              </h3>
              <button
                onClick={closeForgotPasswordDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!resetEmailSent ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                {/* Error Message for Forgot Password */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="forgot-email"
                      name="forgot-email"
                      type="email"
                      required
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-gray-400 text-gray-900"
                      placeholder="Inserisci la tua email"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeForgotPasswordDialog}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isResetLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Invio...
                      </div>
                    ) : (
                      'Richiedi la password'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Email inviata!
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Ti abbiamo inviato un link per reimpostare la password all&apos;indirizzo{' '}
                  <span className="font-medium">{forgotPasswordEmail}</span>
                </p>
                <button
                  onClick={closeForgotPasswordDialog}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
