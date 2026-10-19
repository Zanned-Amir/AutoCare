/** Filters of GET /admin/users; `sort` is a Spring sort ("createdAt,desc"). */
export interface UserSearchParams {
  q: string;
  role: string | null;
  active: boolean | null;
  sort: string;
  page: number;
}

/** Mirrors the backend AdminUserResponse. */
export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  active: boolean;
  emailVerified: boolean;
  /** False while an account opened by an admin waits for its password. */
  passwordSet: boolean;
  roles: string[];
  createdAt: string;
}
