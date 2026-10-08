/* Ported from Frontend/src/modules/Food/pages/admin/settings/LoginSetup.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Monitor, Copy, Edit, ExternalLink, Settings, Columns, KeyRound, Smartphone, Share2, Mail, Phone } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { A, Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Field, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { alert, navigator } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const panelLoginUrls = [
  {
    id: 1,
    panelName: 'Admin Panel',
    loginUrl: 'https://admin.stackfood.com/login',
    status: 'active',
  },
  {
    id: 2,
    panelName: 'Restaurant Panel',
    loginUrl: 'https://restaurant.stackfood.com/login',
    status: 'active',
  },
  {
    id: 3,
    panelName: 'Deliveryman Panel',
    loginUrl: 'https://delivery.stackfood.com/login',
    status: 'active',
  },
  {
    id: 4,
    panelName: 'Customer Panel',
    loginUrl: 'https://app.stackfood.com/login',
    status: 'active',
  },
];
export default function LoginSetup() {
  const [activeTab, setActiveTab] = useState('customer-login');
  const [loginOptions, setLoginOptions] = useState({
    manualLogin: true,
    otpLogin: true,
    socialMediaLogin: true,
  });
  const [socialMedia, setSocialMedia] = useState({
    google: true,
    facebook: false,
    apple: false,
  });
  const [verification, setVerification] = useState({
    emailVerification: true,
    phoneVerification: true,
  });
  const [panelUrls, setPanelUrls] = useState(panelLoginUrls);
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    panelName: true,
    loginUrl: true,
    status: true,
    actions: true,
  });
  const handleLoginOptionChange = (option) => {
    setLoginOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };
  const handleSocialMediaChange = (platform) => {
    setSocialMedia((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };
  const handleVerificationChange = (type) => {
    setVerification((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'customer-login') {
      debugLog('Form submitted:', {
        loginOptions,
        socialMedia,
        verification,
      });
    } else {
      debugLog('Panel URLs submitted:', panelUrls);
    }
    alert('Settings saved successfully!');
  };
  const handleReset = () => {
    if (activeTab === 'customer-login') {
      setLoginOptions({
        manualLogin: true,
        otpLogin: true,
        socialMediaLogin: true,
      });
      setSocialMedia({
        google: true,
        facebook: false,
        apple: false,
      });
      setVerification({
        emailVerification: true,
        phoneVerification: true,
      });
    } else {
      setPanelUrls(panelLoginUrls);
      setEditingId(null);
      setEditUrl('');
    }
  };
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };
  const handleEditUrl = (id, currentUrl) => {
    setEditingId(id);
    setEditUrl(currentUrl);
  };
  const handleSaveUrl = (id) => {
    setPanelUrls((prev) =>
      prev.map((panel) =>
        panel.id === id
          ? {
              ...panel,
              loginUrl: editUrl,
            }
          : panel,
      ),
    );
    setEditingId(null);
    setEditUrl('');
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      panelName: true,
      loginUrl: true,
      status: true,
      actions: true,
    });
  };
  const columnWidths = {
    si: 60,
    panelName: 170,
    loginUrl: 280,
    status: 120,
    actions: 104,
  };
  const tableCols = Object.keys(columnWidths).filter((key) => visibleColumns[key]).map((key) => columnWidths[key]);
  const columnsConfig = {
    si: 'Serial Number',
    panelName: 'Panel Name',
    loginUrl: 'Login Page URL',
    status: 'Status',
    actions: 'Actions',
  };
  const { tablet } = useLayoutWidth();
  const visibleKeys = Object.keys(columnWidths).filter((key) => visibleColumns[key]);
  const editingPanel = panelUrls.find((panel) => panel.id === editingId) || null;
  const toggleCard = (active) => `rounded-xl border p-3 gap-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`;
  const switchTrack = (active) => `w-11 h-6 rounded-full justify-center ${active ? 'bg-blue-600 items-end' : 'bg-slate-300 items-start'}`;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Monitor}
        title="Login setup"
        subtitle="How customers sign in, and the login URLs for each panel."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Login setup' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Section</SectionTitle>
        <Toolbar className="mb-0">
          <Button onClick={() => setActiveTab('customer-login')} className={activeTab === 'customer-login' ? BTN_PRIMARY : BTN_SECONDARY} accessibilityLabel="Customer login settings">
            <Span className={activeTab === 'customer-login' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Customer login</Span>
          </Button>
          <Button onClick={() => setActiveTab('panel-login')} className={activeTab === 'panel-login' ? BTN_PRIMARY : BTN_SECONDARY} accessibilityLabel="Panel login URLs">
            <Span className={activeTab === 'panel-login' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Panel login URLs</Span>
          </Button>
        </Toolbar>
      </Card>

      {activeTab === 'customer-login' && (
        <Div>
          <Card className="mb-4">
            <SectionTitle>Login options</SectionTitle>
            <Span className="text-sm text-slate-500 mb-3">The options you enable are the ones customers can sign in with.</Span>
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              {[
                {
                  key: 'manualLogin',
                  label: 'Manual login',
                  icon: KeyRound,
                },
                {
                  key: 'otpLogin',
                  label: 'OTP login',
                  icon: Smartphone,
                },
                {
                  key: 'socialMediaLogin',
                  label: 'Social media login',
                  icon: Share2,
                },
              ].map((option) => (
                <Div
                  key={option.key}
                  onClick={() => handleLoginOptionChange(option.key)}
                  accessibilityRole="switch"
                  accessibilityLabel={option.label}
                  className={`${toggleCard(loginOptions[option.key])}${tablet ? ' flex-1 min-w-[200px]' : ''}`}
                >
                  <Div className="flex-row items-center gap-3">
                    <UiIcon as={option.icon} size={18} className={loginOptions[option.key] ? 'text-blue-600' : 'text-slate-400'} />
                    <Span className="flex-1 text-sm font-semibold text-slate-900">{option.label}</Span>
                    <Div className={switchTrack(loginOptions[option.key])}>
                      <Div className="h-4 w-4 mx-1 rounded-full bg-white" />
                    </Div>
                  </Div>
                </Div>
              ))}
            </Div>
          </Card>

          <Card className="mb-4">
            <SectionTitle>Social media providers</SectionTitle>
            <Span className="text-sm text-slate-500 mb-3">Connect the third-party sign-in providers you support.</Span>
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              {[
                {
                  key: 'google',
                  label: 'Google',
                },
                {
                  key: 'facebook',
                  label: 'Facebook',
                },
                {
                  key: 'apple',
                  label: 'Apple',
                },
              ].map((platform) => (
                <Div
                  key={platform.key}
                  onClick={() => handleSocialMediaChange(platform.key)}
                  accessibilityRole="switch"
                  accessibilityLabel={platform.label}
                  className={`${toggleCard(socialMedia[platform.key])}${tablet ? ' flex-1 min-w-[200px]' : ''}`}
                >
                  <Div className="flex-row items-center gap-3">
                    <Span className="flex-1 text-sm font-semibold text-slate-900">{platform.label}</Span>
                    <Div className={switchTrack(socialMedia[platform.key])}>
                      <Div className="h-4 w-4 mx-1 rounded-full bg-white" />
                    </Div>
                  </Div>
                </Div>
              ))}
            </Div>
          </Card>

          <Card className="mb-4">
            <SectionTitle>Verification</SectionTitle>
            <Span className="text-sm text-slate-500 mb-3">What a customer must verify from the app or website.</Span>
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              {[
                {
                  key: 'emailVerification',
                  label: 'Email verification',
                  icon: Mail,
                },
                {
                  key: 'phoneVerification',
                  label: 'Phone number verification',
                  icon: Phone,
                },
              ].map((verify) => (
                <Div
                  key={verify.key}
                  onClick={() => handleVerificationChange(verify.key)}
                  accessibilityRole="switch"
                  accessibilityLabel={verify.label}
                  className={`${toggleCard(verification[verify.key])}${tablet ? ' flex-1 min-w-[200px]' : ''}`}
                >
                  <Div className="flex-row items-center gap-3">
                    <UiIcon as={verify.icon} size={18} className={verification[verify.key] ? 'text-blue-600' : 'text-slate-400'} />
                    <Span className="flex-1 text-sm font-semibold text-slate-900">{verify.label}</Span>
                    <Div className={switchTrack(verification[verify.key])}>
                      <Div className="h-4 w-4 mx-1 rounded-full bg-white" />
                    </Div>
                  </Div>
                </Div>
              ))}
            </Div>
          </Card>
        </Div>
      )}

      {activeTab === 'panel-login' && (
        <Div>
          <Card className="mb-4">
            <SectionTitle
              action={
                <Button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
                  accessibilityLabel="Table settings"
                >
                  <UiIcon as={Settings} size={18} className="text-slate-700" />
                </Button>
              }
            >
              Panel login URLs
            </SectionTitle>
            <Span className="text-sm text-slate-500">Edit or copy the login URL each panel uses.</Span>
          </Card>

          {editingPanel ? (
            <Card className="mb-4">
              <SectionTitle>Edit {editingPanel.panelName} URL</SectionTitle>
              <Field label="Login page URL">
                <Input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className={INPUT} placeholder="Enter login URL" />
              </Field>
              <Div className="flex-row justify-end gap-2 mt-3">
                <Button onClick={handleCancelEdit} className={BTN_SECONDARY} accessibilityLabel="Cancel editing">
                  <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                </Button>
                <Button onClick={() => handleSaveUrl(editingPanel.id)} className={BTN_PRIMARY} accessibilityLabel="Save the login URL">
                  <Span className={BTN_TEXT_PRIMARY}>Save</Span>
                </Button>
              </Div>
            </Card>
          ) : null}

          {visibleKeys.length === 0 ? (
            <EmptyState
              icon={Columns}
              title="Every column is hidden"
              message="Turn a column back on to see the panel URLs."
              actionLabel="Table settings"
              onAction={() => setIsSettingsOpen(true)}
            />
          ) : panelUrls.length === 0 ? (
            <EmptyState icon={Monitor} title="No panels found" message="Panel login URLs appear here once panels are configured." />
          ) : (
            <DataTable cols={tableCols}>
              <THead cols={tableCols} labels={visibleKeys.map((key) => columnsConfig[key])} />
              <TBody>
                {panelUrls.map((panel, index, all) => (
                  <Row key={panel.id} last={index === all.length - 1}>
                    {visibleColumns.si && <Cell width={columnWidths.si}>{String(index + 1)}</Cell>}
                    {visibleColumns.panelName && (
                      <Cell width={columnWidths.panelName}>
                        <Span className="text-sm font-semibold text-slate-900">{panel.panelName}</Span>
                      </Cell>
                    )}
                    {visibleColumns.loginUrl && (
                      <Cell width={columnWidths.loginUrl}>
                        <Div className="flex-row items-center gap-2">
                          <Span className="flex-1 text-sm text-slate-700" numberOfLines={2}>
                            {panel.loginUrl}
                          </Span>
                          <A href={panel.loginUrl} accessibilityLabel={`Open ${panel.panelName} login page`}>
                            <UiIcon as={ExternalLink} size={16} className="text-blue-600" />
                          </A>
                        </Div>
                      </Cell>
                    )}
                    {visibleColumns.status && (
                      <Cell width={columnWidths.status}>
                        <StatusBadge status={panel.status} />
                      </Cell>
                    )}
                    {visibleColumns.actions && (
                      <Cell width={columnWidths.actions}>
                        <Div className="flex-row items-center gap-1">
                          <Button
                            onClick={() => handleEditUrl(panel.id, panel.loginUrl)}
                            className="w-11 h-11 rounded-lg items-center justify-center"
                            accessibilityLabel={`Edit ${panel.panelName} URL`}
                          >
                            <UiIcon as={Edit} size={16} className="text-blue-600" />
                          </Button>
                          <Button
                            onClick={() => handleCopyUrl(panel.loginUrl)}
                            className="w-11 h-11 rounded-lg items-center justify-center"
                            accessibilityLabel={`Copy ${panel.panelName} URL`}
                          >
                            <UiIcon as={Copy} size={16} className="text-slate-600" />
                          </Button>
                        </Div>
                      </Cell>
                    )}
                  </Row>
                ))}
              </TBody>
            </DataTable>
          )}
        </Div>
      )}

      <Div className="flex-row flex-wrap justify-end gap-2 mt-4">
        <Button type="button" onClick={handleReset} className={BTN_SECONDARY} accessibilityLabel="Reset these settings">
          <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
        </Button>
        <Button type="button" onClick={handleSubmit} className={BTN_PRIMARY} accessibilityLabel="Save these settings">
          <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
        </Button>
      </Div>

      {/* Settings Dialog */}
      {activeTab === 'panel-login' && (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Table settings</DialogTitle>
            </DialogHeader>
            <Div className="gap-3">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible columns</Span>
              <Div>
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Div
                    key={key}
                    onClick={() => toggleColumn(key)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Show the ${label} column`}
                    className="flex-row items-center gap-3 h-11 px-1"
                  >
                    <Input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-5 h-5" />
                    <Span className="flex-1 text-sm text-slate-700">{label}</Span>
                  </Div>
                ))}
              </Div>
              <Div className="flex-row justify-end gap-2 pt-3 border-t border-slate-200">
                <Button onClick={resetColumns} className={BTN_SECONDARY} accessibilityLabel="Show every column again">
                  <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
                </Button>
                <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY} accessibilityLabel="Apply the column settings">
                  <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
                </Button>
              </Div>
            </Div>
          </DialogContent>
        </Dialog>
      )}
    </AdminPage>
  );
}
