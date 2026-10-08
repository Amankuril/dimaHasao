// Export utility functions for notifications
import { saveTextFile, printHtml } from '../../../../lib/files';

const HEADERS = ["SI", "Topic", "Description", "Push Notification", "Mail", "SMS"]

const toRows = (notifications) => notifications.map((notif, index) => [
  index + 1,
  notif.topic,
  notif.description,
  notif.pushNotification,
  notif.mail ? "Yes" : "No",
  notif.sms !== false ? (notif.sms ? "Yes" : "No") : "N/A"
])

const today = () => new Date().toISOString().split("T")[0]

export const exportNotificationsToCSV = (notifications, filename = "notifications") => {
  const rows = toRows(notifications)

  const csvContent = [
    HEADERS.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.csv`, csvContent, "text/csv;charset=utf-8;")
}

export const exportNotificationsToExcel = (notifications, filename = "notifications") => {
  const rows = toRows(notifications)

  const csvContent = [
    HEADERS.join("\t"),
    ...rows.map(row => row.join("\t"))
  ].join("\n")

  return saveTextFile(`${filename}_${today()}.xls`, csvContent, "application/vnd.ms-excel")
}

export const exportNotificationsToPDF = (notifications) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Notifications Report</title>
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
      <h1>Notifications Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${HEADERS.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${notifications.map((notif, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${notif.topic}</td>
              <td>${notif.description}</td>
              <td>${notif.pushNotification}</td>
              <td>${notif.mail ? "Yes" : "No"}</td>
              <td>${notif.sms !== false ? (notif.sms ? "Yes" : "No") : "N/A"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  return printHtml(htmlContent)
}

export const exportNotificationsToJSON = (notifications, filename = "notifications") => {
  const jsonContent = JSON.stringify(notifications, null, 2)
  return saveTextFile(`${filename}_${today()}.json`, jsonContent, "application/json")
}
