import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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

interface SaleOrder {
    id: string;
    user_id: string;
    total: string;
    payment_status: string;
    order_status: string;
    mode: string;
    collection_location: string | null;
    collection_date: string | null;
    shipping_first_name: string | null;
    shipping_last_name: string | null;
    shipping_city: string | null;
    shipping_country: string | null;
    created_at: string;
}

interface SummaryStats {
    totalSales: number;
    totalOrders: number;
}

const ALL_EXPORT_COLUMNS: { field: keyof SaleOrder; label: string }[] = [
    { field: 'id', label: 'Order ID' },
    { field: 'user_id', label: 'User ID' },
    { field: 'total', label: 'Total' },
    { field: 'payment_status', label: 'Payment Status' },
    { field: 'order_status', label: 'Order Status' },
    { field: 'mode', label: 'Mode' },
    { field: 'collection_location', label: 'Collection Location' },
    { field: 'collection_date', label: 'Collection Date' },
    { field: 'shipping_first_name', label: 'Ship First Name' },
    { field: 'shipping_last_name', label: 'Ship Last Name' },
    { field: 'shipping_city', label: 'Ship City' },
    { field: 'shipping_country', label: 'Ship Country' },
    { field: 'created_at', label: 'Created At' }
];

@Component({
    selector: 'app-weekly-sales',
    imports: [CommonModule, FormsModule, ButtonModule, TableModule, TagModule, InputTextModule, DatePickerModule, DialogModule, CheckboxModule, IconFieldModule, InputIconModule],
    standalone: true,
    template: `
        <div class="card">
            <div class="page-header">
                <div>
                    <div class="page-title">Weekly Sales Report</div>
                    <div class="page-subtitle">Filter by date range, search records, and export to CSV</div>
                </div>
                <button pButton label="Export CSV" icon="pi pi-download" severity="secondary" (click)="openExportDialog()"></button>
            </div>

            <div class="filters-bar">
                <div class="filter-group">
                    <label class="filter-label">From</label>
                    <p-datepicker [(ngModel)]="fromDate" dateFormat="yy-mm-dd" [readonlyInput]="true" [showIcon]="true" placeholder="Start date" />
                </div>
                <div class="filter-group">
                    <label class="filter-label">To</label>
                    <p-datepicker [(ngModel)]="toDate" dateFormat="yy-mm-dd" [readonlyInput]="true" [showIcon]="true" placeholder="End date" />
                </div>
                <div class="filter-group search-group">
                    <label class="filter-label">Search</label>
                    <p-iconfield iconPosition="left">
                        <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                        <input pInputText [(ngModel)]="searchTerm" placeholder="Order ID, status, mode..." (ngModelChange)="applySearch()" />
                    </p-iconfield>
                </div>
                <div class="filter-group">
                    <label class="filter-label">&nbsp;</label>
                    <button pButton label="Load" icon="pi pi-refresh" (click)="onLoad()"></button>
                </div>
            </div>

            @if (summary) {
                <div class="summary-row">
                    <div class="summary-card">
                        <div class="summary-label">Total Revenue</div>
                        <div class="summary-value">{{ summary.totalSales | currency: 'GBP' }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Orders</div>
                        <div class="summary-value">{{ summary.totalOrders }}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Avg Order Value</div>
                        <div class="summary-value">
                            {{ summary.totalOrders > 0 ? (summary.totalSales / summary.totalOrders | currency: 'GBP') : '&mdash;' }}
                        </div>
                    </div>
                </div>
            }

            <p-table
                [value]="filteredOrders"
                [lazy]="true"
                [paginator]="true"
                [rows]="limit"
                [first]="first"
                [totalRecords]="searchTerm ? filteredOrders.length : totalRecords"
                [loading]="loading"
                [rowsPerPageOptions]="[2, 10, 20, 50]"
                (onPage)="onPageChange($event)"
                styleClass="p-datatable-sm"
            >
                <ng-template pTemplate="header">
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Destination</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-order>
                    <tr>
                        <td class="order-id-cell" [title]="order.id">{{ order.id }}</td>
                        <td>{{ order.created_at | date: 'dd MMM yyyy, HH:mm' }}</td>
                        <td>
                            <p-tag [value]="order.mode === 'collection' ? 'Collection' : 'Delivery'" [severity]="order.mode === 'collection' ? 'info' : 'secondary'"></p-tag>
                        </td>
                        <td class="total-cell">{{ +order.total | currency: 'GBP' }}</td>
                        <td>
                            <p-tag [value]="order.payment_status" [severity]="paymentSeverity(order.payment_status)"></p-tag>
                        </td>
                        <td>
                            <p-tag [value]="order.order_status" [severity]="orderSeverity(order.order_status)"></p-tag>
                        </td>
                        <td class="destination-cell">
                            @if (order.mode === 'collection' && order.collection_location) {
                                <span class="muted-text" [title]="order.collection_location">{{ order.collection_location }}</span>
                            } @else if (order.shipping_city || order.shipping_country) {
                                <!-- <span class="muted-text">{{ [order.shipping_city, order.shipping_country].filter(Boolean).join(', ') }}</span> -->
                            } @else {
                                <span class="muted-text">&mdash;</span>
                            }
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="7" class="empty-cell">
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

        <!-- EXPORT COLUMN PICKER -->
        <p-dialog [(visible)]="exportDialogVisible" [modal]="true" header="Customise Export Columns" [style]="{ width: '28rem' }">
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
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
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
        .filters-bar {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: flex-end;
            margin-bottom: 1.25rem;
        }
        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
        }
        .search-group {
            flex: 1;
            min-width: 200px;
        }
        .filter-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }
        .summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        @media (max-width: 640px) {
            .summary-row {
                grid-template-columns: 1fr;
            }
            .filters-bar {
                flex-direction: column;
            }
        }
        .summary-card {
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 12px;
            padding: 1rem 1.25rem;
        }
        .summary-label {
            font-size: 0.72rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--p-text-muted-color, #9ca3af);
            margin-bottom: 0.35rem;
        }
        .summary-value {
            font-size: 1.6rem;
            font-weight: 700;
        }
        .order-id-cell {
            font-family: monospace;
            font-size: 0.72rem;
            color: var(--p-text-muted-color, #6b7280);
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .total-cell {
            font-weight: 700;
        }
        .destination-cell {
            max-width: 220px;
        }
        .muted-text {
            font-size: 0.78rem;
            color: var(--p-text-muted-color, #9ca3af);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .empty-cell {
            text-align: center;
            padding: 2rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .export-hint {
            font-size: 0.82rem;
            color: var(--p-text-muted-color, #6b7280);
            margin-bottom: 0.75rem;
        }
        .export-columns {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 360px;
            overflow-y: auto;
        }
        .export-col-row {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }
        .export-col-key {
            font-size: 0.75rem;
            font-family: monospace;
            color: var(--p-text-muted-color, #6b7280);
            min-width: 140px;
        }
        .export-col-header {
            flex: 1;
            font-size: 0.82rem;
        }
    `
})
export class WeeklySales implements OnInit {
    orders: SaleOrder[] = [];
    filteredOrders: SaleOrder[] = [];
    summary: SummaryStats | null = null;

