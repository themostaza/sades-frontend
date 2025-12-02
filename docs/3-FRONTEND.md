# Sades - Documentazione Frontend

## Struttura del Progetto

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (proxy verso backend)
│   ├── apparecchiature/          # Modulo apparecchiature
│   ├── change-password/          # Pagina cambio password
│   ├── clienti/                  # Modulo clienti
│   ├── dashboard/                # Dashboard principale
│   ├── interventi/               # Modulo interventi (principale)
│   │   ├── components/           # Componenti specifici interventi
│   │   ├── hooks/                # Hook specifici interventi
│   │   └── rapportino/           # Compilazione rapportini
│   ├── inventario/               # Modulo inventario
│   ├── login/                    # Pagina login
│   ├── notifiche/                # Modulo notifiche
│   └── team/                     # Modulo gestione team
├── components/                   # Componenti condivisi
├── config/                       # Configurazione
├── contexts/                     # React Context (Auth)
├── hooks/                        # Hook condivisi
├── types/                        # TypeScript types/interfaces
└── utils/                        # Utility functions
```

---

## Pagine e Routing

### Layout Principale (`src/app/layout.tsx`)
Il layout radice wrappa l'intera applicazione con:
- `AuthProvider` - Contesto di autenticazione
- `AppLayout` - Layout con sidebar (se autenticato)

### Pagine Pubbliche
| Path | Componente | Descrizione |
|------|------------|-------------|
| `/` | `page.tsx` | Homepage/redirect |
| `/login` | `login/page.tsx` | Form di login |
| `/change-password` | `change-password/page.tsx` | Cambio password |

### Pagine Protette
| Path | Componente | Descrizione |
|------|------------|-------------|
| `/dashboard` | `dashboard/page.tsx` | Dashboard con KPI |
| `/interventi` | `interventi/page.tsx` | Lista interventi |
| `/interventi?ai={id}` | Deep link dettaglio | Apre dettaglio intervento |
| `/clienti` | `clienti/page.tsx` | Lista clienti |
| `/apparecchiature` | `apparecchiature/page.tsx` | Lista apparecchiature |
| `/apparecchiature?id={id}` | Deep link dettaglio | Apre dettaglio apparecchiatura |
| `/inventario` | `inventario/page.tsx` | Gestione inventario |
| `/inventario?tab={tab}` | Tab specifica | Naviga a tab specifica |
| `/team` | `team/page.tsx` | Gestione utenti |
| `/notifiche` | `notifiche/page.tsx` | Centro notifiche |

---

## Componenti Principali

### Layout e Navigazione

#### `AppLayout` (`src/components/AppLayout.tsx`)
Layout principale con sidebar laterale.

**Props:** `children: ReactNode`

**Caratteristiche:**
- Sidebar fissa a sinistra
- Area contenuto principale a destra
- Responsive (sidebar collassabile su mobile)

---

#### `Sidebar` (`src/components/Sidebar.tsx`)
Barra di navigazione laterale.

**Comportamento:**
- Carica dinamicamente i menu in base al ruolo utente
- Evidenzia la pagina corrente
- Mostra tooltip al hover
- Dialog di conferma logout

**Menu Items:**
```typescript
const allMenuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', route: '/dashboard' },
  { id: 'interventi', icon: CheckSquare, label: 'Interventi', route: '/interventi' },
  { id: 'team', icon: Users, label: 'Team', route: '/team' },
  { id: 'clienti', icon: BriefcaseBusiness, label: 'Clienti', route: '/clienti' },
  { id: 'apparecchiature', icon: Wrench, label: 'Apparecchiature', route: '/apparecchiature' },
  { id: 'inventario', icon: Archive, label: 'Inventario', route: '/inventario' },
  { id: 'notifiche', icon: Bell, label: 'Notifiche', route: '/notifiche' },
];
```

---

### Modulo Interventi

#### `InterventiPage` (`src/app/interventi/page.tsx`)
Pagina principale gestione interventi.

**Stati Principali:**
```typescript
const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
const [interventionsData, setInterventionsData] = useState<AssistanceIntervention[]>([]);
const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(null);
const [selectedInterventions, setSelectedInterventions] = useState<number[]>([]);
```

**Features:**
- Toggle vista Lista/Calendario (solo admin)
- Filtri avanzati (data, zona, stato, tecnico)
- Selezione multipla per azioni bulk
- Deep linking con parametro `?ai={id}`

---

#### `MainPageTable` (`src/app/interventi/components/MainPageTable.tsx`)
Tabella principale lista interventi.

**Props:**
```typescript
interface Props {
  interventionsData: AssistanceIntervention[];
  loading: boolean;
  isAdmin: boolean;
  selectedInterventions: number[];
  handleRowClick: (id: number) => void;
  handleSelectIntervention: (id: number, selected: boolean) => void;
  handleBulkCancel: () => void;
  handleBulkDuplicate: (cancel: boolean, date?: string) => void;
  // ... altri handler
}
```

---

#### `CalendarioView` (`src/app/interventi/CalendarioView.tsx`)
Vista calendario interventi (solo amministrazione).

**Features:**
- Griglia settimanale/mensile
- Drag & drop per riassegnazione
- Note calendario per data
- Filtri per tecnico/zona

---

#### `DettaglioIntervento` (`src/app/interventi/DettaglioIntervento.tsx`)
Dialog/modale dettaglio intervento.

**Props:**
```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  interventionId: number;
  onInterventionUpdated: () => void;
}
```

**Sezioni:**
- Dati cliente e location
- Informazioni intervento
- Apparecchiature collegate
- Articoli/ricambi assegnati
- Storico rapportini
- Azioni (modifica, duplica, annulla)

---

#### `NuovoIntervento` (`src/app/interventi/NuovoIntervento.tsx`)
Form creazione nuovo intervento.

**Flusso:**
1. Selezione cliente
2. Selezione sede cliente
3. Compilazione dati intervento
4. Selezione apparecchiature
5. Selezione articoli
6. Conferma

---

#### `CreaRapportino` (`src/app/interventi/CreaRapportino.tsx`)
Form creazione/modifica rapportino.

**Caratteristiche:**
- Multi-step wizard
- Upload immagini via S3
- Gestione dati F-Gas
- Firma cliente (canvas)
- Salvataggio bozza

---

#### `RichiediAssenza` (`src/app/interventi/RichiediAssenza.tsx`)
Form richiesta assenza (per tecnici).

---

### Modulo Clienti

#### `ClientiPage` (`src/app/clienti/page.tsx`)
Lista clienti con sezione blacklist espandibile.

---

#### `DettaglioCliente` (`src/app/clienti/DettaglioCliente.tsx`)
Dettaglio cliente con:
- Dati anagrafici
- Lista sedi
- Storico interventi
- Toggle blacklist

---

### Modulo Apparecchiature

#### `ApparecchiaturePage` (`src/app/apparecchiature/page.tsx`)
Lista apparecchiature con filtri multipli.

**Filtri Disponibili:**
- Ricerca testuale
- Gruppo apparecchiatura
- Marchio
- Famiglia
- Sottofamiglia

---

#### `DettaglioApparecchiatura` (`src/app/apparecchiature/DettaglioApparecchiatura.tsx`)
Dettaglio completo apparecchiatura.

**Tab:**
- Dati generali
- Dati F-Gas (se applicabile)
- Documenti
- Immagini
- Apparecchiature collegate

---

#### `ImportEquipmentModal` (`src/app/apparecchiature/ImportEquipmentModal.tsx`)
Modale import da Excel.

---

### Modulo Inventario

#### `InventarioPage` (`src/app/inventario/page.tsx`)
Pagina con 5 tab:

```typescript
type ViewMode = 'inventario' | 'magazzini' | 'interventi' | 'attivita' | 'movimenti';
```

---

#### `MagazziniView` (`src/app/inventario/MagazziniView.tsx`)
Vista per singolo magazzino con stock articoli.

---

#### `MovimentiView` (`src/app/inventario/MovimentiView.tsx`)
Storico movimenti (trasferimenti, carichi, scarichi).

---

#### `ActivitiesView` (`src/app/inventario/ActivitiesView.tsx`)
Gestione attività di magazzino (anomalie da risolvere).

---

#### `DettaglioArticolo` (`src/app/inventario/DettaglioArticolo.tsx`)
Dettaglio singolo articolo.

---

### Modulo Team

#### `TeamPage` (`src/app/team/page.tsx`)
Gestione utenti con:
- Lista utenti (per admin)
- Vista solo assenze proprie (per tecnici)

---

#### `UserForm` (`src/app/team/UserForm.tsx`)
Form modifica utente.

---

#### `AbsencesTable` (`src/app/team/AbsencesTable.tsx`)
Tabella assenze con gestione approvazioni.

---

### Componenti Condivisi

#### `DateRangePicker` (`src/components/DateRangePicker.tsx`)
Selettore range date.

---

#### `S3FileUploader` (`src/components/S3FileUploader.tsx`)
Upload file generico su S3.

---

#### `S3ImageUploader` (`src/components/S3ImageUploader.tsx`)
Upload immagini su S3 con preview.

---

#### `CaricaArticoliDialog` (`src/components/CaricaArticoliDialog.tsx`)
Dialog per carico articoli in magazzino.

---

#### `InviaArticoliDialog` (`src/components/InviaArticoliDialog.tsx`)
Dialog per trasferimento articoli.

---

#### `DettaglioMagazzino` (`src/components/DettaglioMagazzino.tsx`)
Vista dettaglio magazzino con stock.

---

#### `NotificationDialog` (`src/components/NotificationDialog.tsx`)
Dialog visualizzazione notifica.

---

## Context e State Management

### AuthContext (`src/contexts/AuthContext.tsx`)
Gestisce lo stato di autenticazione globale.

**Valori esposti:**
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<Result>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

**Utilizzo:**
```typescript
const { user, token, login, logout, isAuthenticated } = useAuth();
```

---

## Custom Hooks

### `useAuth` (`src/contexts/AuthContext.tsx`)
Accesso al contesto di autenticazione.

---

### `useEquipments` (`src/hooks/useEquipments.ts`)
Gestione lista apparecchiature.

```typescript
const {
  equipments,
  loading,
  error,
  currentPage,
  totalPages,
  fetchEquipments,
  refetch
} = useEquipments();
```

---

### `useFilters` (`src/hooks/useFilters.ts`)
Gestione dati per filtri (gruppi, brand, famiglie).

```typescript
const {
  deviceGroups,
  deviceBrands,
  deviceFamilies,
  deviceSubfamilies,
  fetchDeviceSubfamilies
} = useFilters();
```

---

### `useInterventions` (`src/app/interventi/hooks/useInterventions.ts`)
Hook per gestione interventi.

---

### `useCalendarNotes` (`src/hooks/useCalendarNotes.ts`)
Gestione note calendario.

---

## TypeScript Types

### Interventi (`src/types/assistance-interventions.ts`)
```typescript
interface AssistanceIntervention {
  id: number;
  date: string;
  time_slot: string;
  company_name: string;
  assigned_to_name: string;
  status_label: string;
  status_color: string;
  equipment_count: number;
  articles_count: number;
  connected_equipment: ConnectedEquipment[];
  connected_articles: ConnectedArticle[];
  // ... altri campi
}
```

---

### Apparecchiature (`src/types/equipment.ts`)
```typescript
interface Equipment {
  id: number;
  description: string;
  model: string | null;
  serial_number: string | null;
  brand_name: string;
  subfamily_name: string;
  customer_name: string;
  // ...
}

