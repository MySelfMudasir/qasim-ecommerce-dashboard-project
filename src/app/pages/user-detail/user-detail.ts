import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ApiService } from '@/app/services/api-service';
import { UserModel } from '../users/users';

interface UserDetailForm {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    businessName: string;
    businessType: string;
    primaryCategory: string;
    monthlyOrders: number | null;
    emailUpdates: boolean;
    smsUpdates: boolean;
    marketingUpdates: boolean;
    role: string;
    isActive: boolean;
    checkoutMode: 'collection' | 'delivery' | null;
}

@Component({
    selector: 'app-user-detail',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule, ToggleSwitchModule, TagModule],
    standalone: true,
    template: `
        <div class="card">
            <p-toast />
            <p-confirmDialog />

            @if (loading) {
                <div class="loading-state"><i class="pi pi-spin pi-spinner"></i> Loading user&hellip;</div>
            } @else if (!user) {
                <div class="loading-state">User not found.</div>
            } @else {
                <div class="detail-header">
                    <button pButton icon="pi pi-arrow-left" severity="secondary" [text]="true" (click)="goBack()"></button>
                    <div class="detail-title-block">
                        <div class="detail-title">{{ user.displayName || user.firstName + ' ' + (user.lastName || '') }}</div>
                        <div class="detail-subtitle">{{ user.email }}</div>
                    </div>
                    <p-tag [value]="user.role" [severity]="user.role === 'ADMIN' ? 'warn' : 'info'"></p-tag>
                </div>

                <div class="detail-grid">
                    <!-- ACCOUNT -->
                    <div class="panel">
                        <div class="panel-title"><i class="pi pi-id-card"></i> Account</div>
                        <div class="field-row">
                            <div class="field flex-1">
                                <label class="field-label">First Name</label>
                                <input pInputText class="w-full" [(ngModel)]="form.firstName" />
                            </div>
                            <div class="field flex-1">
                                <label class="field-label">Last Name</label>
                                <input pInputText class="w-full" [(ngModel)]="form.lastName" />
                            </div>
                        </div>
                        <div class="field">
                            <label class="field-label">Display Name</label>
                            <input pInputText class="w-full" [(ngModel)]="form.displayName" />
                        </div>
                        <div class="field">
                            <label class="field-label">Email</label>
                            <input pInputText class="w-full" [(ngModel)]="form.email" />
                        </div>
                        <div class="field">
                            <label class="field-label">Phone Number</label>
                            <input pInputText class="w-full" [(ngModel)]="form.phoneNumber" />
                        </div>
                    </div>

                    <!-- ADDRESS -->
                    <div class="panel">
                        <div class="panel-title"><i class="pi pi-map-marker"></i> Address</div>
                        <div class="field">
                            <label class="field-label">Street Address</label>
                            <input pInputText class="w-full" [(ngModel)]="form.streetAddress" />
                        </div>
                        <div class="field-row">
                            <div class="field flex-1">
                                <label class="field-label">City</label>
                                <input pInputText class="w-full" [(ngModel)]="form.city" />
                            </div>
                            <div class="field flex-1">
                                <label class="field-label">State</label>
                                <input pInputText class="w-full" [(ngModel)]="form.state" />
                            </div>
                        </div>
                        <div class="field-row">
                            <div class="field flex-1">
                                <label class="field-label">Zip Code</label>
                                <input pInputText class="w-full" [(ngModel)]="form.zipCode" />
                            </div>
                            <div class="field flex-1">
                                <label class="field-label">Country</label>
                                <input pInputText class="w-full" [(ngModel)]="form.country" />
                            </div>
                        </div>
                    </div>

                    <!-- BUSINESS -->
                    <div class="panel">
                        <div class="panel-title"><i class="pi pi-briefcase"></i> Business</div>
                        <div class="field">
                            <label class="field-label">Business Name</label>
                            <input pInputText class="w-full" [(ngModel)]="form.businessName" />
                        </div>
                        <div class="field-row">
                            <div class="field flex-1">
                                <label class="field-label">Business Type</label>
                                <input pInputText class="w-full" [(ngModel)]="form.businessType" />
                            </div>
                            <div class="field flex-1">
                                <label class="field-label">Primary Category</label>
                                <input pInputText class="w-full" [(ngModel)]="form.primaryCategory" />
                            </div>
                        </div>
                        <div class="field">
                            <label class="field-label">Monthly Orders</label>
                            <input pInputText type="number" class="w-full" [(ngModel)]="form.monthlyOrders" />
                        </div>
                    </div>

                    <!-- ACCOUNT CONTROLS -->
                    <div class="panel">
                        <div class="panel-title"><i class="pi pi-cog"></i> Account Controls</div>
                        <div class="field-row">
                            <div class="field flex-1">
                                <label class="field-label">Role</label>
                                <p-select class="w-full" [options]="roleOptions" optionLabel="label" optionValue="value" [(ngModel)]="form.role"> </p-select>
                            </div>
                            <div class="field flex-1">
                                <label class="field-label">Checkout Mode</label>
                                <p-select class="w-full" [options]="checkoutModeOptions" optionLabel="label" optionValue="value" [(ngModel)]="form.checkoutMode" placeholder="Not set"> </p-select>
                            </div>
                        </div>
                        <div class="toggle-row">
                            <label>Active</label>
                            <p-toggleswitch [(ngModel)]="form.isActive" />
                        </div>
                        <div class="toggle-row">
                            <label>Email Updates</label>
                            <p-toggleswitch [(ngModel)]="form.emailUpdates" />
                        </div>
                        <div class="toggle-row">
                            <label>SMS Updates</label>
                            <p-toggleswitch [(ngModel)]="form.smsUpdates" />
                        </div>
                        <div class="toggle-row">
                            <label>Marketing Updates</label>
                            <p-toggleswitch [(ngModel)]="form.marketingUpdates" />
                        </div>
                    </div>
                </div>

                <div class="detail-footer">
                    <button pButton label="Delete User" icon="pi pi-trash" severity="danger" [text]="true" (click)="confirmDeleteUser()"></button>
                    <div class="footer-actions">
                        <button pButton label="Cancel" severity="secondary" (click)="goBack()"></button>
                        <button pButton label="Save Changes" icon="pi pi-check" [loading]="saving" (click)="saveUser()"></button>
                    </div>
                </div>
            }
        </div>
    `,
    styles: `
        .loading-state {
            text-align: center;
            padding: 4rem 1rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .detail-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--p-content-border-color, #e5e7eb);
        }
        .detail-title-block {
            flex: 1;
        }
        .detail-title {
            font-size: 1.2rem;
            font-weight: 700;
        }
        .detail-subtitle {
            font-size: 0.85rem;
            color: var(--p-text-muted-color, #9ca3af);
        }

        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        @media (max-width: 768px) {
            .detail-grid {
                grid-template-columns: 1fr;
            }
        }

        .panel {
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 12px;
            padding: 1.1rem;
        }
        .panel-title {
            font-size: 0.82rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin-bottom: 0.9rem;
        }
        .panel-title i {
            color: var(--p-primary-color, #6366f1);
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
            margin-bottom: 0.85rem;
        }
        .field-row {
            display: flex;
            gap: 1rem;
        }
        @media (max-width: 500px) {
            .field-row {
                flex-direction: column;
            }
        }
        .field-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }

        .toggle-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            font-size: 0.85rem;
        }

        .detail-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--p-content-border-color, #e5e7eb);
        }
        .footer-actions {
            display: flex;
            gap: 0.5rem;
        }
    `,
    providers: [ConfirmationService, MessageService]
})
export class UserDetail implements OnInit {
    user: UserModel | null = null;
    loading = true;
    saving = false;

