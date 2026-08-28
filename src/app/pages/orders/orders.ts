import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ApiService } from '@/app/services/api-service';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';

export type OrderStatus = 'pending' | 'shipped' | 'completed' | 'failed';

interface OrderLineItem {
    id: number; // product id, NOT the order id
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    category: string;
    brand: string;
}

interface ShippingInfo {
    firstName: string;
    lastName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingZipCode: string;
}

interface CollectionInfo {
    collectionLocation: string;
    collectionDate: string;
    collectionTime: string;
}

interface CustomerAddress {
    street: string;
    city: string;
    state: string | null;
    zipCode: string;
    country: string;
}

interface Customer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: CustomerAddress | null;
}

// One row per ORDER (grouped), not per line item - the raw API gives one
// row per line item, sharing the same orderId for multi-item orders.
export interface GroupedOrder {
    orderId: string;
    customer: Customer | null;
    orderStatus: OrderStatus;
    paymentStatus: string;
    mode: 'collection' | 'delivery';
    shipping: ShippingInfo | null;
    collection: CollectionInfo | null;
    items: OrderLineItem[];
    total: number;
    selectedStatus: OrderStatus; // dropdown value, separate from orderStatus until "Update" is clicked
    updating: boolean;
    selectedPaymentStatus: string; // dropdown value for payment status
    updatingPayment: boolean;
    deleting: boolean;
    createdAt: Date; // ISO date string, from the first line item in the order
    updatedAt: Date; // ISO date string, from the first line item in the order
}

