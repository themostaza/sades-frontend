/**
 * Helper functions per gli interventi di assistenza
 * Può essere usato sia lato client che lato server
 */

/**
 * Determina il servizio domicilio in base alla tipologia di intervento
 * Tabella di riferimento:
 * 4 > si
 * 5 > no
 * 6 > si
 * 7 > si
 * 8 > si
 * 9 > si
 * 10 > no
 * 11 > si
 * 12 > si
 */
export const getHomeServiceByType = (typeId: string | number | null | undefined): boolean => {
  if (!typeId) return false;
  
  const typeIdStr = typeId.toString();
  
  // Tipologie che richiedono servizio domicilio = NO
  const noHomeServiceTypes = ['5', '10'];
  
  // Se la tipologia è nella lista "no", ritorna false
  if (noHomeServiceTypes.includes(typeIdStr)) {
    return false;
  }
  
  // Per tutte le altre tipologie valide (4, 6, 7, 8, 9, 11, 12), ritorna true
  const validTypes = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
  if (validTypes.includes(typeIdStr)) {
    return true;
  }
  
  // Se la tipologia non è riconosciuta, ritorna false di default
  return false;
};

