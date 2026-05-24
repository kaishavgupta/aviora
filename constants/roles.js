export const ROLES = {
  PASSENGER: 'passenger',
  STAFF: 'staff',
  ADMIN: 'admin',
};

export const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return Object.values(ROLES).includes(normalized) ? normalized : ROLES.PASSENGER;
};

export const isStaffRole = (role) => normalizeRole(role) === ROLES.STAFF;
export const isAdminRole = (role) => normalizeRole(role) === ROLES.ADMIN;
export const isPassengerRole = (role) => normalizeRole(role) === ROLES.PASSENGER;
