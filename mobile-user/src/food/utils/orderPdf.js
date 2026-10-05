import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * The "Order: Summary and Receipt" the web builds with jsPDF
 * (UserOrderDetails.handleDownloadSummary), as a one-page PDF handed to the
 * share sheet (the phone's "download").
 */
export async function shareOrderSummaryPdf({ companyName, orderIdDisplay, paymentDate, userName, addressText, restaurantName, restaurantLocation, items, total }) {
  const rows = items
    .map((item) => {
      const qty = item.quantity || item.qty || 1;
      const name = item.variantName ? `${item.name || 'Item'} (${item.variantName})` : item.name || 'Item';
      return `<tr><td>${esc(name)}</td><td style="text-align:center">${qty}</td><td style="text-align:right">₹${Number(item.price || 0).toFixed(2)}</td><td style="text-align:right;font-weight:bold">₹${Number((item.price || 0) * qty).toFixed(2)}</td></tr>`;
    })
    .join('');
  const html = `<html><head><meta charset="utf-8"/><style>
    body{font-family:Helvetica,Arial,sans-serif;padding:32px;color:#000;font-size:12px}
    h1{font-size:18px;text-align:center;margin:0 0 24px}
    .r{display:flex;margin-bottom:6px}.l{width:150px;font-weight:bold}.v{flex:1}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#000;color:#fff;font-size:12px;padding:6px;text-align:left}
    td{padding:6px;font-size:11px;border-bottom:1px solid #eee}
    tr:nth-child(even) td{background:#f5f5f5}
    .t{text-align:right;font-size:15px;font-weight:bold;margin-top:14px}
  </style></head><body>
    <h1>${esc(companyName)} Order: Summary and Receipt</h1>
    <div class="r"><div class="l">Order ID:</div><div class="v">${esc(orderIdDisplay)}</div></div>
    <div class="r"><div class="l">Order Time:</div><div class="v">${esc(paymentDate || 'N/A')}</div></div>
    <div class="r"><div class="l">Customer Name:</div><div class="v">${esc(userName || 'Customer')}</div></div>
    <div class="r"><div class="l">Delivery Address:</div><div class="v">${esc(addressText || 'N/A')}</div></div>
    <div class="r"><div class="l">Restaurant Name:</div><div class="v">${esc(restaurantName)}</div></div>
    <div class="r"><div class="l">Restaurant Address:</div><div class="v">${esc(restaurantLocation || 'N/A')}</div></div>
    <table><thead><tr><th>Item</th><th style="text-align:center">Quantity</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total Price</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="t">Total: ₹${Number(total || 0).toFixed(2)}</div>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Order_Summary_${orderIdDisplay}`, UTI: 'com.adobe.pdf' });
}
