/**
 * Helper functions per gli interventi di assistenza
 * Può essere usato sia lato client che lato server
 */

/**
 * Determina il servizio domicilio in base alla tipologia di intervento
 * Tabella di riferimento:
 * 4 > si
 * 12 > si
 * Tutte le altre > no
 */
export const getHomeServiceByType = (typeId: string | number | null | undefined): boolean => {
  if (!typeId) return false;
  
  const typeIdStr = typeId.toString();
  
  // Tipologie che richiedono servizio domicilio = SI
  const homeServiceTypes = ['4', '12'];
  
  // Se la tipologia è nella lista "si", ritorna true
  if (homeServiceTypes.includes(typeIdStr)) {
    return true;
  }
  
  // Tutte le altre tipologie = NO
  return false;
};

