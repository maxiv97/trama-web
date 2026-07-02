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
        path: 'consignors',
        loadComponent: () =>
          import('./features/merchant/consignors/consignors').then((m) => m.Consignors),
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
