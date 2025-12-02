# Sades - Panoramica del Sistema

## Introduzione

**Sades** è un sistema gestionale web per la gestione completa del ciclo di vita degli interventi di assistenza tecnica. L'azienda Sades si occupa di **rivendita, installazione e manutenzione di cucine industriali** e prodotti affini per mense aziendali, ristoranti e attività di ristorazione professionale.

Il sistema permette di:
- Pianificare e gestire interventi di assistenza tecnica
- Tracciare apparecchiature installate presso i clienti
- Gestire l'inventario dei ricambi e i movimenti di magazzino
- Coordinare il team di tecnici e il personale d'ufficio
- Generare rapportini di intervento compilati sul campo

---

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| **Frontend Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Linguaggio** | TypeScript |
| **Styling** | Tailwind CSS |
| **Icone** | Lucide React |
| **Storage File** | AWS S3 |
| **Backend** | API REST esterna (Heroku) |
| **Autenticazione** | JWT Token-based |

---

## Architettura Generale

```
┌─────────────────────────────────────────────────────────────────┐
│                        SADES FRONTEND                           │
│                    (Next.js 16 + React 19)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Dashboard  │  │  Interventi │  │   Clienti   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │Apparecchiat.│  │  Inventario │  │    Team     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                     API Routes (Proxy)                          │
│                      /api/*  → Backend                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Heroku)                           │
│                   API REST + Database                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS S3                                   │
│              (Immagini, Documenti, File)                        │
└─────────────────────────────────────────────────────────────────┘
```

Il frontend agisce come **proxy** verso il backend: tutte le chiamate API passano attraverso le route `/api/*` di Next.js, che le inoltra al backend Heroku. Questo pattern risolve problemi di CORS e permette di aggiungere logica lato server se necessario.

---

## Moduli Funzionali

### 1. Dashboard (`/dashboard`)
Panoramica generale con KPI principali:
- Numero interventi in carico
- Tecnici assenti oggi
- Notifiche non lette
- Interventi per stato (con navigazione rapida)
- Liste rapide: interventi da assegnare e da confermare

### 2. Interventi (`/interventi`)
**Modulo principale** per la gestione degli interventi di assistenza.
- Vista lista con filtri avanzati
- Vista calendario (solo per amministrazione)
- Creazione nuovo intervento
- Dettaglio intervento con gestione completa
- Creazione e compilazione rapportini (report tecnico)
- Gestione articoli e apparecchiature collegate
- Generazione PDF

### 3. Clienti (`/clienti`)
Anagrafica clienti con:
- Lista clienti con ricerca
- Dettaglio cliente (sedi, contatti)
- Gestione blacklist clienti problematici

### 4. Apparecchiature (`/apparecchiature`)
Registro delle attrezzature installate:
- Lista con filtri per gruppo, marchio, famiglia
- Dettaglio apparecchiatura
- Gestione dati F-Gas (per apparecchiature con gas refrigeranti)
- Import massivo da Excel
- Documenti e immagini associati

### 5. Inventario (`/inventario`)
Gestione completa del magazzino:
- **Inventario**: lista articoli con stock
- **Magazzini**: vista per magazzino
- **Interventi**: articoli assegnati agli interventi
- **Attività**: task di verifica magazzino (eccedenze, approvazioni)
- **Movimenti**: storico trasferimenti, carichi, scarichi

### 6. Team (`/team`)
Gestione risorse umane:
- Lista utenti con filtri per ruolo
- Modifica dati utente
- Reset password
- Gestione assenze (richieste e approvazioni)

### 7. Notifiche (`/notifiche`)
Sistema di notifiche per comunicazioni interne.

---

## Sistema di Ruoli e Permessi

Il sistema implementa un **controllo accessi basato sui ruoli (RBAC)**.

### Ruoli Disponibili

| Ruolo | Descrizione | Accesso Dashboard | Può Creare Interventi |
|-------|-------------|-------------------|----------------------|
| **Amministrazione** | Accesso completo a tutte le funzionalità | ✅ | ✅ |
| **Ufficio** | Gestione operativa completa | ✅ | ✅ |
| **Ufficio Tecnico** | Coordinamento tecnico | ❌ | ✅ |
| **Tecnico** | Esecuzione interventi sul campo | ❌ | ❌ |
| **Magazziniere** | Gestione inventario e magazzino | ✅ | ❌ |

