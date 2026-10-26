/** Kept apart from the types so routes and menus stay light. */
export const ServiceRequestPermissions = {
  REQUEST_CREATE: 'request:create',
  REQUEST_READ: 'request:read',
  REQUEST_ACCEPT: 'request:accept',
  REQUEST_REJECT: 'request:reject',
  REQUEST_UPDATE_STATUS: 'request:update_status',
  REQUEST_CANCEL: 'request:cancel',
} as const;
