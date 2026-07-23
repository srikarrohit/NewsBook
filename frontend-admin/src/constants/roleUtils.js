export const SUPER_ADMIN_USERNAME = 'superadmin';

export function normalizeRole(role) {
  return role?.toString().trim().toLowerCase().replace(/[-\s]+/g, '_') || '';
}

export function isSuperAdminRole(role) {
  return normalizeRole(role) === 'super_admin';
}

export function isAdminRole(role) {
  return normalizeRole(role) === 'admin';
}

export function isUserRole(role) {
  return normalizeRole(role) === 'user';
}

export function isSuperAdminUser(user) {
  if (!user) return false;
  if (isSuperAdminRole(user.role)) return true;
  return user.username?.toString().trim().toLowerCase() === SUPER_ADMIN_USERNAME;
}
