# Sistema di Verifica Token - Approccio Semplificato

## Panoramica

È stato implementato un sistema semplificato di verifica del token di autenticazione che utilizza il middleware Next.js per validare i token solo quando necessario.

## Componenti Implementati

### 1. API Utilities (`src/utils/api.ts`)

- **`verifyToken(token: string)`**: Verifica la validità del token tramite l'endpoint `/api/auth/me`
- **`loginUser(email: string, password: string)`**: Gestisce il login dell'utente
- Gestione centralizzata delle chiamate API con error handling

### 2. Middleware di Autenticazione (`middleware.ts`)

- Verifica automatica del token per ogni accesso a pagine protette
- Reindirizzamento automatico al login se il token non è valido
- Rimozione automatica dei cookie non validi

### 3. Proxy API Routes

- **Login Proxy** (`/src/app/api/auth/login/route.ts`): Evita problemi CORS
- **Token Verification Proxy** (`/src/app/api/auth/me/route.ts`): Verifica sicura del token

### 4. Contesto di Autenticazione (`src/contexts/AuthContext.tsx`)

- Gestione dello stato di autenticazione
- Login e logout
- Persistenza dei dati utente

## Endpoint API Utilizzati

### Verifica Token
```bash
POST /api/auth/me
Headers:
  - accept: application/json
  - Content-Type: application/json
  - Authorization: Bearer {token}
Body:
  {
    "token": "jwt_token_here"
  }
```

### Login
```bash
POST /api/auth/login
Headers:
  - accept: application/json
  - Content-Type: application/json
Body:
  {
    "email": "user@example.com",
    "password": "password"
  }
```

## Flusso di Autenticazione Semplificato

1. **Login**: L'utente inserisce credenziali → API login → Token salvato
2. **Accesso a Pagina Protetta**: Middleware verifica token tramite API
3. **Token Valido**: Accesso consentito
4. **Token Non Valido**: Redirect automatico al login

## Vantaggi del Nuovo Approccio

- ✅ **Nessun ciclo continuo**: Verifica solo quando necessario
- ✅ **Performance migliori**: Nessuna verifica in background
- ✅ **Sicurezza**: Verifica server-side nel middleware
- ✅ **Semplicità**: Meno codice da mantenere
- ✅ **Efficienza**: Verifica solo all'accesso delle pagine

## Configurazione Ambiente

Per utilizzare un URL diverso, impostare la variabile d'ambiente:
```bash
NEXT_PUBLIC_BASE_URL=https://your-api-url.com/
```

## Note di Sicurezza

- Il token viene verificato tramite middleware server-side
- Rimozione automatica dei cookie non validi
- Redirect sicuro al login per token scaduti
- Gestione degli errori di rete

## Gestione Errori

- Token scaduto: Redirect automatico al login
- Errori di rete: Redirect al login per sicurezza
- Cookie non validi: Rimozione automatica 