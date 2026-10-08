/* Ported from Frontend/src/modules/Food/components/admin/orders/useOrdersManagement.js (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { exportToCSV, exportToExcel, exportToPDF, exportToJSON } from './ordersExportUtils';
import { DEFAULT_BRAND_LOGO } from '../../../../admin/brandLogo';
import { getCachedSettings, loadBusinessSettings } from '../../../utils/businessSettings';
import { alert } from '../../../../lib/webShim';
import { saveHtmlAsPdf } from '../../../../lib/files';
import { mediaUrl } from '../../../../api/client';
const debugError = () => {};
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoney = (value) => `INR ${toNumber(value).toFixed(2)}`;
const formatDisplayText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
};
const formatOrderAddress = (address) => {
  if (!address || typeof address !== 'object') return 'Not available';
  const formattedAddress = String(address.formattedAddress || '').trim();
  const rawAddress = String(address.address || '').trim();
  const primaryParts = [
    address.label,
    address.street,
    address.additionalDetails,
    address.landmark,
    address.addressLine1,
    address.addressLine2,
    address.area,
    address.city,
    address.state,
    address.zipCode,
    address.postalCode,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const orderedParts = [];
  const pushPart = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    const isContained = orderedParts.some((existingPart) => {
      const existingKey = existingPart.toLowerCase();
      return existingKey === key || existingKey.includes(key) || key.includes(existingKey);
    });
    if (isContained) return;
    orderedParts.push(normalized);
  };
  if (formattedAddress) pushPart(formattedAddress);
  if (rawAddress && rawAddress.toLowerCase() !== formattedAddress.toLowerCase()) pushPart(rawAddress);
  primaryParts.forEach(pushPart);
  return orderedParts.join(', ') || 'Not available';
};
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
export function useOrdersManagement(orders, statusKey, title, options = {}) {
  const serverSideSearch = options.serverSideSearch === true;
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = options.searchQuery !== undefined ? options.searchQuery : internalSearchQuery;
  const setSearchQuery = options.setSearchQuery || setInternalSearchQuery;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    paymentStatus: '',
    deliveryType: '',
    minAmount: '',
    maxAmount: '',
    fromDate: '',
    toDate: '',
    restaurant: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    orderId: true,
    orderDate: true,
    orderOtp: true,
    customer: true,
    restaurant: true,
    foodItems: true,
    itemPrice: true,
    deliveryCharge: true,
    totalAmount: true,
    paymentType: true,
    paymentCollectionStatus: true,
    orderStatus: true,
    actions: true,
  });

  // Get unique restaurants from orders
  const restaurants = useMemo(() => {
    return [...new Set(orders.map((o) => o.restaurant))];
  }, [orders]);

  // Apply search and filters
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply search query only when search is client-side
    if (!serverSideSearch && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((order) => {
        const safeTotal = order.totalAmount ?? order.total ?? order.pricing?.total ?? 0;
        const totalStr = String(safeTotal);
        return (
          String(order.orderId || '')
            .toLowerCase()
            .includes(query) ||
          String(order.customerName || '')
            .toLowerCase()
            .includes(query) ||
          String(order.restaurant || '')
            .toLowerCase()
            .includes(query) ||
          String(order.customerPhone || '').includes(query) ||
          totalStr.includes(query)
        );
      });
    }

    // Apply filters
    if (filters.paymentStatus) {
      const wanted = filters.paymentStatus.toLowerCase();
      result = result.filter((order) => {
        const paymentStatus = String(order.paymentStatus || '').toLowerCase();
        const collectionStatus = String(order.paymentCollectionStatus || '').toLowerCase();
        return paymentStatus === wanted || collectionStatus === wanted;
      });
    }
    if (filters.deliveryType) {
      result = result.filter((order) => String(order.deliveryType || '').toLowerCase() === filters.deliveryType.toLowerCase());
    }
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      result = result.filter((order) => {
        const amount = order.totalAmount ?? order.total ?? order.pricing?.total ?? 0;
        return Number(amount) >= min;
      });
    }
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      result = result.filter((order) => {
        const amount = order.totalAmount ?? order.total ?? order.pricing?.total ?? 0;
        return Number(amount) <= max;
      });
    }
    if (filters.restaurant) {
      result = result.filter((order) => order.restaurant === filters.restaurant);
    }

    // Helper function to parse date format "16 JUL 2025"
    const parseOrderDate = (dateStr) => {
      const months = {
        JAN: '01',
        FEB: '02',
        MAR: '03',
        APR: '04',
        MAY: '05',
        JUN: '06',
        JUL: '07',
        AUG: '08',
        SEP: '09',
        OCT: '10',
        NOV: '11',
        DEC: '12',
      };
      const parts = dateStr.split(' ');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1].toUpperCase()] || '01';
        const year = parts[2];
        return new Date(`${year}-${month}-${day}`);
      }
      return new Date(dateStr);
    };
    if (filters.fromDate) {
      result = result.filter((order) => {
        const orderDate = parseOrderDate(order.date);
        const fromDate = new Date(filters.fromDate);
        return orderDate >= fromDate;
      });
    }
    if (filters.toDate) {
      result = result.filter((order) => {
        const orderDate = parseOrderDate(order.date);
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        return orderDate <= toDate;
      });
    }
    return result;
  }, [orders, searchQuery, filters, serverSideSearch]);
  const count = filteredOrders.length;

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((value) => value !== '').length;
  }, [filters]);
  const handleApplyFilters = () => {
    setIsFilterOpen(false);
  };
  const handleResetFilters = () => {
    setFilters({
      paymentStatus: '',
      deliveryType: '',
      minAmount: '',
      maxAmount: '',
      fromDate: '',
      toDate: '',
      restaurant: '',
    });
  };
  const handleExport = (format) => {
    const filename = title.toLowerCase().replace(/\s+/g, '_');
    switch (format) {
      case 'csv':
        exportToCSV(filteredOrders, filename);
        break;
      case 'excel':
        exportToExcel(filteredOrders, filename);
        break;
      case 'pdf':
        exportToPDF(filteredOrders, filename);
        break;
      case 'json':
        exportToJSON(filteredOrders, filename);
        break;
      default:
        break;
    }
  };
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsViewOrderOpen(true);
  };
  const handlePrintOrder = async (order) => {
    try {
      const orderId = order.orderId || order.id || order.subscriptionId || 'N/A';
      const orderDate = order.date && order.time ? `${order.date}, ${order.time}` : order.date || new Date().toLocaleDateString();
      const settings = getCachedSettings() || (await loadBusinessSettings());
      const companyName = settings?.companyName || 'Dima Hasao Food';
      const logoUrl = settings?.logo?.url || DEFAULT_BRAND_LOGO;
      const logoSrc = logoUrl ? mediaUrl(logoUrl) || logoUrl : null;
      const items = Array.isArray(order.items) ? order.items : [];
      const itemsSubtotal = items.reduce((sum, item) => {
        const qty = toNumber(item?.quantity || 1);
        const unitPrice = toNumber(item?.price);
        return sum + qty * unitPrice;
      }, 0);
      const subtotal = itemsSubtotal > 0 ? itemsSubtotal : toNumber(order.totalItemAmount ?? order.subtotal ?? order.pricing?.subtotal ?? order.totalAmount);
      const deliveryFee = toNumber(order.deliveryCharge ?? order.deliveryFee ?? order.pricing?.deliveryFee ?? order.delivery?.fee);
      const taxAmount = toNumber(order.vatTax ?? order.taxAmount ?? order.tax ?? order.pricing?.tax);
      const discountAmount = toNumber(order.couponDiscount ?? order.itemDiscount ?? order.discountAmount ?? order.pricing?.discount);
      const computedTotal = subtotal + deliveryFee + taxAmount - discountAmount;
      const totalAmount = toNumber(order.totalAmount ?? order.pricing?.total ?? computedTotal);
      const paymentType = order.paymentType || order.payment?.method || order.paymentMethod || 'N/A';
      const deliveryPartnerName = formatDisplayText(
        order.deliveryPartnerName || order.deliveryBoyName || order.deliveryPartnerId?.name || order.dispatch?.deliveryPartnerId?.name,
      );
      const deliveryPartnerPhone = formatDisplayText(
        order.deliveryPartnerPhone || order.deliveryBoyNumber || order.deliveryPartnerId?.phone || order.dispatch?.deliveryPartnerId?.phone,
      );
      const orderStatus = formatDisplayText(order.orderStatus || order.status);
      const paymentStatusRaw = order.payment?.status;
      let resolvedPaymentStatus = 'Pending';
      if (paymentStatusRaw === 'paid' || paymentStatusRaw === 'captured' || paymentStatusRaw === 'settled') resolvedPaymentStatus = 'Paid';
      else if (paymentStatusRaw === 'cod_pending') resolvedPaymentStatus = 'COD Pending';
      else if (paymentStatusRaw === 'refunded') resolvedPaymentStatus = 'Refunded';
      else if (paymentStatusRaw === 'failed') resolvedPaymentStatus = 'Failed';
      else if (order.paymentStatus === 'Collected' || order.paymentStatus === 'Paid') resolvedPaymentStatus = 'Paid';
      else if (order.paymentStatus === 'Not Collected' || order.paymentStatus === 'COD Pending') resolvedPaymentStatus = 'COD Pending';
      else
        resolvedPaymentStatus = formatDisplayText(
          order.paymentStatus || order.paymentCollectionStatus || (paymentType === 'Cash on Delivery' ? 'COD Pending' : null),
        );
      const paymentStatus = resolvedPaymentStatus;
      const customerName = formatDisplayText(order.customerName);
      const customerPhone = formatDisplayText(order.customerPhone);
      const restaurantName = formatDisplayText(order.restaurant);
      const deliveryType = formatDisplayText(order.deliveryType);
      const deliveryAddress = formatOrderAddress(order.address || order.customerAddress || order.deliveryAddress);
      const itemCount = items.reduce((sum, item) => sum + toNumber(item?.quantity || 1), 0) || items.length;
      // Same invoice as the web's jsPDF layout: teal header band, three info cards,
      // a summary strip, the items grid, the totals box and a footer line.
      const e = escapeHtml;
      const infoCard = (titleText, rows, accent) => `
        <div class="card"><div class="card-title" style="background:${accent}">${e(titleText)}</div>
        ${rows.map((row) => `<div class="row"><b>${e(row.label)}:</b> <span>${e(formatDisplayText(row.value))}</span></div>`).join('')}</div>`;
      const tableBody =
        items.length > 0
          ? items.map((item) => {
              const qty = toNumber(item.quantity || 1);
              const itemTitle = item.name || item.itemName || item.title || 'Item';
              const unitPrice = toNumber(item.price);
              const lineTotal = qty * unitPrice;
              return [qty, itemTitle, formatMoney(unitPrice), formatMoney(lineTotal)];
            })
          : [[1, 'Order Total', formatMoney(totalAmount), formatMoney(totalAmount)]];
      const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
        body{font-family:Helvetica,Arial,sans-serif;margin:0;color:#1E293B;font-size:9pt}
        .head{background:#0F766E;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{width:64px;height:64px;object-fit:contain;border-radius:6px;background:#fff}
        .brand h1{font-size:17pt;margin:0}.brand p{margin:2px 0;font-size:10pt}.brand small{font-size:8.5pt}
        .meta{text-align:right;font-size:9pt;line-height:1.6}
        .wrap{padding:16px 24px}
        .cards{display:flex;gap:10px}
        .card{flex:1;border:1px solid #E2E8F0;border-radius:6px;overflow:hidden;padding-bottom:6px}
        .card-title{color:#fff;font-weight:bold;padding:5px 8px;font-size:9pt}
        .row{padding:3px 8px;color:#475569;font-size:8.5pt}
        table{width:100%;border-collapse:collapse;margin-top:14px}
        .strip td{background:#F1F5F9;border:1px solid #E2E8F0;font-weight:bold;padding:8px}
        .strip td:last-child{text-align:right;color:#0F766E}
        .items th{background:#0F766E;color:#fff;padding:7px;font-size:9pt;text-align:left}
        .items td{border:1px solid #E2E8F0;padding:7px}
        .items tr:nth-child(even) td{background:#F8FAFC}
        .r{text-align:right}.c{text-align:center}
        .sum{width:290px;margin:16px 0 0 auto;border:1px solid #E2E8F0;background:#F8FAFC;border-radius:4px}
        .sum td{padding:4px 8px;font-size:10pt}.sum td:first-child{font-weight:bold}
        .sum tr:last-child td{font-weight:bold;font-size:11pt;color:#0F766E}
        .foot{margin-top:28px;border-top:1px solid #E2E8F0;padding-top:8px;display:flex;justify-content:space-between;color:#64748B}
      </style></head><body>
        <div class="head"><div class="brand">${logoSrc ? `<img src="${e(logoSrc)}"/>` : ''}<div>
          <h1>${e(companyName)}</h1><p>Order Invoice</p><small>Admin order summary with billing and delivery details</small></div></div>
          <div class="meta">Invoice #: ${e(orderId)}<br/>Date: ${e(orderDate)}<br/>Status: ${e(orderStatus)}<br/>Payment: ${e(paymentStatus)}</div></div>
        <div class="wrap">
          <div class="cards">
            ${infoCard('Customer', [{ label: 'Name', value: customerName }, { label: 'Phone', value: customerPhone }, { label: 'Address', value: deliveryAddress }], '#0F766E')}
            ${infoCard('Restaurant', [{ label: 'Name', value: restaurantName }, { label: 'Delivery', value: deliveryType }, { label: 'Items', value: `${itemCount} item${itemCount === 1 ? '' : 's'}` }], '#2563EB')}
            ${infoCard('Delivery Partner', [{ label: 'Name', value: deliveryPartnerName }, { label: 'Phone', value: deliveryPartnerPhone }, { label: 'Payment', value: paymentType }], '#F97316')}
          </div>
          <table class="strip"><tr><td>Order ID: ${e(orderId)}</td><td>Status: ${e(orderStatus)}</td><td>Payment Status: ${e(paymentStatus)}</td><td>Grand Total: ${e(formatMoney(totalAmount))}</td></tr></table>
          <table class="items"><thead><tr><th class="c">Qty</th><th>Item</th><th class="r">Unit Price</th><th class="r">Line Total</th></tr></thead>
          <tbody>${tableBody.map((r) => `<tr><td class="c">${e(r[0])}</td><td>${e(r[1])}</td><td class="r">${e(r[2])}</td><td class="r">${e(r[3])}</td></tr>`).join('')}</tbody></table>
          <table class="sum">
            <tr><td>Subtotal</td><td class="r">${e(formatMoney(subtotal))}</td></tr>
            <tr><td>Delivery Fee</td><td class="r">${e(formatMoney(deliveryFee))}</td></tr>
            <tr><td>Tax</td><td class="r">${e(formatMoney(taxAmount))}</td></tr>
            <tr><td>Discount</td><td class="r">- ${e(formatMoney(discountAmount))}</td></tr>
            <tr><td>Grand Total</td><td class="r">${e(formatMoney(totalAmount))}</td></tr>
          </table>
          <div class="foot"><span>Generated on ${e(new Date().toLocaleString())}</span><span>Includes customer, restaurant, and delivery partner details.</span></div>
        </div></body></html>`;
      const filename = `Invoice_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`;
      await saveHtmlAsPdf(filename, html);
    } catch (error) {
      debugError('Error generating PDF invoice:', error);
      alert('Failed to download PDF invoice. Please try again.');
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      orderId: true,
      orderDate: true,
      orderOtp: true,
      customer: true,
      restaurant: true,
      foodItems: true,
      itemPrice: true,
      deliveryCharge: true,
      totalAmount: true,
      paymentType: true,
      paymentCollectionStatus: true,
      orderStatus: true,
      actions: true,
    });
  };
  return {
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isViewOrderOpen,
    setIsViewOrderOpen,
    selectedOrder,
    setSelectedOrder,
    filters,
    setFilters,
    visibleColumns,
    filteredOrders,
    count,
    activeFiltersCount,
    restaurants,
    handleApplyFilters,
    handleResetFilters,
    handleExport,
    handleViewOrder,
    handlePrintOrder,
    toggleColumn,
    resetColumns,
  };
}
