import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ApiService } from '@/app/services/api-service';
import { InvoicePrintComponent } from '../invoice-print-component/invoice-print-component';

// Matches confirmed real response shape - camelCase throughout.
// Note: response field is `total` (number), not `"total"` string - no conversion needed.
interface SaleLineItem {
    id: string; // product id
    name: string;
    price: number;
    imageUrl: string;
    category: string;
    brand: string;
    quantity: number;
    orderId: string;
    total: number; // order total (same for all items in same order)
    orderStatus: string;
    paymentStatus: string;
    mode: 'delivery' | 'collection';
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: { street: string; city: string; state: string | null; zipCode: string; country: string } | null;
    } | null;
    shipping: {
        firstName: string;
        lastName: string;
        shippingAddress: string;
        shippingCity: string;
        shippingZipCode: string;
        shippingState: string | null;
        shippingCountry: string;
    } | null;
    collection: {
        collectionLocation: string;
        collectionDate: string;
        collectionTime: string;
    } | null;
}

// One card per unique orderId - same grouping pattern as the orders component.
// Response gives one row per line item; orders with multiple products would
// produce multiple rows for the same orderId.
interface GroupedSaleOrder {
    orderId: string;
    orderStatus: string;
    paymentStatus: string;
    mode: 'delivery' | 'collection';
    total: number;
    createdAt: string;
    updatedAt: string;
    items: { id: string; name: string; price: number; quantity: number; category: string; brand: string; imageUrl: string }[];
    user: SaleLineItem['user'];
    shipping: SaleLineItem['shipping'];
    collection: SaleLineItem['collection'];
}

// Flat row for the export CSV - one row per grouped order, not per line item.
// ALL_EXPORT_COLUMNS keys must exist on FlatExportRow.
interface FlatExportRow {
    orderId: string;
    createdAt: string;
    orderStatus: string;
    paymentStatus: string;
    mode: string;
    total: string;
    itemCount: string;
    itemNames: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    collectionLocation: string;
}

const ALL_EXPORT_COLUMNS: { field: keyof FlatExportRow; label: string }[] = [
    { field: 'orderId', label: 'Order ID' },
    { field: 'createdAt', label: 'Date' },
    { field: 'orderStatus', label: 'Order Status' },
    { field: 'paymentStatus', label: 'Payment Status' },
    { field: 'mode', label: 'Mode' },
    { field: 'total', label: 'Total (£)' },
    { field: 'itemCount', label: 'Item Count' },
    { field: 'itemNames', label: 'Items' },
    { field: 'customerName', label: 'Customer Name' },
    { field: 'customerEmail', label: 'Customer Email' },
    { field: 'customerPhone', label: 'Customer Phone' },
    { field: 'deliveryAddress', label: 'Delivery Address' },
    { field: 'collectionLocation', label: 'Collection Location' }
];