@Component({
    selector: 'app-orders',
    imports: [CommonModule, FormsModule, ButtonModule, TagModule, TableModule, ToastModule, ConfirmDialogModule, SelectModule, TabsModule, PaginatorModule, TooltipModule],
    standalone: true,
    template: `
        <div class="card orders-page">
            <p-toast />
            <p-confirmDialog />

            <div class="page-header">
                <div>
                    <div class="page-title">({{ groupedOrders.length }}) Orders</div>
                    <div class="page-subtitle">Review and update order status across all customers</div>
                </div>
            </div>

            <!-- STATUS TABS -->
            <p-tabs [(value)]="activeStatus" (valueChange)="onStatusTabChange()">
                <p-tablist>
                    <p-tab value="all">All</p-tab>
                    <p-tab value="pending">Pending</p-tab>
                    <p-tab value="shipped">Shipped</p-tab>
                    <p-tab value="completed">Completed</p-tab>
                    <p-tab value="failed">Failed</p-tab>
                </p-tablist>
            </p-tabs>

            <div class="orders-list">
                @if (loading) {
                    <div class="empty-state">
                        <i class="pi pi-spin pi-spinner empty-icon"></i>
                        <div>Loading orders&hellip;</div>
                    </div>
                } @else if (groupedOrders.length === 0) {
                    <div class="empty-state">
                        <i class="pi pi-inbox empty-icon"></i>
                        <div>No orders found for this status.</div>
                    </div>
                } @else {
                    @for (order of groupedOrders; track order.orderId) {
                        <div class="order-card" [class]="'accent-' + order.orderStatus">
                            <div class="accent-bar"></div>

                            <div class="order-card-inner">
                                <div class="order-card-header">
                                    <div class="order-id-block">
                                        <span class="order-id-label">Order ID</span>
                                        <span class="order-id-value">{{ order.orderId }}</span>
                                    </div>
                                    <p-tag [value]="statusLabel(order.orderStatus)" [severity]="statusSeverity(order.orderStatus)" class="status-tag-lg"></p-tag>
                                </div>

                                <div class="order-card-body">
                                    <!-- LINE ITEMS -->
                                    <div class="panel">
                                        <div class="panel-title"><i class="pi pi-shopping-bag"></i> Items ({{ order.items.length }})</div>
                                        <div class="line-items">
                                            @for (item of order.items; track item.id) {
                                                <div class="line-item">
                                                    <img [src]="item.imageUrl" alt="" class="line-item-img" />
                                                    <div class="line-item-info">
                                                        <div class="line-item-name">{{ item.name }}</div>
                                                        <div class="line-item-meta">{{ item.brand }} &middot; {{ item.category }}</div>
                                                    </div>
                                                    <div class="line-item-qty">&times;{{ item.quantity }}</div>
                                                    <div class="line-item-price">{{ item.price * item.quantity | currency }}</div>
                                                </div>
                                            }
                                        </div>
                                    </div>

                                    <!-- CUSTOMER -->
                                    <div class="panel">
                                        <div class="panel-title"><i class="pi pi-user"></i> Customer</div>
                                        @if (order.customer) {
                                            <div class="customer-card">
                                                <div class="customer-avatar">{{ initials(order.customer) }}</div>
                                                <div class="customer-info">
                                                    <div class="customer-name">{{ order.customer.firstName }} {{ order.customer.lastName }}</div>
                                                    <div class="customer-contact"><i class="pi pi-envelope"></i> {{ order.customer.email }}</div>
                                                    <div class="customer-contact"><i class="pi pi-phone"></i> {{ order.customer.phone }}</div>
                                                    @if (order.customer.address) {
                                                        <div class="customer-contact">
                                                            <i class="pi pi-home"></i>
                                                            {{ order.customer.address.street }}, {{ order.customer.address.city }}
                                                            @if (order.customer.address.state) {
                                                                , {{ order.customer.address.state }}
                                                            }
                                                            {{ order.customer.address.zipCode }}, {{ order.customer.address.country }}
                                                        </div>
                                                    }
                                                </div>
                                            </div>
                                        } @else {
                                            <div class="muted-text">No customer information available.</div>
                                        }
                                    </div>

                                    <!-- FULFILLMENT -->
                                    <div class="panel">
                                        <div class="panel-title">
                                            @if (order.mode === 'delivery') {
                                                <i class="pi pi-truck"></i> Delivery
                                            } @else {
                                                <i class="pi pi-map-marker"></i> Collection
                                            }
                                        </div>
                                        @if (order.mode === 'delivery' && order.shipping) {
                                            <div class="fulfillment-name">{{ order.shipping.firstName }} {{ order.shipping.lastName }}</div>
                                            <div class="muted-text">{{ order.shipping.shippingAddress }}, {{ order.shipping.shippingCity }} {{ order.shipping.shippingZipCode }}</div>
                                        } @else if (order.mode === 'collection' && order.collection) {
                                            <div class="fulfillment-name">{{ order.collection.collectionLocation }}</div>
                                            <div class="muted-text">{{ order.collection.collectionDate | date: 'mediumDate' }} at {{ order.collection.collectionTime | date: 'shortTime' }}</div>
                                        } @else {
                                            <div class="muted-text">No fulfillment details available.</div>
                                        }

                                        <div class="payment-row">
                                            <span class="muted-text">Payment</span>
                                            <p-tag [value]="order.paymentStatus" [severity]="paymentSeverity(order.paymentStatus)" [rounded]="true"></p-tag>
                                        </div>
                                    </div>

                                    <!-- ORDER DATE -->
                                    <div class="panel">
                                        <div class="panel-title"><i class="pi pi-truck"></i> Order Placement Date</div>
                                        <div class="muted-text">
                                            {{ order.createdAt | date: 'medium' }}
                                        </div>
                                    </div>
                                    <div class="panel">
                                        <div class="panel-title"><i class="pi pi-refresh"></i> Last Updated</div>
                                        <div class="muted-text">
                                            {{ order.updatedAt | date: 'medium' }}
                                        </div>
                                    </div>
                                </div>

                                <div class="order-card-footer">
                                    <div class="total-block">
                                        <span class="total-label">Order Total</span>
                                        <span class="total-value">{{ order.total | currency }}</span>
                                    </div>

                                    <div class="order-actions">
                                        <div class="action-control">
                                            <label class="action-label">Payment status</label>
                                            <p-select [options]="paymentStatusOptions" optionLabel="label" optionValue="value" [(ngModel)]="order.selectedPaymentStatus" [disabled]="order.updatingPayment" class="status-select"> </p-select>
                                        </div>
                                        <button
                                            pButton
                                            [label]="order.selectedPaymentStatus === order.paymentStatus ? 'No changes' : 'Update payment'"
                                            icon="pi pi-check"
                                            [loading]="order.updatingPayment"
                                            [disabled]="order.selectedPaymentStatus === order.paymentStatus"
                                            (click)="confirmPaymentStatusUpdate(order)"
                                        ></button>

                                        <div class="action-control">
                                            <label class="action-label">Order status</label>
                                            <p-select [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="order.selectedStatus" [disabled]="order.updating" class="status-select"> </p-select>
                                        </div>
                                        <button
                                            pButton
                                            [label]="order.selectedStatus === order.orderStatus ? 'No changes' : 'Update status'"
                                            icon="pi pi-check"
                                            [loading]="order.updating"
                                            [disabled]="order.selectedStatus === order.orderStatus"
                                            (click)="confirmStatusUpdate(order)"
                                        ></button>

                                        <button pButton icon="pi pi-trash" severity="danger" [loading]="order.deleting" (click)="confirmDeleteOrder(order)" style="margin-left: auto;" pTooltip="Delete Order"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                }
            </div>
            <!-- @if (totalRecords > limit) { -->
            <p-paginator [rows]="limit" [totalRecords]="totalRecords" [rowsPerPageOptions]="[2, 10, 20, 50]" (onPageChange)="onPageChange($event)" styleClass="mt-4"></p-paginator>
            <!-- } -->
        </div>
    `,
    styles: `
        .orders-page {
            background: var(--p-content-background, #fff);
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 1rem;
        }
        .page-title {
            font-size: 1.4rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: var(--p-text-color, #1f2937);
        }
        .page-subtitle {
            font-size: 0.85rem;
            color: var(--p-text-muted-color, #9ca3af);
            margin-top: 0.15rem;
        }

        .orders-list {
            display: flex;
            flex-direction: column;
            gap: 1.1rem;
            margin-top: 1.25rem;
        }

        .empty-state {
            text-align: center;
            padding: 4rem 1rem;
            color: var(--p-text-muted-color, #9ca3af);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
        }
        .empty-icon {
            font-size: 2rem;
            opacity: 0.6;
        }

        /* --- ORDER CARD --- */
        .order-card {
            position: relative;
            display: flex;
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            border-radius: 14px;
            background: var(--p-content-background, #fff);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
            transition:
                box-shadow 0.18s ease,
                transform 0.18s ease;
            /* No overflow:hidden here on purpose - it was clipping the p-select
               dropdown panel, trapping it inside the card's layout instead of
               letting it float as an overlay above the page. */
        }
        .order-card:hover {
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
        }

        .accent-bar {
            width: 5px;
            flex-shrink: 0;
            border-radius: 14px 0 0 14px;
        }
        .accent-pending .accent-bar {
            background: var(--p-orange-400, #fb923c);
        }
        .accent-shipped .accent-bar {
            background: var(--p-blue-400, #60a5fa);
        }
        .accent-completed .accent-bar {
            background: var(--p-green-500, #22c55e);
        }
        .accent-failed .accent-bar {
            background: var(--p-red-400, #f87171);
        }

        .order-card-inner {
            flex: 1;
            padding: 1.1rem 1.4rem;
            min-width: 0;
        }

        .order-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.85rem;
            border-bottom: 1px solid var(--p-content-border-color, #f0f0f0);
        }
        .order-id-block {
            display: flex;
            flex-direction: column;
            gap: 0.1rem;
        }
        .order-id-label {
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .order-id-value {
            font-family: 'SFMono-Regular', Consolas, monospace;
            font-size: 0.78rem;
            color: var(--p-text-color, #374151);
        }
        :host ::ng-deep .status-tag-lg .p-tag {
            font-size: 0.78rem;
            padding: 0.4rem 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .order-card-body {
            display: grid;
            grid-template-columns: 1.3fr 1fr 1fr;
            gap: 1.5rem;
        }
        @media (max-width: 900px) {
            .order-card-body {
                grid-template-columns: 1fr;
            }
        }

        .panel-title {
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            color: var(--p-text-color, #374151);
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin-bottom: 0.65rem;
        }
        .panel-title i {
            color: var(--p-primary-color, #6366f1);
            font-size: 0.85rem;
        }

        /* line items */
        .line-items {
            display: flex;
            flex-direction: column;
            gap: 0.7rem;
        }
        .line-item {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }
        .line-item-img {
            width: 42px;
            height: 42px;
            object-fit: cover;
            border-radius: 8px;
            flex-shrink: 0;
            border: 1px solid var(--p-content-border-color, #eee);
        }
        .line-item-info {
            flex: 1;
            min-width: 0;
        }
        .line-item-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--p-text-color, #1f2937);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .line-item-meta {
            font-size: 0.72rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .line-item-qty {
            font-size: 0.78rem;
            color: var(--p-text-muted-color, #6b7280);
            flex-shrink: 0;
        }
        .line-item-price {
            font-size: 0.85rem;
            font-weight: 700;
            min-width: 64px;
            text-align: right;
            flex-shrink: 0;
            color: var(--p-text-color, #1f2937);
        }

        /* customer */
        .customer-card {
            display: flex;
            gap: 0.75rem;
        }
        .customer-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--p-primary-100, #e0e7ff);
            color: var(--p-primary-color, #6366f1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.8rem;
            flex-shrink: 0;
        }
        .customer-info {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            min-width: 0;
        }
        .customer-name {
            font-size: 0.88rem;
            font-weight: 600;
            color: var(--p-text-color, #1f2937);
        }
        .customer-contact {
            font-size: 0.76rem;
            color: var(--p-text-muted-color, #6b7280);
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
            line-height: 1.4;
        }
        .customer-contact i {
            margin-top: 0.15rem;
            font-size: 0.7rem;
            flex-shrink: 0;
        }

        /* fulfillment */
        .fulfillment-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--p-text-color, #1f2937);
            margin-bottom: 0.2rem;
        }
        .muted-text {
            font-size: 0.78rem;
            color: var(--p-text-muted-color, #9ca3af);
            line-height: 1.45;
        }
        .payment-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        /* footer */
        .order-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 1.25rem;
            padding-top: 1rem;
            border-top: 1px solid var(--p-content-border-color, #f0f0f0);
            gap: 1rem;
            flex-wrap: wrap;
        }
        .total-block {
            display: flex;
            flex-direction: column;
        }
        .total-label {
            font-size: 0.68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .total-value {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--p-text-color, #1f2937);
        }

        .order-actions {
            display: flex;
            align-items: flex-end;
            gap: 0.75rem;
            flex-wrap: wrap;
        }
        .action-control {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
        }
        .action-label {
            font-size: 0.68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .status-select {
            min-width: 150px;
        }
    `,
    providers: [ConfirmationService, MessageService]
})
export class Orders implements OnInit {
    allGroupedOrders: GroupedOrder[] = [];
    rawOrders: any[] = [];
    groupedOrders: GroupedOrder[] = [];
    loading = true;
    page = 1;
    limit = 2;
    totalRecords = 0;
    activeStatus: 'all' | OrderStatus = 'all';
    statusOptions: { label: string; value: OrderStatus }[] = [
        { label: 'Pending', value: 'pending' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' }
    ];
    paymentStatusOptions: { label: string; value: string }[] = [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' }
    ];

    constructor(
        private apiService: ApiService,
        private cd: ChangeDetectorRef,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadOrders();
    }

    onStatusTabChange() {
        this.page = 1;
        this.loadOrders();
    }

    loadOrders() {
        this.loading = true;

        // Fetch a large number of items to ensure we get all records,
        // then we group them by orderId and do pagination locally on the frontend.
        this.apiService.getAdminOrders(this.activeStatus, 1, 10000).subscribe({
            next: (res: any) => {
                const raw = res?.data?.orders ?? [];

                if (!Array.isArray(raw)) {
                    console.warn('[Orders] Unexpected shape:', res);
                    this.allGroupedOrders = [];
                    this.groupedOrders = [];
                    this.totalRecords = 0;
                    this.loading = false;
                    this.cd.detectChanges();
                    return;
                }

                this.allGroupedOrders = this.groupByOrderId(raw);
                this.totalRecords = this.allGroupedOrders.length;
                this.updatePage();

                this.loading = false;
                this.cd.detectChanges();
            },
            error: (err) => {
                this.loading = false;
                console.error('[Orders] Failed to load orders:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load orders.' });
                this.cd.detectChanges();
            }
        });
    }

