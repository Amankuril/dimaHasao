/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantsBulkImport.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { FileSpreadsheet, Download, Upload, FileCheck, RefreshCw } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import { pickDocument } from '../../../../lib/files';

function Bullets({ items }) {
  return (
    <Div className="gap-1.5">
      {items.map((line) => (
        <Div key={line} className="flex-row items-start gap-2">
          <Span className="text-sm text-slate-400">•</Span>
          <Span className="flex-1 text-sm text-slate-700">{line}</Span>
        </Div>
      ))}
    </Div>
  );
}

export default function RestaurantsBulkImport() {
  const { columns } = useLayoutWidth();
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
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={FileSpreadsheet}
        title="Bulk Import"
        subtitle="Import restaurants in bulk using Excel files"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Bulk import' }]}
      />

      <Card className="mb-3">
        <SectionTitle>1. Download the Excel file</SectionTitle>
        <Bullets
          items={[
            'Download the format file and fill it with proper data.',
            'You can download the example file to understand how the data must be filled.',
            'The file you upload has to be an Excel file.',
          ]}
        />
      </Card>

      <Card className="mb-3">
        <SectionTitle>2. Match the spreadsheet to the instructions</SectionTitle>
        <Bullets
          items={[
            'Fill up the data according to the format.',
            'By default status will be 1 — please input the right ids.',
            'Make sure to provide valid zone, cuisine, and business model IDs.',
            'Restaurant owner information must be complete and accurate.',
            'Address and contact details are mandatory fields.',
          ]}
        />
        <Div className="mt-4 gap-2">
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Download spreadsheet template</Span>
          <Div className={`grid grid-cols-${columns} gap-2`}>
            <Button className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>With current data</Span>
            </Button>
            <Button className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Without any data</Span>
            </Button>
          </Div>
        </Div>
      </Card>

      <Card className="mb-3">
        <SectionTitle>3. Validate the data and complete the import</SectionTitle>
        <Bullets
          items={[
            'In the Excel file upload section first select the upload option.',
            'Upload your file in .xls or .xlsx format.',
            'Finally click the Import button.',
            "You can upload your restaurant images in the restaurant folder from the gallery and copy the image's path.",
          ]}
        />
      </Card>

      <Card className="mb-4">
        <SectionTitle>Excel file upload</SectionTitle>
        <Field label="Import items file" hint="Must be an Excel file using the template above.">
          <Div
            onClick={handleFileChange}
            accessibilityLabel="Choose an Excel file to import"
            className="items-center justify-center w-full py-8 px-4 gap-3 border border-dashed border-slate-300 rounded-lg bg-slate-50"
          >
            {selectedFile ? (
              <>
                <UiIcon as={FileCheck} size={28} className="text-blue-600" />
                <P className="text-sm font-semibold text-slate-900 text-center">{selectedFile.name}</P>
                <P className="text-xs text-slate-500">Tap to change file</P>
              </>
            ) : (
              <>
                <UiIcon as={Upload} size={28} className="text-slate-400" />
                <P className="text-sm font-semibold text-slate-700 text-center">Tap to choose a file</P>
                <P className="text-xs text-slate-500 text-center">.xls or .xlsx only</P>
              </>
            )}
          </Div>
        </Field>
      </Card>

      <Div className="flex-row flex-wrap items-center justify-end gap-2">
        <Button onClick={handleReset} className={BTN_SECONDARY}>
          <UiIcon as={RefreshCw} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
        </Button>
        <Button onClick={handleImport} className={BTN_PRIMARY}>
          <UiIcon as={Upload} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>Import</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
