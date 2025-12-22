# Sades - Documentazione Modulo Inventario

**Ultima revisione:** Dicembre 2025

---

## Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Concetti Chiave](#concetti-chiave)
4. [Strutture Dati](#strutture-dati)
5. [Le 5 Viste del Modulo](#le-5-viste-del-modulo)
6. [Operazioni di Magazzino](#operazioni-di-magazzino)
7. [Sistema di Attività](#sistema-di-attività)
8. [Sincronizzazione Gamma](#sincronizzazione-gamma)
9. [Flussi Operativi](#flussi-operativi)
10. [Gestione Permessi](#gestione-permessi)

---

## Panoramica Generale

Il modulo **Inventario** è il cuore della gestione logistica e dei ricambi in Sades. Gestisce:

- **Stock** di articoli in tempo reale
- **Movimenti** tra magazzini (trasferimenti, carichi, scarichi)
- **Allocazioni** per interventi pianificati
- **Anomalie** e riconciliazioni tra quantità pianificate e utilizzate
- **Sincronizzazione** con il gestionale esterno Gamma

### Caratteristiche Principali

- **Multi-magazzino**: gestione simultanea di più magazzini (centrali, tecnici, clienti)
- **Tracciabilità completa**: ogni movimento è tracciato con timestamp, utente, note
- **Gestione anomalie automatica**: il sistema crea attività quando le quantità non coincidono
- **Filtri avanzati**: ricerca per articolo, magazzino, stock, tipologia, posto
- **Paginazione intelligente**: caricamento incrementale per performance ottimali

---

## Architettura del Sistema

### Integrazione con Gamma

```
┌─────────────────────────────────────────────────────────────┐
│                    GAMMA (ERP Esterno)                      │
│              "Fonte della Verità" del Magazzino             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Sincronizzazione ogni ora
                      │ (Blocco: -1 min / +5 min)
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              SADES BACKEND + DATABASE                       │
│                                                             │
│  • Stock articoli per magazzino                             │
│  • Movimenti e trasferimenti                                │
│  • Allocazioni per interventi                               │
│  • Attività di riconciliazione                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ API REST
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              SADES FRONTEND (Next.js)                       │
│                                                             │
│  5 Viste:                                                   │
│  • Inventario    • Magazzini    • Interventi               │
│  • Attività      • Movimenti                                │
└─────────────────────────────────────────────────────────────┘
```

### Flusso Dati

1. **Gamma** → Backend: sincronizzazione stock reale
2. **Backend** → Frontend: API per lettura/scrittura
3. **Frontend** → Backend: operazioni utente (carico, scarico, trasferimenti)
4. **Backend** → Gamma: sincronizzazione movimenti

---

## Concetti Chiave

### Articolo

Un articolo rappresenta un **ricambio o componente** gestito nel magazzino.

**Attributi principali:**
- `id`: Codice univoco articolo
- `short_description`: Descrizione breve
- `description`: Descrizione completa
- `pnc_code`: Codice PNC (Product Number Code)
- `brand_id`, `family_id`, `subfamily_id`: Classificazione
- `inventory[]`: Array di stock per ogni magazzino

### Inventory (Stock per Magazzino)

Ogni articolo ha un array `inventory` che contiene lo stock per ogni magazzino:

```typescript
{
  warehouse_id: "MAG01",
  warehouse_description: "Magazzino Centrale",
  quantity_stock: 50,           // Stock disponibile
  quantity_reserved_client: 5,  // Allocato per interventi (in CL)
  quantity_ordered: 10,          // Ordinato da fornitore
  in_stock: 50                   // Stock effettivo (preferito se disponibile)
}
```

### Magazzino

Un magazzino è un **contenitore fisico o logico** per gli articoli.

**Tipi di magazzino:**
- **Magazzini centrali**: depositi fisici
- **Magazzini tecnici**: furgoni/van assegnati ai tecnici
- **Magazzino CL**: "Prestiti ai Clienti" - articoli preparati per interventi

**Statistiche automatiche:**
- `article_count`: Numero di tipologie articoli presenti
- `total_stock_quantity`: Totale pezzi in stock
- `total_reserved_quantity`: Totale pezzi riservati
- `total_ordered_quantity`: Totale pezzi in ordine

### Magazzino CL (Prestiti ai Clienti)

Il magazzino **CL** è speciale:
- Contiene articoli **preparati per le lavorazioni**
- Articoli pronti per **uscire ed eseguire manutenzioni**
- **Escluso** dai conteggi di stock disponibile totale
- Rappresenta materiale **già allocato** ma non ancora utilizzato

### Movimento di Inventario

Un movimento traccia **ogni spostamento** di articoli.

**Tipi di movimento:**

| Tipo | Codice | Descrizione | From Warehouse | To Warehouse |
|------|--------|-------------|----------------|--------------|
| Trasferimento | `intra` | Spostamento tra magazzini | ✓ | ✓ |
| Caricamento | `loading` | Entrata merce | null | ✓ |
| Scaricamento | `unloading` | Uscita merce | ✓ | null |

**Metadati:**
- `created_at`: Timestamp operazione
- `notes`: Note operative
- `report_id`: ID rapportino (se collegato a intervento)
- `intervention_id`: ID intervento (se collegato)

---

## Strutture Dati

### Article (TypeScript)

```typescript
interface Article {
  id: string;
  short_description: string;
  description: string;
  pnc_code: string | null;
  alternative_pnc_code: string | null;
  brand_id: number;
  family_id: string;
  subfamily_id: string | null;
  brand_label: string;
  family_label: string;
  subfamily_label: string | null;
  created_at: string;
  updated_at: string;
  
  // Array di inventory per ogni magazzino
  inventory: ArticleInventory[];
  
  // Fornitori (se disponibili)
  suppliers?: ArticleSupplier[] | null;
}

interface ArticleInventory {
  warehouse_id: string | number;
  warehouse_description: string | null;
  quantity_stock: number | null;
  quantity_reserved_client: number | null;
  quantity_ordered: number | null;
  in_stock?: number | null;  // Preferito se disponibile
  first_order_date?: string | null;
}
```

### InventoryMovement (TypeScript)

```typescript
interface InventoryMovement {
  id: string;
  article_id: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  quantity: number;
  type: 'intra' | 'loading' | 'unloading';
  notes: string | null;
  report_id?: string | null;
  intervention_id?: string | null;
  created_at: string;
  
  // Campi joined per visualizzazione
  article_description?: string;
  article_full_description?: string;
  pnc_code?: string;
  from_warehouse_description?: string;
  to_warehouse_description?: string;
  report_id_joined?: string;
  intervention_call_code?: string;
}
```

### InventoryActivity (TypeScript)

```typescript
type InventoryActivityType = 
  | 'exceeding_quantities_from_report'     // Eccesso: usati più pezzi
  | 'verify_created_report_for_approval'   // Verifica rapportino
  | 'check_inventory_after_report_approved'; // Controllo post-approvazione

type InventoryActivityStatus = 'to_do' | 'done';

interface InventoryActivity {
  id: string;  // UUID
  type: InventoryActivityType;
  status: InventoryActivityStatus;
  data?: {
    article_id?: string;
    report_quantity?: number;      // Quantità nel rapportino
    intervention_quantity?: number; // Quantità nell'intervento
    // ... altri dati contestuali
  };
  report_id?: number | null;
  assistance_intervention_id?: number | null;
  done_at?: string | null;
  done_by?: string | null;  // UUID utente
  created_at: string;
  updated_at: string;
}
```

---

## Le 5 Viste del Modulo

Il modulo inventario è organizzato in **5 tab principali**, accessibili tramite URL parameter `?tab=<nome>`:

### 1. Vista Inventario (`/inventario?tab=inventario`)

**Scopo:** Visualizzazione e ricerca articoli con stock per tutti i magazzini.

**Funzionalità:**
- Tabella articoli con colonne: Codice, Descrizione, Famiglia, Marchio, Stock Totale, N° Magazzini, Data Aggiornamento
- Filtri avanzati:
  - Ricerca testuale (codice, descrizione, PNC)
  - Stato stock (Tutti / In stock / Esauriti)
  - Tipo posto (opzionale)
  - Posto specifico (se tipo posto selezionato)
  - Magazzino specifico
- Click su riga → `DettaglioArticolo`
- Click su stock → Dialog con **divisione per magazzini**
- Paginazione: 50 articoli per pagina, caricamento incrementale

**Calcolo Stock Totale:**
```typescript
// Escludi sempre il magazzino CL dai totali
const getTotalStock = (article: ArticleListItem): number => {
  return article.inventory
    .filter(inv => inv.warehouse_id !== 'CL')
    .reduce((total, inv) => total + (inv.in_stock || inv.quantity_stock || 0), 0);
};
```

**Colori Stock:**
- 🔴 **Rosso**: Stock = 0 (esaurito)
- 🟠 **Arancione**: Stock < 10 (scorte basse)
- 🟢 **Verde**: Stock ≥ 10 (disponibile)

---

### 2. Vista Magazzini (`/inventario?tab=magazzini`)

**Scopo:** Gestione operativa dei magazzini con operazioni di carico/scarico/trasferimento.

**Layout:**
1. **Griglia Magazzini** (in alto): cards selezionabili con statistiche
2. **Dettaglio Magazzino** (in basso): articoli del magazzino selezionato

#### Griglia Magazzini

**Card Magazzino:**
```
┌─────────────────────────────────────┐
│ 📦 Magazzino Centrale               │
│                                     │
│ Tipologie:     245                  │
│ Stock:         12,450 pz            │
└─────────────────────────────────────┘
```

**Filtri:**
- Ricerca per nome magazzino
- Toggle "Mostra/Nascondi magazzini EX" (magazzini obsoleti con `**EX**` nel nome)

#### Dettaglio Magazzino Selezionato

**Operazioni disponibili:**
- 📥 **Carica Articoli**: trasferimento DA altri magazzini → magazzino corrente
- 📤 **Invia Articoli**: trasferimento DA magazzino corrente → altri magazzini

**Tabella Articoli:**
- Colonne: Codice, Descrizione, Famiglia, Marchio, Stock (nel magazzino corrente), Riservati, Data Aggiornamento
- Selezione multipla con checkbox
- Filtri: ricerca, stock, tipo posto, posto
- Paginazione: 50 articoli per pagina

**Azioni Bulk:**
- Seleziona tutti gli articoli visibili
- Invia articoli selezionati (apre dialog)

---

#### Dialog "Carica Articoli"

**Scopo:** Trasferire articoli DA uno o più magazzini sorgente → magazzino corrente.

**Step:**

1. **Selezione Magazzini Sorgente**
   - Checkbox multipli per scegliere magazzini
   - Bottone "Seleziona Tutti" / "Deseleziona Tutti"
   - Escluso automaticamente il magazzino di destinazione

2. **Ricerca e Selezione Articoli**
   - Input di ricerca con debounce (300ms)
   - Tabella articoli raggruppati per magazzino sorgente
   - Paginazione globale: 50 articoli per volta
   - Bottone "Carica altri 50" se ci sono più risultati
   - Per ogni articolo: Aggiungi → lista trasferimenti

3. **Lista Trasferimenti**
   - Articoli aggiunti con:
     - Codice e descrizione
     - Magazzino sorgente
     - Quantità disponibile
     - Input quantità da trasferire (min: 1, max: disponibile)
   - Validazione real-time: quantità ≤ disponibile
   - Rimozione singola con bottone X

4. **Note e Conferma**
   - Campo note opzionale
   - Riepilogo: N articoli, totale pezzi
   - Bottone "Conferma Carico"

**API Chiamata:**
```typescript
POST /api/inventory/bulk-transfer
{
  transfers: [
    {
      article_id: "ART001",
      from_warehouse_id: "MAG01",
      to_warehouse_id: "MAG02",  // Magazzino corrente
      quantity: 5,
      notes: "Carico: note utente"
    }
  ],
  global_notes: "{date: 22/12/2025 14:30; id_user: uuid; user_name: Mario Rossi}"
}
```

**Risultato:**
- Toast di successo/errore
- Conteggio trasferimenti riusciti/falliti
- Ricaricamento automatico articoli magazzino

---

#### Dialog "Invia Articoli"

**Scopo:** Trasferire articoli selezionati DA magazzino corrente → altro magazzino.

**Step:**

1. **Pre-selezione**: articoli già selezionati dalla tabella

2. **Selezione Magazzino Destinazione**
   - Dropdown con tutti i magazzini (escluso quello corrente)

3. **Configurazione Quantità**
   - Per ogni articolo:
     - Stock disponibile nel magazzino corrente
     - Input quantità da inviare (min: 1, max: disponibile)
   - Validazione automatica

4. **Note e Conferma**
   - Campo note opzionale
   - Riepilogo
   - Bottone "Conferma Invio"

**API Chiamata:** Identica a bulk-transfer, ma con direzione opposta (from = corrente, to = destinazione).

---

### 3. Vista Interventi (`/inventario?tab=interventi`)

**Scopo:** Monitorare articoli allocati per interventi pianificati.

**Funzionalità:**
- Lista interventi con articoli assegnati
- Filtri: data, stato, tecnico, cliente
- Click su intervento → Apre dettaglio intervento (nuova tab)
- Mostra per ogni intervento:
  - Data e ora
  - Cliente
  - Tecnico assegnato
  - Stato
  - N° articoli assegnati
  - Quantità totale

**Utilità:**
- Verificare disponibilità prima di confermare intervento
- Identificare interventi con articoli mancanti
- Tracciare allocazioni temporanee

---

### 4. Vista Attività (`/inventario?tab=attivita`)

**Scopo:** Gestire anomalie di inventario e riconciliazioni.

**Scenario Tipico:**
1. Tecnico compila rapportino dopo intervento
2. Quantità utilizzate ≠ quantità pianificate nell'intervento
3. Sistema crea automaticamente **InventoryActivity**
4. Ufficio/Magazziniere deve risolvere l'anomalia

#### Tipi di Attività

**1. Quantità PARI** (`report_quantity === intervention_quantity`)
- ✅ **Tutto OK**: quantità coincidono
- **Azione:** Click "Completa" → attività chiusa automaticamente
- **Nessun movimento necessario**

**2. Quantità ECCESSO** (`report_quantity > intervention_quantity`)
- ↑ **Usati più pezzi** di quanto pianificato
- **Problema:** Manca tracciatura di dove sono stati prelevati i pezzi extra
- **Azione richiesta:** Specificare da quali magazzini sono stati prelevati i pezzi in eccesso

**3. Quantità USO PARZIALE** (`report_quantity < intervention_quantity`)
- ↓ **Usati meno pezzi** di quanto pianificato
- **Problema:** Pezzi allocati ma non utilizzati devono tornare in magazzino
- **Azione richiesta:** Specificare in quali magazzini rimettere i pezzi non utilizzati

---

#### Interfaccia Vista Attività

**Struttura:**
- Attività raggruppate per **Intervento**
- Ogni gruppo mostra:
  - Nome cliente
  - Data intervento
  - Data completamento rapportino
  - ID rapportino
  - N° anomalie pending
  - Badge stato (Verde: tutte complete / Arancione: alcune pending / Rosso: tutte pending)

**Click su gruppo** → **Dialog Attività Intervento**

---

#### Dialog Gestione Attività

**Header:**
- Nome cliente
- Link a intervento
- Link a rapportino
- Date rilevanti
- Note interne intervento

**Body:** Lista attività del gruppo

**Card Attività:**

```
┌────────────────────────────────────────────────────────┐
│ [Badge: Da completare]  ↑ Eccesso Utilizzato          │
│                                                        │
│ ┌──────────────┬──────────────┐                       │
│ │ 📄 Utilizzata│ 📦 Pianificata│                      │
│ │      8       │      5        │                      │
│ │ nel rapportino│ nell'intervento│                    │
│ └──────────────┴──────────────┘                       │
│                                                        │
│ Articolo: Filtro aria HEPA                            │
│ PNC: 123456 • ID: ART001                              │
│                                                        │
│ [Se in edit mode: Form allocazione magazzini]         │
│                                                        │
│ ID: activity-uuid • Report: 789 • Creata: 20/12/2025 │
└────────────────────────────────────────────────────────┘
                                        [Bottone Gestisci]
```

---

#### Gestione ECCESSO

**Obiettivo:** Tracciare da dove sono stati prelevati i pezzi extra.

**UI:**
1. Click "Gestisci" → Form allocazione
2. Mostra: "Preleva X pezzi da magazzini"
3. Bottone "+ Aggiungi Magazzino"
4. Per ogni allocazione:
   - Dropdown magazzino (solo quelli con stock > 0 per l'articolo)
   - Input quantità (max: stock magazzino)
   - Bottone rimuovi (X)
5. Indicatore progresso: "Allocati: Y/X"
6. Validazione: totale allocato === quantità richiesta
7. Click "Completa" → Esegue movimenti di prelievo

**API Chiamata:**
```typescript
POST /api/inventory/complete-activity
{
  activity_id: "act-uuid",
  warehouse_transfers: [  // Per ECCESSO
    { warehouse_id: "MAG01", quantity: 2 },
    { warehouse_id: "MAG02", quantity: 1 }
  ]
}
```

**Risultato Backend:**
- Crea movimenti di tipo `unloading` per ogni magazzino
- Aggiorna stock dei magazzini
- Marca attività come `done`

---

#### Gestione USO PARZIALE

**Obiettivo:** Rimettere in magazzino i pezzi non utilizzati.

**UI:**
1. Click "Gestisci" → Form allocazione
2. Mostra: "Assegna X pezzi a magazzini"
3. Bottone "+ Aggiungi Magazzino"
4. Per ogni allocazione:
   - Dropdown magazzino (tutti tranne CL)
   - Input quantità
   - Bottone rimuovi (X)
5. Indicatore progresso: "Allocati: Y/X"
6. Validazione: totale allocato === quantità richiesta
7. Click "Completa" → Esegue movimenti di carico

**API Chiamata:**
```typescript
POST /api/inventory/complete-activity
{
  activity_id: "act-uuid",
  distribution_warehouses: [  // Per USO_PARZIALE
    { warehouse_id: "MAG01", quantity: 2 },
    { warehouse_id: "MAG02", quantity: 1 }
  ]
}
```

**Risultato Backend:**
- Crea movimenti di tipo `loading` per ogni magazzino
- Aggiorna stock dei magazzini
- Marca attività come `done`

---

#### Gestione PARI

**Obiettivo:** Confermare che tutto è allineato.

**UI:**
- Mostra quantità identiche
- Badge "✓ Quantità Allineate"
- Bottone "Completa" diretto (no form)

**API Chiamata:**
```typescript
POST /api/inventory/complete-activity
{
  activity_id: "act-uuid"
  // Nessun campo aggiuntivo
}
```

**Risultato Backend:**
- Marca attività come `done`
- Nessun movimento necessario

---

### 5. Vista Movimenti (`/inventario?tab=movimenti`)

**Scopo:** Storico completo di tutti i movimenti di inventario.

**Funzionalità:**

**Filtri:**
- Ricerca testuale (articoli, codici, note)
- Tipo movimento (Tutti / Trasferimenti / Caricamenti / Scaricamenti)
- Data da / Data a
- Magazzino (opzionale)
- Articolo specifico (opzionale)

**Tabella Movimenti:**

| Data/Ora | Tipo | Articolo | Sorgente | Destinazione | Quantità | Note |
|----------|------|----------|----------|--------------|----------|------|
| 22/12/2025 14:30 | Trasferimento | Filtro aria | Mag. Centrale | Furgone Mario | 5 | Preparazione intervento |
| 22/12/2025 10:15 | Caricamento | Valvola gas | - | Mag. Centrale | 10 | Arrivo fornitore |
| 21/12/2025 16:45 | Scaricamento | Guarnizione | Furgone Luigi | - | 2 | Usato in intervento |

**Badge Colori:**
- 🔵 **Blu**: Trasferimento (intra)
- 🟠 **Arancione**: Caricamento (loading)
- 🟢 **Verde**: Scaricamento (unloading)

**Click su movimento** → **Dialog Dettaglio Movimento**

---

#### Dialog Dettaglio Movimento

**Sezioni:**

1. **Informazioni Generali**
   - ID movimento
   - Tipo (badge colorato)
   - Data/Ora creazione
   - Quantità

2. **Articolo**
   - ID articolo
   - Codice PNC
   - Descrizione breve
   - Descrizione completa

3. **Magazzini**
   - Magazzino sorgente (ID + descrizione)
   - Magazzino destinazione (ID + descrizione)

4. **Note**
   - Note operative complete

5. **Informazioni Aggiuntive** (se presenti)
   - ID report collegato
   - Codice intervento collegato

**Paginazione:**
- 20 movimenti per pagina
- Navigazione standard (Precedente / 1 2 3 4 5 / Successivo)

---

## Operazioni di Magazzino

### Caricamento (Loading)

**Scenario:** Arrivo merce da fornitore o rientro articoli.

**Flusso:**
1. Utente va in Vista Magazzini
2. Seleziona magazzino destinazione
3. Click "Carica Articoli"
4. Seleziona magazzini sorgente o compila manualmente
5. Aggiunge articoli alla lista
6. Imposta quantità per ogni articolo
7. Aggiunge note (opzionale)
8. Conferma

**Backend:**
```typescript
POST /api/inventory/bulk-loading
{
  loadings: [
    {
      article_id: "ART001",
      to_warehouse_id: "MAG01",
      quantity: 10,
      notes: "Arrivo merce fornitore XYZ"
    }
  ],
  global_notes: "{date: 22/12/2025 14:30; id_user: uuid; user_name: Mario Rossi}"
}
```

**Effetti:**
- Crea movimento tipo `loading`
- Incrementa `quantity_stock` nel magazzino destinazione
- Traccia chi ha fatto l'operazione e quando

---

### Scaricamento (Unloading)

**Scenario:** Uscita merce verso esterno (non tracciato in altri magazzini).

**Flusso:**
1. Utente va in Vista Magazzini
2. Seleziona magazzino sorgente
3. Seleziona articoli con checkbox
4. Click "Scarica" (funzionalità custom se implementata)
5. Conferma quantità
6. Aggiunge note
7. Conferma

**Backend:**
```typescript
POST /api/inventory/bulk-unloading
{
  unloadings: [
    {
      article_id: "ART001",
      from_warehouse_id: "MAG01",
      quantity: 5,
      notes: "Usato per test in laboratorio"
    }
  ],
  global_notes: "{date: 22/12/2025 14:30; id_user: uuid; user_name: Mario Rossi}"
}
```

**Effetti:**
- Crea movimento tipo `unloading`
- Decrementa `quantity_stock` nel magazzino sorgente
- Traccia operazione

---

### Trasferimento (Intra)

**Scenario:** Spostamento articoli tra due magazzini tracciati.

**Flusso:**
1. Utente va in Vista Magazzini
2. Seleziona magazzino sorgente
3. Usa "Invia Articoli" OPPURE "Carica Articoli" (direzione opposta)
4. Seleziona magazzino destinazione
5. Seleziona articoli e quantità
6. Conferma

**Backend:**
```typescript
POST /api/inventory/bulk-transfer
{
  transfers: [
    {
      article_id: "ART001",
      from_warehouse_id: "MAG01",
      to_warehouse_id: "MAG02",
      quantity: 5,
      notes: "Trasferimento per intervento"
    }
  ],
  global_notes: "{date: 22/12/2025 14:30; id_user: uuid; user_name: Mario Rossi}"
}
```

**Effetti:**
- Crea movimento tipo `intra`
- Decrementa `quantity_stock` nel magazzino sorgente
- Incrementa `quantity_stock` nel magazzino destinazione
- Operazione atomica: fallisce se stock insufficiente

---

## Sincronizzazione Gamma

### Cos'è Gamma?

**Gamma** è il gestionale esterno (ERP) che rappresenta la **"fonte della verità"** per il magazzino Sades. Tutti i dati di stock provengono da Gamma.

### Finestra di Sincronizzazione

**Quando:** Ogni ora, tra il minuto **-1** e il minuto **+5**

**Esempio:**
- 14:59 → Inizia blocco
- 15:00 → Sincronizzazione in corso
- 15:05 → Fine blocco
- 15:06 → Operazioni ripristinate

**Durante la sincronizzazione:**
- ⛔ **Blocco totale** operazioni di carico/scarico
- 🔒 **Pagina bloccata** con overlay
- ⏳ **Messaggio:** "Sincronizzazione in corso - Operazioni bloccate tra -1 e +5 minuti di ogni ora"

### Implementazione Frontend

```typescript
// Check continuo ogni 5 secondi
useEffect(() => {
  const updateLock = () => {
    const now = new Date();
    const minute = now.getMinutes();
    setIsGammaSyncLock(minute >= 59 || minute <= 5);
  };
  
  updateLock();
  const id = setInterval(updateLock, 5000);
  return () => clearInterval(id);
}, []);

// Blocco operazioni
if (isGammaSyncLock) {
  showNotification('warning', 'Sincronizzazione in corso', 
    'Operazioni bloccate tra -1 e +5 minuti di ogni ora.');
  return;
}
```

### Overlay Visivo

Durante la sincronizzazione, appare un **overlay full-screen**:

```
┌──────────────────────────────────────────────┐
│                                              │
│         🔄 Sincronizzazione in corso         │
│                                              │
│     Pagina bloccata tra -1 e +5 minuti      │
│              di ogni ora.                    │
│                                              │
│   Attendi qualche minuto e riprova.         │
│                                              │
└──────────────────────────────────────────────┘
```

**Caratteristiche:**
- Backdrop blur
- Opacity 40%
- Non cliccabile
- Z-index massimo
- Scompare automaticamente al termine

---

## Flussi Operativi

### Flusso 1: Preparazione Intervento

**Attori:** Ufficio, Magazziniere

**Step:**

1. **Pianificazione** (in `/interventi`)
   - Ufficio crea nuovo intervento
   - Seleziona cliente, apparecchiature
   - Aggiunge articoli necessari con quantità
   - Sistema alloca articoli (inventory → `quantity_reserved_client`)

2. **Preparazione Fisica** (in `/inventario?tab=magazzini`)
   - Magazziniere seleziona magazzino centrale
   - Identifica articoli per intervento X
   - Trasferisce articoli a magazzino CL (Prestiti Clienti)
   - O trasferisce direttamente a furgone tecnico

3. **Conferma Allocazione**
   - Articoli ora in CL o nel furgone del tecnico
   - Pronti per essere prelevati

---

### Flusso 2: Esecuzione Intervento e Riconciliazione

**Attori:** Tecnico, Ufficio, Magazziniere

**Step:**

1. **Esecuzione** (sul campo)
   - Tecnico esegue intervento
   - Usa articoli dal proprio furgone

2. **Compilazione Rapportino** (in `/interventi/rapportino/[id]`)
   - Tecnico compila rapportino
   - Indica quantità effettivamente utilizzate
   - Firma cliente
   - Salva rapportino

3. **Creazione Automatica Attività**
   - Sistema confronta:
     - `intervention_quantity`: articoli pianificati
     - `report_quantity`: articoli usati nel rapportino
   - Se differenza → Crea `InventoryActivity`

4. **Risoluzione Anomalia** (in `/inventario?tab=attivita`)
   - Ufficio/Magazziniere vede attività pending
   - Apre dialog gestione
   - Vede dettaglio: Cliente, Data, Quantità pianificate vs utilizzate
   
5. **Azione in base al Caso:**

   **Caso PARI:**
   - Click "Completa"
   - Fine

   **Caso ECCESSO:**
   - Click "Gestisci"
   - Specifica da quali magazzini prelevare i pezzi extra
   - Es: 2 da Mag. Centrale, 1 da Furgone Luigi
   - Click "Completa"
   - Sistema crea movimenti `unloading`

   **Caso USO PARZIALE:**
   - Click "Gestisci"
   - Specifica in quali magazzini rimettere pezzi non usati
   - Es: 3 in Mag. Centrale
   - Click "Completa"
   - Sistema crea movimenti `loading`

6. **Verifica Finale**
   - Attività marcata `done`
   - Stock aggiornato
   - Storico movimenti completo

---

### Flusso 3: Rifornimento Magazzino

**Attori:** Magazziniere

**Step:**

1. **Arrivo Merce** (in `/inventario?tab=magazzini`)
   - Magazziniere riceve pacco da fornitore
   - Seleziona "Magazzino Centrale"
   - Click "Carica Articoli"

2. **Inserimento Manuale**
   - Non seleziona magazzini sorgente
   - Cerca articoli nella lista generale
   - Per ogni articolo: aggiunge, imposta quantità
   - Aggiunge note: "Arrivo fornitore XYZ - DDT 12345"

3. **Conferma Carico**
   - Click "Conferma Carico"
   - Sistema crea movimenti `loading`
   - Stock aggiornato

4. **Verifica** (in `/inventario?tab=movimenti`)
   - Controlla movimenti recenti
   - Verifica quantità corrette

---

### Flusso 4: Trasferimento tra Magazzini

**Attori:** Magazziniere, Tecnico

**Scenario:** Tecnico ha bisogno di articoli per interventi programmati.

**Step:**

1. **Richiesta Tecnico**
   - Tecnico comunica necessità (es. via telefono, chat)

2. **Preparazione** (in `/inventario?tab=magazzini`)
   - Magazziniere seleziona "Magazzino Centrale"
   - Seleziona articoli con checkbox
   - Click "Invia Articoli"

3. **Configurazione Invio**
   - Seleziona magazzino destinazione: "Furgone Mario"
   - Imposta quantità per ogni articolo
   - Aggiunge note: "Rifornimento settimanale Mario - Settimana 51"

4. **Conferma**
   - Click "Conferma Invio"
   - Sistema crea movimenti `intra`
   - Stock aggiornato in entrambi i magazzini

5. **Notifica Tecnico**
   - (Opzionale) Sistema invia notifica a tecnico

---

## Gestione Permessi

### Permessi per Ruolo

| Azione | Amministrazione | Ufficio | Ufficio Tecnico | Tecnico | Magazziniere |
|--------|-----------------|---------|-----------------|---------|--------------|
| Vista Inventario | ✅ Tutti i magazzini | ✅ Tutti | ✅ Tutti | ✅ Solo assegnati | ✅ Tutti |
| Carica Articoli | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invia Articoli | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vista Attività | ✅ | ✅ | ✅ | ❌ | ✅ |
| Completa Attività | ✅ | ✅ | ✅ | ❌ | ✅ |
| Vista Movimenti | ✅ | ✅ | ✅ | ✅ | ✅ |

### Magazzini Assegnati (Tecnici)

I tecnici vedono **solo i magazzini loro assegnati** (tipicamente il proprio furgone).

**Implementazione:**
```typescript
// Endpoint diverso per tecnici
const warehousesEndpoint = 
  (auth.user?.role === 'tecnico' || auth.user?.role === 'ufficio_tecnico') 
    ? '/api/assigned-warehouses'  // Solo magazzini assegnati
    : '/api/warehouses';           // Tutti i magazzini
```

**Filtri automatici:**
- Vista Inventario: filtra articoli solo dai magazzini assegnati
- Vista Magazzini: mostra solo i magazzini assegnati
- Operazioni: possono trasferire solo tra i loro magazzini

---

## Best Practices e Convenzioni

### Nomenclatura Magazzini

**Convenzioni:**
- Magazzini centrali: "Magazzino [Città]", es. "Magazzino Milano"
- Magazzini tecnici: "Furgone [Nome]" o "Van [Nome]"
- Magazzini obsoleti: "**EX** [Nome]" → nascosti di default

### Note Operative

**Formato raccomandato per `global_notes`:**
```json
{
  "date": "22/12/2025 14:30",
  "id_user": "user-uuid",
  "user_name": "Mario Rossi"
}
```

**Formato raccomandato per `notes` (singolo movimento):**
- **Carico:** "Carico: [dettaglio]"
- **Invio:** "Invio: [dettaglio]"
- **Trasferimento:** "Trasferimento per intervento [ID]"
- **Riconciliazione:** "Risoluzione anomalia rapportino [ID]"

### Gestione Errori

**Operazioni Bulk:**
- Se alcuni trasferimenti falliscono → Toast warning con conteggio
- Se tutti falliscono → Toast error
- Se tutti riescono → Toast success

**Esempio risultato:**
```json
{
  "data": {
    "total_transfers": 10,
    "successful_transfers": 8,
    "failed_transfers": 2,
    "movements": [...],  // Movimenti creati
    "errors": [...]      // Dettagli errori
  }
}
```

---

## Componenti Tecnici

### Componenti Principali

| Componente | Path | Scopo |
|------------|------|-------|
| `InventarioPage` | `/src/app/inventario/page.tsx` | Container principale con 5 tab |
| `MagazziniView` | `/src/app/inventario/MagazziniView.tsx` | Vista magazzini con operazioni |
| `ActivitiesView` | `/src/app/inventario/ActivitiesView.tsx` | Gestione attività anomalie |
| `MovimentiView` | `/src/app/inventario/MovimentiView.tsx` | Storico movimenti |
| `InterventionsView` | `/src/app/inventario/InterventionsView.tsx` | Vista articoli per interventi |
| `DettaglioArticolo` | `/src/app/inventario/DettaglioArticolo.tsx` | Dettaglio singolo articolo |
| `DettaglioMagazzino` | `/src/components/DettaglioMagazzino.tsx` | Dettaglio magazzino selezionato |
| `CaricaArticoliDialog` | `/src/components/CaricaArticoliDialog.tsx` | Dialog carico articoli |
| `InviaArticoliDialog` | `/src/components/InviaArticoliDialog.tsx` | Dialog invio articoli |
| `NotificationDialog` | `/src/components/NotificationDialog.tsx` | Notifiche toast |

### API Routes (Proxy)

| Route | Method | Scopo |
|-------|--------|-------|
| `/api/articles` | GET | Lista articoli con filtri |
| `/api/articles/:id` | GET | Dettaglio articolo |
| `/api/warehouses` | GET | Lista tutti i magazzini |
| `/api/assigned-warehouses` | GET | Magazzini assegnati utente |
| `/api/inventory/movements` | GET | Lista movimenti con filtri |
| `/api/inventory/movements/:id` | GET | Dettaglio movimento |
| `/api/inventory/bulk-transfer` | POST | Trasferimenti bulk |
| `/api/inventory/bulk-loading` | POST | Caricamenti bulk |
| `/api/inventory/bulk-unloading` | POST | Scaricamenti bulk |
| `/api/inventory/activities` | GET | Lista attività |
| `/api/inventory/activities/:id` | PUT | Aggiorna attività |
| `/api/inventory/complete-activity` | POST | Completa attività con movimenti |

### TypeScript Types

**File principali:**
- `/src/types/article.ts`: Articoli e inventory
- `/src/types/inventory.ts`: Movimenti e attività
- `/src/types/assistance-interventions.ts`: Integrazione con interventi

---

## Performance e Ottimizzazioni

### Paginazione Incrementale

**Articoli e Movimenti:**
- Caricamento iniziale: 50 elementi
- Bottone "Carica altri 50"
- Append ai risultati esistenti (no replace)
- Stato separato `loadingMoreArticles` vs `loading`

**Vantaggi:**
- UI responsive anche con migliaia di articoli
- Riduzione chiamate API
- UX fluida

### Debounce Ricerca

**Implementazione:**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    fetchArticles(searchTerm);
  }, 300);  // 300ms debounce
  
  return () => clearTimeout(timeoutId);
}, [searchTerm]);
```

**Applica a:**
- Ricerca articoli (Vista Inventario)
- Ricerca magazzini (Vista Magazzini)
- Ricerca transfer source articles (Dialog Carica)
- Ricerca movimenti (Vista Movimenti)

### Cache Articoli

**ActivitiesView:**
```typescript
const [articlesCache, setArticlesCache] = useState<Map<string, Article>>(new Map());
const [loadingArticles, setLoadingArticles] = useState<Set<string>>(new Set());
```

**Strategia:**
- Fetch articolo solo se non in cache
- Evita fetch duplicati con Set `loadingArticles`
- Mantiene cache per tutta la sessione dialog

---

## Troubleshooting Comune

### Problema: "Operazioni bloccate"

**Causa:** Finestra sincronizzazione Gamma

**Soluzione:** Attendere 5-6 minuti (fino a minuto 6)

---

### Problema: "Stock non aggiornato"

**Causa:** Sincronizzazione Gamma non ancora avvenuta

**Soluzione:**
1. Verificare orario ultima sincronizzazione
2. Attendere prossima finestra sync
3. Verificare che operazione sia stata registrata in Movimenti

---

### Problema: "Trasferimento fallito - Stock insufficiente"

**Causa:** Quantità richiesta > stock disponibile

**Soluzione:**
1. Verificare stock reale nel magazzino sorgente
2. Ridurre quantità trasferita
3. Verificare che stock non sia riservato (`quantity_reserved_client`)

---

### Problema: "Attività non compare in lista"

**Causa:** Attività già completata o filtro status

**Soluzione:**
1. Verificare che attività sia in stato `to_do`
2. Controllare in Vista Movimenti se è stata già processata
3. Verificare che ci sia almeno 1 attività pending per l'intervento

---

### Problema: "Magazzino EX non visibile"

**Causa:** Filtro nasconde magazzini obsoleti di default

**Soluzione:**
1. Vista Magazzini
2. Click "Mostra magazzini EX (N)"
3. Magazzini con `**EX**` nel nome ora visibili

---

## Conclusioni

Il modulo Inventario è una componente **mission-critical** per Sades:

✅ **Tracciabilità completa** di ogni movimento articolo
✅ **Sincronizzazione automatica** con Gamma (ERP)
✅ **Gestione anomalie** con workflow guidato
✅ **Multi-magazzino** con permessi granulari
✅ **Performance ottimizzate** per grandi volumi
✅ **UX intuitiva** per operazioni quotidiane

**Documentazione correlata:**
- [1-OVERVIEW.md](./1-OVERVIEW.md) - Panoramica sistema
- [2-API.md](./2-API.md) - Dettagli API
- [3-FRONTEND.md](./3-FRONTEND.md) - Architettura frontend

---

**Ultimo aggiornamento:** Dicembre 2025
