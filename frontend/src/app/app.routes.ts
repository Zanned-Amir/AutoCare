import { Routes } from '@angular/router';

import {
  requireAuth,
  requireBackoffice,
  requireGuest,
  requireOnboarding,
  requirePermission,
} from '@core/auth/permission.guard';
import { ApiKeyPermissions } from '@features/api-keys/api-keys.types';
import { CatalogPermissions } from '@features/catalog/catalog.permissions';
import { DiagnosticPermissions } from '@features/diagnostic/diagnostic.types';
import { HelpdeskPermissions } from '@features/helpdesk/helpdesk.types';
import { OrganizationPermissions } from '@features/organizations/organizations.permissions';
import { ServiceRequestPermissions } from '@features/service-requests/service-requests.types';
import { RolePermissions } from '@features/roles/roles.types';
import { UserPermissions } from '@features/users/users.permissions';
import { VehiclePermissions } from '@features/vehicles/vehicles.permissions';
import { adminHome } from '@layouts/admin-home.guard';

/**
 * Four shells: client (public-layout), auth (split brand panel), professional backoffice
 * (pro-layout, /pro/:organizationId) and admin backoffice (admin-layout). Route data:
 * fullBleed / hideFooter (client), brand (auth), heading (backoffice top bar).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@layouts/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        title: 'AutoCare TN - Entretien auto en Tunisie',
        data: { fullBleed: true },
        loadComponent: () => import('./pages/public/home.page').then((m) => m.HomePage),
      },
      {
        path: 'providers',
        title: 'Trouver un pro - AutoCare TN',
        data: { fullBleed: true, hideFooter: true },
        loadComponent: () =>
          import('./pages/public/providers/provider-search.page').then((m) => m.ProviderSearchPage),
      },
      {
        path: 'providers/:organizationId',
        title: 'Professionnel - AutoCare TN',
        loadComponent: () =>
          import('./pages/public/providers/provider-profile.page').then(
            (m) => m.ProviderProfilePage,
          ),
      },
      {
        path: 'diagnostic',
        title: 'Diagnostic - AutoCare TN',
        canActivate: [requirePermission(DiagnosticPermissions.DIAGNOSTIC_USE)],
        loadComponent: () =>
          import('./pages/client/diagnostic/diagnostic.page').then((m) => m.DiagnosticPage),
      },
      {
        path: 'organizations/new',
        title: 'Créer mon entreprise - AutoCare TN',
        canActivate: [requirePermission(OrganizationPermissions.ORGANIZATION_CREATE)],
        loadComponent: () =>
          import('./pages/client/organizations/new-organization.page').then(
            (m) => m.NewOrganizationPage,
          ),
      },
      {
        path: 'requests/new',
        title: 'Nouvelle demande - AutoCare TN',
        canActivate: [requirePermission(ServiceRequestPermissions.REQUEST_CREATE)],
        loadComponent: () =>
          import('./pages/client/requests/new-request.page').then((m) => m.NewRequestPage),
      },
      {
        path: '',
        loadComponent: () => import('@layouts/client/account-layout').then((m) => m.AccountLayout),
        children: [
          {
            path: 'vehicles',
            title: 'Mes véhicules - AutoCare TN',
            canActivate: [requirePermission(VehiclePermissions.VEHICLE_READ)],
            loadComponent: () =>
              import('./pages/client/vehicles/my-vehicles.page').then((m) => m.MyVehiclesPage),
          },
          {
            path: 'vehicles/:vehicleId',
            title: 'Mon véhicule - AutoCare TN',
            canActivate: [requirePermission(VehiclePermissions.VEHICLE_READ)],
            loadComponent: () =>
              import('./pages/client/vehicles/vehicle-detail.page').then(
                (m) => m.VehicleDetailPage,
              ),
          },
          {
            path: 'requests',
            title: 'Mes demandes - AutoCare TN',
            canActivate: [requirePermission(ServiceRequestPermissions.REQUEST_READ)],
            loadComponent: () =>
              import('./pages/client/requests/my-requests.page').then((m) => m.MyRequestsPage),
          },
          {
            path: 'requests/:requestId',
            title: 'Ma demande - AutoCare TN',
            canActivate: [requirePermission(ServiceRequestPermissions.REQUEST_READ)],
            loadComponent: () =>
              import('./pages/client/requests/request-detail.page').then(
                (m) => m.RequestDetailPage,
              ),
          },
          {
            path: 'organizations',
            title: 'Espace pro - AutoCare TN',
            canActivate: [requireAuth],
            loadComponent: () =>
              import('./pages/client/organizations/my-organizations.page').then(
                (m) => m.MyOrganizationsPage,
              ),
          },
          { path: 'organizations/:organizationId', redirectTo: '/pro/:organizationId' },
          {
            path: 'account',
            title: 'Mon compte - AutoCare TN',
            canActivate: [requireAuth],
            loadComponent: () =>
              import('./pages/client/account/account.page').then((m) => m.AccountPage),
          },
          {
            path: 'support',
            title: 'Support - AutoCare TN',
            canActivate: [requireAuth],
            loadComponent: () =>
              import('./pages/client/support/support-list.page').then((m) => m.SupportListPage),
          },
          {
            path: 'support/:publicId',
            title: 'Ma demande de support - AutoCare TN',
            canActivate: [requireAuth],
            loadComponent: () =>
              import('./pages/client/support/support-ticket.page').then((m) => m.SupportTicketPage),
          },
        ],
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('@layouts/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'Connexion - AutoCare TN',
        data: { brand: 'login' },
        canActivate: [requireGuest],
        loadComponent: () => import('./pages/public/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        title: 'Créer un compte - AutoCare TN',
        data: { brand: 'register' },
        canActivate: [requireGuest],
        loadComponent: () =>
          import('./pages/public/auth/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'onboarding',
        title: 'Bienvenue - AutoCare TN',
        data: { brand: 'welcome', wide: true },
        canActivate: [requireOnboarding],
        loadComponent: () =>
          import('./pages/public/auth/onboarding.page').then((m) => m.OnboardingPage),
      },
      {
        path: 'forgot-password',
        title: 'Mot de passe oublié - AutoCare TN',
        data: { brand: 'forgot' },
        canActivate: [requireGuest],
        loadComponent: () =>
          import('./pages/public/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
      },
      {
        path: 'reset-link-sent',
        title: 'E-mail envoyé - AutoCare TN',
        data: { brand: 'sent' },
        loadComponent: () =>
          import('./pages/public/auth/reset-link-sent.page').then((m) => m.ResetLinkSentPage),
      },
      {
        path: 'verify-otp',
        title: 'Code de vérification - AutoCare TN',
        data: { brand: 'otp' },
        loadComponent: () =>
          import('./pages/public/auth/verify-otp.page').then((m) => m.VerifyOtpPage),
      },
      {
        path: 'auth-success',
        title: 'C’est fait - AutoCare TN',
        data: { brand: 'success' },
        loadComponent: () =>
          import('./pages/public/auth/auth-success.page').then((m) => m.AuthSuccessPage),
      },
      {
        path: 'reset-password',
        title: 'Nouveau mot de passe - AutoCare TN',
        data: { brand: 'reset' },
        loadComponent: () =>
          import('./pages/public/auth/reset-password.page').then((m) => m.ResetPasswordPage),
      },
      {
        path: 'verify-email',
        title: 'Vérification de l’e-mail - AutoCare TN',
        data: { brand: 'sent' },
        loadComponent: () =>
          import('./pages/public/auth/verify-email.page').then((m) => m.VerifyEmailPage),
      },
      {
        path: 'confirm-email-change',
        title: 'Nouvel e-mail - AutoCare TN',
        data: { brand: 'sent' },
        loadComponent: () =>
          import('./pages/public/auth/confirm-email-change.page').then(
            (m) => m.ConfirmEmailChangePage,
          ),
      },
      {
        path: 'oauth/callback',
        title: 'Connexion - AutoCare TN',
        data: { brand: 'login' },
        loadComponent: () =>
          import('./pages/public/auth/oauth-callback.page').then((m) => m.OAuthCallbackPage),
      },
      {
        path: 'admin/login',
        title: 'Connexion équipe - AutoCare',
        data: { brand: 'staff' },
        loadComponent: () =>
          import('./pages/admin/auth/admin-login.page').then((m) => m.AdminLoginPage),
      },
    ],
  },
  {
    path: 'pro/:organizationId',
    canActivate: [requireAuth],
    loadComponent: () => import('@layouts/pro-layout').then((m) => m.ProLayout),
    children: [
      {
        path: '',
        title: 'Tableau de bord - Espace pro',
        data: { heading: 'Tableau de bord' },
        loadComponent: () =>
          import('./pages/provider/pro-dashboard.page').then((m) => m.ProDashboardPage),
      },
      {
        path: 'calendar',
        title: 'Agenda - Espace pro',
        data: { heading: 'Agenda' },
        loadComponent: () =>
          import('./pages/provider/pro-calendar.page').then((m) => m.ProCalendarPage),
      },
      {
        path: 'reviews',
        title: 'Avis - Espace pro',
        data: { heading: 'Avis clients' },
        loadComponent: () =>
          import('./pages/provider/pro-reviews.page').then((m) => m.ProReviewsPage),
      },
      {
        path: 'requests',
        title: 'Demandes - Espace pro',
        data: { heading: 'Demandes' },
        loadComponent: () =>
          import('./pages/provider/pro-requests.page').then((m) => m.ProRequestsPage),
      },
      {
        path: 'services',
        title: 'Services - Espace pro',
        data: { heading: 'Services et tarifs' },
        loadComponent: () =>
          import('./pages/provider/pro-services.page').then((m) => m.ProServicesPage),
      },
      {
        path: 'history',
        title: 'Interventions - Espace pro',
        data: { heading: 'Interventions' },
        loadComponent: () =>
          import('./pages/provider/pro-history.page').then((m) => m.ProHistoryPage),
      },
      {
        path: 'profile',
        title: 'Profil - Espace pro',
        data: { heading: 'Profil et carte' },
        loadComponent: () =>
          import('./pages/provider/pro-profile.page').then((m) => m.ProProfilePage),
      },
      {
        path: 'team',
        title: 'Équipe - Espace pro',
        data: { heading: 'Équipe' },
        loadComponent: () => import('./pages/provider/pro-team.page').then((m) => m.ProTeamPage),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('@layouts/admin-layout').then((m) => m.AdminLayout),
    canActivate: [requireBackoffice()],
    children: [
      { path: '', pathMatch: 'full', canActivate: [adminHome], children: [] },
      {
        path: 'dashboard',
        title: 'Tableau de bord - Admin',
        data: { heading: 'Tableau de bord' },
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'helpdesk',
        title: 'Support - Admin',
        data: { heading: 'Support' },
        canActivate: [requireBackoffice(HelpdeskPermissions.TICKET_MANAGE)],
        loadComponent: () =>
          import('./pages/admin/helpdesk/admin-helpdesk.page').then((m) => m.AdminHelpdeskPage),
      },
      {
        path: 'helpdesk/:publicId',
        title: 'Demande - Admin',
        data: { heading: 'Demande de support' },
        canActivate: [requireBackoffice(HelpdeskPermissions.TICKET_MANAGE)],
        loadComponent: () =>
          import('./pages/admin/helpdesk/admin-ticket.page').then((m) => m.AdminTicketPage),
      },
      {
        path: 'diagnostics',
        title: 'Diagnostic - Admin',
        data: { heading: 'Diagnostic guidé' },
        canActivate: [requireBackoffice(DiagnosticPermissions.DIAGNOSTIC_MANAGE)],
        loadComponent: () =>
          import('./pages/admin/diagnostics/admin-diagnostics.page').then(
            (m) => m.AdminDiagnosticsPage,
          ),
      },
      {
        path: 'api-keys',
        title: 'Clés API - Admin',
        data: { heading: 'Clés API' },
        canActivate: [requireBackoffice(ApiKeyPermissions.MANAGE)],
        loadComponent: () =>
          import('./pages/admin/api-keys/admin-api-keys.page').then((m) => m.AdminApiKeysPage),
      },
      {
        path: 'catalog',
        title: 'Catalogue - Admin',
        data: { heading: 'Catalogue' },
        canActivate: [requireBackoffice(CatalogPermissions.SERVICE_READ)],
        loadComponent: () =>
          import('./pages/admin/catalog/admin-catalog.page').then((m) => m.AdminCatalogPage),
      },
      {
        path: 'users',
        title: 'Utilisateurs - Admin',
        data: { heading: 'Utilisateurs' },
        canActivate: [requireBackoffice(UserPermissions.USER_READ)],
        loadComponent: () =>
          import('./pages/admin/users/admin-users.page').then((m) => m.AdminUsersPage),
      },
      {
        path: 'users/:userId',
        title: 'Utilisateur - Admin',
        data: { heading: 'Utilisateur' },
        canActivate: [requireBackoffice(UserPermissions.USER_READ)],
        loadComponent: () =>
          import('./pages/admin/users/admin-user-detail.page').then((m) => m.AdminUserDetailPage),
      },
      {
        path: 'requests',
        title: 'Demandes - Admin',
        data: { heading: 'Demandes' },
        canActivate: [requireBackoffice(ServiceRequestPermissions.REQUEST_READ)],
        loadComponent: () =>
          import('./pages/admin/requests/admin-requests.page').then((m) => m.AdminRequestsPage),
      },
      {
        path: 'organizations',
        title: 'Entreprises - Admin',
        data: { heading: 'Entreprises' },
        canActivate: [requireBackoffice(OrganizationPermissions.ORGANIZATION_APPROVE)],
        loadComponent: () =>
          import('./pages/admin/organizations/admin-organizations.page').then(
            (m) => m.AdminOrganizationsPage,
          ),
      },
      {
        path: 'organizations/new',
        title: 'Nouvelle entreprise - Admin',
        data: { heading: 'Nouvelle entreprise' },
        canActivate: [requireBackoffice(OrganizationPermissions.ORGANIZATION_CREATE)],
        loadComponent: () =>
          import('./pages/admin/organizations/admin-new-organization.page').then(
            (m) => m.AdminNewOrganizationPage,
          ),
      },
      {
        path: 'roles',
        title: 'Rôles - Admin',
        data: { heading: 'Rôles & permissions' },
        canActivate: [requireBackoffice(RolePermissions.ROLE_READ)],
        loadComponent: () =>
          import('./pages/admin/roles/admin-roles.page').then((m) => m.AdminRolesPage),
      },
      {
        path: 'roles/new',
        title: 'Nouveau rôle - Admin',
        data: { heading: 'Nouveau rôle' },
        canActivate: [requireBackoffice(RolePermissions.ROLE_MANAGE)],
        loadComponent: () =>
          import('./pages/admin/roles/admin-role-detail.page').then((m) => m.AdminRoleDetailPage),
      },
      {
        path: 'roles/:roleId',
        title: 'Rôle - Admin',
        data: { heading: 'Rôle' },
        canActivate: [requireBackoffice(RolePermissions.ROLE_READ)],
        loadComponent: () =>
          import('./pages/admin/roles/admin-role-detail.page').then((m) => m.AdminRoleDetailPage),
      },
      {
        path: 'profile',
        title: 'Mon profil - Admin',
        data: { heading: 'Mon profil' },
        loadComponent: () =>
          import('./pages/admin/profile/admin-profile.page').then((m) => m.AdminProfilePage),
      },
      {
        path: 'organizations/:organizationId',
        title: 'Entreprise - Admin',
        data: { heading: 'Entreprise' },
        canActivate: [requireBackoffice(OrganizationPermissions.ORGANIZATION_APPROVE)],
        loadComponent: () =>
          import('./pages/admin/organizations/admin-organization-detail.page').then(
            (m) => m.AdminOrganizationDetailPage,
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./pages/errors/not-found.page').then((m) => m.NotFoundPage),
  },
];
