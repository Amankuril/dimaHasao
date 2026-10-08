/* Ported from Frontend/src/modules/Food/pages/admin/system/JoinUsPageSetup.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Label, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const defaultFields = [
  'Restaurant Name',
  'Restaurant Logo',
  'Owner Last Name',
  'Vat/Tax',
  'Cuisine',
  'Phone Number',
  'Delivery Address',
  'Zone',
  'Email',
  'Min Delivery Time',
  'Latitude & Longitude',
  'Password',
  'Max Delivery Time',
  'Map Location',
  'Restaurant Cover',
  'Owner First Name',
];
const fieldTypes = ['Text', 'Date', 'File Upload', 'Number', 'Email', 'Phone'];
const FORMATS = [
  { key: 'jpg', label: 'JPG, JPEG or PNG' },
  { key: 'pdf', label: 'PDF' },
  { key: 'docs', label: 'DOCS' },
];
export default function JoinUsPageSetup() {
  const [activeTab, setActiveTab] = useState('restaurant');
  const { tablet } = useLayoutWidth();
  const col = tablet ? { width: '48.5%' } : { width: '100%' };
  const [customFields, setCustomFields] = useState([
    {
      id: 1,
      type: 'Text',
      title: 'Enter Your Tin Number',
      placeholder: 'Enter TIN',
      isRequired: true,
      uploadMultiple: false,
      fileFormats: {
        jpg: true,
        pdf: true,
        docs: true,
      },
    },
    {
      id: 2,
      type: 'Date',
      title: 'Date',
      placeholder: 'Enter Date',
      isRequired: true,
      uploadMultiple: false,
      fileFormats: {
        jpg: false,
        pdf: false,
        docs: false,
      },
    },
    {
      id: 3,
      type: 'File Upload',
      title: 'License Document',
      placeholder: '',
      isRequired: true,
      uploadMultiple: false,
      fileFormats: {
        jpg: true,
        pdf: true,
        docs: true,
      },
    },
  ]);
  const handleAddField = () => {
    const newField = {
      id: Date.now(),
      type: 'Text',
      title: '',
      placeholder: '',
      isRequired: false,
      uploadMultiple: false,
      fileFormats: {
        jpg: false,
        pdf: false,
        docs: false,
      },
    };
    setCustomFields([...customFields, newField]);
  };
  const handleDeleteField = (id) => {
    setCustomFields(customFields.filter((field) => field.id !== id));
  };
  const handleFieldChange = (id, key, value) => {
    setCustomFields(
      customFields.map((field) =>
        field.id === id
          ? {
              ...field,
              [key]: value,
            }
          : field,
      ),
    );
  };
  const handleFileFormatChange = (id, format) => {
    setCustomFields(
      customFields.map((field) =>
        field.id === id
          ? {
              ...field,
              fileFormats: {
                ...field.fileFormats,
                [format]: !field.fileFormats[format],
              },
            }
          : field,
      ),
    );
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', {
      activeTab,
      customFields,
    });
    alert('Join Request Form Setup saved successfully!');
  };
  const handleReset = () => {
    setCustomFields([
      {
        id: 1,
        type: 'Text',
        title: 'Enter Your Tin Number',
        placeholder: 'Enter TIN',
        isRequired: true,
        uploadMultiple: false,
        fileFormats: {
          jpg: true,
          pdf: true,
          docs: true,
        },
      },
      {
        id: 2,
        type: 'Date',
        title: 'Date',
        placeholder: 'Enter Date',
        isRequired: true,
        uploadMultiple: false,
        fileFormats: {
          jpg: false,
          pdf: false,
          docs: false,
        },
      },
      {
        id: 3,
        type: 'File Upload',
        title: 'License Document',
        placeholder: '',
        isRequired: true,
        uploadMultiple: false,
        fileFormats: {
          jpg: true,
          pdf: true,
          docs: true,
        },
      },
    ]);
  };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={ClipboardList}
        title="New Join Request Form Setup"
        subtitle="Choose which fields partners fill in when they apply"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Join request form' }]}
      />

      <Card className="mb-4" padded={false}>
        <Div className="flex-row flex-wrap gap-2 p-2">
          <Button
            onClick={() => setActiveTab('restaurant')}
            className={`flex-row items-center justify-center h-11 px-4 rounded-lg ${activeTab === 'restaurant' ? 'bg-blue-600' : 'bg-white'}`}
          >
            <Span className={activeTab === 'restaurant' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>Restaurant form</Span>
          </Button>
          <Button
            onClick={() => setActiveTab('deliveryman')}
            className={`flex-row items-center justify-center h-11 px-4 rounded-lg ${activeTab === 'deliveryman' ? 'bg-blue-600' : 'bg-white'}`}
          >
            <Span className={activeTab === 'deliveryman' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>Deliveryman form</Span>
          </Button>
        </Div>
      </Card>

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <SectionTitle>Default input fields</SectionTitle>
          <Div className="flex-row flex-wrap gap-2">
            {defaultFields.map((field, index) => (
              <Div key={index} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Span className="text-xs text-slate-700">{field}</Span>
              </Div>
            ))}
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle
            action={
              <Button type="button" onClick={handleAddField} className={BTN_PRIMARY}>
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Add field</Span>
              </Button>
            }
          >
            Custom input fields
          </SectionTitle>

          <Div className="gap-3">
            {customFields.map((field) => (
              <Div key={field.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 gap-3">
                <Div className="flex-row flex-wrap gap-3">
                  <Div style={col}>
                    <Field label="Type">
                      <Select value={field.type} onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)} className={INPUT}>
                        {fieldTypes.map((type) => (
                          <Option key={type} value={type}>
                            {type}
                          </Option>
                        ))}
                      </Select>
                    </Field>
                  </Div>

                  <Div style={col}>
                    <Field label="Input field title">
                      <Input
                        type="text"
                        value={field.title}
                        onChange={(e) => handleFieldChange(field.id, 'title', e.target.value)}
                        placeholder="Enter field title"
                        className={INPUT}
                      />
                    </Field>
                  </Div>

                  {field.type !== 'File Upload' ? (
                    <Div style={col}>
                      <Field label="Placeholder">
                        <Input
                          type="text"
                          value={field.placeholder}
                          onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                          placeholder="Enter placeholder"
                          className={INPUT}
                        />
                      </Field>
                    </Div>
                  ) : null}
                </Div>

                {field.type === 'File Upload' ? (
                  <Div className="gap-2">
                    <Div className="flex-row items-center gap-2 min-h-11">
                      <Input
                        type="checkbox"
                        checked={field.uploadMultiple}
                        onChange={(e) => handleFieldChange(field.id, 'uploadMultiple', e.target.checked)}
                        className="w-5 h-5 border-slate-300 rounded"
                      />
                      <Label className="text-sm text-slate-700">Upload multiple files</Label>
                    </Div>
                    <Div className="gap-1.5">
                      <Text style={tw`text-sm font-medium text-slate-700`}>File format</Text>
                      <Div className="flex-row flex-wrap gap-3">
                        {FORMATS.map((fmt) => (
                          <Div key={fmt.key} className="flex-row items-center gap-2 min-h-11">
                            <Input
                              type="checkbox"
                              checked={field.fileFormats[fmt.key]}
                              onChange={() => handleFileFormatChange(field.id, fmt.key)}
                              className="w-5 h-5 border-slate-300 rounded"
                            />
                            <Label className="text-sm text-slate-700">{fmt.label}</Label>
                          </Div>
                        ))}
                      </Div>
                    </Div>
                  </Div>
                ) : null}

                <Div className="flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <Div className="flex-row items-center gap-2 min-h-11">
                    <Input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={(e) => handleFieldChange(field.id, 'isRequired', e.target.checked)}
                      className="w-5 h-5 border-slate-300 rounded"
                    />
                    <Label className="text-sm text-slate-700">Is required?</Label>
                  </Div>
                  <Button
                    type="button"
                    onClick={() => handleDeleteField(field.id)}
                    accessibilityLabel="Delete field"
                    className="w-11 h-11 rounded-lg items-center justify-center"
                  >
                    <UiIcon as={Trash2} size={18} className="text-red-600" />
                  </Button>
                </Div>
              </Div>
            ))}
          </Div>
        </Card>

        <Div className="flex-row flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button type="submit" className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
          </Button>
        </Div>
      </Form>
    </AdminPage>
  );
}