    loading = false;
    hasLoaded = false;
    searchTerm = '';

    fromDate: Date = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 6); // default to last 7 days
        return d;
    })();
    toDate: Date = new Date();

    page = 1;
    limit = 2;
    first = 0;
    totalRecords = 0;

    exportDialogVisible = false;
    exportColumns: { field: keyof SaleOrder; label: string; selected: boolean }[] = [];

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadReport();
    }

    private formatDate(d: Date): string {
        return d.toISOString().split('T')[0]; // YYYY-MM-DD confirmed format
    }

    onLoad() {
        this.page = 1;
        this.first = 0;
        this.loadReport();
    }

    loadReport() {
        if (!this.fromDate || !this.toDate) return;
        this.loading = true;

        this.apiService.loadReport(this.formatDate(this.fromDate), this.formatDate(this.toDate), this.page, this.limit).subscribe({
            next: (res: any) => {
                const data = res?.data ?? {};
                this.summary = data.summary ?? null;
                this.totalRecords = data.pagination?.totalRecords ?? 0;
                this.orders = data.orders ?? [];
                this.hasLoaded = true;
                this.applySearch();
                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                this.hasLoaded = true;
                console.error('[WeeklySales] Failed to load report:', err);
                this.cd.detectChanges();
            }
        });
    }

    onPageChange(event: any) {
        this.first = event.first;
        this.limit = event.rows;
        this.page = Math.floor(event.first / event.rows) + 1;
        this.loadReport();
    }

    // Filters within the current page's loaded data only. Server-side search
    // isn't possible here without a backend `search` param in the payload.
    applySearch() {
        const term = this.searchTerm.trim().toLowerCase();
        this.filteredOrders = term
            ? this.orders.filter(
                  (o) =>
                      o.id.toLowerCase().includes(term) ||
                      o.order_status.toLowerCase().includes(term) ||
                      o.payment_status.toLowerCase().includes(term) ||
                      o.mode.toLowerCase().includes(term) ||
                      o.total.includes(term) ||
                      (o.collection_location ?? '').toLowerCase().includes(term) ||
                      (o.shipping_city ?? '').toLowerCase().includes(term) ||
                      (o.shipping_country ?? '').toLowerCase().includes(term)
              )
            : [...this.orders];
        this.cd.detectChanges();
    }

    openExportDialog() {
        this.exportColumns = ALL_EXPORT_COLUMNS.map((c) => ({ ...c, selected: true }));
        this.exportDialogVisible = true;
    }

    exportCSV() {
        const selected = this.exportColumns.filter((c) => c.selected);
        if (!selected.length) return;

        const header = selected.map((c) => this.csvEscape(c.label)).join(',');
        const rows = this.filteredOrders.map((order) => selected.map((c) => this.csvEscape(order[c.field] != null ? String(order[c.field]) : '')).join(','));

        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report_${this.formatDate(this.fromDate)}_${this.formatDate(this.toDate)}.csv`;
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
