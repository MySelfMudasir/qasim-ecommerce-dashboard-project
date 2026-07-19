import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ApiService } from '@/app/services/api-service';

export interface ProductModel {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    gallery: string[]; // mapped from res.data.products[].images - confirmed field name
    rating: number;
    reviewCount: number;
    inStock: boolean;
    storageType: string;
    size: string;
    category: string;
    categoryId: number;
    brand: string;
    brandId: number;
}

export interface OptionItem {
    label: string;
    value: number;
}

interface GalleryExistingItem {
    kind: 'existing';
    url: string;
}
interface GalleryNewItem {
    kind: 'new';
    file: File;
    previewUrl: string;
}
type GalleryItem = GalleryExistingItem | GalleryNewItem;

interface ProductFormState {
    id: number | null;
    name: string;
    description: string;
    price: number | null;
    categoryId: number | null;
    brandId: number | null;
    storageType: string;
    size: string;
    inStock: boolean;
    thumbnailFile: File | null;
    thumbnailPreviewUrl: string | null;
    existingThumbnailUrl: string | null;
    gallery: GalleryItem[];
    removedGalleryUrls: string[];
}

@Component({
    selector: 'app-products',
    imports: [
        TableModule,
        SelectModule,
        InputIconModule,
        TagModule,
        InputTextModule,
        ToastModule,
        CommonModule,
        FormsModule,
        ButtonModule,
        RatingModule,
        RippleModule,
        IconFieldModule,
        DialogModule,
        ConfirmDialogModule,
        TextareaModule,
        ToggleSwitchModule
    ],
    standalone: true,
    template: `
        <div class="card">
            <p-toast />
            <p-confirmDialog />

            <div class="flex justify-between items-center mb-4">
                <div class="font-semibold text-xl">Products</div>
                <button pButton label="Add Product" icon="pi pi-plus" (click)="openAddDialog()"></button>
            </div>

            <div class="grid grid-cols-12 gap-3 mb-4">
                <div class="col-span-12 md:col-span-3">
                    <input pInputText class="w-full" [(ngModel)]="search" placeholder="Search Product" (keyup.enter)="searchProducts()" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <p-select class="w-full" [options]="categories" optionLabel="label" optionValue="value" [(ngModel)]="category" placeholder="Category" [showClear]="true" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <p-select class="w-full" [options]="brands" optionLabel="label" optionValue="value" [(ngModel)]="brand" placeholder="Brand" [showClear]="true" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <input pInputText class="w-full" [(ngModel)]="storageType" placeholder="Storage Type" (keyup.enter)="searchProducts()" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <input pInputText class="w-full" [(ngModel)]="size" placeholder="Size" (keyup.enter)="searchProducts()" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <p-select class="w-full" [options]="stockOptions" optionLabel="label" optionValue="value" [(ngModel)]="inStock" placeholder="Stock Status" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <input pInputText type="number" class="w-full" [(ngModel)]="minPrice" placeholder="Min Price" (keyup.enter)="searchProducts()" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <input pInputText type="number" class="w-full" [(ngModel)]="maxPrice" placeholder="Max Price" (keyup.enter)="searchProducts()" />
                </div>
                <div class="col-span-12 md:col-span-3 flex gap-2">
                    <button pButton label="Search" icon="pi pi-search" class="flex-1" (click)="searchProducts()"></button>
                    <button pButton label="Clear" icon="pi pi-times" severity="secondary" class="flex-1" (click)="clearFilters()"></button>
                </div>
            </div>

            <p-table
                [value]="products"
                [lazy]="true"
                [paginator]="true"
                [rows]="limit"
                [first]="first"
                [totalRecords]="totalRecords"
                [loading]="loading"
                [rowsPerPageOptions]="[2, 10, 20, 50]"
                (onPage)="onPageChange($event)"
            >
                <ng-template pTemplate="header">
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Storage</th>
                        <th>Size</th>
                        <th>Price</th>
                        <th>Rating</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-product>
                    <tr>
                        <td><img [src]="product.imageUrl" width="60" alt="product" /></td>
                        <td>{{ product.name }}</td>
                        <td>{{ product.category }}</td>
                        <td>{{ product.brand }}</td>
                        <td>{{ product.storageType }}</td>
                        <td>{{ product.size }}</td>
                        <td>{{ product.price | currency }}</td>
                        <td><p-rating [(ngModel)]="product.rating" [readonly]="true"></p-rating></td>
                        <td>
                            <p-tag [value]="product.inStock ? 'In Stock' : 'Out Of Stock'" [severity]="product.inStock ? 'success' : 'danger'"></p-tag>
                        </td>
                        <td>
                            <div class="flex gap-2">
                                <button pButton icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" (click)="openEditDialog(product)"></button>
                                <button pButton icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (click)="confirmDelete(product)"></button>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="10">No products found.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [(visible)]="dialogVisible" [modal]="true" [draggable]="false" styleClass="product-dialog" [header]="isEditMode ? 'Edit Product' : 'Add Product'">
            <div class="form-grid">
                <div class="field">
                    <label class="field-label">Name</label>
                    <input pInputText class="w-full" [(ngModel)]="form.name" />
                </div>
                <div class="field">
                    <label class="field-label">Description</label>
                    <textarea pTextarea class="w-full" rows="3" [(ngModel)]="form.description"></textarea>
                </div>
                <div class="field-row">
                    <div class="field flex-1">
                        <label class="field-label">Price</label>
                        <input pInputText type="number" class="w-full" [(ngModel)]="form.price" />
                    </div>
                    <div class="field flex-1">
                        <label class="field-label">Category</label>
                        <p-select class="w-full" [options]="categories" optionLabel="label" optionValue="value" [(ngModel)]="form.categoryId" placeholder="Select category" />
                    </div>
                </div>
                <div class="field-row">
                    <div class="field flex-1">
                        <label class="field-label">Brand</label>
                        <p-select class="w-full" [options]="brands" optionLabel="label" optionValue="value" [(ngModel)]="form.brandId" placeholder="Select brand" />
                    </div>
                    <div class="field flex-1">
                        <label class="field-label">Storage Type</label>
                        <input pInputText class="w-full" [(ngModel)]="form.storageType" />
                    </div>
                </div>
                <div class="field-row">
                    <div class="field flex-1">
                        <label class="field-label">Size</label>
                        <input pInputText class="w-full" [(ngModel)]="form.size" />
                    </div>
                    <div class="field flex items-center gap-2 stock-toggle">
                        <p-toggleswitch [(ngModel)]="form.inStock" />
                        <label>In Stock</label>
                    </div>
                </div>

                <div class="field">
                    <label class="field-label">Thumbnail</label>
                    <div
                        class="dropzone thumb-dropzone"
                        [class.drag-over]="thumbDragOver"
                        (dragover)="onDragOver($event, 'thumb')"
                        (dragleave)="onDragLeave('thumb')"
                        (drop)="onThumbDrop($event)"
                        (click)="thumbInput.click()"
                    >
                        @if (thumbPreviewSrc) {
                            <img [src]="thumbPreviewSrc" class="thumb-preview" alt="thumbnail preview" />
                            <button pButton icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" class="remove-btn" (click)="removeThumbnail($event)"></button>
                        } @else {
                            <i class="pi pi-image dropzone-icon"></i>
                            <span class="dropzone-text">Drag &amp; drop an image, or click to browse</span>
                        }
                    </div>
                    <input #thumbInput type="file" accept="image/*" class="hidden-input" (change)="onThumbSelected($event)" />
                </div>

                <div class="field">
                    <label class="field-label">Gallery <span class="field-hint">(up to 10 images)</span></label>
                    <div
                        class="dropzone gallery-dropzone"
                        [class.drag-over]="galleryDragOver"
                        [class.disabled]="form.gallery.length >= 10"
                        (dragover)="onDragOver($event, 'gallery')"
                        (dragleave)="onDragLeave('gallery')"
                        (drop)="onGalleryDrop($event)"
                        (click)="form.gallery.length < 10 && galleryInput.click()"
                    >
                        <i class="pi pi-images dropzone-icon"></i>
                        <span class="dropzone-text">
                            @if (form.gallery.length >= 10) {
                                Gallery limit reached (10/10)
                            } @else {
                                Drag &amp; drop images, or click to browse ({{ form.gallery.length }}/10)
                            }
                        </span>
                    </div>
                    <input #galleryInput type="file" accept="image/*" multiple class="hidden-input" (change)="onGallerySelected($event)" />
                    @if (form.gallery.length > 0) {
                        <div class="gallery-grid">
                            @for (item of form.gallery; track $index) {
                                <div class="gallery-thumb">
                                    <img [src]="item.kind === 'existing' ? item.url : item.previewUrl" alt="gallery image" />
                                    <button pButton icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" class="remove-btn" (click)="removeGalleryItem($index, $event)"></button>
                                    @if (item.kind === 'new') {
                                        <span class="new-badge">New</span>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <ng-template pTemplate="footer">
                <button pButton label="Cancel" severity="secondary" (click)="dialogVisible = false"></button>
                <button pButton label="Save" [loading]="saving" (click)="saveProduct()"></button>
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .p-datatable-frozen-tbody { font-weight: bold; }
        .p-datatable-scrollable .p-frozen-column { font-weight: bold; }

        :host ::ng-deep .product-dialog { width: 36rem; max-width: 95vw; }
        @media (max-width: 640px) {
            :host ::ng-deep .product-dialog { width: 100vw; max-width: 100vw; height: 100%; max-height: 100%; margin: 0; }
        }
        .form-grid { display: flex; flex-direction: column; gap: 1rem; }
        .field { display: flex; flex-direction: column; }
        .field-row { display: flex; gap: 1rem; }
        @media (max-width: 640px) { .field-row { flex-direction: column; } }
        .field-label { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; color: var(--p-text-muted-color, #6b7280); }
        .field-hint { font-weight: 400; font-size: 0.75rem; color: var(--p-text-muted-color, #9ca3af); }
        .stock-toggle { justify-content: flex-start; padding-bottom: 0.4rem; }
        .hidden-input { display: none; }
        .dropzone {
            border: 2px dashed var(--p-content-border-color, #d1d5db);
            border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;
            transition: border-color 0.15s ease, background-color 0.15s ease;
            position: relative; min-height: 110px; text-align: center;
        }
        .dropzone:hover { border-color: var(--p-primary-color, #6366f1); }
        .dropzone.drag-over { border-color: var(--p-primary-color, #6366f1); background-color: var(--p-primary-50, #eef2ff); }
        .dropzone.disabled { cursor: not-allowed; opacity: 0.6; }
        .dropzone-icon { font-size: 1.75rem; color: var(--p-text-muted-color, #9ca3af); }
        .dropzone-text { font-size: 0.85rem; color: var(--p-text-muted-color, #6b7280); }
        .thumb-dropzone { padding: 0; overflow: hidden; min-height: 140px; }
        .thumb-preview { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.6rem; margin-top: 0.75rem; }
        .gallery-thumb { position: relative; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--p-content-border-color, #e5e7eb); }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .new-badge { position: absolute; bottom: 4px; left: 4px; background: var(--p-primary-color, #6366f1); color: #fff; font-size: 0.6rem; padding: 1px 6px; border-radius: 4px; }
        .remove-btn { position: absolute; top: 2px; right: 2px; width: 1.75rem; height: 1.75rem; background: rgba(255,255,255,0.85) !important; }
    `,
    providers: [ConfirmationService, MessageService]
})
export class Products implements OnInit {
    products: ProductModel[] = [];
    categories: OptionItem[] = [];
    brands: OptionItem[] = [];