    form: UserDetailForm = this.emptyForm();

    roleOptions = [
        { label: 'User', value: 'USER' },
        { label: 'Admin', value: 'ADMIN' }
    ];

    checkoutModeOptions = [
        { label: 'Collection', value: 'collection' },
        { label: 'Delivery', value: 'delivery' }
    ];

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef,
        private route: ActivatedRoute,
        private router: Router,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        // CONFIRM: assumes the route param is named 'id' (e.g. /users/:id).
        // Adjust if your routing module names it differently.
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            console.error('[UserDetail] No id route param found.');
            this.loading = false;
            return;
        }
        this.loadUser(Number(id));
    }

    private emptyForm(): UserDetailForm {
        return {
            firstName: '',
            lastName: '',
            displayName: '',
            email: '',
            phoneNumber: '',
            streetAddress: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            businessName: '',
            businessType: '',
            primaryCategory: '',
            monthlyOrders: null,
            emailUpdates: false,
            smsUpdates: false,
            marketingUpdates: false,
            role: 'USER',
            isActive: true,
            checkoutMode: null
        };
    }

    loadUser(id: number) {
        this.loading = true;

        this.apiService.getUserById(id).subscribe({
            next: (res: any) => {
                const raw = res?.data;
                if (!raw) {
                    console.warn('[UserDetail] /api/user/:id returned no data. Got:', res);
                    this.user = null;
                    this.loading = false;
                    this.cd.detectChanges();
                    return;
                }

                this.user = this.normalizeUser(raw);
                this.form = this.userToForm(this.user);
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                console.error('[UserDetail] Failed to load user:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load user.' });
                this.cd.detectChanges();
            }
        });
    }

    // Same string->typed conversion as the list page. Duplicated rather than
    // imported from Users component to keep this file self-contained - if you'd
    // rather share one normalizer, pull this into a small shared util instead.
    private normalizeUser(u: any): UserModel {
        return {
            id: Number(u.id),
            firstName: u.firstName,
            lastName: u.lastName ?? null,
            displayName: u.displayName ?? null,
            email: u.email,
            phoneNumber: u.phoneNumber ?? null,
            address: u.address ?? null,
            businessName: u.businessName ?? null,
            businessType: u.businessType ?? null,
            primaryCategory: u.primaryCategory ?? null,
            monthlyOrders: u.monthlyOrders != null ? Number(u.monthlyOrders) : null,
            emailUpdates: u.emailUpdates === true || u.emailUpdates === 'true',
            smsUpdates: u.smsUpdates === true || u.smsUpdates === 'true',
            marketingUpdates: u.marketingUpdates === true || u.marketingUpdates === 'true',
            role: u.role,
            isActive: !!u.isActive,
            checkoutMode: u.checkoutMode ?? null,
            rowUpdating: false
        };
    }

    // Flattens the nested `address` object from GET into the flat form fields
    // the PUT endpoint expects (streetAddress/city/state/zipCode/country at
    // the root level, NOT nested) - this mismatch is real, confirmed from your
    // own GET response vs PUT example, not an assumption.
    private userToForm(user: UserModel): UserDetailForm {
        return {
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            phoneNumber: user.phoneNumber ?? '',
            streetAddress: user.address?.streetAddress ?? '',
            city: user.address?.city ?? '',
            state: user.address?.state ?? '',
            zipCode: user.address?.zipCode ?? '',
            country: user.address?.country ?? '',
            businessName: user.businessName ?? '',
            businessType: user.businessType ?? '',
            primaryCategory: user.primaryCategory ?? '',
            monthlyOrders: user.monthlyOrders,
            emailUpdates: user.emailUpdates,
            smsUpdates: user.smsUpdates,
            marketingUpdates: user.marketingUpdates,
            role: user.role,
            isActive: user.isActive,
            checkoutMode: user.checkoutMode
        };
    }

    saveUser() {
        if (!this.user) return;

        if (!this.form.firstName?.trim() || !this.form.email?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Missing fields', detail: 'First name and email are required.' });
            return;
        }

        // Builds the FLAT payload the PUT endpoint expects, matching your
        // confirmed Postman example - address fields at root, not nested.
        // No password field anywhere in this object, by construction.
        const payload = {
            firstName: this.form.firstName,
            lastName: this.form.lastName,
            displayName: this.form.displayName,
            email: this.form.email,
            phoneNumber: this.form.phoneNumber,
            streetAddress: this.form.streetAddress,
            city: this.form.city,
            state: this.form.state,
            zipCode: this.form.zipCode,
            country: this.form.country,
            businessName: this.form.businessName,
            businessType: this.form.businessType,
            primaryCategory: this.form.primaryCategory,
            monthlyOrders: this.form.monthlyOrders,
            emailUpdates: this.form.emailUpdates,
            smsUpdates: this.form.smsUpdates,
            marketingUpdates: this.form.marketingUpdates,
            role: this.form.role,
            isActive: this.form.isActive,
            checkoutMode: this.form.checkoutMode
        };

        this.saving = true;

        this.apiService.updateUser(this.user.id, payload).subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'User updated successfully.' });
            },
            error: (err) => {
                this.saving = false;
                console.error('[UserDetail] Save failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save user. Check console for details.' });
            }
        });
    }

    confirmDeleteUser() {
        if (!this.user) return;

        this.confirmationService.confirm({
            message: `Delete user "${this.user.email}"? This cannot be undone, and may affect their existing orders - confirm cascade behavior with your backend before relying on this.`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deleteUser()
        });
    }

    private deleteUser() {
        if (!this.user) return;

        this.apiService.deleteUser(this.user.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User deleted.' });
                this.goBack();
            },
            error: (err) => {
                console.error('[UserDetail] Delete failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete user.' });
            }
        });
    }

    // CONFIRM: adjust to your real users list route if different.
    goBack() {
        this.router.navigate(['/pages/users']);
    }
}
