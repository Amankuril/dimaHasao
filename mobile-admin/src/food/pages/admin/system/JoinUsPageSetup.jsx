/* Ported from Frontend/src/modules/Food/pages/admin/system/JoinUsPageSetup.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Plus, Trash2, Settings, ChevronDown } from 'lucide-react-native';
import { Button, Div, Form, H1, H2, Input, Label, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
export default function JoinUsPageSetup() {
  const [activeTab, setActiveTab] = useState('restaurant');
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
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-7xl">
        {/* Page Title */}
        <Div className="mb-3">
          <H1 className="text-lg font-bold text-slate-900">New Join Request Form Setup</H1>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
          <Div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('restaurant')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border-b-2 ${activeTab === 'restaurant' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              Restaurant Registration Form
            </Button>
            <Button
              onClick={() => setActiveTab('deliveryman')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border-b-2 ${activeTab === 'deliveryman' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              DeliveryMan Registration Form
            </Button>
          </Div>
        </Div>

        <Form onSubmit={handleSubmit}>
          {/* Default Input Fields */}
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-3 relative">
            <H2 className="text-sm font-semibold text-slate-900 mb-3">Default Input Fields</H2>
            <Div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {defaultFields.map((field, index) => (
                <Div key={index} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Span className="text-xs text-slate-700">{field}</Span>
                </Div>
              ))}
            </Div>
            <UiIcon as={Settings} className="absolute top-4 right-4 w-4 h-4 text-slate-400" />
          </Div>

          {/* Custom Input Fields */}
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-3">
            <Div className="flex items-center justify-between mb-4">
              <H2 className="text-sm font-semibold text-slate-900">Custom Input Fields</H2>
              <Button
                type="button"
                onClick={handleAddField}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <UiIcon as={Plus} className="w-3.5 h-3.5" />
                <Span>Add New Field</Span>
              </Button>
            </Div>

            <Div className="space-y-4">
              {customFields.map((field) => (
                <Div key={field.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    {/* Type Dropdown */}
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</Label>
                      <Div className="relative">
                        <Select
                          value={field.type}
                          onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                        >
                          {fieldTypes.map((type) => (
                            <Option key={type} value={type}>
                              {type}
                            </Option>
                          ))}
                        </Select>
                        <UiIcon as={ChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </Div>
                    </Div>

                    {/* Input Field Title */}
                    <Div>
                      <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Input Field Title</Label>
                      <Input
                        type="text"
                        value={field.title}
                        onChange={(e) => handleFieldChange(field.id, 'title', e.target.value)}
                        placeholder="Enter field title"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    {/* Place Holder */}
                    {field.type !== 'File Upload' && (
                      <Div>
                        <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Place Holder</Label>
                        <Input
                          type="text"
                          value={field.placeholder}
                          onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                          placeholder="Enter placeholder"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </Div>
                    )}
                  </Div>

                  {/* File Upload Specific Options */}
                  {field.type === 'File Upload' && (
                    <Div className="space-y-3 mb-3">
                      <Div className="flex items-center gap-2">
                        <Input
                          type="checkbox"
                          checked={field.uploadMultiple}
                          onChange={(e) => handleFieldChange(field.id, 'uploadMultiple', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <Label className="text-xs text-slate-700">Upload Multiple Files</Label>
                      </Div>
                      <Div>
                        <Label className="block text-xs font-semibold text-slate-700 mb-2">File Format</Label>
                        <Div className="flex flex-wrap gap-3">
                          <Div className="flex items-center gap-2">
                            <Input
                              type="checkbox"
                              checked={field.fileFormats.jpg}
                              onChange={() => handleFileFormatChange(field.id, 'jpg')}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <Label className="text-xs text-slate-700">JPG JPEG or PNG</Label>
                          </Div>
                          <Div className="flex items-center gap-2">
                            <Input
                              type="checkbox"
                              checked={field.fileFormats.pdf}
                              onChange={() => handleFileFormatChange(field.id, 'pdf')}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <Label className="text-xs text-slate-700">PDF</Label>
                          </Div>
                          <Div className="flex items-center gap-2">
                            <Input
                              type="checkbox"
                              checked={field.fileFormats.docs}
                              onChange={() => handleFileFormatChange(field.id, 'docs')}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <Label className="text-xs text-slate-700">DOCS</Label>
                          </Div>
                        </Div>
                      </Div>
                    </Div>
                  )}

                  {/* Is Required and Delete */}
                  <Div className="flex items-center justify-between">
                    <Div className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => handleFieldChange(field.id, 'isRequired', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <Label className="text-xs text-slate-700">Is Required ?</Label>
                    </Div>
                    <Button type="button" onClick={() => handleDeleteField(field.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                      <UiIcon as={Trash2} className="w-3.5 h-3.5" />
                    </Button>
                  </Div>
                </Div>
              ))}
            </Div>
          </Div>

          {/* Action Buttons */}
          <Div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </Button>
            <Button type="submit" className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit
            </Button>
          </Div>
        </Form>
      </Div>
    </ScrollDiv>
  );
}