### Permessi per Sezione

| Sezione | Amministrazione | Ufficio | Ufficio Tecnico | Tecnico | Magazziniere |
|---------|-----------------|---------|-----------------|---------|--------------|
| Dashboard | ✅ | ✅ | ❌ | ❌ | ✅ |
| Interventi | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team | ✅ | ✅ | ✅ | ✅* | ✅ |
| Clienti | ✅ | ✅ | ❌ | ❌ | ✅ |
| Apparecchiature | ✅ | ✅ | ❌ | ❌ | ✅ |
| Inventario | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifiche | ✅ | ✅ | ✅ | ✅ | ✅ |

*Il tecnico nella sezione Team vede solo le proprie assenze.

### Comportamenti Specifici per Ruolo

**Tecnico:**
- All'apertura di `/interventi` vede automaticamente solo i propri interventi
- Filtri preimpostati: stato "in carico", data odierna
- Non vede la vista calendario
- Può richiedere assenze

**Amministrazione/Ufficio:**
- Vedono tutti gli interventi
- Hanno accesso alla vista calendario
- Possono filtrare per tecnico
- Possono creare/modificare interventi
- Gestiscono le assenze del team

**Magazziniere:**
- Focus sulla gestione inventario
- Accesso alle attività di magazzino
- Gestione movimenti e stock

---

## Flusso Operativo Tipico

```
1. CREAZIONE INTERVENTO
   └── Amministrazione/Ufficio crea l'intervento
       └── Stato: "Da Assegnare"

2. ASSEGNAZIONE
   └── Viene assegnato un tecnico e i pezzi necessari
       └── Stato: "In Carico" (o "Attesa Ricambio" se mancano pezzi)

3. ESECUZIONE
   └── Il tecnico esegue l'intervento sul campo
       └── Compila il rapportino (report)
       └── Stato: "Da Confermare"

4. VERIFICA
   └── L'ufficio verifica il rapportino
       └── Stato: "Completato" o "Non Completato"

5. GESTIONE MAGAZZINO
   └── Risoluzione eventuali anomalie di stock
       └── Attività in `/inventario?tab=attivita`

6. FATTURAZIONE
   └── Intervento pronto per fatturazione
       └── Stato: "Fatturato"
```

---

## Stati degli Interventi

Gli stati rappresentano il ciclo di vita di un intervento:

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| **Da Assegnare** | 🟠 Arancione | Intervento creato, in attesa di assegnazione tecnico |
| **Attesa Preventivo** | 🟡 Giallo | In attesa di preventivo per il cliente |
| **Attesa Ricambio** | 🔵 Blu | In attesa di ricambi dal magazzino |
| **In Carico** | 🩵 Teal | Assegnato al tecnico, da eseguire |
| **Da Confermare** | 🟣 Viola | Completato dal tecnico, in attesa di verifica ufficio |
| **Completato** | 🟢 Verde | Intervento concluso con successo |
| **Non Completato** | ⚪ Grigio | Intervento non riuscito (con motivazione) |
| **Annullato** | 🔴 Rosso | Intervento cancellato |
| **Fatturato** | 🌲 Smeraldo | Intervento fatturato al cliente |
| **Collocamento** | 🟪 Indaco | (Non attivamente utilizzato) |

---

## Autenticazione e Sicurezza

### Flusso di Autenticazione
1. L'utente effettua login con email e password
2. Il backend restituisce un JWT token
3. Il token viene salvato nei cookie (`auth_token`)
4. Ogni richiesta successiva include il token nell'header `Authorization`

### Middleware di Protezione
- Verifica automatica del token ad ogni navigazione
- Retry automatico in caso di errori temporanei del server
- Redirect automatico al login se il token è invalido/scaduto
- Controllo permessi basato sul ruolo per ogni route

### Pagine Pubbliche
- `/` - Homepage
- `/login` - Pagina di login
- `/change-password` - Cambio password

---

## Configurazione Ambiente

Variabili d'ambiente richieste (`.env.local`):

```env
# Backend API
NEXT_PUBLIC_BASE_URL=https://sades-xxxxx.herokuapp.com/

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-1
AWS_S3_BUCKET_NAME=
```

---

## Avvio del Progetto

```bash
# Installazione dipendenze
npm install

# Avvio in sviluppo
npm run dev

# Build produzione
npm run build

# Avvio produzione
npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`.