@Component({
    selector: 'app-yearly-sales',
    imports: [CommonModule, FormsModule, ButtonModule, TableModule, TagModule, InputTextModule, DatePickerModule, DialogModule, CheckboxModule, IconFieldModule, InputIconModule, InvoicePrintComponent],
    standalone: true,
    template: `
        <app-invoice-print [orders]="filteredOrders" [visible]="invoiceVisible" (close)="invoiceVisible = false"> </app-invoice-print>
        <div class="card sales-card">
            <div class="page-header">
                <div class="page-header-text">
                    <div class="page-title">Yearly Sales Report</div>
                    <div class="page-subtitle">Filter by date range, search records, and export to CSV</div>
                </div>
                <div class="flex gap-2">
                    <button pButton label="Export CSV" icon="pi pi-download" severity="secondary" class="export-btn" (click)="openExportDialog()"></button>
                    <button pButton label="Print All" icon="pi pi-print" severity="secondary" (click)="invoiceVisible = true"></button>
                </div>
            </div>

            <!-- FILTERS
                 Desktop (>=768px): all four controls in a single row.
                 Mobile (<768px): 2-column grid for date pickers, full-width search,
                 full-width Load button. Never wraps awkwardly mid-filter.
            -->
            <div class="filters-grid">
                <div class="filter-group">
                    <label class="filter-label">From</label>
                    <p-datepicker [(ngModel)]="fromDate" view="year" dateFormat="yy" [readonlyInput]="true" [showIcon]="true" placeholder="Start year" />
                </div>
                <div class="filter-group">
                    <label class="filter-label">To</label>
                    <p-datepicker [(ngModel)]="toDate" view="year" dateFormat="yy" [readonlyInput]="true" [showIcon]="true" placeholder="End year" />
                </div>
                <div class="filter-group filter-search">
                    <label class="filter-label">Search</label>
                    <p-iconfield iconPosition="left" class="w-full">
                        <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                        <input pInputText class="w-full" [(ngModel)]="searchTerm" placeholder="Order ID, customer, status..." (ngModelChange)="applySearch()" />
                    </p-iconfield>
                </div>
                <div class="filter-group filter-btn-group">
                    <label class="filter-label">&nbsp;</label>
                    <button pButton label="Load" icon="pi pi-refresh" class="w-full" (click)="onLoad()"></button>
                </div>
            </div>

            <!-- SUMMARY CARDS -->
            @if (hasLoaded && groupedOrders.length > 0) {
                <div class="summary-row">
                    <div class="summary-card">
                        <div class="summary-label">Total Revenue</div>
                        <div class="summary-value">{{ computedTotalRevenue | currency: 'GBP' }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Orders</div>
                        <div class="summary-value">{{ totalRecords }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Avg Order Value</div>
                        <div class="summary-value">
                            {{ totalRecords > 0 ? (computedTotalRevenue / totalRecords | currency: 'GBP') : '&mdash;' }}
                        </div>
                    </div>
                </div>
            }

            <!--
                TABLE (>=640px): standard PrimeNG table.
                CARDS (<640px): one card per order — an 8-column table is unreadable
                on a 375px viewport no matter how small you make the font.
                The card layout shows all the same data, just in a vertical stack.
            -->

            <!-- CARD VIEW - mobile only -->
            @if (hasLoaded) {
                <div class="mobile-order-list">
                    @if (filteredOrders.length === 0) {
                        <div class="empty-cell">No orders found for this period or search term.</div>
                    } @else {
                        @for (order of filteredOrders; track order.orderId) {
                            <div class="mobile-order-card">
                                <div class="mobile-order-header">
                                    <span class="mobile-order-id" [title]="order.orderId">{{ order.orderId }}</span>
                                    <p-tag [value]="order.orderStatus" [severity]="orderSeverity(order.orderStatus)"></p-tag>
                                </div>
                                <div class="mobile-order-meta">
                                    <span>{{ order.createdAt | date: 'dd MMM yyyy' }}</span>
                                    <p-tag [value]="order.mode === 'collection' ? 'Collection' : 'Delivery'" [severity]="order.mode === 'collection' ? 'info' : 'secondary'"></p-tag>
                                </div>
                                @if (order.user) {
                                    <div class="mobile-customer">
                                        <i class="pi pi-user"></i>
                                        {{ order.user.firstName }} {{ order.user.lastName }}
                                        <span class="mobile-customer-email">{{ order.user.email }}</span>
                                    </div>
                                }
                                <div class="mobile-items">
                                    @for (item of order.items; track item.id) {
                                        <span class="item-chip">{{ item.name }} &times;{{ item.quantity }}</span>
                                    }
                                </div>
                                <div class="mobile-order-footer">
                                    <p-tag [value]="order.paymentStatus" [severity]="paymentSeverity(order.paymentStatus)"></p-tag>
                                    <span class="mobile-total">{{ order.total | currency: 'GBP' }}</span>
                                </div>
                            </div>
                        }
                    }
                    <!-- Mobile paginator -->
                    @if (!searchTerm && totalRecords > limit) {
                        <div class="mobile-pager">
                            <button pButton icon="pi pi-chevron-left" [text]="true" [disabled]="page === 1" (click)="prevPage()"></button>
                            <span class="mobile-pager-label">Page {{ page }} of {{ totalPages }}</span>
                            <button pButton icon="pi pi-chevron-right" [text]="true" [disabled]="page >= totalPages" (click)="nextPage()"></button>
                        </div>
                    }
                </div>
            } @else if (!hasLoaded && !loading) {
                <div class="mobile-order-list">
                    <div class="empty-cell">Select a date range and click Load to view the report.</div>
                </div>
            }

            <!-- TABLE VIEW - tablet and desktop -->
            <div class="table-view">
                <p-table
                    [value]="filteredOrders"
                    [lazy]="true"
                    [paginator]="true"
                    [rows]="limit"
                    [first]="first"
                    [totalRecords]="searchTerm ? filteredOrders.length : totalRecords"
                    [loading]="loading"
                    [rowsPerPageOptions]="[10, 20, 50]"
                    (onPage)="onPageChange($event)"
                    styleClass="p-datatable-sm"
                >
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th class="hide-md">Items</th>
                            <th>Mode</th>
                            <th>Total</th>
                            <th class="hide-md">Payment</th>
                            <th>Status</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-order>
                        <tr>
                            <td class="order-id-cell" [title]="order.orderId">{{ order.orderId }}</td>
                            <td class="date-cell">{{ order.createdAt | date: 'dd MMM yyyy' }}</td>
                            <td>
                                @if (order.user) {
                                    <div class="customer-cell">
                                        <div class="customer-name">{{ order.user.firstName }} {{ order.user.lastName }}</div>
                                        <div class="customer-email">{{ order.user.email }}</div>
                                    </div>
                                } @else {
                                    <span class="muted-text">&mdash;</span>
                                }
                            </td>
                            <td class="hide-md">
                                <div class="items-cell">
                                    @for (item of order.items; track item.id) {
                                        <div class="item-chip">{{ item.name }} &times;{{ item.quantity }}</div>
                                    }
                                </div>
                            </td>
                            <td>
                                <p-tag [value]="order.mode === 'collection' ? 'Collection' : 'Delivery'" [severity]="order.mode === 'collection' ? 'info' : 'secondary'"></p-tag>
                            </td>
                            <td class="total-cell">{{ order.total | currency: 'GBP' }}</td>
                            <td class="hide-md">
                                <p-tag [value]="order.paymentStatus" [severity]="paymentSeverity(order.paymentStatus)"></p-tag>
                            </td>
                            <td>
                                <p-tag [value]="order.orderStatus" [severity]="orderSeverity(order.orderStatus)"></p-tag>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="8" class="empty-cell">
                                @if (!hasLoaded) {
                                    Select a date range and click Load to view the report.
                                } @else {
                                    No orders found for this period or search term.
                                }
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>

        <!-- EXPORT COLUMN PICKER - full-screen on mobile -->
        <p-dialog [(visible)]="exportDialogVisible" [modal]="true" header="Customise Export Columns" [style]="{ width: 'min(28rem, 95vw)' }">
            <div class="export-hint">Select columns and edit the CSV header label for each.</div>
            <div class="export-columns">
                @for (col of exportColumns; track col.field) {
                    <div class="export-col-row">
                        <p-checkbox [(ngModel)]="col.selected" [binary]="true" [inputId]="'col-' + col.field" />
                        <label [for]="'col-' + col.field" class="export-col-key">{{ col.field }}</label>
                        <input pInputText [(ngModel)]="col.label" class="export-col-header" placeholder="Header" [disabled]="!col.selected" />
                    </div>
                }
            </div>
            <ng-template pTemplate="footer">
                <button pButton label="Cancel" severity="secondary" (click)="exportDialogVisible = false"></button>
                <button pButton label="Export" icon="pi pi-download" (click)="exportCSV()"></button>
            </ng-template>
        </p-dialog>
    `,
    styles: `
        /* ── PAGE HEADER ─────────────────────────────────────── */
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        .page-title {
            font-size: 1.4rem;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .page-subtitle {
            font-size: 0.82rem;
            color: var(--p-text-muted-color, #9ca3af);
            margin-top: 0.15rem;
        }
        .export-btn {
            white-space: nowrap;
            flex-shrink: 0;
        }

        /* ── FILTERS ─────────────────────────────────────────── */
        /* Desktop: 4 columns (from | to | search grows | load)  */
        /* Tablet:  2+2 (dates row | search+load row)            */
        /* Mobile:  stacked, each full width                     */
        .filters-grid {
            display: grid;
            grid-template-columns: auto auto 1fr auto;
            gap: 0.75rem 1rem;
            align-items: end;
            margin-bottom: 1.25rem;
        }
        @media (max-width: 900px) {
            .filters-grid {
                grid-template-columns: 1fr 1fr;
            }
            .filter-search {
                grid-column: 1 / -1;
            }
            .filter-btn-group {
                grid-column: 1 / -1;
            }
        }
        @media (max-width: 480px) {
            .filters-grid {
                grid-template-columns: 1fr;
            }
            .filter-search {
                grid-column: unset;
            }
            .filter-btn-group {
                grid-column: unset;
            }
        }
        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
        }
        .filter-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }

        /* ── SUMMARY CARDS ───────────────────────────────────── */
        .summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        @media (max-width: 640px) {
            .summary-row {
                grid-template-columns: 1fr 1fr;
            }
        }
        @media (max-width: 360px) {
            .summary-row {
                grid-template-columns: 1fr;
            }
        }
        .summary-card {
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 12px;
            padding: 0.85rem 1rem;
        }
        .summary-label {
            font-size: 0.68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--p-text-muted-color, #9ca3af);
            margin-bottom: 0.25rem;
        }
        .summary-value {
            font-size: 1.4rem;
            font-weight: 700;
        }
        @media (max-width: 640px) {
            .summary-value {
                font-size: 1.2rem;
            }
        }

        /* ── MOBILE CARD LIST (hidden on >=640px) ─────────────── */
        .mobile-order-list {
            display: none;
        }
        @media (max-width: 639px) {
            .mobile-order-list {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
            }
            .table-view {
                display: none;
            }
        }

        .mobile-order-card {
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 10px;
            padding: 0.9rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .mobile-order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .mobile-order-id {
            font-family: monospace;
            font-size: 0.68rem;
            color: var(--p-text-muted-color, #9ca3af);
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .mobile-order-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.78rem;
            color: var(--p-text-muted-color, #6b7280);
        }
        .mobile-customer {
            display: flex;
            align-items: baseline;
            gap: 0.4rem;
            font-size: 0.82rem;
            font-weight: 600;
        }
        .mobile-customer i {
            font-size: 0.7rem;
            color: var(--p-primary-color, #6366f1);
        }
        .mobile-customer-email {
            font-size: 0.72rem;
            font-weight: 400;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .mobile-items {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
        }
        .mobile-order-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 0.4rem;
            border-top: 1px solid var(--p-content-border-color, #f0f0f0);
        }
        .mobile-total {
            font-size: 1rem;
            font-weight: 700;
        }

        .mobile-pager {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            padding: 0.5rem 0;
        }
        .mobile-pager-label {
            font-size: 0.82rem;
            color: var(--p-text-muted-color, #6b7280);
        }

        /* ── DESKTOP TABLE ───────────────────────────────────── */
        /* hide Items and Payment cols on mid-width screens where
           the table is present but viewport is narrow (640-900px) */
        @media (max-width: 900px) {
            .hide-md {
                display: none;
            }
        }

        .order-id-cell {
            font-family: monospace;
            font-size: 0.72rem;
            color: var(--p-text-muted-color, #6b7280);
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .date-cell {
            white-space: nowrap;
        }
        .total-cell {
            font-weight: 700;
        }
        .customer-cell {
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
        }
        .customer-name {
            font-size: 0.85rem;
            font-weight: 600;
        }
        .customer-email {
            font-size: 0.72rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .items-cell {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }

        .item-chip {
            font-size: 0.73rem;
            background: var(--p-surface-100, #f3f4f6);
            border-radius: 4px;
            padding: 0.15rem 0.4rem;
            white-space: nowrap;
        }
        .muted-text {
            font-size: 0.78rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .empty-cell {
            text-align: center;
            padding: 2rem;
            color: var(--p-text-muted-color, #9ca3af);
        }

        /* ── EXPORT DIALOG ───────────────────────────────────── */
        .export-hint {
            font-size: 0.82rem;
            color: var(--p-text-muted-color, #6b7280);
            margin-bottom: 0.75rem;
        }
        .export-columns {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 55vh;
            overflow-y: auto;
        }
        .export-col-row {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }
        .export-col-key {
            font-size: 0.73rem;
            font-family: monospace;
            color: var(--p-text-muted-color, #6b7280);
            min-width: 0;
            flex: 0 0 130px;
        }
        @media (max-width: 480px) {
            .export-col-key {
                flex: 0 0 90px;
                font-size: 0.65rem;
            }
        }
        .export-col-header {
            flex: 1;
            font-size: 0.82rem;
            min-width: 0;
        }
    `
})
export class YearlySales implements OnInit {
    groupedOrders: GroupedSaleOrder[] = [];
    filteredOrders: GroupedSaleOrder[] = [];

