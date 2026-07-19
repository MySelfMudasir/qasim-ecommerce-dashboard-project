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
    selector: 'app-login',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PasswordModule, Message, RouterLink],
    standalone: true,
    template: `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-brand">
                    <i class="pi pi-shield brand-icon"></i>
                    <div class="brand-title">Admin Panel</div>
                    <div class="brand-subtitle">Sign in to manage your store</div>
                </div>

                @if (errorMessage) {
                    <p-message severity="error" [text]="errorMessage" styleClass="w-full mb-3"></p-message>
                }

                <div class="field">
                    <label class="field-label">Email</label>
                    <input pInputText type="email" class="w-full" [(ngModel)]="email" placeholder="admin@example.com" (keyup.enter)="onSubmit()" [disabled]="loading" />
                </div>

                <div class="field">
                    <label class="field-label">Password</label>
                    <p-password [(ngModel)]="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Your password" (keyup.enter)="onSubmit()" [disabled]="loading"> </p-password>
                </div>

                <button pButton label="Sign In" icon="pi pi-sign-in" class="w-full" [loading]="loading" (click)="onSubmit()"></button>

                <div class="auth-footer">Need an account? <a routerLink="/auth/register">Contact your administrator</a></div>
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
            max-width: 380px;
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
        .field-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
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
export class Login {
    email = 'admin@gmail.com';
    password = 'Mail@20262026';
    loading = false;
    errorMessage = '';

    constructor(
        private authService: AuthService,
        private router: Router,
        private cd: ChangeDetectorRef
    ) {}

    onSubmit() {
        this.errorMessage = '';

        if (!this.email.trim() || !this.password.trim()) {
            this.errorMessage = 'Please enter both email and password.';
            return;
        }

        this.loading = true;

        this.authService.login(this.email.trim(), this.password).subscribe({
            next: () => {
                this.loading = false;
                this.cd.detectChanges(); // add this
                this.router.navigate(['/']);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = this.resolveErrorMessage(err);
                this.cd.detectChanges(); // add this
            }
        });
    }

    private resolveErrorMessage(err: any): string {
        const message = err?.message;

        if (message === 'ACCOUNT_INACTIVE') {
            return 'This account has been deactivated. Contact a system administrator.';
        }
        if (message === 'NOT_ADMIN') {
            return 'This account does not have admin access.';
        }
        if (err?.status === 401 || err?.status === 400) {
            return 'Incorrect email or password.';
        }
        if (err?.status === 0) {
            return 'Could not reach the server. Check your connection.';
        }
        return 'Something went wrong. Please try again.';
    }
}
