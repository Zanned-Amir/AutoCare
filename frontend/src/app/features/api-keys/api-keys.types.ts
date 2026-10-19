export const ApiKeyPermissions = { MANAGE: 'apikey:manage' } as const;

export interface ApiKey {
  id: number;
  keyId: string;
  displayPrefix: string;
  label: string;
  environment: 'LIVE' | 'TEST';
  permissions: string[];
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED';
  allowedIps: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  previousSecretExpiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface ApiCapability {
  permission: string;
  description: string;
}

export interface ApiKeyUsage {
  day: string;
  requests: number;
  rejected: number;
}

export interface NewApiKey {
  label: string;
  environment: 'LIVE' | 'TEST';
  permissions: string[];
  allowedIps: string[];
  rateLimitPerMinute: number;
}
