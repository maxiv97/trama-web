import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/public/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/public/register/register').then((m) => m.Register),
  },

  {
    // Centro de ayuda: público, sin guard (handoff design_handoff_trama_ayuda).
    path: 'ayuda',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/public/help/help-hub').then((m) => m.HelpHub),
      },
      {
        path: 'guia/:slug',
        loadComponent: () => import('./features/public/help/help-guide').then((m) => m.HelpGuide),
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/public/help/help-faq').then((m) => m.HelpFaq),
      },
      {
        path: 'contacto',
        loadComponent: () =>
          import('./features/public/help/help-contact').then((m) => m.HelpContact),
      },
    ],
  },

  {
    path: 'c',
    canActivate: [authGuard, roleGuard],
    data: { role: 'consignor' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/consignor/panel/consignor-panel').then((m) => m.ConsignorPanel),
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/consignor/upload-garment/upload-garment').then((m) => m.UploadGarment),
      },
      {
        path: 'garment/:id',
        loadComponent: () =>
          import('./features/consignor/garment-tracking/consignor-garment-tracking').then(
            (m) => m.ConsignorGarmentTracking,
          ),
      },
      {
        path: 'garment/:id/edit',
        loadComponent: () =>
          import('./features/consignor/edit-garment/edit-garment').then((m) => m.EditGarment),
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./features/consignor/payouts/consignor-payouts').then((m) => m.ConsignorPayouts),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/consignor/notifications/consignor-notifications').then(
            (m) => m.ConsignorNotifications,
          ),
      },
    ],
  },

  {
    path: 'm',
    canActivate: [authGuard, roleGuard],
    data: { role: 'merchant' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/merchant/panel/merchant-panel').then((m) => m.MerchantPanel),
      },
      {
        path: 'proposals',
        loadComponent: () =>
          import('./features/merchant/proposals/merchant-proposals').then(
            (m) => m.MerchantProposals,
          ),
      },
      {
        path: 'proposal/:id',
        loadComponent: () =>
          import('./features/merchant/review-proposal/review-proposal').then(
            (m) => m.ReviewProposal,
          ),
      },
      {
        path: 'garment/:id',
        loadComponent: () =>
          import('./features/merchant/garment-tracking/merchant-garment-tracking').then(
            (m) => m.MerchantGarmentTracking,
          ),
      },
      {
        path: 'garment/:id/reception',
        loadComponent: () =>
          import('./features/merchant/register-reception/register-reception').then(
            (m) => m.RegisterReception,
          ),
      },
      {
        path: 'garment/:id/return',
        loadComponent: () =>
          import('./features/merchant/register-return/register-return').then(
            (m) => m.RegisterReturn,
          ),
      },
      {
        path: 'garment/:id/sale',
        loadComponent: () =>
          import('./features/merchant/register-sale/register-sale').then((m) => m.RegisterSale),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/merchant/inventory/inventory').then((m) => m.Inventory),
      },
      {
        path: 'inventory/:id',
        loadComponent: () =>
          import('./features/merchant/garment-detail/garment-detail').then((m) => m.GarmentDetail),
      },
      {
        path: 'sales-points',
        loadComponent: () =>
          import('./features/merchant/sales-points/sales-points').then((m) => m.SalesPoints),
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./features/merchant/payouts/merchant-payouts').then((m) => m.MerchantPayouts),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/merchant/reports/reports').then((m) => m.Reports),
      },
      { path: 'compliance', redirectTo: 'reports' },
      { path: 'financials', redirectTo: 'reports' },
      {
        path: 'consignors',
        loadComponent: () =>
          import('./features/merchant/consignors/consignors').then((m) => m.Consignors),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/merchant/categories/manage-categories').then(
            (m) => m.ManageCategories,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/merchant/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/merchant/notifications/merchant-notifications').then(
            (m) => m.MerchantNotifications,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
