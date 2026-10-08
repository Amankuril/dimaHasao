/* Ported from Frontend/src/modules/Food/components/admin/advertisements/advertisementsExportUtils.js */
import { printHtml, saveTextFile } from '../../../../lib/files';

// Export utility functions for advertisements
const HEADERS = ['SI', 'Ads ID', 'Ads Title', 'Restaurant Name', 'Restaurant Email', 'Ads Type', 'Duration'];

const toRows = (ads) =>
  ads.map((ad, index) => [
    index + 1,
    ad.adsId || ad.sl,
    ad.adsTitle || ad.title || '',
    ad.restaurantName || '',
    ad.restaurantEmail || '',
    ad.adsType || ad.type || '',
    ad.duration || '',
  ]);

const today = () => new Date().toISOString().split('T')[0];

export const exportAdvertisementsToCSV = (ads, filename = 'advertisements') => {
  const rows = toRows(ads);
  const csvContent = [HEADERS.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  return saveTextFile(`${filename}_${today()}.csv`, csvContent, 'text/csv');
};

export const exportAdvertisementsToExcel = (ads, filename = 'advertisements') => {
  const rows = toRows(ads);
  const csvContent = [HEADERS.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return saveTextFile(`${filename}_${today()}.xls`, csvContent, 'application/vnd.ms-excel');
};

export const exportAdvertisementsToPDF = (ads, filename = 'advertisements') => {
  const rows = toRows(ads);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <table>
          <thead>
            <tr>
              ${HEADERS.map((h) => `<th>${h}</th>`).join('')}
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

export const exportAdvertisementsToJSON = (ads, filename = 'advertisements') => {
  const jsonContent = JSON.stringify(ads, null, 2);
  return saveTextFile(`${filename}_${today()}.json`, jsonContent, 'application/json');
};
