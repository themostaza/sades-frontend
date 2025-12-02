# Sades - Documentazione API

## Introduzione

Il frontend Sades espone una serie di **API proxy** attraverso le Next.js API Routes. Queste route fungono da intermediario tra il client e il backend esterno (Heroku), gestendo:
- Forwarding delle richieste al backend
- Gestione degli header di autenticazione
- Logging delle operazioni
- Gestione errori standardizzata

**Base URL Backend:** Configurato in `src/config/env.ts`

**Autenticazione:** Tutte le API (eccetto login e forgot-password) richiedono un header:
```
Authorization: Bearer <token>
```

---

## Indice API

1. [Autenticazione](#autenticazione)
2. [Interventi di Assistenza](#interventi-di-assistenza)
3. [Rapportini (Intervention Reports)](#rapportini-intervention-reports)
4. [Clienti](#clienti)
5. [Apparecchiature (Equipments)](#apparecchiature-equipments)
6. [Inventario](#inventario)
7. [Utenti e Team](#utenti-e-team)
8. [Notifiche](#notifiche)
9. [Dati di Supporto](#dati-di-supporto)
10. [File e Storage](#file-e-storage)

---

## Autenticazione

### POST `/api/auth/login`
Effettua il login utente.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Mario",
    "role": "amministrazione"
  }
}
```

---

### POST `/api/auth/me`
Verifica la validità del token e restituisce i dati utente.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Mario",
  "surname": "Rossi",
  "phone_number": "123456789",
  "role": "amministrazione"
}
```

---

### POST `/api/auth/forgot-password`
Richiede il reset della password via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

---

### POST `/api/auth/change-password`
Cambia la password dell'utente.

**Request Body:**
```json
{
  "current_password": "oldPassword",
  "new_password": "newPassword"
}
```

---

## Interventi di Assistenza

### GET `/api/assistance-interventions`
Lista interventi con filtri e paginazione.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina (default: 1) |
| `skip` | number | Elementi per pagina (default: 20) |
| `query` | string | Ricerca testuale |
| `date` | string | Data singola (YYYY-MM-DD) |
| `from_date` | string | Data inizio range |
| `to_date` | string | Data fine range |
| `zone_id` | number | Filtra per zona |
| `status_id` | number | Filtra per stato |
| `customer_id` | number | Filtra per cliente |
| `assigned_to_id` | string | Filtra per tecnico assegnato |
| `manual_check` | boolean | Filtra per verifica manuale |
| `sort_by` | string | Campo ordinamento (`id`, `date`) |
| `sort_order` | string | Direzione (`asc`, `desc`) |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1234,
      "date": "2025-01-15",
      "time_slot": "09:00-12:00",
      "from_datetime": "2025-01-15T09:00:00",
      "to_datetime": "2025-01-15T12:00:00",
      "call_code": "INT-2025-001",
      "company_name": "Ristorante Da Mario",
      "assigned_to_name": "Giuseppe",
      "assigned_to_surname": "Verdi",
      "zone_label": "Milano Nord",
      "status_label": "In Carico",
      "status_color": "#14b8a6",
      "location_address": "Via Roma 123",
      "location_city": "Milano",
      "type_label": "Manutenzione",
      "equipment_count": 2,
      "articles_count": 3,
      "connected_equipment": [...],
      "connected_articles": [...]
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "skip": 20,
    "totalPages": 8
  }
}
```

---

### GET `/api/assistance-interventions/:id`
Dettaglio singolo intervento.

**Response (200):** Oggetto intervento completo con tutti i campi.

---

### POST `/api/assistance-interventions`
Crea nuovo intervento.

**Request Body:**
```json
{
  "customer_id": 123,
  "type_id": 1,
  "zone_id": 5,
  "customer_location_id": "loc-uuid",
  "flg_home_service": false,
  "flg_discount_home_service": false,
  "date": "2025-01-20",
  "time_slot": "14:00-17:00",
  "from_datetime": "2025-01-20T14:00:00",
  "to_datetime": "2025-01-20T17:00:00",
  "quotation_price": 150.00,
  "opening_hours": "09:00-18:00",
  "assigned_to": "tecnico-uuid",
  "call_code": "INT-2025-002",
  "internal_notes": "Note interne",
  "status_id": 1,
  "equipments": [101, 102],
  "articles": [
    { "article_id": "ART001", "quantity": 2 }
  ]
}
```

---

### PUT `/api/assistance-interventions/:id`
Aggiorna intervento esistente.

**Request Body:** Come POST, con campi aggiuntivi:
```json
{
  "approved_by": "user-uuid",
  "approved_at": "2025-01-20T15:30:00",
  "cancelled_by": "user-uuid",
  "cancelled_at": "2025-01-20T15:30:00",
  "invoiced_by": "user-uuid",
  "invoiced_at": "2025-01-20T15:30:00",
  "calendar_notes": "Note calendario",
  "manual_check": true
}
```

---

### POST `/api/assistance-interventions/bulk-duplicate`
Duplica in massa interventi.

**Request Body:**
```json
{
  "intervention_ids": [1, 2, 3],
  "cancel_originals": true,
  "user_id": "user-uuid",
  "target_date": "2025-01-25"
}
```

---

### PATCH `/api/assistance-interventions/manual-check`
Aggiorna in bulk il flag di verifica manuale.

**Request Body:**
```json
{
  "ids": [1, 2, 3],
  "value": true
}
```

---

### GET `/api/assistance-interventions/:id/pdf`
Genera e scarica il PDF dell'intervento.

**Response:** File PDF (blob)

---

## Rapportini (Intervention Reports)

### GET `/api/assistance-interventions/:id/reports`
Lista rapportini di un intervento.

---

### POST `/api/assistance-interventions/:id/reports`
Crea nuovo rapportino per un intervento.

**Request Body:**
```json
{
  "work_hours": 2.5,
  "travel_hours": 1,
  "customer_notes": "Lavoro eseguito regolarmente",
  "is_failed": false,
  "failure_reason": "",
  "status": "DRAFT",
  "items": [
    {
      "equipment_id": 101,
      "note": "Sostituzione filtro",
      "fl_gas": true,
      "gas_compressor_types_id": 1,
      "is_new_installation": false,
      "rechargeable_gas_types_id": 2,
      "qty_gas_recharged": 0.5,
      "max_charge": 2.0,
      "compressor_model": "ABC-123",
      "compressor_model_img_url": "https://s3...",
      "compressor_serial_num": "SN123456",
      "compressor_serial_num_img_url": "https://s3...",
      "compressor_unique_num": "UN789",
      "compressor_unique_num_img_url": "https://s3...",
      "additional_services": "",
      "recovered_rech_gas_types_id": 0,
      "qty_gas_recovered": 0,
      "images": [
        { "file_name": "foto1.jpg", "file_url": "https://s3..." }
      ],
      "articles": [
        { "article_id": "ART001", "quantity": 1 }
      ]
    }
  ]
}
```

**Stati Rapportino:**
- `DRAFT` - Bozza
- `PENDING` - In attesa di approvazione
- `APPROVED` - Approvato
- `REJECTED` - Rifiutato
- `SENT` - Inviato

---

### GET `/api/intervention-reports/:id`
Dettaglio rapportino.

---

### PUT `/api/intervention-reports/:id`
Aggiorna rapportino esistente.

---

### DELETE `/api/intervention-reports/:id`
Elimina rapportino.

---

### GET `/api/assistance-interventions/:id/report-rows`
Righe del report per fatturazione.

---

### PUT `/api/assistance-interventions/:id/report-rows/:rowId`
Aggiorna riga report.

---

## Clienti

### GET `/api/customers`
Lista clienti.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `skip` | number | Elementi per pagina |
| `query` | string | Ricerca testuale |
| `blacklist` | string | `0` = normali, `1` = blacklist |

**Response (200):**
```json
{
  "data": [
    {
      "id": 123,
      "company_name": "Ristorante Da Mario",
      "client_code": "CLI001",
      "address": "Via Roma 123",
      "city": "Milano",
      "zip": "20100",
      "vat_number": "IT12345678901",
      "fiscal_code": "RSSMRA80A01F205X",
      "phone_number": "02 1234567",
      "mobile_phone_number": "333 1234567",
      "blacklisted": false,
      "zone_label": "Milano Nord"
    }
  ],
  "meta": { ... }
}
```

---

### GET `/api/customers/:id`
Dettaglio cliente.

---

### GET `/api/customers/:id/locations`
Sedi/location del cliente.

---

## Apparecchiature (Equipments)

### GET `/api/equipments`
Lista apparecchiature.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | string | Numero pagina |
| `skip` | string | Elementi per pagina |
| `query` | string | Ricerca testuale |
| `customer_id` | string | Filtra per cliente |
| `customer_location_id` | string | Filtra per sede |
| `group_id` | string | Filtra per gruppo |
| `brand_id` | string | Filtra per marchio |
| `family_id` | string | Filtra per famiglia |
| `subfamily_id` | string | Filtra per sottofamiglia |

**Response (200):**
```json
{
  "data": [
    {
      "id": 101,
      "description": "Forno a convezione XYZ",
      "model": "FX-2000",
      "serial_number": "SN123456",
      "linked_serials": "SN789",
      "brand_name": "Electrolux",
      "subfamily_name": "Forni",
      "customer_name": "Ristorante Da Mario",
      "pnc_code": "PNC123456"
    }
  ],
  "meta": { ... }
}
```

---

### GET `/api/equipments/:id`
Dettaglio apparecchiatura con dati F-Gas.

---

### POST `/api/equipments`
Crea nuova apparecchiatura.

---

### PUT `/api/equipments/:id`
Aggiorna apparecchiatura.

---

### GET `/api/equipments/:id/images`
Lista immagini apparecchiatura.

---

### POST `/api/equipments/:id/images`
Carica immagine apparecchiatura.

---

### DELETE `/api/equipments/:id/images/:imageId`
Elimina immagine.

---

### GET `/api/equipments/:id/documents`
Lista documenti apparecchiatura.

---

### POST `/api/equipments/:id/documents`
Carica documento.

---

### DELETE `/api/equipments/:id/documents/:documentId`
Elimina documento.

---

### POST `/api/equipments/:id/grouping`
Gestione raggruppamento apparecchiature.

---

### POST `/api/import-equipment`
Import massivo da file Excel.

---

## Inventario

### GET `/api/articles`
Lista articoli.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `skip` | number | Elementi per pagina |
| `query` | string | Ricerca testuale |
| `stock` | number | `1` = in stock, `-1` = esauriti |
| `place_type_id` | number | Tipo posto |
| `place_id` | number | Posto specifico |
| `warehouse_id` | string | Magazzino |

**Response (200):**
```json
{
  "data": [
    {
      "id": "ART001",
      "short_description": "Filtro aria",
      "description": "Filtro aria per forno XYZ",
      "pnc_code": "PNC123",
      "brand_label": "Electrolux",
      "family_label": "Ricambi",
      "inventory": [
        {
          "warehouse_id": "WH001",
          "warehouse_description": "Magazzino Centrale",
          "quantity_stock": 25,
          "quantity_reserved_client": 3,
          "quantity_ordered": 10
        }
      ]
    }
  ],
  "meta": { ... }
}
```

---

### GET `/api/articles/:id`
Dettaglio articolo.

---

### POST `/api/articles`
Crea articolo.

---

### PUT `/api/articles/:id`
Aggiorna articolo.

---

### GET `/api/warehouses`
Lista magazzini.

---

### GET `/api/assigned-warehouses`
Magazzini assegnati all'utente (per tecnici).

---

### GET `/api/inventory/movements`
Storico movimenti magazzino.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `limit` | number | Elementi per pagina |
| `type` | string | `intra`, `loading`, `unloading` |
| `article_id` | string | Filtra per articolo |
| `warehouse_id` | string | Filtra per magazzino |
| `from_date` | string | Data inizio |
| `to_date` | string | Data fine |
| `search` | string | Ricerca testuale |

**Tipi Movimento:**
- `intra` - Trasferimento tra magazzini
- `loading` - Carico merce
- `unloading` - Scarico merce

---

### POST `/api/inventory/bulk-transfer`
Trasferimento bulk tra magazzini.

**Request Body:**
```json
{
  "transfers": [
    {
      "article_id": "ART001",
      "from_warehouse_id": "WH001",
      "to_warehouse_id": "WH002",
      "quantity": 5,
      "notes": "Trasferimento per intervento"
    }
  ],
  "global_notes": "Note generali"
}
```

---

### POST `/api/inventory/bulk-loading`
Carico bulk merce.

**Request Body:**
```json
{
  "loadings": [
    {
      "article_id": "ART001",
      "to_warehouse_id": "WH001",
      "quantity": 10,
      "notes": "Arrivo merce fornitore"
    }
  ],
  "global_notes": "Note generali"
}
```

---

### POST `/api/inventory/bulk-unloading`
Scarico bulk merce.

**Request Body:**
```json
{
  "unloadings": [
    {
      "article_id": "ART001",
      "from_warehouse_id": "WH001",
      "quantity": 2,
      "notes": "Usato per intervento"
    }
  ],
  "global_notes": "Note generali"
}
```

---

### GET `/api/inventory/activities`
Lista attività inventario (anomalie, verifiche).

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `type` | string | Tipo attività |
| `status` | string | `to_do`, `done` |
| `report_id` | number | ID rapportino |
| `assistance_intervention_id` | number | ID intervento |

**Tipi Attività:**
- `exceeding_quantities_from_report` - Quantità eccedenti da rapportino
- `verify_created_report_for_approval` - Verifica rapportino per approvazione
- `check_inventory_after_report_approved` - Controllo inventario post-approvazione

---

### POST `/api/inventory/activities`
Crea attività inventario.

---

### PUT `/api/inventory/activities/:id`
Aggiorna attività.

---

### POST `/api/inventory/complete-activity`
Completa attività con movimenti.

**Request Body:**
```json
{
  "activity_id": "act-uuid",
  "warehouse_transfers": [
    { "warehouse_id": "WH001", "quantity": 5 }
  ],
  "distribution_warehouses": [
    { "warehouse_id": "WH002", "quantity": 3 }
  ]
}
```

---

## Utenti e Team

### GET `/api/users`
Lista utenti.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `skip` | number | Elementi per pagina |
| `query` | string | Ricerca testuale |
| `role_id` | number | Filtra per ruolo |

---

### GET `/api/users/:user_id`
Dettaglio utente.

---

### PUT `/api/users/:user_id`
Aggiorna utente.

---

### DELETE `/api/users/:user_id`
Elimina utente.

---

### GET `/api/users/:user_id/absences`
Lista assenze utente.

---

### POST `/api/users/:user_id/absences`
Crea richiesta assenza.

---

### PUT `/api/users/:user_id/absences/:absence_id`
Aggiorna assenza (approvazione/rifiuto).

---

### GET `/api/absences`
Lista tutte le assenze (per admin).

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `limit` | number | Elementi per pagina |
| `status` | string | `pending`, `approved`, `rejected` |

---

### GET `/api/roles`
Lista ruoli disponibili.

---

## Notifiche

### GET `/api/notifications`
Lista notifiche.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `page` | number | Numero pagina |
| `limit` | number | Elementi per pagina |
| `unread_only` | boolean | Solo non lette |

---

### PUT `/api/notifications/:id/read`
Segna notifica come letta.

---

## Dati di Supporto

### GET `/api/zones`
Lista zone geografiche.

---

### GET `/api/intervention-types`
Tipi di intervento.

---

### GET `/api/failed-intervention-reasons`
Motivi fallimento intervento.

---

### GET `/api/device-groups`
Gruppi apparecchiature.

---

### GET `/api/device-brands`
Marchi/brand.

---

### GET `/api/device-families`
Famiglie prodotto.

---

### GET `/api/device-families/:familyId/subfamilies`
Sottofamiglie di una famiglia.

---

### GET `/api/device-subgroups`
Sottogruppi apparecchiature.

---

### GET `/api/gas-compressor-types`
Tipi compressore gas (per F-Gas).

---

### GET `/api/rechargeable-gas-types`
Tipi gas ricaricabili (per F-Gas).

---

### GET `/api/place-types`
Tipi di posto (per articoli).

---

### GET `/api/article-places`
Posti articoli.

**Query Parameters:**
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `place_type_id` | number | Filtra per tipo posto |

---

## File e Storage

### POST `/api/s3/presigned-url`
Genera URL pre-firmato per upload su S3.

**Request Body:**
```json
{
  "fileName": "documento.pdf",
  "fileType": "application/pdf",
  "folder": "documents"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/...",
  "fileUrl": "https://s3.amazonaws.com/bucket/documents/documento.pdf"
}
```

---

## Note Calendario

### GET `/api/calendar-notes`
Note calendario per interventi.

---

### POST `/api/calendar-notes`
Crea nota calendario.

---

### PUT `/api/calendar-notes/:id`
Aggiorna nota.

---

### DELETE `/api/calendar-notes/:id`
Elimina nota.

---

## Codici di Errore

| Codice | Significato |
|--------|-------------|
| `200` | Successo |
| `201` | Creato con successo |
| `204` | Eliminato con successo (no content) |
| `400` | Richiesta non valida |
| `401` | Non autenticato |
| `403` | Non autorizzato |
| `404` | Risorsa non trovata |
| `500` | Errore interno server |

---

## Pattern di Risposta

### Successo con Lista
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "skip": 20,
    "totalPages": 5
  }
}
```

### Successo con Singolo Oggetto
```json
{
  "id": 123,
  "field1": "value1",
  ...
}
```

### Errore
```json
{
  "error": "Descrizione errore"
}
```

