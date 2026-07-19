import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        return true;
    }

    // CONFIRMED from your app.routes.ts: login lives at /auth/login
    // (via the auth.routes.ts child route), not /login.
    router.navigate(['/auth/login']);
    return false;
};