    private updatePage() {
        const startIndex = (this.page - 1) * this.limit;
        const endIndex = startIndex + this.limit;
        this.groupedOrders = this.allGroupedOrders.slice(startIndex, endIndex);
    }

    private groupByOrderId(rows: any[]): GroupedOrder[] {
        const map = new Map<string, GroupedOrder>();

        for (const row of rows) {
            const orderId = row.orderId;
            if (!orderId) {
                console.warn('[Orders] Row missing orderId, skipping:', row);
                continue;
            }

            const item: OrderLineItem = {
                id: Number(row.id),
                name: row.name?.trim?.() ?? row.name,
                price: Number(row.price),
                imageUrl: row.imageUrl,
                quantity: Number(row.quantity) || 1,
                category: row.category?.trim?.() ?? row.category,
                brand: row.brand?.trim?.() ?? row.brand
            };

            if (map.has(orderId)) {
                map.get(orderId)!.items.push(item);
                map.get(orderId)!.total += item.price * item.quantity;
            } else {
                map.set(orderId, {
                    orderId,
                    customer: row.user ?? null,
                    orderStatus: row.orderStatus,
                    paymentStatus: row.paymentStatus,
                    mode: row.mode,
                    shipping: row.shipping ?? null,
                    collection: row.collection ?? null,
                    items: [item],
                    total: item.price * item.quantity,
                    selectedStatus: row.orderStatus,
                    updating: false,
                    selectedPaymentStatus: row.paymentStatus,
                    updatingPayment: false,
                    deleting: false,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                });
            }
        }

        return Array.from(map.values());
    }

