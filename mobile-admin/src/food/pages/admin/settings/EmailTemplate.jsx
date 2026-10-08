/* Ported from Frontend/src/modules/Food/pages/admin/settings/EmailTemplate.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Mail, Info, Folder, Upload, FileText, Save, RotateCcw } from 'lucide-react-native';
import { Button, Div, Form, H1, H2, Input, Label, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import HtmlContent from '../../../../components/HtmlContent';
import { objectUrl, pickImage } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function EmailTemplate() {
  const [activeTemplate, setActiveTemplate] = useState('forgot-password');
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [sendMailEnabled, setSendMailEnabled] = useState(true);

  // Template-specific default data
  const templateDefaults = {
    'forgot-password': {
      icon: null,
      mainTitle: 'Change Password Request',
      mailBody: 'The following user has forgotten his password & requested to change/reset their password. User Name: {userName}',
      footerText: "Footer Text Please contact us for any queries; we're always happy to help.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'new-restaurant': {
      icon: null,
      mainTitle: 'New Restaurant Registration',
      mailBody: 'A new restaurant has been registered on the platform. Restaurant Name: {restaurantName}, Owner: {ownerName}, Email: {email}, Phone: {phone}',
      footerText: 'Please review and approve the restaurant registration. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'new-deliveryman': {
      icon: null,
      mainTitle: 'New Deliveryman Registration',
      mailBody: 'A new deliveryman has registered on the platform. Name: {deliverymanName}, Email: {email}, Phone: {phone}, Vehicle Type: {vehicleType}',
      footerText: 'Please review and approve the deliveryman registration. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'withdraw-request': {
      icon: null,
      mainTitle: 'Withdraw Request',
      mailBody:
        'A withdraw request has been submitted. Request ID: {requestId}, Amount: {amount}, Requested By: {requestedBy}, Account Details: {accountDetails}',
      footerText: 'Please process the withdraw request. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'campaign-join': {
      icon: null,
      mainTitle: 'Campaign Join Request',
      mailBody: 'A new campaign join request has been received. Campaign: {campaignName}, Restaurant: {restaurantName}, Requested By: {requestedBy}',
      footerText: 'Please review and approve the campaign join request. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'refund-request': {
      icon: null,
      mainTitle: 'Refund Request',
      mailBody: 'A refund request has been submitted. Order ID: {orderId}, Amount: {amount}, Customer: {customerName}, Reason: {reason}',
      footerText: 'Please process the refund request. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
    'new-advertisement': {
      icon: null,
      mainTitle: 'New Advertisement',
      mailBody: 'A new advertisement has been created. Ad Title: {adTitle}, Advertiser: {advertiserName}, Start Date: {startDate}, End Date: {endDate}',
      footerText: 'Please review the advertisement details. Contact us for any queries.',
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true,
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true,
      },
      copyrightContent: '© 2023 StackFood. All rights reserved.',
    },
  };
  const [formData, setFormData] = useState(templateDefaults['forgot-password']);
  const templates = [
    {
      id: 'forgot-password',
      label: 'Forgot Password',
    },
    {
      id: 'new-restaurant',
      label: 'New Restaurant Registration',
    },
    {
      id: 'new-deliveryman',
      label: 'New Deliveryman Registration',
    },
    {
      id: 'withdraw-request',
      label: 'Withdraw Request',
    },
    {
      id: 'campaign-join',
      label: 'Campaign Join Request',
    },
    {
      id: 'refund-request',
      label: 'Refund Request',
    },
    {
      id: 'new-advertisement',
      label: 'New Advertisement',
    },
  ];
  const languages = [
    {
      id: 'default',
      label: 'Default',
    },
    {
      id: 'en',
      label: 'English(EN)',
    },
    {
      id: 'bn',
      label: 'Bengali - বাংলা (BN)',
    },
    {
      id: 'ar',
      label: 'Arabic - العربية (AR)',
    },
    {
      id: 'es',
      label: 'Spanish - español (ES)',
    },
  ];
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleCheckboxChange = (section, field, checked) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: checked,
      },
    }));
  };
  const handleFileUpload = (field, file) => {
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [field]: objectUrl(file),
      }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    // Handle form submission
  };

  // Update form data when template changes
  const handleTemplateChange = (templateId) => {
    setActiveTemplate(templateId);
    setFormData(templateDefaults[templateId] || templateDefaults['forgot-password']);
  };
  const handleReset = () => {
    setFormData(templateDefaults[activeTemplate] || templateDefaults['forgot-password']);
  };

  // Get preview content based on active template
  const getPreviewContent = () => {
    const content = formData.mailBody;
    // Replace placeholders with sample data
    return content
      .replace(/{userName}/g, 'John Doe')
      .replace(/{restaurantName}/g, 'Café Monarch')
      .replace(/{ownerName}/g, 'Jane Smith')
      .replace(/{email}/g, 'owner@example.com')
      .replace(/{phone}/g, '+1234567890')
      .replace(/{deliverymanName}/g, 'Mike Johnson')
      .replace(/{vehicleType}/g, 'Motorcycle')
      .replace(/{requestId}/g, 'REQ-12345')
      .replace(/{amount}/g, '$500.00')
      .replace(/{requestedBy}/g, 'Restaurant Owner')
      .replace(/{accountDetails}/g, 'Account: ****1234')
      .replace(/{campaignName}/g, 'Summer Special')
      .replace(/{orderId}/g, 'ORD-100156')
      .replace(/{customerName}/g, 'John Doe')
      .replace(/{reason}/g, 'Order not delivered')
      .replace(/{adTitle}/g, 'Summer Promotion')
      .replace(/{advertiserName}/g, 'Food Company')
      .replace(/{startDate}/g, '2024-06-01')
      .replace(/{endDate}/g, '2024-08-31');
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="mb-6">
          <H1 className="text-2xl font-bold text-slate-900">Email Templates</H1>
        </Div>

        {/* Template Navigation */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <Div className="flex flex-wrap gap-2 mb-4">
            {templates.map((template) => (
              <Button
                key={template.id}
                onClick={() => handleTemplateChange(template.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTemplate === template.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {template.label}
              </Button>
            ))}
          </Div>

          {/* Toggle Switch */}
          <Div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-slate-700">
                {activeTemplate === 'forgot-password' && 'Send Mail On Forget Password'}
                {activeTemplate === 'new-restaurant' && 'Send Mail On New Restaurant Registration'}
                {activeTemplate === 'new-deliveryman' && 'Send Mail On New Deliveryman Registration'}
                {activeTemplate === 'withdraw-request' && 'Send Mail On Withdraw Request'}
                {activeTemplate === 'campaign-join' && 'Send Mail On Campaign Join Request'}
                {activeTemplate === 'refund-request' && 'Send Mail On Refund Request'}
                {activeTemplate === 'new-advertisement' && 'Send Mail On New Advertisement'}
              </Label>
              <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
            </Div>
            <Button
              type="button"
              onClick={() => setSendMailEnabled(!sendMailEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sendMailEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <Span className="inline-block h-4 w-4 mx-1 rounded-full bg-white" />
            </Button>
          </Div>
        </Div>

        {/* Main Content - Two Column Layout */}
        <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Email Preview */}
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center gap-3 mb-4">
              <Div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <UiIcon as={Folder} className="w-6 h-6 text-orange-600" />
              </Div>
              <H2 className="text-lg font-bold text-slate-900">{formData.mainTitle}</H2>
            </Div>

            <Div className="space-y-4 text-sm text-slate-700">
              <HtmlContent
                html={getPreviewContent()
                  .split('\n')
                  .map((line) => `<p>${line}</p>`)
                  .join('')}
                soraHeadings={false}
                color="#334155"
                fontSize={14}
                lineHeight={20}
              />
            </Div>

            <Div className="mt-8 pt-6 border-t border-slate-200">
              <P className="text-sm text-slate-600 mb-4">{formData.footerText} Thanks & Regards, StackFood</P>

              {/* Logo placeholder */}
              <Div className="mb-4">
                <Div className="w-32 h-12 bg-slate-200 rounded flex items-center justify-center">
                  <Span className="text-xs text-slate-500">StackFood Logo</Span>
                </Div>
              </Div>

              {/* Page Links */}
              {(formData.pageLinks.privacyPolicy ||
                formData.pageLinks.refundPolicy ||
                formData.pageLinks.cancellationPolicy ||
                formData.pageLinks.contactUs) && (
                <Div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-600">
                  {formData.pageLinks.privacyPolicy && <Span>• Privacy Policy</Span>}
                  {formData.pageLinks.refundPolicy && <Span>• Refund Policy</Span>}
                  {formData.pageLinks.cancellationPolicy && <Span>• Cancelation Policy</Span>}
                  {formData.pageLinks.contactUs && <Span>• Contact us</Span>}
                </Div>
              )}

              {/* Social Media Icons */}
              {(formData.socialMediaLinks.facebook ||
                formData.socialMediaLinks.instagram ||
                formData.socialMediaLinks.twitter ||
                formData.socialMediaLinks.linkedin ||
                formData.socialMediaLinks.pinterest) && (
                <Div className="flex gap-3 mb-4">
                  {formData.socialMediaLinks.facebook && (
                    <Div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Span className="text-white text-xs font-bold">F</Span>
                    </Div>
                  )}
                  {formData.socialMediaLinks.instagram && (
                    <Div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
                      <Span className="text-white text-xs font-bold">I</Span>
                    </Div>
                  )}
                  {formData.socialMediaLinks.twitter && (
                    <Div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
                      <Span className="text-white text-xs font-bold">T</Span>
                    </Div>
                  )}
                  {formData.socialMediaLinks.linkedin && (
                    <Div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
                      <Span className="text-white text-xs font-bold">in</Span>
                    </Div>
                  )}
                  {formData.socialMediaLinks.pinterest && (
                    <Div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                      <Span className="text-white text-xs font-bold">P</Span>
                    </Div>
                  )}
                </Div>
              )}

              {/* Copyright */}
              <P className="text-xs text-slate-500">{formData.copyrightContent}</P>
            </Div>
          </Div>

          {/* Right Column - Editing Controls */}
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* Language Tabs */}
            <Div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
              {languages.map((lang) => (
                <Button
                  key={lang.id}
                  onClick={() => setActiveLanguage(lang.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${activeLanguage === lang.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {lang.label}
                </Button>
              ))}
            </Div>

            <Form onSubmit={handleSubmit} className="space-y-6">
              {/* Read Instructions Link */}
              <Div className="flex items-center gap-2 mb-4">
                <Div className="flex items-center gap-1">
                  <Span className="text-sm text-blue-600">Read Instructions</Span>
                  <UiIcon as={Info} className="w-4 h-4 text-blue-600" />
                </Div>
              </Div>

              {/* Icon Section */}
              <Div>
                <Div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  Icon
                  <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
                </Div>
                <Div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Choose File"
                    value={formData.icon ? 'File selected' : ''}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Button
                    type="button"
                    onClick={async () => handleFileUpload('icon', await pickImage())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Browse
                  </Button>
                </Div>
              </Div>

              {/* Header Content */}
              <Div>
                <Div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  Header Content
                  <UiIcon as={Folder} className="w-4 h-4 text-slate-400" />
                </Div>
                <Div>
                  <Label className="block text-xs text-slate-600 mb-1">Main Title(Default)</Label>
                  <Input
                    type="text"
                    value={formData.mainTitle}
                    onChange={(e) => handleInputChange('mainTitle', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </Div>
              </Div>

              {/* Mail Body Message */}
              <Div>
                <Div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  Mail Body Message(Default)
                  <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
                </Div>
                {/* Rich Text Editor Placeholder - Simple textarea for now */}
                <Div className="border border-slate-300 rounded-lg">
                  {/* Toolbar Placeholder */}
                  <Div className="border-b border-slate-200 p-2 flex flex-wrap gap-1 bg-slate-50">
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      B
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      I
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      U
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      S
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      Color
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      Link
                    </Button>
                    <Button type="button" className="p-1.5 hover:bg-slate-200 rounded text-xs">
                      Image
                    </Button>
                  </Div>
                  <Textarea
                    value={formData.mailBody}
                    onChange={(e) => handleInputChange('mailBody', e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border-0 rounded-b-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </Div>
              </Div>

              {/* Footer Content */}
              <Div>
                <Div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  Footer Content
                  <UiIcon as={Folder} className="w-4 h-4 text-slate-400" />
                </Div>

                <Div className="space-y-4">
                  <Div>
                    <Label className="block text-xs text-slate-600 mb-1">Section Text(Default)</Label>
                    <Input
                      type="text"
                      value={formData.footerText}
                      onChange={(e) => handleInputChange('footerText', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>

                  {/* Page Links Checkboxes */}
                  <Div>
                    <Label className="block text-xs text-slate-600 mb-2">Page Links</Label>
                    <Div className="space-y-2">
                      {[
                        {
                          key: 'privacyPolicy',
                          label: 'Privacy Policy',
                        },
                        {
                          key: 'refundPolicy',
                          label: 'Refund Policy',
                        },
                        {
                          key: 'cancellationPolicy',
                          label: 'Cancelation Policy',
                        },
                        {
                          key: 'contactUs',
                          label: 'Contact Us',
                        },
                      ].map((item) => (
                        <Div key={item.key} className="flex items-center gap-2">
                          <Input
                            type="checkbox"
                            checked={formData.pageLinks[item.key]}
                            onChange={(e) => handleCheckboxChange('pageLinks', item.key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <Span className="text-sm text-slate-700">{item.label}</Span>
                        </Div>
                      ))}
                    </Div>
                  </Div>

                  {/* Social Media Links Checkboxes */}
                  <Div>
                    <Label className="block text-xs text-slate-600 mb-2">Social Media Links</Label>
                    <Div className="space-y-2">
                      {[
                        {
                          key: 'facebook',
                          label: 'Facebook',
                        },
                        {
                          key: 'instagram',
                          label: 'Instagram',
                        },
                        {
                          key: 'twitter',
                          label: 'Twitter',
                        },
                        {
                          key: 'linkedin',
                          label: 'LinkedIn',
                        },
                        {
                          key: 'pinterest',
                          label: 'Pinterest',
                        },
                      ].map((item) => (
                        <Div key={item.key} className="flex items-center gap-2">
                          <Input
                            type="checkbox"
                            checked={formData.socialMediaLinks[item.key]}
                            onChange={(e) => handleCheckboxChange('socialMediaLinks', item.key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <Span className="text-sm text-slate-700">{item.label}</Span>
                        </Div>
                      ))}
                    </Div>
                  </Div>

                  {/* Copyright Content */}
                  <Div>
                    <Label className="block text-xs text-slate-600 mb-1">Copyright Content(Default)</Label>
                    <Input
                      type="text"
                      value={formData.copyrightContent}
                      onChange={(e) => handleInputChange('copyrightContent', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>
                </Div>
              </Div>

              {/* Action Buttons */}
              <Div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                >
                  <UiIcon as={RotateCcw} className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <UiIcon as={Save} className="w-4 h-4" />
                  Save
                </Button>
              </Div>
            </Form>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
