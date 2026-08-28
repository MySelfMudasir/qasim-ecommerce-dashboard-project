import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

interface InvoiceLine {
    index: number; description: string; qty: number;
    unitPrice: number; discount: number; vatAmount: number; lineTotal: number;
}

export interface GroupedSaleOrder {
    orderId: string; orderStatus: string; paymentStatus: string;
    mode: 'delivery' | 'collection'; total: number; createdAt: string; updatedAt: string;
    items: { id: string; name: string; price: number; quantity: number; category: string; brand: string; imageUrl: string }[];
    user: { id: number; firstName: string; lastName: string; email: string; phone: string;
        address: { street: string; city: string; state: string | null; zipCode: string; country: string } | null } | null;
    shipping: { firstName: string; lastName: string; shippingAddress: string; shippingCity: string;
        shippingZipCode: string; shippingState: string | null; shippingCountry: string } | null;
    collection: { collectionLocation: string; collectionDate: string; collectionTime: string } | null;
}

interface RenderedOrder {
    order: GroupedSaleOrder; lines: InvoiceLine[];
    netPrice: number; totalVat: number; totalDiscount: number; grandTotal: number; dueDate: string;
}

@Component({
    selector: 'app-invoice-print',
    imports: [CommonModule, ButtonModule, DialogModule],
    standalone: true,
    template: `
        <p-dialog [(visible)]="visible" [modal]="true"
            [style]="{ width: '900px', maxWidth: '98vw' }"
            [contentStyle]="{ padding: '0', background: '#e8e8e8' }"
            [showHeader]="false" (onHide)="close.emit()">

            <div class="action-bar">
                <span class="bar-title">
                    Preview Invoice
                    @if (rendered.length > 1) { <span class="bar-count">({{ rendered.length }} orders)</span> }
                </span>
                <div class="bar-btns">
                    <button pButton label="Print / Save PDF" icon="pi pi-print" (click)="print()"></button>
                    <button pButton icon="pi pi-times" severity="secondary" [text]="true" [rounded]="true" (click)="close.emit()"></button>
                </div>
            </div>

            <!-- PREVIEW — single document matching the print output exactly -->
            <div class="preview-scroll">
                <div class="invoice-card">

                    <!-- HEADER — appears once only, same as PDF -->
                    <div class="inv-hdr">
                        <div>
                            <div class="co-name">KHYBER FOODS LTD</div>
                            <div class="co-addr">UNIT C DORIS ROAD BORDESLEY GREEN, B9 4SJ</div>
                            <div class="co-meta">Tel: 0121 773 0670 <span class="pipe">|</span> VAT Reg: 155101156 <span class="pipe">|</span> Co Reg: 8023193</div>
                        </div>
                        <div class="logo-ring">
                            <span class="logo-kf">KF</span>
                            <span class="logo-sub">KHYBER<br/>FOODS</span>
                        </div>
                    </div>
                    <div class="hdr-line"></div>

                    <div class="inv-meta">
                        <div><span class="lbl">INVOICE NO: </span><span class="inv-no">Picking List ({{ rendered.length }} orders)</span></div>
                        <div><span class="lbl">DATE: </span><span class="inv-date">{{ today | date:'dd-MM-yyyy' }}</span></div>
                    </div>

                    @if (firstOrder) {
                        <div class="parties">
                            <div>
                                <div class="sec-lbl">BILL TO</div>
                                @if (firstOrder.order.user) {
                                    <div class="bill-name">{{ firstOrder.order.user.firstName | uppercase }} {{ firstOrder.order.user.lastName | uppercase }}</div>
                                    <div class="bill-det">{{ firstOrder.order.user.phone }}</div>
                                    @if (firstOrder.order.user.address) {
                                        <div class="bill-det">{{ firstOrder.order.user.address.street }}, {{ firstOrder.order.user.address.city }} {{ firstOrder.order.user.address.zipCode }}</div>
                                    }
                                }
                            </div>
                            <div>
                                <div class="sec-lbl">ORDER DETAILS</div>
                                <div class="det-row"><span class="det-k">Order Type:</span><span class="det-v">Picking List</span></div>
                                <div class="det-row"><span class="det-k">Payment Terms:</span><span class="det-v">Net 30 Days</span></div>
                            </div>
                        </div>
                    }

                    <!-- ONE TABLE: all orders' rows, separator per order, totals at bottom -->
                    <table class="lines-tbl">
                        <thead>
                            <tr>
                                <th class="c-n">#</th><th class="c-d">DESCRIPTION</th>
                                <th class="c-q">QTY</th><th class="c-p">PRICE</th>
                                <th class="c-dc">DISCOUNT</th><th class="c-v">VAT</th><th class="c-t">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (r of rendered; track r.order.orderId; let gi = $index) {
                                <!-- Green separator row per order -->
                                <tr class="order-sep">
                                    <td colspan="7">
                                        Order: <strong>{{ r.order.orderId }}</strong>
                                        &nbsp;|&nbsp; {{ r.order.mode === 'collection' ? 'Picking List' : 'Delivery' }}
                                        &nbsp;|&nbsp; {{ r.order.createdAt | date:'dd-MM-yyyy' }}
                                    </td>
                                </tr>
                                @for (line of r.lines; track line.index) {
                                    <tr [class.alt]="line.index % 2 === 0">
                                        <td class="c-n tc">{{ globalOffset(gi, line.index) }}</td>
                                        <td class="c-d">{{ line.description }}</td>
                                        <td class="c-q tc">{{ line.qty }}</td>
                                        <td class="c-p tr">{{ line.unitPrice | currency:'GBP' }}</td>
                                        <td class="c-dc tr red">@if (line.discount > 0) { -{{ line.discount | currency:'GBP' }} } @else { &mdash; }</td>
                                        <td class="c-v tr">{{ line.vatAmount | currency:'GBP' }}</td>
                                        <td class="c-t tr fw">{{ line.lineTotal | currency:'GBP' }}</td>
                                    </tr>
                                }
                            }
                        </tbody>
                        <tfoot>
                            <tr><td colspan="7" class="tfoot-cell">
                                <div class="totals-wrap">
                                    <div class="totals">
                                        <div class="t-row"><span>Net Price</span><span>{{ grandNetPrice | currency:'GBP' }}</span></div>
                                        <div class="t-row"><span>VAT</span><span>{{ grandVat | currency:'GBP' }}</span></div>
                                        <div class="t-row"><span>Current Total</span><span>{{ grandCurrentTotal | currency:'GBP' }}</span></div>
                                        @if (grandDiscount > 0) {
                                            <div class="t-row red"><span>Total Discount</span><span>-{{ grandDiscount | currency:'GBP' }}</span></div>
                                        }
                                        <div class="t-row prev"><span>Previous Balance</span><span>{{ previousBalance | currency:'GBP' }}</span></div>
                                        <div class="t-row grand"><span>Total Balance Dues</span><span class="grand-v">{{ grandTotal | currency:'GBP' }}</span></div>
                                    </div>
                                </div>
                            </td></tr>
                        </tfoot>
                    </table>

                </div>
            </div>
        </p-dialog>
    `,
    styles: `
        .action-bar { display:flex; justify-content:space-between; align-items:center; padding:.65rem 1rem; background:#fff; border-bottom:1px solid #e5e7eb; }
        .bar-title { font-size:.9rem; font-weight:600; color:#374151; }
        .bar-count { font-size:.78rem; font-weight:400; color:#9ca3af; margin-left:.4rem; }
        .bar-btns { display:flex; gap:.5rem; align-items:center; }
        .preview-scroll { background:#e8e8e8; padding:1.5rem; max-height:82vh; overflow-y:auto; display:flex; flex-direction:column; gap:2rem; align-items:center; }
        .invoice-card { width:794px; background:#fff; padding:40px 46px; box-shadow:0 2px 16px rgba(0,0,0,.1); font-family:Arial,Helvetica,sans-serif; font-size:9.5pt; color:#1a1a1a; box-sizing:border-box; }
        .inv-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm; }
        .co-name { font-size:20pt; font-weight:900; color:#1a6b3a; letter-spacing:.02em; margin-bottom:1.5mm; }
        .co-addr { font-size:8.5pt; color:#374151; }
        .co-meta { font-size:8pt; color:#6b7280; margin-top:1mm; }
        .pipe { margin:0 .5em; color:#d1d5db; }
        .logo-ring { width:52px; height:52px; border:3px solid #1a6b3a; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; }
        .logo-kf { font-size:14pt; font-weight:900; color:#1a6b3a; }
        .logo-sub { font-size:4.5pt; font-weight:700; color:#1a6b3a; text-align:center; letter-spacing:.06em; }
        .hdr-line { border:none; border-top:2px solid #1a1a1a; margin-bottom:4mm; }
        .inv-meta { display:flex; justify-content:space-between; margin-bottom:5mm; font-size:9pt; }
        .lbl { color:#6b7280; font-size:8pt; margin-right:.3em; }
        .inv-no { font-weight:700; color:#1a6b3a; }
        .inv-date { font-weight:600; }
        .parties { display:grid; grid-template-columns:1fr 1fr; gap:6mm; margin-bottom:6mm; }
        .sec-lbl { font-size:7.5pt; font-weight:700; color:#1a6b3a; letter-spacing:.06em; margin-bottom:2mm; }
        .bill-name { font-size:11pt; font-weight:700; margin-bottom:1mm; }
        .bill-det { font-size:8.5pt; color:#374151; line-height:1.4; }
        .det-row { display:flex; gap:.5em; margin-bottom:1.5mm; font-size:8.5pt; }
        .det-k { color:#6b7280; min-width:90px; }
        .det-v { font-weight:600; }
        .lines-tbl { width:100%; border-collapse:collapse; font-size:8.5pt; }
        .lines-tbl thead tr { background:#1a6b3a; color:#fff; }
        .lines-tbl thead th { padding:2.5mm; font-weight:700; font-size:7.5pt; text-align:left; }
        .lines-tbl tbody tr.order-sep td { background:#e8f5ee; color:#1a6b3a; font-size:7.5pt; padding:1.5mm 2.5mm; border-bottom:1px solid #c3e0ce; }
        .lines-tbl tbody tr { border-bottom:1px solid #f0f0f0; }
        .lines-tbl tbody tr.alt { background:#f9fafb; }
        .lines-tbl tbody td { padding:2.5mm; vertical-align:top; line-height:1.35; }
        .c-n{width:5%} .c-d{width:33%} .c-q{width:7%} .c-p{width:13%} .c-dc{width:12%} .c-v{width:12%} .c-t{width:18%}
        .tc{text-align:center} .tr{text-align:right} .fw{font-weight:700} .red{color:#dc2626}
        .tfoot-cell { padding-top:6mm; }
        .totals-wrap { display:flex; justify-content:flex-end; }
        .totals { width:52%; border-top:1.5px solid #1a1a1a; padding-top:3mm; }
        .t-row { display:flex; justify-content:space-between; padding:1.2mm 0; font-size:9pt; border-bottom:1px solid #f0f0f0; }
        .t-row.red span { color:#dc2626; }
        .t-row.prev span:first-child { color:#dc2626; }
        .t-row.grand { border-top:2px solid #1a1a1a; border-bottom:none; padding-top:3mm; margin-top:1mm; font-size:11pt; font-weight:800; }
        .grand-v { color:#1a6b3a; }
    `
})
export class InvoicePrintComponent implements OnChanges {
    @Input() orders: GroupedSaleOrder[] = [];
    @Input() visible = false;
    @Input() previousBalance = 0;
    @Output() close = new EventEmitter<void>();