interface EquipmentDetail extends Equipment {
  fl_gas: boolean;
  compressor_type_id: number | null;
  gas_type_id: number | null;
  max_charge: string | null;
  images: EquipmentImage[];
  // ... dati F-Gas completi
}
```

---

### Rapportini (`src/types/intervention-reports.ts`)
```typescript
interface CreateInterventionReportRequest {
  work_hours: number;
  travel_hours: number;
  customer_notes: string;
  is_failed: boolean;
  failure_reason?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT';
  items: CreateInterventionReportItem[];
}
```

---

### Inventario (`src/types/inventory.ts`)
```typescript
interface InventoryMovement {
  id: string;
  article_id: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  quantity: number;
  type: 'intra' | 'loading' | 'unloading';
  notes: string | null;
}

type InventoryActivityType = 
  | 'exceeding_quantities_from_report'
  | 'verify_created_report_for_approval'
  | 'check_inventory_after_report_approved';
```

---

### Articoli (`src/types/article.ts`)
```typescript
interface Article {
  id: string;
  short_description: string;
  description: string;
  pnc_code: string | null;
  brand_label: string;
  family_label: string;
  inventory: ArticleInventory[];
}

interface ArticleInventory {
  warehouse_id: string | number;
  warehouse_description: string;
  quantity_stock: number | null;
  quantity_reserved_client: number | null;
  quantity_ordered: number | null;
}
```

---

## Utility Functions

### `utils/permissions.ts`
Sistema centralizzato gestione permessi.

```typescript
// Verifica accesso a route
canAccessRoute(userRole: UserRole, route: string): boolean

