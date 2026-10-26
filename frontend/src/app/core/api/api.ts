import { HttpErrorResponse } from '@angular/common/http';

/** Base path of the backend. The dev server proxies it to http://localhost:8080 (proxy.conf.json). */
import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

/** Spring Data page (PagedModel VIA_DTO). */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/** RFC 9457 problem detail returned by the backend for every error. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
  /** Seconds before retrying (cooldowns, login lock). */
  retryAfter?: number;
}

export function toProblem(error: unknown): ProblemDetail {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return { status: error.status, ...(error.error as Omit<ProblemDetail, 'status'>) };
  }
  return { status: 0, detail: 'Le serveur est injoignable. Vérifiez votre connexion.' };
}

/** French text for backend ErrorCode values. Add an entry with every new ErrorCode a user can hit. */
const messagesByCode: Record<string, string> = {
  VALIDATION_FAILED: 'Certains champs sont invalides.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Trop de tentatives. Votre compte est bloqué quelques minutes.',
  SEND_COOLDOWN: 'Un e-mail vient déjà de partir.',
  INVALID_ACCOUNT_TOKEN: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.',
  INVALID_OTP: 'Ce code est faux ou a expiré.',
  INVALID_CURRENT_PASSWORD: 'Le mot de passe actuel est incorrect.',
  EMAIL_ALREADY_VERIFIED: 'Votre adresse e-mail est déjà confirmée.',
  ROLE_NAME_TAKEN: 'Un rôle porte déjà cet identifiant.',
  ROLE_SYSTEM_LOCKED: 'Ce rôle système ne peut pas être modifié de cette façon.',
  ROLE_IN_USE: 'Choisissez un rôle de remplacement pour ses membres.',
  ADMIN_SELF_LOCKOUT: 'Vous ne pouvez pas faire cela sur votre propre compte.',
  ROLE_NOT_FOUND: 'Rôle inconnu.',
  NOT_BACKOFFICE_USER: "Ce compte n'a pas accès au backoffice.",
  PHONE_REQUIRED: "Ajoutez d'abord un numéro de téléphone à votre profil.",
  PHONE_ALREADY_VERIFIED: 'Ce numéro est déjà vérifié.',
  TELEGRAM_DISABLED: "Telegram n'est pas disponible pour le moment.",
  OAUTH_PROVIDER_DISABLED: "Cette connexion n'est pas disponible.",
  OAUTH_STATE_INVALID: 'La connexion a expiré. Recommencez.',
  OAUTH_FAILED: "Le fournisseur de connexion n'a pas répondu. Réessayez.",
  OAUTH_EMAIL_REQUIRED:
    "Ce compte ne partage pas d'adresse e-mail. Autorisez l'accès à votre e-mail.",
  OAUTH_ACCOUNT_EXISTS:
    'Un compte existe déjà avec cet e-mail. Connectez-vous avec votre mot de passe, puis liez ce compte depuis Mon compte.',
  OAUTH_ACCOUNT_LINKED_ELSEWHERE: 'Ce compte est déjà lié à un autre utilisateur.',
  OAUTH_PROVIDER_ALREADY_LINKED: 'Un autre compte de ce fournisseur est déjà lié.',
  OAUTH_LAST_LOGIN_METHOD:
    "Choisissez d'abord un mot de passe : c'est votre seul moyen de connexion.",
  API_KEY_PERMISSION_UNKNOWN: 'Permission inconnue.',
  API_KEY_IP_INVALID: 'Adresse IP ou plage CIDR invalide.',
  API_KEY_REVOKED: 'Une clé révoquée ne peut plus être modifiée.',
  TICKET_CLOSED: 'Cette demande est fermée. Ouvrez-en une nouvelle.',
  TICKET_STATUS_INVALID: "Ce changement de statut n'est pas possible.",
  TICKET_ASSIGNEE_INVALID: "Cette personne n'est pas un agent du support.",
  INVALID_ID_TOKEN: 'La connexion a échoué. Réessayez.',
  CONFLICT: 'Cette donnée a été modifiée entre-temps. Rechargez la page.',
  FILE_TYPE_NOT_ALLOWED:
    'Ce type de fichier n’est pas accepté (JPEG, PNG, WebP ou PDF pour les documents).',
  FILE_TOO_LARGE: 'Fichier trop volumineux (5 Mo pour une image, 10 Mo pour un PDF).',
  FILE_ORDER_INVALID: 'Envoyez chaque photo une seule fois.',
  FILE_LIMIT_REACHED: 'Nombre maximum de fichiers atteint.',
  DIAGNOSTIC_ANSWERS_INVALID: 'Répondez à toutes les questions.',
  DIAGNOSTIC_QUESTION_INVALID: 'Une question à choix demande au moins deux choix différents.',
  DIAGNOSTIC_RULE_INVALID: 'Règle invalide : vérifiez les conditions et le service.',
  DIAGNOSTIC_QUESTION_IN_USE: 'Des règles utilisent cette question. Modifiez-les d’abord.',
  SERVICE_REQUEST_PROVIDER_UNAVAILABLE: 'Ce prestataire n’accepte pas de demandes pour le moment.',
  SERVICE_REQUEST_SERVICE_NOT_OFFERED: 'Ce prestataire ne propose pas ce service à cet endroit.',
  SERVICE_REQUEST_DATE_INVALID: 'Choisissez une date entre aujourd’hui et les 90 prochains jours.',
  SERVICE_REQUEST_LOCATION_REQUIRED: 'Indiquez l’adresse où le prestataire doit venir.',
  SERVICE_REQUEST_STATUS_INVALID: 'Cette action n’est plus possible pour cette demande.',
  MAINTENANCE_RECORD_READ_ONLY: 'Cette entrée vient d’un prestataire et ne peut pas être modifiée.',
  MAINTENANCE_DATE_INVALID: 'La date ne peut pas être dans le futur.',
  TICKET_PRIORITY_NOT_ALLOWED: 'Seul le support peut choisir la priorité urgente.',
  UNAUTHENTICATED: 'Veuillez vous connecter.',
  FORBIDDEN: "Vous n'avez pas l'autorisation de faire cela.",
  RESOURCE_NOT_FOUND: "Cet élément n'existe pas ou a été supprimé.",
  EMAIL_TAKEN: 'Un compte existe déjà avec cet e-mail.',
  USER_PASSWORD_ALREADY_SET: 'Cette personne a déjà choisi son mot de passe.',
  QUOTE_NOT_ALLOWED: 'Un devis s’envoie seulement sur une demande en attente.',
  SERVICE_REQUEST_CHAT_CLOSED: 'Cette demande est close : la discussion n’est plus possible.',
  MAINTENANCE_REMINDER_DUE_REQUIRED: 'Indiquez une date ou un kilométrage d’échéance.',
  QUOTE_NOT_PENDING: 'Aucun devis n’attend de réponse.',
  REVIEW_NOT_ALLOWED: 'Seule une demande terminée de votre compte peut être notée.',
  REVIEW_ALREADY_EXISTS: 'Vous avez déjà donné votre avis sur cette demande.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  ACCOUNT_DISABLED: 'Ce compte est désactivé.',
  INVALID_REFRESH_TOKEN: 'Votre session a expiré, reconnectez-vous.',
  AUTO_SERVICE_NAME_TAKEN: 'Un service porte déjà ce nom.',
  VEHICLE_MILEAGE_DECREASED: 'Le kilométrage ne peut pas être inférieur à la valeur actuelle.',
  VEHICLE_YEAR_INVALID: "L'année ne peut pas être dans le futur.",
  ORGANIZATION_STATUS_INVALID: "Ce changement de statut n'est pas possible.",
  ORGANIZATION_GOVERNORATE_INVALID: 'Gouvernorat inconnu.',
  MEMBER_ALREADY_EXISTS: 'Cette personne fait déjà partie de votre équipe.',
  MEMBER_USER_NOT_FOUND: "Aucun compte n'utilise cet e-mail. Demandez-lui de créer un compte.",
  MEMBER_ROLE_TYPE_MISMATCH: "Ce rôle n'est pas disponible pour ce type d'entreprise.",
  LAST_MEMBER_MANAGER: "L'entreprise doit garder au moins un membre actif qui gère l'équipe.",
  ORGANIZATION_NOT_PROVIDER: 'Seuls les prestataires peuvent proposer des services.',
  PROVIDER_SERVICE_ALREADY_OFFERED: 'Vous proposez déjà ce service.',
  PROVIDER_SERVICE_UNAVAILABLE: "Ce service n'est plus disponible dans le catalogue.",
  INTERNAL_ERROR: 'Une erreur inattendue est survenue. Réessayez.',
};

/** Message to show the user for a failed request: mapped from the error code, never the raw server text. */
export function problemMessage(error: unknown, fallback: string): string {
  const problem = toProblem(error);
  if (problem.code && messagesByCode[problem.code]) {
    const message = messagesByCode[problem.code]!;
    return problem.retryAfter
      ? `${message} Réessayez dans ${formatWait(problem.retryAfter)}.`
      : message;
  }
  return problem.status === 0 ? (problem.detail ?? fallback) : fallback;
}

function formatWait(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}