    loading = false;
    hasLoaded = false;
    searchTerm = '';

    currentYear = new Date().getFullYear();
    fromDate: Date = new Date(this.currentYear - 1, 0, 1); // Jan 1 previous year
    toDate: Date = new Date(this.currentYear, 0, 1); // Jan 1 current year

    page = 1;
    limit = 10;
    first = 0;
    totalRecords = 0;

    // Computed from loaded grouped orders - no summary block in this API response
    computedTotalRevenue = 0;
    invoiceVisible = false;

    exportDialogVisible = false;
    exportColumns: { field: keyof FlatExportRow; label: string; selected: boolean }[] = [];

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadReport();
    }

    private getFromDate(): string {
        const year = this.fromDate.getFullYear();
        return `${year}-01-01`;
    }

    private getToDate(): string {
        const year = this.toDate.getFullYear();
        return `${year}-12-31`;
    }

    get totalPages(): number {
        return Math.ceil(this.totalRecords / this.limit) || 1;
    }

    prevPage() {
        if (this.page <= 1) return;
        this.page--;
        this.first = (this.page - 1) * this.limit;
        this.loadReport();
    }

    nextPage() {
        if (this.page >= this.totalPages) return;
        this.page++;
        this.first = (this.page - 1) * this.limit;
        this.loadReport();
    }

    onLoad() {
        this.page = 1;
        this.first = 0;
        this.loadReport();
    }

    loadReport() {
        if (!this.fromDate || !this.toDate) return;
        this.loading = true;

        this.apiService.loadReport(this.getFromDate(), this.getToDate(), this.page, this.limit).subscribe({
            next: (res: any) => {
                const data = res?.data ?? {};
                const raw: SaleLineItem[] = data.orders ?? [];

                // pagination.total confirmed field name from real response
                this.totalRecords = data.pagination?.total ?? 0;

                // Group line items by orderId - same pattern as orders component.
                // Confirmed real issue: multiple rows share same orderId for
                // multi-item orders, as seen in your sample data.
                this.groupedOrders = this.groupByOrderId(raw);

                // Compute revenue from unique orders since API has no summary block.
                this.computedTotalRevenue = this.groupedOrders.reduce((sum, o) => sum + o.total, 0);

                this.hasLoaded = true;
                this.applySearch();
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                this.hasLoaded = true;
                console.error('[YearlySales] Failed to load report:', err);
                this.cd.detectChanges();
            }
        });
    }

    private groupByOrderId(rows: SaleLineItem[]): GroupedSaleOrder[] {
        const map = new Map<string, GroupedSaleOrder>();

        for (const row of rows) {
            const key = row.orderId;
            if (!key) continue;

            const item = {
                id: row.id,
                name: row.name,
                price: row.price,
                quantity: row.quantity,
                category: row.category,
                brand: row.brand,
                imageUrl: row.imageUrl
            };

            if (map.has(key)) {
                map.get(key)!.items.push(item);
            } else {
                map.set(key, {
                    orderId: key,
                    orderStatus: row.orderStatus,
                    paymentStatus: row.paymentStatus,
                    mode: row.mode,
                    total: row.total,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    items: [item],
                    user: row.user ?? null,
                    shipping: row.shipping ?? null,
                    collection: row.collection ?? null
                });
            }
        }

        return Array.from(map.values());
    }

    onPageChange(event: any) {
        this.first = event.first;
        this.limit = event.rows;
        this.page = Math.floor(event.first / event.rows) + 1;
        this.loadReport();
    }

    applySearch() {
        const term = this.searchTerm.trim().toLowerCase();
        this.filteredOrders = term
            ? this.groupedOrders.filter(
                  (o) =>
                      o.orderId.toLowerCase().includes(term) ||
                      o.orderStatus.toLowerCase().includes(term) ||
                      o.paymentStatus.toLowerCase().includes(term) ||
                      o.mode.toLowerCase().includes(term) ||
                      String(o.total).includes(term) ||
                      (o.user?.firstName ?? '').toLowerCase().includes(term) ||
                      (o.user?.lastName ?? '').toLowerCase().includes(term) ||
                      (o.user?.email ?? '').toLowerCase().includes(term) ||
                      o.items.some((i) => i.name.toLowerCase().includes(term))
              )
            : [...this.groupedOrders];
        this.cd.detectChanges();
    }

    openExportDialog() {
        this.exportColumns = ALL_EXPORT_COLUMNS.map((c) => ({ ...c, selected: true }));
        this.exportDialogVisible = true;
    }

    exportCSV() {
        const selected = this.exportColumns.filter((c) => c.selected);
        if (!selected.length) return;

        // Flatten grouped orders into one row per order for export.
        const flatRows: FlatExportRow[] = this.filteredOrders.map((o) => ({
            orderId: o.orderId,
            createdAt: new Date(o.createdAt).toLocaleString(),
            orderStatus: o.orderStatus,
            paymentStatus: o.paymentStatus,
            mode: o.mode,
            total: o.total.toFixed(2),
            itemCount: String(o.items.length),
            itemNames: o.items.map((i) => `${i.name} x${i.quantity}`).join(' | '),
            customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : '',
            customerEmail: o.user?.email ?? '',
            customerPhone: o.user?.phone ?? '',
            deliveryAddress: o.shipping ? [o.shipping.shippingAddress, o.shipping.shippingCity, o.shipping.shippingCountry].filter(Boolean).join(', ') : '',
            collectionLocation: o.collection?.collectionLocation ?? ''
        }));

        const header = selected.map((c) => this.csvEscape(c.label)).join(',');
        const rows = flatRows.map((row) => selected.map((c) => this.csvEscape(row[c.field] ?? '')).join(','));

        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report_${this.getFromDate()}_${this.getToDate()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportDialogVisible = false;
    }

    private csvEscape(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    paymentSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
        switch (status) {
            case 'completed':
                return 'success';
            case 'pending':
                return 'warn';
            case 'failed':
                return 'danger';
            default:
                return 'info';
        }
    }

    orderSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
        switch (status) {
            case 'completed':
                return 'success';
            case 'shipped':
                return 'info';
            case 'pending':
                return 'warn';
            case 'failed':
                return 'danger';
            default:
                return 'info';
        }
    }
}