    rendered: RenderedOrder[] = [];
    today = new Date();

    get firstOrder() { return this.rendered[0] ?? null; }
    get grandNetPrice()    { return this.rendered.reduce((s, r) => s + r.netPrice, 0); }
    get grandVat()         { return this.rendered.reduce((s, r) => s + r.totalVat, 0); }
    get grandCurrentTotal(){ return this.rendered.reduce((s, r) => s + Number(r.order.total), 0); }
    get grandDiscount()    { return this.rendered.reduce((s, r) => s + r.totalDiscount, 0); }
    get grandTotal()       { return this.rendered.reduce((s, r) => s + r.grandTotal, 0); }

    // Returns a continuous global row number across all orders for the # column
    globalOffset(orderIndex: number, lineIndex: number): number {
        let offset = 0;
        for (let i = 0; i < orderIndex; i++) offset += this.rendered[i].lines.length;
        return offset + lineIndex;
    }

    ngOnChanges() {
        if (!this.orders?.length) { this.rendered = []; return; }
        this.rendered = this.orders.map(o => this.build(o));
    }

    private build(order: GroupedSaleOrder): RenderedOrder {
        const lines: InvoiceLine[] = order.items.map((item, i) => ({
            index: i + 1, description: item.name,
            qty: Number(item.quantity), unitPrice: Number(item.price),
            discount: 0, vatAmount: 0,
            lineTotal: Number(item.price) * Number(item.quantity)
        }));
        const netPrice = lines.reduce((s, l) => s + l.lineTotal, 0);
        const totalVat = 0;
        const totalDiscount = 0;
        const grandTotal = Number(order.total) + totalVat + this.previousBalance;
        const d = new Date(order.createdAt);
        const due = new Date(order.createdAt);
        due.setDate(d.getDate() + 30);
        const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
        return { order, lines, netPrice, totalVat, totalDiscount, grandTotal, dueDate: fmt(due) };
    }

