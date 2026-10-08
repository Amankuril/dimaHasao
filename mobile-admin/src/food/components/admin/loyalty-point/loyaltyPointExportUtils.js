/* Ported from Frontend/src/modules/Food/components/admin/loyalty-point/loyaltyPointExportUtils.js */
import { printHtml, saveTextFile } from '../../../../lib/files';

const HEADERS = ['SI', 'Transaction ID', 'Customer', 'Credit', 'Debit', 'Balance', 'Transaction Type', 'Reference', 'Created At'];

const toRows = (transactions) =>
  transactions.map((transaction) => [
    transaction.sl,
    transaction.transactionId,
    transaction.customer,
    transaction.credit,
    transaction.debit,
    transaction.balance,
    transaction.transactionType,
    transaction.reference,
    transaction.createdAt,
  ]);

// Export utility functions for loyalty point reports
export const exportLoyaltyPointsToCSV = (transactions, filename = 'loyalty_points_report') => {
  const headers = HEADERS;
  const rows = toRows(transactions);
  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
};
export const exportLoyaltyPointsToExcel = (transactions, filename = 'loyalty_points_report') => {
  const headers = HEADERS;
  const rows = toRows(transactions);
  const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.xls`, csvContent, 'application/vnd.ms-excel');
};
export const exportLoyaltyPointsToPDF = (transactions) => {
  const headers = HEADERS;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loyalty Points Report</title>
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
      <h1>Loyalty Points Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              (transaction) => `
            <tr>
              <td>${transaction.sl}</td>
              <td>${transaction.transactionId}</td>
              <td>${transaction.customer}</td>
              <td>${transaction.credit}</td>
              <td>${transaction.debit}</td>
              <td>${transaction.balance}</td>
              <td>${transaction.transactionType}</td>
              <td>${transaction.reference}</td>
              <td>${transaction.createdAt}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  // The web opens a print window for this HTML; Android's print dialog does the same (and can save a PDF).
  printHtml(htmlContent);
};
export const exportLoyaltyPointsToJSON = (transactions, filename = 'loyalty_points_report') => {
  const jsonContent = JSON.stringify(transactions, null, 2);
  saveTextFile(`${filename}_${new Date().toISOString().split('T')[0]}.json`, jsonContent, 'application/json');
};
