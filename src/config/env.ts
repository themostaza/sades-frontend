// Configurazione delle variabili d'ambiente
export const config = {
  // URL base dell'API backend
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://sades-10528bec4f2e.herokuapp.com/',
  
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'eu-west-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '',
} as const;

export default config; 