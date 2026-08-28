import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';


const AUTH_BASE_URL = 'http://localhost:3000/api/admin/auth';
// const AUTH_BASE_URL = 'https://qasim-ecommerce-backend-project.onrender.com/api/admin/auth';
const TOKEN_STORAGE_KEY = 'admin_auth_token';
const USER_STORAGE_KEY = 'admin_auth_user';

// Login and register return DIFFERENT shapes for "user" - confirmed from
// your real responses, not an assumption:
//   login response user:    { id, name, email, role, isActive }
//   register response user: { id, firstName, lastName, email, displayName, role, isActive }
// This interface covers both by making the mismatched fields optional rather
// than pretending they're the same shape.
export interface AuthUser {
    id: number;
    name?: string; // present on login response only
    firstName?: string; // present on register response only
    lastName?: string;
    displayName?: string | null;
    email: string;
    role: string;
    isActive: boolean;
}

interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        user: AuthUser;
    };
}

// CONFIRMED: register does NOT return a token. A successful registration
// does not log the user in - they still need to call login() separately
// afterward. Do not assume otherwise in any component calling this.
interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
        user: AuthUser;
    };
}

export interface RegisterPayload {
    account: {
        email: string;
        password: string;
    };
    profile: {
        firstName: string;
        lastName: string;
        displayName?: string;
    };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    currentUser = signal<AuthUser | null>(this.readStoredUser());

    constructor(private http: HttpClient) {}

    login(email: string, password: string): Observable<AuthUser> {
        return this.http.post<LoginResponse>(`${AUTH_BASE_URL}/login`, { email, password }).pipe(
            tap((res) => {
                const user = res?.data?.user;
                const token = res?.data?.token;

                if (!user || !token) {
                    throw new Error('Login response missing token or user data.');
                }

                // Enforced client-side regardless of whether the backend also
                // enforces these - confirmed requirement from you, not a guess.
                if (!user.isActive) {
                    throw new Error('ACCOUNT_INACTIVE');
                }
                if (user.role !== 'ADMIN') {
                    throw new Error('NOT_ADMIN');
                }

                this.storeSession(token, user);
                this.currentUser.set(user);
            }),
            // tap() only runs a side effect and passes LoginResponse through
            // unchanged - this map() is what actually produces the AuthUser
            // this method's signature promises. Without it, subscribers get
            // the raw { success, message, data: { token, user } } envelope,
            // not the user object itself.
            map((res) => res.data.user),
            catchError((err) => throwError(() => err))
        );
    }

    // Does NOT log the user in - no token in the response. Caller is
    // responsible for redirecting to /login (or chaining a login() call)
    // after a successful register, not assuming the session is active.
    register(payload: RegisterPayload): Observable<AuthUser> {
        return this.http.post<RegisterResponse>(`${AUTH_BASE_URL}/register`, payload).pipe(
            tap((res) => {
                if (!res?.data?.user) {
                    throw new Error('Register response missing user data.');
                }
            }),
            // Same fix as login() - map() does the actual transformation.
            // The previous `as unknown as Observable<AuthUser>` cast was a lie:
            // it silenced the compiler without fixing the real mismatch, which
            // meant subscribers were actually getting RegisterResponse at
            // runtime despite the type system claiming otherwise.
            map((res) => res.data.user),
            catchError((err) => throwError(() => err))
        );
    }

    logout() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        this.currentUser.set(null);
    }

    getToken(): string | null {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    }

    isLoggedIn(): boolean {
        return !!this.getToken() && !!this.currentUser();
    }

    // Convenience for templates, since "name" vs "firstName/lastName" differ
    // by which endpoint the user data came from.
    getDisplayName(): string {
        const user = this.currentUser();
        if (!user) return '';
        return user.displayName || user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }

    private storeSession(token: string, user: AuthUser) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }

    private readStoredUser(): AuthUser | null {
        try {
            const raw = localStorage.getItem(USER_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}
