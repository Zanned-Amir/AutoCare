/** Mirrors the backend SessionResponse. */
export interface UserSession {
  id: number;
  device: string;
  ipAddress: string | null;
  startedAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface SentResponse {
  retryAfter: number;
}

export interface OAuthAccount {
  provider: string;
  email: string | null;
  name: string | null;
  linkedAt: string;
  lastUsedAt: string | null;
}

export interface TelegramStatus {
  enabled: boolean;
  linked: boolean;
  username: string | null;
  linkedAt: string | null;
}
