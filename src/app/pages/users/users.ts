import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ApiService } from '@/app/services/api-service';

// Mirrors the GET /api/user response shape exactly (camelCase, nested address).
// NOTE: password is intentionally never part of this model - your backend
// confirmed GET omits it, and this model has no field for it at all, so
// there is no path by which it could accidentally get sent back in a PUT.
export interface UserAddress {
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
}

export interface UserModel {
    id: number;
    firstName: string;
    lastName: string | null;
    displayName: string | null;
    email: string;
    phoneNumber: string | null;
    address: UserAddress | null;
    businessName: string | null;
    businessType: string | null;
    primaryCategory: string | null;
    monthlyOrders: number | null; // GET sends this as a string ("150") - converted to number here
    emailUpdates: boolean; // GET sends "true"/"false" strings - converted to real booleans here
    smsUpdates: boolean;
    marketingUpdates: boolean;
    role: 'USER' | 'ADMIN' | string;
    isActive: boolean;
    checkoutMode: 'collection' | 'delivery' | null;
    rowUpdating: boolean; // local UI flag for inline-toggle saves, not a server field
}

@Component({
    selector: 'app-users',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TableModule, ToastModule, ConfirmDialogModule, IconFieldModule, InputIconModule, TagModule, SelectModule, ToggleSwitchModule],
    standalone: true,
    template: `
        <div class="card">
            <p-toast />
            <p-confirmDialog />

            <div class="flex justify-between items-center mb-4">
                <div class="font-semibold text-xl">Users</div>
            </div>

            <p-table [value]="filteredUsers" [loading]="loading" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 50]" #dt>
                <ng-template pTemplate="caption">
                    <div class="flex justify-end">
                        <p-iconfield iconPosition="left">
                            <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                            <input pInputText type="text" placeholder="Search name or email" [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()" />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template pTemplate="header">
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Checkout Mode</th>
                        <th>Active</th>
                        <th style="width: 6rem">View</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-user>
                    <tr>
                        <td>
                            <div class="user-name-cell">
                                <div class="user-avatar">{{ initials(user) }}</div>
                                <div>
                                    <div class="user-name">{{ user.displayName || user.firstName + ' ' + (user.lastName || '') }}</div>
                                    <div class="user-business" *ngIf="user.businessName">{{ user.businessName }}</div>
                                </div>
                            </div>
                        </td>
                        <td>{{ user.email }}</td>
                        <td>
                            <p-select [options]="roleOptions" optionLabel="label" optionValue="value" [ngModel]="user.role" (onChange)="onInlineFieldChange(user, 'role', $event.value)" 
                            [disabled]="user.rowUpdating" styleClass="inline-select">
                            </p-select>
                        </td>
                        <td>
                            <p-select
                                [options]="checkoutModeOptions"
                                optionLabel="label"
                                optionValue="value"
                                [ngModel]="user.checkoutMode"
                                (onChange)="onInlineFieldChange(user, 'checkoutMode', $event.value)"
                                [disabled]="user.rowUpdating"
                                placeholder="Not set"
                                styleClass="inline-select"
                            >
                            </p-select>
                        </td>
                        <td>
                            <p-toggleswitch [ngModel]="user.isActive" (onChange)="onInlineFieldChange(user, 'isActive', $event.checked)" [disabled]="user.rowUpdating"> </p-toggleswitch>
                        </td>
                        <td>
                            <button pButton icon="pi pi-eye" severity="secondary" [rounded]="true" [text]="true" (click)="openUserDetail(user)"></button>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="6" class="text-center">No users found.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `,
    styles: `
        .user-name-cell {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }
        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--p-primary-100, #e0e7ff);
            color: var(--p-primary-color, #6366f1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.7rem;
            flex-shrink: 0;
        }
        .user-name {
            font-weight: 600;
            font-size: 0.88rem;
        }
        .user-business {
            font-size: 0.74rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        :host ::ng-deep .inline-select .p-select {
            min-width: 130px;
        }
    `,
    providers: [ConfirmationService, MessageService]
})
export class Users implements OnInit {
    users: UserModel[] = [];
    filteredUsers: UserModel[] = [];
    loading = true;
    searchTerm = '';

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
        private router: Router,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadUsers();
    }

    initials(user: UserModel): string {
        const first = user.firstName?.charAt(0) ?? '';
        const last = user.lastName?.charAt(0) ?? '';
        return (first + last).toUpperCase() || '?';
    }

    loadUsers() {
        this.loading = true;

        this.apiService.getUsers().subscribe({
            next: (res: any) => {
                const raw = res?.data.users ?? [];

                if (!Array.isArray(raw)) {
                    console.warn('[Users] /api/user returned an unexpected shape. Got:', res);
                    this.users = [];
                    this.filteredUsers = [];
                    this.loading = false;
                    this.cd.detectChanges();
                    return;
                }

                this.users = raw.map((u: any) => this.normalizeUser(u));
                this.applyFilter();
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                console.error('[Users] Failed to load users:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users.' });
                this.cd.detectChanges();
            }
        });
    }

    // GET sends monthlyOrders/emailUpdates/smsUpdates/marketingUpdates as STRINGS
    // ("150", "true", "false") even though they're conceptually number/boolean.
    // Converting explicitly here rather than trusting truthy/falsy coercion,
    // since the string "false" is truthy in JS and would silently break toggles.
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
            rowUpdating: true
        };
    }

    applyFilter() {
        const term = this.searchTerm.trim().toLowerCase();
        this.filteredUsers = term ? this.users.filter((u) => `${u.firstName} ${u.lastName ?? ''}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) : this.users;
    }

    // Partial PUT - your backend confirmed it accepts partial updates, so each
    // inline toggle sends ONLY the one field that changed, not the full user object.
    onInlineFieldChange(user: UserModel, field: 'role' | 'checkoutMode' | 'isActive', value: any) {
        const previousValue = (user as any)[field];
        if (previousValue === value) return;

          
        (user as any)[field] = value;

        this.apiService.updateUser(user.id, { [field]: value }).subscribe({
            next: () => {
                user.rowUpdating = false;
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: `${this.fieldLabel(field)} updated for ${user.firstName}.` });
                this.cd.detectChanges();
            },
            error: (err) => {
                user.rowUpdating = false;
                (user as any)[field] = previousValue; // revert on failure
                console.error(`[Users] Failed to update ${field}:`, err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to update ${this.fieldLabel(field)}.` });
                this.cd.detectChanges();
            }
        });
    }

    private fieldLabel(field: string): string {
        switch (field) {
            case 'role':
                return 'Role';
            case 'checkoutMode':
                return 'Checkout mode';
            case 'isActive':
                return 'Active status';
            default:
                return field;
        }
    }

    // CONFIRM: adjust the route path below to match your actual routing module
    // if user detail pages live somewhere other than /users/:id.
    openUserDetail(user: UserModel) {
        console.log(`/users/${user.id}`);
        this.router.navigate(['/pages/users', user.id]);
    }
}