    // Opens a BLANK new window and writes the invoice HTML into it, then prints.
    // This completely escapes the Sakai layout so the PDF only contains invoice content.
    print() {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) { alert('Please allow popups for this site to print invoices.'); return; }

        const fmt = (n: number) => '£' + n.toFixed(2);
        const fmtDate = (s: string) => {
            const d = new Date(s);
            return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
        };

        // ONE document: all orders' rows combined into a single table.
        // Header appears once at top, totals once at bottom.
        // Each order's rows are preceded by a shaded order-header row so
        // the reader knows which order each group of items belongs to.
        let globalIndex = 1;
        const grandNetPrice   = this.rendered.reduce((s, r) => s + r.netPrice, 0);
        const grandVat        = this.rendered.reduce((s, r) => s + r.totalVat, 0);
        const grandDiscount   = this.rendered.reduce((s, r) => s + r.totalDiscount, 0);
        const grandTotal      = this.rendered.reduce((s, r) => s + r.grandTotal, 0);
        const currentTotal    = this.rendered.reduce((s, r) => s + Number(r.order.total), 0);

        // Use first order's bill-to as the primary customer (picking list style)
        const firstOrder = this.rendered[0]?.order;
        const billTo = firstOrder?.user
            ? `<div class="bname">${firstOrder.user.firstName.toUpperCase()} ${firstOrder.user.lastName.toUpperCase()}</div>
               <div class="bdet">${firstOrder.user.phone}</div>
               ${firstOrder.user.address ? `<div class="bdet">${firstOrder.user.address.street}, ${firstOrder.user.address.city} ${firstOrder.user.address.zipCode}</div>` : ''}`
            : firstOrder?.shipping
            ? `<div class="bname">${firstOrder.shipping.firstName.toUpperCase()} ${firstOrder.shipping.lastName.toUpperCase()}</div>
               <div class="bdet">${firstOrder.shipping.shippingAddress}, ${firstOrder.shipping.shippingCity}</div>`
            : '';

