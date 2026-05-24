/**
 * Array of request statuses in the sequential workflow order,
 * plus the final Cancelled status which can be set from any state.
 * 
 * @type {string[]}
 */
export const STATUS_LIST = [
  'New Request',
  'Under Review',
  'Staff Assigned',
  'Passenger Contacted',
  'Assistance In Progress',
  'Completed',
  'Cancelled',
];

/**
 * Mapping of statuses to their corresponding MaterialCommunityIcons names.
 * 
 * @type {Object.<string, string>}
 */
export const STATUS_ICONS = {
  'New Request': 'file-plus-outline',
  'Under Review': 'file-eye-outline',
  'Staff Assigned': 'account-check-outline',
  'Passenger Contacted': 'phone-check-outline',
  'Assistance In Progress': 'run-fast',
  'Completed': 'check-circle-outline',
  'Cancelled': 'close-circle-outline',
};

/**
 * Mapping of statuses to color styling objects (background and text color).
 * Colors are represented as strings.
 * 
 * @type {Object.<string, {bg: string, text: string}>}
 */
export const STATUS_COLORS = {
  'New Request': { bg: '#E0F2FE', text: '#0369A1' }, // Sky/Light Blue
  'Under Review': { bg: '#FEF3C7', text: '#D97706' }, // Light Amber/Orange
  'Staff Assigned': { bg: '#EEF2F6', text: '#1A3C6E' }, // Deep Aviation Blue variant
  'Passenger Contacted': { bg: '#FAE8FF', text: '#A21CAF' }, // Purple
  'Assistance In Progress': { bg: '#E0F2FE', text: '#1D4ED8' }, // Cobalt Blue
  'Completed': { bg: '#DCFCE7', text: '#15803D' }, // Emerald Green
  'Cancelled': { bg: '#FEE2E2', text: '#B91C1C' }, // Red
};

/**
 * Determines the next chronological status in the assistance workflow.
 * Note: Cancelled is a terminal state and cannot progress. Completed is also terminal.
 * 
 * @param {string} currentStatus - The current status of the assistance request.
 * @returns {string | null} The next status string, or null if the flow is finished.
 */
export const getNextStatus = (currentStatus) => {
  switch (currentStatus) {
    case 'New Request':
      return 'Under Review';
    case 'Under Review':
      return 'Staff Assigned';
    case 'Staff Assigned':
      return 'Passenger Contacted';
    case 'Passenger Contacted':
      return 'Assistance In Progress';
    case 'Assistance In Progress':
      return 'Completed';
    case 'Completed':
    case 'Cancelled':
    default:
      return null;
  }
};
