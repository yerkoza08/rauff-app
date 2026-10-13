export type Access = { role: string; active: boolean; sales: boolean; costs: boolean; inventory: boolean };
export type Permission = 'sales' | 'costs' | 'inventory';
export function allowed(access: Access | null, permission: Permission) {
  return !!access?.active && (access.role === 'admin' || access[permission]);
}
export function canManage(access: Access | null) { return !!access?.active && access.role === 'admin'; }