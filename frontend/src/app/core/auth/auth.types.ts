/** customer: the app. backoffice: staff tools (/admin), separate cookie and shorter session. */
export type SessionScope = 'customer' | 'backoffice';

/** Mirrors the backend MeResponse. */
export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  /** Language of the user's e-mails. */
  locale: 'fr' | 'en';
  emailVerified: boolean;
  phoneVerified: boolean;
  /** False for an account created with Google/GitHub... that has no password yet. */
  passwordSet: boolean;
  /** The welcome flow after sign-up was finished or skipped. */
  onboardingDone: boolean;
  roles: string[];
  permissions: string[];
}

/** Body of /auth/login, /auth/register and /auth/refresh. The refresh token stays in an httpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: SessionUser;
}
