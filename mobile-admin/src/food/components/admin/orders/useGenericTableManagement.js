/* Ported from Frontend/src/modules/Food/components/admin/orders/useGenericTableManagement.js (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { exportToExcel, exportToPDF } from './ordersExportUtils';
import { alert } from '../../../../lib/webShim';
import { saveHtmlAsPdf } from '../../../../lib/files';
const debugError = (...args) => {};
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoney = (value) => `Rs. ${toNumber(value).toFixed(2)}`;
const formatOrderDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date().toLocaleDateString();
  return date
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
};
const formatOrderTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
};
const getOriginalOrder = (order) => order?.originalOrder || order || {};
const getOrderAmount = (order) => {
  const originalOrder = getOriginalOrder(order);
  return toNumber(originalOrder.pricing?.total ?? originalOrder.totalAmount ?? originalOrder.total ?? order.totalAmount ?? order.total ?? 0);
};
const getPaymentStatus = (order) => {
  const originalOrder = getOriginalOrder(order);
  return String(originalOrder.payment?.status ?? originalOrder.paymentStatus ?? order.paymentStatus ?? '').toLowerCase();
};
const getDeliveryType = (order) => {
  const originalOrder = getOriginalOrder(order);
  return String(originalOrder.deliveryType ?? order.deliveryType ?? '').toLowerCase();
};
const getRestaurantName = (order) => String(order.restaurantName ?? order.restaurant ?? getOriginalOrder(order).restaurantName ?? '').trim();
const parseFilterDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};
const getOrderCreatedAt = (order) => {
  const originalOrder = getOriginalOrder(order);
  const createdAt = originalOrder.createdAt ?? order.createdAt;
  const date = createdAt ? new Date(createdAt) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const buildInvoiceModel = (order) => {
  const originalOrder = getOriginalOrder(order);
  const items = Array.isArray(originalOrder.items) ? originalOrder.items : Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => {
    const quantity = toNumber(item?.quantity || 1);
    const unitPrice = toNumber(item?.price ?? item?.unitPrice);
    return sum + quantity * unitPrice;
  }, 0);
  const deliveryFee = toNumber(originalOrder.pricing?.deliveryFee ?? originalOrder.deliveryCharge ?? originalOrder.deliveryFee);
  const taxAmount = toNumber(originalOrder.pricing?.tax ?? originalOrder.taxAmount ?? originalOrder.tax);
  const discountAmount = toNumber(originalOrder.pricing?.discount ?? originalOrder.discountAmount ?? originalOrder.couponDiscount);
  const totalAmount = getOrderAmount(order);
  const createdAt = getOrderCreatedAt(order);
  return {
    orderId: order.orderId || originalOrder.orderId || originalOrder.id || 'N/A',
    orderDate: formatOrderDate(createdAt),
    orderTime: formatOrderTime(createdAt),
    customerName: order.userName || originalOrder.customerName || originalOrder.userName || 'N/A',
    customerPhone: order.userNumber || originalOrder.customerPhone || originalOrder.userNumber || originalOrder.deliveryAddress?.phone || 'N/A',
    restaurantName: getRestaurantName(order) || 'N/A',
    deliveryPartnerName:
      order.deliveryBoyName ||
      originalOrder.deliveryPartnerName ||
      originalOrder.deliveryBoyName ||
      originalOrder.deliveryPartnerId?.name ||
      originalOrder.dispatch?.deliveryPartnerId?.name ||
      'Not assigned',
    deliveryPartnerPhone:
      order.deliveryBoyNumber ||
      originalOrder.deliveryPartnerPhone ||
      originalOrder.deliveryBoyNumber ||
      originalOrder.deliveryPartnerId?.phone ||
      originalOrder.dispatch?.deliveryPartnerId?.phone ||
      'N/A',
    status: order.status || originalOrder.orderStatus || originalOrder.status || 'N/A',
    paymentStatus: originalOrder.payment?.status || originalOrder.paymentStatus || 'N/A',
    paymentType: originalOrder.payment?.method || originalOrder.paymentType || originalOrder.paymentMethod || 'N/A',
    items,
    subtotal,
    deliveryFee,
    taxAmount,
    discountAmount,
    totalAmount,
  };
};
export function useGenericTableManagement(data, title, searchFields = []) {
  const [searchQuery, setSearchQuery] = useState('');
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
  const [visibleColumns, setVisibleColumns] = useState({});
  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(query);
        }),
      );
    }
    if (filters.paymentStatus) {
      result = result.filter((item) => getPaymentStatus(item) === filters.paymentStatus.toLowerCase());
    }
    if (filters.deliveryType) {
      result = result.filter((item) => getDeliveryType(item) === filters.deliveryType.toLowerCase());
    }
    if (filters.minAmount !== '') {
      const minAmount = toNumber(filters.minAmount);
      result = result.filter((item) => getOrderAmount(item) >= minAmount);
    }
    if (filters.maxAmount !== '') {
      const maxAmount = toNumber(filters.maxAmount);
      result = result.filter((item) => getOrderAmount(item) <= maxAmount);
    }
    if (filters.restaurant) {
      result = result.filter((item) => getRestaurantName(item) === filters.restaurant);
    }
    const fromDate = parseFilterDate(filters.fromDate);
    if (fromDate) {
      result = result.filter((item) => {
        const orderDate = getOrderCreatedAt(item);
        return orderDate ? orderDate >= fromDate : false;
      });
    }
    const toDate = parseFilterDate(filters.toDate);
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((item) => {
        const orderDate = getOrderCreatedAt(item);
        return orderDate ? orderDate <= toDate : false;
      });
    }
    return result;
  }, [data, searchQuery, filters, searchFields]);
  const count = filteredData.length;
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((value) => value !== '' && value !== null && value !== undefined).length;
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
  const handleExport = async (format) => {
    const filename = title.toLowerCase().replace(/\s+/g, '_');
    switch (format) {
      case 'excel':
        exportToExcel(filteredData, filename);
        break;
      case 'pdf':
        await exportToPDF(filteredData, filename);
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
      const invoice = buildInvoiceModel(order);
      const esc = (v) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const infoRows = [
        ['Customer', invoice.customerName],
        ['Phone', invoice.customerPhone],
        ['Restaurant', invoice.restaurantName],
        ['Delivery Boy', invoice.deliveryPartnerName],
        ['Delivery Phone', invoice.deliveryPartnerPhone],
        ['Payment Status', invoice.paymentStatus],
        ['Payment Type', invoice.paymentType],
        ['Order Status', invoice.status],
      ];
      const tableData =
        invoice.items.length > 0
          ? invoice.items.map((item) => {
              const quantity = toNumber(item?.quantity || 1);
              const itemName = item?.name || item?.itemName || item?.title || 'Item';
              const itemPrice = toNumber(item?.price ?? item?.unitPrice);
              return [quantity, itemName, formatMoney(itemPrice), formatMoney(quantity * itemPrice)];
            })
          : [[1, 'Order Total', formatMoney(invoice.totalAmount), formatMoney(invoice.totalAmount)]];
      const summaryRows = [
        ['Subtotal', formatMoney(invoice.subtotal || invoice.totalAmount)],
        ['Delivery Fee', formatMoney(invoice.deliveryFee)],
        ['Tax', formatMoney(invoice.taxAmount)],
        ['Discount', `- ${formatMoney(invoice.discountAmount)}`],
        ['Grand Total', formatMoney(invoice.totalAmount)],
      ];
      // Same layout as the web's jsPDF invoice: centered title, info grid, items table, totals box.
      const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
        body{font-family:Helvetica,Arial,sans-serif;margin:40px;color:#1E1E1E;font-size:9pt}
        h1{text-align:center;font-size:18pt;margin:0}.sub{text-align:center;color:#646464;margin:4px 0}
        table{width:100%;border-collapse:collapse;margin-top:18px}
        .info td{border:1px solid #C8C8C8;padding:6px}.info td:first-child{font-weight:bold;background:#F8FAFC;width:30%}
        .items th{background:#3B82F6;color:#fff;padding:7px;font-size:10pt}.items td{border:1px solid #C8C8C8;padding:7px}
        .items tr:nth-child(even) td{background:#F5F7FA}.r{text-align:right}.c{text-align:center}.b{font-weight:bold}
        .sum{width:290px;margin-left:auto;background:#F8FAFC;border:1px solid #E2E8F0}.sum td{padding:4px 8px;font-size:10pt}
        .sum td:first-child{font-weight:bold}.sum tr:last-child td{font-weight:bold;font-size:11pt}
      </style></head><body>
        <h1>Order Invoice</h1>
        <p class="sub" style="font-size:12pt">Order ID: ${esc(invoice.orderId)}</p>
        <p class="sub">Date: ${esc(invoice.orderDate)}${invoice.orderTime ? `, ${esc(invoice.orderTime)}` : ''}</p>
        <table class="info">${infoRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>
        <table class="items"><thead><tr><th class="c">Qty</th><th>Item Name</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
        <tbody>${tableData.map((r) => `<tr><td class="c">${esc(r[0])}</td><td>${esc(r[1])}</td><td class="r">${esc(r[2])}</td><td class="r b">${esc(r[3])}</td></tr>`).join('')}</tbody></table>
        <table class="sum">${summaryRows.map((r) => `<tr><td>${esc(r[0])}</td><td class="r">${esc(r[1])}</td></tr>`).join('')}</table>
      </body></html>`;
      const filename = `Invoice_${invoice.orderId}_${new Date().toISOString().split('T')[0]}.pdf`;
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
  const resetColumns = (defaultColumns) => {
    setVisibleColumns(defaultColumns || {});
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
    filters,
    setFilters,
    visibleColumns,
    filteredData,
    count,
    activeFiltersCount,
    handleApplyFilters,
    handleResetFilters,
    handleExport,
    handleViewOrder,
    handlePrintOrder,
    toggleColumn,
    resetColumns,
  };
}