    onPageChange(event: any) {
        this.page = Math.floor(event.first / event.rows) + 1;
        this.limit = event.rows;
        this.updatePage();
    }

    statusLabel(status: OrderStatus): string {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    initials(customer: { firstName: string; lastName: string }): string {
        const first = customer.firstName?.charAt(0) ?? '';
        const last = customer.lastName?.charAt(0) ?? '';
        return (first + last).toUpperCase() || '?';
    }

    statusSeverity(status: OrderStatus): 'success' | 'warn' | 'danger' | 'info' {
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

    confirmStatusUpdate(order: GroupedOrder) {
        const newStatus = order.selectedStatus;
        const previousStatus = order.orderStatus;
        if (newStatus === previousStatus) return;

        this.confirmationService.confirm({
            header: 'Confirm Status Change',
            message: `Change order ${order.orderId} from "${previousStatus}" to "${newStatus}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.updateOrderStatus(order, newStatus, previousStatus),
            reject: () => {
                order.selectedStatus = previousStatus; // reset dropdown back if they cancel
            }
        });
    }

    private updateOrderStatus(order: GroupedOrder, newStatus: OrderStatus, previousStatus: OrderStatus) {
        order.updating = true;

        this.apiService.approveOrder(order.orderId, newStatus).subscribe({
            next: () => {
                order.updating = false;
                order.orderStatus = newStatus;
                order.selectedStatus = newStatus;
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: `Order moved to "${newStatus}".` });
                this.cd.detectChanges();

                // If filtered to a specific status tab, the order no longer belongs
                // here - refresh so the card disappears instead of showing a stale list.
                if (this.activeStatus !== 'all' && newStatus !== this.activeStatus) {
                    this.loadOrders();
                }
            },
            error: (err) => {
                order.updating = false;
                order.selectedStatus = previousStatus; // revert the dropdown, orderStatus never changed
                console.error('[Orders] Status update failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update order status.' });
                this.cd.detectChanges();
            }
        });
    }

    confirmPaymentStatusUpdate(order: GroupedOrder) {
        const newStatus = order.selectedPaymentStatus;
        const previousStatus = order.paymentStatus;
        if (newStatus === previousStatus) return;

        this.confirmationService.confirm({
            header: 'Confirm Payment Status Change',
            message: `Change payment status for order ${order.orderId} from "${previousStatus}" to "${newStatus}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.updatePaymentStatus(order, newStatus, previousStatus),
            reject: () => {
                order.selectedPaymentStatus = previousStatus;
            }
        });
    }

    private updatePaymentStatus(order: GroupedOrder, newStatus: string, previousStatus: string) {
        order.updatingPayment = true;

        this.apiService.updatePaymentStatus(order.orderId, newStatus).subscribe({
            next: () => {
                order.updatingPayment = false;
                order.paymentStatus = newStatus;
                order.selectedPaymentStatus = newStatus;
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: `Payment status moved to "${newStatus}".` });
                this.cd.detectChanges();
            },
            error: (err) => {
                order.updatingPayment = false;
                order.selectedPaymentStatus = previousStatus;
                console.error('[Orders] Payment status update failed:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update payment status.' });
                this.cd.detectChanges();
            }
        });
    }

    confirmDeleteOrder(order: GroupedOrder) {
        this.confirmationService.confirm({
            header: 'Confirm Delete Order',
            message: `Are you sure you want to permanently delete order ${order.orderId}?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deleteOrder(order)
        });
    }

    private deleteOrder(order: GroupedOrder) {
        order.deleting = true;
        this.apiService.deleteOrder(order.orderId).subscribe({
            next: () => {
                order.deleting = false;
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Order deleted successfully.' });

                // Remove the order from allGroupedOrders and update the page locally.
                // We do this instead of calling loadOrders() to avoid fetching all 10000 records again unnecessarily.
                this.allGroupedOrders = this.allGroupedOrders.filter((o) => o.orderId !== order.orderId);
                this.totalRecords = this.allGroupedOrders.length;
                this.updatePage();

                this.cd.detectChanges();
            },
            error: (err) => {
                order.deleting = false;
                console.error('[Orders] Failed to delete order:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete order.' });
                this.cd.detectChanges();
            }
        });
    }
}
