/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantsBulkImport.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { FileSpreadsheet, Download, Upload, FileCheck, ArrowRight, RefreshCw } from 'lucide-react-native';
import { Button, Div, H1, H2, H3, Label, P, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import { pickDocument } from '../../../../lib/files';
export default function RestaurantsBulkImport() {
  const [selectedFile, setSelectedFile] = useState(null);
  const handleFileChange = async () => {
    const file = await pickDocument({
      type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });
    if (file) {
      setSelectedFile(file);
    }
  };
  const handleImport = () => {
    if (selectedFile) {
      // Handle import logic here
      alert(`Importing ${selectedFile.name}...`);
    } else {
      alert('Please select a file to import');
    }
  };
  const handleReset = () => {
    setSelectedFile(null);
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-center gap-3">
          <Div className="p-2 bg-emerald-50 rounded-lg">
            <UiIcon as={FileSpreadsheet} className="w-5 h-5 text-emerald-600" />
          </Div>
          <Div>
            <H1 className="text-2xl font-bold text-slate-900">Bulk Import</H1>
            <P className="text-sm text-slate-500 mt-1">Import restaurants in bulk using Excel files</P>
          </Div>
        </Div>
      </Div>

      {/* Step 1 */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-start gap-6">
          <Div className="flex-1">
            <Div className="flex items-center gap-3 mb-4">
              <Div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">1</Div>
              <H2 className="text-xl font-bold text-slate-900">Download The Excel File</H2>
            </Div>
            <Div className="space-y-2 text-sm text-slate-600 ml-14">
              <P>• Download the format file and fill it with proper data.</P>
              <P>• You can download the example file to understand how the data must be filled.</P>
              <P>• Have to upload excel file.</P>
            </Div>
          </Div>
          <Div className="p-6 bg-emerald-50 rounded-lg">
            <UiIcon as={FileSpreadsheet} className="w-16 h-16 text-emerald-600" />
          </Div>
        </Div>
      </Div>

      {/* Step 2 */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-start gap-6">
          <Div className="flex-1">
            <Div className="flex items-center gap-3 mb-4">
              <Div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">2</Div>
              <H2 className="text-xl font-bold text-slate-900">Match Spread Sheet Data According To Instruction</H2>
            </Div>
            <Div className="space-y-2 text-sm text-slate-600 ml-14 mb-6">
              <P>• Fill up the data according to the format</P>
              <P>• By default status will be 1 please input the right ids</P>
              <P>• Make sure to provide valid zone, cuisine, and business model IDs</P>
              <P>• Restaurant owner information must be complete and accurate</P>
              <P>• Address and contact details are mandatory fields</P>
            </Div>
            <Div className="ml-14">
              <H3 className="text-sm font-semibold text-slate-700 mb-3">Download Spreadsheet Template</H3>
              <Div className="flex gap-3">
                <Button className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-500 text-blue-600 bg-white hover:bg-blue-50 transition-all flex items-center gap-2">
                  <UiIcon as={Download} className="w-4 h-4" />
                  With Current Data
                </Button>
                <Button className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2">
                  <UiIcon as={Download} className="w-4 h-4" />
                  Without Any Data
                </Button>
              </Div>
            </Div>
          </Div>
          <Div className="p-6 bg-blue-50 rounded-lg">
            <Div className="flex items-center gap-2">
              <UiIcon as={FileSpreadsheet} className="w-12 h-12 text-blue-600" />
              <UiIcon as={ArrowRight} className="w-8 h-8 text-blue-600" />
              <UiIcon as={FileCheck} className="w-12 h-12 text-blue-600" />
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Step 3 */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-start gap-6">
          <Div className="flex-1">
            <Div className="flex items-center gap-3 mb-4">
              <Div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">3</Div>
              <H2 className="text-xl font-bold text-slate-900">Validate Data And Complete Import</H2>
            </Div>
            <Div className="space-y-2 text-sm text-slate-600 ml-14">
              <P>• In the Excel file upload section first select the upload option.</P>
              <P>• Upload your file in .xls .xlsx format.</P>
              <P>• Finally click the upload button.</P>
              <P>• You can upload your restaurant images in restaurant folder from gallery and copy image&apos;s path.</P>
            </Div>
          </Div>
          <Div className="p-6 bg-orange-50 rounded-lg">
            <UiIcon as={Upload} className="w-16 h-16 text-orange-600" />
          </Div>
        </Div>
      </Div>

      {/* Excel File Upload Section */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <H2 className="text-xl font-bold text-slate-900 mb-6">Excel File Upload</H2>

        {/* File Upload Area */}
        <Div className="mb-6">
          <Label className="block text-sm font-semibold text-slate-700 mb-3">Import items file:</Label>
          <Div className="relative">
            <Div
              onClick={handleFileChange}
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-emerald-500 transition-all"
            >
              {selectedFile ? (
                <Div className="flex flex-col items-center gap-3">
                  <UiIcon as={FileCheck} className="w-12 h-12 text-emerald-600" />
                  <P className="text-sm font-medium text-emerald-600">{selectedFile.name}</P>
                  <P className="text-xs text-slate-500">Click to change file</P>
                </Div>
              ) : (
                <Div className="flex flex-col items-center gap-3">
                  <Div className="p-4 bg-emerald-50 rounded-lg">
                    <UiIcon as={FileSpreadsheet} className="w-12 h-12 text-emerald-600" />
                  </Div>
                  <Div className="flex flex-col items-center gap-1">
                    <UiIcon as={Upload} className="w-6 h-6 text-slate-400" />
                    <P className="text-sm font-medium text-slate-700">Must be Excel files using our Excel template above</P>
                    <P className="text-xs text-slate-500">Click to browse or drag and drop</P>
                  </Div>
                </Div>
              )}
            </Div>
          </Div>
        </Div>

        {/* Action Buttons */}
        <Div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleReset}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <UiIcon as={RefreshCw} className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleImport}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md"
          >
            <UiIcon as={Upload} className="w-4 h-4" />
            Import
          </Button>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
