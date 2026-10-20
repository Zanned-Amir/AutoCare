/** Kept apart from the types so routes and menus stay light. */
export const HelpdeskPermissions = {
  TICKET_CREATE: 'ticket:create',
  TICKET_READ: 'ticket:read',
  TICKET_MANAGE: 'ticket:manage',
  HELPDESK_CONFIGURE: 'helpdesk:configure',
} as const;
