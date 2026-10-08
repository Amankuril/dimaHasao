// Export utility functions for reports
import { printHtml, saveTextFile } from '../../../../lib/files';

const stamp = () => new Date().toISOString().split("T")[0]

const escapeHtml = (unsafe) => String(unsafe)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export const exportReportsToCSV = (data, headers, filename = "report") => {
  const rows = data.map((item) => {
    return headers.map(header => {
      const value = item[header.key] || item[header] || ""
      return typeof value === 'object' ? JSON.stringify(value) : value
    })
  })

  const headerRow = headers.map(h => typeof h === 'string' ? h : h.label).join(",")
  const csvContent = [
    headerRow,
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  return saveTextFile(`${filename}_${stamp()}.csv`, csvContent, "text/csv;charset=utf-8;")
}

export const exportReportsToExcel = (data, headers, filename = "report") => {
  const rows = data.map((item) => {
    return headers.map(header => {
      const value = item[header.key] || item[header] || ""
      return typeof value === 'object' ? JSON.stringify(value) : value
    })
  })

  const headerRow = headers.map(h => typeof h === 'string' ? h : h.label).join("\t")
  const csvContent = [
    headerRow,
    ...rows.map(row => row.join("\t"))
  ].join("\n")

  return saveTextFile(`${filename}_${stamp()}.xls`, csvContent, "application/vnd.ms-excel")
}

export const exportReportsToPDF = (data, headers, filename = "report", title = "Report") => {
  const headerRow = headers.map(h => typeof h === 'string' ? h : h.label)

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
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
      <h1>${title}</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headerRow.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => {
            const cells = headers.map(header => {
              const raw = (item && (item[header.key] !== undefined ? item[header.key] : item[header])) ?? ""
              const normalized = (raw === null || raw === undefined || String(raw).trim() === "") ? "0" : raw
              return `<td>${escapeHtml(String(normalized))}</td>`
            })
            return `<tr>${cells.join("")}</tr>`
          }).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  return printHtml(htmlContent)
}

export const exportReportsToJSON = (data, filename = "report") => {
  const jsonContent = JSON.stringify(data, null, 2)
  return saveTextFile(`${filename}_${stamp()}.json`, jsonContent, "application/json")
}

const TRANSACTION_HEADERS = ["SI", "Order ID", "Restaurant", "Customer Name", "Total Item Amount", "Coupon Discount", "VAT/Tax", "Delivery Charge", "Platform Fee", "Order Amount"]

const transactionRows = (transactions) => transactions.map((transaction, index) => [
  index + 1,
  transaction.orderId,
  transaction.restaurant,
  transaction.customerName,
  transaction.totalItemAmount.toFixed(2),
  transaction.couponDiscount.toFixed(2),
  transaction.vatTax.toFixed(2),
  transaction.deliveryCharge.toFixed(2),
  Number(transaction.platformFee || 0).toFixed(2),
  transaction.orderAmount.toFixed(2)
])

// Specific export functions for Transaction Report
export const exportTransactionReportToCSV = (transactions, filename = "transaction_report") => {
  const csvContent = [
    TRANSACTION_HEADERS.join(","),
    ...transactionRows(transactions).map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n")

  return saveTextFile(`${filename}_${stamp()}.csv`, csvContent, "text/csv;charset=utf-8;")
}

export const exportTransactionReportToExcel = (transactions, filename = "transaction_report") => {
  const csvContent = [
    TRANSACTION_HEADERS.join("\t"),
    ...transactionRows(transactions).map(row => row.join("\t"))
  ].join("\n")

  return saveTextFile(`${filename}_${stamp()}.xls`, csvContent, "application/vnd.ms-excel")
}

export const exportTransactionReportToPDF = (transactions) => {
  const fmtNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '0'
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 8px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { text-align: center; }
      </style>
    </head>
    <body>
      <h1>Transaction Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${TRANSACTION_HEADERS.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${transactions.map((transaction, index) => {
            const orderId = transaction.orderId || '0'
            const restaurant = transaction.restaurant || '0'
            const customerName = transaction.customerName || '0'
            const totalItemAmount = fmtNum(transaction.totalItemAmount)
            const couponDiscount = fmtNum(transaction.couponDiscount)
            const vatTax = fmtNum(transaction.vatTax)
            const deliveryCharge = fmtNum(transaction.deliveryCharge)
            const platformFee = fmtNum(transaction.platformFee || 0)
            const orderAmount = fmtNum(transaction.orderAmount)
            return `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(String(orderId))}</td>
              <td>${escapeHtml(String(restaurant))}</td>
              <td>${escapeHtml(String(customerName))}</td>
              <td>${totalItemAmount}</td>
              <td>${couponDiscount}</td>
              <td>${vatTax}</td>
              <td>${deliveryCharge}</td>
              <td>${platformFee}</td>
              <td>${orderAmount}</td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  return printHtml(htmlContent)
}

export const exportTransactionReportToJSON = (transactions, filename = "transaction_report") => {
  const jsonContent = JSON.stringify(transactions, null, 2)
  return saveTextFile(`${filename}_${stamp()}.json`, jsonContent, "application/json")
}

