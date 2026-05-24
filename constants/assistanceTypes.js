/**
 * List of assistance categories available in the Aviora app.
 * Each item contains a unique ID, human-readable label, and a MaterialCommunityIcons name.
 * 
 * @type {Array<{id: string, label: string, icon: string}>}
 */
export const ASSISTANCE_TYPES = [
  {
    id: 'wheelchair',
    label: 'Wheelchair Support',
    icon: 'wheelchair-accessibility',
  },
  {
    id: 'senior_citizen',
    label: 'Senior Citizen Care',
    icon: 'human-cane',
  },
  {
    id: 'medical',
    label: 'Medical Assistance',
    icon: 'medical-bag',
  },
  {
    id: 'vip_protocol',
    label: 'VIP & Protocol Service',
    icon: 'crown-outline',
  },
  {
    id: 'baggage',
    label: 'Baggage Assistance',
    icon: 'bag-suitcase',
  },
  {
    id: 'lost_found',
    label: 'Lost & Found Support',
    icon: 'briefcase-search-outline',
  },
  {
    id: 'navigation',
    label: 'Airport Navigation',
    icon: 'map-search-outline',
  },
  {
    id: 'emergency',
    label: 'Emergency Support',
    icon: 'alert-decagram-outline',
  },
];

/**
 * Retrieves the assistance type object by its ID.
 * 
 * @param {string} id - The ID of the assistance type to find.
 * @returns {{id: string, label: string, icon: string} | undefined} The matching assistance type or undefined.
 */
export const getAssistanceTypeById = (id) => {
  return ASSISTANCE_TYPES.find((type) => type.id === id);
};
