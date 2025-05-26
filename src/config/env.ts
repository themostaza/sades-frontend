// Configurazione delle variabili d'ambiente
export const config = {
  // URL base dell'API backend
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://sades-10528bec4f2e.herokuapp.com/',
} as const;

export default config; 