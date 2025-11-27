/**
 * Helper functions per gli interventi di assistenza
 * Può essere usato sia lato client che lato server
 */

/**
 * Determina il servizio domicilio in base alla tipologia di intervento
 * 
 * Mappatura per ambiente:
 * - STAGING (NEXT_PUBLIC_BASE_URL=https://sades-10528bec4f2e.herokuapp.com/):
 *   ID 4 e 12 > si
 *   Tutte le altre > no
 * 
 * - PRODUZIONE (qualsiasi altro URL):
 *   ID 1 e 9 > si
 *   Tutte le altre > no
 */
export const getHomeServiceByType = (typeId: string | number | null | undefined): boolean => {
  if (!typeId) return false;
  
  const typeIdStr = typeId.toString();
  
  // Determina l'ambiente basandosi su NEXT_PUBLIC_BASE_URL
  const baseUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_URL;
  const isStaging = baseUrl === 'https://sades-10528bec4f2e.herokuapp.com/';
  
  // Tipologie che richiedono servizio domicilio = SI
  // Staging: ID 4 e 12
  // Produzione: ID 1 e 9
  const homeServiceTypes = isStaging ? ['4', '12'] : ['1', '9'];
  
  // Se la tipologia è nella lista "si", ritorna true
  if (homeServiceTypes.includes(typeIdStr)) {
    return true;
  }
  
  // Tutte le altre tipologie = NO
  return false;
};

