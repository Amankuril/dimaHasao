/* Ported from Frontend/src/modules/Food/components/admin/deliveryman/joinRequestExportUtils.js */
import { alert } from '../../../../lib/webShim';
import { saveTextFile, tableToPdf } from '../../../../lib/files';

const debugError = () => {};

const HEADERS = ['SI', 'Name', 'Email', 'Phone', 'Zone', 'Vehicle Type', 'Status'];

const toRows = (requests) =>
  requests.map((request) => [
    request.sl,
    request.name,
    request.email,
    request.phone,
    request.zone,
    request.vehicleType,
    request.status,
  ]);

// Export utility functions for join requests
export const exportJoinRequestsToCSV = (requests, filename = 'join_requests') => {
  const rows = toRows(requests);
  const csvContent = [
    HEADERS.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  return saveTextFile(
    `${filename}_${new Date().toISOString().split('T')[0]}.csv`,
    csvContent,
    'text/csv;charset=utf-8;',
  );
};

export const exportJoinRequestsToExcel = (requests, filename = 'join_requests') => {
  const rows = toRows(requests);
  const csvContent = [HEADERS.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  return saveTextFile(
    `${filename}_${new Date().toISOString().split('T')[0]}.xls`,
    csvContent,
    'application/vnd.ms-excel',
  );
};

export const exportJoinRequestsToPDF = (requests, filename = 'join_requests') => {
  if (!requests || requests.length === 0) {
    alert('No data to export');
    return undefined;
  }

  try {
    const exportDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const tableData = requests.map((request) => [
      request.sl || 'N/A',
      request.name || 'N/A',
      request.email || 'N/A',
      request.phone || 'N/A',
      request.zone || 'N/A',
      request.vehicleType || 'N/A',
      request.status || 'N/A',
    ]);

    return tableToPdf({
      filename: `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
      title: 'Join Requests Report',
      subtitle: `Exported on: ${exportDate} | Total Records: ${requests.length}`,
      columns: HEADERS,
      rows: tableData,
      fontSize: 8,
    });
  } catch (error) {
    debugError('PDF export error:', error);
    alert('Failed to export PDF. Please try again.');
    return undefined;
  }
};

export const exportJoinRequestsToJSON = (requests, filename = 'join_requests') => {
  const jsonContent = JSON.stringify(requests, null, 2);
  return saveTextFile(
    `${filename}_${new Date().toISOString().split('T')[0]}.json`,
    jsonContent,
    'application/json',
  );
};
