/* Ported from Frontend/src/modules/Food/pages/admin/settings/EmailTemplate.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Mail, Save, RotateCcw } from 'lucide-react-native';
import { Button, Div, Form, Input, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, Field, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
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
  const { tablet } = useLayoutWidth();
  const sendMailLabels = {
    'forgot-password': 'Send mail on forgot password',
    'new-restaurant': 'Send mail on new restaurant registration',
    'new-deliveryman': 'Send mail on new deliveryman registration',
    'withdraw-request': 'Send mail on withdraw request',
    'campaign-join': 'Send mail on campaign join request',
    'refund-request': 'Send mail on refund request',
    'new-advertisement': 'Send mail on new advertisement',
  };
  const anyPageLink =
    formData.pageLinks.privacyPolicy || formData.pageLinks.refundPolicy || formData.pageLinks.cancellationPolicy || formData.pageLinks.contactUs;
  const anySocial =
    formData.socialMediaLinks.facebook ||
    formData.socialMediaLinks.instagram ||
    formData.socialMediaLinks.twitter ||
    formData.socialMediaLinks.linkedin ||
    formData.socialMediaLinks.pinterest;
  const checkboxRow = 'flex-row items-center gap-3 h-11';
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Mail}
        title="Email templates"
        subtitle="The mails the platform sends, and what each one says."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Email templates' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Template</SectionTitle>
        <Toolbar>
          {templates.map((template) => (
            <Button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={activeTemplate === template.id ? BTN_PRIMARY : BTN_SECONDARY}
              accessibilityLabel={`Edit the ${template.label} template`}
            >
              <Span className={activeTemplate === template.id ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{template.label}</Span>
            </Button>
          ))}
        </Toolbar>
        <Div
          className="flex-row items-center gap-3 pt-3 border-t border-slate-200"
          onClick={() => setSendMailEnabled(!sendMailEnabled)}
          accessibilityRole="switch"
          accessibilityLabel={sendMailLabels[activeTemplate] || 'Send this mail'}
        >
          <Span className="flex-1 text-sm font-medium text-slate-700">{sendMailLabels[activeTemplate]}</Span>
          <Div className={`w-11 h-6 rounded-full justify-center ${sendMailEnabled ? 'bg-blue-600 items-end' : 'bg-slate-300 items-start'}`}>
            <Div className="h-4 w-4 mx-1 rounded-full bg-white" />
          </Div>
        </Div>
      </Card>

      <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
        {/* Email preview */}
        <Card className={tablet ? 'flex-1' : null}>
          <SectionTitle>Preview</SectionTitle>
          <Span className="text-base font-semibold text-slate-900 mb-2">{formData.mainTitle}</Span>
          {formData.mailBody ? (
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
          ) : (
            <EmptyState title="Nothing to preview" message="Write the mail body on the right to see it here." className="border-0" icon={Mail} />
          )}

          <Div className="mt-4 pt-4 border-t border-slate-200 gap-3">
            <Span className="text-sm text-slate-500">{formData.footerText}</Span>

            {anyPageLink ? (
              <Div className="flex-row flex-wrap gap-2">
                {formData.pageLinks.privacyPolicy && <Span className="text-xs text-slate-500">Privacy Policy</Span>}
                {formData.pageLinks.refundPolicy && <Span className="text-xs text-slate-500">Refund Policy</Span>}
                {formData.pageLinks.cancellationPolicy && <Span className="text-xs text-slate-500">Cancellation Policy</Span>}
                {formData.pageLinks.contactUs && <Span className="text-xs text-slate-500">Contact us</Span>}
              </Div>
            ) : null}

            {anySocial ? (
              <Div className="flex-row flex-wrap gap-2">
                {formData.socialMediaLinks.facebook && <Span className="text-xs text-slate-500">Facebook</Span>}
                {formData.socialMediaLinks.instagram && <Span className="text-xs text-slate-500">Instagram</Span>}
                {formData.socialMediaLinks.twitter && <Span className="text-xs text-slate-500">Twitter</Span>}
                {formData.socialMediaLinks.linkedin && <Span className="text-xs text-slate-500">LinkedIn</Span>}
                {formData.socialMediaLinks.pinterest && <Span className="text-xs text-slate-500">Pinterest</Span>}
              </Div>
            ) : null}

            <Span className="text-xs text-slate-500">{formData.copyrightContent}</Span>
          </Div>
        </Card>

        {/* Editor */}
        <Card className={tablet ? 'flex-1' : null}>
          <SectionTitle>Content</SectionTitle>
          <Toolbar>
            {languages.map((lang) => (
              <Button
                key={lang.id}
                onClick={() => setActiveLanguage(lang.id)}
                className={activeLanguage === lang.id ? BTN_PRIMARY : BTN_SECONDARY}
                accessibilityLabel={`Edit the ${lang.label} version`}
              >
                <Span className={activeLanguage === lang.id ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{lang.label}</Span>
              </Button>
            ))}
          </Toolbar>

          <Form onSubmit={handleSubmit} className="gap-3">
            <Field label="Icon" hint="A small image shown at the top of the mail.">
              <Div className="flex-row items-center gap-2">
                <Input type="text" placeholder="No file chosen" value={formData.icon ? 'File selected' : ''} readOnly className={`${INPUT} flex-1`} />
                <Button
                  type="button"
                  onClick={async () => handleFileUpload('icon', await pickImage())}
                  className={BTN_SECONDARY}
                  accessibilityLabel="Choose an icon file"
                >
                  <Span className={BTN_TEXT_SECONDARY}>Browse</Span>
                </Button>
              </Div>
            </Field>

            <Field label="Main title">
              <Input type="text" value={formData.mainTitle} onChange={(e) => handleInputChange('mainTitle', e.target.value)} className={INPUT} />
            </Field>

            <Field label="Mail body" hint="Placeholders such as {userName} are filled in when the mail is sent.">
              <Textarea
                value={formData.mailBody}
                onChange={(e) => handleInputChange('mailBody', e.target.value)}
                rows={8}
                className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>

            <Field label="Footer text">
              <Input type="text" value={formData.footerText} onChange={(e) => handleInputChange('footerText', e.target.value)} className={INPUT} />
            </Field>

            <Field label="Page links">
              <Div>
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
                    label: 'Cancellation Policy',
                  },
                  {
                    key: 'contactUs',
                    label: 'Contact Us',
                  },
                ].map((item) => (
                  <Div key={item.key} className={checkboxRow}>
                    <Input
                      type="checkbox"
                      checked={formData.pageLinks[item.key]}
                      onChange={(e) => handleCheckboxChange('pageLinks', item.key, e.target.checked)}
                      className="w-5 h-5"
                    />
                    <Span className="flex-1 text-sm text-slate-700">{item.label}</Span>
                  </Div>
                ))}
              </Div>
            </Field>

            <Field label="Social media links">
              <Div>
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
                  <Div key={item.key} className={checkboxRow}>
                    <Input
                      type="checkbox"
                      checked={formData.socialMediaLinks[item.key]}
                      onChange={(e) => handleCheckboxChange('socialMediaLinks', item.key, e.target.checked)}
                      className="w-5 h-5"
                    />
                    <Span className="flex-1 text-sm text-slate-700">{item.label}</Span>
                  </Div>
                ))}
              </Div>
            </Field>

            <Field label="Copyright">
              <Input
                type="text"
                value={formData.copyrightContent}
                onChange={(e) => handleInputChange('copyrightContent', e.target.value)}
                className={INPUT}
              />
            </Field>

            <Div className="flex-row flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" onClick={handleReset} className={BTN_SECONDARY} accessibilityLabel="Reset this template">
                <UiIcon as={RotateCcw} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button type="submit" className={BTN_PRIMARY} accessibilityLabel="Save this template">
                <UiIcon as={Save} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Save</Span>
              </Button>
            </Div>
          </Form>
        </Card>
      </Div>
    </AdminPage>
  );
}
