import { useState } from "react"
import { FileSpreadsheet, Download, Upload, FileCheck, ArrowRight, FileX, RefreshCw } from "lucide-react"

export default function RestaurantsBulkImport() {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      // Handle import logic here
      alert(`Importing ${selectedFile.name}...`)
    } else {
      alert("Please select a file to import")
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
  }

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-neutral-900">Bulk import</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Import restaurants in bulk using Excel files
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0a4d2b] text-white flex items-center justify-center font-medium text-lg">
                1
              </div>
              <h2 className="text-xl font-medium text-neutral-900">Download the excel file</h2>
            </div>
            <div className="space-y-2 text-sm text-neutral-600 ml-14">
              <p>• Download the format file and fill it with proper data.</p>
              <p>• You can download the example file to understand how the data must be filled.</p>
              <p>• Have to upload excel file.</p>
            </div>
          </div>
          <div className="p-6 bg-emerald-50 rounded-lg">
            <FileSpreadsheet className="w-16 h-16 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-lg">
                2
              </div>
              <h2 className="text-xl font-medium text-neutral-900">Match spread sheet data according to instruction</h2>
            </div>
            <div className="space-y-2 text-sm text-neutral-600 ml-14 mb-6">
              <p>• Fill up the data according to the format</p>
              <p>• By default status will be 1 please input the right ids</p>
              <p>• Make sure to provide valid zone, cuisine, and business model IDs</p>
              <p>• Restaurant owner information must be complete and accurate</p>
              <p>• Address and contact details are mandatory fields</p>
            </div>
            <div className="ml-14">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Download spreadsheet template</h3>
              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-medium rounded-lg border border-[#0a4d2b] text-[#0a4d2b] bg-white hover:bg-neutral-50 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  With current data
                </button>
                <button className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Without any data
                </button>
              </div>
            </div>
          </div>
          <div className="p-6 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-12 h-12 text-[#0a4d2b]" />
              <ArrowRight className="w-8 h-8 text-[#0a4d2b]" />
              <FileCheck className="w-12 h-12 text-[#0a4d2b]" />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-medium text-lg">
                3
              </div>
              <h2 className="text-xl font-medium text-neutral-900">Validate data and complete import</h2>
            </div>
            <div className="space-y-2 text-sm text-neutral-600 ml-14">
              <p>• In the Excel file upload section first select the upload option.</p>
              <p>• Upload your file in .xls .xlsx format.</p>
              <p>• Finally click the upload button.</p>
              <p>• You can upload your restaurant images in restaurant folder from gallery and copy image's path.</p>
            </div>
          </div>
          <div className="p-6 bg-orange-50 rounded-lg">
            <Upload className="w-16 h-16 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Excel File Upload Section */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
        <h2 className="text-xl font-medium text-neutral-900 mb-6">Excel file upload</h2>
        
        {/* File Upload Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Import items file:
          </label>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept=".xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50 cursor-pointer hover:bg-neutral-100 hover:border-emerald-500 transition-colors"
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <FileCheck className="w-12 h-12 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-600">{selectedFile.name}</p>
                  <p className="text-xs text-neutral-500">Click to change file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <p className="text-sm font-medium text-neutral-700">
                      Must be Excel files using our Excel template above
                    </p>
                    <p className="text-xs text-neutral-500">Click to browse or drag and drop</p>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-600 text-white hover:bg-neutral-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleImport}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