    stockOptions: { label: string; value: boolean | null }[] = [
        { label: 'In / Out of Stock', value: null },
        { label: 'In Stock', value: true },
        { label: 'Out Of Stock', value: false }
    ];

    first = 0;
    search = '';
    category = '';
    brand = '';
    storageType = '';
    size = '';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean | null;

    totalRecords = 0;
    loading = true;
    page = 1;
    limit = 10;

    dialogVisible = false;
    isEditMode = false;
    saving = false;
    form: ProductFormState = this.emptyForm();
    thumbDragOver = false;
    galleryDragOver = false;

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadCategories();
        this.loadBrands();
        this.loadProducts();
    }

    get thumbPreviewSrc(): string | null {
        return this.form.thumbnailPreviewUrl ?? this.form.existingThumbnailUrl;
    }

    private emptyForm(): ProductFormState {
        return {
            id: null, name: '', description: '', price: null,
            categoryId: null, brandId: null, storageType: '', size: '',
            inStock: true, thumbnailFile: null, thumbnailPreviewUrl: null,
            existingThumbnailUrl: null, gallery: [], removedGalleryUrls: []
        };
    }

    loadCategories() {
        this.apiService.getCategories().subscribe({
            next: (res: any) => {
                const raw = res?.data ?? res ?? [];
                if (!Array.isArray(raw) || raw.length === 0) {
                    console.warn('[Products] /api/categories unexpected shape:', res);
                    this.categories = [];
                    return;
                }
                this.categories = raw.map((c: any, index: number) => {
                    const label = c.name ?? c.category ?? c.label ?? String(c);
                    const value = c.id != null ? Number(c.id) : index;
                    if (c.id == null) console.warn('[Products] Category item has no id:', c);
                    return { label, value };
                });
                this.cd.detectChanges();
            },
            error: (err) => { console.error('[Products] Failed to load categories:', err); this.categories = []; }
        });
    }

    loadBrands() {
        this.apiService.getBrands().subscribe({
            next: (res: any) => {
                const raw = res?.data ?? res ?? [];
                if (!Array.isArray(raw) || raw.length === 0) {
                    console.warn('[Products] /api/brands unexpected shape:', res);
                    this.brands = [];
                    return;
                }
                this.brands = raw.map((b: any, index: number) => {
                    const label = b.name ?? b.brand ?? b.label ?? String(b);
                    const value = b.id != null ? Number(b.id) : index;
                    if (b.id == null) console.warn('[Products] Brand item has no id:', b);
                    return { label, value };
                });
                this.cd.detectChanges();
            },
            error: (err) => { console.error('[Products] Failed to load brands:', err); this.brands = []; }
        });
    }

    loadProducts() {
        this.loading = true;

        this.apiService
            .loadProducts(this.search, this.category, this.brand, this.storageType, this.size, this.minPrice, this.maxPrice, this.inStock ?? undefined, this.limit, this.page)
            .subscribe({
                next: (res: any) => {
                    // FIX 1: real response is res.data.products, not res.data.
                    // res.data is { products: [...], pagination: {...} } - an object,
                    // not an array. Using res.data directly caused .map() to fail and
                    // produce zero rows.
                    const products = res?.data?.products ?? [];

                    // FIX 2: real pagination is at res.data.pagination.total.
                    // Previous code checked res.totalRecords / res.total / res.count -
                    // none of those exist on this response, so it always fell back to
                    // products.length, making the paginator think there's only one page.
                    this.totalRecords = res?.data?.pagination?.total ?? products.length;

                    this.products = products.map((item: any) => ({
                        id: Number(item.id),
                        name: item.name?.trim(),
                        description: item.description?.trim(),
                        price: Number(item.price),
                        imageUrl: item.imageUrl,
                        // FIX 3: real field is `images`, not `gallery`.
                        // Previous code read item.gallery which doesn't exist,
                        // so edit dialog never showed existing images.
                        gallery: Array.isArray(item.images) ? item.images : [],
                        rating: Number(item.rating),
                        reviewCount: Number(item.reviewCount),
                        inStock: item.inStock,
                        storageType: item.storageType?.trim(),
                        size: item.size?.trim(),
                        category: item.category?.trim(),
                        categoryId: Number(item.categoryId),
                        brand: item.brand?.trim(),
                        brandId: Number(item.brandId)
                    }));

                    this.loading = false;
                    this.cd.detectChanges();
                },
                error: (err) => {
                    this.loading = false;
                    console.error('[Products] Failed to load products:', err);
                    this.cd.detectChanges();
                }
            });
    }

    searchProducts() {
        this.page = 1;
        this.first = 0;
        this.loadProducts();
    }

    clearFilters() {
        this.search = '';
        this.category = '';
        this.brand = '';
        this.storageType = '';
        this.size = '';
        this.minPrice = undefined;
        this.maxPrice = undefined;
        this.inStock = null;
        this.page = 1;
        this.first = 0;
        this.loadProducts();
    }

    onPageChange(event: any) {
        this.first = event.first;
        this.limit = event.rows;
        this.page = Math.floor(event.first / event.rows) + 1;
        this.loadProducts();
    }

    openAddDialog() {
        this.isEditMode = false;
        this.form = this.emptyForm();
        this.dialogVisible = true;
    }

    openEditDialog(product: ProductModel) {
        this.isEditMode = true;
        this.form = {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            categoryId: product.categoryId,
            brandId: product.brandId,
            storageType: product.storageType,
            size: product.size,
            inStock: product.inStock,
            thumbnailFile: null,
            thumbnailPreviewUrl: null,
            existingThumbnailUrl: product.imageUrl,
            gallery: (product.gallery ?? []).map((url) => ({ kind: 'existing' as const, url })),
            removedGalleryUrls: []
        };
        this.dialogVisible = true;
    }

    onDragOver(event: DragEvent, zone: 'thumb' | 'gallery') {
        event.preventDefault();
        event.stopPropagation();
        if (zone === 'thumb') this.thumbDragOver = true;
        else this.galleryDragOver = true;
    }

    onDragLeave(zone: 'thumb' | 'gallery') {
        if (zone === 'thumb') this.thumbDragOver = false;
        else this.galleryDragOver = false;
    }

    onThumbDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.thumbDragOver = false;
        const file = event.dataTransfer?.files?.[0];
        if (file) this.setThumbnail(file);
    }

    onThumbSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) this.setThumbnail(file);
        input.value = '';
    }

    private setThumbnail(file: File) {
        if (!file.type.startsWith('image/')) {
            this.messageService.add({ severity: 'warn', summary: 'Invalid file', detail: 'Please choose an image file.' });
            return;
        }
        if (this.form.thumbnailPreviewUrl) URL.revokeObjectURL(this.form.thumbnailPreviewUrl);
        this.form.thumbnailFile = file;
        this.form.thumbnailPreviewUrl = URL.createObjectURL(file);
    }

    removeThumbnail(event: Event) {
        event.stopPropagation();
        if (this.form.thumbnailPreviewUrl) URL.revokeObjectURL(this.form.thumbnailPreviewUrl);
        this.form.thumbnailFile = null;
        this.form.thumbnailPreviewUrl = null;
        this.form.existingThumbnailUrl = null;
    }

    onGalleryDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.galleryDragOver = false;
        const files = event.dataTransfer?.files;
        if (files) this.addGalleryFiles(Array.from(files));
    }

    onGallerySelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) this.addGalleryFiles(Array.from(input.files));
        input.value = '';
    }

    private addGalleryFiles(files: File[]) {
        const remainingSlots = 10 - this.form.gallery.length;
        if (remainingSlots <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Gallery full', detail: 'Maximum 10 images allowed.' });
            return;
        }
        const validFiles = files.filter((f) => f.type.startsWith('image/'));
        if (validFiles.length < files.length) {
            this.messageService.add({ severity: 'warn', summary: 'Some files skipped', detail: 'Only image files are allowed.' });
        }
        const toAdd = validFiles.slice(0, remainingSlots);
        if (validFiles.length > remainingSlots) {
            this.messageService.add({ severity: 'warn', summary: 'Gallery limit', detail: `Only added ${toAdd.length} - limit is 10 total.` });
        }
        for (const file of toAdd) {
            this.form.gallery.push({ kind: 'new', file, previewUrl: URL.createObjectURL(file) });
        }
    }

    removeGalleryItem(index: number, event: Event) {
        event.stopPropagation();
        const item = this.form.gallery[index];
        if (item.kind === 'new') {
            URL.revokeObjectURL(item.previewUrl);
        } else {
            this.form.removedGalleryUrls.push(item.url);
        }
        this.form.gallery.splice(index, 1);
    }

    saveProduct() {
        if (!this.form.name || !this.form.price || !this.form.categoryId || !this.form.brandId) {
            this.messageService.add({ severity: 'warn', summary: 'Missing fields', detail: 'Name, price, category, and brand are required.' });
            return;
        }

        const formData = new FormData();
        formData.append('name', this.form.name);
        formData.append('description', this.form.description ?? '');
        formData.append('price', String(this.form.price));
        formData.append('categoryId', String(this.form.categoryId));
        formData.append('brandId', String(this.form.brandId));
        formData.append('storageType', this.form.storageType ?? '');
        formData.append('size', this.form.size ?? '');
        formData.append('inStock', String(this.form.inStock));

        if (this.form.thumbnailFile) formData.append('thumbnail', this.form.thumbnailFile);
        for (const item of this.form.gallery) {
            if (item.kind === 'new') formData.append('gallery', item.file);
        }
        if (this.isEditMode && this.form.removedGalleryUrls.length > 0) {
            formData.append('removedGallery', JSON.stringify(this.form.removedGalleryUrls));
        }

        this.saving = true;

        const request$ = this.isEditMode && this.form.id != null
            ? this.apiService.updateProduct(this.form.id, formData)
            : this.apiService.createProduct(formData);

        request$.subscribe({
            next: () => {
                this.saving = false;
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Success', detail: this.isEditMode ? 'Product updated' : 'Product created' });
                this.loadProducts();
            },
            error: (err) => {
                this.saving = false;
                console.error('[Products] Save failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save product. Check console for details.' });
            }
        });
    }

    confirmDelete(product: ProductModel) {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deleteProduct(product)
        });
    }

    private deleteProduct(product: ProductModel) {
        this.apiService.deleteProduct(product.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${product.name}" was deleted.` });
                this.loadProducts();
            },
            error: (err) => {
                console.error('[Products] Delete failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete product.' });
            }
        });
    }
}