// Ottiene menu items per ruolo
getSidebarRoutes(userRole: UserRole): string[]

// Ottiene route default per ruolo
getDefaultRoute(userRole: UserRole): string

// Verifica se ruolo è valido
isValidRole(role: string): role is UserRole

// Verifica se è ruolo tecnico
isTechnicianRole(role: string): boolean

// Verifica se è ruolo admin
isAdminRole(role: string): boolean
```

---

### `utils/intervention-status.ts`
Gestione stati intervento.

```typescript
// Ottieni colore CSS per stato
getStatusColor(status: string): string

// Ottieni ID numerico stato
getStatusId(statusKey: string): number | undefined

// Converti label a key
toStatusKey(statusLabel: string): string

// Lista opzioni stato
const statusOptions: StatusOption[]
```

---

### `utils/assistance-interventions-api.ts`
Funzioni API per interventi.

```typescript
fetchAssistanceInterventions(params, token): Promise<Response>
fetchAssistanceInterventionDetail(id, token): Promise<Detail>
createAssistanceIntervention(data, token): Promise<Detail>
updateAssistanceIntervention(id, data, token): Promise<Detail>
deleteAssistanceIntervention(id, token): Promise<void>
downloadAssistanceInterventionPDF(id, token): Promise<Blob>
bulkUpdateManualCheck(ids, options, token): Promise<Result>
```

---

### `utils/s3.ts`
Utility per upload S3.

```typescript
// Ottieni URL pre-firmato e carica file
uploadToS3(file: File, folder: string): Promise<string>
```

---

### `utils/api.ts`
Funzioni API base (login, verifica token).

---

### `utils/intervention-helpers.ts`
Helper vari per interventi.

---

### `utils/equipment-validation.ts`
Validazione dati apparecchiature.

---

## Middleware

### `src/middleware.ts`
Middleware Next.js per protezione route.

**Flusso:**
1. Verifica se pagina è pubblica
2. Controlla presenza token nei cookie
3. Valida token con backend (con retry)
4. Verifica ruolo utente
5. Controlla permessi per route richiesta
6. Redirect se non autorizzato

**Pagine Pubbliche:**
```typescript
const publicPages = ['/', '/login', '/change-password'];
```

**Matcher:**
```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Stili e UI

