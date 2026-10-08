/* Ported from Frontend/src/modules/Food/components/admin/transactions/transactionsExportUtils.js */
import { saveTextFile, tableToPdf } from '../../../../lib/files';

// Export utility functions for transaction management

export const exportTransactionsToCSV = (transactions, headers, filename = 'transactions') => {
  const csvContent = [
    headers.map((h) => `"${h.label}"`).join(','),
    ...transactions.map((row) =>
      headers
        .map((h) => {
          const value = row[h.key];
          if (value === null || value === undefined) return '""';
          if (typeof value === 'number') return value;
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
};
export const exportTransactionsToExcel = (transactions, headers, filename = 'transactions') => {
  // Create HTML table for better Excel compatibility and clear formatting
  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          td { white-space: nowrap; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (row) => `
              <tr>
                ${headers
                  .map((h) => {
                    const value = row[h.key];
                    if (value === null || value === undefined) return '<td></td>';
                    // Escape HTML to prevent issues
                    const escapedValue = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return `<td>${escapedValue}</td>`;
                  })
                  .join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.xls`, htmlContent, 'application/vnd.ms-excel');
};
export const exportTransactionsToPDF = async (transactions, headers, filename = 'transactions', title = 'Transaction Report') => {
  const reportDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const columns = headers.map((h) => h.label);
  const rows = transactions.map((row) =>
    headers.map((h) => {
      const v = row[h.key];
      return v === null || v === undefined ? '' : String(v);
    }),
  );
  await tableToPdf({
    filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
    landscape: true,
    title,
    subtitle: `Generated: ${reportDate}`,
    columns,
    rows,
    headColor: '#000000',
    fontSize: 8,
  });
};
export const exportTransactionsToJSON = (transactions, filename = 'transactions') => {
  const jsonContent = JSON.stringify(transactions, null, 2);
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
};
