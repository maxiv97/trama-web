import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const expected = route.data['role'] as Role | undefined;
  if (expected && auth.role() !== expected) {
    return router.createUrlTree([auth.role() === 'merchant' ? '/m' : '/c']);
  }

  return true;
};
