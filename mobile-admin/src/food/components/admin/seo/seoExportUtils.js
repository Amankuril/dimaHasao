// Export utility functions for SEO pages
import { saveTextFile, printHtml } from '../../../../lib/files';

const HEADERS = ["SI", "Page Name"]

const toRows = (pages) => pages.map((page, index) => [
  index + 1,
  page.name
])

const today = () => new Date().toISOString().split("T")[0]

export const exportSEOPagesToCSV = (pages, filename = "seo_pages") => {
  const rows = toRows(pages)

  const csvContent = [
    HEADERS.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.csv`, csvContent, "text/csv;charset=utf-8;")
}

export const exportSEOPagesToExcel = (pages, filename = "seo_pages") => {
  const rows = toRows(pages)

  const csvContent = [
    HEADERS.join("\t"),
    ...rows.map(row => row.join("\t"))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.xls`, csvContent, "application/vnd.ms-excel")
}

export const exportSEOPagesToPDF = (pages) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SEO Pages Report</title>
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
      <h1>SEO Pages Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${HEADERS.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${pages.map((page, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${page.name}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  return printHtml(htmlContent)
}

export const exportSEOPagesToJSON = (pages, filename = "seo_pages") => {
  const jsonContent = JSON.stringify(pages, null, 2)
  return saveTextFile(`${filename}_${today()}.json`, jsonContent, "application/json")
}