        const allRows = this.rendered.map(r => {
            // Shaded separator row showing the order ID - helps identify which
            // order each line belongs to when printing multiple orders together
            const orderHeaderRow = `
                <tr class="order-sep">
                    <td colspan="7">Order: <strong>${r.order.orderId}</strong>
                    &nbsp;|&nbsp; ${r.order.mode === 'collection' ? 'Picking List' : 'Delivery'}
                    &nbsp;|&nbsp; ${fmtDate(r.order.createdAt)}</td>
                </tr>`;

            const itemRows = r.lines.map(l => {
                const i = globalIndex++;
                return `<tr class="${i % 2 === 0 ? 'alt' : ''}">
                    <td class="cn tc">${i}</td>
                    <td class="cd">${l.description}</td>
                    <td class="cq tc">${l.qty}</td>
                    <td class="cp tr">${fmt(l.unitPrice)}</td>
                    <td class="cdc tr red">${l.discount > 0 ? '-' + fmt(l.discount) : '&mdash;'}</td>
                    <td class="cv tr">${fmt(l.vatAmount)}</td>
                    <td class="ct tr fw">${fmt(l.lineTotal)}</td>
                </tr>`;
            }).join('');

            return orderHeaderRow + itemRows;
        }).join('');

        const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Khyber Foods - Invoice</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,Helvetica,sans-serif; font-size:9.5pt; color:#1a1a1a; background:#fff; padding:15mm 18mm; }
.hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5mm; }
.co-name { font-size:20pt; font-weight:900; color:#1a6b3a; letter-spacing:.02em; margin-bottom:1.5mm; }
.co-addr { font-size:8.5pt; color:#374151; }
.co-meta { font-size:8pt; color:#6b7280; margin-top:1mm; }
.pipe { margin:0 .5em; color:#d1d5db; }
.logo { width:52px; height:52px; border:3px solid #1a6b3a; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; }
.kf { font-size:14pt; font-weight:900; color:#1a6b3a; }
.kfsub { font-size:4.5pt; font-weight:700; color:#1a6b3a; text-align:center; letter-spacing:.06em; }
.hline { border-top:2px solid #1a1a1a; margin-bottom:4mm; }
.meta { display:flex; justify-content:space-between; margin-bottom:5mm; font-size:9pt; }
.lbl { color:#6b7280; font-size:8pt; }
.ino { font-weight:700; color:#1a6b3a; }
.idate { font-weight:600; }
.parties { display:grid; grid-template-columns:1fr 1fr; gap:6mm; margin-bottom:6mm; }
.slbl { font-size:7.5pt; font-weight:700; color:#1a6b3a; letter-spacing:.06em; margin-bottom:2mm; }
.bname { font-size:11pt; font-weight:700; margin-bottom:1mm; }
.bdet { font-size:8.5pt; color:#374151; line-height:1.4; }
.drow { display:flex; gap:.5em; margin-bottom:1.5mm; font-size:8.5pt; }
.dk { color:#6b7280; min-width:90px; }
.dv { font-weight:600; }
table { width:100%; border-collapse:collapse; font-size:8.5pt; }
thead tr { background:#1a6b3a; color:#fff; }
thead th { padding:2.5mm; font-weight:700; font-size:7.5pt; text-align:left; }
tbody tr { border-bottom:1px solid #f0f0f0; }
tbody tr.alt { background:#f9fafb; }
tbody tr.order-sep td { background:#e8f5ee; color:#1a6b3a; font-size:7.5pt; padding:1.5mm 2.5mm; border-bottom:1px solid #c3e0ce; }
tbody td { padding:2.5mm; vertical-align:top; line-height:1.35; }
.cn{width:5%}.cd{width:33%}.cq{width:7%}.cp{width:13%}.cdc{width:12%}.cv{width:12%}.ct{width:18%}
.tc{text-align:center}.tr{text-align:right}.fw{font-weight:700}.red{color:#dc2626}
tfoot td { padding-top:6mm; }
.tw { display:flex; justify-content:flex-end; }
.tb { width:52%; border-top:1.5px solid #1a1a1a; padding-top:3mm; }
.tr2 { display:flex; justify-content:space-between; padding:1.2mm 0; font-size:9pt; border-bottom:1px solid #f0f0f0; }
.tr2.red span { color:#dc2626; }
.tr2.prev span:first-child { color:#dc2626; }
.tr2.grand { border-top:2px solid #1a1a1a; border-bottom:none; padding-top:3mm; font-size:11pt; font-weight:800; }
.gv { color:#1a6b3a; }
@media print {
    body { padding:10mm 12mm; }
    thead { display:table-header-group; }
    tfoot { display:table-footer-group; }
    tbody tr { page-break-inside:avoid; }
}
</style>
</head><body>

<div class="hdr">
    <div>
        <div class="co-name">KHYBER FOODS LTD</div>
        <div class="co-addr">UNIT C DORIS ROAD BORDESLEY GREEN, B9 4SJ</div>
        <div class="co-meta">Tel: 0121 773 0670 <span class="pipe">|</span> VAT Reg: 155101156 <span class="pipe">|</span> Co Reg: 8023193</div>
    </div>
    <div class="logo"><span class="kf">KF</span><span class="kfsub">KHYBER<br/>FOODS</span></div>
</div>
<div class="hline"></div>

<div class="meta">
    <div><span class="lbl">INVOICE NO: </span><span class="ino">Picking List (${this.rendered.length} orders)</span></div>
    <div><span class="lbl">DATE: </span><span class="idate">${fmtDate(new Date().toISOString())}</span></div>
</div>

<div class="parties">
    <div><div class="slbl">BILL TO</div>${billTo}</div>
    <div>
        <div class="slbl">ORDER DETAILS</div>
        <div class="drow"><span class="dk">Order Type:</span><span class="dv">Picking List</span></div>
        <div class="drow"><span class="dk">Payment Terms:</span><span class="dv">Net 30 Days</span></div>
    </div>
</div>

<table>
    <thead><tr>
        <th class="cn">#</th><th class="cd">DESCRIPTION</th><th class="cq">QTY</th>
        <th class="cp">PRICE</th><th class="cdc">DISCOUNT</th><th class="cv">VAT</th><th class="ct">TOTAL</th>
    </tr></thead>
    <tbody>${allRows}</tbody>
    <tfoot><tr><td colspan="7">
        <div class="tw"><div class="tb">
            <div class="tr2"><span>Net Price</span><span>${fmt(grandNetPrice)}</span></div>
            <div class="tr2"><span>VAT</span><span>${fmt(grandVat)}</span></div>
            <div class="tr2"><span>Current Total</span><span>${fmt(currentTotal)}</span></div>
            ${grandDiscount > 0 ? `<div class="tr2 red"><span>Total Discount</span><span>-${fmt(grandDiscount)}</span></div>` : ''}
            <div class="tr2 prev"><span>Previous Balance</span><span>${fmt(this.previousBalance)}</span></div>
            <div class="tr2 grand"><span>Total Balance Dues</span><span class="gv">${fmt(grandTotal)}</span></div>
        </div></div>
    </td></tr></tfoot>
</table>

</body></html>`;

        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 500);
    }

    email() { alert('Wire to your backend email endpoint.'); }
}