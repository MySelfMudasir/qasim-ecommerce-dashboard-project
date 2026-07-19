import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Message } from 'primeng/message';
import { AuthService } from '@/app/services/auth-service';

@Component({
    selector: 'app-register',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PasswordModule, Message, RouterLink],
    standalone: true,
    template: `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-brand">
                    <i class="pi pi-user-plus brand-icon"></i>
                    <div class="brand-title">Create Admin Account</div>
                    <div class="brand-subtitle">Register a new administrator</div>
                </div>

                @if (errorMessage) {
                    <p-message severity="error" [text]="errorMessage" styleClass="w-full mb-3"></p-message>
                }
                @if (successMessage) {
                    <p-message severity="success" [text]="successMessage" styleClass="w-full mb-3"></p-message>
                }

                <div class="field-row">
                    <div class="field flex-1">
                        <label class="field-label">First Name</label>
                        <input pInputText class="w-full" [(ngModel)]="firstName" [disabled]="loading" />
                    </div>
                    <div class="field flex-1">
                        <label class="field-label">Last Name</label>
                        <input pInputText class="w-full" [(ngModel)]="lastName" [disabled]="loading" />
                    </div>
                </div>

                <div class="field">
                    <label class="field-label">Display Name <span class="optional">(optional)</span></label>
                    <input pInputText class="w-full" [(ngModel)]="displayName" [disabled]="loading" />
                </div>

                <div class="field">
                    <label class="field-label">Email</label>
                    <input pInputText type="email" class="w-full" [(ngModel)]="email" [disabled]="loading" />
                </div>

                <div class="field">
                    <label class="field-label">Password</label>
                    <p-password [(ngModel)]="password" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" [disabled]="loading"> </p-password>
                </div>

                <button pButton label="Create Account" icon="pi pi-user-plus" class="w-full" [loading]="loading" (click)="onSubmit()"></button>

                <div class="auth-footer">Already have an account? <a routerLink="/auth/login">Sign in</a></div>
            </div>
        </div>
    `,
    styles: `
        .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--p-surface-50, #f8fafc);
            padding: 1.5rem;
        }
        .auth-card {
            width: 100%;
            max-width: 420px;
            background: var(--p-content-background, #fff);
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 16px;
            padding: 2.25rem 2rem;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        }
        .auth-brand {
            text-align: center;
            margin-bottom: 1.75rem;
        }
        .brand-icon {
            font-size: 2.25rem;
            color: var(--p-primary-color, #6366f1);
            margin-bottom: 0.5rem;
            display: block;
        }
        .brand-title {
            font-size: 1.3rem;
            font-weight: 700;
        }
        .brand-subtitle {
            font-size: 0.82rem;
            color: var(--p-text-muted-color, #9ca3af);
            margin-top: 0.2rem;
        }
        .field {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            margin-bottom: 1.1rem;
        }
        .field-row {
            display: flex;
            gap: 1rem;
        }
        .field-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }
        .optional {
            font-weight: 400;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .auth-footer {
            text-align: center;
            font-size: 0.8rem;
            color: var(--p-text-muted-color, #9ca3af);
            margin-top: 1.25rem;
        }
        .auth-footer a {
            color: var(--p-primary-color, #6366f1);
            text-decoration: none;
            font-weight: 600;
        }
    `
})
export class Register {
    firstName = 'admin';
    lastName = '123';
    displayName = 'admin';
    email = 'admin@gmail.com';
    password = 'Mail@20262026';
    loading = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private authService: AuthService,
        private router: Router,
        private cd: ChangeDetectorRef
    ) {}

    onSubmit() {
        this.errorMessage = '';
        this.successMessage = '';

        if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim() || !this.password.trim()) {
            this.errorMessage = 'First name, last name, email, and password are required.';
            return;
        }

        this.loading = true;

        // Matches your CONFIRMED nested request shape: { account: {...}, profile: {...} }.
        this.authService
            .register({
                account: {
                    email: this.email.trim(),
                    password: this.password
                },
                profile: {
                    firstName: this.firstName.trim(),
                    lastName: this.lastName.trim(),
                    ...(this.displayName.trim() ? { displayName: this.displayName.trim() } : {})
                }
            })
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.cd.detectChanges(); // add this
                    this.successMessage = 'Account created. Redirecting to sign in...';
                    setTimeout(() => this.router.navigate(['/auth/login']), 1200);
                },
                error: (err) => {
                    this.loading = false;
                    this.errorMessage = this.resolveErrorMessage(err);
                    this.cd.detectChanges(); // add this
                }
            });
    }

    private resolveErrorMessage(err: any): string {
        console.log('Register error:', err);
        if (err?.status === 409) {
            return 'An account with this email already exists.';
        }
        if (err?.status === 400) {
            return 'Please check the form fields and try again.';
        }
        if (err?.status === 0) {
            return 'Could not reach the server. Check your connection.';
        }
        return 'Something went wrong. Please try again.';
    }
}
