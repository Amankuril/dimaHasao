/* Ported from Frontend/src/modules/Food/components/admin/deliveryman/deliverymanExportUtils.js (tools/port.js first pass). */
import { alert } from '../../../../lib/webShim';
import { printHtml, saveTextFile, tableToPdf } from '../../../../lib/files';
const debugError = () => {};

// Export utility functions for deliveryman data
export const exportDeliverymenToCSV = (deliverymen, filename = 'deliverymen') => {
  const headers = ['SI', 'Name', 'Contact', 'Zone', 'Total Orders', 'Availability Status'];
  const rows = deliverymen.map((dm) => [dm.sl, dm.name, dm.phone, dm.zone, dm.totalOrders, dm.status]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv');
};
export const exportDeliverymenToExcel = (deliverymen, filename = 'deliverymen') => {
  const headers = ['SI', 'Name', 'Phone', 'Email', 'Zone', 'Total Orders', 'Status'];
  const rows = deliverymen.map((dm) => [dm.sl, dm.name, dm.phone, dm.email, dm.zone, dm.totalOrders, dm.status]);
  const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.xls`, csvContent, 'application/vnd.ms-excel');
};
export const exportDeliverymenToPDF = (deliverymen, filename = 'deliverymen') => {
  if (!deliverymen || deliverymen.length === 0) {
    alert('No data to export');
    return;
  }
  try {
      const exportDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      // Prepare table data
      const tableData = deliverymen.map((dm) => [
        dm.sl || 'N/A',
        dm.name || 'N/A',
        dm.phone || 'N/A',
        dm.email || 'N/A',
        dm.zone || 'N/A',
        dm.totalOrders || 0,
        dm.status || 'N/A',
      ]);

    return tableToPdf({
      filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
      title: 'Delivery Partners Report',
      subtitle: `Exported on: ${exportDate} | Total Records: ${deliverymen.length}`,
      columns: ['SI', 'Name', 'Phone', 'Email', 'Zone', 'Total Orders', 'Status'],
      rows: tableData,
      fontSize: 8,
    });
  } catch (error) {
    debugError('PDF export error:', error);
    alert('Failed to export PDF. Please try again.');
  }
};
export const exportDeliverymenToJSON = (deliverymen, filename = 'deliverymen') => {
  const jsonContent = JSON.stringify(deliverymen, null, 2);
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
};

// Export utilities for reviews
export const exportReviewsToCSV = (reviews, filename = 'deliveryman_reviews') => {
  const headers = ['SI', 'Deliveryman', 'Customer', 'Review', 'Rating'];
  const rows = reviews.map((review) => [review.sl, review.deliveryman, review.customer, review.review, review.rating]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv');
};
export const exportReviewsToExcel = (reviews, filename = 'deliveryman_reviews') => {
  const headers = ['SI', 'Deliveryman', 'Customer', 'Review', 'Rating'];
  const rows = reviews.map((review) => [review.sl, review.deliveryman, review.customer, review.review, review.rating]);
  const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.xls`, csvContent, 'application/vnd.ms-excel');
};
export const exportReviewsToPDF = (reviews, filename = 'deliveryman_reviews') => {
  const headers = ['SI', 'Deliveryman', 'Customer', 'Review', 'Rating'];
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Deliveryman Reviews Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { text-align: center; }
      </style>
    </head>
    <body>
      <h1>Deliveryman Reviews Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${reviews
            .map(
              (review) => `
            <tr>
              <td>${review.sl}</td>
              <td>${review.deliveryman}</td>
              <td>${review.customer}</td>
              <td>${review.review}</td>
              <td>${review.rating}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  // The web printed a new window; the Android print dialog prints or saves the PDF.
  return printHtml(htmlContent);
};
export const exportReviewsToJSON = (reviews, filename = 'deliveryman_reviews') => {
  const jsonContent = JSON.stringify(reviews, null, 2);
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
};

// Export utilities for bonus transactions
export const exportBonusToCSV = (transactions, filename = 'deliveryman_bonus') => {
  const headers = ['S.No', 'Transaction ID', 'Delivery Boy ID', 'Deliveryman', 'Bonus', 'Reference', 'Created At'];
  const rows = transactions.map((transaction) => [
    transaction.sl,
    transaction.transactionId,
    transaction.deliveryId || 'N/A',
    transaction.deliveryman,
    transaction.bonus,
    transaction.reference,
    transaction.createdAt,
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv');
};

// Helper function to format bonus amount properly (remove superscript and special characters)
const formatBonusForExport = (transaction) => {
  // First priority: use raw amount value if available
  if (transaction.amount !== undefined && transaction.amount !== null && !isNaN(transaction.amount)) {
    const amount = parseFloat(transaction.amount);
    return `?${amount.toFixed(2)}`;
  }

  // Second priority: clean and extract from bonus string
  if (transaction.bonus) {
    // Remove all superscript/special characters and unwanted text
    let cleaned = transaction.bonus
      .toString()
      .replace(/�/g, '') // Remove superscript 1
      .replace(/[���45678?�]/g, '') // Remove all superscript numbers
      .replace(/[\u2070-\u207F\u2080-\u208F]/g, '') // Remove all superscript Unicode ranges
      .replace(/[^\d.-]/g, '') // Keep only digits, dots, and minus signs
      .trim();

    // Extract numeric value
    const numericMatch = cleaned.match(/[\d.]+/);
    if (numericMatch) {
      const amount = parseFloat(numericMatch[0]);
      if (!isNaN(amount)) {
        return `?${amount.toFixed(2)}`;
      }
    }
  }
  return '?0.00';
};
export const exportBonusToExcel = (transactions, filename = 'deliveryman_bonus') => {
  if (!transactions || transactions.length === 0) {
    alert('No data to export');
    return;
  }
  const headers = ['S.No', 'Transaction ID', 'Delivery Boy ID', 'Deliveryman', 'Bonus', 'Reference', 'Created At'];
  const rows = transactions.map((transaction) => [
    transaction.sl || 'N/A',
    transaction.transactionId || 'N/A',
    transaction.deliveryId || 'N/A',
    transaction.deliveryman || 'N/A',
    formatBonusForExport(transaction),
    transaction.reference || 'N/A',
    transaction.createdAt || 'N/A',
  ]);

  // Create HTML table for better Excel compatibility with UTF-8 encoding
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
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.xls`, htmlContent, 'application/vnd.ms-excel');
};
export const exportBonusToPDF = (transactions, filename = 'deliveryman_bonus') => {
  if (!transactions || transactions.length === 0) {
    alert('No data to export');
    return;
  }
  try {
      const exportDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      // Prepare table data - ensure bonus is properly formatted
      const tableData = transactions.map((transaction) => {
        // ALWAYS use raw amount value - don't rely on formatted bonus string
        let bonusAmount = '?0.00';

        // First priority: Use raw numeric amount from transaction.amount
        if (transaction.amount !== undefined && transaction.amount !== null) {
          const numAmount =
            typeof transaction.amount === 'string' ? parseFloat(transaction.amount.replace(/[^\d.-]/g, '')) : parseFloat(transaction.amount);
          if (!isNaN(numAmount)) {
            bonusAmount = `?${numAmount.toFixed(2)}`;
          }
        }
        // Second priority: Extract number from bonus string and rebuild
        else if (transaction.bonus) {
          // Extract only numeric part (digits and decimal point)
          const numericPart = String(transaction.bonus).replace(/[^\d.-]/g, '');
          const numAmount = parseFloat(numericPart);
          if (!isNaN(numAmount) && numAmount > 0) {
            bonusAmount = `?${numAmount.toFixed(2)}`;
          }
        }
        return [
          transaction.sl || 'N/A',
          transaction.transactionId || 'N/A',
          transaction.deliveryId || 'N/A',
          transaction.deliveryman || 'N/A',
          bonusAmount,
          transaction.reference || 'N/A',
          transaction.createdAt || 'N/A',
        ];
      });
    return tableToPdf({
      filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
      title: 'Deliveryman Bonus Transactions Report',
      subtitle: `Exported on: ${exportDate} | Total Records: ${transactions.length}`,
      columns: ['S.No', 'Transaction ID', 'Delivery Boy ID', 'Deliveryman', 'Bonus', 'Reference', 'Created At'],
      rows: tableData,
      fontSize: 7,
    });
  } catch (error) {
    debugError('PDF export error:', error);
    alert('Failed to export PDF. Please try again.');
  }
};
export const exportBonusToJSON = (transactions, filename = 'deliveryman_bonus') => {
  const jsonContent = JSON.stringify(transactions, null, 2);
  return saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
};
