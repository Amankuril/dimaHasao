import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toast } from '../../lib/notify';

/*
 * The order receipt the web builds with jsPDF (OrdersMain.jsx handlePrint):
 * same fields in the same order, rendered to a PDF with the system print
 * engine and handed to the share / print sheet.
 *
 * On the web that handler reads an undefined `orderToPrint` and always ends in
 * "Failed to generate PDF"; here it prints the order it was meant to print.
 */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const dateTime = (value) =>
  (value ? new Date(value) : new Date()).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

export function buildReceiptHtml(order = {}) {
  const address = order.customerAddress ? [order.customerAddress.street, order.customerAddress.city, order.customerAddress.state].filter(Boolean).join(', ') || 'Address not available' : '';
  const rows = (order.items || [])
    .map(
      (item) =>
        `<tr><td>${esc(item.variantName ? `${item.name || 'Item'} (${item.variantName})` : item.name || 'Item')}</td><td class="c">${esc(item.quantity || 1)}</td><td class="r">${money(item.price)}</td><td class="r">${money((item.price || 0) * (item.quantity || 1))}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#000;padding:24px}
    h1{font-size:22px;text-align:center;margin:0 0 8px}
    h2{font-size:15px;font-weight:normal;text-align:center;margin:0 0 20px}
    p{margin:0 0 6px} b{font-weight:bold}
    table{width:100%;border-collapse:collapse;margin:8px 0 14px}
    th{background:#000;color:#fff;text-align:left;padding:6px;font-size:10px}
    td{padding:6px;font-size:10px} tr:nth-child(even) td{background:#f2f2f2}
    .c{text-align:center} .r{text-align:right}
    .total{font-size:13px;font-weight:bold;margin:10px 0}
    .foot{margin-top:40px;text-align:center;font-size:9px;font-style:italic}
  </style></head><body>
    <h1>Order Receipt</h1>
    <h2>${esc(order.restaurantName || 'Restaurant')}</h2>
    <p><b>Order ID: ${esc(order.orderId || 'N/A')}</b></p>
    <p>Date: ${esc(dateTime(order.createdAt))}</p>
    ${address ? `<p><b>Delivery Address:</b></p><p>${esc(address)}</p>` : ''}
    ${rows ? `<p><b>Items:</b></p><table><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>${rows}</table>` : ''}
    <p class="total">Total: ${money(order.total)}</p>
    <p>Payment Status: ${order.status === 'confirmed' ? 'Paid' : 'Pending'}</p>
    ${order.estimatedDeliveryTime ? `<p>Estimated Delivery: ${esc(order.estimatedDeliveryTime)} minutes</p>` : ''}
    ${order.note ? `<p><b>Note for Delivery:</b></p><p>${esc(order.note)}</p>` : ''}
    ${order.restaurantNote ? `<p><b>Note for Restaurant:</b></p><p>${esc(order.restaurantNote)}</p>` : ''}
    <p class="foot">Generated on ${esc(new Date().toLocaleString('en-GB', { hour12: true }))}</p>
  </body></html>`;
}

/** Renders the receipt to a PDF and opens the share sheet (save, print, send). */
export async function printOrderReceipt(order) {
  if (!order) return;
  try {
    const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(order) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Order-${order.orderId || 'Receipt'}` });
    } else {
      await Print.printAsync({ uri });
    }
  } catch {
    toast.error('Failed to generate PDF. Please try again.');
  }
}
