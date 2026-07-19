import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ApiService } from '@/app/services/api-service';

export interface CategoryModel {
    id: number;
    name: string;
    createdAt: string | null;
}

@Component({
    selector: 'app-categories',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TableModule, ToastModule, ConfirmDialogModule, DialogModule, IconFieldModule, InputIconModule],
    standalone: true,
    template: `
        <div class="card">
            <p-toast />
            <p-confirmDialog />

            <div class="flex justify-between items-center mb-4">
                <div class="font-semibold text-xl">Categories</div>
                <button pButton label="Add Category" icon="pi pi-plus" (click)="openAddDialog()"></button>
            </div>

            <p-table [value]="filteredCategories" sortField="id" [sortOrder]="-1" [loading]="loading" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 50]" [globalFilterFields]="['name']" #dt>
                <ng-template pTemplate="caption">
                    <div class="flex justify-end">
                        <p-iconfield iconPosition="left">
                            <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                            <input pInputText type="text" placeholder="Search categories" [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()" />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template pTemplate="header">
                    <tr>
                        <th pSortableColumn="id" style="width:20%">ID <p-sortIcon field="id"></p-sortIcon></th>
                        <th pSortableColumn="name" style="width:80%">Name <p-sortIcon field="name"></p-sortIcon></th>
                        <th style="width: 10rem">Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-category>
                    <tr>
                        <td class="muted-id">{{ category.id }}</td>
                        <td>{{ category.name }}</td>
                        <td>
                            <div class="flex gap-2">
                                <button pButton icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" (click)="openEditDialog(category)"></button>
                                <button pButton icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (click)="confirmDelete(category)"></button>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="3" class="text-center">No categories found.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <!-- ADD / EDIT DIALOG -->
        <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '26rem' }" [header]="isEditMode ? 'Edit Category' : 'Add Category'">
            <div class="field">
                <label class="field-label">Category Name</label>
                <input pInputText class="w-full" [(ngModel)]="form.name" (keyup.enter)="saveCategory()" autofocus />
            </div>

            <ng-template pTemplate="footer">
                <button pButton label="Cancel" severity="secondary" (click)="dialogVisible = false"></button>
                <button pButton label="Save" [loading]="saving" (click)="saveCategory()"></button>
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .muted-id {
            color: var(--p-text-muted-color, #9ca3af);
            font-family: monospace;
            font-size: 0.85rem;
        }
        .field {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .field-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }
    `,
    providers: [ConfirmationService, MessageService]
})
export class Categories implements OnInit {
    categories: CategoryModel[] = [];
    filteredCategories: CategoryModel[] = [];
    loading = true;
    searchTerm = '';

    dialogVisible = false;
    isEditMode = false;
    saving = false;
    form: { id: number | null; name: string } = { id: null, name: '' };

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadCategories();
    }

    loadCategories() {
        this.loading = true;

        this.apiService.getCategories().subscribe({
            next: (res: any) => {
                const raw = res?.data ?? [];

                if (!Array.isArray(raw)) {
                    console.warn('[Categories] /api/categories returned an unexpected shape. Got:', res);
                    this.categories = [];
                    this.filteredCategories = [];
                    this.loading = false;
                    this.cd.detectChanges();
                    return;
                }

                this.categories = raw
                    .map((c: any) => ({
                        id: Number(c.id),
                        name: c.name,
                        createdAt: c.created_at ?? null
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                this.applyFilter();
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                console.error('[Categories] Failed to load categories:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load categories.' });
                this.cd.detectChanges();
            }
        });
    }

    applyFilter() {
        const term = this.searchTerm.trim().toLowerCase();
        this.filteredCategories = term ? this.categories.filter((c) => c.name.toLowerCase().includes(term)) : this.categories;
    }

    openAddDialog() {
        this.isEditMode = false;
        this.form = { id: null, name: '' };
        this.dialogVisible = true;
    }

    openEditDialog(category: CategoryModel) {
        this.isEditMode = true;
        this.form = { id: category.id, name: category.name };
        this.dialogVisible = true;
    }

    saveCategory() {
        const trimmedName = this.form.name?.trim();
        if (!trimmedName) {
            this.messageService.add({ severity: 'warn', summary: 'Missing name', detail: 'Category name is required.' });
            return;
        }

        // Quick client-side duplicate check against the loaded list - not a
        // substitute for backend validation, just avoids an obvious round trip.
        const isDuplicate = this.categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== this.form.id);
        if (isDuplicate) {
            this.messageService.add({ severity: 'warn', summary: 'Duplicate name', detail: 'A category with this name already exists.' });
            return;
        }

        this.saving = true;

        const request$ = this.isEditMode && this.form.id != null ? this.apiService.updateCategory(this.form.id, trimmedName) : this.apiService.createCategory(trimmedName);

        request$.subscribe({
            next: () => {
                this.saving = false;
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Success', detail: this.isEditMode ? 'Category updated' : 'Category created' });
                this.loadCategories();
            },
            error: (err) => {
                this.saving = false;
                console.error('[Categories] Save failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save category. Check console for details.' });
            }
        });
    }

    confirmDelete(category: CategoryModel) {
        this.confirmationService.confirm({
            message: `Delete category "${category.name}"? Products using this category may be affected - check with your backend on cascade behavior before confirming.`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deleteCategory(category)
        });
    }

    private deleteCategory(category: CategoryModel) {
        this.apiService.deleteCategory(category.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${category.name}" was deleted.` });
                this.loadCategories();
            },
            error: (err) => {
                console.error('[Categories] Delete failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete category. It may be in use by existing products.' });
            }
        });
    }
}
