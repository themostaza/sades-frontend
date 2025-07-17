/**
 * Sistema di permessi centralizzato per gestire l'accesso alle route
 * basato sui ruoli utente
 */

// Tipi per il sistema di permessi
export type UserRole = 'amministrazione' | 'tecnico';

export interface RolePermissions {
  sections: string[];      // Sezioni principali per la sidebar
  patterns: string[];      // Pattern per le sottopagine (middleware)
  exceptions: {
    deny: string[];       // Pagine specifiche da bloccare
    allow: string[];      // Pagine specifiche da permettere
  };
}

export interface PermissionSystem {
  [key: string]: RolePermissions;
}

// Configurazione dei permessi per ruolo
const ROLE_PERMISSIONS: PermissionSystem = {
  amministrazione: {
    sections: ['/dashboard', '/interventi', '/team', '/clienti', '/apparecchiature', '/inventario', '/notifiche'],
    patterns: [
      '/dashboard/**',
      '/interventi/**', 
      '/team/**',
      '/clienti/**',
      '/apparecchiature/**',
      '/inventario/**',
      '/notifiche/**'
    ],
    exceptions: {
      deny: [],
      allow: []
    }
  },
  tecnico: {
    sections: ['/interventi', '/team', '/inventario', '/notifiche'],
    patterns: [
      '/interventi/**', 
      '/team/**',
      '/inventario/**', 
      '/notifiche/**'
    ],
    exceptions: {
      deny: [],
      allow: []
    }
  }
};

/**
 * Verifica se un pattern corrisponde a una route
 */
function matchesPattern(pattern: string, route: string): boolean {
  if (pattern === route) return true;
  
  // Gestione pattern con ** - deve coprire sia la route esatta che le sottopagine
  if (pattern.endsWith('/**')) {
    const basePath = pattern.slice(0, -3);
    // Corrisponde se è esattamente la base path o se inizia con la base path seguita da /
    return route === basePath || route.startsWith(basePath + '/');
  }
  
  // Gestione pattern con *
  if (pattern.includes('*')) {
    const regex = new RegExp(pattern.replace(/\*/g, '[^/]*'));
    return regex.test(route);
  }
  
  return false;
}

/**
 * Verifica se un utente può accedere a una route specifica
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;

  // Controlla prima le exceptions di deny
  if (permissions.exceptions.deny.some(deniedRoute => matchesPattern(deniedRoute, route))) {
    return false;
  }

  // Controlla le exceptions di allow
  if (permissions.exceptions.allow.some(allowedRoute => matchesPattern(allowedRoute, route))) {
    return true;
  }

  // Controlla i pattern principali
  return permissions.patterns.some(pattern => matchesPattern(pattern, route));
}

/**
 * Ottiene le sezioni accessibili per la sidebar
 */
export function getSidebarRoutes(userRole: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions?.sections || [];
}

/**
 * Ottiene la route di default per un ruolo
 */
export function getDefaultRoute(userRole: UserRole): string {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions || permissions.sections.length === 0) {
    return '/login';
  }
  
  // Per i tecnici, default è interventi
  if (userRole === 'tecnico') {
    return '/interventi';
  }
  
  // Per gli amministratori, default è dashboard
  return '/dashboard';
}

/**
 * Ottiene tutte le route accessibili per un ruolo (pattern inclusi)
 */
export function getAccessibleRoutes(userRole: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions?.patterns || [];
}

/**
 * Verifica se un ruolo è valido
 */
export function isValidRole(role: string): role is UserRole {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

/**
 * Aggiunge un'exception di deny per un ruolo specifico
 */
export function addDenyException(userRole: UserRole, route: string): void {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (permissions && !permissions.exceptions.deny.includes(route)) {
    permissions.exceptions.deny.push(route);
  }
}

/**
 * Aggiunge un'exception di allow per un ruolo specifico
 */
export function addAllowException(userRole: UserRole, route: string): void {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (permissions && !permissions.exceptions.allow.includes(route)) {
    permissions.exceptions.allow.push(route);
  }
}

/**
 * Utilità per debug - mostra tutti i permessi di un ruolo
 */
export function debugPermissions(userRole: UserRole): RolePermissions | null {
  return ROLE_PERMISSIONS[userRole] || null;
}

/**
 * Test della funzione di pattern matching (solo per debug)
 */
export function testPatternMatching(): void {
  console.log('🧪 Testing pattern matching...');
  
  // Test per amministratore
  console.log('Admin can access /dashboard:', canAccessRoute('amministrazione', '/dashboard'));
  console.log('Admin can access /dashboard/settings:', canAccessRoute('amministrazione', '/dashboard/settings'));
  console.log('Admin can access /interventi:', canAccessRoute('amministrazione', '/interventi'));
  console.log('Admin can access /interventi/123:', canAccessRoute('amministrazione', '/interventi/123'));
  
  // Test per tecnico
  console.log('Tecnico can access /dashboard:', canAccessRoute('tecnico', '/dashboard'));
  console.log('Tecnico can access /dashboard/settings:', canAccessRoute('tecnico', '/dashboard/settings'));
  console.log('Tecnico can access /interventi:', canAccessRoute('tecnico', '/interventi'));
  console.log('Tecnico can access /interventi/123:', canAccessRoute('tecnico', '/interventi/123'));
  console.log('Tecnico can access /clienti:', canAccessRoute('tecnico', '/clienti'));
  
  console.log('✅ Pattern matching test completed');
} 