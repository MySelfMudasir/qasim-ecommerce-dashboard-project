import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth-service';

// Functional interceptor. Confirmed registered via
// provideHttpClient(withInterceptors([authInterceptor])) - verify this is
// actually wired in your app.config.ts, since this file alone does nothing
// if it's not registered there.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    // Matches the CONFIRMED real auth path (admin/auth), not the old guessed
    // '/api/auth/' path. Don't attach a token to login/register calls.
    const isAuthEndpoint = req.url.includes('/api/admin/auth/');

    const authReq = token && !isAuthEndpoint ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next(authReq).pipe(
        catchError((err) => {
            if (err?.status === 401 && !isAuthEndpoint) {
                authService.logout();
                router.navigate(['/auth/login']);
            }
            return throwError(() => err);
        })
    );
};