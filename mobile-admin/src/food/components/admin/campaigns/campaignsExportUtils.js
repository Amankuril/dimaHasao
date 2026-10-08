/* Ported from Frontend/src/modules/Food/components/admin/campaigns/campaignsExportUtils.js */
import { printHtml, saveTextFile } from '../../../../lib/files';

// Export utility functions for campaigns
const build = (campaigns, isFoodCampaign) => {
  if (isFoodCampaign) {
    return {
      headers: ['SI', 'Title', 'Date Start', 'Date End', 'Time Start', 'Time End', 'Price', 'Status'],
      rows: campaigns.map((campaign, index) => [
        index + 1,
        campaign.title,
        campaign.dateStart,
        campaign.dateEnd,
        campaign.timeStart,
        campaign.timeEnd,
        `$ ${(campaign.price || 0).toFixed(2)}`,
        campaign.status ? 'Active' : 'Inactive',
      ]),
    };
  }
  return {
    headers: ['SI', 'Title', 'Date Start', 'Date End', 'Time Start', 'Time End', 'Status'],
    rows: campaigns.map((campaign, index) => [
      index + 1,
      campaign.title,
      campaign.dateStart,
      campaign.dateEnd,
      campaign.timeStart,
      campaign.timeEnd,
      campaign.status ? 'Active' : 'Inactive',
    ]),
  };
};

const today = () => new Date().toISOString().split('T')[0];

export const exportCampaignsToCSV = (campaigns, filename = 'campaigns', isFoodCampaign = false) => {
  const { headers, rows } = build(campaigns, isFoodCampaign);
  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return saveTextFile(`${filename}_${today()}.csv`, csvContent, 'text/csv');
};

export const exportCampaignsToExcel = (campaigns, filename = 'campaigns', isFoodCampaign = false) => {
  const { headers, rows } = build(campaigns, isFoodCampaign);
  const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return saveTextFile(`${filename}_${today()}.xls`, csvContent, 'application/vnd.ms-excel');
};

export const exportCampaignsToPDF = (campaigns, filename = 'campaigns', isFoodCampaign = false) => {
  const { headers, rows } = build(campaigns, isFoodCampaign);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
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
  return printHtml(htmlContent);
};

export const exportCampaignsToJSON = (campaigns, filename = 'campaigns') => {
  const jsonContent = JSON.stringify(campaigns, null, 2);
  return saveTextFile(`${filename}_${today()}.json`, jsonContent, 'application/json');
};
