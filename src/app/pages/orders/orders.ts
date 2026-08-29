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
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';

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
    internalOrderId: string;
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

type EditableOrder = Omit<GroupedOrder, 'customer' | 'shipping' | 'collection'> & {
    customer: Customer & { address: CustomerAddress };
    shipping: ShippingInfo;
    collection: CollectionInfo;
};

@Component({
    selector: 'app-orders',
    imports: [CommonModule, FormsModule, ButtonModule, TagModule, TableModule, ToastModule, ConfirmDialogModule, SelectModule, TabsModule, PaginatorModule, TooltipModule, DatePickerModule, DialogModule, InputNumberModule],
    standalone: true,
    template: `
        <div class="card orders-page">
            <p-toast />
            <p-confirmDialog />

            <div class="page-header">
                <div>
                    <div class="page-title">({{ totalRecords }}) Orders</div>
                    <div class="page-subtitle">Review and update order status across all customers</div>
                </div>
                <button pButton type="button" label="New Order" icon="pi pi-plus" (click)="openNewOrder()"></button>
            </div>

            <div class="order-filters">
                <p-datepicker [(ngModel)]="fromDate" dateFormat="yy-mm-dd" [readonlyInput]="true" [showIcon]="true" placeholder="From date" ariaLabel="From date" />
                <p-datepicker [(ngModel)]="toDate" dateFormat="yy-mm-dd" [readonlyInput]="true" [showIcon]="true" placeholder="To date" ariaLabel="To date" />
                <input type="text" [(ngModel)]="orderIdFilter" placeholder="Order ID" aria-label="Order ID" />
                <input type="text" [(ngModel)]="customerNameFilter" placeholder="Customer name" aria-label="Customer name" />
                <button pButton type="button" label="Search" icon="pi pi-search" (click)="applyFilters()"></button>
                <button pButton type="button" label="Clear" severity="secondary" [outlined]="true" icon="pi pi-filter-slash" (click)="clearFilters()"></button>
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

            <div class="orders-table-wrap">
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
                    <p-table [value]="groupedOrders" responsiveLayout="scroll" styleClass="orders-table">
                        <ng-template #header>
                            <tr><th>Order #</th><th>Customer</th><th>Date</th><th>Type / Mode</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                        </ng-template>
                        <ng-template #body let-order>
                            <tr>
                                <td class="order-id-value">{{ order.orderId }}</td>
                                <td>{{ order.customer ? (order.customer.firstName + ' ' + order.customer.lastName) : 'Cash' }}</td>
                                <td>{{ order.createdAt | date: 'dd-MM-yyyy' }}</td>
                                <td>{{ order.mode === 'delivery' ? 'Delivery' : 'Collection' }}</td>
                                <td>{{ order.total | currency }}</td>
                                <td><p-tag [value]="statusLabel(order.orderStatus)" [severity]="statusSeverity(order.orderStatus)"></p-tag></td>
                                <td class="table-actions">
                                    <button pButton text icon="pi pi-eye" pTooltip="View order" (click)="viewOrder(order)"></button>
                                    <button pButton text icon="pi pi-pencil" pTooltip="Edit order" (click)="editOrder(order)"></button>
                                    <button pButton text [severity]="order.orderStatus === 'completed' ? 'warn' : 'success'" [icon]="order.orderStatus === 'completed' ? 'pi pi-undo' : 'pi pi-credit-card'" [pTooltip]="order.orderStatus === 'completed' ? 'Move back to pending' : 'Checkout order'" (click)="toggleCheckout(order)"></button>
                                    <button pButton text severity="danger" icon="pi pi-trash" pTooltip="Delete order" (click)="confirmDeleteOrder(order)"></button>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
            <p-paginator [rows]="limit" [totalRecords]="totalRecords" [rowsPerPageOptions]="[2, 10, 20, 50]" (onPageChange)="onPageChange($event)" styleClass="mt-4"></p-paginator>

            <p-dialog header="New order" [(visible)]="newOrderDialogVisible" [modal]="true" [style]="{ width: 'min(760px, 94vw)' }">
                <p class="edit-help">Create an order for an existing customer. Stock is reduced automatically when the order is created.</p>
                <div class="edit-grid">
                    <label>Customer<p-select [options]="customerOptions" optionLabel="label" optionValue="value" [(ngModel)]="newOrder.customerId" placeholder="Select customer"></p-select></label>
                    <label>Order type / mode<p-select [options]="modeOptions" optionLabel="label" optionValue="value" [(ngModel)]="newOrder.mode"></p-select></label>
                    <label>Payment status<p-select [options]="paymentStatusOptions" optionLabel="label" optionValue="value" [(ngModel)]="newOrder.paymentStatus"></p-select></label>
                    <label>Order status<p-select [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="newOrder.orderStatus"></p-select></label>
                </div>
                <h4>Order items</h4>
                <div class="edit-item" *ngFor="let item of newOrder.items; let itemIndex = index"><label>Product ID<p-inputnumber [(ngModel)]="item.productId" [useGrouping]="false"></p-inputnumber></label><label>Quantity<p-inputnumber [(ngModel)]="item.quantity" [min]="1"></p-inputnumber></label><label>Unit price<p-inputnumber [(ngModel)]="item.price" mode="currency" currency="GBP"></p-inputnumber></label><button pButton text severity="danger" icon="pi pi-trash" pTooltip="Remove item" (click)="removeNewItem(itemIndex)"></button></div>
                <button pButton text icon="pi pi-plus" label="Add item" (click)="addNewItem()"></button>
                <div class="dialog-actions"><button pButton label="Cancel" severity="secondary" [outlined]="true" (click)="newOrderDialogVisible = false"></button><button pButton label="Create order" icon="pi pi-check" [loading]="creatingOrder" (click)="createNewOrder()"></button></div>
            </p-dialog>

            <p-dialog header="Order details" [(visible)]="viewDialogVisible" [modal]="true" [style]="{ width: 'min(760px, 94vw)' }">
                @if (selectedOrder; as order) {
                    <div class="detail-section">
                        <h4>Order summary</h4>
                        <div class="detail-grid"><div><b>Order #</b><span>{{ order.orderId }}</span></div><div><b>Placed</b><span>{{ order.createdAt | date: 'medium' }}</span></div><div><b>Last updated</b><span>{{ order.updatedAt | date: 'medium' }}</span></div><div><b>Type / mode</b><span>{{ order.mode === 'delivery' ? 'Delivery' : 'Collection' }}</span></div><div><b>Order status</b><span><p-tag [value]="statusLabel(order.orderStatus)" [severity]="statusSeverity(order.orderStatus)"></p-tag></span></div><div><b>Payment status</b><span>{{ order.paymentStatus }}</span></div></div>
                    </div>
                    <div class="detail-section"><h4>Customer details</h4><p class="detail-value">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</p><p>{{ order.customer?.email }} · {{ order.customer?.phone }}</p><p>{{ order.customer?.address?.street }}, {{ order.customer?.address?.city }}, {{ order.customer?.address?.state }} {{ order.customer?.address?.zipCode }}, {{ order.customer?.address?.country }}</p></div>
                    <div class="detail-section"><h4>Items in this order</h4><div class="view-item" *ngFor="let item of order.items"><img [src]="item.imageUrl" [alt]="item.name" /><div class="view-item-name"><b>{{ item.name }}</b><small>Product ID: {{ item.id }}<br />{{ item.brand }} · {{ item.category }}</small></div><span>Qty: {{ item.quantity }}</span><span>{{ item.price | currency }} each</span><b>{{ item.price * item.quantity | currency }}</b></div><div class="order-total-row"><b>Order total</b><b>{{ order.total | currency }}</b></div></div>
                    <div class="detail-section"><h4>Fulfillment details</h4>@if (order.mode === 'delivery') { <p>{{ order.shipping?.firstName }} {{ order.shipping?.lastName }}<br />{{ order.shipping?.shippingAddress }}, {{ order.shipping?.shippingCity }} {{ order.shipping?.shippingZipCode }}</p> } @else { <p>Collection location: {{ order.collection?.collectionLocation }}<br />Date: {{ order.collection?.collectionDate }} · Time: {{ order.collection?.collectionTime }}</p> }</div>
                }
            </p-dialog>

            <p-dialog header="Edit order" [(visible)]="editDialogVisible" [modal]="true" [style]="{ width: 'min(900px, 96vw)' }">
                @if (editModel; as order) {
                    <p class="edit-help">Update the fields below, then select Save changes. Product ID, quantity, and unit price control the order items and stock.</p>
                    <div class="edit-grid">
                        <label>Customer first name<input [(ngModel)]="order.customer.firstName" /></label><label>Customer last name<input [(ngModel)]="order.customer.lastName" /></label>
                        <label>Customer email<input type="email" [(ngModel)]="order.customer.email" /></label><label>Customer phone<input [(ngModel)]="order.customer.phone" /></label>
                        <label>Order type / mode<p-select [options]="modeOptions" optionLabel="label" optionValue="value" [(ngModel)]="order.mode"></p-select></label>
                        <label>Order status<p-select [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="order.orderStatus"></p-select></label>
                        <label>Payment status<p-select [options]="paymentStatusOptions" optionLabel="label" optionValue="value" [(ngModel)]="order.paymentStatus"></p-select></label><label>Order total<p-inputnumber [(ngModel)]="order.total" mode="currency" currency="GBP" [disabled]="true"></p-inputnumber></label>
                        <label>Customer street<input [(ngModel)]="order.customer.address.street" /></label><label>Customer city<input [(ngModel)]="order.customer.address.city" /></label><label>Customer postcode<input [(ngModel)]="order.customer.address.zipCode" /></label><label>Customer country<input [(ngModel)]="order.customer.address.country" /></label>
                        <label>Delivery first name<input [(ngModel)]="order.shipping.firstName" /></label><label>Delivery last name<input [(ngModel)]="order.shipping.lastName" /></label>
                        <label>Delivery address<input [(ngModel)]="order.shipping.shippingAddress" /></label><label>Delivery city<input [(ngModel)]="order.shipping.shippingCity" /></label><label>Delivery postcode<input [(ngModel)]="order.shipping.shippingZipCode" /></label>
                        <label>Collection location<input [(ngModel)]="order.collection.collectionLocation" /></label><label>Collection date<input [(ngModel)]="order.collection.collectionDate" /></label><label>Collection time<input [(ngModel)]="order.collection.collectionTime" /></label>
                    </div>
                    <h4>Order items</h4>
                    <div class="edit-item" *ngFor="let item of order.items; let itemIndex = index"><img [src]="item.imageUrl" [alt]="item.name" /><div class="edit-item-name"><b>{{ item.name }}</b><small>Product ID and total price cannot be changed</small></div><label>Product ID<p-inputnumber [(ngModel)]="item.id" [useGrouping]="false" [disabled]="true"></p-inputnumber></label><label>Quantity<p-inputnumber [(ngModel)]="item.quantity" [min]="1"></p-inputnumber></label><label>Unit price<p-inputnumber [(ngModel)]="item.price" mode="currency" currency="GBP"></p-inputnumber></label><button pButton text severity="danger" icon="pi pi-trash" pTooltip="Remove this item" (click)="removeEditItem(itemIndex)"></button></div>
                    <div class="dialog-actions"><button pButton label="Cancel" severity="secondary" [outlined]="true" (click)="editDialogVisible = false"></button><button pButton label="Save changes" icon="pi pi-save" [loading]="savingOrder" (click)="saveOrder()"></button></div>
                }
            </p-dialog>
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

        .order-filters {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            flex-wrap: wrap;
            margin: 1rem 0;
        }
        .order-filters input {
            min-width: 150px;
            padding: 0.65rem 0.75rem;
            border: 1px solid var(--p-content-border-color, #d1d5db);
            border-radius: 6px;
            background: var(--p-content-background, #fff);
            color: var(--p-text-color, #374151);
        }
        .orders-table-wrap {
            margin-top: 1.25rem;
            overflow-x: auto;
        }
        .orders-table :host ::ng-deep th {
            white-space: nowrap;
        }
        .table-actions {
            white-space: nowrap;
        }
        .detail-grid,
        .edit-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
        }
        .detail-grid div,
        .edit-grid label {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }
        .detail-grid span,
        .edit-grid input,
        .edit-grid p-select,
        .edit-grid p-inputnumber {
            color: var(--p-text-color, #374151);
        }
        .detail-section {
            margin-bottom: 1.25rem;
        }
        .detail-section h4 {
            margin: 0 0 0.7rem;
            color: var(--p-text-color, #1f2937);
        }
        .detail-section p {
            margin: 0.35rem 0;
            line-height: 1.6;
            color: var(--p-text-muted-color, #6b7280);
        }
        .detail-value {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--p-text-color, #1f2937) !important;
        }
        .view-item img,
        .edit-item img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--p-content-border-color, #e5e7eb);
            flex-shrink: 0;
        }
        .view-item,
        .order-total-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.7rem 0;
            border-bottom: 1px solid var(--p-content-border-color, #e5e7eb);
        }
        .view-item-name,
        .edit-item-name {
            flex: 1;
            min-width: 0;
        }
        .view-item-name small,
        .edit-item-name small {
            display: block;
            margin-top: 0.2rem;
            color: var(--p-text-muted-color, #9ca3af);
        }
        .order-total-row {
            justify-content: space-between;
            border-bottom: 0;
            font-size: 1.05rem;
        }
        .edit-help {
            margin: 0 0 1rem;
            color: var(--p-text-muted-color, #6b7280);
        }
        .edit-grid input {
            width: 100%;
            padding: 0.6rem 0.7rem;
            border: 1px solid var(--p-content-border-color, #d1d5db);
            border-radius: 6px;
            background: var(--p-content-background, #fff);
        }
        .detail-item,
        .edit-item,
        .dialog-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.65rem 0;
            border-bottom: 1px solid var(--p-content-border-color, #e5e7eb);
        }
        .detail-item span:first-child,
        .edit-item input:first-child {
            flex: 1;
        }
        .edit-item input {
            min-width: 0;
            padding: 0.55rem;
            border: 1px solid var(--p-content-border-color, #d1d5db);
            border-radius: 6px;
        }
        .edit-item label {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-text-muted-color, #6b7280);
        }
        .dialog-actions {
            justify-content: flex-end;
            border-bottom: 0;
            margin-top: 1rem;
        }
        @media (max-width: 600px) {
            .order-filters input,
            .order-filters button,
            .detail-grid,
            .edit-grid {
                width: 100%;
            }
            .detail-grid,
            .edit-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 600px) {
            .order-filters input,
            .order-filters button {
                width: 100%;
            }
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
    fromDate: Date | null = null;
    toDate: Date | null = null;
    orderIdFilter = '';
    customerNameFilter = '';
    selectedOrder: GroupedOrder | null = null;
    editModel: EditableOrder | null = null;
    viewDialogVisible = false;
    editDialogVisible = false;
    savingOrder = false;
    creatingOrder = false;
    customerOptions: { label: string; value: number }[] = [];
    newOrderDialogVisible = false;
    newOrder = this.emptyNewOrder();
    modeOptions = [
        { label: 'Delivery', value: 'delivery' },
        { label: 'Collection', value: 'collection' }
    ];
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
        this.loadCustomers();
    }

    private emptyNewOrder() {
        return {
            customerId: null as number | null,
            mode: 'delivery' as 'delivery' | 'collection',
            paymentStatus: 'pending',
            orderStatus: 'pending' as OrderStatus,
            items: [{ productId: null as number | null, quantity: 1, price: 0 }]
        };
    }

    private loadCustomers() {
        this.apiService.getUsers().subscribe({
            next: (res: any) => {
                const users = res?.data?.users ?? [];
                this.customerOptions = users.map((user: any) => ({
                    label: `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email ?? ''})`.trim(),
                    value: Number(user.id)
                }));
            },
            error: () => this.customerOptions = []
        });
    }

    openNewOrder() {
        this.newOrder = this.emptyNewOrder();
        this.newOrderDialogVisible = true;
    }

    addNewItem() {
        this.newOrder.items.push({ productId: null, quantity: 1, price: 0 });
    }

    removeNewItem(index: number) {
        if (this.newOrder.items.length > 1) this.newOrder.items.splice(index, 1);
    }

    createNewOrder() {
        if (!this.newOrder.customerId || this.newOrder.items.some((item) => !item.productId || item.quantity < 1 || item.price < 0)) {
            this.messageService.add({ severity: 'warn', summary: 'Missing details', detail: 'Select a customer and enter valid product, quantity, and price values.' });
            return;
        }

        this.creatingOrder = true;
        const total = this.newOrder.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        this.apiService.createOrder({
            userId: this.newOrder.customerId,
            total,
            mode: this.newOrder.mode,
            paymentStatus: this.newOrder.paymentStatus,
            orderStatus: this.newOrder.orderStatus,
            items: this.newOrder.items.map((item) => ({
                quantity: item.quantity,
                product: { id: item.productId, price: item.price }
            }))
        }).subscribe({
            next: () => {
                this.creatingOrder = false;
                this.newOrderDialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Created', detail: 'New order created successfully.' });
                this.loadOrders();
            },
            error: (err) => {
                this.creatingOrder = false;
                console.error('[Orders] Failed to create order:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Failed to create order.' });
            }
        });
    }

    toggleCheckout(order: GroupedOrder) {
        const completing = order.orderStatus !== 'completed';
        const nextStatus: OrderStatus = completing ? 'completed' : 'pending';
        const nextPayment = completing ? 'completed' : 'pending';
        order.updating = true;
        this.apiService.approveOrder(order.internalOrderId, nextStatus).subscribe({
            next: () => this.apiService.updatePaymentStatus(order.internalOrderId, nextPayment).subscribe({
                next: () => {
                    order.orderStatus = nextStatus;
                    order.selectedStatus = nextStatus;
                    order.paymentStatus = nextPayment;
                    order.selectedPaymentStatus = nextPayment;
                    order.updating = false;
                    this.messageService.add({ severity: 'success', summary: completing ? 'Checked out' : 'Reopened', detail: `Order ${order.orderId} is now ${nextStatus}.` });
                    this.cd.detectChanges();
                },
                error: () => this.checkoutUpdateFailed(order)
            }),
            error: () => this.checkoutUpdateFailed(order)
        });
    }

    private checkoutUpdateFailed(order: GroupedOrder) {
        order.updating = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not update checkout or payment status.' });
        this.cd.detectChanges();
    }

    onStatusTabChange() {
        this.page = 1;
        this.loadOrders();
    }

    applyFilters() {
        this.page = 1;
        this.loadOrders();
    }

    clearFilters() {
        this.fromDate = null;
        this.toDate = null;
        this.orderIdFilter = '';
        this.customerNameFilter = '';
        this.applyFilters();
    }

    loadOrders() {
        this.loading = true;

        this.apiService.getAdminOrders(this.activeStatus, this.page, this.limit, {
            fromDate: this.formatDate(this.fromDate),
            toDate: this.formatDate(this.toDate),
            orderId: this.orderIdFilter.trim() || undefined,
            customerName: this.customerNameFilter.trim() || undefined
        }).subscribe({
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
                this.groupedOrders = this.allGroupedOrders;
                this.totalRecords = res?.data?.pagination?.total ?? this.allGroupedOrders.length;

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

    private formatDate(date: Date | null): string | undefined {
        if (!date) return undefined;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private updatePage() {
        this.loadOrders();
    }

    viewOrder(order: GroupedOrder) {
        this.selectedOrder = order;
        this.viewDialogVisible = true;
    }

    editOrder(order: GroupedOrder) {
        const customer = order.customer ?? {
            id: 0, firstName: '', lastName: '', email: '', phone: '',
            address: { street: '', city: '', state: null, zipCode: '', country: '' }
        };
        const editableCustomer = {
            ...customer,
            address: customer.address ?? { street: '', city: '', state: null, zipCode: '', country: '' }
        };
        const editableShipping = order.shipping ?? { firstName: '', lastName: '', shippingAddress: '', shippingCity: '', shippingZipCode: '' };
        const editableCollection = order.collection ?? { collectionLocation: '', collectionDate: '', collectionTime: '' };
        this.editModel = structuredClone({ ...order, customer: editableCustomer, shipping: editableShipping, collection: editableCollection }) as EditableOrder;
        this.editDialogVisible = true;
    }

    removeEditItem(index: number) {
        this.editModel?.items.splice(index, 1);
    }

    saveOrder() {
        if (!this.editModel) return;
        this.savingOrder = true;
        const order = this.editModel;
        this.apiService.updateOrder(order.internalOrderId, {
            total: order.total,
            mode: order.mode,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            customer: order.customer,
            shipping: order.shipping,
            collection: order.collection,
            items: order.items.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price }))
        }).subscribe({
            next: () => {
                this.savingOrder = false;
                this.editDialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Order details updated successfully.' });
                this.loadOrders();
            },
            error: (err) => {
                this.savingOrder = false;
                console.error('[Orders] Failed to update order:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update order details.' });
                this.cd.detectChanges();
            }
        });
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
                    internalOrderId: row.internalOrderId,
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
        this.loadOrders();
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

        this.apiService.approveOrder(order.internalOrderId, newStatus).subscribe({
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

        this.apiService.updatePaymentStatus(order.internalOrderId, newStatus).subscribe({
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
        this.apiService.deleteOrder(order.internalOrderId).subscribe({
            next: () => {
                order.deleting = false;
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Order deleted successfully.' });

                this.loadOrders();

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
