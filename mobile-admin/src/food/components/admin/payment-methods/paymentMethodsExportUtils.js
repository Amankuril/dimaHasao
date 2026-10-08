// Export utility functions for payment methods
import { saveTextFile, printHtml } from '../../../../lib/files';

const HEADERS = ["SI", "Payment Method Name", "Payment Info", "Required Info From Customer", "Status"]

const toRows = (methods) => methods.map((method, index) => [
  index + 1,
  method.name,
  method.paymentInfo,
  method.requiredInfo,
  method.status ? "Active" : "Inactive"
])

const today = () => new Date().toISOString().split("T")[0]

export const exportPaymentMethodsToCSV = (methods, filename = "payment_methods") => {
  const rows = toRows(methods)

  const csvContent = [
    HEADERS.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.csv`, csvContent, "text/csv;charset=utf-8;")
}

export const exportPaymentMethodsToExcel = (methods, filename = "payment_methods") => {
  const rows = toRows(methods)

  const csvContent = [
    HEADERS.join("\t"),
    ...rows.map(row => row.join("\t"))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.xls`, csvContent, "application/vnd.ms-excel")
}

export const exportPaymentMethodsToPDF = (methods) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Methods Report</title>
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
      <h1>Payment Methods Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${HEADERS.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${methods.map((method, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${method.name}</td>
              <td>${method.paymentInfo}</td>
              <td>${method.requiredInfo}</td>
              <td>${method.status ? "Active" : "Inactive"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  return printHtml(htmlContent)
}

export const exportPaymentMethodsToJSON = (methods, filename = "payment_methods") => {
  const jsonContent = JSON.stringify(methods, null, 2)
  return saveTextFile(`${filename}_${today()}.json`, jsonContent, "application/json")
}