### Tailwind CSS
L'applicazione usa Tailwind CSS con configurazione custom.

**Colori Principali:**
- **Primary:** Teal (`teal-600`, `teal-700`)
- **Success:** Green (`green-100`, `green-800`)
- **Error:** Red (`red-100`, `red-800`)
- **Warning:** Orange/Yellow
- **Info:** Blue

**Pattern Comuni:**
```html
<!-- Card -->
<div className="bg-white rounded-lg border border-gray-200 p-6">

<!-- Button Primary -->
<button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">

<!-- Input -->
<input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">

<!-- Badge Status -->
<span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
```

---

### Icone
Libreria: **Lucide React**

```typescript
import { Search, Plus, Edit, Trash2, Eye, ChevronDown } from 'lucide-react';
```

---

## Pattern di Sviluppo

### Fetching Dati
Pattern standard con loading/error states:

```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/endpoint', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        auth.logout();
        return;
      }
      throw new Error('Failed to fetch');
    }
    
    const result = await response.json();
    setData(result.data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error');
  } finally {
    setLoading(false);
  }
};
```

---

### Gestione Form
Pattern con stato locale:

```typescript
const [formData, setFormData] = useState<FormType>(initialValues);
const [saving, setSaving] = useState(false);

const handleChange = (field: keyof FormType, value: unknown) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

const handleSubmit = async () => {
  setSaving(true);
  try {
    await submitData(formData);
    onSuccess();
  } catch (error) {
    // handle error
  } finally {
    setSaving(false);
  }
};
```

---

### Dialog/Modal Pattern
```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

const handleOpen = (item: Item) => {
  setSelectedItem(item);
  setIsOpen(true);
};

const handleClose = () => {
  setIsOpen(false);
  setSelectedItem(null);
};
```

---

## Convenzioni di Codice

### Naming
- **Componenti:** PascalCase (`DettaglioCliente.tsx`)
- **Hooks:** camelCase con prefisso "use" (`useEquipments.ts`)
- **Utils:** camelCase (`intervention-helpers.ts`)
- **Types:** PascalCase (`AssistanceIntervention`)

### File Structure per Modulo
```
modulo/
├── page.tsx              # Pagina principale
├── ComponenteX.tsx       # Componenti principali
├── components/           # Sotto-componenti
│   └── SubComponent.tsx
└── hooks/                # Hook specifici
    └── useModulo.ts
```

### Commenti
- Commenti in italiano per coerenza con l'applicazione
- JSDoc per funzioni pubbliche complesse

---

## Testing

Il progetto non include attualmente test automatizzati. Per testing manuale:

1. Verificare tutti i flussi per ogni ruolo
2. Testare responsive su mobile/tablet
3. Verificare gestione errori (401, 500, offline)
4. Controllare deep linking funzionante

---

## Build e Deploy

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint

# Format
npm run format
```

**Variabili d'ambiente richieste in produzione:**
- `NEXT_PUBLIC_BASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET_NAME`

