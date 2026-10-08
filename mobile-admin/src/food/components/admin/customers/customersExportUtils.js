/* Ported from Frontend/src/modules/Food/components/admin/customers/customersExportUtils.js */
import { alert } from '../../../../lib/webShim';
import { saveTextFile, tableToPdf } from '../../../../lib/files';

const CUSTOMER_HEADERS = ['SI', 'Name', 'Email', 'Phone', 'Total Order', 'Total Order Amount', 'Joining Date', 'Status'];

// Export utility functions for customers
export const exportCustomersToCSV = (customers, filename = 'customers') => {
  if (!customers || customers.length === 0) {
    alert('No customers to export');
    return;
  }
  const headers = CUSTOMER_HEADERS;
  const rows = customers.map((customer, index) => [
    customer.sl || index + 1,
    customer.name || 'N/A',
    customer.email || 'N/A',
    customer.phone || 'N/A',
    customer.totalOrder || 0,
    `$${(customer.totalOrderAmount || 0).toFixed(2)}`,
    customer.joiningDate || 'N/A',
    customer.status ? 'Active' : 'Inactive',
  ]);

  // Escape commas and quotes in CSV
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');

  // Add BOM for Excel compatibility
  const BOM = '﻿';
  const timestamp = new Date().toISOString().split('T')[0];
  saveTextFile(`${filename}_${timestamp}.csv`, BOM + csvContent, 'text/csv;charset=utf-8;');
};
export const exportCustomersToExcel = (customers, filename = 'customers') => {
  if (!customers || customers.length === 0) {
    alert('No customers to export');
    return;
  }
  const headers = CUSTOMER_HEADERS;
  const rows = customers.map((customer, index) => [
    customer.sl || index + 1,
    customer.name || 'N/A',
    customer.email || 'N/A',
    customer.phone || 'N/A',
    customer.totalOrder || 0,
    (customer.totalOrderAmount || 0).toFixed(2),
    customer.joiningDate || 'N/A',
    customer.status ? 'Active' : 'Inactive',
  ]);

  // Create HTML table for better Excel compatibility
  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const timestamp = new Date().toISOString().split('T')[0];
  saveTextFile(`${filename}_${timestamp}.xls`, htmlContent, 'application/vnd.ms-excel');
};
export const exportCustomersToPDF = (customers, filename = 'customers') => {
  if (!customers || customers.length === 0) {
    alert('No customers to export');
    return;
  }
  const exportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const tableData = customers.map((customer, index) => [
    customer.sl || index + 1,
    customer.name || 'N/A',
    customer.email || 'N/A',
    customer.phone || 'N/A',
    customer.totalOrder || 0,
    `$${(customer.totalOrderAmount || 0).toFixed(2)}`,
    customer.joiningDate || 'N/A',
    customer.status ? 'Active' : 'Inactive',
  ]);
  const fileTimestamp = new Date().toISOString().split('T')[0];
  tableToPdf({
    filename: `${filename}_${fileTimestamp}.pdf`,
    landscape: true,
    title: 'Customers Report',
    subtitle: `Exported on: ${exportDate} | Total Records: ${customers.length}`,
    columns: CUSTOMER_HEADERS,
    rows: tableData,
    fontSize: 8,
  });
};
export const exportCustomersToJSON = (customers, filename = 'customers') => {
  if (!customers || customers.length === 0) {
    alert('No customers to export');
    return;
  }

  // Format customers data for JSON export
  const formattedData = {
    exportDate: new Date().toISOString(),
    totalRecords: customers.length,
    customers: customers.map((customer) => ({
      id: customer.id || customer.sl,
      name: customer.name || 'N/A',
      email: customer.email || 'N/A',
      phone: customer.phone || 'N/A',
      totalOrders: customer.totalOrder || 0,
      totalOrderAmount: customer.totalOrderAmount || 0,
      joiningDate: customer.joiningDate || 'N/A',
      status: customer.status ? 'Active' : 'Inactive',
      isActive: customer.status,
    })),
  };
  const jsonContent = JSON.stringify(formattedData, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  saveTextFile(`${filename}_${timestamp}.json`, jsonContent, 'application/json;charset=utf-8');
};
